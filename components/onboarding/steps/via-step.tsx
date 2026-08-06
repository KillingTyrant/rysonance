import { Badge } from "@/components/ui/badge";
import { disciplineGroupsForVia, viaByKey } from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";

type ViaStepProps = {
  catalog: Catalog;
  state: WizardState;
  onVia: (viaKey: string) => void;
};

export function ViaStep({ catalog, state, onVia }: ViaStepProps) {
  const via = viaByKey(catalog, state.via_key);

  return (
    <div className="flex flex-col gap-8">
      <StepSection
        title="La Via"
        description="Determina la crescita a ogni livello e il primo talento."
        hint="Decide anche quali gruppi di discipline potrai usare nello step 5: cambiandola, gli slot già spesi su discipline non più disponibili tornano indietro."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {catalog.vie.map((option) => (
            <OptionCard
              key={option.key}
              title={option.name}
              description={option.description || undefined}
              selected={state.via_key === option.key}
              onSelect={() => onVia(option.key)}
              meta={
                <span className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">
                    Per livello: +{option.per_level_hp} HP, +{option.per_level_mana}{" "}
                    mana, +{option.per_level_speed} velocità
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {disciplineGroupsForVia(catalog, option.key).map((group) => (
                      <Badge key={group.key} variant="secondary">
                        {group.name}
                      </Badge>
                    ))}
                  </span>
                </span>
              }
            />
          ))}
        </div>

        {via?.firstTalent && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Primo talento: {via.firstTalent.name}
            </span>{" "}
            {via.firstTalent.description}
          </p>
        )}
      </StepSection>
    </div>
  );
}
