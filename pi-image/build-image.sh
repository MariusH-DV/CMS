#!/bin/bash
# Baut ein komplett fertiges, flashbares Raspberry-Pi-OS-Image (.img) mit bereits
# vorinstalliertem CMS Player, inkl. Autostart und (optional) WLAN-Zugangsdaten.
#
# WICHTIG: Dieses Skript baut ein komplettes Betriebssystem-Image von Grund auf
# (mittels des offiziellen "pi-gen"-Projekts von Raspberry Pi). Das ist ein
# ressourcenintensiver Vorgang:
#   - benoetigt ein natives 64-bit Linux (Debian/Ubuntu empfohlen) mit Root-Rechten
#   - benoetigt debootstrap, qemu-user-static, binfmt-support, parted, kpartx u.a.
#   - laedt mehrere hundert MB Basis-Paket herunter
#   - dauert je nach Hardware 30-90 Minuten
#   - benoetigt ca. 15-20 GB freien Speicherplatz
#
# Es ist NICHT dafuer gedacht, in einer eingeschraenkten Cloud-/CI-Sandbox ohne
# Root-/Loop-Device-Rechte zu laufen. Fuehre es auf einem eigenen Build-Server,
# einem Linux-Rechner oder einem dedizierten CI-Runner mit privilegiertem Docker
# aus. Fuer die schnelle Inbetriebnahme einzelner Geraete reicht in der Regel
# das per API/Frontend erzeugte ZIP-Bereitstellungspaket in Kombination mit dem
# offiziellen Raspberry Pi Imager (siehe pi-image/templates/README.md.tpl) -
# dieses Skript ist fuer die Massenproduktion vorkonfigurierter SD-Karten gedacht.
#
# Verwendung:
#   ./build-image.sh <provisioning-zip> <output-name>
#
# <provisioning-zip> ist das ZIP, das die CMS-API unter
#   POST /api/tenants/:tenantId/provisioning/package
# erzeugt (enthaelt WLAN-Zugangsdaten, Player-App, systemd-Units).

set -euo pipefail

PROVISIONING_ZIP="${1:?Pfad zum Provisioning-ZIP fehlt}"
OUTPUT_NAME="${2:-cms-player-image}"

WORK_DIR="$(mktemp -d)"
PI_GEN_DIR="${WORK_DIR}/pi-gen"

echo "==> Pruefe Voraussetzungen"
for cmd in git docker; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Fehlt: $cmd"; exit 1; }
done

echo "==> Klone pi-gen (offizielles Raspberry-Pi-OS-Buildsystem)"
git clone --depth 1 https://github.com/RPi-Distro/pi-gen.git "${PI_GEN_DIR}"

echo "==> Entpacke Provisioning-Paket"
mkdir -p "${WORK_DIR}/cms-provisioning"
unzip -q "${PROVISIONING_ZIP}" -d "${WORK_DIR}"

echo "==> Erzeuge eigene pi-gen-Stage, die das Provisioning-Paket einbettet"
CUSTOM_STAGE="${PI_GEN_DIR}/stage-cms-player"
mkdir -p "${CUSTOM_STAGE}/00-install-cms-player/files"
cp -r "${WORK_DIR}/cms-provisioning" "${CUSTOM_STAGE}/00-install-cms-player/files/"
touch "${CUSTOM_STAGE}/EXPORT_IMAGE"
cat > "${CUSTOM_STAGE}/prerun.sh" <<'EOF'
#!/bin/bash -e
if [ ! -d "${ROOTFS_DIR}" ]; then
  copy_previous
fi
EOF
chmod +x "${CUSTOM_STAGE}/prerun.sh"

mkdir -p "${CUSTOM_STAGE}/00-install-cms-player"
cat > "${CUSTOM_STAGE}/00-install-cms-player/00-run-chroot.sh" <<'EOF'
#!/bin/bash -e
cp -r /tmp/cms-provisioning /boot/cms-provisioning
chmod +x /boot/cms-provisioning/install.sh
# rc.local laeuft beim ersten echten Boot des fertigen Images bereits nach
# dem Netzwerkstart (anders als der cloud-init-/cmdline.txt-Weg fuer per
# Imager geflashte SD-Karten), install.sh kann daher direkt aufgerufen
# werden. Marker-Datei verhindert erneutes Ausfuehren bei jedem Boot.
cat >> /etc/rc.local <<'RC'
if [ -f /boot/cms-provisioning/install.sh ] && [ ! -f /var/lib/cms-player-installed ]; then
  bash /boot/cms-provisioning/install.sh && touch /var/lib/cms-player-installed
fi
RC
EOF
chmod +x "${CUSTOM_STAGE}/00-install-cms-player/00-run-chroot.sh"

cat > "${PI_GEN_DIR}/config" <<EOF
IMG_NAME='${OUTPUT_NAME}'
RELEASE=bookworm
DEPLOY_COMPRESSION=zip
STAGE_LIST="stage0 stage1 stage2 ${CUSTOM_STAGE##*/}"
EOF

echo "==> Starte pi-gen Build (Docker, benoetigt privilegierten Modus)"
cd "${PI_GEN_DIR}"
./build-docker.sh

echo "==> Fertig. Das Image liegt unter ${PI_GEN_DIR}/deploy/"
echo "    Flashe es z.B. mit: rpi-imager --cli deploy/${OUTPUT_NAME}.img.zip /dev/sdX"
