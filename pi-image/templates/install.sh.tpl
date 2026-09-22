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
  nodejs npm chromium-browser unclutter xdotool xserver-xorg xinit x11-xserver-utils curl

# Falls ein Displaymanager (z.B. lightdm) aus einem "Desktop"-Basisimage
# vorhanden ist: deaktivieren. Wir starten X selbst per .bash_profile/startx
# (siehe unten) - kein Displaymanager, kein Login-Fenster, kein Session-
# Auswahlproblem.
systemctl disable lightdm 2>/dev/null || true
systemctl stop lightdm 2>/dev/null || true

mkdir -p "${INSTALL_DIR}/config"
cp -r "${PROVISIONING_DIR}/player/"* "${INSTALL_DIR}/"
cp "${PROVISIONING_DIR}/player-config.json" "${INSTALL_DIR}/config/player-config.json"

echo "==> Node-Abhaengigkeiten installieren"
cd "${INSTALL_DIR}"
npm install --omit=dev

echo "==> systemd-Dienst fuer den Player-Hintergrunddienst einrichten (Autostart)"
# Die Vorlage ist auf den Benutzer "pi" ausgelegt - hier auf den tatsaechlich
# vorhandenen Benutzer umschreiben (User=, WorkingDirectory=, /home/pi/...).
# Der Kiosk (Chromium) laeuft NICHT als systemd-Dienst, sondern wird ueber
# .bash_profile/startx gestartet (siehe unten) - das vermeidet jegliche
# Displaymanager/Boot-Target-Probleme (kein lightdm-Login-Fenster).
sed -e "s/^User=pi$/User=${RUN_USER}/" \
    -e "s#/home/pi#/home/${RUN_USER}#g" \
    "${PROVISIONING_DIR}/cms-player.service" > /etc/systemd/system/cms-player.service
systemctl daemon-reload
systemctl enable cms-player.service

echo "==> Konsolen-Autologin fuer Benutzer ${RUN_USER} aktivieren (kein Login-Fenster)"
# B2 = "Console Autologin": Pi bootet auf die Textkonsole (tty1) und meldet
# den Benutzer automatisch an - kein Displaymanager, keine Passwortabfrage.
# X/Chromium wird danach ueber .bash_profile (startx) gestartet, siehe unten.
raspi-config nonint do_boot_behaviour B2

echo "==> Kiosk-Autostart einrichten (X startet automatisch nach Konsolen-Login)"
cp "${PROVISIONING_DIR}/xinitrc" "/home/${RUN_USER}/.xinitrc"
chmod +x "/home/${RUN_USER}/.xinitrc"
touch "/home/${RUN_USER}/.bash_profile"
if ! grep -q "CMS Player: X automatisch" "/home/${RUN_USER}/.bash_profile" 2>/dev/null; then
  cat "${PROVISIONING_DIR}/bash_profile-append" >> "/home/${RUN_USER}/.bash_profile"
fi
chown "${RUN_USER}:${RUN_USER}" "/home/${RUN_USER}/.xinitrc" "/home/${RUN_USER}/.bash_profile"

chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}"

echo "==> Installation abgeschlossen. Der Raspberry Pi startet den CMS Player automatisch nach dem naechsten Neustart."
