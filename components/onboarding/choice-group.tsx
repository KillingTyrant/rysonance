import { OptionCard } from "./option-card";
import { StepSection } from "./step-section";
import type { WizardCategory } from "@/lib/onboarding/types";

type ChoiceGroupProps = {
  category: WizardCategory;
  value: string | null;
  onSelect: (optionKey: string) => void;
};

/** Una categoria a scelta singola del catalogo, resa come gruppo di card. */
export function ChoiceGroup({ category, value, onSelect }: ChoiceGroupProps) {
  return (
    <StepSection title={category.title} description={category.description || undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        {category.options.map((option) => (
          <OptionCard
            key={option.key}
            title={option.name}
            description={option.description || undefined}
            selected={value === option.key}
            onSelect={() => onSelect(option.key)}
          />
        ))}
      </div>
    </StepSection>
  );
}
