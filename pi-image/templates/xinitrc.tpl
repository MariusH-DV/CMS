#!/bin/sh
# CMS Player - startet den Chromium-Kiosk direkt auf dem X-Server, ohne
# Displaymanager/Login-Fenster (siehe bash_profile-append fuer den Autostart).

# Bildschirmschoner/Energiesparen komplett abschalten, damit der Kiosk
# dauerhaft an bleibt und nicht nach ein paar Minuten schwarz wird.
xset s off
xset s noblank
xset -dpms

# Mauszeiger nach kurzer Inaktivitaet ausblenden (kosmetisch fuer den Kiosk).
unclutter -idle 0.5 -root &

# Warten, bis der lokale CMS-Player-Dienst (Backend-Verbindung, Playlist)
# erreichbar ist, bevor Chromium startet.
until curl -s http://localhost:8088/health > /dev/null 2>&1; do
  sleep 1
done

# Der Name des Chromium-Binaries hat sich zwischen Raspberry-Pi-OS-Versionen
# geaendert: auf aelteren Versionen ist "chromium-browser" das echte Programm,
# auf neueren (Debian "Trixie" und neuer) ist "chromium-browser" nur noch ein
# leeres Transitional-Paket ohne eigene Datei - das echte Programm heisst
# schlicht "chromium". Deshalb hier dynamisch ermitteln statt fest zu
# verdrahten.
CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || echo chromium-browser)"

# Falls Chromium abstuerzt, automatisch neu starten (kein systemd noetig,
# da wir absichtlich ohne Displaymanager arbeiten).
while true; do
  "${CHROMIUM_BIN}" \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --check-for-update-interval=31536000 \
    --autoplay-policy=no-user-gesture-required \
    http://localhost:8088
  sleep 3
done
