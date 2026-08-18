import { talentiDaScegliere, talentoIniziale } from "@/lib/onboarding/selectors";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * La Via: il percorso di crescita. Ogni via ha una sottovia per livello; quella
 * di livello 0 porta il talento con cui il personaggio comincia — ed è anche ciò
 * che decide quanti talenti si potranno scegliere più avanti, perciò questo step
 * precede quello dei talenti.
 */
export function ViaStep({ catalog, draft, onChange }: StepProps) {
  return (
    <StepSection
      title="La Via"
      description="Il percorso che il personaggio seguirà crescendo di livello."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.vie.map((via) => {
          const iniziale = talentoIniziale(via);
          const livelli = via.sottovie.filter((sottovia) => sottovia.level > 0).length;

          return (
            <OptionCard
              key={via.key}
              title={via.name}
              description={via.description || undefined}
              meta={
                <span className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {iniziale && (
                    <span>
                      Talento iniziale:{" "}
                      <span className="text-foreground">{iniziale.name}</span>
                    </span>
                  )}
                  <span>
                    <span className="text-foreground">{talentiDaScegliere(via)}</span>{" "}
                    talenti a scelta
                  </span>
                  {livelli > 0 && (
                    <span>
                      {livelli === 1
                        ? "1 livello successivo già definito"
                        : `${livelli} livelli successivi già definiti`}
                    </span>
                  )}
                </span>
              }
              selected={draft.via_key === via.key}
              onSelect={() => onChange({ via_key: via.key })}
            />
          );
        })}
      </div>
    </StepSection>
  );
}
