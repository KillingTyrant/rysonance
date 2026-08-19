import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GroupDef } from "@/lib/onboarding/groups";

type GroupIntroProps = {
  group: GroupDef;
  disabled?: boolean;
  onContinue: () => void;
  onBack: () => void;
};

/**
 * L'intro di un macro-passo: spiega cosa si sta per scegliere, prima di
 * entrare nelle schermate di selezione. Si passa da qui a ogni ingresso
 * dalla hub — mai nei salti interni o dai link del riepilogo.
 */
export function GroupIntro({ group, disabled, onContinue, onBack }: GroupIntroProps) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="my-auto flex w-full max-w-md flex-col items-center gap-4 self-center text-center">
        <h1 className="text-4xl font-bold">{group.introTitle}</h1>
        <p className="text-muted-foreground">{group.introDescription}</p>
      </div>

      <div className="flex flex-col gap-3 pt-8">
        <Button
          variant="ticket"
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={onContinue}
        >
          Ho capito
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-center"
          disabled={disabled}
          onClick={onBack}
        >
          <ArrowLeft />
          Indietro
        </Button>
      </div>
    </div>
  );
}
