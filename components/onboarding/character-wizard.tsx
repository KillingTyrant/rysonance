"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { saveCharacter } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import type { ChoiceField } from "@/lib/onboarding/rules";
import type { Catalog, Character } from "@/lib/onboarding/types";
import {
  changeDisciplinePoints,
  FIRST_STEP,
  initialWizardState,
  isStepComplete,
  LAST_STEP,
  selectRace,
  selectVia,
  toCharacterInput,
  WIZARD_STEPS,
  type WizardState,
} from "@/lib/onboarding/wizard-state";

import { CategoriesStep } from "./steps/categories-step";
import { DisciplinesStep } from "./steps/disciplines-step";
import { IdentityStep } from "./steps/identity-step";
import { SummaryStep } from "./steps/summary-step";
import { TraitsSliders } from "./steps/traits-sliders";
import { ViaStep } from "./steps/via-step";
import { WizardStepper } from "./wizard-stepper";
import { WizardSummary } from "./wizard-summary";

type SaveError = { message: string; problems?: string[] };

/**
 * Wizard di creazione personaggio. Il catalogo arriva già risolto dal server
 * (prerenderizzato), qui vive solo lo stato delle scelte: ogni selezione può
 * invalidarne altre, e il salvataggio finale passa dalla server action.
 */
export function CharacterWizard({ catalog }: { catalog: Catalog }) {
  const [state, setState] = useState<WizardState>(() => initialWizardState(catalog));
  const [step, setStep] = useState<number>(FIRST_STEP);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<SaveError | null>(null);
  const [saved, setSaved] = useState<Character | null>(null);
  const [pending, startTransition] = useTransition();

  const stepComplete = (id: number) => isStepComplete(catalog, state, id);
  const incompleteSteps = WIZARD_STEPS.filter(
    (item) => item.id !== LAST_STEP && !stepComplete(item.id),
  );

  function goTo(next: number) {
    setNotice(null);
    setStep(Math.min(LAST_STEP, Math.max(FIRST_STEP, next)));
  }

  function handleRace(raceKey: string) {
    setState((current) => selectRace(catalog, current, raceKey));
  }

  function handleVia(viaKey: string) {
    const { state: next, releasedSlots } = selectVia(catalog, state, viaKey);
    setState(next);
    setNotice(
      releasedSlots > 0
        ? `Cambiando Via hai liberato ${releasedSlots} slot: le discipline non più disponibili sono state tolte.`
        : null,
    );
  }

  function handleChoice(field: ChoiceField, optionKey: string) {
    setState((current) => ({ ...current, [field]: optionKey }));
  }

  function handleSave() {
    const input = toCharacterInput(state);
    if (!input) {
      setError({ message: "Completa tutti gli step prima di salvare." });
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveCharacter(input);
      if (result.ok) setSaved(result.character);
      else setError({ message: result.message, problems: result.problems });
    });
  }

  if (saved) {
    return (
      <div className="flex w-full max-w-xl flex-col gap-6 self-center rounded-xl border bg-card p-8 text-center shadow">
        <h1 className="text-2xl font-semibold">Personaggio salvato</h1>
        <p className="text-muted-foreground">
          {saved.name} è pronto: lo trovi fra i tuoi personaggi.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/lobby">Vai alla lobby</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSaved(null);
              setState(initialWizardState(catalog));
              setStep(FIRST_STEP);
            }}
          >
            Creane un altro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold">Crea il tuo personaggio</h1>
        <WizardStepper current={step} completed={stepComplete} onGoTo={goTo} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-8">
          {notice && (
            <p className="rounded-xl border bg-secondary/40 p-3 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          {step === 1 && (
            <IdentityStep
              catalog={catalog}
              state={state}
              onName={(name) => setState((current) => ({ ...current, name }))}
              onRace={handleRace}
              onStirpe={(stirpeKey) =>
                setState((current) => ({ ...current, stirpe_key: stirpeKey }))
              }
              onChoice={handleChoice}
            />
          )}

          {step === 2 && <ViaStep catalog={catalog} state={state} onVia={handleVia} />}

          {step === 3 && (
            <CategoriesStep
              catalog={catalog}
              state={state}
              step={3}
              onChoice={handleChoice}
            />
          )}

          {step === 4 && (
            <CategoriesStep
              catalog={catalog}
              state={state}
              step={4}
              onChoice={handleChoice}
            >
              <TraitsSliders
                catalog={catalog}
                state={state}
                onTrait={(traitKey, value) =>
                  setState((current) => ({
                    ...current,
                    traits: { ...current.traits, [traitKey]: value },
                  }))
                }
              />
            </CategoriesStep>
          )}

          {step === 5 && (
            <DisciplinesStep
              catalog={catalog}
              state={state}
              onChangePoints={(disciplineKey, delta) =>
                setState((current) =>
                  changeDisciplinePoints(catalog, current, disciplineKey, delta),
                )
              }
            />
          )}

          {step === LAST_STEP && (
            <SummaryStep
              catalog={catalog}
              state={state}
              incompleteSteps={incompleteSteps}
              pending={pending}
              error={error}
              onSave={handleSave}
              onGoTo={goTo}
            />
          )}

          <nav className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={step === FIRST_STEP}
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeft />
              Indietro
            </Button>

            {step < LAST_STEP && (
              <div className="flex items-center gap-3">
                {!stepComplete(step) && (
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    Completa le scelte per proseguire
                  </span>
                )}
                <Button
                  type="button"
                  disabled={!stepComplete(step)}
                  onClick={() => goTo(step + 1)}
                >
                  Avanti
                  <ArrowRight />
                </Button>
              </div>
            )}
          </nav>
        </div>

        <WizardSummary
          catalog={catalog}
          state={state}
          className="h-fit lg:sticky lg:top-6"
        />
      </div>
    </div>
  );
}
