import { Check, Plus, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WIZARD_GROUPS, type GroupId } from "@/lib/onboarding/groups";
import { cn } from "@/lib/utils";

type HubScreenProps = {
  completed: (id: GroupId) => boolean;
  unlocked: (id: GroupId) => boolean;
  allComplete: boolean;
  disabled?: boolean;
  onOpenGroup: (id: GroupId) => void;
  onCreaEroe: () => void;
};

/**
 * La hub "Creazione dell'eroe": lo stato di avanzamento come lista di
 * macro-passi. Le righe bloccate si sbloccano completando le precedenti;
 * quelle completate restano cliccabili per rivedere le scelte (ripassando
 * dall'intro). La CTA si abilita solo quando tutto è completo.
 */
export function HubScreen({
  completed,
  unlocked,
  allComplete,
  disabled,
  onOpenGroup,
  onCreaEroe,
}: HubScreenProps) {
  return (
    <div className="relative isolate flex flex-1 flex-col gap-8">
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
          return (
            <li key={group.id}>
              <button
                type="button"
                disabled={!isUnlocked || disabled}
                onClick={() => onOpenGroup(group.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-md py-2 text-left",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  !isUnlocked && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm",
                    isUnlocked
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check /> : <Plus />}
                </span>
                <span className="max-w-40 font-medium leading-snug">
                  {group.label}
                </span>
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            disabled
            title="Presto disponibile"
            className="flex w-full items-center gap-4 rounded-md py-2 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <Shuffle />
            </span>
            <span className="max-w-40 font-medium leading-snug">
              Crea un eroe random
              <span className="sr-only"> (presto disponibile)</span>
            </span>
          </button>
        </li>
      </ol>

      <div className="mt-auto pt-8">
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
