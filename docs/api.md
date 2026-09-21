# API-Referenz

Basis-URL: `/api`. Authentifizierung ueber `Authorization: Bearer <JWT>`
(ausser bei explizit als "public" markierten Endpunkten, die stattdessen den
Player mit `x-device-token` oder ganz ohne Auth ansprechen).

Fehlerantworten folgen dem NestJS-Standardformat: `{ "statusCode": ..., "message": "..." }`.

## Auth

| Methode | Pfad          | Zugriff  | Beschreibung                         |
|---------|---------------|----------|---------------------------------------|
| POST    | `/auth/login` | public   | `{ email, password }` -> `{ accessToken, user }` |
| GET     | `/auth/me`    | eingeloggt | Aktueller Benutzer inkl. Mandanten-Mitgliedschaften |

## Mandanten & Lizenzen

| Methode | Pfad                         | Zugriff        | Beschreibung                     |
|---------|-------------------------------|----------------|------------------------------------|
| POST    | `/tenants`                    | System-Admin   | Mandant anlegen (inkl. Ordnerstruktur + Standardlizenz) |
| GET     | `/tenants`                    | System-Admin   | Alle Mandanten auflisten          |
| GET     | `/tenants/:id`                | Mandant-Zugriff | Details eines Mandanten           |
| PATCH   | `/tenants/:id`                | `tenant.settings.manage` | Name/Aktiv-Status aendern |
| DELETE  | `/tenants/:id`                | System-Admin   | Mandant inkl. Ordner loeschen     |
| PUT     | `/tenants/:id/license`        | System-Admin   | Lizenz (Monitore/Benutzer/Speicher) setzen |

## Benutzer

| Methode | Pfad                                   | Zugriff        | Beschreibung                    |
|---------|------------------------------------------|----------------|------------------------------------|
| POST    | `/users`                                | System-Admin   | Globales Benutzerkonto anlegen   |
| GET     | `/users`                                | System-Admin   | Alle Benutzerkonten auflisten    |
| GET     | `/tenants/:tenantId/members`            | `users.manage` | Mitglieder des Mandanten         |
| POST    | `/tenants/:tenantId/members`            | `users.manage` | Benutzer zum Mandanten hinzufuegen (legt bei Bedarf neuen Benutzer an), prueft Lizenz |
| PATCH   | `/tenants/:tenantId/members/:id`        | `users.manage` | Rolle/Berechtigungen aendern     |
| DELETE  | `/tenants/:tenantId/members/:id`        | `users.manage` | Mitgliedschaft entfernen         |

## Geraete (Player)

| Methode | Pfad                                           | Zugriff          | Beschreibung                          |
|---------|--------------------------------------------------|------------------|------------------------------------------|
| POST    | `/public/devices/pairing-request`               | public           | Player fordert PIN + `deviceId` an (`{ hardwareId, name? }`) |
| GET     | `/public/devices/pairing-status/:deviceId`      | public           | Player pollt Registrierungsstatus, erhaelt Token nach Claim |
| GET     | `/public/devices/playlist`                      | Geraete-Token (`x-device-token`) | Aktuell gueltige Playlist (Zeitplan oder Standard-Playlist) |
| POST    | `/public/devices/heartbeat`                     | Geraete-Token    | Lebenszeichen (aktualisiert `lastSeenAt`) |
| GET     | `/tenants/:tenantId/devices`                    | `devices.manage` | Geraete des Mandanten auflisten       |
| POST    | `/tenants/:tenantId/devices/claim`              | `devices.manage` | Geraet per PIN registrieren (prueft Lizenz) |
| PATCH   | `/tenants/:tenantId/devices/:id`                | `devices.manage` | Umbenennen, Standard-Playlist zuweisen |
| DELETE  | `/tenants/:tenantId/devices/:id`                | `devices.manage` | Geraet entfernen (kann sich danach neu registrieren) |

## Medien

| Methode | Pfad                                                | Zugriff        | Beschreibung                       |
|---------|--------------------------------------------------------|----------------|---------------------------------------|
| GET     | `/tenants/:tenantId/media`                            | `media.manage` | Medien auflisten                    |
| POST    | `/tenants/:tenantId/media`                            | `media.manage` | Upload (`multipart/form-data`, Feld `file`), prueft Speicherlimit |
| DELETE  | `/tenants/:tenantId/media/:mediaId`                   | `media.manage` | Mediendatei loeschen                |
| GET     | `/tenants/:tenantId/media/:mediaId/file`              | public         | Datei ausliefern (fuer `<img>`/`<video>`, auch vom Player genutzt) |

## Playlists

| Methode | Pfad                                                | Zugriff             | Beschreibung                  |
|---------|--------------------------------------------------------|---------------------|----------------------------------|
| GET     | `/tenants/:tenantId/playlists`                        | `playlists.manage`  | Playlists auflisten            |
| POST    | `/tenants/:tenantId/playlists`                        | `playlists.manage`  | Playlist anlegen                |
| GET     | `/tenants/:tenantId/playlists/:id`                    | `playlists.manage`  | Playlist inkl. Eintraegen       |
| PUT     | `/tenants/:tenantId/playlists/:id/items`              | `playlists.manage`  | Eintraege (Reihenfolge + Dauer) komplett ersetzen |
| DELETE  | `/tenants/:tenantId/playlists/:id`                    | `playlists.manage`  | Playlist loeschen                |

## Zeitplaene

| Methode | Pfad                                        | Zugriff              | Beschreibung                         |
|---------|-----------------------------------------------|-----------------------|-----------------------------------------|
| GET     | `/tenants/:tenantId/schedules`                | `schedules.manage`    | Zeitplaene auflisten                  |
| POST    | `/tenants/:tenantId/schedules`                | `schedules.manage`    | Zeitplan anlegen (`playlistId, deviceId, startAt, endAt?, recurrence?, priority?`) |
| DELETE  | `/tenants/:tenantId/schedules/:id`            | `schedules.manage`    | Zeitplan loeschen                      |

## Raspberry-Pi-Bereitstellung

| Methode | Pfad                                              | Zugriff           | Beschreibung                              |
|---------|-------------------------------------------------------|--------------------|-----------------------------------------------|
| POST    | `/tenants/:tenantId/provisioning/package`             | `devices.manage`  | Erzeugt und liefert ein ZIP mit WLAN-Konfiguration, Player-App und Installationsanleitung (`{ ssid, wifiPassword, deviceLabel? }`) |

## Berechtigungs-Keys

`users.manage`, `devices.manage`, `media.manage`, `playlists.manage`,
`schedules.manage`, `tenant.settings.manage` - siehe
`backend/src/common/permissions.constants.ts`. Ein `TENANT_ADMIN` besitzt
implizit alle Rechte innerhalb seines Mandanten, ein System-Admin implizit
alle Rechte ueberall.
