import type { ReactNode } from "react";

import { categoriesForStep, fieldForCategory } from "@/lib/onboarding/rules";
import type { ChoiceField } from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { ChoiceGroup } from "../choice-group";

type CategoriesStepProps = {
  catalog: Catalog;
  state: WizardState;
  /** Numero di step: le categorie da mostrare vengono dal catalogo. */
  step: number;
  onChoice: (field: ChoiceField, optionKey: string) => void;
  children?: ReactNode;
};

/** Step fatto di sole scelte singole (stile di combattimento, tendenza). */
export function CategoriesStep({
  catalog,
  state,
  step,
  onChoice,
  children,
}: CategoriesStepProps) {
  return (
    <div className="flex flex-col gap-8">
      {categoriesForStep(catalog, step).map((category) => {
        const field = fieldForCategory(category.key);
        if (!field) return null;
        return (
          <ChoiceGroup
            key={category.key}
            category={category}
            value={state[field]}
            onSelect={(optionKey) => onChoice(field, optionKey)}
          />
        );
      })}
      {children}
    </div>
  );
}
