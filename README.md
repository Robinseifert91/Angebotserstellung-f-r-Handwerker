# Handwerker Angebots-Tool

Eine Web-App für kleine deutsche Handwerksbetriebe: Handwerker fotografiert die Baustelle mit dem Smartphone, lädt die Fotos hoch, und die KI erstellt automatisch ein unterschriftsreifes Angebot als PDF — inklusive Flächen­schätzung, Gewerk-Erkennung und Münchner Marktpreisen. Im Unterschied zu Tools wie ToolTime oder Lexoffice braucht es keine manuelle Aufmaßerfassung — die Flächenermittlung erfolgt direkt aus den Baustellenfotos per Claude Vision.

## Screenshots

| Foto-Upload | KI-Analyse | Angebot bearbeiten |
|:-----------:|:----------:|:-----------------:|
| ![Foto-Upload](docs/screenshots/01-foto-upload.jpg) | ![KI-Analyse](docs/screenshots/02-ki-analyse.jpg) | ![Angebot bearbeiten](docs/screenshots/03-angebot-bearbeiten.jpg) |

**Beispiel-PDF:** [Angebot-2026-003.pdf](docs/examples/Angebot-2026-003.pdf)

---

## Tech Stack

| Schicht    | Technologie                                  |
|------------|----------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend    | Node.js + Express, TypeScript                |
| Datenbank  | PostgreSQL + Prisma ORM                      |
| KI         | Anthropic API — `claude-sonnet-4-6` (Vision + Text) |
| PDF        | PDFKit                                       |

---

## Features

- Foto-Upload direkt vom Smartphone (bis zu 20 Fotos pro Auftrag)
- KI-Bildanalyse: Gewerk-Erkennung, Flächen­schätzung (Boden, Wände, Decke) aus Fotos — ohne manuelle Eingabe
- Automatische Angebotsgenerierung mit realistischen Münchner Preisen
- Positionen nachträglich bearbeitbar (Menge, Einzelpreis, Einheit)
- PDF-Export als fertiges, rechtkonformes Angebot (MwSt. 19 %, Zahlungsbedingungen, Steuernummer)
- Angebotsnummer nach Schema YYYY-NNN, fortlaufend pro Jahr
- Mobile-first UI — optimiert für Smartphones auf der Baustelle
- Firmendaten einmalig hinterlegen (inkl. Logo-Upload)
- Kein Login erforderlich — Einzelbetrieb-App

---

## Setup

### Voraussetzungen

- Node.js 18 oder neuer
- PostgreSQL (lokal oder remote)
- Anthropic API Key ([console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
git clone <repo-url>
cd handwerker-tool

# Abhängigkeiten installieren
cd backend && npm install
cd ../frontend && npm install
```

### Umgebungsvariablen

Im Verzeichnis `backend/` eine Datei `.env` nach dem folgenden Muster anlegen:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/handwerker"
ANTHROPIC_API_KEY="sk-ant-..."
PORT=4000
```

### Datenbank initialisieren

```bash
cd backend
npx prisma migrate dev --name init
```

### Starten

```bash
# Terminal 1 — Backend (Port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (Port 3000)
cd frontend
npm run dev
```

Aufruf im Browser: [http://localhost:3000](http://localhost:3000)

Beim ersten Aufruf: Firmendaten unter **Einstellungen** hinterlegen (Firmenname, Steuernummer, Stundensatz).

---

## Architektur-Übersicht

```
Browser (Next.js, Port 3000)
        │
        │  REST / JSON
        ▼
Express Backend (Port 4000)
        │
        ├─── Prisma ORM ──► PostgreSQL
        │
        ├─── /uploads         (hochgeladene Fotos, statisch ausgeliefert)
        ├─── /generated-pdfs  (erzeugte PDF-Dateien)
        │
        ├─── vision.service ──► Anthropic API  (Bildanalyse → JSON)
        └─── angebot.service ─► Anthropic API  (JSON → Angebotspositionen)
```

**KI-Workflow (2 Stufen):**

```
Fotos (base64) + Beschreibung
        │
        ▼  Stufe 1 — vision.service
   claude-sonnet-4-6 (Vision)
        │  → FotoAnalyse-JSON (Gewerk, Flächen, Auffälligkeiten)
        ▼  Stufe 2 — angebot.service
   claude-sonnet-4-6 (Text)
        │  → Angebotspositionen (Bezeichnung, Menge, Einheit, Preis)
        ▼
   PDF via PDFKit
```

---

## API-Endpunkte

| Methode | Pfad                                    | Beschreibung                                    |
|---------|-----------------------------------------|-------------------------------------------------|
| GET     | `/api/betrieb`                          | Firmendaten abrufen                             |
| PUT     | `/api/betrieb`                          | Firmendaten aktualisieren                       |
| POST    | `/api/betrieb/logo`                     | Logo hochladen                                  |
| GET     | `/api/auftraege`                        | Alle Aufträge auflisten                         |
| POST    | `/api/auftraege`                        | Neuen Auftrag anlegen                           |
| GET     | `/api/auftraege/:id`                    | Einzelnen Auftrag abrufen                       |
| PUT     | `/api/auftraege/:id`                    | Auftrag aktualisieren                           |
| DELETE  | `/api/auftraege/:id`                    | Auftrag löschen                                 |
| POST    | `/api/auftraege/:id/fotos`              | Foto hochladen                                  |
| POST    | `/api/auftraege/:id/fotos/analyse`      | KI-Bildanalyse starten (Stufe 1)                |
| DELETE  | `/api/auftraege/fotos/:fotoId`          | Einzelnes Foto löschen                          |
| POST    | `/api/auftraege/:id/angebot`            | Angebot aus Analyse generieren (Stufe 2)        |
| GET     | `/api/angebote/:id`                     | Angebot abrufen                                 |
| PUT     | `/api/angebote/:id`                     | Angebots-Metadaten bearbeiten                   |
| PUT     | `/api/angebote/:id/positionen`          | Positionen ersetzen + Summen neu berechnen      |
| GET     | `/api/angebote/:id/export`              | PDF generieren und herunterladen                |

---

## Geplante Features (Phase 3)

- **Spracheingabe** für das Beschreibungsfeld via Web Speech API (browser-nativ, kein Backend-Änderung nötig) — die `<BeschreibungInput>`-Komponente ist dafür bereits als eigenständige Komponente gekapselt

---

## Lizenz

MIT
