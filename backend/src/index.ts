import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import betriebRoutes from './routes/betrieb.routes';
import auftragRoutes from './routes/auftrag.routes';
import fotoRoutes from './routes/foto.routes';
import angebotRoutes from './routes/angebot.routes';
import { errorMiddleware } from './middleware/error.middleware';

// Verzeichnisse beim Start anlegen
const dirs = ['./uploads', './generated-pdfs'];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

// Hochgeladene Bilder statisch ausliefern (für Frontend-Vorschau)
app.use('/uploads', express.static(path.resolve('./uploads'), { dotfiles: 'deny', index: false }));

app.use('/api/betrieb', betriebRoutes);
app.use('/api/auftraege', auftragRoutes);
app.use('/api/auftraege', fotoRoutes);
app.use('/api/angebote', angebotRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});

export default app;
