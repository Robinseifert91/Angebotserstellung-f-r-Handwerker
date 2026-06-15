'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuftraege, AuftragListItem } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

function euro(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function AuftraegePage() {
  const router = useRouter();
  const [auftraege, setAuftraege] = useState<AuftragListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuftraege().then(data => {
      setAuftraege(data);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 text-center py-12">Laden…</p>;
  if (error) return <p className="text-red-500 text-center py-12">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aufträge</h1>
        <button className="btn-primary" onClick={() => router.push('/auftraege/neu')}>
          + Neuer Auftrag
        </button>
      </div>

      {auftraege.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 mb-4">Noch keine Aufträge vorhanden</p>
          <button className="btn-primary" onClick={() => router.push('/auftraege/neu')}>
            Ersten Auftrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {auftraege.map(a => (
            <button key={a.id} onClick={() => router.push(`/auftraege/${a.id}`)}
              className="card w-full text-left hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{a.name}</p>
                  {a.kundenname && <p className="text-sm text-gray-500">{a.kundenname}</p>}
                  {a.objektAdresse && <p className="text-sm text-gray-400 truncate">{a.objektAdresse}</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={a.status} />
                  {a.angebot && (
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      {euro(a.angebot.gesamtBrutto)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {a.fotos.length} Foto{a.fotos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
