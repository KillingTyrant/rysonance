import type { ComponentType } from "react";

import type { StepId } from "@/lib/onboarding/steps";
import type { Catalog, PersonaggioDraft } from "@/lib/onboarding/types";
import type { Problem } from "@/lib/onboarding/validate";

import { IdentitaStep } from "./steps/identita-step";
import { SummaryStep } from "./steps/summary-step";
import { TalentiStep } from "./steps/talenti-step";
import { ViaStep } from "./steps/via-step";

export type SaveError = { message: string; problems?: string[] };

/** Ogni step riceve le stesse props e usa quelle che gli servono. */
export type StepProps = {
  catalog: Catalog;
  draft: PersonaggioDraft;
  /** Tutti i problemi del draft, non solo quelli di questo step. */
  problems: Problem[];
  pending: boolean;
  saveError: SaveError | null;
  onChange: (patch: Partial<PersonaggioDraft>) => void;
  onGoTo: (step: StepId) => void;
  onSave: () => void;
};

/**
 * Step → componente. `Record<StepId, …>` è esaustivo per costruzione: aggiungere
 * uno step in `lib/onboarding/steps.ts` senza il suo componente non compila, ed
 * è il motivo per cui nel wizard non esiste nessuna catena di `if`.
 */
export const STEP_COMPONENTS: Record<StepId, ComponentType<StepProps>> = {
  identita: IdentitaStep,
  via: ViaStep,
  talenti: TalentiStep,
  riepilogo: SummaryStep,
};
