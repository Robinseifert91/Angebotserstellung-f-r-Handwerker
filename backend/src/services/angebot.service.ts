import Anthropic from '@anthropic-ai/sdk';
import { FotoAnalyse } from './vision.service';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du erstellst Angebotspositionen für deutsche Handwerksbetriebe (München-Niveau).

Kalkulationslogik:
- Materialkosten + Lohnkosten + Aufschlag (15–25%) = Positionspreis
- Realistische, marktübliche Preise für den Münchner Raum
- Stundensatz des Betriebs für Lohnpositionen verwenden

WICHTIG — Mengen:
Wenn "GEMESSENE FLÄCHEN" angegeben sind, MUSST du diese exakten Werte als "menge" verwenden.
Weiche nur fachlich begründet ab (z.B. Fliesen +10% Verschnitt, Anstrich +5% für Kanten).
Erfinde keine eigenen Flächen.

Typische Positionen je Gewerk:
- MALER: Untergrundvorbereitung (m²), Grundierung (m²), Anstrich je Schicht (m²), Abdeckarbeiten (pauschal)
- FLIESENLEGER: Untergrundvorbereitung (m²), Abdichtung (m²), Fliesenverlegung (m²), Verfugung (m²), Silikonfugen (m)
- ELEKTRIKER: Leitungsverlegung (m), Unterputz/Aufputz (STK), Anschluss (STK), Prüfung (pauschal)
- SHK: Demontage (pauschal), Montage (STK), Anschluss (STK), Druckprüfung (pauschal), Inbetriebnahme (pauschal)

Antworte AUSSCHLIESSLICH als JSON-Array, kein erklärender Text:
[
  {
    "bezeichnung": "Genaue Positionsbezeichnung",
    "menge": 25.0,
    "einheit": "M2",
    "einzelpreisNetto": 12.50
  }
]
Erlaubte Einheiten: M2, M, STK, STD, PAUSCHAL`;

export interface GeneriertePosition {
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreisNetto: number;
}

function flächenBlock(f: FotoAnalyse['flaechen']): string {
  const zeilen: string[] = [];
  if (f.boden_m2 != null)    zeilen.push(`  Boden: ${f.boden_m2} m²`);
  if (f.waende_m2 != null)   zeilen.push(`  Wände gesamt: ${f.waende_m2} m²`);
  if (f.decke_m2 != null)    zeilen.push(`  Decke: ${f.decke_m2} m²`);
  if (f.sonstige_m2 != null) zeilen.push(`  Sonstige: ${f.sonstige_m2} m²`);
  if (zeilen.length === 0)   zeilen.push('  (keine genauen Maße ermittelbar)');
  zeilen.push(`  Hinweis: ${f.anmerkung}`);
  return zeilen.join('\n');
}

export async function generiereAngebotPositionen(
  analyse: FotoAnalyse,
  stundensatz: number
): Promise<GeneriertePosition[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Erstelle Angebotspositionen für folgende Analyse:

Gewerk: ${analyse.gewerk}
Raum: ${analyse.raum}

GEMESSENE FLÄCHEN (diese Werte MUSST du als "menge" verwenden):
${flächenBlock(analyse.flaechen)}

Auffälligkeiten: ${analyse.auffaelligkeiten.join(', ') || 'keine'}
Empfohlene Positionen: ${analyse.empfohlenePositionen.join(', ')}
Stundensatz: ${stundensatz} €/Std`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('KI-Antwort enthält kein gültiges JSON');

  try {
    return JSON.parse(jsonMatch[0]) as GeneriertePosition[];
  } catch (e: any) {
    throw new Error('KI-Antwort konnte nicht geparst werden: ' + e.message);
  }
}

export function berechneAngebotSummen(positionen: GeneriertePosition[]) {
  const gesamtNetto = positionen.reduce((sum, p) => sum + p.menge * p.einzelpreisNetto, 0);
  const mwstBetrag = Math.round(gesamtNetto * 0.19 * 100) / 100;
  const gesamtBrutto = Math.round((gesamtNetto + mwstBetrag) * 100) / 100;
  return { gesamtNetto: Math.round(gesamtNetto * 100) / 100, mwstBetrag, gesamtBrutto };
}
