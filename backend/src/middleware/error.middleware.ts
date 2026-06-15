import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack || err.message);

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Datei zu groß. Maximum: 10 MB' : err.message;
    return res.status(400).json({ error: msg });
  }

  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({ error: err.message || 'Interner Serverfehler' });
}
