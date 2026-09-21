# Installation unter Plesk (mit Docker-Erweiterung)

Diese Anleitung beschreibt, wie du die Zentrale-CMS-Software auf einem Server
mit **Plesk** und der **Docker-Erweiterung** betreibst - inkl. eigener
(Sub-)Domain, Reverse Proxy und kostenlosem HTTPS ueber Let's Encrypt.

Grundlage ist die normale Docker-Installation (siehe
[Installation mit Docker](docker-installation.md)) - hier kommen nur die
Plesk-spezifischen Schritte dazu: Domain anlegen, Docker-Erweiterung nutzen,
Reverse Proxy einrichten, SSL aktivieren, Ports absichern.

## 1. Voraussetzungen

- Ein Server mit **Plesk Obsidian** (root-/Administrator-Zugriff).
- Die **Docker**-Erweiterung in Plesk installiert: *Extensions* (Erweiterungen)
  → nach "Docker" suchen → *Install*. Damit stellt Plesk die Docker Engine auf
  dem Server bereit und verwaltet, ob sie laeuft.
- SSH-Zugriff auf den Server (entweder per eigenem SSH-Client oder ueber
  *Tools & Settings → SSH Terminal* direkt im Plesk-Browserinterface).
- Eine (Sub-)Domain, die auf den Server zeigt, z.B. `cms.deine-domain.de`.

## 2. Domain in Plesk anlegen

1. *Websites & Domains → Domain hinzufuegen*.
2. Domain/Subdomain eingeben (z.B. `cms.deine-domain.de`).
3. Als Hosting-Typ **"Keine Webseite" / "Nur DNS-Zone"** bzw. bei bereits
   bestehendem Hosting einfach eine leere Subdomain anlegen - der eigentliche
   Inhalt kommt spaeter per Reverse Proxy aus dem Docker-Container, nicht aus
   dem Plesk-Dokumentenverzeichnis.

## 3. Projekt auf den Server bringen

**Empfohlen (SSH, funktioniert immer):**

```bash
ssh dein-benutzer@dein-server
sudo mkdir -p /opt/cms && sudo chown $USER /opt/cms
git clone <URL-dieses-Repositories> /opt/cms
cd /opt/cms
```

**Alternative:** Plesk-Erweiterung *Git* (*Websites & Domains → Git*) nutzen,
um das Repository automatisch in ein Verzeichnis zu klonen und bei Bedarf
per Webhook automatisch zu aktualisieren. Empfehlenswert ist dabei ein
eigenes Verzeichnis ausserhalb von `httpdocs` (z.B. `/opt/cms`), damit Plesk
nicht versucht, den Quellcode als normale PHP/HTML-Webseite auszuliefern.

## 4. `.env` konfigurieren

```bash
cp .env.example .env
nano .env
```

Wie in der [Docker-Anleitung](docker-installation.md) beschrieben unbedingt
`POSTGRES_PASSWORD`, `JWT_SECRET` und `BOOTSTRAP_ADMIN_PASSWORD` setzen.
Zusaetzlich fuer den Plesk-Betrieb wichtig:

```bash
CORS_ORIGIN=https://cms.deine-domain.de
PUBLIC_API_URL=https://cms.deine-domain.de/api
```

## 5. Container-Ports absichern (wichtig!)

Docker traegt eigene Firewall-Regeln direkt in `iptables` ein und **umgeht
dabei die Plesk-/UFW-Firewall** - standardmaessig waeren Backend (3000) und
Frontend (5173) sonst trotz Firewall direkt aus dem Internet erreichbar,
zusaetzlich zum spaeter eingerichteten Reverse Proxy. Da der Zugriff nur
ueber die Plesk-Domain (per nginx-Reverse-Proxy) erfolgen soll, binden wir
die Container-Ports nur an `localhost`:

```bash
cat > docker-compose.override.yml <<'EOF'
services:
  backend:
    ports: !override
      - '127.0.0.1:${BACKEND_PORT:-3000}:3000'
  frontend:
    ports: !override
      - '127.0.0.1:${FRONTEND_PORT:-5173}:80'
EOF
```

`docker compose` liest `docker-compose.override.yml` automatisch zusaetzlich
zur `docker-compose.yml` ein - eine Aenderung an der eigentlichen Datei ist
nicht noetig. Das `!override`-Tag sorgt dafuer, dass die Port-Bindung
**ersetzt** (statt nur ergaenzt) wird - ohne dieses Tag wuerde Docker Compose
zusaetzlich zur `127.0.0.1`-Bindung weiterhin auch den oeffentlichen
`0.0.0.0`-Port aus `docker-compose.yml` offen lassen. Das Tag benoetigt
Docker Compose v2.24 oder neuer (`docker compose version` pruefen); bei
einer aelteren Version ersatzweise die `ports:`-Zeilen direkt lokal in
`docker-compose.yml` auf `127.0.0.1:...` abaendern.

Zur Kontrolle: `docker compose config | grep -A2 "target: 3000"` sollte pro
Dienst nur **eine** Portbindung mit `host_ip: 127.0.0.1` zeigen.

## 6. Container starten

**Per SSH (zuverlaessigster Weg, unabhaengig von der Plesk-Version):**

```bash
cd /opt/cms
docker compose up -d --build
docker compose ps      # alle drei Dienste sollten laufen
```

**Alternativ ueber die Plesk-Docker-Erweiterung:** Neuere Plesk-Versionen
bieten in der Docker-Erweiterung einen Reiter fuer **Docker-Compose-Projekte**,
in dem du den Server-Pfad `/opt/cms` (bzw. dessen `docker-compose.yml`)
angeben und darueber starten/stoppen/Logs einsehen kannst. Die genaue
Bezeichnung/Position dieses Reiters unterscheidet sich je nach
Plesk-Version - der SSH-Weg oben funktioniert in jedem Fall und ist deshalb
empfohlen; die Docker-Erweiterung eignet sich danach gut, um Container-Status
und Logs bequem im Browser zu beobachten.

## 7. Reverse Proxy in Plesk einrichten

Damit `https://cms.deine-domain.de` die Anwendung ausliefert:

1. *Websites & Domains → cms.deine-domain.de → Apache- & nginx-Einstellungen*.
2. Im Feld **"Zusaetzliche nginx-Direktiven"** (fuer HTTP und - nach Schritt 8
   - auch fuer HTTPS) folgendes eintragen:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:5173;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

3. Speichern. Das Frontend (nginx im `frontend`-Container) leitet Anfragen an
   `/api/...` bereits intern an das Backend weiter (siehe
   `frontend/nginx.conf`) - Plesk muss also nur auf Port 5173 zeigen.

## 8. HTTPS mit Let's Encrypt aktivieren

1. *Websites & Domains → cms.deine-domain.de → SSL/TLS-Zertifikate*.
2. **Let's Encrypt** auswaehlen, Domain (ggf. inkl. `www`) bestaetigen,
   Zertifikat ausstellen lassen.
3. Zurueck auf der Domain-Uebersicht **"HTTP auf HTTPS umleiten erzwingen"**
   aktivieren.
4. Pruefen, dass die nginx-Direktive aus Schritt 7 auch im HTTPS-Abschnitt
   hinterlegt ist (Plesk zeigt meist getrennte Felder fuer HTTP/HTTPS an -
   im Zweifel in beide den gleichen `location /`-Block eintragen).

## 9. Testen

`https://cms.deine-domain.de` aufrufen - die Login-Seite sollte erscheinen.
Anmeldung mit den in `.env` hinterlegten `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD`, danach sofort einen eigenen Admin-Account
anlegen und das Bootstrap-Passwort aendern (siehe
[Benutzerhandbuch](admin-guide.md)).

> Denk daran, `PUBLIC_API_URL` (Schritt 4) ist die Adresse, die auch in den
> Raspberry-Pi-Bereitstellungspaketen hinterlegt wird - Pi-Player muessen
> also `https://cms.deine-domain.de` erreichen koennen.

## Updates einspielen

```bash
cd /opt/cms
git pull
docker compose up -d --build
```

## Automatische Backups per Plesk Scheduled Tasks

Docker-Volumes werden vom normalen Plesk-Backup-Manager **nicht**
automatisch gesichert. Empfehlung: ueber *Tools & Settings → Scheduled Tasks*
(bzw. *Werkzeuge & Einstellungen → Geplante Aufgaben*) einen taeglichen Cronjob
anlegen, der die in der [Docker-Anleitung](docker-installation.md#backups)
beschriebenen Backup-Befehle ausfuehrt, z.B.:

```bash
mkdir -p /opt/cms-backups
cd /opt/cms && docker compose exec -T postgres pg_dump -U cms cms \
  > /opt/cms-backups/db-$(date +\%F).sql
docker run --rm -v cms_tenant_storage:/data -v /opt/cms-backups:/backup alpine \
  tar czf /backup/media-$(date +\%F).tar.gz -C /data .
```

Zusaetzlich empfiehlt es sich, `/opt/cms-backups` in die normale
Plesk-Backup-/Restic-/Offsite-Sicherung mit aufzunehmen.

## Fehlerbehebung (Plesk-spezifisch)

| Problem | Loesung |
|---|---|
| Domain zeigt die Plesk-Standard- bzw. "Webseite im Aufbau"-Seite | Pruefen, dass unter *Hosting-Einstellungen* kein eigenes Webseiten-Dokument aktiv ist und die nginx-Direktive aus Schritt 7 gespeichert wurde |
| `502 Bad Gateway` | Container laufen nicht (`docker compose ps` per SSH pruefen) oder falscher Port in der nginx-Direktive (muss zu `FRONTEND_PORT` aus `.env` passen, Standard `5173`) |
| Seite laedt, aber Login schlaegt fehl | `CORS_ORIGIN`/`PUBLIC_API_URL` in `.env` pruefen - muessen exakt `https://cms.deine-domain.de` entsprechen; danach `docker compose up -d` erneut ausfuehren |
| Ports schon belegt (mehrere Docker-Projekte auf einem Server) | `BACKEND_PORT`/`FRONTEND_PORT` in `.env` auf freie Ports setzen |
| SSL-Zertifikat schlaegt fehl | DNS der (Sub-)Domain muss bereits auf den Server zeigen, bevor Let's Encrypt angefordert wird |
| Container trotz `docker-compose.override.yml` von aussen erreichbar | Pruefen, ob `docker compose config` (Schritt 5) tatsaechlich `127.0.0.1:...` statt `0.0.0.0:...` als Port-Bindung anzeigt: `docker compose config \| grep -A2 ports` |
