import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  CHOICE_FIELDS,
  categoryByKey,
  computeStats,
  disciplineByKey,
  optionByKey,
  raceByKey,
  spentSlots,
  stirpeByKey,
  talentsFor,
  viaByKey,
} from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

const STARTING_LEVEL = 1;

type WizardSummaryProps = {
  catalog: Catalog;
  state: WizardState;
  className?: string;
};

/**
 * Riepilogo sempre visibile: mostra come le scelte si combinano fra loro —
 * stirpe dentro la razza, talenti che arrivano da razza/stirpe/Via, stat
 * derivate, slot spesi.
 */
export function WizardSummary({ catalog, state, className }: WizardSummaryProps) {
  const race = raceByKey(catalog, state.race_key);
  const stirpe = stirpeByKey(catalog, state.stirpe_key);
  const via = viaByKey(catalog, state.via_key);
  const stats = computeStats(catalog, state.race_key, state.via_key, STARTING_LEVEL);
  const talents = talentsFor(catalog, {
    raceKey: state.race_key,
    stirpeKey: state.stirpe_key,
    viaKey: state.via_key,
  });
  const allocations = Object.entries(state.discipline_points).filter(
    ([, points]) => points > 0,
  );
  const spent = spentSlots(state.discipline_points);

  return (
    <aside
      className={cn("rounded-xl border bg-card p-5 text-card-foreground shadow", className)}
    >
      <h2 className="font-semibold leading-none tracking-tight">Il tuo personaggio</h2>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="Nome" value={state.name.trim()} />
        <Row label="Razza" value={race?.name} />
        <Row label="Stirpe" value={stirpe?.name} />
        {CHOICE_FIELDS.map(({ category, field }) => (
          <Row
            key={category}
            label={categoryByKey(catalog, category)?.title ?? category}
            value={optionByKey(catalog, category, state[field])?.name}
          />
        ))}
        <Row label="Via" value={via?.name} />
      </dl>

      <Section title="Statistiche">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            HP <Stat value={stats.hp} />
          </span>
          <span>
            Mana <Stat value={stats.mana} />
          </span>
          <span>
            Velocità <Stat value={stats.speed} />
          </span>
        </div>
        {via && (
          <p className="mt-1 text-xs text-muted-foreground">
            Ogni livello: +{via.per_level_hp} HP, +{via.per_level_mana} mana, +
            {via.per_level_speed} velocità
          </p>
        )}
      </Section>

      {talents.length > 0 && (
        <Section title="Talenti">
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {talents.map((talent) => (
              <li key={talent.key}>{talent.name}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Slot disciplina ${spent}/${catalog.disciplineSlotBudget}`}>
        {allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuno slot assegnato.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {allocations.map(([key, points]) => (
              <li key={key}>
                {disciplineByKey(catalog, key)?.name ?? key}
                <span className="text-foreground"> ×{points}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", !value && "text-muted-foreground")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t pt-4">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ value }: { value: number | null }) {
  return (
    <span className={cn("font-medium", value == null ? "text-muted-foreground" : "text-foreground")}>
      {value ?? "—"}
    </span>
  );
}
