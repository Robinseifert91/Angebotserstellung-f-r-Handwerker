import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getAuftraege(req: Request, res: Response, next: NextFunction) {
  try {
    const betrieb = await prisma.betrieb.findFirst();
    if (!betrieb) return res.json([]);

    const auftraege = await prisma.auftrag.findMany({
      where: { betriebId: betrieb.id },
      include: {
        fotos: { select: { id: true, dateipfad: true } },
        angebot: { select: { id: true, angebotsnummer: true, gesamtBrutto: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(auftraege);
  } catch (err) {
    next(err);
  }
}

export async function createAuftrag(req: Request, res: Response, next: NextFunction) {
  try {
    const betrieb = await prisma.betrieb.findFirst();
    if (!betrieb) return res.status(400).json({ error: 'Bitte zuerst Firmendaten anlegen' });

    const { kundenname, objektAdresse, beschreibung } = req.body;

    const auftrag = await prisma.auftrag.create({
      data: {
        betriebId: betrieb.id,
        name: 'Neuer Auftrag',
        kundenname: kundenname?.trim() || null,
        objektAdresse: objektAdresse?.trim() || null,
        beschreibung: beschreibung?.trim().slice(0, 2000) || null,
      },
    });

    res.status(201).json(auftrag);
  } catch (err) {
    next(err);
  }
}

export async function getAuftrag(req: Request, res: Response, next: NextFunction) {
  try {
    const auftrag = await prisma.auftrag.findUnique({
      where: { id: req.params.id },
      include: {
        fotos: { orderBy: { createdAt: 'asc' } },
        angebot: { include: { positionen: { orderBy: { reihenfolge: 'asc' } } } },
      },
    });

    if (!auftrag) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    res.json(auftrag);
  } catch (err) {
    next(err);
  }
}

export async function updateAuftrag(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.auftrag.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Auftrag nicht gefunden' });

    // Only update fields that are explicitly present in the request body
    const updateData: Record<string, any> = {};
    if ('name' in req.body && req.body.name?.trim()) updateData.name = req.body.name.trim();
    if ('kundenname' in req.body) updateData.kundenname = req.body.kundenname?.trim() || null;
    if ('objektAdresse' in req.body) updateData.objektAdresse = req.body.objektAdresse?.trim() || null;
    // beschreibung bleibt ein einfaches Textfeld — wird später auch per Spracheingabe befüllt
    if ('beschreibung' in req.body) updateData.beschreibung = req.body.beschreibung?.trim().slice(0, 2000) || null;

    const auftrag = await prisma.auftrag.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(auftrag);
  } catch (err) {
    next(err);
  }
}

export async function deleteAuftrag(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.auftrag.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Auftrag nicht gefunden' });

    await prisma.auftrag.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
