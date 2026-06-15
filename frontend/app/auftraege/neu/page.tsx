'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAuftrag } from '@/lib/api';
import BeschreibungInput from '@/components/BeschreibungInput';

export default function NeuerAuftragPage() {
  const router = useRouter();
  const [kundenname, setKundenname] = useState('');
  const [objektAdresse, setObjektAdresse] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const auftrag = await createAuftrag({ kundenname, objektAdresse, beschreibung });
      router.push(`/auftraege/${auftrag.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold">Neuer Auftrag</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Kundenname</label>
            <input className="input" value={kundenname} onChange={e => setKundenname(e.target.value)}
              placeholder="z.B. Familie Müller" />
          </div>
          <div>
            <label className="label">Objektadresse</label>
            <input className="input" value={objektAdresse} onChange={e => setObjektAdresse(e.target.value)}
              placeholder="z.B. Hauptstr. 10, 80331 München" />
          </div>
          <BeschreibungInput value={beschreibung} onChange={setBeschreibung} />
        </div>

        <p className="text-sm text-gray-500 text-center">
          Im nächsten Schritt lädst du Fotos hoch und die KI erstellt das Angebot.
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Wird angelegt…' : 'Weiter → Fotos hochladen'}
        </button>
      </form>
    </div>
  );
}
