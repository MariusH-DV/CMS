# Installation & Deployment

## Voraussetzungen

- Node.js 22+
- PostgreSQL 14+ (lokal oder via Docker)
- Fuer Docker-Deployment: Docker & Docker Compose

## Lokale Entwicklung

```bash
# 1. Abhaengigkeiten installieren (npm workspaces: backend, frontend, player)
npm install

# 2. Backend konfigurieren
cp backend/.env.example backend/.env
# .env anpassen: DATABASE_URL, JWT_SECRET (langer Zufallsstring!), PUBLIC_API_URL, ...

# 3. Datenbank-Schema anwenden
npm run prisma:migrate --workspace backend

# 4. Ersten System-Admin anlegen (E-Mail/Passwort aus .env)
npm run seed --workspace backend

# 5. Backend starten (http://localhost:3000, API unter /api)
npm run dev:backend

# 6. Frontend starten (http://localhost:5173, proxied /api zum Backend)
npm run dev:frontend
```

Danach im Browser `http://localhost:5173` oeffnen und mit den Bootstrap-Zugangsdaten anmelden.

## Wichtige Umgebungsvariablen (`backend/.env`)

| Variable                   | Beschreibung                                                        |
|-----------------------------|----------------------------------------------------------------------|
| `DATABASE_URL`              | PostgreSQL-Verbindung                                               |
| `JWT_SECRET`                | Geheimnis zum Signieren der Login-Tokens (unbedingt aendern!)       |
| `JWT_EXPIRES_IN`            | Gueltigkeitsdauer der Login-Tokens (z.B. `8h`)                      |
| `PORT`                      | Backend-Port (Standard 3000)                                        |
| `CORS_ORIGIN`                | Erlaubte Frontend-Origin(s)                                          |
| `PUBLIC_API_URL`            | Oeffentlich erreichbare API-Adresse - wird in Pi-Bereitstellungspaketen hinterlegt, damit der Player den Server findet |
| `STORAGE_ROOT`              | Basisverzeichnis fuer die getrennten Mandanten-Ordner                |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD` | Zugangsdaten des initial angelegten System-Admins               |

> **Wichtig:** `PUBLIC_API_URL` muss von den Raspberry Pis erreichbar sein (z.B. eine
> feste Domain/IP mit HTTPS in Produktion), nicht `localhost`.

## Produktion mit Docker Compose

Fuer eine ausfuehrliche Schritt-fuer-Schritt-Anleitung (Docker installieren,
`.env` konfigurieren, starten, Backups, Fehlerbehebung) siehe
**[Installation mit Docker](docker-installation.md)**. Kurzfassung:

```bash
cp .env.example .env
# .env anpassen: POSTGRES_PASSWORD, JWT_SECRET, BOOTSTRAP_ADMIN_PASSWORD, PUBLIC_API_URL, ...
docker compose up -d --build
```

Der Stack besteht aus:

- `postgres` - PostgreSQL-Datenbank mit persistentem Volume
- `backend` - NestJS-API (fuehrt beim Start automatisch `prisma migrate deploy`
  und den Seed aus), Port 3000
- `frontend` - mit nginx ausgelieferte React-App, die `/api` an den Backend-Service
  weiterleitet, Port 5173 (extern) / 80 (intern)

## Datenbank-Migrationen

Schemaaenderungen werden mit Prisma verwaltet:

```bash
# Neue Migration nach Aenderung an backend/prisma/schema.prisma erstellen
npm run prisma:migrate --workspace backend -- --name <beschreibung>

# In Produktion nur anwenden (kein Schema-Diff-Dialog)
npm run --workspace backend prisma:deploy
```
