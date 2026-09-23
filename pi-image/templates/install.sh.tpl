#!/bin/bash
# CMS Player - Installationsskript fuer Raspberry Pi OS (Lite oder Desktop, Bullseye/Bookworm)
# Wird entweder manuell auf einem bereits laufenden Pi ausgefuehrt (Option B),
# oder automatisch per cloud-init "runcmd" beim ersten Start aufgerufen
# (Option A, siehe userdata-append.txt) - in beiden Faellen ist zu diesem
# Zeitpunkt bereits Netzwerk vorhanden.
set -e

# Fortschritt zusaetzlich auf dem angeschlossenen Bildschirm anzeigen - vor
# allem bei Option A (automatischer Start ueber cloud-init "runcmd") wichtig:
# dort landet die Ausgabe sonst nur in der cloud-init-Logdatei, der Monitor
# bleibt bis zum Ende komplett schwarz. tee schreibt zusaetzlich weiterhin
# ganz normal in die eigentliche Log-Ausgabe (bei Option B also weiterhin auch
# im SSH-Terminal sichtbar).
if [ -w /dev/tty1 ]; then
  exec > >(tee -a /dev/tty1) 2>&1
fi

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

# WLAN-Stromsparmodus abschalten - unabhaengig davon, WIE die WLAN-Verbindung
# eingerichtet wurde (auch wenn sie bereits vom Raspberry Pi Imager selbst
# angelegt wurde, nicht nur bei einem eigenen nm-wifi.conf-Profil oben).
# Stromsparen kann den Durchsatz drastisch einbrechen lassen (im Extremfall
# auf wenige kB/s), was gerade den Paketdownload weiter unten unnoetig
# ausbremst.
if command -v nmcli >/dev/null 2>&1 && systemctl is-active --quiet NetworkManager 2>/dev/null; then
  ACTIVE_WIFI_CONN="$(nmcli -t -f NAME,TYPE connection show --active 2>/dev/null | awk -F: '$2=="802-11-wireless"{print $1; exit}')"
  if [ -n "${ACTIVE_WIFI_CONN}" ]; then
    nmcli connection modify "${ACTIVE_WIFI_CONN}" 802-11-wireless.powersave 2 || true
    nmcli connection up "${ACTIVE_WIFI_CONN}" || true
  fi
fi
iw dev wlan0 set power_save off 2>/dev/null || true

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

echo "==> Systemzeit synchronisieren (wichtig fuer Zeitstempel/Logs und fuer die"
echo "    HTTPS-Zertifikatspruefung bei apt/npm - ein Raspberry Pi hat keine"
echo "    batteriegepufferte Echtzeituhr und kann nach dem Boot eine falsche"
echo "    Zeit haben, bis die Synchronisierung abgeschlossen ist)"
timedatectl set-ntp true 2>/dev/null || true
for i in $(seq 1 20); do
  if timedatectl status 2>/dev/null | grep -q "System clock synchronized: yes"; then
    break
  fi
  sleep 1
done
echo "==> Aktuelle Systemzeit: $(date)"

echo "==> Systempakete aktualisieren und Abhaengigkeiten installieren"
# Manche Heimnetze/Router haben eine kaputte/unvollstaendige IPv6-Route -
# apt versucht dann oft trotzdem zuerst IPv6 und haengt/schlaegt fehl
# ("Unable to connect ... [IP: <ipv6>]"), obwohl IPv4 einwandfrei geht.
# Deshalb apt fest auf IPv4 zwingen.
echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4
apt-get update -y
apt-get install -y --no-install-recommends \
  nodejs npm chromium-browser unclutter xdotool xserver-xorg xinit x11-xserver-utils curl unzip \
  plymouth plymouth-themes feh

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

echo "==> Aktuelle Player-Version vermerken (fuer den Auto-Updater)"
# Verhindert, dass der Auto-Updater direkt nach der Installation ein erneutes
# (unnoetiges) Update des gerade frisch installierten Codes anstoesst.
API_URL="$(node -e "console.log(require('${INSTALL_DIR}/config/player-config.json').apiBaseUrl)" 2>/dev/null || true)"
if [ -n "${API_URL}" ]; then
  curl -fsS --max-time 15 "${API_URL}/public/player/version" 2>/dev/null \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).version||'')}catch(e){}})" \
    > "${INSTALL_DIR}/.player-version" 2>/dev/null || true
fi

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

echo "==> Auto-Update-Mechanismus fuer den Player-Quellcode einrichten"
# Ausserhalb von INSTALL_DIR, da das Update-Skript genau dessen Inhalt
# austauscht und sich nicht selbst waehrend der Ausfuehrung loeschen darf.
UPDATER_DIR="/opt/cms-player-updater"
mkdir -p "${UPDATER_DIR}"
cp "${PROVISIONING_DIR}/player-update-check.sh" "${UPDATER_DIR}/player-update-check.sh"
chmod +x "${UPDATER_DIR}/player-update-check.sh"
cp "${PROVISIONING_DIR}/cms-player-updater.service" /etc/systemd/system/cms-player-updater.service
cp "${PROVISIONING_DIR}/cms-player-updater.timer" /etc/systemd/system/cms-player-updater.timer
systemctl daemon-reload
systemctl enable --now cms-player-updater.timer

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

echo "==> Eigenes Logo als Boot-Splash einrichten (Plymouth)"
# Ersetzt den Standard-Bootbildschirm durch ein eigenes, zentriertes Logo auf
# dunklem Hintergrund (gleiche Farbe wie der Player, fuer einen nahtlosen
# Uebergang). Eigenes minimales Theme statt das mitgelieferte "pix"-Theme zu
# veraendern - so sind wir nicht auf dessen interne Bildmasse/Skriptlogik
# angewiesen.
mkdir -p /usr/share/plymouth/themes/cms-kiosk
cp "${PROVISIONING_DIR}/cms-kiosk.plymouth" /usr/share/plymouth/themes/cms-kiosk/cms-kiosk.plymouth
cp "${PROVISIONING_DIR}/cms-kiosk.script" /usr/share/plymouth/themes/cms-kiosk/cms-kiosk.script
cp "${PROVISIONING_DIR}/logo.png" /usr/share/plymouth/themes/cms-kiosk/logo.png
if command -v plymouth-set-default-theme >/dev/null 2>&1; then
  plymouth-set-default-theme -R cms-kiosk 2>/dev/null \
    || (plymouth-set-default-theme cms-kiosk && update-initramfs -u) \
    || true
fi
raspi-config nonint do_boot_splash 0 2>/dev/null || true

# Logo zusaetzlich fuer .xinitrc bereitstellen: Plymouth wird kurz vor Erreichen
# von multi-user.target beendet, X/Chromium brauchen danach aber noch ein paar
# Sekunden (Warten auf cms-player, Chromium-Start) - in dieser Luecke zeigt
# .xinitrc das gleiche Logo weiter an, damit der Bildschirm nicht kurz
# schwarz wird.
mkdir -p "${INSTALL_DIR}/branding"
cp "${PROVISIONING_DIR}/logo.png" "${INSTALL_DIR}/branding/logo.png"

echo "==> Chromium-Uebersetzungsvorschlag ueber Enterprise-Policy abschalten"
# Kommandozeilen-Flags wie --disable-features=Translate/-TranslateUI sind je
# nach Chromium-Version inkonsistent benannt und teils wirkungslos (siehe
# https://issues.chromium.org/issues/41347677). Die offiziell dokumentierte,
# stabile Methode ist eine Chrome-Enterprise-Policy-Datei - die respektiert
# Chromium zuverlaessig unabhaengig von der Version. Wird an beide moeglichen
# Policy-Pfade geschrieben (Paketname "chromium" vs. "chromium-browser"
# unterscheidet sich je nach Raspberry Pi OS Version).
for policy_dir in /etc/chromium/policies/managed /etc/chromium-browser/policies/managed; do
  mkdir -p "${policy_dir}"
  cat > "${policy_dir}/cms-kiosk-policy.json" <<'POLICY_EOF'
{
  "TranslateEnabled": false,
  "DefaultBrowserSettingEnabled": false,
  "SyncDisabled": true,
  "BackgroundModeEnabled": false
}
POLICY_EOF
done

chown -R "${RUN_USER}:${RUN_USER}" "${INSTALL_DIR}"

echo "==> Installation abgeschlossen. Der Raspberry Pi startet den CMS Player automatisch nach dem naechsten Neustart."
