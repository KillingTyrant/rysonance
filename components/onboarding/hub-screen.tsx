import { Check, Plus, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WIZARD_GROUPS, type GroupId } from "@/lib/onboarding/groups";
import { cn } from "@/lib/utils";
import { PersonaggioDraft } from "@/lib/onboarding/types";

function selectionValue(groupId: GroupId, draft: PersonaggioDraft): string | null {
  if (groupId === "razza") {
    const values = [draft.sesso, draft.razza_key, draft.tribu_key].filter(
      (value): value is string => Boolean(value),
    );
    return values.length > 0 ? values.join(" • ") : null;
  }

  if (groupId === "via") return draft.via_key;

  if (groupId === "talenti") {
    return draft.talenti.length > 0 ? draft.talenti.join(", ") : null;
  }

  return null;
}

type HubScreenProps = {
  draft: PersonaggioDraft;
  completed: (id: GroupId) => boolean;
  unlocked: (id: GroupId) => boolean;
  allComplete: boolean;
  disabled?: boolean;
  onOpenGroup: (id: GroupId) => void;
  onRandomize: () => void;
  onCreaEroe: () => void;
};

/**
 * La hub "Creazione dell'eroe": lo stato di avanzamento come lista di
 * macro-passi. Le righe bloccate si sbloccano completando le precedenti;
 * quelle completate restano cliccabili per rivedere le scelte (ripassando
 * dall'intro). La CTA si abilita solo quando tutto è completo.
 */
export function HubScreen({
  draft,
  completed,
  unlocked,
  allComplete,
  disabled,
  onOpenGroup,
  onRandomize,
  onCreaEroe,
}: HubScreenProps) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      {/*
        Slot per l'arte di sfondo (silhouette dell'eroe + bussola): l'asset non
        esiste ancora. Quando arriverà va importato staticamente da `assets/`
        (vedi docs/immagini_catalogo.md) e inserito qui, prima del velo che
        tiene leggibile il testo in entrambi i temi.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent" />
      </div>

      <h1 className="text-4xl font-bold">Creazione dell&apos;eroe</h1>

      <ol className="flex flex-col gap-4">
        {WIZARD_GROUPS.map((group) => {
          const isDone = completed(group.id);
          const isUnlocked = unlocked(group.id);
          const selectedValue = selectionValue(group.id, draft);
          return (
            <li key={group.id}>
              <button
                type="button"
                disabled={!isUnlocked || disabled}
                onClick={() => onOpenGroup(group.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-md p-2 text-left",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isDone && "bg-emerald-100/70 text-emerald-900",
                  !isUnlocked && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm",
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isUnlocked
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check /> : <Plus />}

                </span>
                <span className={cn("w-full font-medium leading-snug", isDone && "text-emerald-900")}>
                  <span className="block">{group.label}</span>
                  {selectedValue && (
                    <span
                      className={cn(
                        "mt-1 block text-sm font-normal text-muted-foreground",
                        isDone && "text-emerald-800/90",
                      )}
                    >
                      {selectedValue}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button
          type="button"
          variant="ticketSecondary"
          title="Creazione casuale"
          className="flex w-full items-center gap-4 rounded-md py-2 text-left"
          disabled={disabled}
          onClick={onRandomize}
        >
          <Shuffle />
          Crea un eroe random
        </Button>
        <Button
          variant="ticket"
          size="lg"
          className="w-full"
          disabled={!allComplete || disabled}
          onClick={onCreaEroe}
        >
          Crea Eroe
        </Button>
      </div>
    </div>
  );
}
