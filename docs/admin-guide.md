# Benutzerhandbuch

## Rollenuebersicht

| Rolle           | Zugriff                                                              |
|------------------|-----------------------------------------------------------------------|
| System-Admin     | Alle Mandanten, Lizenzen, globale Benutzerliste                     |
| Mandant-Admin    | Voller Zugriff auf den eigenen Mandanten inkl. Benutzer & Rechte     |
| Mandant-Benutzer | Nur einzeln zugeteilte Bereiche (z.B. nur Medien, nur Geraete, ...)  |

## Fuer System-Admins

### Neuen Mandanten anlegen

1. **Mandanten** in der Seitenleiste oeffnen.
2. **Neuer Mandant**: Name, Slug (wird als Ordnername verwendet, nur
   Kleinbuchstaben/Zahlen/Bindestriche) sowie Start-Lizenzwerte (max.
   Monitore/Benutzer/Speicher) eingeben.
3. Der Mandant erhaelt automatisch eine eigene, getrennte Ordnerstruktur fuer
   seine Medien.

### Lizenz anpassen

Unter **Mandanten -> Verwalten** koennen jederzeit maximale Monitor-, Benutzer-
und Speicheranzahl sowie ein Ablaufdatum angepasst werden. Ist eine Lizenz
abgelaufen oder deaktiviert, lehnt das System neue Geraete-Registrierungen,
neue Benutzer und neue Uploads fuer diesen Mandanten ab (bestehende Daten
bleiben erhalten).

### Globale Benutzer

Unter **Benutzer** lassen sich Benutzerkonten anlegen, die z.B. spaeter als
Mandant-Admin einem Mandanten zugewiesen werden koennen, sowie weitere
System-Admins.

## Fuer Mandant-Admins

Nach der Anmeldung landest du automatisch im Bereich deines Mandanten
(bei mehreren Mandanten: im ersten). Ueber die Seitenleiste unter
**Meine Mandanten** kannst du zwischen deinen Mandanten wechseln.

### Benutzer & Rechte

Unter **Benutzer & Rechte**:

- **Benutzer hinzufuegen**: bestehende E-Mail eines Kollegen eingeben (wird
  dem Mandanten hinzugefuegt) oder eine neue E-Mail + Passwort/Namen fuer ein
  neues Konto.
- **Rolle**: *Mandant-Admin* (voller Zugriff) oder *Mandant-Benutzer* (nur
  ausgewaehlte Rechte).
- Bei *Mandant-Benutzer* einzeln ankreuzen, welche Bereiche zugaenglich sein
  sollen: Benutzer & Rechte, Geraete, Medien, Playlists, Zeitplaene,
  Mandanten-Einstellungen.
- Rechte lassen sich jederzeit nachtraeglich pro Benutzer aendern.

### Geraete registrieren

1. Raspberry Pi gemaess [Raspberry-Pi-Setup](raspberry-pi.md) einrichten und
   starten. Auf dem Bildschirm erscheint eine 6-stellige PIN.
2. Im CMS unter **Geraete -> PIN eingeben**: PIN eintippen, Anzeigename
   vergeben (z.B. "Empfang", "Schaufenster").
3. Das Geraet erscheint als *Aktiv* in der Liste. Ueber das Dropdown in der
   Spalte *Standard-Playlist* kann direkt eine Playlist zugewiesen werden.

### Medien hochladen

Unter **Medien** per Klick auf **Hochladen** Bilder oder Videos hinzufuegen.
Das System verhindert Uploads, sobald das Speicherlimit der Lizenz erreicht
ist.

### Playlists erstellen

1. Unter **Playlists -> Neue Playlist** einen Namen vergeben.
2. **Bearbeiten** oeffnen, Medium aus der Liste waehlen, **Hinzufuegen**.
3. Anzeigedauer pro Eintrag (in Sekunden) festlegen, Reihenfolge per
   Pfeil-Buttons anpassen.
4. **Speichern** nicht vergessen.

### Playlist einem Geraet zuweisen

Entweder direkt auf der **Geraete**-Seite als *Standard-Playlist*, oder
zeitgesteuert unter **Zeitplaene** (siehe unten) - ein aktiver Zeitplan hat
immer Vorrang vor der Standard-Playlist.

### Zeitplaene

Unter **Zeitplaene -> Neuer Zeitplan**: Geraet, Playlist, Start-/Endzeitpunkt
und Wiederholung (einmalig/taeglich/woechentlich) festlegen. So kann z.B.
tagsueber eine andere Playlist laufen als abends.

### Neuen Raspberry Pi einrichten (WLAN + Download)

Unter **Pi-Bereitstellung**: WLAN-Name und -Passwort eingeben (wird auf dem
Pi hinterlegt) und das Bereitstellungspaket herunterladen. Die im Paket
enthaltene `README.md` fuehrt Schritt fuer Schritt durch die Installation.
Details siehe [Raspberry-Pi-Player einrichten](raspberry-pi.md).
