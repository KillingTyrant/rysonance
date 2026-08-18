import { STILI } from "@/lib/onboarding/types";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Come combatte il personaggio. Il combattimento è sempre una contrapposizione
 * fra attacco e difesa, ed è da queste due azioni che partono talenti, magie e
 * combo: attacco fisico contro difesa fisica, attacco magico contro difesa
 * magica.
 *
 * Sono due assi indipendenti — si può colpire con l'acciaio e pararsi con la
 * magia — quindi due scelte separate e non una sola coppia.
 */
export function CombattimentoStep({ draft, onChange }: StepProps) {
  return (
    <>
      <StepSection
        title="Attacco"
        description="Fisico quando colpisci con un'arma o un oggetto fisico, magico quando colpisci con una magia o un oggetto magico. Il tiro parte dalla Caratteristica corrispondente, più un dado da 12 e i bonus di arma, talenti e oggetti."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {STILI.map((stile) => (
            <OptionCard
              key={stile.key}
              title={stile.name}
              meta={
                <span className="text-sm text-muted-foreground">
                  {stile.key === "fisico"
                    ? "Colpisci con armi e oggetti fisici."
                    : "Colpisci con magie e oggetti magici."}
                </span>
              }
              selected={draft.attacco === stile.key}
              onSelect={() => onChange({ attacco: stile.key })}
            />
          ))}
        </div>
      </StepSection>

      <StepSection
        title="Difesa"
        description="Non deve per forza corrispondere all'attacco: puoi attaccare in un modo e difenderti nell'altro."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {STILI.map((stile) => (
            <OptionCard
              key={stile.key}
              title={stile.name}
              meta={
                <span className="text-sm text-muted-foreground">
                  {stile.key === "fisico"
                    ? "Ti proteggi da e con armi e oggetti fisici."
                    : "Ti proteggi da e con magie e oggetti magici."}
                </span>
              }
              selected={draft.difesa === stile.key}
              onSelect={() => onChange({ difesa: stile.key })}
            />
          ))}
        </div>
      </StepSection>
    </>
  );
}
