# Handwerker Angebots-Tool

## Was dieses Projekt ist
Eine Web-App für deutsche Handwerksbetriebe.
Handwerker lädt Fotos + kurze Beschreibung hoch → KI analysiert → Angebot wird automatisch generiert → PDF-Export.

## Zielgruppe
Kleine Handwerksbetriebe (1–10 Personen), wenig Digitalerfahrung, mobil-first.

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Node.js + Express, TypeScript
- KI: Anthropic API (claude-sonnet-4-6), Vision + Text
- PDF: PDFKit
- DB: PostgreSQL + Prisma ORM
- Ports: Backend 4000, Frontend 3000

## Wichtige Regeln
- Benutzeroberfläche immer auf Deutsch
- Alle Angebote müssen deutschem Recht entsprechen (MwSt., Pflichtangaben)
- Mobile-first: Handwerker nutzen Smartphones auf der Baustelle
- Kein WhatsApp oder externe Messaging-APIs
- Kein Login im MVP — die App ist für einen Einzelbetrieb, keine Authentifizierung
- Angebotsnummer-Format: YYYY-NNN (z.B. 2026-001), fortlaufend pro Jahr

## Workflow
1. vision-agent → analysiert Fotos
2. angebot-agent → generiert Angebot
3. Handwerker prüft kurz, passt an
4. PDF-Export

## Geplante Erweiterung: Spracheingabe (Phase 3)
Das `beschreibung`-Feld bei Aufträgen soll später per Spracheingabe befüllbar sein.

**Technologie:** Web Speech API (browser-nativ, kein Backend-Änderung nötig)
**Scope:** Rein Frontend — das Feld bleibt ein normales Textfeld, der Mikrofon-Button
          transkribiert und füllt es. Backend-API und Datenmodell bleiben unverändert.

**Beim Frontend-Bau beachten:**
- Das Beschreibungsfeld als eigene Komponente `<BeschreibungInput>` kapseln,
  nicht inline ins Formular schreiben — so lässt sich der Mikrofon-Button später
  sauber hinzufügen ohne das Formular anzufassen.
- Kein `<textarea>` direkt im Formular verdrahten — immer über die Komponente.

**Beim Backend beachten:**
- `beschreibung` im Auftrag-Controller ohne Einschränkung entgegennehmen
  (max. 2000 Zeichen reicht, keine Format-Validierung — Text ist Text egal woher).

## Phasen-Übersicht
```
Phase 1 — Backend
├── npm install + .env + DB migrate
├── betrieb.controller  GET/PUT Firmendaten
├── auftrag.controller  CRUD
├── foto.controller     Upload + Analyse-Trigger
├── vision.service      Anthropic Vision API
├── angebot.service     Anthropic Text API
└── pdf.service         PDFKit Export

Phase 2 — Frontend
├── Next.js Setup
├── Seite: Firmendaten einrichten
├── Seite: Neuer Auftrag — Foto-Upload + <BeschreibungInput> (Textfeld, Sprache kommt später)
├── Seite: Angebot prüfen & bearbeiten
└── PDF-Download Button

Phase 3 — Spracheingabe
└── Mikrofon-Button in <BeschreibungInput> via Web Speech API
    Änderung nur in einer Datei, kein Backend-Touch nötig
```
