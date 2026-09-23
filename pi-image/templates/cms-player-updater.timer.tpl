[Unit]
Description=CMS Player - periodischer Auto-Update-Check

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min
Persistent=true

[Install]
WantedBy=timers.target
