import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
const fsPromises = fs.promises;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du bist ein erfahrener Handwerks-Gutachter. Analysiere Fotos für deutsche Handwerksbetriebe.

FLÄCHENERMITTLUNG — verwende diese Referenzmaße zum Schätzen:
- Innentür: 2,00–2,10 m hoch, 0,75–0,90 m breit
- Lichtschalter/Steckdose: ca. 8×8 cm
- Standardfliese: 30×30 cm oder 60×60 cm (Fugen sichtbar)
- Badewanne: ca. 170×75 cm, Waschbecken: ca. 60×50 cm
- Standarddeckenhöhe: 2,50 m (Altbau oft 2,70–3,00 m)
- Heizkörper: ca. 60 cm hoch

Berechnung:
- Wandfläche = Umfang × Höhe − Türen (á 2,1 m²) − Fenster (á 1,5 m²)
- Bei mehreren Fotos: Maße über alle Fotos hinweg konsolidieren
- Wenn nicht erkennbar: null setzen, nicht schätzen

Antworte AUSSCHLIESSLICH als JSON, kein erklärender Text:
{
  "gewerk": "MALER|FLIESENLEGER|ELEKTRIKER|SHK|SONSTIGES",
  "raum": "z.B. Badezimmer (ca. 8 m² Grundfläche)",
  "flaechen": {
    "boden_m2": 12.5,
    "waende_m2": 38.0,
    "decke_m2": 12.5,
    "sonstige_m2": null,
    "anmerkung": "Deckenhöhe 2,50 m angenommen; Tür als Referenz"
  },
  "auffaelligkeiten": ["Liste sichtbarer Mängel/Besonderheiten"],
  "empfohlenePositionen": ["Liste konkreter Arbeitsschritte"],
  "unsicherheiten": ["Was nicht erkennbar/messbar war"],
  "auftragsname": "Kurzer Name z.B. 'Badezimmer Fliesenarbeiten'"
}`;

export interface FotoAnalyse {
  gewerk: string;
  raum: string;
  flaechen: {
    boden_m2: number | null;
    waende_m2: number | null;
    decke_m2: number | null;
    sonstige_m2: number | null;
    anmerkung: string;
  };
  auffaelligkeiten: string[];
  empfohlenePositionen: string[];
  unsicherheiten: string[];
  auftragsname: string;
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getMediaType(dateipfad: string): MediaType {
  const ext = path.extname(dateipfad).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

export async function analysiereFotos(
  dateipfade: string[],
  beschreibung: string
): Promise<FotoAnalyse> {
  const imageContent = await Promise.all(dateipfade.map(async (pfad) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: getMediaType(pfad),
      data: (await fsPromises.readFile(pfad)).toString('base64'),
    },
  })));

  const userText = beschreibung
    ? `Analysiere diese Fotos präzise. Beschreibung vom Handwerker: ${beschreibung}`
    : 'Analysiere diese Fotos präzise und ermittle alle Flächen in m².';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [...imageContent, { type: 'text' as const, text: userText }],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('KI-Antwort enthält kein gültiges JSON');

  try {
    return JSON.parse(jsonMatch[0]) as FotoAnalyse;
  } catch (e: any) {
    throw new Error('KI-Antwort konnte nicht geparst werden: ' + e.message);
  }
}
