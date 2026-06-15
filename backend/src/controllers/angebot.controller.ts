import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { Einheit, AngebotStatus, AuftragStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { generiereAngebotPositionen, berechneAngebotSummen } from '../services/angebot.service';
import { erstellePdf } from '../services/pdf.service';
import { FotoAnalyse } from '../services/vision.service';

const EINHEIT_MAP: Record<string, Einheit> = {
  M2: Einheit.M2, M: Einheit.M, STK: Einheit.STK, STD: Einheit.STD, PAUSCHAL: Einheit.PAUSCHAL,
};

async function naechsteAngebotsnummer(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.angebot.count({
    where: { angebotsnummer: { startsWith: `${year}-` } },
  });
  return `${year}-${String(count + 1).padStart(3, '0')}`;
}

export async function generateAngebot(req: Request, res: Response, next: NextFunction) {
  try {
    const auftrag = await prisma.auftrag.findUnique({
      where: { id: req.params.id },
      include: { fotos: true, betrieb: true, angebot: true },
    });

    if (!auftrag) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    if (auftrag.angebot) return res.status(409).json({ error: 'Angebot existiert bereits' });

    const analysiertesFoto = auftrag.fotos.find(f => f.analyseErgebnis !== null);
    if (!analysiertesFoto) {
      return res.status(400).json({ error: 'Bitte erst Fotos analysieren' });
    }

    const analyse = analysiertesFoto.analyseErgebnis as unknown as FotoAnalyse;
    const positionen = await generiereAngebotPositionen(analyse, auftrag.betrieb.stundensatz);
    const summen = berechneAngebotSummen(positionen);

    const gueltigBis = new Date();
    gueltigBis.setDate(gueltigBis.getDate() + 30);

    // Retry loop guards against unique-constraint collision on angebotsnummer
    let angebot;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        angebot = await prisma.$transaction(async (tx) => {
          const angebotsnummer = await naechsteAngebotsnummer(tx);
          return tx.angebot.create({
            data: {
              auftragId: auftrag.id,
              angebotsnummer,
              gueltigBis,
              gesamtNetto: summen.gesamtNetto,
              mwstBetrag: summen.mwstBetrag,
              gesamtBrutto: summen.gesamtBrutto,
              positionen: {
                create: positionen.map((p, i) => ({
                  reihenfolge: i + 1,
                  bezeichnung: p.bezeichnung,
                  menge: p.menge,
                  einheit: EINHEIT_MAP[p.einheit] ?? Einheit.PAUSCHAL,
                  einzelpreisNetto: p.einzelpreisNetto,
                  gesamtpreisNetto: Math.round(p.menge * p.einzelpreisNetto * 100) / 100,
                })),
              },
            },
            include: { positionen: { orderBy: { reihenfolge: 'asc' } } },
          });
        });
        break; // success — exit retry loop
      } catch (e: any) {
        // P2002 = Prisma unique constraint violation
        if (attempt < 2 && e?.code === 'P2002') continue;
        throw e;
      }
    }
    if (!angebot) throw new Error('Angebotsnummer konnte nicht vergeben werden');

    await prisma.auftrag.update({
      where: { id: auftrag.id },
      data: { status: AuftragStatus.ANGEBOT_ERSTELLT },
    });

    res.status(201).json(angebot);
  } catch (err) {
    next(err);
  }
}

export async function getAngebot(req: Request, res: Response, next: NextFunction) {
  try {
    const angebot = await prisma.angebot.findUnique({
      where: { id: req.params.id },
      include: {
        positionen: { orderBy: { reihenfolge: 'asc' } },
        auftrag: { include: { betrieb: true } },
      },
    });

    if (!angebot) return res.status(404).json({ error: 'Angebot nicht gefunden' });
    res.json(angebot);
  } catch (err) {
    next(err);
  }
}

export async function updateAngebot(req: Request, res: Response, next: NextFunction) {
  try {
    const { gueltigBis, zahlungsbedingungen, status } = req.body;

    if (status && !Object.values(AngebotStatus).includes(status as AngebotStatus)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }

    const existing = await prisma.angebot.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const angebot = await prisma.angebot.update({
      where: { id: req.params.id },
      data: {
        gueltigBis: gueltigBis ? new Date(gueltigBis) : existing.gueltigBis,
        zahlungsbedingungen: zahlungsbedingungen?.trim() || existing.zahlungsbedingungen,
        status: (status as AngebotStatus) || existing.status,
      },
      include: { positionen: { orderBy: { reihenfolge: 'asc' } } },
    });

    res.json(angebot);
  } catch (err) {
    next(err);
  }
}

export async function updatePositionen(req: Request, res: Response, next: NextFunction) {
  try {
    const { positionen } = req.body as {
      positionen: Array<{
        bezeichnung: string;
        menge: number;
        einheit: string;
        einzelpreisNetto: number;
      }>;
    };

    if (!Array.isArray(positionen) || positionen.length === 0) {
      return res.status(400).json({ error: 'Positionen fehlen' });
    }

    for (const p of positionen) {
      if (!Number.isFinite(p.menge) || p.menge <= 0) {
        return res.status(400).json({ error: 'Menge muss eine positive Zahl sein' });
      }
      if (!Number.isFinite(p.einzelpreisNetto) || p.einzelpreisNetto < 0) {
        return res.status(400).json({ error: 'Einzelpreis darf nicht negativ sein' });
      }
    }

    const existing = await prisma.angebot.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const summen = berechneAngebotSummen(positionen.map(p => ({
      ...p, einheit: p.einheit,
    })));

    const angebot = await prisma.$transaction(async (tx) => {
      await tx.angebotsposition.deleteMany({ where: { angebotId: req.params.id } });

      return tx.angebot.update({
        where: { id: req.params.id },
        data: {
          gesamtNetto: summen.gesamtNetto,
          mwstBetrag: summen.mwstBetrag,
          gesamtBrutto: summen.gesamtBrutto,
          status: AngebotStatus.FERTIG,
          positionen: {
            create: positionen.map((p, i) => ({
              reihenfolge: i + 1,
              bezeichnung: p.bezeichnung,
              menge: p.menge,
              einheit: EINHEIT_MAP[p.einheit] ?? Einheit.PAUSCHAL,
              einzelpreisNetto: p.einzelpreisNetto,
              gesamtpreisNetto: Math.round(p.menge * p.einzelpreisNetto * 100) / 100,
            })),
          },
        },
        include: { positionen: { orderBy: { reihenfolge: 'asc' } } },
      });
    });

    res.json(angebot);
  } catch (err) {
    next(err);
  }
}

export async function exportPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.angebot.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const filePath = await erstellePdf(req.params.id);

    await prisma.angebot.update({
      where: { id: req.params.id },
      data: { status: AngebotStatus.EXPORTIERT, pdfPfad: filePath },
    });

    res.download(filePath, `Angebot-${existing.angebotsnummer}.pdf`, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
