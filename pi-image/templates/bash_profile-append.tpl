
# --- CMS Player: X automatisch auf tty1 starten (Kiosk-Modus, kein Login-Fenster) ---
if [ -z "${DISPLAY}" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx -- -nocursor
fi
