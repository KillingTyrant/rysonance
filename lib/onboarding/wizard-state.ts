/**
 * Stato del wizard e transizioni che tengono coerenti le scelte fra loro:
 * cambiare razza può invalidare la stirpe, cambiare Via può invalidare gli slot
 * disciplina già spesi. Funzioni pure, così le stesse regole sono testabili
 * fuori da React.
 */
import {
  allowedDisciplineKeys,
  categoriesForStep,
  fieldForCategory,
  NAME_MAX_LENGTH,
  remainingSlots,
  stirpiForRace,
  supportedTraits,
} from "./rules";
import type { Catalog, CharacterInput, DisciplinePoints } from "./types";

export const WIZARD_STEPS = [
  { id: 1, title: "Razza e specie" },
  { id: 2, title: "La Via" },
  { id: 3, title: "Stile di combattimento" },
  { id: 4, title: "Tendenza sociale" },
  { id: 5, title: "Talenti e magie" },
  { id: 6, title: "Riepilogo" },
] as const;

export const FIRST_STEP = WIZARD_STEPS[0].id;
export const LAST_STEP = WIZARD_STEPS[WIZARD_STEPS.length - 1].id;

export type WizardState = {
  name: string;
  race_key: string | null;
  stirpe_key: string | null;
  gender_key: string | null;
  via_key: string | null;
  attack_key: string | null;
  defense_key: string | null;
  reaction_key: string | null;
  alignment_key: string | null;
  morality_key: string | null;
  traits: Record<string, number>;
  discipline_points: DisciplinePoints;
};

export function initialWizardState(catalog: Catalog): WizardState {
  return {
    name: "",
    race_key: null,
    stirpe_key: null,
    gender_key: null,
    via_key: null,
    attack_key: null,
    defense_key: null,
    reaction_key: null,
    alignment_key: null,
    morality_key: null,
    traits: Object.fromEntries(
      supportedTraits(catalog).map((trait) => [trait.key, trait.default_value]),
    ),
    discipline_points: {},
  };
}

/**
 * Cambiare razza tiene la stirpe solo se appartiene alla nuova razza:
 * la FK composta `(race_key, stirpe_key)` non ammette combinazioni miste.
 */
export function selectRace(
  catalog: Catalog,
  state: WizardState,
  raceKey: string,
): { state: WizardState; clearedStirpe: boolean } {
  const stillValid = stirpiForRace(catalog, raceKey).some(
    (stirpe) => stirpe.key === state.stirpe_key,
  );
  return {
    state: {
      ...state,
      race_key: raceKey,
      stirpe_key: stillValid ? state.stirpe_key : null,
    },
    clearedStirpe: Boolean(state.stirpe_key) && !stillValid,
  };
}

/**
 * Cambiare Via ricalcola le discipline disponibili: gli slot spesi su
 * discipline non più sbloccate vengono restituiti.
 */
export function selectVia(
  catalog: Catalog,
  state: WizardState,
  viaKey: string,
): { state: WizardState; releasedSlots: number } {
  const allowed = allowedDisciplineKeys(catalog, viaKey);
  const kept: DisciplinePoints = {};
  let releasedSlots = 0;

  for (const [key, points] of Object.entries(state.discipline_points)) {
    if (allowed.has(key)) kept[key] = points;
    else releasedSlots += points;
  }

  return {
    state: { ...state, via_key: viaKey, discipline_points: kept },
    releasedSlots,
  };
}

/** Aggiunge o toglie punti a una disciplina, senza sforare il budget. */
export function changeDisciplinePoints(
  catalog: Catalog,
  state: WizardState,
  disciplineKey: string,
  delta: number,
): WizardState {
  const current = state.discipline_points[disciplineKey] ?? 0;
  const next = Math.max(0, current + delta);
  // Solo gli incrementi sono limitati dal budget: un decremento deve togliere
  // esattamente quanto chiesto, anche se il budget fosse già sforato.
  const capped =
    delta > 0
      ? Math.min(next, current + Math.max(0, remainingSlots(catalog, state.discipline_points)))
      : next;

  const points = { ...state.discipline_points };
  if (capped > 0) points[disciplineKey] = capped;
  else delete points[disciplineKey];

  return { ...state, discipline_points: points };
}

/**
 * Uno step è completo quando ha tutte le scelte che servono. Le categorie a
 * scelta singola sono lette dal catalogo, non elencate a mano.
 */
export function isStepComplete(
  catalog: Catalog,
  state: WizardState,
  step: number,
): boolean {
  const categoriesDone = categoriesForStep(catalog, step).every((category) => {
    const field = fieldForCategory(category.key);
    return field ? Boolean(state[field]) : true;
  });

  switch (step) {
    case 1:
      return isNameValid(state.name) && Boolean(state.race_key) && Boolean(state.stirpe_key) && categoriesDone;
    case 2:
      return Boolean(state.via_key);
    case 5:
      // Regola di prodotto: gli slot vanno spesi tutti. La stessa regola è
      // riapplicata dalla server action.
      return remainingSlots(catalog, state.discipline_points) === 0;
    case LAST_STEP:
      // Il riepilogo non si "completa": è il punto in cui si salva.
      return false;
    default:
      return categoriesDone;
  }
}

function isNameValid(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= NAME_MAX_LENGTH;
}

/**
 * Cosa manca per completare uno step, in etichette leggibili: serve a dire
 * all'utente perché "Avanti" è disabilitato.
 */
export function missingForStep(
  catalog: Catalog,
  state: WizardState,
  step: number,
): string[] {
  const missing: string[] = [];

  if (step === 1) {
    if (!isNameValid(state.name)) missing.push("Nome");
    if (!state.race_key) missing.push("Razza");
    if (!state.stirpe_key) missing.push("Stirpe");
  }

  if (step === 2 && !state.via_key) missing.push("Via");

  if (step === 5) {
    const remaining = remainingSlots(catalog, state.discipline_points);
    if (remaining > 0) {
      missing.push(`${remaining} slot da assegnare`);
    }
  }

  for (const category of categoriesForStep(catalog, step)) {
    const field = fieldForCategory(category.key);
    if (field && !state[field]) missing.push(category.title);
  }

  return missing;
}

/**
 * Primo step incompleto: fin lì la navigazione è libera. Guarda tutta la
 * catena, non solo lo step precedente, così invalidare uno step iniziale
 * richiude anche quelli dopo.
 */
export function firstIncompleteStep(catalog: Catalog, state: WizardState): number {
  for (const step of WIZARD_STEPS) {
    if (!isStepComplete(catalog, state, step.id)) return step.id;
  }
  return LAST_STEP;
}

/** Payload per la server action, o `null` se manca ancora qualcosa. */
export function toCharacterInput(state: WizardState): CharacterInput | null {
  const {
    name,
    race_key,
    stirpe_key,
    gender_key,
    via_key,
    attack_key,
    defense_key,
    reaction_key,
    alignment_key,
    morality_key,
  } = state;

  if (
    !name.trim() ||
    !race_key ||
    !stirpe_key ||
    !gender_key ||
    !via_key ||
    !attack_key ||
    !defense_key ||
    !reaction_key ||
    !alignment_key ||
    !morality_key
  ) {
    return null;
  }

  return {
    name: name.trim(),
    race_key,
    stirpe_key,
    gender_key,
    via_key,
    attack_key,
    defense_key,
    reaction_key,
    alignment_key,
    morality_key,
    traits: state.traits,
    discipline_points: state.discipline_points,
  };
}
