# Zentrale CMS Verwaltung

Eine zentrale CMS-Verwaltungssoftware fuer Digital Signage (aehnlich [Xibo](https://xibosignage.com/)),
mit Mandantenfaehigkeit, Lizenzverwaltung und einem eigenen Raspberry-Pi-Player.

## Funktionen

- **Mandantenfunktion** - jeder Mandant hat eine eigene, getrennte Ordnerstruktur fuer seine Medien.
- **Lizenzfunktion** - pro Mandant werden maximale Anzahl Monitore, Benutzer und Speicherplatz festgelegt
  und serverseitig durchgesetzt.
- **Rollen & granulare Berechtigungen** - System-Admins verwalten alles, Mandant-Admins verwalten
  eigenstaendig Benutzer und Berechtigungen innerhalb ihres Mandanten, Mandant-Benutzer erhalten nur
  einzeln zugeteilte Rechte (Geraete, Medien, Playlists, Zeitplaene, Benutzerverwaltung).
- **Helles, einfaches Web-Interface** mit Font Awesome Icons.
- **Playlists & Zeitplaene** fuer die Wiedergabe von Bildern/Videos auf den Bildschirmen.
- **Raspberry-Pi-Player** mit automatischer Erstregistrierung per PIN, danach automatischer Anmeldung
  und Autostart beim Booten - inklusive Bereitstellungspaket mit vorkonfiguriertem WLAN.

## Projektstruktur

```
backend/      NestJS REST-API (TypeScript, PostgreSQL via Prisma)
frontend/     React-Admin-Oberflaeche (Vite, TypeScript, Tailwind, Font Awesome)
player/       Player-App fuer den Raspberry Pi (Node.js + Kiosk-Weboberflaeche)
pi-image/     Vorlagen & Skripte zur Bereitstellung/zum Image-Bau fuer den Raspberry Pi
docs/         Ausfuehrliche Dokumentation (Architektur, Installation, API, Pi-Setup, Benutzerhandbuch)
```

## Schnellstart (lokal, ohne Docker)

Voraussetzungen: Node.js 22+, PostgreSQL 14+.

```bash
npm install

cp backend/.env.example backend/.env
# backend/.env anpassen (DATABASE_URL, JWT_SECRET, ...)

npm run prisma:migrate --workspace backend
npm run seed --workspace backend   # legt den ersten System-Admin an

npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
```

Login mit den in `.env` hinterlegten `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.

## Schnellstart mit Docker Compose

```bash
docker compose up --build
```

Startet PostgreSQL, Backend (Port 3000) und Frontend (Port 5173).

## Dokumentation

- [Architektur](docs/architecture.md)
- [Installation & Deployment](docs/installation.md)
- [API-Referenz](docs/api.md)
- [Raspberry-Pi-Player einrichten](docs/raspberry-pi.md)
- [Benutzerhandbuch (System-Admin & Mandant-Admin)](docs/admin-guide.md)
