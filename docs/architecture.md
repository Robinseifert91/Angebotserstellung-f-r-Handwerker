# Architektur

## Datenmodelle (Prisma)

### Betrieb

Einmaliger Eintrag pro Instanz — es gibt kein Multi-Tenancy im MVP.

| Feld          | Typ     | Besonderheit                                 |
|---------------|---------|----------------------------------------------|
| id            | String  | CUID                                         |
| firmenname    | String  |                                              |
| inhaber       | String  |                                              |
| strasse       | String  |                                              |
| plz           | String  |                                              |
| stadt         | String  |                                              |
| steuernummer  | String  | Pflichtfeld für rechtskonforme Angebote      |
| telefon       | String? |                                              |
| email         | String? |                                              |
| logo          | String? | Dateipfad zum Logo-Bild                      |
| stundensatz   | Float   | Default: 65,00 €/Std — Eingabe in Einstellungen |
| gewerk        | Enum    | MALER, FLIESENLEGER, ELEKTRIKER, SHK, SONSTIGES |

Beziehung: `Betrieb 1 → n Auftrag`

---

### Auftrag

Repräsentiert einen Kundenauftrag inkl. aller zugehörigen Fotos.

| Feld          | Typ          | Besonderheit                                    |
|---------------|--------------|-------------------------------------------------|
| id            | String       | CUID                                            |
| betriebId     | String       | FK → Betrieb                                    |
| name          | String       | Wird initial vom Vision-Service gesetzt         |
| kundenname    | String?      |                                                 |
| objektAdresse | String?      |                                                 |
| beschreibung  | String?      | Max. ~2000 Zeichen; Freitext, kein Format       |
| status        | Enum         | ENTWURF → ANGEBOT_ERSTELLT → GESENDET → ABGESCHLOSSEN |

Beziehungen: `Auftrag n → 1 Betrieb`, `Auftrag 1 → n Foto`, `Auftrag 1 → 0..1 Angebot`

---

### Foto

Speichert Upload-Pfad und das JSON-Ergebnis der KI-Analyse.

| Feld            | Typ    | Besonderheit                                            |
|-----------------|--------|---------------------------------------------------------|
| id              | String | CUID                                                    |
| auftragId       | String | FK → Auftrag (Cascade Delete)                           |
| dateipfad       | String | Absoluter Pfad auf dem Server unter `./uploads/`        |
| analyseErgebnis | Json?  | Null bis Analyse ausgeführt wurde; danach FotoAnalyse-Shape |

Das `analyseErgebnis`-Feld wird nach erfolgreicher Vision-API-Antwort auf **allen Fotos** des Auftrags gesetzt — nicht nur auf dem zuletzt analysierten. So bleibt der Analyse-Stand auch nach Nachladen konsistent.

---

### Angebot

1:1 mit Auftrag. Enthält Summen und Metadaten für das PDF.

| Feld                | Typ          | Besonderheit                                           |
|---------------------|--------------|--------------------------------------------------------|
| id                  | String       | CUID                                                   |
| auftragId           | String       | Unique — ein Auftrag hat maximal ein Angebot           |
| angebotsnummer      | String       | Unique, Format YYYY-NNN (z.B. `2026-001`)              |
| datum               | DateTime     | Erstellungsdatum                                       |
| gueltigBis          | DateTime     | Datum + 30 Tage                                        |
| gesamtNetto         | Float        | Summe aller Positionspreise                            |
| mwstBetrag          | Float        | 19 % von gesamtNetto, gerundet auf 2 Nachkommastellen  |
| gesamtBrutto        | Float        | gesamtNetto + mwstBetrag                               |
| zahlungsbedingungen | String       | Default: "Zahlbar innerhalb von 14 Tagen ohne Abzug." |
| status              | Enum         | ENTWURF → FERTIG → EXPORTIERT                         |
| pdfPfad             | String?      | Wird gesetzt sobald PDF exportiert wurde               |

---

### Angebotsposition

Einzelne Zeile im Angebot. Reihenfolge wird explizit gespeichert.

| Feld              | Typ    | Besonderheit                                     |
|-------------------|--------|--------------------------------------------------|
| id                | String | CUID                                             |
| angebotId         | String | FK → Angebot (Cascade Delete)                    |
| reihenfolge       | Int    | 1-basiert; Index auf (angebotId, reihenfolge)    |
| bezeichnung       | String |                                                  |
| menge             | Float  |                                                  |
| einheit           | Enum   | M2, M, STK, STD, PAUSCHAL                        |
| einzelpreisNetto  | Float  |                                                  |
| gesamtpreisNetto  | Float  | menge × einzelpreisNetto, gerundet               |

---

## API-Endpunkte (vollständig)

### Betrieb

| Methode | Pfad               | Controller-Aktion        |
|---------|--------------------|--------------------------|
| GET     | `/api/betrieb`     | Firmendaten abrufen      |
| PUT     | `/api/betrieb`     | Firmendaten aktualisieren|
| POST    | `/api/betrieb/logo`| Logo hochladen (multipart)|

### Aufträge

| Methode | Pfad                | Controller-Aktion                                |
|---------|---------------------|--------------------------------------------------|
| GET     | `/api/auftraege`    | Liste aller Aufträge inkl. Foto-Count + Angebot  |
| POST    | `/api/auftraege`    | Neuen Auftrag anlegen                            |
| GET     | `/api/auftraege/:id`| Einzelauftrag mit Fotos + Angebot                |
| PUT     | `/api/auftraege/:id`| Auftrag-Felder aktualisieren                     |
| DELETE  | `/api/auftraege/:id`| Auftrag + Fotos (Dateisystem) löschen            |

### Fotos (unter `/api/auftraege`)

| Methode | Pfad                                 | Controller-Aktion                              |
|---------|--------------------------------------|------------------------------------------------|
| POST    | `/api/auftraege/:id/fotos`           | Einzelbild hochladen (multipart, max. 20)      |
| POST    | `/api/auftraege/:id/fotos/analyse`   | KI-Bildanalyse für alle Fotos des Auftrags     |
| DELETE  | `/api/auftraege/fotos/:fotoId`       | Einzelbild löschen (Datei + DB-Eintrag)        |

### Angebote

| Methode | Pfad                          | Controller-Aktion                                          |
|---------|-------------------------------|------------------------------------------------------------|
| POST    | `/api/auftraege/:id/angebot`  | Angebot aus Foto-Analyse generieren                        |
| GET     | `/api/angebote/:id`           | Angebot mit Positionen + Betriebsdaten                     |
| PUT     | `/api/angebote/:id`           | Metadaten (Gültigkeitsdatum, Zahlungsbedingungen, Status)  |
| PUT     | `/api/angebote/:id/positionen`| Alle Positionen ersetzen + Summen neu berechnen            |
| GET     | `/api/angebote/:id/export`    | PDF generieren und als Download senden                     |

---

## KI-Workflow (2-stufig)

### Stufe 1 — Vision-Service (`vision.service.ts`)

**Eingabe:** Array von Dateipfaden + optionale Handwerker-Beschreibung

**Was passiert:**
1. Bilder werden als Base64 in den API-Request eingebettet (kein URL-Upload)
2. Ein detaillierter System-Prompt mit Referenzmaßen (Türhöhen, Standard­fliesen­größen, Deckenhöhen) instruiert das Modell zur Flächen­schätzung
3. Claude gibt ausschließlich JSON zurück (`FotoAnalyse`-Shape)
4. Das Analyseergebnis wird als `Json`-Feld auf allen Fotos des Auftrags gespeichert
5. Der `auftragsname` aus der Analyse überschreibt den Auftragsnamen in der DB

**Ausgabe (`FotoAnalyse`):**
```typescript
{
  gewerk: "MALER" | "FLIESENLEGER" | "ELEKTRIKER" | "SHK" | "SONSTIGES",
  raum: string,
  flaechen: { boden_m2, waende_m2, decke_m2, sonstige_m2, anmerkung },
  auffaelligkeiten: string[],
  empfohlenePositionen: string[],
  unsicherheiten: string[],
  auftragsname: string
}
```

### Stufe 2 — Angebot-Service (`angebot.service.ts`)

**Eingabe:** `FotoAnalyse`-Objekt + Stundensatz des Betriebs

**Was passiert:**
1. Die gemessenen Flächen werden als explizite Vorgabe in den Prompt übernommen ("MUSST du als menge verwenden")
2. Der Stundensatz des Betriebs fließt als Kalkulations­grundlage ein
3. Claude gibt ein JSON-Array von Angebots­positionen zurück
4. `berechneAngebotSummen()` berechnet Netto, MwSt. (19 %), Brutto — serverseitig, nicht im Modell

**Ausgabe:** `GeneriertePosition[]` → wird zu `Angebotsposition`-Einträgen in der DB

Der zweistufige Ansatz hat eine klare Schnitt­stelle: Stufe 1 ist rein deskriptiv (was ist da?), Stufe 2 ist rein kalkulatorisch (was kostet das?). Beide Stufen können unabhängig getestet werden.

---

## Dateiablage

| Verzeichnis        | Inhalt                                    | Angelegt durch           |
|--------------------|-------------------------------------------|--------------------------|
| `backend/uploads/` | Hochgeladene Baustellenfotos (multipart)  | `index.ts` beim Start    |
| `backend/generated-pdfs/` | Erzeugte PDF-Angebote            | `index.ts` + `pdf.service.ts` |

Fotos werden über `/uploads/<dateiname>` direkt vom Express-Server als statische Dateien ausgeliefert. Das Frontend baut die URL selbst aus dem `dateipfad`-Feld (Dateiname via `path.basename`).

PDF-Dateinamen folgen dem Schema: `angebot-YYYY_NNN-<timestamp>.pdf` — der Timestamp verhindert Cache-Konflikte bei Mehrfach-Export.

---

## Besonderheiten

### Angebotsnummer-Format

Schema: `YYYY-NNN` (Beispiel: `2026-001`, `2026-042`)

Die Vergabe erfolgt innerhalb einer Prisma-Transaktion: `count` der Angebote mit gleichem Jahres-Präfix + 1. Bei gleichzeitigen Requests kann es zur `UNIQUE`-Constraint-Verletzung kommen (Prisma-Fehlercode `P2002`). Dagegen schützt ein Retry-Loop mit bis zu 3 Versuchen im `generateAngebot`-Controller.

### Race-Condition-Schutz

```
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    angebot = await prisma.$transaction(async (tx) => { ... });
    break;
  } catch (e) {
    if (attempt < 2 && e?.code === 'P2002') continue;
    throw e;
  }
}
```

Transaktionen schützen außerdem das atomare Ersetzen von Angebots­positionen (`updatePositionen`): erst `deleteMany`, dann `create` — beides in einer Transaktion, damit es keinen inkonsistenten Zwischenstand gibt.
