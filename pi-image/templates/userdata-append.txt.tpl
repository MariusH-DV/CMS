Anleitung: Aktuelle Raspberry Pi OS Versionen richten den im Raspberry Pi
Imager gesetzten Benutzer/WLAN/SSH ueber "cloud-init" ein. Dabei legt der
Imager auf dem Boot-Laufwerk automatisch eine Datei namens "user-data" an
(YAML-Format). Diese Datei erweitern wir um einen einzigen zusaetzlichen
Befehl, der beim ersten Start automatisch unser Installationsskript ausfuehrt
- ein Bearbeiten von "cmdline.txt" ist NICHT mehr noetig.

WICHTIG: YAML ist einrueckungsempfindlich (Leerzeichen, keine Tabs). Am
sichersten ist es, den Inhalt deiner "user-data"-Datei dem CMS-Support /
Claude zu zeigen und die passende, exakt angepasste Version zurueck zu
bekommen, statt blind Zeilen einzufuegen.

Schritt fuer Schritt:

1. Oeffne "user-data" im Wurzelverzeichnis des Boot-Laufwerks mit einem
   einfachen Texteditor (Notepad, kein Word).

2a. Falls die Datei bereits eine Zeile "runcmd:" enthaelt: fuege DARUNTER,
    mit der GLEICHEN Einrueckung wie die anderen Listenpunkte darunter
    (typischerweise zwei Leerzeichen + Bindestrich), diese eine Zeile hinzu:

  - [ bash, -c, "for d in /boot/firmware/cms-provisioning /boot/cms-provisioning; do [ -f \"$d/install.sh\" ] && exec bash \"$d/install.sh\"; done" ]

2b. Falls die Datei KEINE Zeile "runcmd:" enthaelt: haenge ganz ans Ende der
    Datei (ohne Einrueckung vor "runcmd:" und "power_state:") folgenden
    Block an:

runcmd:
  - [ bash, -c, "for d in /boot/firmware/cms-provisioning /boot/cms-provisioning; do [ -f \"$d/install.sh\" ] && exec bash \"$d/install.sh\"; done" ]

power_state:
  mode: reboot
  message: CMS Player Ersteinrichtung abgeschlossen
  condition: true

3. Datei speichern.

Der obige Befehl sucht das cms-provisioning-Verzeichnis automatisch sowohl
unter /boot/firmware (aktuelle Raspberry Pi OS Versionen) als auch unter
/boot (aeltere Versionen) - du musst dich also nicht festlegen, welcher der
beiden Pfade bei dir zutrifft.

Falls auf dem Boot-Laufwerk GAR KEINE "user-data"-Datei existiert: dann
wurde im Raspberry Pi Imager beim Flashen nicht "OS anpassen" verwendet.
Bitte den Vorgang wiederholen und dort mindestens einen Benutzernamen und
ein Passwort setzen (siehe README.md) - danach existiert die Datei.
