import type { DraftField, Problem } from "./validate";

export type StepDef = {
  id: string;
  title: string;
  /** I campi del draft che questo step raccoglie. */
  fields: readonly DraftField[];
};

/**
 * Gli step del wizard, come DATI, nell'ordine in cui si crea un eroe: chi è,
 * la Via che percorrerà e i talenti. Ogni step dichiara quali campi raccoglie:
 * da qui derivano il gate di "Avanti", l'elenco di cosa manca e le spunte
 * della hub, senza che nessuna di quelle regole venga riscritta a mano.
 *
 * L'ordine non è solo estetico: quanti talenti si scelgono dipende dalla Via —
 * chiesta prima di chi la usa.
 *
 * Niente React qui dentro: questo modulo è importato anche dal server. La mappa
 * step → componente sta in `components/onboarding/wizard-steps.tsx`, dove il
 * compilatore la verifica esaustiva contro `StepId`.
 *
 * `riepilogo` mostra i problemi di tutti gli altri e raccoglie solo il nome:
 * si sceglie per ultimo, a eroe completo.
 */
export const WIZARD_STEPS = [
  {
    id: "identita",
    title: "Identità",
    fields: ["sesso", "razza_key", "tribu_key"],
  },
  { id: "via", title: "La Via", fields: ["via_key"] },
  { id: "talenti", title: "Talenti", fields: ["talenti"] },
  { id: "riepilogo", title: "Riepilogo", fields: ["name"] },
] as const satisfies readonly StepDef[];

export type StepId = (typeof WIZARD_STEPS)[number]["id"];

export const FIRST_STEP: StepId = WIZARD_STEPS[0].id;
export const LAST_STEP: StepId = WIZARD_STEPS[WIZARD_STEPS.length - 1].id;

export function stepIndex(id: StepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

/** Lo step che raccoglie un campo: serve a portare l'utente dove correggere. */
export function stepOf(field: DraftField): StepId {
  return (
    WIZARD_STEPS.find((step) => (step.fields as readonly DraftField[]).includes(field))
      ?.id ?? LAST_STEP
  );
}

export function problemsForStep(problems: Problem[], id: StepId): Problem[] {
  const fields = WIZARD_STEPS[stepIndex(id)].fields as readonly DraftField[];
  return problems.filter((problem) => fields.includes(problem.field));
}

export function isStepComplete(problems: Problem[], id: StepId): boolean {
  return problemsForStep(problems, id).length === 0;
}
