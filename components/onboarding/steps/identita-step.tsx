import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { articolo, isRazzaGiocabile, razzaByKey } from "@/lib/onboarding/selectors";
import { SESSI } from "@/lib/onboarding/types";
import { NAME_MAX_LENGTH } from "@/lib/onboarding/validate";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Chi è il personaggio: nome, sesso e da dove viene. La razza decide il talento
 * razziale, le tribù disponibili e su quali Caratteristiche potrà cadere il +1 —
 * per questo apre il wizard, prima dello step delle Caratteristiche.
 */
export function IdentitaStep({ catalog, draft, onChange }: StepProps) {
  const razza = razzaByKey(catalog, draft.razza_key);

  return (
    <>
      <StepSection title="Nome" description="Come si chiama il tuo personaggio.">
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="nome-personaggio" className="sr-only">
            Nome del personaggio
          </Label>
          <Input
            id="nome-personaggio"
            value={draft.name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
            placeholder="Es. Aurel"
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>
      </StepSection>

      <StepSection title="Sesso">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SESSI.map((item) => (
            <OptionCard
              key={item.key}
              title={item.name}
              selected={draft.sesso === item.key}
              onSelect={() => onChange({ sesso: item.key })}
            />
          ))}
        </div>
      </StepSection>

      <StepSection
        title="Razza"
        description="Determina il talento razziale, le tribù disponibili e le Caratteristiche su cui potrai mettere il +1."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.razze.map((item) => (
            <OptionCard
              key={item.key}
              title={item.name}
              description={item.description || undefined}
              meta={
                <span className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {item.talento && (
                    <span>
                      Talento: <span className="text-foreground">{item.talento.name}</span>
                    </span>
                  )}
                  {item.caratteristiche.length > 0 && (
                    <span>
                      +1 a scelta fra{" "}
                      <span className="text-foreground">
                        {item.caratteristiche.map((c) => c.name).join(", ")}
                      </span>
                    </span>
                  )}
                </span>
              }
              selected={draft.razza_key === item.key}
              disabled={!isRazzaGiocabile(item)}
              disabledReason="Non ancora giocabile: mancano tribù o Caratteristiche."
              onSelect={() => onChange({ razza_key: item.key })}
            />
          ))}
        </div>
      </StepSection>

      <StepSection
        title="Tribù"
        description="Porta il proprio talento e la velocità base."
        hint={
          razza ? `Tribù de${articolo(razza.name)} ${razza.name}.` : "Scegli prima una razza."
        }
      >
        {razza ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {razza.tribu.map((item) => (
              <OptionCard
                key={item.key}
                title={item.name}
                description={item.description || undefined}
                meta={
                  <span className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                    <span>Velocità {item.base_speed ?? "—"}</span>
                    {item.talento && (
                      <span>
                        Talento:{" "}
                        <span className="text-foreground">{item.talento.name}</span>
                      </span>
                    )}
                  </span>
                }
                selected={draft.tribu_key === item.key}
                onSelect={() => onChange({ tribu_key: item.key })}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Le tribù compaiono qui dopo aver scelto la razza.
          </p>
        )}
      </StepSection>
    </>
  );
}
