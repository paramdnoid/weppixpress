## Projekt Setup

**Voraussetzungen**
- Node.js (>= 16)
- npm oder Yarn
- MariaDB oder MySQL
- Optional: Redis (für Caching und Rate Limiting)

**1. Repository klonen**
```bash
git clone https://github.com/deinorg/weppixpress.git
cd weppixpress
```

**2. Backend einrichten**
```bash
cd backend
npm install
cp .env.example .env
# .env mit echten Werten füllen
npm run migrate   # führt migration.sql oder Migrationstool aus
npm run dev       # startet den Express-Server auf Port 3001
cd ..
```

**4. Frontend einrichten**
```bash
cd frontend
npm install
cp .env.example .env
# .env mit VITE_API_BASE_URL=http://localhost:3001/api
npm run dev       # startet Vite auf Port 5173
cd ..
```

**5. Gesamtprojekt starten (Dev-Mode)**
Starten Sie Backend und Frontend in separaten Terminals:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**6. Environment-Variablen**
Erstellen Sie im `backend` und `frontend` je eine Datei `.env.example` mit diesen Einträgen:

```dotenv
# backend/.env.example
DB_HOST=localhost
DB_USER=dein_user
DB_PASSWORD=dein_passwort
DB_NAME=weppixpress
JWT_SECRET=dein_jwt_geheimnis
JWT_EXPIRES_IN=1d
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=mail_passwort
REDIS_URL=redis://localhost:6379

# frontend/.env.example
VITE_API_BASE_URL=http://localhost:3001/api
```

## Skripte

**Backend**
| Skript           | Beschreibung                                 |
|------------------|----------------------------------------------|
| `npm run dev`    | Startet den Backend-Server im Dev-Mode       |
| `npm run migrate`| Führt die Datenbankmigrationen aus           |
| `npm test`       | Führt Backend-Tests aus                      |

**Frontend**
| Skript           | Beschreibung                                 |
|------------------|----------------------------------------------|
| `npm run dev`    | Startet den Frontend-Server im Dev-Mode      |
| `npm run build`  | Baut die Produktion-Version                  |
| `npm run test`   | Führt Frontend-Unit-Tests aus                |

# weppixpress

weppixpress ist eine moderne Fullstack-Anwendung zum Verwalten und Versenden von Dateien und Mails in einer Flow-basierten UI. Die Anwendung besteht aus zwei Teilen:

- **Backend**: Node.js / Express API mit MariaDB, JWT-Authentifizierung, Mail-Versand und Redis-Caching.
- **Frontend**: Vue 3 / Vite SPA mit Pinia, Vue Router, Tabler UI und File-/Mail-Management Komponenten.

## Features

- Nutzer-Registrierung, Login, Passwort-Zurücksetzen (JWT + E-Mail-Verifikation)
- File-Management mit Upload, Download, Buckets und Ordnerstruktur (TreeView)
- E-Mail-Versand über SMTP mit Vorlagen
- Flow-basierte Übersicht für Dateien, Mails, Meetings uvm.
- Responsive UI mit Tabler UI, SCSS-Theming und Dark Mode

## Quickstart

### 1. Repository klonen

```bash
git clone https://github.com/deinorg/weppixpress.git
cd weppixpress
```

### 2. Backend starten

```bash
cd backend
npm install
cp .env.example .env
# .env-Datei mit realen Werten befüllen
npm run migrate    # DB-Migrationen ausführen
npm run dev        # Server startet auf http://localhost:3001
```

### 3. Frontend starten

```bash
cd frontend
npm install
cp .env.example .env
# .env-Datei anpassen, z.B. VITE_API_BASE_URL=http://localhost:3001/api
npm run dev        # App startet auf http://localhost:5173
```

### 4. Gesamtprojekt (Dev Mode)

Öffne zwei Terminals und starte Backend und Frontend parallel:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Nach wenigen Sekunden ist die Anwendung unter http://localhost:5173 erreichbar und kommuniziert mit dem Backend auf Port 3001.

## Voraussetzung

- Node.js >=16
- npm oder Yarn
- MariaDB oder MySQL
- Optional: Redis (für Caching, Rate Limiting)

## Build & Tests

### Backend

| Skript            | Beschreibung                      |
|-------------------|-----------------------------------|
| `npm run dev`     | Server im Dev-Modus (Port 3001)   |
| `npm run migrate` | Führt DB-Migrationen aus          |
| `npm test`        | Backend-Tests (Jest, Supertest)   |

### Frontend

| Skript            | Beschreibung                        |
|-------------------|-------------------------------------|
| `npm run dev`     | Vite Dev-Server (Port 5173)         |
| `npm run build`   | Produktion-Build                    |
| `npm run test`    | Frontend-Unit-Tests (Vitest)        |

## Weitere Dokumentation

- **backend/README.md**: Detaillierte Infos zu DB-Schema, API-Endpunkten, Deployment
- **frontend/README.md**: Komponentenübersicht, State Management, Styleguide

## Contributing

1. Forke das Repository
2. Erstelle einen neuen Branch: `git checkout -b feature/meine-idee`
3. Committe deine Änderungen: `git commit -m 'feat: Meine Idee'`
4. Push: `git push origin feature/meine-idee`
5. Öffne einen Pull Request

## Lizenz

MIT