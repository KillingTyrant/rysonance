import { Button } from "@/components/ui/button";
import { PersonaggioSheet } from "@/components/personaggi/personaggio-sheet";
import { resolveDraft } from "@/lib/onboarding/selectors";
import { isStepComplete, problemsForStep, WIZARD_STEPS } from "@/lib/onboarding/steps";

import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Riepilogo e salvataggio. Non ridisegna il personaggio: usa la stessa
 * `PersonaggioSheet` della colonna laterale e della lobby.
 */
export function SummaryStep({
  catalog,
  draft,
  problems,
  pending,
  saveError,
  onGoTo,
  onSave,
}: StepProps) {
  const resolved = resolveDraft(catalog, draft);
  const incompleti = WIZARD_STEPS.filter(
    (step) => step.fields.length > 0 && !isStepComplete(problems, step.id),
  );

  return (
    <StepSection
      title="Riepilogo"
      description="Controlla le scelte: dopo il salvataggio il personaggio comparirà nella lobby."
    >
      <div className="flex flex-col gap-6">
        <PersonaggioSheet resolved={resolved} variant="full" />

        {incompleti.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-medium">Manca ancora qualcosa</p>
            <ul className="flex flex-col gap-2 text-sm">
              {incompleti.map((step) => (
                <li
                  key={step.id}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="text-muted-foreground">
                    {step.title}:{" "}
                    {problemsForStep(problems, step.id)
                      .map((problem) => problem.message)
                      .join(" ")}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => onGoTo(step.id)}
                  >
                    Vai a {step.title}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saveError && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
          >
            <p className="font-medium">{saveError.message}</p>
            {saveError.problems && saveError.problems.length > 0 && (
              <ul className="flex list-inside list-disc flex-col gap-1 text-muted-foreground">
                {saveError.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={pending || incompleti.length > 0}
            onClick={onSave}
          >
            {pending ? "Salvataggio…" : "Salva il personaggio"}
          </Button>
        </div>
      </div>
    </StepSection>
  );
}
