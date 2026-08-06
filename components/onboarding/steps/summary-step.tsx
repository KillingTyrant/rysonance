import { Button } from "@/components/ui/button";
import {
  CHOICE_FIELDS,
  categoryByKey,
  computeStats,
  disciplineByKey,
  optionByKey,
  raceByKey,
  spentSlots,
  stirpeByKey,
  supportedTraits,
  talentsFor,
  viaByKey,
} from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { StepSection } from "../step-section";

type SummaryStepProps = {
  catalog: Catalog;
  state: WizardState;
  /** Step ancora incompleti: finché ce ne sono, non si salva. */
  incompleteSteps: { id: number; title: string }[];
  pending: boolean;
  error: { message: string; problems?: string[] } | null;
  onSave: () => void;
  onGoTo: (step: number) => void;
};

export function SummaryStep({
  catalog,
  state,
  incompleteSteps,
  pending,
  error,
  onSave,
  onGoTo,
}: SummaryStepProps) {
  const race = raceByKey(catalog, state.race_key);
  const stirpe = stirpeByKey(catalog, state.stirpe_key);
  const via = viaByKey(catalog, state.via_key);
  const stats = computeStats(catalog, state.race_key, state.via_key, 1);
  const talents = talentsFor(catalog, {
    raceKey: state.race_key,
    stirpeKey: state.stirpe_key,
    viaKey: state.via_key,
  });
  const allocations = Object.entries(state.discipline_points).filter(
    ([, points]) => points > 0,
  );
  const canSave = incompleteSteps.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <StepSection
        title="Riepilogo"
        description="Controlla le scelte: al salvataggio diventano un personaggio completo."
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Nome" value={state.name.trim()} />
          <Item
            label="Razza e stirpe"
            value={race && stirpe ? `${race.name} · ${stirpe.name}` : null}
          />
          {CHOICE_FIELDS.map(({ category, field }) => (
            <Item
              key={category}
              label={categoryByKey(catalog, category)?.title ?? category}
              value={optionByKey(catalog, category, state[field])?.name}
            />
          ))}
          <Item label="Via" value={via?.name} />
          <Item
            label="Statistiche al livello 1"
            value={`HP ${stats.hp ?? "—"} · Mana ${stats.mana ?? "—"} · Velocità ${
              stats.speed ?? "—"
            }`}
          />
        </dl>
      </StepSection>

      <StepSection title="Carattere">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {supportedTraits(catalog).map((trait) => (
            <li key={trait.key} className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">
                {trait.left_label} · {trait.right_label}
              </span>
              <span className="tabular-nums">
                {state.traits[trait.key] ?? trait.default_value}
              </span>
            </li>
          ))}
        </ul>
      </StepSection>

      <StepSection title="Talenti">
        {talents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun talento acquisito.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {talents.map((talent) => (
              <li key={talent.key}>
                <span className="font-medium">{talent.name}</span>{" "}
                <span className="text-muted-foreground">{talent.description}</span>
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      <StepSection
        title={`Discipline (${spentSlots(state.discipline_points)}/${
          catalog.disciplineSlotBudget
        } slot)`}
      >
        {allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuno slot assegnato.</p>
        ) : (
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {allocations.map(([key, points]) => (
              <li key={key} className="flex items-baseline justify-between gap-3">
                <span>{disciplineByKey(catalog, key)?.name ?? key}</span>
                <span className="tabular-nums text-muted-foreground">×{points}</span>
              </li>
            ))}
          </ul>
        )}
      </StepSection>

      <div className="flex flex-col gap-3 border-t pt-6">
        {!canSave && (
          <div className="text-sm text-muted-foreground">
            Manca ancora qualcosa:{" "}
            {incompleteSteps.map((step, index) => (
              <span key={step.id}>
                {index > 0 && ", "}
                <button
                  type="button"
                  className="text-primary underline underline-offset-4"
                  onClick={() => onGoTo(step.id)}
                >
                  {step.title}
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            <p>{error.message}</p>
            {error.problems && error.problems.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {error.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="sm:self-start"
          disabled={!canSave || pending}
          onClick={onSave}
        >
          {pending ? "Salvataggio in corso..." : "Salva personaggio"}
        </Button>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={value ? "font-medium" : "text-muted-foreground"}>
        {value || "—"}
      </dd>
    </div>
  );
}
