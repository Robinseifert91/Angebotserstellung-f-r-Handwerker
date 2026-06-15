'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAngebot, updatePositionen, exportPdfUrl, Angebot, AngebotPosition } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

const EINHEITEN = ['M2', 'M', 'STK', 'STD', 'PAUSCHAL'];
const EINHEIT_LABEL: Record<string, string> = {
  M2: 'm²', M: 'm', STK: 'Stk.', STD: 'Std.', PAUSCHAL: 'pauschal',
};

function euro(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function datum(s: string) {
  const d = new Date(s);
  return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
}

export default function AngebotPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [angebot, setAngebot] = useState<Angebot | null>(null);
  const [positionen, setPositionen] = useState<AngebotPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAngebot(params.id).then(a => {
      setAngebot(a);
      setPositionen(a.positionen);
      setLoading(false);
    }).catch(err => setError(err.message));
  }, []);

  function setPos(i: number, field: keyof AngebotPosition, value: string | number) {
    setPositionen(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  function addPosition() {
    setPositionen(prev => [...prev, { bezeichnung: '', menge: 1, einheit: 'PAUSCHAL', einzelpreisNetto: 0 }]);
  }

  function removePosition(i: number) {
    setPositionen(prev => prev.filter((_, idx) => idx !== i));
  }

  const gesamtNetto = positionen.reduce((s, p) => s + (Number(p.menge) * Number(p.einzelpreisNetto)), 0);
  const mwst = gesamtNetto * 0.19;
  const gesamt = gesamtNetto + mwst;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await updatePositionen(params.id, positionen);
      setAngebot(updated);
      setPositionen(updated.positionen);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-12">Laden…</p>;
  if (!angebot) return <p className="text-red-500 text-center py-12">Angebot nicht gefunden</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/auftraege/${angebot.auftragId}`)}
          className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Angebot {angebot.angebotsnummer}</h1>
          <p className="text-sm text-gray-500">Gültig bis {datum(angebot.gueltigBis)}</p>
        </div>
        <StatusBadge status={angebot.status} />
      </div>

      {/* Positionen */}
      <div className="card space-y-3">
        <h2 className="font-semibold">Positionen</h2>

        <div className="space-y-2">
          {positionen.map((pos, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Bezeichnung"
                  value={pos.bezeichnung}
                  onChange={e => setPos(i, 'bezeichnung', e.target.value)}
                />
                <button onClick={() => removePosition(i)}
                  className="text-red-400 hover:text-red-600 px-2 shrink-0">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Menge</label>
                  <input className="input text-sm" type="number" min="0" step="0.01"
                    value={pos.menge}
                    onChange={e => setPos(i, 'menge', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Einheit</label>
                  <select className="input text-sm" value={pos.einheit}
                    onChange={e => setPos(i, 'einheit', e.target.value)}>
                    {EINHEITEN.map(e => <option key={e} value={e}>{EINHEIT_LABEL[e]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">EP netto (€)</label>
                  <input className="input text-sm" type="number" min="0" step="0.01"
                    value={pos.einzelpreisNetto}
                    onChange={e => setPos(i, 'einzelpreisNetto', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <p className="text-xs text-right text-gray-500">
                GP: <span className="font-semibold text-gray-700">{euro(Number(pos.menge) * Number(pos.einzelpreisNetto))}</span>
              </p>
            </div>
          ))}
        </div>

        <button onClick={addPosition} className="btn-secondary w-full text-sm">
          + Position hinzufügen
        </button>
      </div>

      {/* Summen */}
      <div className="card space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Nettobetrag</span>
          <span className="font-medium">{euro(gesamtNetto)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">MwSt. 19 %</span>
          <span className="font-medium">{euro(mwst)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="font-bold">Gesamtbetrag</span>
          <span className="font-bold text-blue-600 text-lg">{euro(gesamt)}</span>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Aktionen */}
      <div className="space-y-2">
        <button className="btn-secondary w-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Wird gespeichert…' : '💾 Änderungen speichern'}
        </button>
        <a href={exportPdfUrl(params.id)} target="_blank" rel="noreferrer"
          className="btn-primary w-full block text-center">
          📄 PDF herunterladen
        </a>
      </div>

      <div className="card bg-gray-50 text-xs text-gray-500 space-y-1">
        <p>{angebot.zahlungsbedingungen}</p>
        <p>Erstellt am {datum(angebot.datum)} · Nr. {angebot.angebotsnummer}</p>
      </div>
    </div>
  );
}
