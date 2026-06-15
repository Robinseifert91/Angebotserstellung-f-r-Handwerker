const BASE = 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Serverfehler');
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// Betrieb
export const getBetrieb = () => request<Betrieb>('/betrieb').catch(() => null);
export const updateBetrieb = (data: Partial<Betrieb>) =>
  request<Betrieb>('/betrieb', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const uploadLogo = (file: File) => {
  const fd = new FormData();
  fd.append('logo', file);
  return request<Betrieb>('/betrieb/logo', { method: 'POST', body: fd });
};

// Auftraege
export const getAuftraege = () => request<AuftragListItem[]>('/auftraege');
export const createAuftrag = (data: { kundenname?: string; objektAdresse?: string; beschreibung?: string }) =>
  request<Auftrag>('/auftraege', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const getAuftrag = (id: string) => request<Auftrag>(`/auftraege/${id}`);
export const updateAuftrag = (id: string, data: Partial<Auftrag>) =>
  request<Auftrag>(`/auftraege/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteAuftrag = (id: string) =>
  request<void>(`/auftraege/${id}`, { method: 'DELETE' });

// Fotos
export const uploadFoto = (auftragId: string, file: File) => {
  const fd = new FormData();
  fd.append('foto', file);
  return request<Foto>(`/auftraege/${auftragId}/fotos`, { method: 'POST', body: fd });
};
export const analysiereFotos = (auftragId: string) =>
  request<{ analyse: FotoAnalyse; auftragsname: string }>(`/auftraege/${auftragId}/fotos/analyse`, { method: 'POST' });
export const deleteFoto = (fotoId: string) =>
  request<void>(`/auftraege/fotos/${fotoId}`, { method: 'DELETE' });

// Angebote
export const generateAngebot = (auftragId: string) =>
  request<Angebot>(`/auftraege/${auftragId}/angebot`, { method: 'POST' });
export const getAngebot = (id: string) => request<Angebot>(`/angebote/${id}`);
export const updateAngebot = (id: string, data: Partial<Angebot>) =>
  request<Angebot>(`/angebote/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const updatePositionen = (id: string, positionen: AngebotPosition[]) =>
  request<Angebot>(`/angebote/${id}/positionen`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positionen }) });
export const exportPdfUrl = (id: string) => `${BASE}/angebote/${id}/export`;

// Typen
export interface Betrieb {
  id: string; firmenname: string; inhaber: string; strasse: string;
  plz: string; stadt: string; steuernummer: string; telefon?: string;
  email?: string; logo?: string; stundensatz: number; gewerk: string;
}
export interface AuftragListItem {
  id: string; name: string; kundenname?: string; objektAdresse?: string;
  status: string; createdAt: string; updatedAt: string;
  fotos: { id: string }[];
  angebot?: { id: string; angebotsnummer: string; gesamtBrutto: number; status: string } | null;
}
export interface Foto {
  id: string; auftragId: string; dateipfad: string; analyseErgebnis?: FotoAnalyse | null;
}
export interface FotoAnalyse {
  gewerk: string;
  raum: string;
  flaechen: {
    boden_m2: number | null;
    waende_m2: number | null;
    decke_m2: number | null;
    sonstige_m2: number | null;
    anmerkung: string;
  };
  auffaelligkeiten: string[];
  empfohlenePositionen: string[];
  unsicherheiten: string[];
  auftragsname: string;
}
export interface AngebotPosition {
  id?: string; reihenfolge?: number; bezeichnung: string;
  menge: number; einheit: string; einzelpreisNetto: number; gesamtpreisNetto?: number;
}
export interface Angebot {
  id: string; auftragId: string; angebotsnummer: string; datum: string;
  gueltigBis: string; gesamtNetto: number; mwstBetrag: number; gesamtBrutto: number;
  zahlungsbedingungen: string; status: string; pdfPfad?: string;
  positionen: AngebotPosition[];
  auftrag?: Auftrag;
}
export interface Auftrag {
  id: string; betriebId: string; name: string; kundenname?: string;
  objektAdresse?: string; beschreibung?: string; status: string;
  createdAt: string; updatedAt: string;
  fotos: Foto[];
  angebot?: Angebot | null;
}
