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
 * L'unico renderer di un personaggio. Serve il riepilogo finale del wizard e la
 * lobby (e la variante `aside`, oggi non montata): tutti partono da
 * `ResolvedPersonaggio`, quindi la differenza fra "sto scegliendo" e "ho
 * scelto" sta nei selettori, non qui.
 */
export function PersonaggioSheet({
  resolved,
  variant = "full",
  title,
  footer,
  className,
}: PersonaggioSheetProps) {
  const { name, sesso, razza, tribu, via, talenti, speed } = resolved;
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

      <Blocco title="Statistiche">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            Velocità <Stat value={speed} />
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

      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </section>
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
