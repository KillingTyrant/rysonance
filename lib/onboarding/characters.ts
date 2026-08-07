import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import { getCatalog } from "./catalog";
import {
  computeStats,
  isTraitColumn,
  normalizeCharacterInput,
  validateCharacterInput,
} from "./rules";
import type { TraitColumn } from "./rules";
import type { Character, SaveCharacterResult } from "./types";

/** Livello di partenza di un personaggio appena creato. */
const STARTING_LEVEL = 1;

/**
 * Personaggi dell'utente corrente, dal più recente. Il filtro per proprietario
 * lo fa RLS: senza sessione la query non restituisce righe.
 */
export async function listCharacters(): Promise<Character[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Salva il personaggio completo del wizard con un solo INSERT.
 *
 * L'argomento è `unknown` di proposito: una server action è un endpoint
 * pubblico e la forma del payload va verificata a runtime, non con i tipi.
 * `user_id` viene dal JWT e mai dal client (RLS pretende `auth.uid()`), le stat
 * sono ricalcolate dal catalogo e il payload è rivalidato: la UI non è fidata.
 * Le colonne `*_category` sono GENERATED e non vanno mai inviate — Postgres
 * rifiuta l'INSERT anche se il valore è `null`.
 */
export async function createCompletedCharacter(
  input: unknown,
): Promise<SaveCharacterResult> {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) {
    return {
      ok: false,
      message: "Sessione scaduta: accedi di nuovo per salvare il personaggio.",
    };
  }

  const catalog = await getCatalog();

  const character = normalizeCharacterInput(catalog, input);
  if (!character) {
    return {
      ok: false,
      message: "Dati del personaggio non validi. Ricarica la pagina e riprova.",
    };
  }

  const problems = validateCharacterInput(catalog, character);
  if (problems.length > 0) {
    return {
      ok: false,
      message: "Alcune scelte non sono valide.",
      problems,
    };
  }

  const traits: Partial<Record<TraitColumn, number>> = {};
  for (const [key, value] of Object.entries(character.traits)) {
    if (isTraitColumn(key)) traits[key] = value;
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      user_id: userId,
      status: "completed",
      name: character.name,
      race_key: character.race_key,
      stirpe_key: character.stirpe_key,
      gender_key: character.gender_key,
      via_key: character.via_key,
      attack_key: character.attack_key,
      defense_key: character.defense_key,
      reaction_key: character.reaction_key,
      alignment_key: character.alignment_key,
      morality_key: character.morality_key,
      discipline_points: character.discipline_points,
      level: STARTING_LEVEL,
      ...traits,
      ...computeStats(catalog, character.race_key, character.via_key, STARTING_LEVEL),
    })
    .select()
    .single();

  if (error) return { ok: false, message: describeError(error) };
  return { ok: true, character: data };
}

/**
 * PostgREST non espone il nome del vincolo in un campo strutturato: sta solo
 * dentro `message`. Questi errori sono la rete di sicurezza dietro la
 * validazione — se l'utente ne vede uno, la UI ha lasciato passare qualcosa.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  characters_completed_required:
    "Alcune scelte sono incomplete: torna indietro e completa tutti gli step.",
  characters_name_check: "Il nome del personaggio non può essere vuoto.",
  characters_discipline_points_check:
    "L'allocazione dei punti disciplina non è valida.",
  characters_level_check: "Il livello del personaggio non è valido.",
  characters_race_key_fkey: "La razza scelta non esiste più. Ricarica la pagina.",
  characters_stirpe_key_fkey: "La stirpe scelta non esiste più. Ricarica la pagina.",
  characters_race_key_stirpe_key_fkey:
    "La stirpe scelta non appartiene alla razza selezionata.",
  characters_via_key_fkey: "La Via scelta non esiste più. Ricarica la pagina.",
  characters_gender_category_gender_key_fkey: "Il sesso selezionato non è valido.",
  characters_attack_category_attack_key_fkey:
    "Lo stile di attacco selezionato non è valido.",
  characters_defense_category_defense_key_fkey:
    "Lo stile di difesa selezionato non è valido.",
  characters_reaction_category_reaction_key_fkey:
    "La reazione selezionata non è valida.",
  characters_alignment_category_alignment_key_fkey:
    "L'allineamento selezionato non è valido.",
  characters_morality_category_morality_key_fkey:
    "La moralità selezionata non è valida.",
  characters_user_id_fkey: "Il tuo account non è più valido. Accedi di nuovo.",
};

function describeError(error: PostgrestError): string {
  const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1];
  if (constraint && CONSTRAINT_MESSAGES[constraint]) {
    return CONSTRAINT_MESSAGES[constraint];
  }

  switch (error.code) {
    case "42501":
      return "Non hai i permessi per salvare questo personaggio. Accedi di nuovo.";
    case "PGRST204":
      return "L'app non è allineata al database. Ricarica la pagina.";
    default:
      return "Non è stato possibile salvare il personaggio. Riprova tra poco.";
  }
}
