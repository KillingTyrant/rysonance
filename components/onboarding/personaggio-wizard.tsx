"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { salvaPersonaggio } from "@/app/(protected)/onboarding/actions";
import { PersonaggioSheet } from "@/components/personaggi/personaggio-sheet";
import { Button } from "@/components/ui/button";
import {
  razzaByKey,
  resolveDraft,
  talentiDaScegliere,
  viaByKey,
} from "@/lib/onboarding/selectors";
import {
  FIRST_STEP,
  firstIncompleteStep,
  isStepComplete,
  LAST_STEP,
  problemsForStep,
  stepIndex,
  WIZARD_STEPS,
  type StepId,
} from "@/lib/onboarding/steps";
import type { Catalog, Personaggio, PersonaggioDraft } from "@/lib/onboarding/types";
import { emptyDraft, validateDraft } from "@/lib/onboarding/validate";

import { WizardStepper } from "./wizard-stepper";
import { STEP_COMPONENTS, type SaveError } from "./wizard-steps";

/**
 * Wizard di creazione personaggio. Il catalogo arriva già risolto dal server
 * (prerenderizzato); qui vive solo il draft delle scelte, che è anche il
 * payload mandato alla server action — non c'è nessuna conversione in mezzo.
 */
export function PersonaggioWizard({ catalog }: { catalog: Catalog }) {
  const [draft, setDraft] = useState<PersonaggioDraft>(() => emptyDraft(catalog));
  const [step, setStep] = useState<StepId>(FIRST_STEP);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [saved, setSaved] = useState<Personaggio | null>(null);
  const [pending, startTransition] = useTransition();

  const stepRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Cambiando step la pagina resterebbe scrollata dov'era e il focus andrebbe
  // perso sul bottone appena disabilitato: lo riportiamo all'inizio.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (saved) window.scrollTo({ top: 0 });
  }, [saved]);

  // Una sola valutazione per render, da cui derivano il gate di "Avanti",
  // l'elenco di cosa manca, le spunte dello stepper e il riepilogo.
  const problems = validateDraft(catalog, draft);
  const missing = problemsForStep(problems, step).map((problem) => problem.label);
  const limit = maxStep(step, firstIncompleteStep(problems));
  const index = stepIndex(step);

  function goTo(next: StepId) {
    setNotice(null);
    setStep(next);
  }

  /**
   * L'unico punto in cui il draft cambia, e quindi l'unico posto in cui vivono
   * gli invarianti fra campi. Sono tutti della stessa forma: una scelta fatta
   * prima ne invalida una fatta dopo, e invece di bloccare il cambio si toglie
   * ciò che non è più valido e lo si dice.
   */
  function handleChange(patch: Partial<PersonaggioDraft>) {
    const next = { ...draft, ...patch };
    const avvisi: string[] = [];

    if (patch.razza_key !== undefined) {
      const razza = razzaByKey(catalog, next.razza_key);
      const invalidate: string[] = [];

      // Una tribù di un'altra razza non ha senso, e la FK composta la
      // rifiuterebbe comunque.
      if (next.tribu_key && !razza?.tribu.some((t) => t.key === next.tribu_key)) {
        next.tribu_key = null;
        invalidate.push("la tribù");
      }

      // Ogni razza dà il +1 solo su alcune Caratteristiche.
      if (
        next.bonus_caratteristica_key &&
        !razza?.caratteristiche.some((c) => c.key === next.bonus_caratteristica_key)
      ) {
        next.bonus_caratteristica_key = null;
        invalidate.push("il bonus di razza");
      }

      if (invalidate.length > 0) {
        avvisi.push(
          `Cambiando razza ${invalidate.join(" e ")} non erano più validi: li ho tolti.`,
        );
      }
    }

    // Il Viandante dà tre talenti a scelta, le altre vie due: cambiando Via
    // quelli in eccesso vanno tolti, a partire dagli ultimi scelti.
    if (patch.via_key !== undefined) {
      const quanti = talentiDaScegliere(viaByKey(catalog, next.via_key));
      if (next.talenti.length > quanti) {
        next.talenti = next.talenti.slice(0, quanti);
        avvisi.push(`Questa Via dà ${quanti} talenti a scelta: ho tolto quelli in più.`);
      }
    }

    setDraft(next);
    setNotice(avvisi.join(" ") || null);
  }

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      try {
        const result = await salvaPersonaggio(draft);
        if (result.ok) setSaved(result.personaggio);
        else setSaveError({ message: result.message, problems: result.problems });
      } catch {
        // Rete caduta, 500, deploy nel frattempo: senza questo catch la promise
        // rifiutata dentro la transizione smonterebbe il wizard e butterebbe
        // via tutte le scelte.
        setSaveError({ message: "Non è stato possibile contattare il server. Riprova." });
      }
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
              setDraft(emptyDraft(catalog));
              setStep(FIRST_STEP);
              setNotice(null);
              setSaveError(null);
            }}
          >
            Creane un altro
          </Button>
        </div>
      </div>
    );
  }

  const Step = STEP_COMPONENTS[step];

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold">Crea il tuo personaggio</h1>
        <WizardStepper
          current={step}
          completed={(id) => isStepComplete(problems, id)}
          limit={limit}
          disabled={pending}
          onGoTo={goTo}
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-8">
          <div role="status" aria-live="polite">
            {notice && (
              <p className="rounded-xl border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {notice}
              </p>
            )}
          </div>

          <div
            key={step}
            ref={stepRef}
            tabIndex={-1}
            className="flex flex-col gap-8 outline-none"
          >
            <Step
              catalog={catalog}
              draft={draft}
              problems={problems}
              pending={pending}
              saveError={saveError}
              onChange={handleChange}
              onGoTo={goTo}
              onSave={handleSave}
            />
          </div>

          <nav className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0 || pending}
              onClick={() => goTo(WIZARD_STEPS[index - 1].id)}
            >
              <ArrowLeft />
              Indietro
            </Button>

            {step !== LAST_STEP && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {missing.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Manca: {missing.join(", ")}
                  </span>
                )}
                <Button
                  type="button"
                  disabled={missing.length > 0 || pending}
                  onClick={() => goTo(WIZARD_STEPS[index + 1].id)}
                >
                  Avanti
                  <ArrowRight />
                </Button>
              </div>
            )}
          </nav>
        </div>

        <PersonaggioSheet
          resolved={resolveDraft(catalog, draft)}
          variant="aside"
          title="Il tuo personaggio"
          className="h-fit lg:sticky lg:top-6"
        />
      </div>
    </div>
  );
}

/** Lo step più avanti fra i due, secondo l'ordine di WIZARD_STEPS. */
function maxStep(a: StepId, b: StepId): StepId {
  return stepIndex(a) >= stepIndex(b) ? a : b;
}
