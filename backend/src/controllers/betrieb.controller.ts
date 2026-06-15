import { Request, Response, NextFunction } from 'express';
import { Gewerk } from '@prisma/client';
import prisma from '../lib/prisma';

export async function getBetrieb(req: Request, res: Response, next: NextFunction) {
  try {
    const betrieb = await prisma.betrieb.findFirst();
    if (!betrieb) return res.status(404).json({ error: 'Noch keine Firmendaten hinterlegt' });
    res.json(betrieb);
  } catch (err) {
    next(err);
  }
}

export async function updateBetrieb(req: Request, res: Response, next: NextFunction) {
  try {
    const { firmenname, inhaber, strasse, plz, stadt, steuernummer, telefon, email, stundensatz, gewerk } = req.body;

    if (!firmenname?.trim() || !steuernummer?.trim()) {
      return res.status(400).json({ error: 'Firmenname und Steuernummer sind Pflichtfelder' });
    }

    if (stundensatz !== undefined && (isNaN(parseFloat(stundensatz)) || parseFloat(stundensatz) < 0)) {
      return res.status(400).json({ error: 'Ungültiger Stundensatz' });
    }

    const data = {
      firmenname: firmenname.trim(),
      inhaber: inhaber?.trim() || '',
      strasse: strasse?.trim() || '',
      plz: plz?.trim() || '',
      stadt: stadt?.trim() || '',
      steuernummer: steuernummer.trim(),
      telefon: telefon?.trim() || null,
      email: email?.trim() || null,
      stundensatz: stundensatz ? parseFloat(stundensatz) : 65.0,
      gewerk: (gewerk as Gewerk) || Gewerk.SONSTIGES,
    };

    const existing = await prisma.betrieb.findFirst();
    const betrieb = existing
      ? await prisma.betrieb.update({ where: { id: existing.id }, data })
      : await prisma.betrieb.create({ data });

    res.json(betrieb);
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

    const existing = await prisma.betrieb.findFirst();
    if (!existing) return res.status(404).json({ error: 'Bitte zuerst Firmendaten anlegen' });

    const betrieb = await prisma.betrieb.update({
      where: { id: existing.id },
      data: { logo: req.file.path },
    });

    res.json(betrieb);
  } catch (err) {
    next(err);
  }
}
