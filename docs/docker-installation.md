# Installation mit Docker

Diese Anleitung fuehrt Schritt fuer Schritt durch die Installation der
Zentrale-CMS-Software mit Docker Compose - vom leeren Server bis zum ersten
Login. Fuer eine lokale Entwicklungsumgebung ohne Docker siehe stattdessen
[Installation & Deployment](installation.md).

## 1. Voraussetzungen

- Ein Linux-, macOS- oder Windows-Rechner/Server mit **Docker** und dem
  **Docker Compose Plugin** (`docker compose`, mit Leerzeichen - nicht das
  alte, separate `docker-compose`).
- Mindestens ca. 2 GB freier RAM und 5 GB freier Speicherplatz.
- Ports `3000` (Backend) und `5173` (Frontend) frei auf dem Host, oder
  spaeter in der `.env` auf andere Ports umstellen (siehe Schritt 3).

### Docker installieren (falls noch nicht vorhanden)

**Linux (Debian/Ubuntu):**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER    # neu einloggen, damit die Gruppe greift
```

**macOS / Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installieren - bringt Docker Compose bereits mit.

Pruefen, ob alles bereit ist:

```bash
docker --version
docker compose version
```

## 2. Projekt holen

```bash
git clone <URL-dieses-Repositories> cms
cd cms
```

(Falls du den Code bereits lokal hast, einfach in das Projektverzeichnis wechseln.)

## 3. Konfiguration (`.env`)

Docker Compose liest automatisch eine `.env`-Datei im Projekt-Wurzelverzeichnis.

```bash
cp .env.example .env
```

Anschliessend `.env` mit einem Editor oeffnen und **unbedingt** anpassen:

| Variable                    | Bedeutung                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| `POSTGRES_PASSWORD`           | Passwort der PostgreSQL-Datenbank - auf einen sicheren Wert setzen        |
| `JWT_SECRET`                  | Geheimnis zum Signieren der Login-Tokens. Erzeugen z.B. mit `openssl rand -base64 48` |
| `BOOTSTRAP_ADMIN_EMAIL`       | E-Mail des ersten System-Admin-Kontos, das automatisch angelegt wird      |
| `BOOTSTRAP_ADMIN_PASSWORD`    | Passwort dieses Kontos - nach dem ersten Login aendern                    |
| `CORS_ORIGIN`                 | Adresse, unter der das Frontend erreichbar ist (siehe Schritt 6 fuer Produktion) |
| `PUBLIC_API_URL`              | Oeffentlich erreichbare API-Adresse - wird u.a. in Raspberry-Pi-Bereitstellungspaketen hinterlegt. Muss von den Playern erreichbar sein! |
| `BACKEND_PORT` / `FRONTEND_PORT` | Ports auf dem Host, falls `3000`/`5173` bereits belegt sind             |

> Alle Werte in `.env` sind Vorgaben. Wird `.env` nicht angepasst, startet
> der Stack trotzdem (mit den Defaults aus `.env.example`) - fuer Produktion
> aber unbedingt eigene, sichere Passwoerter/Secrets setzen!

## 4. Container bauen und starten

```bash
docker compose up -d --build
```

Das baut die Images fuer Backend und Frontend und startet drei Container:

- `postgres` - Datenbank (persistent im Volume `postgres_data`)
- `backend` - NestJS-API auf Port `3000` (bzw. `BACKEND_PORT`)
- `frontend` - mit nginx ausgeliefertes React-Frontend auf Port `5173`
  (bzw. `FRONTEND_PORT`)

Beim ersten Start fuehrt das Backend automatisch die Datenbank-Migrationen
aus und legt den in `.env` hinterlegten System-Admin an.

## 5. Status pruefen & erster Login

```bash
docker compose ps          # alle drei Dienste sollten "running"/"healthy" sein
docker compose logs -f backend   # Startlog pruefen (Strg+C zum Beenden)
```

Im Log sollte u.a. `System-Admin angelegt: ...` und
`CMS backend listening on port 3000` erscheinen.

Danach im Browser `http://localhost:5173` (bzw. den konfigurierten
Host/Port) oeffnen und mit `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`
anmelden.

**Direkt danach**: unter *Benutzer* einen persoenlichen System-Admin-Account
anlegen und das Bootstrap-Passwort aendern bzw. das Bootstrap-Konto danach
deaktivieren.

## 6. Fuer den produktiven Einsatz (eigene Domain, HTTPS)

Der mitgelieferte `frontend`-Container liefert nur HTTP auf Port 80 (intern)
aus. Fuer eine echte Domain mit HTTPS empfiehlt sich ein Reverse Proxy davor,
z.B. [Caddy](https://caddyserver.com/) (automatisches HTTPS) oder
[Traefik](https://traefik.io/traefik/) / nginx mit
[Let's Encrypt](https://letsencrypt.org/).

Danach in `.env` anpassen:

```bash
CORS_ORIGIN=https://cms.beispiel.de
PUBLIC_API_URL=https://cms.beispiel.de/api
```

und den Stack neu starten (siehe *Konfiguration aendern* unten), damit die
Aenderung greift. `PUBLIC_API_URL` muss von den Raspberry-Pi-Playern aus dem
jeweiligen Netzwerk erreichbar sein - bei reinem Heim-/Buero-WLAN reicht auch
eine feste lokale IP-Adresse statt einer Domain.

## Taegliche Bedienung

**Logs ansehen:**

```bash
docker compose logs -f            # alle Dienste
docker compose logs -f backend    # nur das Backend
```

**Stack stoppen / wieder starten:**

```bash
docker compose stop
docker compose start
```

**Konfiguration (`.env`) aendern:**

```bash
docker compose up -d   # erstellt betroffene Container mit neuer Konfiguration neu
```

**Auf eine neue Version aktualisieren:**

```bash
git pull
docker compose up -d --build
```

**Datenbank-Konsole oeffnen (Debugging):**

```bash
docker compose exec postgres psql -U cms -d cms
```

## Backups

Alle Daten liegen in zwei Docker-Volumes:

- `postgres_data` - die komplette Datenbank (Mandanten, Benutzer, Playlists, ...)
- `tenant_storage` - die hochgeladenen Mediendateien je Mandant

**Datenbank sichern:**

```bash
docker compose exec -T postgres pg_dump -U cms cms > backup-$(date +%F).sql
```

**Datenbank wiederherstellen:**

```bash
cat backup-2026-01-01.sql | docker compose exec -T postgres psql -U cms -d cms
```

**Medien-Volume sichern** (z.B. als tar-Archiv):

```bash
docker run --rm -v cms_tenant_storage:/data -v "$PWD":/backup alpine \
  tar czf /backup/tenant-storage-$(date +%F).tar.gz -C /data .
```

> Der Volume-Name kann je nach Projektordnername leicht abweichen - mit
> `docker volume ls` die tatsaechlichen Namen pruefen.

## Alles entfernen (inkl. Daten!)

```bash
docker compose down -v
```

Der Parameter `-v` loescht auch die Volumes (Datenbank + Medien) unwiderruflich.
Ohne `-v` bleiben die Daten erhalten und stehen beim naechsten
`docker compose up -d` wieder zur Verfuegung.

## Fehlerbehebung

| Problem | Loesung |
|---|---|
| `port is already allocated` | Port in `.env` aendern (`BACKEND_PORT`/`FRONTEND_PORT`) und `docker compose up -d` erneut ausfuehren |
| Frontend laedt, aber Login schlaegt fehl / Netzwerkfehler | `CORS_ORIGIN` in `.env` pruefen (muss exakt zur im Browser aufgerufenen Adresse passen) |
| Backend startet nicht, Log zeigt DB-Verbindungsfehler | Etwas warten (Postgres braucht beim allerersten Start ein paar Sekunden) oder `docker compose logs postgres` pruefen |
| Aenderungen an `.env` wirken sich nicht aus | `docker compose up -d` erneut ausfuehren (Container werden neu erstellt) |
| Raspberry-Pi-Player findet den Server nicht | `PUBLIC_API_URL` in `.env` pruefen - muss vom Pi aus erreichbar sein, nicht `localhost` |
| Alles neu aufsetzen | `docker compose down -v` und anschliessend wieder Schritt 4 |

## Betrieb hinter Plesk

Laeuft der Server mit **Plesk** und der Docker-Erweiterung, siehe die
dedizierte Anleitung **[Installation unter Plesk](plesk-installation.md)**
fuer Domain-Einrichtung, Reverse Proxy und Let's-Encrypt-HTTPS.
