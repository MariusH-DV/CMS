# CMS Player - Raspberry Pi Bereitstellungspaket

Dieses Paket wurde fuer den Mandanten **{{TENANT_NAME}}** erzeugt und enthaelt alles,
um einen Raspberry Pi als Digital-Signage-Player fuer das CMS einzurichten.

WLAN wurde bereits mit dem von dir eingegebenen Netzwerk **{{SSID}}** vorkonfiguriert.
Ein Registrierungs-PIN ist NICHT im Paket enthalten - dieser wird vom Player beim ersten
Start automatisch generiert und auf dem Bildschirm angezeigt. Du gibst diese PIN danach
einmalig im CMS unter "Mandant -> Geraete -> PIN eingeben" ein, um das Geraet mit
**{{TENANT_NAME}}** zu verbinden. Ab dann meldet sich der Player bei jedem weiteren
Neustart automatisch an (kein PIN mehr noetig).

## Option A - Frische SD-Karte mit dem Raspberry Pi Imager (empfohlen)

1. Lade den [Raspberry Pi Imager](https://www.raspberrypi.com/software/) herunter.
2. Waehle als Betriebssystem **Raspberry Pi OS Lite (64-bit)**.
3. Klicke auf das Zahnrad-Symbol ("Erweiterte Optionen" / OS anpassen) und setze dort
   **einen Benutzernamen und ein Passwort** (aktiviere zusaetzlich gerne SSH). WLAN
   musst du dort NICHT eintragen, das uebernimmt dieses Paket.
   **Wichtig:** Diesen Schritt nicht ueberspringen - Raspberry Pi OS legt seit
   einigen Jahren keinen Standardbenutzer mehr automatisch an. Ohne einen hier
   gesetzten Benutzer wuerde der Pi beim ersten Start einen angeschlossenen
   Monitor/Tastatur verlangen, um interaktiv einen Benutzer anzulegen - die
   automatische Einrichtung waere dann unterbrochen. Der Benutzername selbst
   ist frei waehlbar (z.B. `pi`), das Installationsskript erkennt ihn automatisch.
4. Flashe die SD-Karte.
5. Nach dem Flashen: SD-Karte am Rechner erneut einlegen. Es erscheint das Boot-Laufwerk
   ("bootfs" bzw. "boot").
6. Kopiere den kompletten Ordner `cms-provisioning/` aus diesem Paket in das Wurzelverzeichnis
   des Boot-Laufwerks.
7. Kopiere zusaetzlich `firstrun-append.txt` -> haenge den Inhalt an die Datei `cmdline.txt`
   auf dem Boot-Laufwerk an (siehe Anleitung in `firstrun-append.txt`).
8. SD-Karte in den Raspberry Pi stecken und starten. WLAN wird eingerichtet, der Player
   installiert und der Kiosk-Modus aktiviert - **der Pi startet dabei automatisch 2-3 Mal
   neu, das ist normal** (die Installation braucht insgesamt ca. 5-10 Minuten, je nach
   Internetverbindung). Erst danach erscheint die Registrierungs-PIN auf dem Bildschirm.

## Option B - Bestehender, bereits laufender Raspberry Pi

1. Kopiere den Ordner `cms-provisioning/` per `scp` auf den Pi, z.B.:
   `scp -r cms-provisioning pi@<IP-DES-PI>:/home/pi/`
2. Per SSH auf dem Pi einloggen und ausfuehren:
   ```
   cd /home/pi/cms-provisioning
   sudo bash install.sh
   sudo reboot
   ```
3. Nach dem Neustart startet der Player automatisch im Vollbild und zeigt die
   Registrierungs-PIN an.

## Inhalt des Pakets

- `player/` - der Player selbst (Node.js-Server + Kiosk-Weboberflaeche)
- `player-config.json` - enthaelt die CMS-API-Adresse und die Mandanten-ID
- `wpa_supplicant.conf` - dein hinterlegtes WLAN
- `install.sh` - Installationsskript (Option B)
- `firstrun.sh` - Installationsskript fuer die automatische Erstinstallation (Option A)
- `cms-player.service`, `cms-kiosk.service` - systemd-Dienste fuer Autostart

## Geraet zuruecksetzen / neu registrieren

Loesche auf dem Pi die Datei `/opt/cms-player/data/device-token.json` und starte den
Dienst neu (`sudo systemctl restart cms-player`). Der Player zeigt danach wieder eine
neue Registrierungs-PIN an.
