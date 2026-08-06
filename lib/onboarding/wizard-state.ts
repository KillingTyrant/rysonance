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
): WizardState {
  const stillValid = stirpiForRace(catalog, raceKey).some(
    (stirpe) => stirpe.key === state.stirpe_key,
  );
  return {
    ...state,
    race_key: raceKey,
    stirpe_key: stillValid ? state.stirpe_key : null,
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
  const capped = Math.min(
    Math.max(0, current + delta),
    current + remainingSlots(catalog, state.discipline_points),
  );

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
      return (
        state.name.trim().length > 0 &&
        Boolean(state.race_key) &&
        Boolean(state.stirpe_key) &&
        categoriesDone
      );
    case 2:
      return Boolean(state.via_key);
    case 5:
      // Regola di prodotto: gli slot vanno spesi tutti. Il DB si limita a
      // rifiutare chi sfora il budget.
      return remainingSlots(catalog, state.discipline_points) === 0;
    default:
      return categoriesDone;
  }
}

/** Primo step incompleto: fin lì la navigazione è libera. */
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
