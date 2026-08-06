import type { Database } from "@/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Talent = Row<"talents">;
export type Discipline = Row<"disciplines">;
export type WizardOption = Row<"wizard_options">;
export type CharacterTrait = Row<"character_traits">;

export type DisciplineGroup = Row<"discipline_groups"> & {
  disciplines: Discipline[];
};

export type Stirpe = Row<"stirpi"> & { talent: Talent | null };

export type Race = Row<"races"> & {
  racialTalent: Talent | null;
  stirpi: Stirpe[];
};

export type Via = Row<"vie"> & {
  firstTalent: Talent | null;
  disciplineGroupKeys: string[];
};

export type WizardCategory = Row<"wizard_categories"> & {
  options: WizardOption[];
};

/**
 * Catalogo completo del wizard, già ricomposto secondo le relazioni del DB:
 * razza → stirpi, via → gruppi di discipline, categoria → opzioni.
 */
export type Catalog = {
  races: Race[];
  vie: Via[];
  disciplineGroups: DisciplineGroup[];
  /** Categorie a scelta singola (sesso, stile, tendenza), ordinate per step. */
  categories: WizardCategory[];
  /** Assi del carattere dello step 4 (slider 0..100). */
  traits: CharacterTrait[];
  talents: Talent[];
  /** Slot disciplina distribuibili nello step 5. */
  disciplineSlotBudget: number;
};

/** Punti spesi per disciplina: `{ "acqua": 1, "armi_furtive": 4 }`. */
export type DisciplinePoints = Record<string, number>;

export type Stats = {
  hp: number | null;
  mana: number | null;
  speed: number | null;
};

export type Character = Row<"characters">;

/** Esito del salvataggio, restituito dalla server action al wizard. */
export type SaveCharacterResult =
  | { ok: true; character: Character }
  | { ok: false; message: string; problems?: string[] };

/**
 * Payload che il wizard manda alla server action. Tutti i campi obbligatori:
 * un personaggio si salva solo completo (vedi `characters_completed_required`).
 */
export type CharacterInput = {
  name: string;
  race_key: string;
  stirpe_key: string;
  gender_key: string;
  via_key: string;
  attack_key: string;
  defense_key: string;
  reaction_key: string;
  alignment_key: string;
  morality_key: string;
  /** Chiave dell'asse (`trait_social`, …) → valore 0..100. */
  traits: Record<string, number>;
  discipline_points: DisciplinePoints;
};
