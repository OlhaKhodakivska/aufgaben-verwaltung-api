# Aufgaben-Verwaltungs-API (REST API)

Eine sichere RESTful API zur Verwaltung von Benutzern und deren persönlichen Aufgaben, entwickelt mit Node.js, Express, Prisma und SQLite.

## Features und Sicherheit

- 1:N-Beziehung zwischen `Benutzer` und `Aufgabe`
- Passwort-Hashing mit `bcryptjs`
- Authentifizierung geschützter Routen mit JSON Web Tokens
- Sicherheits-Header mit `helmet`
- CORS-Beschränkung auf einen konfigurierbaren Frontend-Origin
- Rate Limiting für Anmeldung und Registrierung (je 5 Anfragen pro IP in 15 Minuten)
- Validierung von Datentypen, E-Mail-Format und Feldlängen
- Datenbankzugriff mit Prisma und dem SQLite-Treiberadapter
- Vollständige CRUD-Endpunkte für Aufgaben
- Benutzer können ausschließlich auf ihre eigenen Aufgaben zugreifen

## ERD-Diagramm

```mermaid
erDiagram
    BENUTZER ||--o{ AUFGABE : "hat"
    BENUTZER {
        string id PK
        string benutzername
        string email UK
        string passwort
        datetime erstelltAm
    }
    AUFGABE {
        string id PK
        string titel
        string beschreibung
        string status
        string benutzerId FK
        datetime erstelltAm
    }
```

## Installation und Start

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. Die Beispielkonfiguration kopieren und `JWT_SECRET` lokal ersetzen:

   ```bash
   cp .env.example .env
   ```

3. Datenbank-Migration ausführen:

   ```bash
   npx prisma migrate deploy
   ```

4. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

Die API ist anschließend unter `http://localhost:3000` erreichbar.

## API-Endpunkte

### Benutzer

| Methode | Endpunkt                     | Beschreibung                       | Authentifizierung |
| ------- | ---------------------------- | ---------------------------------- | ----------------- |
| `POST`  | `/api/benutzer/registrieren` | Benutzer registrieren              | Nein              |
| `POST`  | `/api/benutzer/login`        | Anmelden und JWT erhalten          | Nein              |
| `GET`   | `/api/benutzer/profil`       | Profil des angemeldeten Benutzers  | Bearer-Token      |

### Aufgaben

| Methode  | Endpunkt             | Beschreibung                    | Authentifizierung |
| -------- | -------------------- | ------------------------------- | ----------------- |
| `GET`    | `/api/aufgaben`      | Eigene Aufgaben abrufen         | Bearer-Token      |
| `GET`    | `/api/aufgaben/:id`  | Eine eigene Aufgabe abrufen     | Bearer-Token      |
| `POST`   | `/api/aufgaben`      | Neue Aufgabe erstellen          | Bearer-Token      |
| `PUT`    | `/api/aufgaben/:id`  | Eine Aufgabe vollständig ändern | Bearer-Token      |
| `DELETE` | `/api/aufgaben/:id`  | Eine Aufgabe löschen            | Bearer-Token      |

Gültige Statuswerte sind `OFFEN`, `IN_BEARBEITUNG` und `ERLEDIGT`.

### Validierungsgrenzen

| Feld           | Regeln                                      |
| -------------- | ------------------------------------------- |
| `benutzername` | Text, 2–50 Zeichen                          |
| `email`        | Gültige E-Mail-Adresse, maximal 254 Zeichen |
| `passwort`     | Text, 8–128 Zeichen bei Registrierung       |
| `titel`        | Text, 1–200 Zeichen                         |
| `beschreibung` | Text oder `null`, maximal 2000 Zeichen      |

## Request- und Response-Beispiele

### Benutzer registrieren

```http
POST /api/benutzer/registrieren
Content-Type: application/json

{
  "benutzername": "Anna",
  "email": "anna@example.com",
  "passwort": "sicheres-passwort"
}
```

Erfolgreiche Antwort (`201 Created`):

```json
{
  "id": "d0ea6c65-ecf9-4800-90d7-91ea9725acc4",
  "benutzername": "Anna",
  "email": "anna@example.com",
  "erstelltAm": "2026-09-21T12:00:00.000Z"
}
```

### Anmelden

```http
POST /api/benutzer/login
Content-Type: application/json

{
  "email": "anna@example.com",
  "passwort": "sicheres-passwort"
}
```

Erfolgreiche Antwort (`200 OK`):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "nachricht": "Erfolgreich angemeldet."
}
```

Das Token wird bei allen geschützten Endpunkten als Header gesendet:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Aufgabe erstellen

```http
POST /api/aufgaben
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "titel": "README fertigstellen",
  "beschreibung": "Request- und Response-Beispiele ergänzen",
  "status": "OFFEN"
}
```

Erfolgreiche Antwort (`201 Created`):

```json
{
  "id": "b87f1090-625e-4a80-837d-7ec0c119fdd9",
  "titel": "README fertigstellen",
  "beschreibung": "Request- und Response-Beispiele ergänzen",
  "status": "OFFEN",
  "benutzerId": "d0ea6c65-ecf9-4800-90d7-91ea9725acc4",
  "erstelltAm": "2026-09-21T12:05:00.000Z"
}
```

### Aufgabe aktualisieren

`PUT` erwartet den vollständigen veränderbaren Datensatz:

```http
PUT /api/aufgaben/b87f1090-625e-4a80-837d-7ec0c119fdd9
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "titel": "README fertigstellen",
  "beschreibung": "Dokumentation wurde ergänzt",
  "status": "ERLEDIGT"
}
```

### Aufgabe löschen

```http
DELETE /api/aufgaben/b87f1090-625e-4a80-837d-7ec0c119fdd9
Authorization: Bearer <TOKEN>
```

Erfolgreiche Antwort: `204 No Content`.

## Prüfungen

`npm test` führt Syntaxprüfungen und Integrationstests gegen eine temporäre SQLite-Datenbank aus. Dabei werden Registrierung, Login, JWT-Schutz, Aufgaben-CRUD, Benutzerisolation, Validierung und Rate Limiting geprüft.

```bash
npm test
npx prisma validate
```

## Dateien und Archive

`node_modules`, `.env`, SQLite-Entwicklungsdatenbanken und `.git` sind von Git beziehungsweise npm-Paketarchiven ausgeschlossen. `.env.example` enthält ausschließlich Platzhalter und darf versioniert werden.
