#!/bin/sh
# CMS Player - startet den Chromium-Kiosk direkt auf dem X-Server, ohne
# Displaymanager/Login-Fenster (siehe bash_profile-append fuer den Autostart).

# Bildschirmschoner/Energiesparen komplett abschalten, damit der Kiosk
# dauerhaft an bleibt und nicht nach ein paar Minuten schwarz wird.
xset s off
xset s noblank
xset -dpms

# Raspberry Pi 4/400/5 haben zwei HDMI-Ausgaenge - der Grafiktreiber legt
# dafuer teils einen virtuellen Bildschirm ueber BEIDE Ausgaenge nebeneinander
# an, auch wenn nur einer tatsaechlich angeschlossen ist. Deshalb: alle laut
# xrandr nicht angeschlossenen Ausgaenge abschalten und den tatsaechlich
# angeschlossenen auf seine native Aufloesung setzen.
for output in $(xrandr --query 2>/dev/null | awk '/ disconnected/{print $1}'); do
  xrandr --output "${output}" --off 2>/dev/null || true
done
CONNECTED_OUTPUT="$(xrandr --query 2>/dev/null | awk '/ connected/{print $1; exit}')"
if [ -n "${CONNECTED_OUTPUT}" ]; then
  xrandr --output "${CONNECTED_OUTPUT}" --auto --primary 2>/dev/null || true
fi

# Aufloesung des aktiven Ausgangs ermitteln, um sie unten explizit an
# Chromium zu uebergeben. Wichtig, weil hier bewusst KEIN Window-Manager
# laeuft (Einfachheit/Robustheit) - ohne WM kann Chromiums "--kiosk" die
# Vollbild-Anfrage aber nicht immer selbst durchsetzen und das Fenster
# bleibt in seiner Standardgroesse in einer Bildschirmecke stehen (der Rest
# zeigt dann einfach den leeren schwarzen X-Hintergrund).
GEOMETRY="$(xrandr --query 2>/dev/null | grep ' connected' | grep -oE '[0-9]+x[0-9]+\+[0-9]+\+[0-9]+' | head -n1)"
CHROMIUM_WINDOW_ARGS=""
if [ -n "${GEOMETRY}" ]; then
  SCREEN_RES="${GEOMETRY%%+*}"
  CHROMIUM_WINDOW_ARGS="--window-size=${SCREEN_RES%%x*},${SCREEN_RES##*x} --window-position=0,0"
fi

# Mauszeiger nach kurzer Inaktivitaet ausblenden (kosmetisch fuer den Kiosk).
unclutter -idle 0.5 -root &

# Eigenes Logo weiter anzeigen, bis Chromium bereit ist: Plymouth (Boot-Splash
# mit dem gleichen Logo) wird schon kurz vor diesem Punkt beendet, Chromium
# braucht aber noch ein paar Sekunden (Warten auf cms-player, Browserstart) -
# ohne das hier waere der Bildschirm in dieser Luecke kurz schwarz.
LOGO_PATH="/opt/cms-player/branding/logo.png"
if [ -f "${LOGO_PATH}" ] && command -v feh >/dev/null 2>&1; then
  feh --fullscreen --image-bg "#0B1020" "${LOGO_PATH}" &
  FEH_PID=$!
fi

# Warten, bis der lokale CMS-Player-Dienst (Backend-Verbindung, Playlist)
# erreichbar ist, bevor Chromium startet.
until curl -s http://localhost:8088/health > /dev/null 2>&1; do
  sleep 1
done

# Logo-Anzeige beenden, bevor Chromium uebernimmt.
[ -n "${FEH_PID}" ] && kill "${FEH_PID}" 2>/dev/null || true

# Der Name des Chromium-Binaries hat sich zwischen Raspberry-Pi-OS-Versionen
# geaendert: auf aelteren Versionen ist "chromium-browser" das echte Programm,
# auf neueren (Debian "Trixie" und neuer) ist "chromium-browser" nur noch ein
# leeres Transitional-Paket ohne eigene Datei - das echte Programm heisst
# schlicht "chromium". Deshalb hier dynamisch ermitteln statt fest zu
# verdrahten.
CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || echo chromium-browser)"

# Falls Chromium abstuerzt, automatisch neu starten. WICHTIG: der Chromium-
# Start-Wrapper kehrt normalerweise sofort zur Shell zurueck (typisches
# Verhalten von Browser-Launcher-Skripten) - auch beim allerersten echten
# Start. Ein simples "while true; do chromium ...; sleep N; done" wuerde
# deshalb NICHT auf einen Absturz warten, sondern bei jedem Schleifen-
# durchlauf erneut chromium aufrufen. Da schon eine Instanz laeuft, haengt
# sich der Aufruf dann per "Opening in existing browser session" einfach als
# zusaetzlichen Tab an die laufende Instanz an - alle paar Sekunden ein
# weiterer Tab, was wie ein staendiges Neuladen/Flackern aussieht und
# nach und nach den Speicher aufbraucht.
# Deshalb: vor jedem (Neu-)Start pruefen, ob schon eine Instanz mit unserer
# Kiosk-URL laeuft, und nur bei Bedarf tatsaechlich neu starten.
while true; do
  if ! pgrep -f "http://localhost:8088" >/dev/null 2>&1; then
    "${CHROMIUM_BIN}" \
      --kiosk \
      --start-fullscreen \
      ${CHROMIUM_WINDOW_ARGS} \
      --lang=de \
      --noerrdialogs \
      --disable-infobars \
      --disable-features=Translate,TranslateUI \
      --disable-session-crashed-bubble \
      --disable-pinch \
      --overscroll-history-navigation=0 \
      --check-for-update-interval=31536000 \
      --autoplay-policy=no-user-gesture-required \
      --disable-background-networking \
      --disable-sync \
      --disable-component-update \
      --disable-extensions \
      --disable-component-extensions-with-background-pages \
      http://localhost:8088 &
  fi
  sleep 5
done
