import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  categoriesForStep,
  fieldForCategory,
  isRaceSelectable,
  NAME_MAX_LENGTH,
  raceByKey,
  stirpeByKey,
  stirpiForRace,
} from "@/lib/onboarding/rules";
import type { ChoiceField } from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { ChoiceGroup } from "../choice-group";
import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";

type IdentityStepProps = {
  catalog: Catalog;
  state: WizardState;
  onName: (name: string) => void;
  onRace: (raceKey: string) => void;
  onStirpe: (stirpeKey: string) => void;
  onChoice: (field: ChoiceField, optionKey: string) => void;
};

export function IdentityStep({
  catalog,
  state,
  onName,
  onRace,
  onStirpe,
  onChoice,
}: IdentityStepProps) {
  const race = raceByKey(catalog, state.race_key);
  const stirpi = stirpiForRace(catalog, state.race_key);
  const stirpe = stirpeByKey(catalog, state.stirpe_key);

  return (
    <div className="flex flex-col gap-8">
      <StepSection title="Nome">
        <div className="grid max-w-sm gap-2">
          <Label htmlFor="character-name">Come si chiama il tuo personaggio?</Label>
          <Input
            id="character-name"
            value={state.name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
            placeholder="Es. Aria di Eruscal"
            onChange={(event) => onName(event.target.value)}
          />
        </div>
      </StepSection>

      <StepSection
        title="Razza"
        description="Definisce le statistiche di partenza e il talento razziale."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.races.map((option) => {
            const selectable = isRaceSelectable(catalog, option.key);
            return (
              <OptionCard
                key={option.key}
                title={option.name}
                selected={state.race_key === option.key}
                disabled={!selectable}
                disabledReason={
                  option.stirpi.length === 0
                    ? "Nessuna stirpe disponibile: non ancora giocabile."
                    : "Statistiche base non ancora definite."
                }
                onSelect={() => onRace(option.key)}
                meta={
                  <span className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex flex-wrap gap-x-3">
                      <span>HP {option.base_hp ?? "—"}</span>
                      <span>Mana {option.base_mana ?? "—"}</span>
                      <span>Velocità {option.base_speed ?? "—"}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-3">
                      {option.racialTalent && (
                        <span>Talento: {option.racialTalent.name}</span>
                      )}
                      <span>
                        {option.stirpi.length === 1
                          ? "1 stirpe"
                          : `${option.stirpi.length} stirpi`}
                      </span>
                    </span>
                  </span>
                }
              />
            );
          })}
        </div>

        {race?.racialTalent && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Talento di {race.name}: {race.racialTalent.name}
            </span>{" "}
            {race.racialTalent.description}
          </p>
        )}
      </StepSection>

      <StepSection
        title="Stirpe"
        hint={
          race
            ? `Le stirpi elencate sono solo quelle di ${race.name}: cambiando razza la scelta si azzera.`
            : "Scegli prima una razza: le stirpi dipendono da lei."
        }
      >
        {stirpi.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {race
              ? "Questa razza non ha ancora stirpi definite."
              : "Nessuna stirpe da mostrare."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stirpi.map((option) => (
              <OptionCard
                key={option.key}
                title={option.name}
                description={option.description || undefined}
                selected={state.stirpe_key === option.key}
                onSelect={() => onStirpe(option.key)}
                meta={
                  option.talent && (
                    <span className="text-xs text-muted-foreground">
                      Talento: {option.talent.name}
                    </span>
                  )
                }
              />
            ))}
          </div>
        )}

        {stirpe?.talent && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {stirpe.talent.name}:
            </span>{" "}
            {stirpe.talent.description}
          </p>
        )}
      </StepSection>

      {categoriesForStep(catalog, 1).map((category) => {
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
    </div>
  );
}
