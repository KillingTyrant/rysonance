import type { Database } from "@/lib/supabase/database.types";

/**
 * Riga di una tabella, dai tipi generati da Supabase. Definito qui e solo qui:
 * è l'unico punto in cui il resto dell'app tocca `database.types.ts`.
 */
type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// ──────────────────────────── Enum del dominio ──────────────────────────────

export type Sesso = Database["public"]["Enums"]["sesso"];
export type Stile = Database["public"]["Enums"]["stile"];

/**
 * Sesso e stile di combattimento sono enum del DB, non catalogo: le etichette
 * non arrivano da una query. Sono gli unici testi di gioco che stanno nel
 * codice invece che in `supabase/seeds`.
 */
export const SESSI: readonly { key: Sesso; name: string }[] = [
  { key: "maschio", name: "M" },
  { key: "femmina", name: "F" },
] as const;

export const STILI: readonly { key: Stile; name: string }[] = [
  { key: "fisico", name: "Fisico" },
  { key: "magico", name: "Magico" },
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

/**
 * Una Caratteristica Base. `hp_per_punto` e `mana_per_punto` sono gli unici
 * effetti già modellati — quelli che decidono PF e Mana di partenza — e stanno
 * nel catalogo apposta: né il wizard né la RPC devono conoscere le chiavi
 * 'vigore' ed 'empatia_arcana'.
 */
export type Caratteristica = Pick<
  Row<"caratteristiche">,
  "key" | "name" | "description" | "hp_per_punto" | "mana_per_punto" | "sort_order"
>;

export type Tendenza = Pick<
  Row<"tendenze">,
  | "key"
  | "type"
  | "name"
  | "description"
  | "min_label"
  | "min_value"
  | "max_label"
  | "max_value"
  | "sort_order"
> & {
  /**
   * Metà fra i due poli. È una colonna generata, che i tipi generati dichiarano
   * nullable: `getCatalog` normalizza il null una volta per tutte.
   */
  default_value: number;
};

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
  /** Le Caratteristiche su cui questa razza può dare il suo +1. */
  caratteristiche: Caratteristica[];
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
  caratteristiche: Caratteristica[];
  tendenze: Tendenza[];
  /**
   * I talenti `kind = 'scelta'`: gli unici che l'utente prende da sé, in un
   * elenco piatto. Gli altri non stanno qui — arrivano dalla razza, dalla tribù
   * e dalla via che li portano.
   */
  talentiScelta: Talento[];
};

// ─────────────────────────────── Personaggio ────────────────────────────────

export type Stats = {
  hp: number;
  mana: number;
  speed: number | null;
};

/** Un personaggio salvato, con caratteristiche, talenti e tendenze già uniti. */
export type Personaggio = Pick<
  Row<"personaggi">,
  | "id"
  | "name"
  | "sesso"
  | "via_key"
  | "razza_key"
  | "tribu_key"
  | "bonus_caratteristica_key"
  | "attacco"
  | "difesa"
  | "hp"
  | "mana"
  | "speed"
  | "created_at"
> & {
  /** Chiave della Caratteristica → valore finale (punti spesi + bonus). */
  caratteristiche: Record<string, number>;
  /** Chiave della tendenza → valore scelto. */
  tendenze: Record<string, number>;
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
  /**
   * Chiave della Caratteristica → punti DISTRIBUITI dal giocatore, senza il +1
   * della razza. È la stessa forma che si manda alla RPC, che ci somma il bonus
   * e scrive i valori finali: il totale sta scritto in un posto solo.
   */
  caratteristiche: Record<string, number>;
  bonus_caratteristica_key: string | null;
  attacco: Stile | null;
  difesa: Stile | null;
  /** Chiavi dei talenti scelti: quanti ne servono lo dice la Via. */
  talenti: string[];
  /** Chiave della tendenza → valore. Parte dai `default_value` del catalogo. */
  tendenze: Record<string, number>;
};

/** Esito del salvataggio, restituito dalla server action al wizard. */
export type SavePersonaggioResult =
  | { ok: true; personaggio: Personaggio }
  | { ok: false; message: string; problems?: string[] };
