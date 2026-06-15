# Architektur-Entscheidungen (ADR)

Dieses Dokument hält fest, warum welche technische Entscheidung getroffen wurde. Format: Kontext → Entscheidung → Konsequenz.

---

## ADR-001: Kein Login im MVP

**Kontext**

Die App ist explizit für einen einzelnen Handwerksbetrieb konzipiert. Eine Authentifizierung würde im MVP-Scope nur Aufwand erzeugen, ohne Mehrwert zu bieten — der Betrieb betreibt die App selbst, es gibt keinen öffentlichen Zugang.

**Entscheidung**

Kein Auth-Layer, keine Session-Verwaltung, kein JWT. Jede Anfrage an das Backend wird ohne Identitätsprüfung akzeptiert.

**Konsequenz**

- Sofort nutzbar ohne Registrierung oder Passwort-Setup
- Die App ist nicht multi-tenant-fähig: ein `Betrieb`-Datensatz, keine Mandantentrennung
- Wer auf Port 3000 (oder 4000) zugreifen kann, hat vollen Zugriff — für Produktionseinsatz muss die App hinter einem Reverse Proxy (z.B. mit HTTP-Auth oder VPN) betrieben werden

---

## ADR-002: Anthropic Vision statt OCR oder klassischer Bilderkennung

**Kontext**

Das Kernproblem ist die Flächenermittlung aus Smartphone-Fotos: Wände, Böden, Decken sollen in m² geschätzt werden, ohne dass der Handwerker selbst Maße eingibt. Klassische Ansätze wären OCR (für Maßzahlen auf Fotos), Computer-Vision-Modelle für Tiefenabschätzung, oder manuell annotierte Trainingsdaten je Gewerk.

**Entscheidung**

Claude Sonnet Vision (`claude-sonnet-4-6`) mit einem detaillierten System-Prompt, der Referenzmaße (Innentür-Breite, Standard­fliesen­größe, Deckenhöhe) als Kalibrierungshilfe vorgibt. Das Modell schätzt Flächen per visueller Referenz, kein eigenes Modell nötig.

**Konsequenz**

- Keine Trainingsphase, keine Annotierungs­arbeit, kein GPU-Hosting
- Funktioniert sofort für alle 5 Gewerke (MALER, FLIESENLEGER, ELEKTRIKER, SHK, SONSTIGES)
- API-Kosten pro Analyse (pro Foto-Batch ein API-Call); bei schlechter Fotoqualität oder unklaren Fotos kann die Schätzung ungenau sein — das Modell gibt dann `null` zurück statt zu raten
- Vendor-Lock-in zu Anthropic; bei Modellwechsel muss lediglich der `model`-String in `vision.service.ts` angepasst werden

---

## ADR-003: 2-stufiger KI-Prozess (Vision → Angebot)

**Kontext**

Ursprünglich wäre ein einzelner API-Call denkbar gewesen: Fotos rein, Angebot raus. Das vermischt aber zwei konzeptionell unterschiedliche Aufgaben: (1) Fakten aus Bildern extrahieren und (2) Preise kalkulieren.

**Entscheidung**

Zwei separate Services mit klar definierter Schnittstelle:
- `vision.service.ts`: Fotos → `FotoAnalyse`-JSON (deskriptiv, kein Preis­wissen)
- `angebot.service.ts`: `FotoAnalyse` + Stundensatz → `GeneriertePosition[]` (kalkulatorisch, kein Bildinhalt)

Das `FotoAnalyse`-Objekt wird in der DB als `Json`-Feld im `Foto`-Modell persistiert. Dadurch kann Stufe 2 (Angebots­generierung) zu einem späteren Zeitpunkt neu ausgeführt werden, ohne Stufe 1 wiederholen zu müssen.

**Konsequenz**

- Beide Services sind unabhängig unit-testbar (je ein Mock-Input reicht)
- Das Analyse-Ergebnis ist für den Handwerker im UI sichtbar (Flächen-Karten), bevor er das Angebot generiert — er kann einschätzen, ob die KI plausible Werte geliefert hat
- Zwei statt einem API-Call pro Workflow: leicht höhere Latenz, aber der Nutzer sieht einen Lade-Indikator zwischen beiden Schritten, was die Wartezeit für ihn transparenter macht

---

## ADR-004: PDFKit statt Puppeteer / HTML-to-PDF

**Kontext**

Für den PDF-Export standen zwei Hauptoptionen zur Wahl:
- **Puppeteer**: HTML/CSS → Headless Chromium → PDF (gleiche visuelle Qualität wie Browser)
- **PDFKit**: Programmatisches Zeichnen auf A4-Canvas (coordinates-based)

**Entscheidung**

PDFKit. Das Angebot hat ein fest definiertes Layout (Kopfbereich, Tabelle, Summenblock, Zahlungsbedingungen) — dieses Layout ändert sich nicht dynamisch, ein programmatischer Aufbau ist daher ausreichend.

**Konsequenz**

- Kein Headless-Browser-Prozess, deutlich weniger RAM-Verbrauch (relevant auf kleinen VPS)
- Kein Chrome-Binary muss auf dem Server installiert sein
- Layout-Änderungen erfordern Koordinaten­arbeit statt CSS — weniger intuitiv, aber das Layout ist stabil und wird selten geändert
- Kein CSS-Styling möglich; komplexe responsive Layouts oder Seiten mit dynamisch vielen Elementen würden mehr Aufwand erfordern (hier: automatischer Seitenumbruch bei `y > 720` ist manuell implementiert)

---

## ADR-005: Web Speech API für Spracheingabe (Phase 3)

**Kontext**

Handwerker befinden sich auf der Baustelle, oft mit Handschuhen oder schmutzigen Händen. Das Tippen einer Auftragsbeschreibung am Smartphone ist umständlich. Eine Spracheingabe würde den Workflow deutlich verbessern. Optionen waren: ein Backend-Endpunkt mit OpenAI Whisper, ein separates npm-Package, oder die browser-native Web Speech API.

**Entscheidung**

Web Speech API (browser-nativ). Das `beschreibung`-Feld in `<BeschreibungInput>` bleibt ein normales Textfeld; ein Mikrofon-Button transkribiert und füllt es. Das Backend und das Datenmodell bleiben vollständig unverändert.

**Konsequenz**

- Kein zusätzliches npm-Package, kein neues Backend-Endpunkt, kein Extra-API-Key
- Die Transkription läuft on-device oder über den Browser-Provider — in modernen Chrome/Safari auf Android/iOS gut unterstützt, auf Desktop-Browsern variiert die Verfügbarkeit
- Kein Offline-Betrieb möglich, wenn der Browser die Speech API extern auslagert (chromium sendet Audio an Google-Server)
- Die Architektur­entscheidung zur Kapselung in `<BeschreibungInput>` (statt inline `<textarea>`) wurde bereits in Phase 1/2 getroffen, damit Phase 3 eine einzelne Datei berührt

---

## Offen / Zurückgestellt

| Thema                      | Status       | Grund                                                          |
|----------------------------|--------------|----------------------------------------------------------------|
| Multi-Tenancy / Auth       | Phase 4+     | Nicht im MVP-Scope; Betrieb betreibt App selbst               |
| E-Mail-Versand von PDFs    | Phase 4+     | Kein externer Messaging-Service im MVP (laut CLAUDE.md)       |
| Mehrsprachigkeit           | nicht geplant| Zielgruppe ausschließlich deutsche Handwerksbetriebe           |
| Offline-Fähigkeit (PWA)    | offen        | Sinnvoll für Baustelle; erfordert Service Worker + Cache-Strategie |
