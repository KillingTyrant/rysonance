import {
  isRazzaGiocabile,
  statsDa,
  tribuByKey,
  valoriCaratteristiche,
} from "@/lib/onboarding/selectors";
import { SESSI } from "@/lib/onboarding/types";

import { OptionCard } from "../option-card";
import { RazzaCard } from "../razza-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Chi è il personaggio: sesso e da dove viene. La razza decide il talento
 * razziale, le tribù disponibili e su quali Caratteristiche potrà cadere il +1 —
 * per questo apre il wizard, prima dello step delle Caratteristiche. Il nome
 * invece si sceglie per ultimo, nel riepilogo, a eroe completo.
 */
export function IdentitaStep({ catalog, draft, onChange }: StepProps) {
  // Le statistiche mostrate nella card aperta: a questo punto del wizard i
  // punti Caratteristica sono quasi sempre zero, quindi pesa la velocità della
  // tribù e poco altro — ma la formula è la stessa del riepilogo.
  const stats = statsDa(
    valoriCaratteristiche(catalog, draft),
    tribuByKey(catalog, draft.tribu_key),
  );

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
            <RazzaCard
              key={item.key}
              razza={item}
              selected={draft.razza_key === item.key}
              tribuKey={draft.tribu_key}
              disabled={!isRazzaGiocabile(item)}
              disabledReason="Non ancora giocabile: mancano tribù o Caratteristiche."
              stats={stats}
              onSelect={() => onChange({ razza_key: item.key })}
              onSelectTribu={(key) => onChange({ tribu_key: key })}
            />
          ))}
        </div>
      </StepSection>
    </>
  );
}
