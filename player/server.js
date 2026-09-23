'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_PATH = process.env.PLAYER_CONFIG || path.join(__dirname, 'config', 'player-config.json');
const DATA_DIR = path.join(__dirname, 'data');
const TOKEN_FILE = path.join(DATA_DIR, 'device-token.json');
const HARDWARE_FILE = path.join(DATA_DIR, 'hardware-id.json');
const PORT = process.env.PLAYER_PORT ? Number(process.env.PLAYER_PORT) : 8088;

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Konnte player-config.json nicht laden, verwende Standardwerte:', err.message);
    return {
      apiBaseUrl: 'http://localhost:3000/api',
      tenantId: '',
      tenantName: 'CMS Player (nicht konfiguriert)',
      deviceLabel: 'Raspberry Pi',
    };
  }
}

function getHardwareId() {
  try {
    const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
    const match = cpuInfo.match(/Serial\s*:\s*([0-9a-fA-F]+)/);
    if (match && match[1] && !/^0+$/.test(match[1])) {
      return `rpi-${match[1]}`;
    }
  } catch (_err) {
    // Kein Raspberry Pi / /proc/cpuinfo nicht verfuegbar -> Fallback unten
  }
  try {
    const raw = fs.readFileSync(HARDWARE_FILE, 'utf-8');
    const { hardwareId } = JSON.parse(raw);
    if (hardwareId) return hardwareId;
  } catch (_err) {
    // noch keine Datei vorhanden
  }
  const generated = `gen-${crypto.randomUUID()}`;
  fs.writeFileSync(HARDWARE_FILE, JSON.stringify({ hardwareId: generated }, null, 2));
  return generated;
}

function loadStoredToken() {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function saveStoredToken(data) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
}

function clearStoredToken() {
  fs.rmSync(TOKEN_FILE, { force: true });
}

const config = loadConfig();
const hardwareId = getHardwareId();

const state = {
  mode: 'pairing', // 'pairing' | 'player'
  pin: null,
  deviceId: null,
  apiToken: null,
  playlist: null,
  lastError: null,
};

const stored = loadStoredToken();
if (stored && stored.apiToken) {
  state.mode = 'player';
  state.apiToken = stored.apiToken;
  state.deviceId = stored.deviceId;
}

async function apiFetch(pathSuffix, options = {}) {
  const url = `${config.apiBaseUrl}${pathSuffix}`;
  return fetch(url, options);
}

async function requestPairing() {
  try {
    const res = await apiFetch('/public/devices/pairing-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hardwareId, name: `${config.tenantName} - ${config.deviceLabel}` }),
    });
    if (!res.ok) {
      state.lastError = `Pairing-Anfrage fehlgeschlagen (${res.status})`;
      return;
    }
    const data = await res.json();
    state.deviceId = data.deviceId;
    state.pin = data.pin ?? null;
    state.lastError = null;
  } catch (err) {
    state.lastError = `Server nicht erreichbar: ${err.message}`;
  }
}

async function pollPairingStatus() {
  if (!state.deviceId) {
    await requestPairing();
    return;
  }
  try {
    const res = await apiFetch(`/public/devices/pairing-status/${state.deviceId}`);
    if (!res.ok) {
      // Geraet wurde evtl. serverseitig zurueckgesetzt -> neu anfragen
      state.deviceId = null;
      return;
    }
    const data = await res.json();
    if (data.status === 'ACTIVE' && data.apiToken) {
      state.apiToken = data.apiToken;
      state.mode = 'player';
      state.pin = null;
      saveStoredToken({ hardwareId, deviceId: state.deviceId, apiToken: data.apiToken });
      await fetchPlaylist();
      await fetchLogo();
    }
  } catch (err) {
    state.lastError = `Server nicht erreichbar: ${err.message}`;
  }
}

async function fetchPlaylist() {
  if (!state.apiToken) return;
  try {
    const res = await apiFetch('/public/devices/playlist', {
      headers: { 'x-device-token': state.apiToken },
    });
    if (res.status === 401) {
      // Token ungueltig (z.B. Geraet im CMS geloescht) -> zurueck in den Pairing-Modus
      clearStoredToken();
      state.mode = 'pairing';
      state.apiToken = null;
      state.deviceId = null;
      state.playlist = null;
      return;
    }
    if (!res.ok) {
      state.lastError = `Playlist konnte nicht geladen werden (${res.status})`;
      return;
    }
    state.playlist = await res.json();
    state.lastError = null;
  } catch (err) {
    state.lastError = `Server nicht erreichbar: ${err.message}`;
  }
}

const MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

function findCustomLogoFile() {
  return fs.readdirSync(DATA_DIR).find((f) => f.startsWith('custom-logo.'));
}

function removeCustomLogoFiles() {
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.startsWith('custom-logo.')) {
      fs.rmSync(path.join(DATA_DIR, f), { force: true });
    }
  }
}

/**
 * Holt das Branding-Logo des Mandanten (falls die Zusatzlizenz freigeschaltet
 * ist und eines hinterlegt wurde) und cached es lokal, damit /branding-logo
 * es sofort ausliefern kann. Liefert der Server 404 (kein/nicht freigeschaltetes
 * Logo), wird eine evtl. vorher gecachte Datei wieder entfernt.
 */
async function fetchLogo() {
  if (!state.apiToken) return;
  try {
    const res = await apiFetch('/public/devices/logo', {
      headers: { 'x-device-token': state.apiToken },
    });
    if (res.status === 404) {
      removeCustomLogoFiles();
      return;
    }
    if (!res.ok) return;
    const ext = MIME_EXTENSIONS[res.headers.get('content-type')] || '.png';
    const buffer = Buffer.from(await res.arrayBuffer());
    removeCustomLogoFiles();
    fs.writeFileSync(path.join(DATA_DIR, `custom-logo${ext}`), buffer);
  } catch (_err) {
    // Logo-Abruf ist unkritisch, naechster Versuch folgt automatisch
  }
}

/**
 * Sammelt Systemmetriken fuer den Heartbeat (Uptime, CPU/RAM/Disk-Auslastung,
 * GPU-Werte falls vorhanden). Jeder Wert ist best-effort - schlaegt ein
 * einzelner Befehl fehl (z.B. "vcgencmd" auf einem Nicht-Raspberry-Pi-System),
 * wird nur dieser Wert weggelassen statt den ganzen Heartbeat abzubrechen.
 */
function collectMetrics() {
  const metrics = { uptimeSeconds: Math.round(os.uptime()) };

  try {
    const cpuCount = os.cpus().length || 1;
    const load1 = os.loadavg()[0];
    metrics.cpuLoadPercent = Math.min(100, Math.round((load1 / cpuCount) * 1000) / 10);
  } catch (_err) {
    // Lastwerte nicht verfuegbar
  }

  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    metrics.memUsedPercent = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10;
  } catch (_err) {
    // Speicherwerte nicht verfuegbar
  }

  try {
    const dfOutput = execSync('df -P /', { encoding: 'utf-8', timeout: 3000 });
    const match = dfOutput.match(/(\d+)%/);
    if (match) {
      metrics.diskUsedPercent = Number(match[1]);
    }
  } catch (_err) {
    // "df" nicht verfuegbar (z.B. anderes Betriebssystem)
  }

  try {
    const tempOutput = execSync('vcgencmd measure_temp', { encoding: 'utf-8', timeout: 2000 });
    const tempMatch = tempOutput.match(/temp=([\d.]+)/);
    if (tempMatch) {
      metrics.gpuAvailable = true;
      metrics.gpuTempC = Number(tempMatch[1]);
    }
  } catch (_err) {
    // "vcgencmd" nicht vorhanden -> kein Raspberry Pi / keine GPU-Werte abrufbar
  }
  try {
    const memOutput = execSync('vcgencmd get_mem gpu', { encoding: 'utf-8', timeout: 2000 });
    const memMatch = memOutput.match(/gpu=(\d+)M/);
    if (memMatch) {
      metrics.gpuAvailable = true;
      metrics.gpuMemMb = Number(memMatch[1]);
    }
  } catch (_err) {
    // s.o.
  }

  return metrics;
}

async function sendHeartbeat() {
  if (!state.apiToken) return;
  try {
    await apiFetch('/public/devices/heartbeat', {
      method: 'POST',
      headers: { 'x-device-token': state.apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(collectMetrics()),
    });
  } catch (_err) {
    // Heartbeat-Fehler sind unkritisch, naechster Versuch folgt automatisch
  }
}

setInterval(() => {
  if (state.mode === 'pairing') {
    pollPairingStatus();
  }
}, 3000);

setInterval(() => {
  if (state.mode === 'player') {
    fetchPlaylist();
    sendHeartbeat();
    fetchLogo();
  }
}, 30000);

if (state.mode === 'pairing') {
  requestPairing();
} else {
  fetchPlaylist();
  fetchLogo();
}

const app = express();
app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Eigenes Mandanten-Logo, falls per Branding-Lizenz hinterlegt - liefert 404,
// wenn keines gecached ist, damit das Frontend per onerror auf das
// Standard-Logo (/static/logo.png) zurueckfallen kann.
app.get('/branding-logo', (_req, res) => {
  const fileName = findCustomLogoFile();
  if (!fileName) {
    res.status(404).end();
    return;
  }
  res.sendFile(path.join(DATA_DIR, fileName));
});

app.get('/status', (_req, res) => {
  res.json({
    mode: state.mode,
    pin: state.pin,
    tenantId: config.tenantId,
    tenantName: config.tenantName,
    deviceLabel: config.deviceLabel,
    apiBaseUrl: config.apiBaseUrl,
    playlist: state.playlist,
    lastError: state.lastError,
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CMS Player laeuft auf http://localhost:${PORT} (Hardware-ID: ${hardwareId})`);
});
