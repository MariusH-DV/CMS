[Unit]
Description=CMS Player - Auto-Update-Check (Quellcode)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/cms-player-updater/player-update-check.sh
