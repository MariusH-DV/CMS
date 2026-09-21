#!/bin/bash
# Wird ueber den systemd.run=-Kernel-Parameter (siehe firstrun-append.txt) beim
# allerersten Boot einer frisch geflashten SD-Karte automatisch ausgefuehrt -
# und zwar innerhalb von "kernel-command-line.target", einem sehr fruehen,
# minimalen systemd-Ziel OHNE Netzwerk. apt-get/npm (in install.sh) wuerden
# hier haengen bleiben (kein Internet verfuegbar) - deshalb richtet dieses
# Skript nur einen einmaligen Dienst ein, der beim naechsten NORMALEN Boot
# (mit Netzwerk) die eigentliche Installation durchfuehrt, und stoesst dann
# einen Neustart an. Insgesamt startet der Pi bei der Ersteinrichtung daher
# zwei- bis dreimal neu - das ist normal und beabsichtigt.
set -e

PROVISIONING_DIR="/boot/cms-provisioning"
SERVICE_FILE="/etc/systemd/system/cms-firstboot.service"

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=CMS Player - einmalige Ersteinrichtung (nach Netzwerkstart)
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=3600
StartLimitBurst=5

[Service]
Type=oneshot
ExecStart=/bin/bash ${PROVISIONING_DIR}/install.sh
ExecStartPost=/bin/systemctl disable cms-firstboot.service
ExecStartPost=/bin/systemctl reboot
TimeoutStartSec=1800
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cms-firstboot.service

# systemd.run=... aus cmdline.txt entfernen, damit kuenftige Boots normal
# (nicht wieder ueber kernel-command-line.target) starten.
sed -i \
  -e 's/ systemd\.run=[^ ]*//' \
  -e 's/ systemd\.run_success_action=[^ ]*//' \
  -e 's/ systemd\.unit=kernel-command-line\.target//' \
  /boot/cmdline.txt

rm -f "${PROVISIONING_DIR}/firstrun.sh" || true

exit 0
