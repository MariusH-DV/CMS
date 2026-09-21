#!/bin/bash
# CMS Player - Installationsskript fuer Raspberry Pi OS (Lite oder Desktop, Bullseye/Bookworm)
# Wird entweder manuell auf einem bereits laufenden Pi ausgefuehrt,
# oder automatisch von firstrun.sh beim allerersten Boot aufgerufen.
set -e

PROVISIONING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/cms-player"
# Ermittelt den tatsaechlichen Benutzer automatisch, damit die Installation
# unabhaengig vom in Raspberry Pi Imager gewaehlten Benutzernamen funktioniert:
# 1. SUDO_USER, falls interaktiv per "sudo bash install.sh" ausgefuehrt
# 2. sonst der einzige Ordner unter /home (von Raspberry Pi Imager beim
#    Anlegen des Benutzers erstellt - das ist der Fall beim automatischen
#    Erststart via firstrun.sh, wo es keine sudo-Sitzung gibt)
# 3. Fallback "pi" nur falls beides fehlschlaegt
RUN_USER="${SUDO_USER:-$(ls /home 2>/dev/null | head -n1)}"
RUN_USER="${RUN_USER:-pi}"

echo "==> CMS Player wird installiert nach ${INSTALL_DIR}"

echo "==> Systempakete aktualisieren und Abhaengigkeiten installieren"
apt-get update -y
apt-get install -y --no-install-recommends \
  nodejs npm chromium-browser unclutter xdotool xserver-xorg xinit lightdm

mkdir -p "${INSTALL_DIR}/config"
cp -r "${PROVISIONING_DIR}/player/"* "${INSTALL_DIR}/"
cp "${PROVISIONING_DIR}/player-config.json" "${INSTALL_DIR}/config/player-config.json"

echo "==> Node-Abhaengigkeiten installieren"
cd "${INSTALL_DIR}"
npm install --omit=dev

echo "==> WLAN konfigurieren"
if [ -f "${PROVISIONING_DIR}/wpa_supplicant.conf" ]; then
  cp "${PROVISIONING_DIR}/wpa_supplicant.conf" /etc/wpa_supplicant/wpa_supplicant.conf
  rfkill unblock wifi || true
  wpa_cli -i wlan0 reconfigure || true
fi

echo "==> systemd-Dienste einrichten (Autostart) fuer Benutzer ${RUN_USER}"
# Die Vorlagen sind auf den Benutzer "pi" ausgelegt - hier auf den tatsaechlich
# vorhandenen Benutzer umschreiben (User=, WorkingDirectory=, /home/pi/...).
sed -e "s/^User=pi$/User=${RUN_USER}/" \
    -e "s#/home/pi#/home/${RUN_USER}#g" \
    "${PROVISIONING_DIR}/cms-player.service" > /etc/systemd/system/cms-player.service
sed -e "s/^User=pi$/User=${RUN_USER}/" \
    -e "s#/home/pi#/home/${RUN_USER}#g" \
    "${PROVISIONING_DIR}/cms-kiosk.service" > /etc/systemd/system/cms-kiosk.service
systemctl daemon-reload
systemctl enable cms-player.service
systemctl enable cms-kiosk.service

echo "==> Automatischen Login fuer Benutzer ${RUN_USER} aktivieren (Kiosk-Start ohne Anmeldung)"
raspi-config nonint do_boot_behaviour B4 || true   # Desktop Autologin
raspi-config nonint do_boot_behaviour B2 || true 2>/dev/null || true

chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}"

echo "==> Installation abgeschlossen. Der Raspberry Pi startet den CMS Player automatisch nach dem naechsten Neustart."
