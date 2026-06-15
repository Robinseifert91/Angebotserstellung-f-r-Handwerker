'use client';

// Spracheingabe (Phase 3): Mikrofon-Button hier hinzufügen.
// Web Speech API füllt dann dieses Textfeld — kein Backend-Touch nötig.

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function BeschreibungInput({ value, onChange, disabled }: Props) {
  return (
    <div>
      <label className="label">
        Beschreibung <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <textarea
        className="input resize-none"
        rows={3}
        maxLength={2000}
        placeholder="Was soll gemacht werden? Z.B. Badezimmer komplett neu fliesen, ca. 8 m²"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{value.length}/2000</p>
    </div>
  );
}
