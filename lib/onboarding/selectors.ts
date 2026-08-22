import type {
  Catalog,
  Personaggio,
  PersonaggioDraft,
  Razza,
  Sesso,
  Talento,
  Tribu,
  Via,
} from "./types";
import { SESSI } from "./types";

/**
 * Quanti talenti a scelta dà una via prima dei suoi bonus. Allineato al 2 di
 * `public.talenti_a_scelta`: se cambia, cambia in tutti e due.
 */
export const TALENTI_SCELTI_BASE = 2;

// ─────────────────────────────── Lookup ─────────────────────────────────────

export function viaByKey(catalog: Catalog, key: string | null): Via | null {
  return catalog.vie.find((via) => via.key === key) ?? null;
}

export function razzaByKey(catalog: Catalog, key: string | null): Razza | null {
  return catalog.razze.find((razza) => razza.key === key) ?? null;
}

export function tribuByKey(catalog: Catalog, key: string | null): Tribu | null {
  if (!key) return null;
  for (const razza of catalog.razze) {
    const found = razza.tribu.find((tribu) => tribu.key === key);
    if (found) return found;
  }
  return null;
}

/** Cerca solo fra i talenti a scelta: gli altri non si possono scegliere. */
export function talentoSceltaByKey(
  catalog: Catalog,
  key: string | null,
): Talento | null {
  return catalog.talentiScelta.find((talento) => talento.key === key) ?? null;
}

/**
 * "i Nani" ma "gli Umani": l'articolo plurale maschile dipende dall'iniziale
 * del nome. Serve a comporre anche le preposizioni — "a" + articolo dà "ai" o
 * "agli", "de" + articolo dà "dei" o "degli".
 *
 * Nessun nome di razza comincia per z o s+consonante, ma la regola completa
 * costa una riga e non lascia trappole a chi aggiungerà una razza.
 */
export function articolo(nome: string): "i" | "gli" {
  return /^([aeiou]|z|s[bcdfglmnpqrtv]|gn|ps|x|y)/i.test(nome) ? "gli" : "i";
}

export function sessoName(sesso: Sesso | null): string | null {
  return SESSI.find((item) => item.key === sesso)?.name ?? null;
}

// ─────────────────────────────── Derivazioni ────────────────────────────────

/**
 * Il talento con cui la via comincia: quello della sottovia di livello 0,
 * unica per `unique (via_key, level)`.
 */
export function talentoIniziale(via: Via | null): Talento | null {
  return via?.sottovie.find((sottovia) => sottovia.level === 0)?.talento ?? null;
}

/** Quanti talenti deve scegliere chi percorre questa via. */
export function talentiDaScegliere(via: Via | null): number {
  return TALENTI_SCELTI_BASE + (via?.talenti_extra ?? 0);
}

/**
 * Una razza è giocabile se ha almeno una tribù: senza, non ci sarebbe niente
 * da scegliere nella sua card e il personaggio non sarebbe salvabile (lo
 * rifiuterebbe la FK composta di `personaggi`).
 */
export function isRazzaGiocabile(razza: Razza): boolean {
  return razza.tribu.length > 0;
}

/** Tutti i talenti che il personaggio NON sceglie: razza, tribù, apertura della via. */
export function talentiAssegnati(
  razza: Razza | null,
  tribu: Tribu | null,
  via: Via | null,
): Talento[] {
  return [razza?.talento, tribu?.talento, talentoIniziale(via)].filter(
    (talento): talento is Talento => talento !== null && talento !== undefined,
  );
}

// ──────────────────────────── View-model condiviso ──────────────────────────

/**
 * La forma unica su cui disegna `PersonaggioSheet`. Esiste perché il riepilogo
 * serve in tre posti che partono da sorgenti diverse (le scelte in corso nel
 * wizard, e una riga salvata nella lobby): risolvendo prima, il renderer resta
 * uno solo.
 */
export type ResolvedPersonaggio = {
  name: string;
  sesso: string | null;
  via: Via | null;
  razza: Razza | null;
  tribu: Tribu | null;
  /**
   * Assegnati (razza, tribù, via) e poi quelli scelti dall'utente. Chi disegna
   * distingue i due gruppi con `talento.kind`, senza bisogno di due liste.
   */
  talenti: Talento[];
  /** La velocità della tribù. Con base_speed NULL la scheda mostra "—". */
  speed: number | null;
};

/** Le scelte in corso: la velocità è quella della tribù scelta. */
export function resolveDraft(
  catalog: Catalog,
  draft: PersonaggioDraft,
): ResolvedPersonaggio {
  return resolve(catalog, draft);
}

/**
 * Un personaggio salvato: la velocità è lo snapshot scritto alla creazione,
 * non quella corrente del catalogo — che può essere cambiato nel frattempo.
 */
export function resolveRow(
  catalog: Catalog,
  personaggio: Personaggio,
): ResolvedPersonaggio {
  return {
    ...resolve(catalog, personaggio),
    speed: personaggio.speed,
  };
}

function resolve(
  catalog: Catalog,
  scelte: PersonaggioDraft | Personaggio,
): ResolvedPersonaggio {
  const via = viaByKey(catalog, scelte.via_key);
  const razza = razzaByKey(catalog, scelte.razza_key);
  const tribu = tribuByKey(catalog, scelte.tribu_key);

  return {
    name: scelte.name,
    sesso: sessoName(scelte.sesso),
    via,
    razza,
    tribu,
    talenti: [
      ...talentiAssegnati(razza, tribu, via),
      // Si itera sulle scelte, non sul catalogo: l'ordine è quello in cui sono
      // state fatte. Una chiave sconosciuta semplicemente sparisce.
      ...scelte.talenti
        .map((key) => talentoSceltaByKey(catalog, key))
        .filter((talento): talento is Talento => talento !== null),
    ],
    speed: tribu?.base_speed ?? null,
  };
}
