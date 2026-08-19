import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonaggioSheet } from "@/components/personaggi/personaggio-sheet";
import { resolveDraft } from "@/lib/onboarding/selectors";
import { isStepComplete, problemsForStep, WIZARD_STEPS } from "@/lib/onboarding/steps";
import { NAME_MAX_LENGTH } from "@/lib/onboarding/validate";

import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Riepilogo e salvataggio. Non ridisegna il personaggio: usa la stessa
 * `PersonaggioSheet` della colonna laterale e della lobby. Qui si sceglie
 * anche il nome — l'ultima decisione, a eroe ormai completo.
 */
export function SummaryStep({
  catalog,
  draft,
  problems,
  pending,
  saveError,
  onChange,
  onGoTo,
  onSave,
}: StepProps) {
  const resolved = resolveDraft(catalog, draft);
  // Il nome si compila qui, quindi i suoi problemi vanno sotto il campo e non
  // nel pannello "Manca ancora qualcosa" — un "Vai a Riepilogo" che punta alla
  // schermata in cui si è già non aiuterebbe nessuno.
  const incompleti = WIZARD_STEPS.filter(
    (step) =>
      step.id !== "riepilogo" &&
      step.fields.length > 0 &&
      !isStepComplete(problems, step.id),
  );
  const problemiNome = problemsForStep(problems, "riepilogo");

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

        <StepSection
          title="Nome"
          description="L'ultima scelta: come si chiamerà il tuo eroe."
        >
          <div className="flex max-w-sm flex-col gap-2">
            <Label htmlFor="nome-personaggio" className="sr-only">
              Nome del personaggio
            </Label>
            <Input
              id="nome-personaggio"
              value={draft.name}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="off"
              placeholder="Es. Aurel"
              onChange={(event) => onChange({ name: event.target.value })}
            />
            {problemiNome.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {problemiNome.map((problem) => problem.message).join(" ")}
              </p>
            )}
          </div>
        </StepSection>

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
            disabled={pending || incompleti.length > 0 || problemiNome.length > 0}
            onClick={onSave}
          >
            {pending ? "Salvataggio…" : "Salva il personaggio"}
          </Button>
        </div>
      </div>
    </StepSection>
  );
}
