#!/bin/bash
# Wird von Raspberry Pi Imager ("Erweiterte Optionen" -> eigenes firstrun.sh) beim
# allerersten Boot einer frisch geflashten SD-Karte automatisch ausgefuehrt.
# Fuehrt die normale Installation aus und raeumt sich danach selbst auf.
set -e

PROVISIONING_DIR="/boot/cms-provisioning"

if [ -d "${PROVISIONING_DIR}" ]; then
  bash "${PROVISIONING_DIR}/install.sh"
fi

# Sich selbst als firstrun deaktivieren, damit es nicht bei jedem Boot laeuft
rm -f /boot/firstrun.sh || true

exit 0
