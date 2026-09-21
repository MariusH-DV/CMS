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

# Eigenen Pfad dynamisch ermitteln statt "/boot" hart zu kodieren: aktuelle
# Raspberry Pi OS Versionen (Bookworm+) haengen die Boot-Partition unter
# /boot/firmware ein, aeltere unter /boot - je nachdem, welcher Pfad in
# cmdline.txt eingetragen wurde (siehe firstrun-append.txt), landet dieses
# Skript an der jeweils richtigen Stelle. ${BASH_SOURCE[0]} ist dabei genau
# der Pfad, unter dem systemd dieses Skript ueber "systemd.run=" aufgerufen hat.
PROVISIONING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOT_ROOT="$(dirname "${PROVISIONING_DIR}")"
CMDLINE_FILE="${BOOT_ROOT}/cmdline.txt"
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
  "${CMDLINE_FILE}"

rm -f "${PROVISIONING_DIR}/firstrun.sh" || true

exit 0
