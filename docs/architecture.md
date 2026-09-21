# Architektur

## Ueberblick

```
┌──────────────┐     HTTPS/JSON      ┌──────────────────┐       SQL       ┌────────────┐
│   Frontend   │ ───────────────────▶│     Backend       │ ───────────────▶│ PostgreSQL │
│ React (Vite) │◀─────────────────── │   NestJS API      │◀─────────────── │            │
└──────────────┘                     └──────────────────┘                 └────────────┘
                                              ▲   │
                                     PIN-Pairing/ │ Dateisystem (getrennt je Mandant)
                                     Geraete-Token │
                                              │   ▼
                                      ┌──────────────────┐
                                      │  Raspberry-Pi-    │
                                      │  Player (Kiosk)   │
                                      └──────────────────┘
```

## Tech-Stack

| Bereich   | Technologie                                                            |
|-----------|-------------------------------------------------------------------------|
| Backend   | Node.js, NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT (Passport)     |
| Frontend  | React, TypeScript, Vite, Tailwind CSS, Font Awesome (lokal gebuendelt)  |
| Player    | Node.js (Express) + statische Kiosk-Weboberflaeche (Chromium im Kiosk-Modus) |
| Deployment| Docker Compose (PostgreSQL, Backend, Frontend/nginx)                    |

Der Backend-Code ist in fachliche NestJS-Module gegliedert: `auth`, `tenants`, `users`
(inkl. Mandanten-Mitgliedschaften), `devices`, `media`, `playlists`, `schedules`,
`provisioning`. Jedes Modul kapselt Controller, Service und DTOs.

## Datenmodell (vereinfacht)

```
Tenant (Mandant) 1───1 License
Tenant 1───n TenantMembership n───1 User
Tenant 1───n Device
Tenant 1───n MediaAsset
Tenant 1───n Playlist 1───n PlaylistItem n───1 MediaAsset
Tenant 1───n Schedule n───1 Playlist
Schedule n───1 Device
```

Das vollstaendige Schema befindet sich in `backend/prisma/schema.prisma`.

## Mandantentrennung

Jeder Mandant bekommt beim Anlegen einen eigenen Ordner unter
`STORAGE_ROOT/<slug>/media` (siehe `backend/src/storage/storage.service.ts`).
Alle Medien-Uploads eines Mandanten landen ausschliesslich in diesem Ordner; die
API stellt sicher, dass niemand ausserhalb seiner Mandanten-Berechtigungen auf
fremde Ordner zugreifen kann.

## Rollen- & Berechtigungsmodell

- **System-Admin** (`User.isSystemAdmin`): globaler Zugriff auf alle Mandanten,
  Mandanten- und Lizenzverwaltung, globale Benutzerliste.
- **Mandant-Admin** (`TenantMembership.role = TENANT_ADMIN`): voller Zugriff
  auf genau den zugewiesenen Mandanten, inkl. Verwaltung von Benutzern und
  deren Berechtigungen innerhalb dieses Mandanten.
- **Mandant-Benutzer** (`TenantMembership.role = TENANT_USER`): erhaelt nur
  einzeln zugeteilte, granulare Berechtigungen (`permissions: string[]`):
  `users.manage`, `devices.manage`, `media.manage`, `playlists.manage`,
  `schedules.manage`, `tenant.settings.manage`.

Die Durchsetzung erfolgt serverseitig ueber zwei globale Guards
(`JwtAuthGuard`, `PermissionsGuard`, siehe `backend/src/common/guards`), die
aus dem JWT (inkl. eingebetteter Mitgliedschaften) und dem Route-Parameter
`tenantId` pruefen, ob der Benutzer die per `@RequirePermissions(...)` oder
`@SystemAdminOnly()` verlangten Rechte besitzt.

## Lizenzdurchsetzung

`TenantsService` prueft vor jeder mengenrelevanten Aktion die aktive Lizenz:

- `assertCanAddDevice` - vor der Geraete-Registrierung (PIN-Claim)
- `assertCanAddUser` - vor dem Hinzufuegen eines Mandanten-Mitglieds
- `assertCanStoreBytes` - vor jedem Medien-Upload (Summe der Dateien im
  Medien-Ordner des Mandanten gegen `maxStorageMb`)

## Geraete-Registrierung (PIN-Flow)

1. Der Player startet auf dem Raspberry Pi ohne gespeichertes Geraete-Token.
2. Er ruft `POST /api/public/devices/pairing-request` auf und erhaelt eine
   6-stellige PIN sowie eine `deviceId`. Diese PIN wird gross auf dem
   Bildschirm angezeigt.
3. Ein Mandant-Admin (oder System-Admin) gibt diese PIN im CMS unter
   *Geraete -> PIN eingeben* ein (`POST /api/tenants/:id/devices/claim`).
   Das Backend prueft die Lizenz, verknuepft das Geraet mit dem Mandanten und
   erzeugt ein dauerhaftes API-Token.
4. Der Player pollt `GET /api/public/devices/pairing-status/:deviceId` und
   erhaelt das Token, sobald die PIN eingegeben wurde. Das Token wird lokal
   gespeichert (`player/data/device-token.json`).
5. Bei jedem weiteren Start liest der Player das gespeicherte Token und meldet
   sich automatisch an - ohne erneute PIN-Eingabe.
6. Wird das Geraet im CMS entfernt, erhaelt der Player beim naechsten
   Playlist-Abruf `401 Unauthorized`, loescht sein lokales Token und zeigt
   automatisch wieder eine neue Registrierungs-PIN an.

Siehe auch [Raspberry-Pi-Player einrichten](raspberry-pi.md).
