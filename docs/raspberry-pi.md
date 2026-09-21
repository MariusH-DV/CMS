# Raspberry-Pi-Player einrichten

Der CMS Player laeuft als kleiner Node.js-Dienst auf dem Raspberry Pi und zeigt
seine Inhalte in einem Chromium-Kiosk (Vollbild, ohne Bedienelemente) an.

## Ablauf in Kurzform

1. Im CMS: **Mandant -> Pi-Bereitstellung** oeffnen, WLAN-Name und -Passwort
   eingeben, Bereitstellungspaket (ZIP) herunterladen.
2. Paket auf eine SD-Karte / einen Raspberry Pi bringen (zwei Optionen, siehe
   unten) und installieren.
3. Pi starten. Auf dem Bildschirm erscheint eine 6-stellige PIN.
4. Im CMS unter **Mandant -> Geraete -> PIN eingeben** die PIN eintragen und
   einen Anzeigenamen vergeben.
5. Der Pi ist ab sofort registriert, startet zukuenftig automatisch und
   spielt die ihm zugewiesene Playlist ab - ganz ohne erneute PIN-Eingabe.

Das Bereitstellungspaket enthaelt eine ausfuehrliche `README.md` mit beiden
Installationswegen. Kurzfassung:

### Option A - Frische SD-Karte (empfohlen fuer neue Geraete)

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) installieren.
2. Betriebssystem **Raspberry Pi OS Lite (64-bit)** waehlen. Vor dem Flashen
   auf das Zahnrad-Symbol ("Erweiterte Optionen" / OS anpassen) klicken und
   dort **einen Benutzernamen und ein Passwort setzen** (Hostname/SSH nach
   Belieben, WLAN NICHT eintragen - das uebernimmt unser Paket). Das ist ein
   Muss: Raspberry Pi OS legt seit einigen Jahren keinen Standardbenutzer
   mehr an - ohne diesen Schritt wuerde der Pi beim ersten Start einen
   Monitor/Tastatur verlangen, um interaktiv einen Benutzer anzulegen, und
   die automatische Ersteinrichtung waere unterbrochen. Der gewaehlte
   Benutzername ist beliebig (z.B. `pi`) - unser Installationsskript
   erkennt ihn automatisch. Danach flashen.
3. SD-Karte erneut einlegen, den Ordner `cms-provisioning/` aus dem
   heruntergeladenen ZIP in das Wurzelverzeichnis des Boot-Laufwerks kopieren.
4. `cmdline.txt` auf dem Boot-Laufwerk gemaess `firstrun-append.txt` erweitern.
5. SD-Karte in den Pi stecken, starten. Die Ersteinrichtung (WLAN, Player-
   Installation, Autostart) laeuft vollautomatisch - es ist kein Monitor,
   keine Tastatur und keine weitere Eingabe am Pi noetig. Dabei startet der
   Pi **automatisch 2-3 Mal neu** (technisch bedingt: der allererste Boot hat
   noch kein Netzwerk, danach folgt die eigentliche Installation und ein
   letzter Neustart, damit der Kiosk sauber startet) - das ist normal und
   dauert insgesamt ca. 5-10 Minuten. Erst danach erscheint die
   Registrierungs-PIN.

### Option B - Bereits laufender Raspberry Pi

```bash
scp -r cms-provisioning pi@<IP-DES-PI>:/home/pi/
ssh pi@<IP-DES-PI>
cd cms-provisioning
sudo bash install.sh
sudo reboot
```

## Was die Installation einrichtet

- **Player-Dienst** (`cms-player.service`): Node.js-Server, der sich beim CMS
  registriert/anmeldet und die aktuelle Playlist bereitstellt (Port 8088,
  intern).
- **Kiosk-Dienst** (`cms-kiosk.service`): startet Chromium im Vollbild-
  Kiosk-Modus gegen `http://localhost:8088`, sobald der Player-Dienst bereit
  ist.
- **Autologin/Autostart**: beide Dienste sind als systemd-Dienste aktiviert
  (`enable`), starten also automatisch bei jedem Boot, ohne dass sich jemand
  am Pi anmelden muss.
- **WLAN**: sowohl `wpa_supplicant.conf` (aelteres Raspberry Pi OS) als auch
  `nm-wifi.conf` fuer NetworkManager (Standard seit Bookworm) mit den im CMS
  eingegebenen Zugangsdaten - `install.sh` erkennt automatisch, welches
  Netzwerksystem aktiv ist, richtet WLAN als allererstes ein und wartet
  danach auf eine funktionierende Internetverbindung, bevor irgendetwas
  installiert wird.

## Registrierungs-PIN & automatische Anmeldung

- Beim allerersten Start (kein gespeichertes Geraete-Token vorhanden) fordert
  der Player automatisch eine PIN vom CMS an und zeigt sie gross auf dem
  Bildschirm an.
- Sobald die PIN im CMS eingegeben wurde, erkennt der Player das (Polling
  alle 3 Sekunden) und speichert ein dauerhaftes Geraete-Token lokal unter
  `/opt/cms-player/data/device-token.json`.
- Bei jedem weiteren Neustart wird dieses Token verwendet - der Pi meldet
  sich vollautomatisch an, es ist keine erneute PIN-Eingabe noetig.

## Geraet zuruecksetzen

```bash
sudo rm /opt/cms-player/data/device-token.json
sudo systemctl restart cms-player
```

Der Player zeigt danach wieder eine neue Registrierungs-PIN an (das alte
Geraet sollte vorher im CMS entfernt werden, siehe *Geraete*-Seite).

## Ein komplett vorgefertigtes SD-Karten-Image bauen (fortgeschritten)

Fuer die Serienproduktion vieler baugleicher SD-Karten liegt unter
`pi-image/build-image.sh` ein Skript, das mit dem offiziellen
[pi-gen](https://github.com/RPi-Distro/pi-gen)-Projekt ein komplettes,
sofort bootendes `.img` erzeugt, in das das Bereitstellungspaket bereits
eingebettet ist:

```bash
./pi-image/build-image.sh cms-provisioning.zip mein-image-name
```

**Wichtig:** Dieser Vorgang baut ein vollstaendiges Betriebssystem-Image von
Grund auf und benoetigt ein natives Linux mit Root-/Docker-Rechten,
mehrere GB Speicherplatz und 30-90 Minuten Zeit. Er ist nicht fuer
eingeschraenkte Cloud-Sandboxes gedacht, sondern fuer einen eigenen
Build-Server oder CI-Runner. Fuer die Einrichtung einzelner Geraete reicht
in aller Regel Option A oder B oben.

## Fehlerbehebung

| Problem | Loesung |
|---|---|
| PIN wird nicht angezeigt | `sudo systemctl status cms-player` pruefen, Log via `journalctl -u cms-player` |
| Kiosk bleibt schwarz | `sudo systemctl status cms-kiosk`; pruefen ob `cms-player` laeuft (Kiosk wartet darauf) |
| Pi findet CMS nicht | `PUBLIC_API_URL` im Backend pruefen, Netzwerk/WLAN-Verbindung des Pi pruefen |
| Geraet bleibt "Wartet auf Registrierung" | PIN kann abgelaufen sein (15 Minuten) - Pi neu starten fuer neue PIN |
| Pi startet kurz, rote LED bleibt an, gruene LED geht nach einigen Sekunden aus und nichts passiert mehr | Normalerweise ein bereits vor dem Fix behobener Fehler (Installation lief im falschen, netzwerklosen Boot-Modus). Aktuelle Version des Bereitstellungspakets verwenden. Falls es weiterhin auftritt: SD-Karte an einem PC pruefen, ob `/boot/cmdline.txt` noch den `systemd.run=`-Teil enthaelt (sollte nach erfolgreicher erster Phase automatisch entfernt sein) |
| Pi startet in einer Dauerschleife immer wieder neu | Meist ein Fehler in `install.sh` (z.B. keine Internetverbindung im WLAN). Monitor anschliessen und die Boot-Meldungen/Fehler direkt beobachten, oder per SSH (falls in Imager aktiviert) einloggen und `journalctl -u cms-firstboot -b` pruefen |
| Installation haengt nach dem zweiten Neustart, WLAN-LED am Router zeigt keine Verbindung | SSID/Passwort falsch, oder Pi im 5-GHz-Netz waehrend das Modul nur 2,4 GHz unterstuetzt. `install.sh` (ab dieser Version) wartet bis zu 7,5 Minuten auf Internet und versucht es danach automatisch erneut (bis zu 5x pro Stunde) - bei dauerhaft falschem WLAN aber vergeblich. Per Monitor/SSH pruefen: `nmcli connection show` bzw. `wpa_cli status` |
| `install.sh` findet kein WLAN, obwohl SSID/Passwort korrekt sind | Pruefen, welches Netzwerksystem aktiv ist: `systemctl is-active NetworkManager`. Ist es aktiv, muss `/etc/NetworkManager/system-connections/cms-wifi.nmconnection` existieren (aus `nm-wifi.conf`); sonst wird `wpa_supplicant.conf` verwendet |
