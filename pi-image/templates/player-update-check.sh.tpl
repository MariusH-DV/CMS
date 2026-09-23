#!/bin/bash
# CMS Player - Update: wird ausschliesslich auf Abruf ausgefuehrt (per
# "systemctl start cms-player-updater.service", angestossen von server.js,
# wenn im CMS unter Mandant/Geraete ein Update fuer dieses Geraet angefordert
# wurde - kein automatischer Timer mehr). Prueft die verfuegbare
# Player-Version und tauscht bei Bedarf nur den Quellcode aus (server.js,
# public/, package.json). config/, data/ und branding/ innerhalb von
# /opt/cms-player werden dabei NICHT angefasst - das sind pro-Geraet erzeugte
# Laufzeitdaten, kein Quellcode.
set -e

INSTALL_DIR="/opt/cms-player"
API_URL="{{API_URL}}"
VERSION_FILE="${INSTALL_DIR}/.player-version"

# Eigentuemer des Geraets ermitteln (der Benutzer, unter dem cms-player.service
# laeuft) statt ihn fest zu verdrahten - funktioniert unabhaengig vom beim
# Bereitstellen gewaehlten Benutzernamen.
RUN_USER="$(stat -c '%U' "${INSTALL_DIR}/config" 2>/dev/null || echo pi)"

CURRENT_VERSION=""
[ -f "${VERSION_FILE}" ] && CURRENT_VERSION="$(cat "${VERSION_FILE}")"

LATEST_VERSION="$(curl -fsS --max-time 15 "${API_URL}/public/player/version" 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).version||'')}catch(e){}})" \
  2>/dev/null || true)"

if [ -z "${LATEST_VERSION}" ]; then
  echo "==> Update-Check: Version konnte nicht ermittelt werden (Server nicht erreichbar?), ueberspringe."
  exit 0
fi

if [ "${LATEST_VERSION}" = "${CURRENT_VERSION}" ]; then
  exit 0
fi

echo "==> Neue Player-Version verfuegbar (${CURRENT_VERSION:-unbekannt} -> ${LATEST_VERSION}), aktualisiere..."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

if ! curl -fsS --max-time 60 "${API_URL}/public/player/package" -o "${TMP_DIR}/player.zip"; then
  echo "FEHLER: Download des Player-Pakets fehlgeschlagen, breche ab (naechster Versuch beim naechsten Timer-Lauf)."
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "FEHLER: 'unzip' ist auf diesem Geraet nicht installiert, breche ab."
  exit 1
fi

mkdir -p "${TMP_DIR}/extracted"
if ! unzip -q "${TMP_DIR}/player.zip" -d "${TMP_DIR}/extracted"; then
  echo "FEHLER: Entpacken des Player-Pakets fehlgeschlagen, breche ab."
  exit 1
fi

if [ ! -f "${TMP_DIR}/extracted/server.js" ]; then
  echo "FEHLER: Heruntergeladenes Paket sieht ungueltig aus (server.js fehlt), breche ab."
  exit 1
fi

echo "==> Node-Abhaengigkeiten fuer die neue Version installieren"
if ! (cd "${TMP_DIR}/extracted" && npm install --omit=dev); then
  echo "FEHLER: npm install fehlgeschlagen, breche ab (laufende Installation bleibt unveraendert)."
  exit 1
fi

echo "==> Player-Dienst anhalten und Dateien austauschen"
systemctl stop cms-player.service

# Alte Quelldateien entfernen - config/, data/, branding/ und die
# Versionsdatei selbst bleiben unangetastet.
find "${INSTALL_DIR}" -mindepth 1 -maxdepth 1 \
  ! -name config ! -name data ! -name branding ! -name .player-version \
  -exec rm -rf {} +

cp -r "${TMP_DIR}/extracted/." "${INSTALL_DIR}/"
echo "${LATEST_VERSION}" > "${VERSION_FILE}"
chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}"

systemctl start cms-player.service
echo "==> Update abgeschlossen (Version ${LATEST_VERSION})"
