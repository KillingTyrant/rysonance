"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { salvaPersonaggio } from "@/app/(protected)/onboarding/actions";
import { PersonaggioSheet } from "@/components/personaggi/personaggio-sheet";
import { Button } from "@/components/ui/button";
import {
  allGroupsComplete,
  groupById,
  isGroupComplete,
  isGroupUnlocked,
  stepPositionInGroup,
  type GroupId,
} from "@/lib/onboarding/groups";
import {
  razzaByKey,
  resolveDraft,
  talentiDaScegliere,
  viaByKey,
} from "@/lib/onboarding/selectors";
import {
  problemsForStep,
  stepIndex,
  WIZARD_STEPS,
  type StepId,
} from "@/lib/onboarding/steps";
import type { Catalog, Personaggio, PersonaggioDraft } from "@/lib/onboarding/types";
import { emptyDraft, validateDraft } from "@/lib/onboarding/validate";

import { GroupIntro } from "./group-intro";
import { HubScreen } from "./hub-screen";
import { STEP_COMPONENTS, type SaveError } from "./wizard-steps";

/**
 * La vista corrente del wizard. La hub è il punto di partenza e di ritorno:
 * in un macro-passo si entra sempre passando dalla sua intro, mentre i salti
 * dal riepilogo ("Vai a …") vanno dritti allo step, senza intro. Il riepilogo
 * è una vista a sé, raggiunta dalla CTA della hub quando tutto è completo.
 */
type WizardView =
  | { mode: "hub" }
  | { mode: "intro"; group: GroupId }
  | { mode: "step"; step: StepId }
  | { mode: "summary" };

/**
 * Wizard di creazione personaggio. Il catalogo arriva già risolto dal server
 * (prerenderizzato); qui vive solo il draft delle scelte, che è anche il
 * payload mandato alla server action — non c'è nessuna conversione in mezzo.
 */
export function PersonaggioWizard({ catalog }: { catalog: Catalog }) {
  const [draft, setDraft] = useState<PersonaggioDraft>(emptyDraft);
  const [view, setView] = useState<WizardView>({ mode: "hub" });
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [saved, setSaved] = useState<Personaggio | null>(null);
  const [pending, startTransition] = useTransition();

  const viewRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Una chiave per vista: guida l'effect di scroll/focus e fa da `key` del
  // contenitore, così ogni transizione rimonta il contenuto che si guarda.
  const viewKey =
    view.mode === "step"
      ? `step:${view.step}`
      : view.mode === "intro"
        ? `intro:${view.group}`
        : view.mode;

  // Cambiando vista la pagina resterebbe scrollata dov'era e il focus andrebbe
  // perso sul bottone appena disabilitato: lo riportiamo all'inizio.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    viewRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [viewKey]);

  useEffect(() => {
    if (saved) window.scrollTo({ top: 0 });
  }, [saved]);

  // Una sola valutazione per render, da cui derivano il gate di "Avanti",
  // l'elenco di cosa manca, lo stato delle righe della hub e il riepilogo.
  const problems = validateDraft(catalog, draft);

  function go(next: WizardView) {
    setNotice(null);
    // Un errore di salvataggio riguarda il tentativo appena fallito: lasciarlo
    // in giro dopo aver cambiato vista lo farebbe sembrare ancora attuale al
    // ritorno sul riepilogo.
    setSaveError(null);
    setView(next);
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

      // Una tribù di un'altra razza non ha senso, e la FK composta la
      // rifiuterebbe comunque.
      if (next.tribu_key && !razza?.tribu.some((t) => t.key === next.tribu_key)) {
        next.tribu_key = null;
        avvisi.push("Cambiando razza la tribù non era più valida: l'ho tolta.");
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
              setDraft(emptyDraft());
              setView({ mode: "hub" });
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

  if (view.mode === "hub") {
    return (
      <div
        key={viewKey}
        ref={viewRef}
        tabIndex={-1}
        className="flex w-full flex-1 flex-col outline-none"
      >
        <HubScreen
          completed={(id) => isGroupComplete(problems, id)}
          unlocked={(id) => isGroupUnlocked(problems, id)}
          allComplete={allGroupsComplete(problems)}
          disabled={pending}
          onOpenGroup={(id) => go({ mode: "intro", group: id })}
          onCreaEroe={() => go({ mode: "summary" })}
        />
      </div>
    );
  }

  if (view.mode === "intro") {
    const group = groupById(view.group);
    return (
      <div
        key={viewKey}
        ref={viewRef}
        tabIndex={-1}
        className="flex w-full flex-1 flex-col outline-none"
      >
        <GroupIntro
          group={group}
          disabled={pending}
          onContinue={() => go({ mode: "step", step: group.steps[0] })}
          onBack={() => go({ mode: "hub" })}
        />
      </div>
    );
  }

  // step | summary: stesso layout a due colonne, con la scheda a fianco su lg.
  const step: StepId = view.mode === "step" ? view.step : "riepilogo";
  const Step = STEP_COMPONENTS[step];
  const position = view.mode === "step" ? stepPositionInGroup(step) : null;
  const missing =
    view.mode === "step"
      ? problemsForStep(problems, step).map((problem) => problem.label)
      : [];

  return (
    <div
      key={viewKey}
      ref={viewRef}
      tabIndex={-1}
      className="flex w-full flex-col gap-8 outline-none"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold">
          {view.mode === "summary"
            ? "Creazione dell'eroe"
            : (position?.group.introTitle ?? WIZARD_STEPS[stepIndex(step)].title)}
        </h1>
        {position && position.count > 1 && (
          <p className="text-sm text-muted-foreground">
            Passo {position.index + 1} di {position.count} —{" "}
            {WIZARD_STEPS[stepIndex(step)].title}
          </p>
        )}
      </header>

      {/* <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]"> */}
      <div className="flex flex-col gap-8">
        <div role="status" aria-live="polite">
          {notice && (
            <p className="rounded-xl border bg-secondary/40 p-3 text-sm text-muted-foreground">
              {notice}
            </p>
          )}
        </div>

        <Step
          catalog={catalog}
          draft={draft}
          problems={problems}
          pending={pending}
          saveError={saveError}
          onChange={handleChange}
          onGoTo={(next) => go({ mode: "step", step: next })}
          onSave={handleSave}
        />

        <nav className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!position || position.index === 0) go({ mode: "hub" });
              else
                go({ mode: "step", step: position.group.steps[position.index - 1] });
            }}
          >
            <ArrowLeft />
            Indietro
          </Button>

          {position && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {missing.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Manca: {missing.join(", ")}
                </span>
              )}
              <Button
                type="button"
                disabled={missing.length > 0 || pending}
                onClick={() => {
                  if (position.index === position.count - 1) go({ mode: "hub" });
                  else
                    go({
                      mode: "step",
                      step: position.group.steps[position.index + 1],
                    });
                }}
              >
                Avanti
                <ArrowRight />
              </Button>
            </div>
          )}
        </nav>
      </div>

      {/* <PersonaggioSheet
          resolved={resolveDraft(catalog, draft)}
          variant="aside"
          title="Il tuo personaggio"
          className="h-fit lg:sticky lg:top-6"
        /> */}
      {/* </div> */}
    </div>
  );
}
