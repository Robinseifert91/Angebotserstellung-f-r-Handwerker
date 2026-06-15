'use client';

import { useEffect, useState } from 'react';
import { getBetrieb, updateBetrieb, uploadLogo, Betrieb } from '@/lib/api';

const GEWERKE = [
  { value: 'MALER', label: 'Maler' },
  { value: 'FLIESENLEGER', label: 'Fliesenleger' },
  { value: 'ELEKTRIKER', label: 'Elektriker' },
  { value: 'SHK', label: 'Sanitär / Heizung / Klima' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

const EMPTY: Partial<Betrieb> = {
  firmenname: '', inhaber: '', strasse: '', plz: '', stadt: '',
  steuernummer: '', telefon: '', email: '', stundensatz: 65, gewerk: 'SONSTIGES',
};

export default function EinrichtenPage() {
  const [form, setForm] = useState<Partial<Betrieb>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBetrieb().then(b => {
      if (b) setForm(b);
      setLoading(false);
    });
  }, []);

  const set = (field: keyof Betrieb) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateBetrieb(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b = await uploadLogo(file);
      setForm(f => ({ ...f, logo: b.logo }));
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-12">Laden…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Firmendaten</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Firma</h2>

          <div>
            <label className="label">Firmenname *</label>
            <input className="input" value={form.firmenname || ''} onChange={set('firmenname')} required />
          </div>
          <div>
            <label className="label">Inhaber</label>
            <input className="input" value={form.inhaber || ''} onChange={set('inhaber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Straße</label>
              <input className="input" value={form.strasse || ''} onChange={set('strasse')} />
            </div>
            <div>
              <label className="label">PLZ</label>
              <input className="input" value={form.plz || ''} onChange={set('plz')} maxLength={5} />
            </div>
            <div>
              <label className="label">Stadt</label>
              <input className="input" value={form.stadt || ''} onChange={set('stadt')} />
            </div>
          </div>
          <div>
            <label className="label">Steuernummer *</label>
            <input className="input" value={form.steuernummer || ''} onChange={set('steuernummer')} required placeholder="123/456/78901" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Kontakt</h2>
          <div>
            <label className="label">Telefon</label>
            <input className="input" type="tel" value={form.telefon || ''} onChange={set('telefon')} />
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input className="input" type="email" value={form.email || ''} onChange={set('email')} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Kalkulation</h2>
          <div>
            <label className="label">Gewerk</label>
            <select className="input" value={form.gewerk || 'SONSTIGES'} onChange={set('gewerk')}>
              {GEWERKE.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stundensatz (€/Std.)</label>
            <input className="input" type="number" min="20" max="500" value={form.stundensatz || 65}
              onChange={e => setForm(f => ({ ...f, stundensatz: parseFloat(e.target.value) }))} />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700">Logo</h2>
          {form.logo && (
            <img src={`http://localhost:4000/uploads/${form.logo.split(/[/\\]/).pop()}`}
              alt="Logo" className="h-16 object-contain" />
          )}
          <label className="btn-secondary inline-block cursor-pointer text-center w-full">
            Logo hochladen
            <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </label>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Wird gespeichert…' : saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </form>
    </div>
  );
}
