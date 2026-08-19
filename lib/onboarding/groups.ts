import { isStepComplete, type StepId } from "./steps";
import type { Problem } from "./validate";

export type GroupDef = {
  id: string;
  /** Etichetta della riga nella hub. */
  label: string;
  /** Titolo della schermata introduttiva. */
  introTitle: string;
  /** Paragrafo mostrato sotto il titolo dell'intro. */
  introDescription: string;
  /** Gli step del wizard che compongono il macro-passo, in ordine. */
  steps: readonly StepId[];
};

/**
 * I macro-passi mostrati nella hub "Creazione dell'eroe", come DATI: ognuno
 * raggruppa gli step di `WIZARD_STEPS` che lo compongono. Il riepilogo non è
 * un macro-passo: ci si arriva dalla CTA della hub quando tutto è completo.
 *
 * Completamento e sblocco derivano dagli stessi problemi di `validateDraft`
 * usati dagli step: qui non vive nessuna regola di validazione nuova.
 *
 * Niente React qui dentro: come `steps.ts`, questo modulo è solo dati e
 * funzioni pure. Le icone delle righe stanno nel componente della hub.
 */
export const WIZARD_GROUPS = [
  {
    id: "razza",
    label: "Scegli la tua razza",
    introTitle: "Scelta della razza",
    introDescription:
      "Ogni eroe di Rysonance appartiene a una razza, e ogni razza ha le sue tribù. Qui decidi chi è il tuo eroe: il sesso e il popolo da cui proviene. La razza determina anche in quali Caratteristiche potrà eccellere.",
    steps: ["identita"],
  },
  {
    id: "via",
    label: "Scegli la tua Via",
    introTitle: "Scelta della Via",
    introDescription:
      "La Via è il cammino che il tuo eroe percorre e definisce il suo modo di stare al mondo. Qui sceglierai la tua Via, distribuirai i punti nelle Caratteristiche e deciderai il suo stile di attacco e di difesa.",
    steps: ["via", "caratteristiche", "combattimento"],
  },
  {
    id: "talenti",
    label: "Scegli i tuoi talenti",
    introTitle: "Scelta dei talenti",
    introDescription:
      "I talenti sono le capacità che rendono unico il tuo eroe: la Via che hai scelto decide quanti potrai apprenderne. Qui sceglierai i talenti e regolerai le tendenze del carattere, per definire come il tuo eroe affronta il mondo.",
    steps: ["talenti", "carattere"],
  },
] as const satisfies readonly GroupDef[];

export type GroupId = (typeof WIZARD_GROUPS)[number]["id"];

export function groupIndex(id: GroupId): number {
  return WIZARD_GROUPS.findIndex((group) => group.id === id);
}

export function groupById(id: GroupId): GroupDef {
  return WIZARD_GROUPS[groupIndex(id)];
}

/** Il macro-passo a cui appartiene uno step; null per il riepilogo. */
export function groupOf(step: StepId): GroupDef | null {
  return (
    WIZARD_GROUPS.find((group) =>
      (group.steps as readonly StepId[]).includes(step),
    ) ?? null
  );
}

/** Completo = nessun problema in nessuno degli step membri. */
export function isGroupComplete(problems: Problem[], id: GroupId): boolean {
  return groupById(id).steps.every((step) => isStepComplete(problems, step));
}

/** Sbloccato = tutti i macro-passi precedenti completi (il primo lo è sempre). */
export function isGroupUnlocked(problems: Problem[], id: GroupId): boolean {
  return WIZARD_GROUPS.slice(0, groupIndex(id)).every((group) =>
    isGroupComplete(problems, group.id),
  );
}

export function allGroupsComplete(problems: Problem[]): boolean {
  return WIZARD_GROUPS.every((group) => isGroupComplete(problems, group.id));
}

/**
 * Posizione di uno step nel suo macro-passo, per "Passo X di Y" e per
 * Avanti/Indietro; null per gli step fuori dai gruppi (il riepilogo).
 */
export function stepPositionInGroup(
  step: StepId,
): { group: GroupDef; index: number; count: number } | null {
  const group = groupOf(step);
  if (!group) return null;
  return {
    group,
    index: group.steps.indexOf(step),
    count: group.steps.length,
  };
}
