#!/bin/bash
# CMS Player - Installationsskript fuer Raspberry Pi OS (Lite oder Desktop, Bullseye/Bookworm)
# Wird entweder manuell auf einem bereits laufenden Pi ausgefuehrt (Option B),
# oder automatisch per cloud-init "runcmd" beim ersten Start aufgerufen
# (Option A, siehe userdata-append.txt) - in beiden Faellen ist zu diesem
# Zeitpunkt bereits Netzwerk vorhanden.
set -e

PROVISIONING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/cms-player"
# Ermittelt den tatsaechlichen Benutzer automatisch, damit die Installation
# unabhaengig vom in Raspberry Pi Imager gewaehlten Benutzernamen funktioniert:
# 1. SUDO_USER, falls interaktiv per "sudo bash install.sh" ausgefuehrt
# 2. sonst der einzige Ordner unter /home (von cloud-init/Raspberry Pi Imager
#    beim Anlegen des Benutzers erstellt - das ist der Fall beim
#    automatischen Erststart via cloud-init "runcmd", wo es keine
#    sudo-Sitzung gibt)
# 3. Fallback "pi" nur falls beides fehlschlaegt
RUN_USER="${SUDO_USER:-$(ls /home 2>/dev/null | head -n1)}"
RUN_USER="${RUN_USER:-pi}"

echo "==> CMS Player wird installiert nach ${INSTALL_DIR} (Benutzer: ${RUN_USER})"

# WICHTIG: WLAN muss als Allererstes eingerichtet werden - alles Weitere in
# diesem Skript (apt-get, npm install) braucht eine Internetverbindung.
# Raspberry Pi OS nutzt je nach Version entweder NetworkManager (Standard
# seit Bookworm) oder das aeltere wpa_supplicant/dhcpcd-Gespann - beide
# werden unterstuetzt, je nachdem was auf diesem System aktiv ist.
if [ -f "${PROVISIONING_DIR}/wpa_supplicant.conf" ] || [ -f "${PROVISIONING_DIR}/nm-wifi.conf" ]; then
  echo "==> WLAN konfigurieren"
  rfkill unblock wifi || true

  if systemctl is-active --quiet NetworkManager 2>/dev/null && [ -f "${PROVISIONING_DIR}/nm-wifi.conf" ]; then
    echo "==> NetworkManager erkannt - WLAN-Profil einrichten"
    install -m 600 "${PROVISIONING_DIR}/nm-wifi.conf" /etc/NetworkManager/system-connections/cms-wifi.nmconnection
    nmcli connection reload || true
    nmcli connection up cms-wifi || true
  elif [ -f "${PROVISIONING_DIR}/wpa_supplicant.conf" ]; then
    echo "==> wpa_supplicant/dhcpcd erkannt - WLAN-Profil einrichten"
    cp "${PROVISIONING_DIR}/wpa_supplicant.conf" /etc/wpa_supplicant/wpa_supplicant.conf
    wpa_cli -i wlan0 reconfigure || systemctl restart dhcpcd || true
  fi
fi

echo "==> Warte auf Internetverbindung (bis zu 7,5 Minuten)..."
NETWORK_READY=0
for i in $(seq 1 90); do
  if timeout 3 bash -c "echo > /dev/tcp/deb.debian.org/443" 2>/dev/null; then
    NETWORK_READY=1
    break
  fi
  sleep 5
done
if [ "${NETWORK_READY}" -ne 1 ]; then
  echo "FEHLER: Nach 7,5 Minuten weiterhin keine Internetverbindung."
  echo "Bitte WLAN-Zugangsdaten (SSID/Passwort) pruefen. Der Dienst versucht es"
  echo "automatisch spaeter erneut (systemd Restart=on-failure)."
  exit 1
fi
echo "==> Internetverbindung steht."

echo "==> Systempakete aktualisieren und Abhaengigkeiten installieren"
apt-get update -y
apt-get install -y --no-install-recommends \
  nodejs npm chromium-browser unclutter xdotool xserver-xorg xinit lightdm curl

mkdir -p "${INSTALL_DIR}/config"
cp -r "${PROVISIONING_DIR}/player/"* "${INSTALL_DIR}/"
cp "${PROVISIONING_DIR}/player-config.json" "${INSTALL_DIR}/config/player-config.json"

echo "==> Node-Abhaengigkeiten installieren"
cd "${INSTALL_DIR}"
npm install --omit=dev

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
# B4 = "Desktop Autologin": setzt u.a. das systemd-Standardziel auf
# graphical.target (das cms-kiosk.service braucht, siehe WantedBy=
# graphical.target in cms-kiosk.service) und richtet lightdm-Autologin fuer
# den Benutzer ein. NICHT zusaetzlich B2 (Console Autologin) aufrufen - das
# wuerde das Standardziel wieder auf multi-user.target zuruecksetzen und
# cms-kiosk.service so nie starten (genau das war der Bug: der Dienst blieb
# "inactive (dead)", weil graphical.target nie erreicht wurde).
raspi-config nonint do_boot_behaviour B4

chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}"

echo "==> Installation abgeschlossen. Der Raspberry Pi startet den CMS Player automatisch nach dem naechsten Neustart."
