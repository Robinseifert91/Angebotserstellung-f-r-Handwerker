import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { analysiereFotos } from '../services/vision.service';

export async function uploadFoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

    const auftrag = await prisma.auftrag.findUnique({ where: { id: req.params.id } });
    if (!auftrag) return res.status(404).json({ error: 'Auftrag nicht gefunden' });

    const fotoCount = await prisma.foto.count({ where: { auftragId: auftrag.id } });
    if (fotoCount >= 20) {
      return res.status(400).json({ error: 'Maximale Anzahl Fotos (20) erreicht' });
    }

    const foto = await prisma.foto.create({
      data: {
        auftragId: auftrag.id,
        dateipfad: path.resolve(req.file.path),
      },
    });

    res.status(201).json(foto);
  } catch (err) {
    next(err);
  }
}

export async function analyseFotos(req: Request, res: Response, next: NextFunction) {
  try {
    const auftrag = await prisma.auftrag.findUnique({
      where: { id: req.params.id },
      include: { fotos: true },
    });

    if (!auftrag) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    if (auftrag.fotos.length === 0) return res.status(400).json({ error: 'Keine Fotos hochgeladen' });

    const vorhandeneDateien = auftrag.fotos
      .map(f => f.dateipfad)
      .filter(p => fs.existsSync(p));

    if (vorhandeneDateien.length === 0) {
      return res.status(400).json({ error: 'Fotodateien nicht gefunden' });
    }

    const analyse = await analysiereFotos(vorhandeneDateien, auftrag.beschreibung || '');

    // Analyseergebnis auf allen Fotos speichern + Auftragsname aktualisieren
    await prisma.$transaction([
      ...auftrag.fotos.map(foto =>
        prisma.foto.update({
          where: { id: foto.id },
          data: { analyseErgebnis: analyse as any },
        })
      ),
      prisma.auftrag.update({
        where: { id: auftrag.id },
        data: { name: analyse.auftragsname },
      }),
    ]);

    res.json({ analyse, auftragsname: analyse.auftragsname });
  } catch (err) {
    next(err);
  }
}

export async function deleteFoto(req: Request, res: Response, next: NextFunction) {
  try {
    const foto = await prisma.foto.findUnique({ where: { id: req.params.fotoId } });
    if (!foto) return res.status(404).json({ error: 'Foto nicht gefunden' });

    if (fs.existsSync(foto.dateipfad)) {
      fs.unlinkSync(foto.dateipfad);
    }

    await prisma.foto.delete({ where: { id: foto.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
