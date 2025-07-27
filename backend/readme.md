

# Backend

## Übersicht
Das Backend ist eine Node.js/Express API zur Authentifizierung, Benutzerverwaltung, Mailversand und Dateiverwaltung.

### Technologie-Stack
- Node.js >= 16
- Express 4.x
- MariaDB oder MySQL
- Redis (optional für Caching und Rate Limiting)
- JSON Web Tokens (JWT) für Authentifizierung
- Nodemailer für E-Mail-Versand
- Speakeasy für 2-Faktor-Authentifizierung
- dotenv für Umgebungsvariablen

## Einrichtung

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Umgebungsvariablen:
   - Kopiere `.env.example` nach `.env` und fülle die Werte:
     ```
     DB_HOST=localhost
     DB_USER=<dein_user>
     DB_PASSWORD=<dein_passwort>
     DB_NAME=weppixpress
     JWT_SECRET=<dein_jwt_geheimnis>
     JWT_EXPIRES_IN=1d
     SMTP_HOST=smtp.example.com
     SMTP_PORT=587
     SMTP_USER=mailer@example.com
     SMTP_PASS=<mail_passwort>
     REDIS_URL=redis://localhost:6379
     ```
3. Datenbankmigration:
   ```bash
   npm run migrate
   ```
4. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```
5. Tests ausführen:
   ```bash
   npm test
   ```

## API-Endpunkte

### Authentifizierung
| Methode | Pfad                           | Beschreibung                             |
|---------|--------------------------------|------------------------------------------|
| POST    | `/api/auth/register`           | Nutzer registrieren                      |
| POST    | `/api/auth/login`              | Anmeldung, liefert JWT                  |
| POST    | `/api/auth/logout`             | Abmeldung                                |
| GET     | `/api/auth/verify-email`       | E-Mail-Verifikation (Query-Parameter: token) |
| POST    | `/api/auth/forgot-password`    | Passwort vergessen (E-Mail versenden)    |
| POST    | `/api/auth/reset-password`     | Passwort zurücksetzen (mit Token)        |

### Benutzer
| Methode | Pfad                  | Beschreibung                |
|---------|-----------------------|-----------------------------|
| GET     | `/api/users/me`       | Informationen zum eigenen Konto |
| GET     | `/api/users/:id`      | Nutzerinformationen abrufen |

## Deployment

1. Umgebungsvariablen in der Produktionsumgebung setzen.
2. Optional: Prozessmanager verwenden (z.B. PM2):
   ```bash
   pm2 start server.js --name weppixpress-backend
   ```
3. Logs überwachen (z.B. mit `pm2 logs weppixpress-backend`).

## Weiterführende Themen
- Error-Handling mit globaler Middleware
- Performance-Optimierungen (Caching, Pagination)
- Sicherer Umgang mit Secrets (Vault, CI/CD)