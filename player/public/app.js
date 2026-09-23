(function () {
  const screens = {
    pairing: document.getElementById('pairing-screen'),
    paired: document.getElementById('paired-screen'),
    empty: document.getElementById('empty-screen'),
    error: document.getElementById('error-screen'),
    player: document.getElementById('player-screen'),
    deactivated: document.getElementById('deactivated-screen'),
    locked: document.getElementById('locked-screen'),
  };
  const pinEl = document.getElementById('pin');
  const pairingTenantEl = document.getElementById('pairing-tenant');
  const pairedTenantEl = document.getElementById('paired-tenant');
  const emptyTenantEl = document.getElementById('empty-tenant');
  const errorMessageEl = document.getElementById('error-message');
  const deactivatedReasonEl = document.getElementById('deactivated-reason');
  const imgEl = document.getElementById('media-image');
  const videoEl = document.getElementById('media-video');
  const brandLogoEls = [document.getElementById('pairing-logo'), document.getElementById('empty-logo')];
  const unlockPinEl = document.getElementById('unlock-pin');
  const unlockKeypadEl = document.getElementById('unlock-keypad');
  const unlockErrorEl = document.getElementById('unlock-error');

  /**
   * Prueft, ob ein eigenes Branding-Logo verfuegbar ist, und schaltet dann
   * darauf um (sonst bleibt/faellt es auf das Standard-Logo zurueck). Wird
   * wiederholt aufgerufen statt nur einmal beim Laden der Seite zu pruefen -
   * das Logo kann erst kurz NACH dem ersten Seitenaufruf vom Server geladen
   * worden sein (der Player-Dienst holt es asynchron im Hintergrund), ein
   * einmaliger Versuch wuerde in diesem Fall dauerhaft beim Standard-Logo
   * bleiben, obwohl kurz danach ein eigenes verfuegbar waere.
   */
  function refreshBrandLogo() {
    // Cache-Buster bei JEDEM Aufruf neu - sonst wuerde ein einmal erfolgreich
    // gesetztes img.src (z.B. "/branding-logo") bei einer spaeteren Aenderung
    // des Logos (neuer Upload, oder Geraet wurde einem anderen Mandanten mit
    // anderem Logo zugewiesen) NICHT neu geladen, weil sich der src-String
    // nicht mehr veraendert - Browser laden ein unveraendertes img.src nicht
    // erneut nach.
    const url = '/branding-logo?t=' + Date.now();
    const probe = new Image();
    probe.onload = () => {
      brandLogoEls.forEach((el) => {
        el.src = url;
      });
    };
    probe.onerror = () => {
      brandLogoEls.forEach((el) => {
        if (el.src.indexOf('/static/logo.png') === -1) el.src = '/static/logo.png';
      });
    };
    probe.src = url;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== name);
    });
  }

  const slideshow = {
    items: [],
    index: 0,
    timer: null,
    signature: '',
  };

  function clearSlideTimer() {
    if (slideshow.timer) {
      clearTimeout(slideshow.timer);
      slideshow.timer = null;
    }
  }

  function buildMediaUrl(status, item) {
    return `${status.apiBaseUrl}/tenants/${status.tenantId}/media/${item.mediaAsset.id}/file`;
  }

  function advance() {
    if (slideshow.items.length === 0) return;
    slideshow.index = (slideshow.index + 1) % slideshow.items.length;
    showCurrentItem();
  }

  let lastStatus = null;

  function showCurrentItem() {
    if (slideshow.items.length === 0) return;
    const item = slideshow.items[slideshow.index];
    const mediaUrl = buildMediaUrl(lastStatus, item);
    const isVideo = (item.mediaAsset.mimeType || '').startsWith('video/');

    clearSlideTimer();

    if (isVideo) {
      imgEl.classList.add('hidden');
      videoEl.classList.remove('hidden');
      videoEl.src = mediaUrl;
      videoEl.onended = advance;
      videoEl.play().catch(() => {});
      slideshow.timer = setTimeout(advance, (item.durationSeconds + 5) * 1000);
    } else {
      videoEl.classList.add('hidden');
      videoEl.pause();
      imgEl.classList.remove('hidden');
      imgEl.src = mediaUrl;
      slideshow.timer = setTimeout(advance, item.durationSeconds * 1000);
    }
  }

  function startSlideshowIfNeeded(items) {
    const signature = JSON.stringify(items.map((i) => [i.mediaAssetId, i.durationSeconds]));
    if (signature === slideshow.signature && slideshow.items.length > 0) {
      return; // Playlist unveraendert, laufende Anzeige nicht unterbrechen
    }
    slideshow.items = items;
    slideshow.index = 0;
    slideshow.signature = signature;
    showCurrentItem();
  }

  let lastRenderedPin = null;

  function renderPin(pin) {
    if (pin === lastRenderedPin) return;
    lastRenderedPin = pin;
    pinEl.innerHTML = '';
    (pin || '------').split('').forEach((digit, i) => {
      const span = document.createElement('span');
      span.textContent = digit;
      span.className = 'pin-digit';
      span.style.animationDelay = `${i * 0.08}s`;
      pinEl.appendChild(span);
    });
  }

  // Vor-Ort-Entsperrung fuer gesperrte Leihgeraete: PIN wird ausschliesslich
  // ueber diesen Zahlenblock am Geraet selbst eingegeben, nie ferngesteuert.
  const LOCK_PIN_LENGTH = 6;
  let unlockEntry = '';
  let unlockSubmitting = false;

  function renderUnlockEntry() {
    unlockPinEl.innerHTML = '';
    for (let i = 0; i < LOCK_PIN_LENGTH; i += 1) {
      const span = document.createElement('span');
      span.textContent = unlockEntry[i] ? '*' : '';
      span.className = 'pin-digit';
      unlockPinEl.appendChild(span);
    }
  }

  async function submitUnlock() {
    if (unlockSubmitting) return;
    unlockSubmitting = true;
    try {
      const res = await fetch('/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: unlockEntry }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        unlockErrorEl.textContent = data.error || 'Falsche PIN, bitte erneut versuchen.';
        unlockEntry = '';
        renderUnlockEntry();
      } else {
        unlockErrorEl.textContent = '';
        unlockEntry = '';
      }
    } catch (err) {
      unlockErrorEl.textContent = 'Player-Dienst nicht erreichbar: ' + err.message;
      unlockEntry = '';
      renderUnlockEntry();
    } finally {
      unlockSubmitting = false;
    }
  }

  function pressKey(key) {
    if (key === 'clear') {
      unlockEntry = '';
      unlockErrorEl.textContent = '';
      renderUnlockEntry();
      return;
    }
    if (key === 'back') {
      unlockEntry = unlockEntry.slice(0, -1);
      renderUnlockEntry();
      return;
    }
    if (unlockEntry.length >= LOCK_PIN_LENGTH) return;
    unlockEntry += key;
    renderUnlockEntry();
    if (unlockEntry.length === LOCK_PIN_LENGTH) {
      submitUnlock();
    }
  }

  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].forEach((key) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keypad-btn' + (key === 'clear' || key === 'back' ? ' keypad-btn-wide' : '');
    btn.textContent = key === 'clear' ? 'Leeren' : key === 'back' ? '⌫' : key;
    btn.addEventListener('click', () => pressKey(key));
    unlockKeypadEl.appendChild(btn);
  });
  renderUnlockEntry();

  let previousMode = null;
  let successUntil = 0;
  const SUCCESS_SCREEN_MS = 2200;

  function render(status) {
    lastStatus = status;

    // Beim allerersten Wechsel von "pairing" zu einem anderen Modus (also
    // genau dann, wenn die PIN gerade erfolgreich im CMS eingegeben wurde)
    // kurz eine Erfolgs-Animation zeigen, bevor zum eigentlichen Ziel-Screen
    // (leer/Playlist) gewechselt wird.
    if (previousMode === 'pairing' && status.mode !== 'pairing') {
      successUntil = Date.now() + SUCCESS_SCREEN_MS;
      pairedTenantEl.textContent = status.tenantName || '';
    }
    previousMode = status.mode;

    if (Date.now() < successUntil) {
      showScreen('paired');
      return;
    }

    if (status.mode === 'pairing') {
      renderPin(status.pin);
      pairingTenantEl.textContent = status.tenantName || '';
      showScreen('pairing');
      return;
    }

    if (status.locked) {
      showScreen('locked');
      return;
    }

    if (status.lastError) {
      errorMessageEl.textContent = status.lastError;
      showScreen('error');
      return;
    }

    if (status.playlist && status.playlist.source === 'deactivated') {
      deactivatedReasonEl.textContent = status.playlist.deactivationReason || '';
      showScreen('deactivated');
      return;
    }

    const items = status.playlist && status.playlist.playlist ? status.playlist.playlist.items : [];
    if (!items || items.length === 0) {
      emptyTenantEl.textContent = status.tenantName || '';
      showScreen('empty');
      return;
    }

    showScreen('player');
    startSlideshowIfNeeded(items);
  }

  async function refreshStatus() {
    try {
      const res = await fetch('/status');
      const data = await res.json();
      render(data);
    } catch (err) {
      errorMessageEl.textContent = 'Player-Dienst nicht erreichbar: ' + err.message;
      showScreen('error');
    }
  }

  refreshStatus();
  setInterval(refreshStatus, 2000);

  refreshBrandLogo();
  setInterval(refreshBrandLogo, 10000);
})();
