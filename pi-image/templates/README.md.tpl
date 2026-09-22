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

Aktuelle Raspberry Pi OS Versionen richten die Ersteinrichtung (Benutzer,
WLAN, SSH) ueber "cloud-init" ein. Wir haengen unser Installationsskript an
genau diesen Mechanismus an - ein Bearbeiten von `cmdline.txt` ist **nicht**
mehr noetig.

1. Lade den [Raspberry Pi Imager](https://www.raspberrypi.com/software/) herunter.
2. Waehle als Betriebssystem **Raspberry Pi OS Lite (64-bit)**.
3. Klicke auf das Zahnrad-Symbol ("Erweiterte Optionen" / OS anpassen) und setze dort:
   - **Benutzername + Passwort** (z.B. `pi`, beliebig waehlbar)
   - **WLAN** (SSID **{{SSID}}** und das im CMS eingegebene Passwort) - diesmal
     direkt hier eintragen, nicht ueber das Paket
   - SSH aktivieren (empfohlen, erleichtert die Fehlersuche)
   **Wichtig:** Diesen Schritt nicht ueberspringen - Raspberry Pi OS legt seit
   einigen Jahren keinen Standardbenutzer mehr automatisch an, und ohne diese
   Angaben wuerde der Pi einen angeschlossenen Monitor/Tastatur verlangen.
4. Flashe die SD-Karte.
5. Nach dem Flashen: SD-Karte am Rechner erneut einlegen. Es erscheint das Boot-Laufwerk
   ("bootfs" bzw. "boot").
6. Kopiere den kompletten Ordner `cms-provisioning/` aus diesem Paket in das Wurzelverzeichnis
   des Boot-Laufwerks.
7. Oeffne die Datei `userdata-append.txt` aus diesem Paket und folge der Anleitung
   darin, um die vom Imager bereits erzeugte Datei `user-data` auf dem
   Boot-Laufwerk um einen zusaetzlichen Startbefehl zu ergaenzen.
8. SD-Karte in den Raspberry Pi stecken und starten. Der Player wird installiert
   und der Kiosk-Modus aktiviert, danach startet der Pi automatisch einmal neu
   (das ist normal) - die Installation braucht insgesamt ca. 5-10 Minuten, je
   nach Internetverbindung. Erst danach erscheint die Registrierungs-PIN auf
   dem Bildschirm.

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
- `wpa_supplicant.conf`, `nm-wifi.conf` - dein hinterlegtes WLAN (fuer beide
  auf Raspberry Pi OS moeglichen Netzwerk-Systeme, `install.sh` erkennt automatisch,
  welches davon verwendet wird)
- `install.sh` - das eigentliche Installationsskript (fuer Option A automatisch
  per cloud-init, fuer Option B manuell per SSH). Richtet zuerst WLAN ein
  (falls noch nicht per Imager verbunden) und wartet bis zu 7,5 Minuten auf
  eine echte Internetverbindung, bevor Pakete installiert werden
- `userdata-append.txt` - Anleitung, um `install.sh` bei Option A automatisch
  per cloud-init starten zu lassen
- `cms-player.service` - systemd-Dienst fuer den Player-Hintergrunddienst
- `xinitrc`, `bash_profile-append` - starten den Chromium-Kiosk automatisch
  nach dem Konsolen-Login (kein Displaymanager, kein Login-Fenster)

## Geraet zuruecksetzen / neu registrieren

Loesche auf dem Pi die Datei `/opt/cms-player/data/device-token.json` und starte den
Dienst neu (`sudo systemctl restart cms-player`). Der Player zeigt danach wieder eine
neue Registrierungs-PIN an.
