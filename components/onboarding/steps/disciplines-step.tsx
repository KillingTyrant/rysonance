import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  disciplineGroupsForVia,
  remainingSlots,
  viaByKey,
} from "@/lib/onboarding/rules";
import type { Catalog } from "@/lib/onboarding/types";
import type { WizardState } from "@/lib/onboarding/wizard-state";

import { StepSection } from "../step-section";

type DisciplinesStepProps = {
  catalog: Catalog;
  state: WizardState;
  onChangePoints: (disciplineKey: string, delta: number) => void;
};

export function DisciplinesStep({
  catalog,
  state,
  onChangePoints,
}: DisciplinesStepProps) {
  const via = viaByKey(catalog, state.via_key);
  const groups = disciplineGroupsForVia(catalog, state.via_key);
  const remaining = remainingSlots(catalog, state.discipline_points);

  return (
    <StepSection
      title="Talenti e magie"
      description={`Distribuisci ${catalog.disciplineSlotBudget} slot fra le discipline.`}
      hint={
        via
          ? `Sono elencati solo i gruppi sbloccati da ${via.name}.`
          : "Torna allo step 2 e scegli una Via: è lei a sbloccare i gruppi."
      }
    >
      <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
        <span className="text-sm">
          Slot rimanenti
          {remaining > 0 && (
            <span className="ml-2 text-muted-foreground">
              assegnali tutti per continuare
            </span>
          )}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{remaining}</span>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun gruppo disponibile senza una Via.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group.key} className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="font-medium">{group.name}</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {group.disciplines.map((discipline) => {
                  const points = state.discipline_points[discipline.key] ?? 0;
                  return (
                    <li
                      key={discipline.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm">{discipline.name}</span>
                      <span className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={points === 0}
                          aria-label={`Togli uno slot a ${discipline.name}`}
                          onClick={() => onChangePoints(discipline.key, -1)}
                        >
                          <Minus />
                        </Button>
                        <span className="w-4 text-center text-sm tabular-nums">
                          {points}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={remaining === 0}
                          aria-label={`Aggiungi uno slot a ${discipline.name}`}
                          onClick={() => onChangePoints(discipline.key, 1)}
                        >
                          <Plus />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </StepSection>
  );
}
