import type { Tendenza } from "@/lib/onboarding/types";

type TendenzaSliderProps = {
  tendenza: Tendenza;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/**
 * Un asse fra due poli. È l'unico controllo delle tendenze: combattimento,
 * allineamento, moralità e carattere hanno tutti questa forma, quindi non
 * esistono varianti per tipo.
 *
 * Le etichette arrivano tutte dal catalogo: qui non c'è nessun testo di gioco.
 */
export function TendenzaSlider({
  tendenza,
  value,
  disabled = false,
  onChange,
}: TendenzaSliderProps) {
  // min = max: il valore è deciso dal catalogo e non c'è niente da scegliere.
  const fissa = tendenza.min_value === tendenza.max_value;
  const bloccato = disabled || fissa;
  const id = `tendenza-${tendenza.key}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={id} className="font-medium">
          {tendenza.name}
        </label>
        <span className="text-sm tabular-nums text-muted-foreground">{value}</span>
      </div>

      {tendenza.description && (
        <p className="text-sm text-muted-foreground">{tendenza.description}</p>
      )}

      <input
        id={id}
        type="range"
        min={tendenza.min_value}
        max={tendenza.max_value}
        step={1}
        value={value}
        disabled={bloccato}
        aria-disabled={bloccato}
        aria-valuetext={`${value} fra ${tendenza.min_label} e ${tendenza.max_label}`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex justify-between gap-3 text-sm text-muted-foreground">
        <span>{tendenza.min_label}</span>
        <span>{tendenza.max_label}</span>
      </div>

      {fissa && (
        <p className="text-xs text-muted-foreground">
          Questa tendenza è fissa e non si può modificare.
        </p>
      )}
    </div>
  );
}
