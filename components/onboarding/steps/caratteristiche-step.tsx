import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  puntiResidui,
  razzaByKey,
  statsDa,
  valoriCaratteristiche,
} from "@/lib/onboarding/selectors";
import { CARATTERISTICA_MAX, PUNTI_CARATTERISTICHE } from "@/lib/onboarding/validate";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Le Caratteristiche Base: 4 punti da distribuire più l'1 che regala la razza,
 * con il tetto di 3 per Caratteristica alla creazione.
 *
 * Il draft tiene solo i punti DISTRIBUITI: il +1 non ci viene sommato dentro,
 * si vede sommato a schermo. È la stessa forma che riceve `crea_personaggio`,
 * quindi il valore finale è calcolato in un posto solo (`valoriCaratteristiche`)
 * e non può divergere fra UI e database.
 */
export function CaratteristicheStep({ catalog, draft, onChange }: StepProps) {
  const razza = razzaByKey(catalog, draft.razza_key);
  const valori = valoriCaratteristiche(catalog, draft);
  const residui = puntiResidui(draft, PUNTI_CARATTERISTICHE);
  const stats = statsDa(valori, null);

  function setPunti(key: string, punti: number) {
    onChange({ caratteristiche: { ...draft.caratteristiche, [key]: punti } });
  }

  return (
    <>
      <StepSection
        title="Bonus di razza"
        description="La tua razza aggiunge +1 a una di queste Caratteristiche."
        hint={razza ? undefined : "Scegli prima una razza, nello step Origini."}
      >
        {razza ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {razza.caratteristiche.map((caratteristica) => (
              <OptionCard
                key={caratteristica.key}
                title={caratteristica.name}
                selected={draft.bonus_caratteristica_key === caratteristica.key}
                onSelect={() =>
                  onChange({ bonus_caratteristica_key: caratteristica.key })
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Le Caratteristiche su cui puoi mettere il +1 dipendono dalla razza.
          </p>
        )}
      </StepSection>

      <StepSection
        title="Caratteristiche Base"
        description={`Distribuisci ${PUNTI_CARATTERISTICHE} punti. Alla creazione nessuna Caratteristica può superare ${CARATTERISTICA_MAX}, bonus di razza incluso.`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-secondary/30 p-3">
            <p className="text-sm" role="status" aria-live="polite">
              {residui > 0 ? (
                <>
                  <span className="font-medium tabular-nums">{residui}</span> punt
                  {residui === 1 ? "o" : "i"} da distribuire
                </>
              ) : residui === 0 ? (
                "Tutti i punti sono distribuiti."
              ) : (
                <span className="text-destructive">
                  {-residui} punt{residui === -1 ? "o" : "i"} di troppo
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              PF <span className="font-medium tabular-nums text-foreground">{stats.hp}</span>
              {" · "}
              Mana{" "}
              <span className="font-medium tabular-nums text-foreground">{stats.mana}</span>
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {valori.map(({ caratteristica, punti, bonus, value }) => (
              <li
                key={caratteristica.key}
                className="flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{caratteristica.name}</span>
                    {bonus && (
                      <span className="text-xs text-muted-foreground">
                        +1 dalla razza
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={punti <= 0}
                      aria-label={`Togli un punto da ${caratteristica.name}`}
                      onClick={() => setPunti(caratteristica.key, punti - 1)}
                    >
                      <Minus />
                    </Button>
                    <span
                      className={cn(
                        "w-8 text-center text-lg font-semibold tabular-nums",
                        value > CARATTERISTICA_MAX && "text-destructive",
                      )}
                      aria-label={`${caratteristica.name}: ${value}`}
                    >
                      {value}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={residui <= 0 || value >= CARATTERISTICA_MAX}
                      aria-label={`Aggiungi un punto a ${caratteristica.name}`}
                      onClick={() => setPunti(caratteristica.key, punti + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {caratteristica.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </StepSection>
    </>
  );
}
