'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuftrag, uploadFoto, deleteFoto, analysiereFotos,
  generateAngebot, updateAuftrag, deleteAuftrag, Auftrag, Foto,
} from '@/lib/api';
import BeschreibungInput from '@/components/BeschreibungInput';
import StatusBadge from '@/components/StatusBadge';

export default function AuftragDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [auftrag, setAuftrag] = useState<Auftrag | null>(null);
  const [beschreibung, setBeschreibung] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const a = await getAuftrag(params.id);
    setAuftrag(a);
    setBeschreibung(a.beschreibung || '');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        await uploadFoto(params.id, file);
      }
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleFotoDelete(fotoId: string) {
    try {
      await deleteFoto(fotoId);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAnalyse() {
    setAnalysing(true);
    setError('');
    try {
      await updateAuftrag(params.id, { beschreibung });
      const result = await analysiereFotos(params.id);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalysing(false);
    }
  }

  async function handleGenerateAngebot() {
    setGenerating(true);
    setError('');
    try {
      const angebot = await generateAngebot(params.id);
      router.push(`/angebote/${angebot.id}`);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Auftrag wirklich löschen?')) return;
    try {
      await deleteAuftrag(params.id);
      router.push('/auftraege');
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-12">Laden…</p>;
  if (!auftrag) return <p className="text-red-500 text-center py-12">Auftrag nicht gefunden</p>;

  const analysiert = auftrag.fotos.some(f => f.analyseErgebnis);
  const ersteAnalyse = auftrag.fotos.find(f => f.analyseErgebnis)?.analyseErgebnis as any;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/auftraege')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{auftrag.name}</h1>
          {auftrag.kundenname && <p className="text-sm text-gray-500">{auftrag.kundenname}</p>}
        </div>
        <StatusBadge status={auftrag.status} />
      </div>

      {/* Fotos */}
      <div className="card space-y-3">
        <h2 className="font-semibold">Fotos der Baustelle</h2>

        {auftrag.fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {auftrag.fotos.map(foto => (
              <div key={foto.id} className="relative group aspect-square">
                <img
                  src={`http://localhost:4000/uploads/${foto.dateipfad.split(/[/\\]/).pop()}`}
                  alt="Baustelle"
                  className="w-full h-full object-cover rounded-xl"
                />
                {foto.analyseErgebnis && (
                  <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">✓</div>
                )}
                <button
                  onClick={() => handleFotoDelete(foto.id)}
                  className="absolute bottom-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <label className={`btn-secondary w-full text-center cursor-pointer block ${uploading ? 'opacity-50' : ''}`}>
          {uploading ? 'Wird hochgeladen…' : '📷 Fotos auswählen'}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} disabled={uploading} />
        </label>
      </div>

      {/* Beschreibung */}
      <div className="card">
        <BeschreibungInput value={beschreibung} onChange={setBeschreibung} disabled={analysing} />
      </div>

      {/* Analyse-Ergebnis */}
      {analysiert && ersteAnalyse && (
        <div className="card bg-blue-50 border-blue-200 space-y-3">
          <h2 className="font-semibold text-blue-800">KI-Analyse ✓</h2>
          <div className="flex gap-4 text-sm">
            <span><span className="font-medium">Gewerk:</span> {ersteAnalyse.gewerk}</span>
            {ersteAnalyse.raum && <span className="text-gray-600">{ersteAnalyse.raum}</span>}
          </div>

          {/* Flächen */}
          {ersteAnalyse.flaechen && (
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Ermittelte Flächen</p>
              <div className="grid grid-cols-3 gap-2">
                {ersteAnalyse.flaechen.boden_m2 != null && (
                  <div className="bg-white rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Boden</p>
                    <p className="font-bold text-blue-700">{ersteAnalyse.flaechen.boden_m2} m²</p>
                  </div>
                )}
                {ersteAnalyse.flaechen.waende_m2 != null && (
                  <div className="bg-white rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Wände</p>
                    <p className="font-bold text-blue-700">{ersteAnalyse.flaechen.waende_m2} m²</p>
                  </div>
                )}
                {ersteAnalyse.flaechen.decke_m2 != null && (
                  <div className="bg-white rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Decke</p>
                    <p className="font-bold text-blue-700">{ersteAnalyse.flaechen.decke_m2} m²</p>
                  </div>
                )}
              </div>
              {ersteAnalyse.flaechen.anmerkung && (
                <p className="text-xs text-gray-500 mt-1">Hinweis: {ersteAnalyse.flaechen.anmerkung}</p>
              )}
            </div>
          )}

          {ersteAnalyse.auffaelligkeiten?.length > 0 && (
            <div>
              <p className="text-sm font-medium">Auffälligkeiten:</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {ersteAnalyse.auffaelligkeiten.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm card">{error}</p>}

      {/* Aktions-Buttons */}
      <div className="space-y-2">
        {!analysiert && auftrag.fotos.length > 0 && (
          <button className="btn-primary w-full" onClick={handleAnalyse} disabled={analysing}>
            {analysing ? '🔍 KI analysiert Fotos…' : '🔍 Fotos analysieren'}
          </button>
        )}

        {analysiert && !auftrag.angebot && (
          <button className="btn-primary w-full" onClick={handleGenerateAngebot} disabled={generating}>
            {generating ? '⚙️ Angebot wird generiert…' : '⚙️ Angebot automatisch erstellen'}
          </button>
        )}

        {auftrag.angebot && (
          <button className="btn-primary w-full" onClick={() => router.push(`/angebote/${auftrag.angebot!.id}`)}>
            📄 Zum Angebot →
          </button>
        )}

        <button className="btn-danger w-full" onClick={handleDelete}>
          Auftrag löschen
        </button>
      </div>
    </div>
  );
}
