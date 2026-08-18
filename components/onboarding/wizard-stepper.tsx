import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { stepIndex, WIZARD_STEPS, type StepId } from "@/lib/onboarding/steps";

type WizardStepperProps = {
  current: StepId;
  completed: (step: StepId) => boolean;
  /** Ultimo step raggiungibile: oltre, le scelte precedenti non sono complete. */
  limit: StepId;
  disabled?: boolean;
  onGoTo: (step: StepId) => void;
};

export function WizardStepper({
  current,
  completed,
  limit,
  disabled = false,
  onGoTo,
}: WizardStepperProps) {
  const currentIndex = stepIndex(current);
  const limitIndex = stepIndex(limit);
  const progress = (currentIndex / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <div className="flex w-full flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = completed(step.id) && !isCurrent;
          const reachable = !disabled && index <= limitIndex;

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onGoTo(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  isCurrent ? "font-medium" : "text-muted-foreground",
                  reachable ? "hover:text-foreground" : "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isDone && "border-primary text-foreground",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Avanzamento della creazione"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
