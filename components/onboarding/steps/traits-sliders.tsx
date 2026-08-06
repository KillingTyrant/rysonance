import { supportedTraits } from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { StepSection } from "../step-section";

type TraitsSlidersProps = {
  catalog: Catalog;
  state: WizardState;
  onTrait: (traitKey: string, value: number) => void;
};

/** Assi del carattere: slider 0..100 fra due estremi definiti dal catalogo. */
export function TraitsSliders({ catalog, state, onTrait }: TraitsSlidersProps) {
  const traits = supportedTraits(catalog);
  if (traits.length === 0) return null;

  return (
    <StepSection
      title="Carattere"
      description="Sposta ogni asse verso il tratto che descrive meglio il personaggio."
    >
      <div className="flex flex-col gap-5">
        {traits.map((trait) => {
          const value = state.traits[trait.key] ?? trait.default_value;
          const inputId = `trait-${trait.key}`;
          return (
            <div key={trait.key} className="grid gap-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <label htmlFor={inputId}>{trait.left_label}</label>
                <span className="text-xs text-muted-foreground">{value}</span>
                <label htmlFor={inputId}>{trait.right_label}</label>
              </div>
              <input
                id={inputId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(event) => onTrait(trait.key, Number(event.target.value))}
                className="w-full accent-primary"
                aria-label={`${trait.left_label} - ${trait.right_label}`}
              />
            </div>
          );
        })}
      </div>
    </StepSection>
  );
}
