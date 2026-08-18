/* Server Component async */
import "server-only";

import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { Caratteristica, Catalog, Sottovia, Talento, Tribu } from "./types";

/**
 * Client "anonimo" senza cookie: il catalogo è pubblico in lettura (RLS
 * `for select to anon`) e non deve dipendere dalla request, altrimenti non
 * sarebbe prerenderizzabile.
 */
function catalogClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Legge il catalogo di gioco e lo ricompone secondo le relazioni del DB:
 * razza → tribù + Caratteristiche candidate, via → sottovie, ciascuna con il
 * proprio talento.
 *
 * `"use cache"` + `cacheLife("max")`: viene risolto a build time e congelato
 * nelle pagine, quindi a runtime non parte nessuna query. La chiave di cache
 * include il build id, perciò ogni deploy rilegge il catalogo — il contenuto
 * cambia solo con un `db push --include-seed` seguito da un deploy.
 *
 * Otto query invece di un embed PostgREST: il legame verso i talenti è una FK
 * *composta* (talent_key, talent_kind), che l'embedding non risolve. Il numero
 * di round-trip è comunque irrilevante, gira a build time.
 *
 * Le colonne sono elencate una per una: quello che finisce qui dentro viene
 * serializzato nel payload del client. `talenti.properties` è l'eccezione —
 * si legge, se ne ricava `via.talenti_extra` e poi si butta via, così gli
 * effetti di gioco non viaggiano fino al browser.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("max");

  const supabase = catalogClient();

  const [
    talenti,
    caratteristiche,
    razze,
    razzaCaratteristiche,
    tribu,
    vie,
    sottovie,
    tendenze,
  ] = await Promise.all([
    read(
      "talenti",
      supabase
        .from("talenti")
        .select("key, name, description, kind, scuola, disciplina, ramo, properties")
        .order("sort_order"),
    ),
    read(
      "caratteristiche",
      supabase
        .from("caratteristiche")
        .select("key, name, description, hp_per_punto, mana_per_punto, sort_order")
        .order("sort_order"),
    ),
    read(
      "razze",
      supabase
        .from("razze")
        .select("key, name, description, sort_order, talent_key")
        .order("sort_order"),
    ),
    read(
      "razza_caratteristiche",
      supabase
        .from("razza_caratteristiche")
        .select("razza_key, caratteristica_key, sort_order")
        .order("sort_order"),
    ),
    read(
      "tribu",
      supabase
        .from("tribu")
        .select("key, razza_key, name, description, base_speed, sort_order, talent_key")
        .order("sort_order"),
    ),
    read(
      "vie",
      supabase.from("vie").select("key, name, description, sort_order").order("sort_order"),
    ),
    read(
      "sottovie",
      supabase
        .from("sottovie")
        .select("key, via_key, level, name, description, talent_key")
        .order("level"),
    ),
    read(
      "tendenze",
      supabase
        .from("tendenze")
        .select(
          "key, type, name, description, min_label, min_value, max_label, max_value, default_value, sort_order",
        )
        .order("sort_order"),
    ),
  ]);

  // `properties` si consuma qui e non prosegue: gli effetti di gioco non
  // devono finire nel payload del client.
  const talentoByKey = new Map<string, Talento>();
  const extraByTalento = new Map<string, number>();
  for (const { properties, ...talento } of talenti) {
    talentoByKey.set(talento.key, talento);
    extraByTalento.set(talento.key, talentiSceltaExtra(properties));
  }

  const talentoOf = (key: string | null) => (key ? talentoByKey.get(key) ?? null : null);

  const caratteristicaByKey = new Map<string, Caratteristica>(
    caratteristiche.map((c) => [c.key, c]),
  );

  // Una passata per raggruppare, invece di rifiltrare l'array dentro ogni map.
  const tribuByRazza = groupBy(
    tribu.map(({ talent_key, ...row }): Tribu => ({
      ...row,
      talento: talentoOf(talent_key),
    })),
    (t) => t.razza_key,
  );

  const candidateByRazza = groupBy(razzaCaratteristiche, (rc) => rc.razza_key);

  const sottovieByVia = groupBy(sottovie, (s) => s.via_key);

  return {
    vie: vie.map((via) => {
      const proprie = sottovieByVia.get(via.key) ?? [];
      // Il talento di livello 0 apre la via, e con `talenti_scelta_extra` decide
      // anche quanti talenti a scelta darà.
      const iniziale = proprie.find((sottovia) => sottovia.level === 0)?.talent_key;
      return {
        ...via,
        sottovie: proprie.map(({ talent_key, ...row }): Sottovia => ({
          ...row,
          talento: talentoOf(talent_key),
        })),
        talenti_extra: (iniziale && extraByTalento.get(iniziale)) || 0,
      };
    }),
    razze: razze.map(({ talent_key, ...row }) => ({
      ...row,
      talento: talentoOf(talent_key),
      tribu: tribuByRazza.get(row.key) ?? [],
      // Il join sta qui e non in una query: le candidate sono una manciata di
      // righe e questo tiene fuori dal payload la tabella di collegamento.
      caratteristiche: (candidateByRazza.get(row.key) ?? [])
        .map((rc) => caratteristicaByKey.get(rc.caratteristica_key))
        .filter((c): c is Caratteristica => c !== undefined),
    })),
    caratteristiche,
    // `default_value` è una colonna generata: i tipi la dichiarano nullable, il
    // DB non la lascia mai vuota. Il fallback tiene la tendenza dentro i limiti.
    tendenze: tendenze.map((t) => ({ ...t, default_value: t.default_value ?? t.min_value })),
    // Nell'ordine di `sort_order`, che raggruppa per scuola e disciplina: è
    // l'ordine in cui lo step li mostra.
    talentiScelta: [...talentoByKey.values()].filter((t) => t.kind === "scelta"),
  };
}

/**
 * Quanti talenti a scelta in più concede un talento. Specchio TypeScript di
 * `public.talenti_a_scelta`: il DB resta l'autorità, questo serve al wizard per
 * sapere quante card far scegliere prima di provare a salvare.
 */
function talentiSceltaExtra(properties: unknown): number {
  if (typeof properties !== "object" || properties === null) return 0;
  const extra = (properties as Record<string, unknown>).talenti_scelta_extra;
  return typeof extra === "number" && Number.isFinite(extra) && extra > 0
    ? Math.trunc(extra)
    : 0;
}

/**
 * Un catalogo incompleto renderebbe un wizard rotto e, girando a build time,
 * un deploy silenziosamente sbagliato: meglio far fallire la build.
 */
async function read<T>(
  table: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`Catalogo: lettura di "${table}" fallita: ${error.message}`);
  return data ?? [];
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(key(row));
    if (group) group.push(row);
    else groups.set(key(row), [row]);
  }
  return groups;
}
