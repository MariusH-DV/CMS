[Unit]
Description=CMS Player - Hintergrunddienst (Anmeldung, Playlist-Sync)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/cms-player
ExecStart=/usr/bin/node /opt/cms-player/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PLAYER_CONFIG=/opt/cms-player/config/player-config.json

[Install]
WantedBy=multi-user.target
