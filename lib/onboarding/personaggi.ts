import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import { getCatalog } from "./catalog";
import type { Personaggio, SavePersonaggioResult } from "./types";
import { parseDraft, validateDraft } from "./validate";

/**
 * Colonne del personaggio più Caratteristiche, tendenze e talenti scelti, in
 * una sola query. Deve restare un unico literal su una riga: supabase-js deriva
 * il tipo del risultato dal testo del select, e una concatenazione lo degrada a
 * `string`.
 */
const PERSONAGGIO_SELECT =
  "id, name, sesso, via_key, razza_key, tribu_key, bonus_caratteristica_key, attacco, difesa, hp, mana, speed, created_at, personaggio_caratteristiche(caratteristica_key, value), personaggio_tendenze(tendenza_key, value), personaggio_talenti(talent_key)";

type PersonaggioRow = Omit<
  Personaggio,
  "caratteristiche" | "tendenze" | "talenti"
> & {
  personaggio_caratteristiche: { caratteristica_key: string; value: number }[];
  personaggio_tendenze: { tendenza_key: string; value: number }[];
  personaggio_talenti: { talent_key: string }[];
};

/**
 * Personaggi dell'utente corrente, dal più recente. Il filtro per proprietario
 * lo fa RLS: senza sessione la query non restituisce righe.
 */
export async function listPersonaggi(): Promise<Personaggio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personaggi")
    .select(PERSONAGGIO_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PersonaggioRow[]).map(toPersonaggio);
}

/**
 * Crea il personaggio del wizard.
 *
 * L'argomento è `unknown` di proposito: una server action è un endpoint
 * pubblico e la forma del payload va verificata a runtime, non con i tipi. La
 * validazione usa la stessa `validateDraft` del client, così le due non possono
 * divergere; la scrittura vera passa dalla RPC `crea_personaggio`, che è il
 * confine transazionale fra le due tabelle e decide da sé `user_id`, le
 * statistiche e i valori delle tendenze.
 */
export async function creaPersonaggio(
  input: unknown,
): Promise<SavePersonaggioResult> {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims?.sub) {
    return {
      ok: false,
      message: "Sessione scaduta: accedi di nuovo per salvare il personaggio.",
    };
  }

  const draft = parseDraft(input);
  if (!draft) {
    return {
      ok: false,
      message: "Dati del personaggio non validi. Ricarica la pagina e riprova.",
    };
  }

  const catalog = await getCatalog();
  const problems = validateDraft(catalog, draft);
  if (problems.length > 0) {
    return {
      ok: false,
      message: "Alcune scelte non sono valide.",
      problems: problems.map((problem) => problem.message),
    };
  }

  const { data: id, error } = await supabase.rpc("crea_personaggio", {
    p_name: draft.name,
    // validateDraft ha già scartato i null: qui i campi sono per forza pieni.
    p_sesso: draft.sesso!,
    p_via_key: draft.via_key!,
    p_razza_key: draft.razza_key!,
    p_tribu_key: draft.tribu_key!,
    // I punti distribuiti, senza il +1: il bonus lo somma la RPC, che scrive i
    // valori finali e ne ricava PF e Mana.
    p_caratteristiche: draft.caratteristiche,
    p_bonus_caratteristica: draft.bonus_caratteristica_key!,
    p_attacco: draft.attacco!,
    p_difesa: draft.difesa!,
    p_talenti: draft.talenti,
    p_tendenze: draft.tendenze,
  });

  if (error) return { ok: false, message: describeError(error) };

  const { data, error: readError } = await supabase
    .from("personaggi")
    .select(PERSONAGGIO_SELECT)
    .eq("id", id)
    .single();

  // Il personaggio esiste comunque: è solo la rilettura ad aver fallito.
  if (readError) {
    return {
      ok: false,
      message:
        "Il personaggio è stato creato, ma non è stato possibile rileggerlo. Vai alla lobby.",
    };
  }

  return { ok: true, personaggio: toPersonaggio(data as PersonaggioRow) };
}

function toPersonaggio({
  personaggio_caratteristiche,
  personaggio_tendenze,
  personaggio_talenti,
  ...row
}: PersonaggioRow): Personaggio {
  return {
    ...row,
    caratteristiche: Object.fromEntries(
      personaggio_caratteristiche.map(({ caratteristica_key, value }) => [
        caratteristica_key,
        value,
      ]),
    ),
    tendenze: Object.fromEntries(
      personaggio_tendenze.map(({ tendenza_key, value }) => [tendenza_key, value]),
    ),
    talenti: personaggio_talenti.map(({ talent_key }) => talent_key),
  };
}

/**
 * PostgREST non espone il nome del vincolo in un campo strutturato: sta solo
 * dentro `message`. Questi errori sono la rete di sicurezza dietro la
 * validazione — se l'utente ne vede uno, significa che il catalogo è cambiato
 * sotto i piedi di una pagina già prerenderizzata.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  personaggi_name_check: "Il nome del personaggio non è valido.",
  personaggi_razza_key_tribu_key_fkey:
    "La tribù scelta non appartiene alla razza selezionata.",
  personaggi_razza_key_bonus_caratteristica_key_fkey:
    "La razza scelta non dà il +1 su quella Caratteristica.",
  personaggi_user_id_fkey: "Il tuo account non è più valido. Accedi di nuovo.",
  personaggio_talenti_talent_key_talent_kind_fkey:
    "Uno dei talenti scelti non è più fra quelli disponibili.",
  personaggio_talenti_pkey: "Hai scelto due volte lo stesso talento.",
};

function describeError(error: PostgrestError): string {
  const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1];
  if (constraint && CONSTRAINT_MESSAGES[constraint]) {
    return CONSTRAINT_MESSAGES[constraint];
  }

  switch (error.code) {
    case "23503": // foreign_key_violation, incluso il raise di crea_personaggio
      return "Una delle scelte non esiste più nel catalogo. Ricarica la pagina.";
    case "23514": // check_violation, incluso il trigger sulle tendenze
      return "Uno dei valori scelti è fuori dai limiti consentiti.";
    case "42501":
      return "Non hai i permessi per salvare questo personaggio. Accedi di nuovo.";
    case "PGRST202":
    case "PGRST204":
      return "L'app non è allineata al database. Ricarica la pagina.";
    default:
      return "Non è stato possibile salvare il personaggio. Riprova tra poco.";
  }
}
