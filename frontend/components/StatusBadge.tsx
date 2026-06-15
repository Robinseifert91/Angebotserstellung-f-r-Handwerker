const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ENTWURF:           { label: 'Entwurf',          className: 'bg-gray-100 text-gray-600' },
  ANGEBOT_ERSTELLT:  { label: 'Angebot erstellt',  className: 'bg-blue-100 text-blue-700' },
  GESENDET:          { label: 'Gesendet',           className: 'bg-yellow-100 text-yellow-700' },
  ABGESCHLOSSEN:     { label: 'Abgeschlossen',      className: 'bg-green-100 text-green-700' },
  FERTIG:            { label: 'Fertig',             className: 'bg-blue-100 text-blue-700' },
  EXPORTIERT:        { label: 'Exportiert',         className: 'bg-green-100 text-green-700' },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  );
}
