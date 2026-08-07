/* Server Component async */
import "server-only";

import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { Catalog } from "./types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

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
 * Legge l'intero catalogo del wizard e lo ricompone secondo le relazioni del
 * DB (razza → stirpi, via → gruppi di discipline, categoria → opzioni).
 *
 * `"use cache"` + `cacheLife("max")`: viene risolto a build time e congelato
 * nelle pagine, quindi a runtime non parte nessuna query. La chiave di cache
 * include il build id, perciò ogni deploy rilegge il catalogo — il contenuto
 * cambia solo con una migrazione.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("max");

  const supabase = catalogClient();

  const [
    talents,
    races,
    stirpi,
    vie,
    viaGroups,
    groups,
    disciplines,
    categories,
    options,
    traits,
    config,
  ] = await Promise.all([
    select(supabase, "talents"),
    select(supabase, "races"),
    select(supabase, "stirpi"),
    select(supabase, "vie"),
    select(supabase, "via_discipline_groups"),
    select(supabase, "discipline_groups"),
    select(supabase, "disciplines"),
    select(supabase, "wizard_categories"),
    select(supabase, "wizard_options"),
    select(supabase, "character_traits"),
    select(supabase, "game_config"),
  ]);

  const talentByKey = new Map(talents.map((t) => [t.key, t]));

  const budget = config.find((c) => c.key === "discipline_slot_budget")?.value;

  return {
    talents: sorted(talents),
    races: sorted(races).map((race) => ({
      ...race,
      racialTalent: talentByKey.get(race.racial_talent_key ?? "") ?? null,
      stirpi: sorted(stirpi)
        .filter((s) => s.race_key === race.key)
        .map((s) => ({ ...s, talent: talentByKey.get(s.talent_key ?? "") ?? null })),
    })),
    vie: sorted(vie).map((via) => ({
      ...via,
      firstTalent: talentByKey.get(via.first_talent_key ?? "") ?? null,
      disciplineGroupKeys: viaGroups
        .filter((vg) => vg.via_key === via.key)
        .map((vg) => vg.group_key),
    })),
    disciplineGroups: sorted(groups).map((group) => ({
      ...group,
      disciplines: sorted(disciplines).filter((d) => d.group_key === group.key),
    })),
    categories: sorted(categories)
      .sort((a, b) => a.step - b.step || a.sort_order - b.sort_order)
      .map((category) => ({
        ...category,
        options: sorted(options).filter((o) => o.category_key === category.key),
      })),
    traits: sorted(traits),
    disciplineSlotBudget: typeof budget === "number" ? budget : 0,
  };
}

async function select<T extends keyof Database["public"]["Tables"]>(
  supabase: ReturnType<typeof catalogClient>,
  table: T,
): Promise<Row<T>[]> {
  const { data, error } = await supabase.from(table).select("*");
  // Un catalogo incompleto renderebbe un wizard rotto: meglio far fallire la build.
  if (error) throw new Error(`Catalogo: lettura di "${table}" fallita: ${error.message}`);
  // Il nome tabella è generico, quindi supabase-js non riesce a restringere il
  // tipo del risultato: la riga è comunque quella di `table`.
  return (data ?? []) as unknown as Row<T>[];
}

function sorted<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}
