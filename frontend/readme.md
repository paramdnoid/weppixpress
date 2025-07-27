

# Frontend

## Übersicht
Das Frontend ist eine Vue 3 Single Page Application (SPA) mit Vite, Pinia, Vue Router und Tabler UI. Die Anwendung ermöglicht Datei- und E-Mail-Verwaltung in einer Flow-basierten Oberfläche.

## Einrichtung

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Umgebungsvariablen:
   - Kopiere `.env.example` nach `.env` und passe `VITE_API_BASE_URL` an:
     ```
     VITE_API_BASE_URL=http://localhost:3001/api
     ```
3. Entwicklungsmodus starten:
   ```bash
   npm run dev
   ```
4. Produktion bauen:
   ```bash
   npm run build
   ```
5. Unit-Tests ausführen:
   ```bash
   npm run test
   ```

## Projektstruktur
```
frontend/
├── public/
├── src/
│   ├── assets/      # Bilder, Styles, Logos
│   ├── components/  # Wiederverwendbare UI-Komponenten
│   ├── layouts/     # Seiten-Layouts (Auth, Default)
│   ├── router/      # Vue Router-Konfiguration
│   ├── stores/      # Pinia-State-Management
│   └── views/       # Seiten-Views
├── vite.config.js
└── package.json
```

## Wichtige Skripte

| Skript           | Beschreibung                          |
|------------------|---------------------------------------|
| `npm run dev`    | Startet Vite-Dev-Server (Port 5173)   |
| `npm run build`  | Erstellt Produktions-Build            |
| `npm run preview`| Vorschau des Produktions-Builds       |
| `npm run test`   | Führt Frontend-Unit-Tests (Vitest)    |

## State Management
- Pinia-Store für Authentifizierung in `src/stores/auth.js`
- Globale Stores für UI-Status (Toasts, Ladezustand)

## Styleguide & Themes
- SCSS mit `src/assets/styles`
- Tabler UI: Komponentenbibliothek
- Dark Mode: über CSS-Variable `--theme`

## Deployment

1. Produktions-Build erzeugen: `npm run build`
2. Statische Dateien auf Hosting-Server deployen (z.B. Nginx, Netlify)
3. Umgebungsvariable `VITE_API_BASE_URL` auf Produktions-API setzen