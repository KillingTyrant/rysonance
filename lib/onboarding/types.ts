import type { Database } from "@/lib/supabase/database.types";

/**
 * Riga di una tabella, dai tipi generati da Supabase. Definito qui e solo qui:
 * è l'unico punto in cui il resto dell'app tocca `database.types.ts`.
 */
type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// ──────────────────────────── Enum del dominio ──────────────────────────────

export type Sesso = Database["public"]["Enums"]["sesso"];

/**
 * Il sesso è un enum del DB, non catalogo: le etichette non arrivano da una
 * query. È l'unico testo di gioco che sta nel codice invece che in
 * `supabase/seeds`.
 */
export const SESSI: readonly { key: Sesso; name: string }[] = [
  { key: "maschio", name: "M" },
  { key: "femmina", name: "F" },
] as const;

// ──────────────────────────────── Catalogo ──────────────────────────────────

/**
 * `kind` dice da dove arriva il talento: 'razza' | 'tribu' | 'via' lo porta una
 * scelta del wizard, 'scelta' lo aggiunge l'utente nel proprio step.
 *
 * `scuola` / `disciplina` / `ramo` sono valorizzate solo per i talenti a
 * scelta e sono etichette, non una gerarchia: servono a cercare e raggruppare
 * fra 254 opzioni, non a navigarle.
 */
export type Talento = Pick<
  Row<"talenti">,
  "key" | "name" | "description" | "kind" | "scuola" | "disciplina" | "ramo"
>;

export type Tribu = Pick<
  Row<"tribu">,
  "key" | "razza_key" | "name" | "description" | "base_speed" | "sort_order"
> & { talento: Talento | null };

export type Razza = Pick<
  Row<"razze">,
  "key" | "name" | "description" | "sort_order"
> & {
  talento: Talento | null;
  tribu: Tribu[];
};

export type Sottovia = Pick<
  Row<"sottovie">,
  "key" | "via_key" | "level" | "name" | "description"
> & { talento: Talento | null };

export type Via = Pick<Row<"vie">, "key" | "name" | "description" | "sort_order"> & {
  /** Ordinate per livello; quella di livello 0 apre la via. */
  sottovie: Sottovia[];
  /**
   * Quanti talenti a scelta IN PIÙ concede la via, letti da
   * `talenti.properties.talenti_scelta_extra` del talento di livello 0: è così
   * che "giusta scelta" del Viandante ne dà tre invece di due.
   */
  talenti_extra: number;
};

/**
 * Il catalogo di gioco, già ricomposto secondo le relazioni del DB. Non
 * descrive la UI: il wizard lo interroga, non è definito da esso.
 */
export type Catalog = {
  vie: Via[];
  razze: Razza[];
  /**
   * I talenti `kind = 'scelta'`: gli unici che l'utente prende da sé, in un
   * elenco piatto. Gli altri non stanno qui — arrivano dalla razza, dalla tribù
   * e dalla via che li portano.
   */
  talentiScelta: Talento[];
};

// ─────────────────────────────── Personaggio ────────────────────────────────

/** Un personaggio salvato, con i talenti scelti già uniti. */
export type Personaggio = Pick<
  Row<"personaggi">,
  | "id"
  | "name"
  | "sesso"
  | "via_key"
  | "razza_key"
  | "tribu_key"
  | "speed"
  | "created_at"
> & {
  /** Chiavi dei talenti scelti dall'utente. */
  talenti: string[];
};

/**
 * Le scelte in corso nel wizard, e il payload che il client manda alla server
 * action: è lo stesso oggetto, quindi esiste una sola definizione di "valido"
 * (vedi `validateDraft`). I campi non ancora compilati sono `null`.
 */
export type PersonaggioDraft = {
  name: string;
  sesso: Sesso | null;
  via_key: string | null;
  razza_key: string | null;
  tribu_key: string | null;
  /** Chiavi dei talenti scelti: quanti ne servono lo dice la Via. */
  talenti: string[];
};

/** Esito del salvataggio, restituito dalla server action al wizard. */
export type SavePersonaggioResult =
  | { ok: true; personaggio: Personaggio }
  | { ok: false; message: string; problems?: string[] };
