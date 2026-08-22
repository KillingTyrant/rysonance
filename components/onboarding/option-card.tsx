import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

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
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start gap-1.5 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        selected && "border-primary bg-accent ring-1 ring-primary hover:bg-accent",
        disabled && "cursor-not-allowed opacity-50 hover:bg-card",
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="font-medium leading-tight">{title}</span>
        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
      </span>

      {description && (
        <span className="text-sm text-muted-foreground">{description}</span>
      )}

      {meta}

      {disabled && disabledReason && (
        <span className="text-xs text-muted-foreground">{disabledReason}</span>
      )}
    </button>
  );
}
