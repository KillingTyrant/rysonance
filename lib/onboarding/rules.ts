/**
 * Regole del wizard: selettori sul catalogo, stat derivate e validazione.
 *
 * Modulo puro e senza direttive, quindi lo usano sia i componenti client sia la
 * server action — le stesse regole valgono nella UI e prima dell'INSERT.
 */
import type {
  Catalog,
  CharacterInput,
  CharacterTrait,
  DisciplinePoints,
  Stats,
  Talent,
} from "./types";

/** Lunghezza massima del nome: il DB non la vincola, la UI sì. */
export const NAME_MAX_LENGTH = 40;

/**
 * Categorie a scelta singola del catalogo e colonna di `characters` su cui
 * finiscono. Una categoria nuova nel catalogo richiede una colonna nuova, e
 * quindi una migrazione: finché non è mappata qui il wizard la ignora.
 */
export const CHOICE_FIELDS = [
  { category: "gender", field: "gender_key" },
  { category: "attacco", field: "attack_key" },
  { category: "difesa", field: "defense_key" },
  { category: "reazione", field: "reaction_key" },
  { category: "allineamento", field: "alignment_key" },
  { category: "moralita", field: "morality_key" },
] as const;

export type ChoiceField = (typeof CHOICE_FIELDS)[number]["field"];

export function fieldForCategory(categoryKey: string): ChoiceField | null {
  return CHOICE_FIELDS.find((c) => c.category === categoryKey)?.field ?? null;
}

/** Assi del carattere che hanno una colonna dedicata su `characters`. */
export const TRAIT_COLUMNS = [
  "trait_social",
  "trait_kindness",
  "trait_ambition",
  "trait_curiosity",
] as const;

export type TraitColumn = (typeof TRAIT_COLUMNS)[number];

export function isTraitColumn(key: string): key is TraitColumn {
  return (TRAIT_COLUMNS as readonly string[]).includes(key);
}

/** Assi del catalogo effettivamente salvabili. */
export function supportedTraits(catalog: Catalog): CharacterTrait[] {
  return catalog.traits.filter((trait) => isTraitColumn(trait.key));
}

// ───────────────────────────── selettori catalogo ──────────────────────────

export function raceByKey(catalog: Catalog, key: string | null) {
  return catalog.races.find((race) => race.key === key) ?? null;
}

export function stirpeByKey(catalog: Catalog, key: string | null) {
  for (const race of catalog.races) {
    const stirpe = race.stirpi.find((s) => s.key === key);
    if (stirpe) return stirpe;
  }
  return null;
}

export function viaByKey(catalog: Catalog, key: string | null) {
  return catalog.vie.find((via) => via.key === key) ?? null;
}

/** Stirpi disponibili per una razza: il vincolo che lega gli step 1a e 1b. */
export function stirpiForRace(catalog: Catalog, raceKey: string | null) {
  return raceByKey(catalog, raceKey)?.stirpi ?? [];
}

/**
 * Una razza è giocabile solo se ha almeno una stirpe (`stirpe_key` è
 * obbligatorio a personaggio completato e la FK composta pretende che
 * appartenga alla razza) e le statistiche base, altrimenti il personaggio
 * verrebbe salvato con hp/mana/velocità nulli.
 */
export function isRaceSelectable(catalog: Catalog, raceKey: string): boolean {
  const race = raceByKey(catalog, raceKey);
  if (!race || race.stirpi.length === 0) return false;
  return race.base_hp != null && race.base_mana != null && race.base_speed != null;
}

/** Categorie a scelta singola di un dato step del wizard. */
export function categoriesForStep(catalog: Catalog, step: number) {
  return catalog.categories.filter(
    (category) => category.step === step && fieldForCategory(category.key),
  );
}

export function categoryByKey(catalog: Catalog, key: string) {
  return catalog.categories.find((category) => category.key === key) ?? null;
}

/** Opzioni di una categoria (es. `attacco`, `gender`). */
export function optionsForCategory(catalog: Catalog, categoryKey: string) {
  return categoryByKey(catalog, categoryKey)?.options ?? [];
}

export function optionByKey(
  catalog: Catalog,
  categoryKey: string,
  optionKey: string | null,
) {
  if (!optionKey) return null;
  return (
    optionsForCategory(catalog, categoryKey).find((o) => o.key === optionKey) ?? null
  );
}

/** Gruppi di discipline sbloccati dalla Via scelta (step 5). */
export function disciplineGroupsForVia(catalog: Catalog, viaKey: string | null) {
  const via = viaByKey(catalog, viaKey);
  if (!via) return [];
  return catalog.disciplineGroups.filter((group) =>
    via.disciplineGroupKeys.includes(group.key),
  );
}

/** Discipline allocabili con la Via scelta. */
export function allowedDisciplineKeys(catalog: Catalog, viaKey: string | null) {
  return new Set(
    disciplineGroupsForVia(catalog, viaKey).flatMap((group) =>
      group.disciplines.map((discipline) => discipline.key),
    ),
  );
}

export function disciplineByKey(catalog: Catalog, key: string) {
  for (const group of catalog.disciplineGroups) {
    const discipline = group.disciplines.find((d) => d.key === key);
    if (discipline) return discipline;
  }
  return null;
}

/** Talenti che il personaggio si porta dietro: razza + stirpe + Via. */
export function talentsFor(
  catalog: Catalog,
  choices: { raceKey: string | null; stirpeKey: string | null; viaKey: string | null },
): Talent[] {
  const talents = [
    raceByKey(catalog, choices.raceKey)?.racialTalent,
    stirpeByKey(catalog, choices.stirpeKey)?.talent,
    viaByKey(catalog, choices.viaKey)?.firstTalent,
  ];
  return talents.filter((talent): talent is Talent => Boolean(talent));
}

// ────────────────────────────── stat e slot ────────────────────────────────

/**
 * Stat derivate: base della razza + incremento della Via per ogni livello oltre
 * il primo. Restituisce `null` sui valori di razza non ancora definiti.
 */
export function computeStats(
  catalog: Catalog,
  raceKey: string | null,
  viaKey: string | null,
  level: number,
): Stats {
  const race = raceByKey(catalog, raceKey);
  const via = viaByKey(catalog, viaKey);
  const levels = Math.max(0, level - 1);

  const derive = (base: number | null | undefined, perLevel: number | undefined) =>
    base == null ? null : base + (perLevel ?? 0) * levels;

  return {
    hp: derive(race?.base_hp, via?.per_level_hp),
    mana: derive(race?.base_mana, via?.per_level_mana),
    speed: derive(race?.base_speed, via?.per_level_speed),
  };
}

/** Slot già spesi nello step 5. */
export function spentSlots(points: DisciplinePoints): number {
  return Object.values(points).reduce(
    (total, value) => total + (Number.isFinite(value) ? value : 0),
    0,
  );
}

export function remainingSlots(catalog: Catalog, points: DisciplinePoints): number {
  return catalog.disciplineSlotBudget - spentSlots(points);
}

/**
 * Normalizza un `discipline_points` che arriva dal DB (`Json`) o dal client:
 * tiene solo le chiavi con un intero positivo.
 */
export function parseDisciplinePoints(value: unknown): DisciplinePoints {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const points: DisciplinePoints = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) points[key] = raw;
  }
  return points;
}

// ────────────────────────── normalizzazione payload ────────────────────────

/** Campi del payload che devono essere stringhe. */
const REQUIRED_STRING_FIELDS = [
  "name",
  "race_key",
  "stirpe_key",
  "gender_key",
  "via_key",
  "attack_key",
  "defense_key",
  "reaction_key",
  "alignment_key",
  "morality_key",
] as const;

/**
 * Ripulisce il payload che arriva dalla server action.
 *
 * I tipi TypeScript spariscono al confine di rete: l'argomento di una server
 * action è controllato dal chiamante, quindi la forma va verificata a runtime.
 * Gli assi del carattere mancanti prendono il default del catalogo, così le
 * colonne `trait_*` non restano mai NULL su un personaggio completato.
 * Ritorna `null` se il payload non è nemmeno della forma giusta.
 */
export function normalizeCharacterInput(
  catalog: Catalog,
  input: unknown,
): CharacterInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  if (!REQUIRED_STRING_FIELDS.every((field) => typeof raw[field] === "string")) {
    return null;
  }

  const provided =
    raw.traits && typeof raw.traits === "object" && !Array.isArray(raw.traits)
      ? (raw.traits as Record<string, unknown>)
      : {};

  const traits: Record<string, number> = {};
  for (const trait of supportedTraits(catalog)) {
    const value = provided[trait.key];
    traits[trait.key] = typeof value === "number" ? value : trait.default_value;
  }

  const fields = Object.fromEntries(
    REQUIRED_STRING_FIELDS.map((field) => [field, raw[field] as string]),
  ) as Pick<CharacterInput, (typeof REQUIRED_STRING_FIELDS)[number]>;

  return {
    ...fields,
    name: fields.name.trim(),
    traits,
    discipline_points: parseDisciplinePoints(raw.discipline_points),
  };
}

// ─────────────────────────────── validazione ───────────────────────────────

/**
 * Regole dello step 5 che il DB non può esprimere: discipline esistenti e
 * sbloccate dalla Via scelta, punti interi positivi, budget non sforato.
 */
export function validateDisciplinePoints(
  catalog: Catalog,
  viaKey: string | null,
  points: DisciplinePoints,
): string[] {
  const problems: string[] = [];
  const allowed = allowedDisciplineKeys(catalog, viaKey);

  for (const [key, value] of Object.entries(points)) {
    if (!allowed.has(key)) {
      const discipline = disciplineByKey(catalog, key);
      problems.push(
        `La disciplina "${discipline?.name ?? key}" non è disponibile per questa Via.`,
      );
    }
    if (!Number.isInteger(value) || value < 0) {
      problems.push(`I punti di "${key}" devono essere un intero non negativo.`);
    }
  }

  const spent = spentSlots(points);
  if (spent > catalog.disciplineSlotBudget) {
    problems.push(
      `Hai speso ${spent} slot su ${catalog.disciplineSlotBudget} disponibili.`,
    );
  }

  return problems;
}

/**
 * Validazione completa del payload prima dell'INSERT. Le stesse regole che la
 * UI applica step per step, riverificate lato server: il client non è fidato.
 * Ritorna la lista dei problemi (vuota = valido).
 */
export function validateCharacterInput(
  catalog: Catalog,
  input: CharacterInput,
): string[] {
  const problems: string[] = [];

  const name = input.name.trim();
  if (name.length === 0) problems.push("Il nome del personaggio è obbligatorio.");
  if (name.length > NAME_MAX_LENGTH) {
    problems.push(`Il nome non può superare i ${NAME_MAX_LENGTH} caratteri.`);
  }

  const race = raceByKey(catalog, input.race_key);
  if (!race) {
    problems.push("La razza selezionata non esiste.");
  } else if (!race.stirpi.some((stirpe) => stirpe.key === input.stirpe_key)) {
    problems.push(`La stirpe selezionata non appartiene alla razza ${race.name}.`);
  }

  if (!viaByKey(catalog, input.via_key)) {
    problems.push("La Via selezionata non esiste.");
  }

  for (const { category, field } of CHOICE_FIELDS) {
    if (!optionByKey(catalog, category, input[field])) {
      const title = categoryByKey(catalog, category)?.title ?? category;
      problems.push(`La scelta "${title}" non è valida.`);
    }
  }

  const traits = supportedTraits(catalog);
  const supported = new Set(traits.map((trait) => trait.key));
  for (const [key, value] of Object.entries(input.traits)) {
    if (!supported.has(key)) {
      problems.push(`L'asse del carattere "${key}" non esiste.`);
      continue;
    }
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      problems.push(`L'asse "${key}" deve essere un intero tra 0 e 100.`);
    }
  }

  // Un personaggio completato deve avere tutti gli assi: le colonne trait_*
  // sono nullable e il vincolo del DB non le copre.
  for (const trait of traits) {
    if (!(trait.key in input.traits)) {
      problems.push(
        `L'asse "${trait.left_label} · ${trait.right_label}" è obbligatorio.`,
      );
    }
  }

  problems.push(
    ...validateDisciplinePoints(catalog, input.via_key, input.discipline_points),
  );

  // La regola "spendi tutti gli slot" vale anche qui, non solo nella UI:
  // la server action è un endpoint pubblico.
  const spent = spentSlots(input.discipline_points);
  if (spent < catalog.disciplineSlotBudget) {
    problems.push(
      `Devi assegnare tutti i ${catalog.disciplineSlotBudget} slot disciplina (assegnati: ${spent}).`,
    );
  }

  return problems;
}
