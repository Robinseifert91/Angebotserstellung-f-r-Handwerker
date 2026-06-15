import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

const pdfDir = path.resolve('./generated-pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

const EINHEIT_LABEL: Record<string, string> = {
  M2: 'm²', M: 'm', STK: 'Stk.', STD: 'Std.', PAUSCHAL: 'pauschal',
};

function euro(amount: number): string {
  const parts = amount.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',') + ' €';
}

function datum(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

export async function erstellePdf(angebotId: string): Promise<string> {
  const angebot = await prisma.angebot.findUnique({
    where: { id: angebotId },
    include: {
      positionen: { orderBy: { reihenfolge: 'asc' } },
      auftrag: { include: { betrieb: true } },
    },
  });

  if (!angebot) throw new Error('Angebot nicht gefunden');

  const { auftrag, positionen } = angebot;
  const { betrieb } = auftrag;

  const filename = `angebot-${angebot.angebotsnummer.replace('-', '_')}-${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = 495; // content width (595 - 2×50)
    const L = 50;  // left margin

    // --- Kopfbereich: Firma links, Angebotsdaten rechts ---
    doc.fontSize(18).font('Helvetica-Bold').text(betrieb.firmenname, L, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`${betrieb.strasse}`, L, 75)
      .text(`${betrieb.plz} ${betrieb.stadt}`, L)
      .text(betrieb.telefon ? `Tel.: ${betrieb.telefon}` : '', L)
      .text(betrieb.email ? betrieb.email : '', L)
      .text(`Steuernummer: ${betrieb.steuernummer}`, L);

    doc.fillColor('#000000')
      .fontSize(9)
      .text(`Angebotsnummer: ${angebot.angebotsnummer}`, 350, 75)
      .text(`Datum: ${datum(angebot.datum)}`, 350)
      .text(`Gültig bis: ${datum(angebot.gueltigBis)}`, 350);

    // --- Logo ---
    if (betrieb.logo && fs.existsSync(betrieb.logo)) {
      try {
        doc.image(betrieb.logo, 430, 45, { fit: [100, 60], align: 'right' });
      } catch {
        // Logo-Fehler ignorieren
      }
    }

    // --- Trennlinie ---
    doc.moveTo(L, 155).lineTo(L + W, 155).strokeColor('#cccccc').stroke();

    // --- Empfänger ---
    doc.fillColor('#000000').fontSize(9).font('Helvetica')
      .text('An:', L, 165)
      .font('Helvetica-Bold').text(auftrag.kundenname || 'Auftraggeber', L, 178)
      .font('Helvetica').text(auftrag.objektAdresse || '', L);

    // --- Angebots-Titel ---
    const titleY = 230;
    doc.fontSize(16).font('Helvetica-Bold').text('ANGEBOT', L, titleY);
    if (auftrag.name) {
      doc.fontSize(11).font('Helvetica').fillColor('#333333')
        .text(auftrag.name, L, titleY + 25);
    }

    // --- Tabelle ---
    let y = titleY + (auftrag.name ? 60 : 40);

    // Tabellenheader
    const COL = { nr: L, bez: L + 25, menge: L + 260, einheit: L + 315, ep: L + 365, gp: L + 430 };

    doc.fillColor('#1a1a1a').fontSize(8).font('Helvetica-Bold')
      .text('Nr.', COL.nr, y)
      .text('Bezeichnung', COL.bez, y)
      .text('Menge', COL.menge, y, { width: 50, align: 'right' })
      .text('Einheit', COL.einheit, y, { width: 45, align: 'center' })
      .text('EP netto', COL.ep, y, { width: 60, align: 'right' })
      .text('GP netto', COL.gp, y, { width: 65, align: 'right' });

    y += 14;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor('#1a1a1a').lineWidth(0.5).stroke();
    y += 6;

    // Positionen
    positionen.forEach((pos, i) => {
      const gp = pos.menge * pos.einzelpreisNetto;
      const einheitLabel = EINHEIT_LABEL[pos.einheit] || pos.einheit;

      // Zeilenhöhe dynamisch ermitteln, damit mehrzeilige Bezeichnungen nicht überlappen
      doc.font('Helvetica').fontSize(8);
      const bezHeight = doc.heightOfString(pos.bezeichnung, { width: 230 });
      const rowHeight = Math.max(bezHeight + 8, 20);

      if (y + rowHeight > 720) {
        doc.addPage();
        y = 50;
      }

      doc.fillColor('#000000')
        .text(`${i + 1}.`, COL.nr, y)
        .text(pos.bezeichnung, COL.bez, y, { width: 230 })
        .text(pos.menge.toFixed(2).replace('.', ','), COL.menge, y, { width: 50, align: 'right' })
        .text(einheitLabel, COL.einheit, y, { width: 45, align: 'center' })
        .text(euro(pos.einzelpreisNetto), COL.ep, y, { width: 60, align: 'right' })
        .text(euro(gp), COL.gp, y, { width: 65, align: 'right' });

      y += rowHeight;
      doc.moveTo(L, y - 4).lineTo(L + W, y - 4).strokeColor('#eeeeee').lineWidth(0.3).stroke();
    });

    // --- Summenblock ---
    y += 10;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 12;

    const sumX = COL.gp - 80;
    const valX = COL.gp;

    doc.fontSize(9).font('Helvetica')
      .text('Nettobetrag:', sumX, y, { width: 75, align: 'right' })
      .text(euro(angebot.gesamtNetto), valX, y, { width: 65, align: 'right' });
    y += 14;

    doc.text('MwSt. 19 %:', sumX, y, { width: 75, align: 'right' })
      .text(euro(angebot.mwstBetrag), valX, y, { width: 65, align: 'right' });
    y += 8;

    doc.moveTo(sumX, y).lineTo(L + W, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 8;

    doc.fontSize(10).font('Helvetica-Bold')
      .text('Gesamtbetrag:', sumX, y, { width: 75, align: 'right' })
      .text(euro(angebot.gesamtBrutto), valX, y, { width: 65, align: 'right' });

    // --- Zahlungsbedingungen ---
    y += 30;
    doc.fontSize(8).font('Helvetica').fillColor('#555555')
      .text(`Zahlungsbedingungen: ${angebot.zahlungsbedingungen}`, L, y, { width: W });

    y += 30;
    doc.fillColor('#000000').text(`Mit freundlichen Grüßen`, L, y)
      .font('Helvetica-Bold').text(betrieb.firmenname, L, y + 14);

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
