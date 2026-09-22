
# --- CMS Player: X automatisch auf tty1 starten (Kiosk-Modus, kein Login-Fenster) ---
if [ -z "${DISPLAY}" ] && [ "$(tty)" = "/dev/tty1" ]; then
  # Kein "exec" und keine zusaetzlichen Xorg-Serverargumente: schlaegt X aus
  # irgendeinem Grund fehl, wuerde "exec" die Login-Shell sofort mitbeenden -
  # zusammen mit dem Konsolen-Autologin ergaebe das eine sehr schnelle,
  # unsichtbare Neustart-Schleife (kurzer Fehler, dann schwarzer Bildschirm).
  # Stattdessen: X normal aufrufen, Ausgabe protokollieren und nach einem
  # etwaigen Absturz kurz warten, damit ein Fehler lesbar bleibt bzw. per SSH
  # in /tmp/cms-startx.log nachvollziehbar ist.
  startx > /tmp/cms-startx.log 2>&1
  sleep 5
fi
