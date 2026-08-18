import {
  articolo,
  isRazzaGiocabile,
  puntiResidui,
  razzaByKey,
  talentiDaScegliere,
  talentoSceltaByKey,
  tribuByKey,
  valoriCaratteristiche,
  viaByKey,
} from "./selectors";
import type { Catalog, PersonaggioDraft, Sesso, Stile } from "./types";
import { SESSI, STILI } from "./types";

/** Allineato al check `personaggi_name_check`. */
export const NAME_MAX_LENGTH = 40;

/**
 * Le due regole della distribuzione iniziale, allineate a `crea_personaggio`:
 * se cambiano, cambiano in tutti e due. Il +1 della razza è in più rispetto a
 * PUNTI_CARATTERISTICHE, ma concorre al tetto.
 */
export const PUNTI_CARATTERISTICHE = 4;
export const CARATTERISTICA_MAX = 3;

/** I campi del draft su cui può esistere un problema. */
export type DraftField =
  | "name"
  | "sesso"
  | "via_key"
  | "razza_key"
  | "tribu_key"
  | "caratteristiche"
  | "bonus_caratteristica_key"
  | "attacco"
  | "difesa"
  | "talenti"
  | "tendenze";

export type Problem = {
  field: DraftField;
  /** Etichetta breve, per l'elenco "Manca: …" accanto al bottone Avanti. */
  label: string;
  /** Frase completa, per il riepilogo e per la server action. */
  message: string;
};

/**
 * Le tendenze partono dal loro valore di mezzo, come farebbe il DB, e le
 * Caratteristiche da zero: così nessuna scelta è implicita e i 4 punti sono
 * tutti da distribuire.
 */
export function emptyDraft(catalog: Catalog): PersonaggioDraft {
  return {
    name: "",
    sesso: null,
    via_key: null,
    razza_key: null,
    tribu_key: null,
    caratteristiche: Object.fromEntries(
      catalog.caratteristiche.map((caratteristica) => [caratteristica.key, 0]),
    ),
    bonus_caratteristica_key: null,
    attacco: null,
    difesa: null,
    talenti: [],
    tendenze: Object.fromEntries(
      catalog.tendenze.map((tendenza) => [tendenza.key, tendenza.default_value]),
    ),
  };
}

/**
 * Porta un payload arrivato dalla rete alla forma di un draft. Solo
 * coercizione: qui non si decide se le scelte sono valide (lo fa
 * `validateDraft`), si decide soltanto che tipo hanno. Una server action è un
 * endpoint pubblico e i tipi TypeScript non sopravvivono al confine di rete.
 */
export function parseDraft(input: unknown): PersonaggioDraft | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  // I duplicati vengono tolti qui: sono una forma sbagliata del payload, non
  // una scelta sbagliata (la PK di personaggio_talenti li rifiuterebbe comunque).
  const talenti = Array.isArray(raw.talenti)
    ? [...new Set(raw.talenti.filter((key): key is string => typeof key === "string"))]
    : [];

  return {
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    sesso: SESSI.some((item) => item.key === raw.sesso) ? (raw.sesso as Sesso) : null,
    via_key: asKey(raw.via_key),
    razza_key: asKey(raw.razza_key),
    tribu_key: asKey(raw.tribu_key),
    caratteristiche: asNumbers(raw.caratteristiche),
    bonus_caratteristica_key: asKey(raw.bonus_caratteristica_key),
    attacco: asStile(raw.attacco),
    difesa: asStile(raw.difesa),
    talenti,
    tendenze: asNumbers(raw.tendenze),
  };
}

/**
 * L'unica definizione di "personaggio valido" dell'applicazione.
 *
 * È organizzata per CAMPO, non per step: gli step sono una vista sui campi
 * (`lib/onboarding/steps.ts`). Per questo il bottone "Avanti", l'elenco di
 * cosa manca, le spunte dello stepper e il controllo della server action sono
 * tutti derivazioni di questa lista, e non possono divergere fra loro.
 */
export function validateDraft(
  catalog: Catalog,
  draft: PersonaggioDraft,
): Problem[] {
  const problems: Problem[] = [];
  const add = (field: DraftField, label: string, message: string) =>
    problems.push({ field, label, message });

  // I controlli seguono l'ordine degli step: è quello in cui il riepilogo
  // elenca i problemi, e leggere questa funzione dev'essere come ripercorrere
  // il wizard.

  // ── chi è: nome, sesso, razza e tribù ─────────────────────────────────────
  const name = draft.name.trim();
  if (name.length === 0) {
    add("name", "Nome", "Il personaggio deve avere un nome.");
  } else if (name.length > NAME_MAX_LENGTH) {
    add("name", "Nome", `Il nome non può superare i ${NAME_MAX_LENGTH} caratteri.`);
  }

  if (!draft.sesso) {
    add("sesso", "Sesso", "Scegli il sesso del personaggio.");
  }

  const razza = razzaByKey(catalog, draft.razza_key);
  if (!razza) {
    add("razza_key", "Razza", "Scegli una razza.");
  } else if (!isRazzaGiocabile(razza)) {
    add(
      "razza_key",
      "Razza",
      `${maiuscola(articolo(razza.name))} ${razza.name} non sono ancora giocabili.`,
    );
  }

  const tribu = tribuByKey(catalog, draft.tribu_key);
  if (!tribu) {
    add("tribu_key", "Tribù", "Scegli una tribù.");
  } else if (razza && tribu.razza_key !== razza.key) {
    add(
      "tribu_key",
      "Tribù",
      `${tribu.name} non appartiene a${articolo(razza.name)} ${razza.name}.`,
    );
  }

  // ── la Via ────────────────────────────────────────────────────────────────
  const via = viaByKey(catalog, draft.via_key);
  if (!via) {
    add("via_key", "Via", "Scegli la Via dell'eroe.");
  }

  // ── Caratteristiche Base ──────────────────────────────────────────────────
  const valori = valoriCaratteristiche(catalog, draft);
  const residui = puntiResidui(draft, PUNTI_CARATTERISTICHE);

  if (valori.some(({ punti }) => !Number.isInteger(punti) || punti < 0)) {
    add(
      "caratteristiche",
      "Caratteristiche",
      "I punti Caratteristica devono essere numeri interi non negativi.",
    );
  } else if (residui > 0) {
    add(
      "caratteristiche",
      "Caratteristiche",
      `Ti resta${residui === 1 ? "" : "no"} ${residui} punt${residui === 1 ? "o" : "i"} Caratteristica da distribuire.`,
    );
  } else if (residui < 0) {
    add(
      "caratteristiche",
      "Caratteristiche",
      `Hai distribuito ${-residui} punt${residui === -1 ? "o" : "i"} in più dei ${PUNTI_CARATTERISTICHE} disponibili.`,
    );
  }

  const sopraIlTetto = valori.filter(({ value }) => value > CARATTERISTICA_MAX);
  if (sopraIlTetto.length > 0) {
    add(
      "caratteristiche",
      "Caratteristiche",
      `Alla creazione nessuna Caratteristica può superare ${CARATTERISTICA_MAX}: ${sopraIlTetto
        .map(({ caratteristica }) => caratteristica.name)
        .join(", ")}.`,
    );
  }

  // Il +1 dev'essere su una delle Caratteristiche della razza scelta: è lo
  // stesso vincolo della FK composta (razza_key, bonus_caratteristica_key).
  if (!draft.bonus_caratteristica_key) {
    add(
      "bonus_caratteristica_key",
      "Bonus di razza",
      "Scegli su quale Caratteristica mettere il +1 della razza.",
    );
  } else if (
    razza &&
    !razza.caratteristiche.some((c) => c.key === draft.bonus_caratteristica_key)
  ) {
    add(
      "bonus_caratteristica_key",
      "Bonus di razza",
      `${maiuscola(articolo(razza.name))} ${razza.name} non danno il +1 su quella Caratteristica.`,
    );
  }

  // ── attacco e difesa ──────────────────────────────────────────────────────
  if (!draft.attacco) {
    add("attacco", "Attacco", "Scegli se attacchi in modo fisico o magico.");
  }
  if (!draft.difesa) {
    add("difesa", "Difesa", "Scegli se ti difendi in modo fisico o magico.");
  }

  // ── talenti: quanti ne servono lo dice la Via, nessun altro vincolo ────────
  const sconosciuti = draft.talenti.filter((key) => !talentoSceltaByKey(catalog, key));
  const attesi = talentiDaScegliere(via);
  if (sconosciuti.length > 0) {
    add(
      "talenti",
      "Talenti",
      `Non esiste nessun talento scegliibile con chiave "${sconosciuti[0]}".`,
    );
  } else if (draft.talenti.length !== attesi) {
    const mancanti = attesi - draft.talenti.length;
    add(
      "talenti",
      "Talenti",
      mancanti > 0
        ? `Scegli ${attesi} talenti: ne manca${mancanti === 1 ? "" : "no"} ${mancanti}.`
        : `Puoi scegliere solo ${attesi} talenti.`,
    );
  }

  // ── carattere ─────────────────────────────────────────────────────────────
  // Si itera sul catalogo: una chiave in più nel payload viene semplicemente
  // ignorata (la RPC ricostruisce le righe dal catalogo), una in meno o fuori
  // scala è un problema.
  for (const tendenza of catalog.tendenze) {
    const value = draft.tendenze[tendenza.key];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      add("tendenze", "Carattere", `Manca un valore per "${tendenza.name}".`);
    } else if (value < tendenza.min_value || value > tendenza.max_value) {
      add(
        "tendenze",
        "Carattere",
        `"${tendenza.name}" deve stare fra ${tendenza.min_value} e ${tendenza.max_value}.`,
      );
    }
  }

  return problems;
}

function maiuscola(parola: string): string {
  return parola[0].toUpperCase() + parola.slice(1);
}

function asKey(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStile(value: unknown): Stile | null {
  return STILI.some((item) => item.key === value) ? (value as Stile) : null;
}

function asNumbers(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof value === "object" && value !== null) {
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw === "number" && Number.isFinite(raw)) out[key] = Math.round(raw);
    }
  }
  return out;
}
