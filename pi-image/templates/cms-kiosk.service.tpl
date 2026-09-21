[Unit]
Description=CMS Player - Kiosk (Chromium Vollbild)
After=cms-player.service graphical.target
Requires=cms-player.service
Wants=graphical.target

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
ExecStartPre=/bin/sh -c 'until curl -s http://localhost:8088/health > /dev/null; do sleep 1; done'
ExecStart=/usr/bin/chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:8088
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
