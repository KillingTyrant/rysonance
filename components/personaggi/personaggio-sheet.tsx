import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResolvedPersonaggio } from "@/lib/onboarding/selectors";

export type SheetVariant =
  /** Colonna laterale del wizard: si aggiorna a ogni scelta. */
  | "aside"
  /** Riepilogo finale del wizard. */
  | "full"
  /** Scheda di un personaggio salvato, nella lobby. */
  | "card";

type PersonaggioSheetProps = {
  resolved: ResolvedPersonaggio;
  variant?: SheetVariant;
  title?: string;
  /** Riga in fondo alla scheda (es. la data di creazione). */
  footer?: ReactNode;
  className?: string;
};

/**
 * L'unico renderer di un personaggio. Serve la colonna del wizard, il riepilogo
 * finale e la lobby: tutti e tre partono da `ResolvedPersonaggio`, quindi la
 * differenza fra "sto scegliendo" e "ho scelto" sta nei selettori, non qui.
 */
export function PersonaggioSheet({
  resolved,
  variant = "full",
  title,
  footer,
  className,
}: PersonaggioSheetProps) {
  const {
    name,
    sesso,
    razza,
    tribu,
    via,
    caratteristiche,
    attacco,
    difesa,
    talenti,
    stats,
    tendenze,
  } = resolved;
  const compact = variant === "aside";
  const origini = [razza?.name, tribu?.name, sesso].filter(Boolean).join(" · ");

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border bg-card text-card-foreground shadow",
        compact ? "gap-4 p-5" : "gap-5 p-6",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        {title && (
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        )}
        <p className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
          {name.trim() || <span className="text-muted-foreground">Senza nome</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          {origini || "Origini non ancora scelte"}
        </p>
      </header>

      <Blocco title="Via">
        <p className={cn("text-sm", !via && "text-muted-foreground")}>
          {via?.name ?? "Non ancora scelta"}
        </p>
      </Blocco>

      <Blocco title="Caratteristiche">
        <ul className="flex flex-col gap-1 text-sm">
          {caratteristiche.map(({ caratteristica, value, bonus }) => (
            <li key={caratteristica.key} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {caratteristica.name}
                {/* Il +1 della razza è già dentro `value`: qui si dice solo
                    dove è finito, altrimenti sparirebbe dalla scheda. */}
                {bonus && <span className="ml-1 text-xs">(+1 razza)</span>}
              </span>
              <span className="font-medium tabular-nums">{value}</span>
            </li>
          ))}
        </ul>
      </Blocco>

      <Blocco title="Statistiche">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            PF <Stat value={stats.hp} />
          </span>
          <span>
            Mana <Stat value={stats.mana} />
          </span>
          <span>
            Velocità <Stat value={stats.speed} />
          </span>
        </div>
      </Blocco>

      <Blocco title="Combattimento">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            Attacco{" "}
            <span className={cn("font-medium", attacco ? "text-foreground" : undefined)}>
              {attacco ?? "—"}
            </span>
          </span>
          <span>
            Difesa{" "}
            <span className={cn("font-medium", difesa ? "text-foreground" : undefined)}>
              {difesa ?? "—"}
            </span>
          </span>
        </div>
      </Blocco>

      <Blocco title="Talenti">
        {talenti.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Arrivano da razza, tribù e Via, più quelli a scelta.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {/* I due scelti dall'utente si distinguono da quelli che arrivano
                dalle altre scelte: il bordo al posto del pieno. */}
            {talenti.map((talento) => (
              <Badge
                key={talento.key}
                variant={talento.kind === "scelta" ? "outline" : "secondary"}
              >
                {talento.name}
              </Badge>
            ))}
          </div>
        )}
      </Blocco>

      <Blocco title="Tendenze">
        <ul className="flex flex-col gap-2.5">
          {tendenze.map(({ tendenza, value }) => (
            <li key={tendenza.key} className="flex flex-col gap-1">
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{tendenza.min_label}</span>
                <span>{tendenza.max_label}</span>
              </div>
              <Asse tendenza={tendenza} value={value} />
            </li>
          ))}
        </ul>
      </Blocco>

      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </section>
  );
}

/**
 * La posizione del valore sull'asse. Una tendenza con min = max è fissa: la
 * si mostra al centro, perché non c'è nessuna scelta da rappresentare.
 */
function Asse({
  tendenza,
  value,
}: {
  tendenza: { min_value: number; max_value: number };
  value: number;
}) {
  const span = tendenza.max_value - tendenza.min_value;
  const percent =
    span === 0 ? 50 : ((value - tendenza.min_value) / span) * 100;

  return (
    <div className="relative h-1.5 w-full rounded-full bg-secondary">
      <div
        className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        style={{ left: `${percent}%` }}
        aria-hidden
      />
      <span className="sr-only">{value}</span>
    </div>
  );
}

function Blocco({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ value }: { value: number | null | undefined }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value === null ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value ?? "—"}
    </span>
  );
}
