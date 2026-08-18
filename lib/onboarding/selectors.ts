import type {
  Caratteristica,
  Catalog,
  Personaggio,
  PersonaggioDraft,
  Razza,
  Sesso,
  Stats,
  Stile,
  Talento,
  Tendenza,
  Tribu,
  Via,
} from "./types";
import { SESSI, STILI } from "./types";

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

export function caratteristicaByKey(
  catalog: Catalog,
  key: string | null,
): Caratteristica | null {
  return catalog.caratteristiche.find((c) => c.key === key) ?? null;
}

export function tendenzaByKey(catalog: Catalog, key: string): Tendenza | null {
  return catalog.tendenze.find((tendenza) => tendenza.key === key) ?? null;
}

/** Cerca solo fra i talenti a scelta: gli altri non sono scegliibili. */
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

export function stileName(stile: Stile | null): string | null {
  return STILI.find((item) => item.key === stile)?.name ?? null;
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
 * Il valore finale di ogni Caratteristica: i punti distribuiti più il +1 della
 * razza. Si itera sul catalogo, così l'ordine è sempre quello di `sort_order` e
 * una chiave sconosciuta nel draft non compare.
 */
export function valoriCaratteristiche(
  catalog: Catalog,
  draft: PersonaggioDraft,
): { caratteristica: Caratteristica; punti: number; bonus: boolean; value: number }[] {
  return catalog.caratteristiche.map((caratteristica) => {
    const punti = draft.caratteristiche[caratteristica.key] ?? 0;
    const bonus = draft.bonus_caratteristica_key === caratteristica.key;
    return { caratteristica, punti, bonus, value: punti + (bonus ? 1 : 0) };
  });
}

/** Quanti punti restano da distribuire. Può essere negativo se se ne spendono troppi. */
export function puntiResidui(draft: PersonaggioDraft, totale: number): number {
  return totale - Object.values(draft.caratteristiche).reduce((somma, n) => somma + n, 0);
}

/**
 * PF e Mana vengono per intero dalle Caratteristiche, con il moltiplicatore
 * scritto nel catalogo; la velocità è quella della tribù, che le Caratteristiche
 * non toccano. Con base_speed NULL il riepilogo mostra "—".
 */
export function statsDa(
  valori: { caratteristica: Caratteristica; value: number }[],
  tribu: Tribu | null,
): Stats {
  let hp = 0;
  let mana = 0;
  for (const { caratteristica, value } of valori) {
    hp += value * caratteristica.hp_per_punto;
    mana += value * caratteristica.mana_per_punto;
  }
  return { hp, mana, speed: tribu?.base_speed ?? null };
}

/**
 * Una razza è giocabile se ha almeno una tribù e almeno una Caratteristica su
 * cui dare il suo +1: senza le candidate, il terzo step non avrebbe niente da
 * mostrare e il personaggio non sarebbe salvabile (lo rifiuterebbe la FK
 * composta di `personaggi`).
 */
export function isRazzaGiocabile(razza: Razza): boolean {
  return razza.tribu.length > 0 && razza.caratteristiche.length > 0;
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
  caratteristiche: { caratteristica: Caratteristica; value: number; bonus: boolean }[];
  attacco: string | null;
  difesa: string | null;
  /**
   * Assegnati (razza, tribù, via) e poi quelli scelti dall'utente. Chi disegna
   * distingue i due gruppi con `talento.kind`, senza bisogno di due liste.
   */
  talenti: Talento[];
  stats: Stats;
  /** Solo le tendenze di catalogo, nel loro ordine. */
  tendenze: { tendenza: Tendenza; value: number }[];
};

/** Le scelte in corso: le statistiche sono derivate dai punti distribuiti. */
export function resolveDraft(
  catalog: Catalog,
  draft: PersonaggioDraft,
): ResolvedPersonaggio {
  return resolve(catalog, draft, valoriCaratteristiche(catalog, draft));
}

/**
 * Un personaggio salvato: statistiche e Caratteristiche sono lo snapshot
 * scritto alla creazione, non quelle correnti del catalogo — che può essere
 * cambiato nel frattempo.
 */
export function resolveRow(
  catalog: Catalog,
  personaggio: Personaggio,
): ResolvedPersonaggio {
  const valori = catalog.caratteristiche.map((caratteristica) => ({
    caratteristica,
    value: personaggio.caratteristiche[caratteristica.key] ?? 0,
    bonus: personaggio.bonus_caratteristica_key === caratteristica.key,
  }));

  return {
    ...resolve(catalog, personaggio, valori),
    stats: {
      hp: personaggio.hp,
      mana: personaggio.mana,
      speed: personaggio.speed,
    },
  };
}

function resolve(
  catalog: Catalog,
  scelte: PersonaggioDraft | Personaggio,
  valori: { caratteristica: Caratteristica; value: number; bonus: boolean }[],
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
    caratteristiche: valori,
    attacco: stileName(scelte.attacco),
    difesa: stileName(scelte.difesa),
    talenti: [
      ...talentiAssegnati(razza, tribu, via),
      // Si itera sulle scelte, non sul catalogo: l'ordine è quello in cui sono
      // state fatte. Una chiave sconosciuta sparisce, come per le tendenze.
      ...scelte.talenti
        .map((key) => talentoSceltaByKey(catalog, key))
        .filter((talento): talento is Talento => talento !== null),
    ],
    stats: statsDa(valori, tribu),
    // Si itera sul catalogo, non sull'oggetto: una chiave sconosciuta non
    // finisce a schermo e l'ordine è sempre quello di sort_order.
    tendenze: catalog.tendenze.map((tendenza) => ({
      tendenza,
      value: scelte.tendenze[tendenza.key] ?? tendenza.default_value,
    })),
  };
}
