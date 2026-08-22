import { isRazzaGiocabile, tribuByKey } from "@/lib/onboarding/selectors";
import { SESSI } from "@/lib/onboarding/types";

import { OptionCard } from "../option-card";
import { RazzaCard } from "../razza-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Chi è il personaggio: sesso e da dove viene. La razza decide il talento
 * razziale e le tribù disponibili. Il nome invece si sceglie per ultimo, nel
 * riepilogo, a eroe completo.
 */
export function IdentitaStep({ catalog, draft, onChange }: StepProps) {
  const tribu = tribuByKey(catalog, draft.tribu_key);
  const hp = tribu?.base_hp ?? null;
  const mana = tribu?.base_mana ?? null;
  // La velocità mostrata nella card aperta: quella della tribù scelta, la
  // stessa che il riepilogo mostra e che la RPC scrive alla creazione.
  const speed = tribu?.base_speed ?? null;

  return (
    <>
      <StepSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SESSI.map((item) => (
            <OptionCard
              key={item.key}
              title={item.name}
              selected={draft.sesso === item.key}
              onSelect={() => onChange({ sesso: item.key })}
            />
          ))}
        </div>
      </StepSection>

      <StepSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.razze.map((item) => (
            <div
              key={item.key}
              className={draft.razza_key === item.key ? "sm:col-span-2 lg:col-span-3" : undefined}
            >
              <RazzaCard
                razza={item}
                selected={draft.razza_key === item.key}
                tribuKey={draft.tribu_key}
                disabled={!isRazzaGiocabile(item)}
                disabledReason="Non ancora giocabile: mancano le tribù."
                hp={hp}
                mana={mana}
                speed={speed}
                onSelect={() => onChange({ razza_key: item.key })}
                onSelectTribu={(key) => onChange({ tribu_key: key })}
              />
            </div>
          ))}
        </div>
      </StepSection>
    </>
  );
}
