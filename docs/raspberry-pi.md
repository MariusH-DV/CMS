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

Aktuelle Raspberry Pi OS Versionen richten Benutzer/WLAN/SSH ueber
**cloud-init** ein. Unser Paket haengt sich an genau diesen Mechanismus an -
ein Bearbeiten von `cmdline.txt` ist **nicht** noetig (und wird nicht mehr
empfohlen, siehe Hintergrund unten).

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) installieren.
2. Betriebssystem **Raspberry Pi OS Lite (64-bit)** waehlen. Vor dem Flashen
   auf das Zahnrad-Symbol ("Erweiterte Optionen" / OS anpassen) klicken und
   dort setzen:
   - **Benutzername + Passwort** (beliebig, z.B. `pi`)
   - **WLAN** (SSID/Passwort - diesmal direkt hier eintragen)
   - SSH aktivieren (empfohlen fuer die Fehlersuche)

   Das ist ein Muss: Raspberry Pi OS legt seit einigen Jahren keinen
   Standardbenutzer mehr an - ohne diesen Schritt wuerde der Pi beim ersten
   Start einen Monitor/Tastatur verlangen, um interaktiv einen Benutzer
   anzulegen, und die automatische Ersteinrichtung waere unterbrochen.
   Danach flashen.
3. SD-Karte erneut einlegen, den Ordner `cms-provisioning/` aus dem
   heruntergeladenen ZIP in das Wurzelverzeichnis des Boot-Laufwerks kopieren.
4. Die vom Imager bereits erzeugte Datei `user-data` auf dem Boot-Laufwerk
   gemaess der Anleitung in `cms-provisioning/userdata-append.txt` um einen
   Startbefehl erweitern.
5. SD-Karte in den Pi stecken, starten. Die Ersteinrichtung (Player-
   Installation, Autostart) laeuft vollautomatisch - es ist kein Monitor,
   keine Tastatur und keine weitere Eingabe am Pi noetig. Dabei startet der
   Pi **einmal automatisch neu**, das ist normal und dauert insgesamt ca.
   5-10 Minuten. Erst danach erscheint die Registrierungs-PIN.

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
- **WLAN**: bei Option A idealerweise bereits durch den Raspberry Pi Imager
  selbst verbunden (siehe oben). `install.sh` bringt zusaetzlich eigene
  WLAN-Konfiguration mit (`wpa_supplicant.conf` und `nm-wifi.conf`, je
  nachdem welches Netzwerksystem aktiv ist) und wartet bis zu 7,5 Minuten auf
  eine funktionierende Internetverbindung, bevor irgendetwas installiert wird
  - nuetzlich vor allem fuer Option B oder falls WLAN im Imager vergessen wurde.

## Hintergrund: warum cloud-init statt cmdline.txt?

Fruehere Versionen dieser Anleitung nutzten einen `systemd.run=`-Eintrag in
`cmdline.txt`, um beim allerersten, noch netzwerklosen Boot ein eigenes
Skript auszufuehren. Aktuelle Raspberry Pi OS Versionen verwenden fuer die
Ersteinrichtung (Benutzer/WLAN/SSH) bereits **cloud-init** - der alte
`cmdline.txt`-Mechanismus kann damit kollidieren und zu einem Haenger fuehren
(Boot-Text erscheint kurz, dann passiert nichts mehr, keine klare
Fehlermeldung). Deshalb nutzt diese Anleitung jetzt cloud-init selbst
(`runcmd` in `user-data`), um unser Installationsskript zu starten - das
laeuft zuverlaessig nach Netzwerkstart, ganz ohne Eingriff in `cmdline.txt`.

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
| `install.sh` scheint nie zu starten, Pi bootet aber sonst normal durch (per Monitor/SSH erreichbar) | `user-data` auf dem Boot-Laufwerk pruefen: enthaelt sie den `runcmd`-Block aus `userdata-append.txt`? YAML ist einrueckungsempfindlich - bei Unsicherheit den Inhalt der Datei genau mit der Anleitung vergleichen. Per SSH pruefen: `sudo cloud-init status --long` und `sudo journalctl -u cloud-final -b` |
| Installation haengt, WLAN-LED am Router zeigt keine Verbindung | SSID/Passwort falsch, oder Pi im 5-GHz-Netz waehrend das Modul nur 2,4 GHz unterstuetzt. `install.sh` wartet bis zu 7,5 Minuten auf Internet. Per Monitor/SSH pruefen: `nmcli connection show` bzw. `wpa_cli status` |
| `install.sh` findet kein WLAN, obwohl SSID/Passwort korrekt sind | Pruefen, welches Netzwerksystem aktiv ist: `systemctl is-active NetworkManager`. Ist es aktiv, muss `/etc/NetworkManager/system-connections/cms-wifi.nmconnection` existieren (aus `nm-wifi.conf`); sonst wird `wpa_supplicant.conf` verwendet |
| Pi bootet ueberhaupt nicht (kein Text, oder haengt schon vor jeglicher Ersteinrichtung) | Erst mit einem ganz normalen, unveraenderten Image testen (nur Benutzer/WLAN/SSH per Imager, ohne `cms-provisioning`-Ordner). Bootet das sauber, liegt es an unserem Paket (siehe obige Eintraege); bootet auch das nicht, eher SD-Karte oder Netzteil pruefen |
