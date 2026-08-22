import type { ComponentType, ReactNode } from "react";
import { Footprints, Heart, Sparkles } from "lucide-react";

import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Razza } from "@/lib/onboarding/types";

type RazzaCardProps = {
  razza: Razza;
  selected: boolean;
  /** La tribù scelta. Se non è di questa razza, nessuna appare selezionata. */
  tribuKey: string | null;
  disabled?: boolean;
  /** Perché la razza non è selezionabile (mostrato sulla copertina). */
  disabledReason?: string;
  /** La velocità della tribù scelta, se è di questa razza. */
  hp?: number | null;
  mana?: number | null;
  speed?: number | null;
  /** L'illustrazione della razza, a tutta card (vedi docs/immagini_catalogo.md). */
  media?: ReactNode;
  onSelect: () => void;
  onSelectTribu: (key: string) => void;
};

/**
 * La card di scelta della razza, nei suoi due stati: chiusa mostra solo
 * copertina e nome, aperta contiene la scelta della sottorazza — la tribù — e
 * la velocità che ne deriva.
 *
 * Aperto e chiuso non sono un prop: la card è aperta quando è la razza scelta.
 * È l'unico modo per cui la tribù, che appartiene alla razza, non possa essere
 * scelta prima di lei né sopravviverle.
 */
export function RazzaCard({
  razza,
  selected,
  tribuKey,
  disabled = false,
  disabledReason,
  hp,
  mana,
  speed,
  media,
  onSelect,
  onSelectTribu,
}: RazzaCardProps) {
  return (
    <div
      className={cn(
        cardVariants({ size: selected ? "expanded" : "compact" }),
        "flex flex-col overflow-hidden",
        selected && "border-primary ring-1 ring-primary",
        disabled && "opacity-50",
      )}
    >
      {/*
        Il bottone è lo stesso elemento aperta e chiusa — cambia solo cosa gli
        sta sotto — così React lo riconcilia invece di rimontarlo e il focus da
        tastiera non si perde nell'istante in cui la card si apre. È anche il
        motivo per cui i bottoni delle tribù gli stanno accanto e non dentro:
        un bottone dentro un bottone non è HTML valido.
      */}
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden bg-muted text-left",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          disabled && "cursor-not-allowed",
        )}
      >
        {media}

        {/*
          Il velo parte da `background` e non da nero: il nome è `foreground`,
          quindi il contrasto regge in entrambi i temi qualunque sia
          l'illustrazione sotto.
        */}
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent"
        />

        <span className="relative flex h-full w-full flex-col p-4">
          <span
            className={cn(
              "flex flex-1",
              selected ? "flex-none justify-center" : "items-center justify-end",
            )}
          >
            {/* Nel design il nome è in un serif display, che il progetto non ha
                ancora: finché non arriva resta il font dell'app, maiuscolo. */}
            <span
              className={cn(
                "font-medium uppercase leading-none tracking-tight",
                selected ? "text-5xl" : "text-4xl",
              )}
            >
              {razza.name}
            </span>
          </span>

          {disabled && disabledReason && (
            <span className="text-xs text-muted-foreground">{disabledReason}</span>
          )}
        </span>
      </button>

      {selected && (
        <div className="flex shrink-0 flex-col gap-3 border-t bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {razza.tribu.map((tribu) => (
              <button
                key={tribu.key}
                type="button"
                aria-pressed={tribu.key === tribuKey}
                onClick={() => onSelectTribu(tribu.key)}
                className={cn(
                  "rounded-sm text-lg underline-offset-4 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  tribu.key === tribuKey
                    ? "font-semibold underline decoration-2"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tribu.name}
              </button>
            ))}
          </div>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Statistica icon={Heart} label="Vita" value={hp} />
            <Statistica icon={Sparkles} label="Mana" value={mana} />
            <Statistica icon={Footprints} label="Movimento" value={speed} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Statistica({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | null | undefined;
}) {
  return (
    // Dentro una `dl` il gruppo dt+dd va avvolto in un `div`, e l'icona sta
    // nella `dt`: è parte dell'etichetta, non un terzo figlio del gruppo.
    <div className="flex items-center gap-1.5">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          value === null || value === undefined ? "text-muted-foreground" : undefined,
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
