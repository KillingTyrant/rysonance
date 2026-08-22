import type { ReactNode } from "react";
import { Button } from "../ui/button";

type OptionCardProps = {
  title: string;
  description?: string;
  /** Riga extra: stat, talento, gruppi sbloccati… */
  meta?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  /** Perché l'opzione non è selezionabile (mostrato al posto della descrizione). */
  disabledReason?: string;
  onSelect: () => void;
};

/** Card selezionabile: è il mattone di ogni scelta singola del wizard. */
export function OptionCard({
  title,
  description,
  meta,
  selected,
  disabled = false,
  disabledReason,
  onSelect,
}: OptionCardProps) {
  return (
    <Button
      type="button"
      variant={selected ? "ticket" : "ticketSecondary"}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      {title}

      {description && (
        <span className="text-sm text-muted-foreground">{description}</span>
      )}

      {meta}

      {disabled && disabledReason && (
        <span className="text-xs text-muted-foreground">{disabledReason}</span>
      )}
    </Button>
  );
}
