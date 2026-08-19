"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { talentiDaScegliere, talentoIniziale } from "@/lib/onboarding/selectors";
import { cn } from "@/lib/utils";

import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * La Via: il percorso di crescita. Ogni via ha una sottovia per livello; quella
 * di livello 0 porta il talento con cui il personaggio comincia — ed è anche ciò
 * che decide quanti talenti si potranno scegliere più avanti, perciò questo step
 * precede quello dei talenti.
 *
 * Una via per schermata, a carosello: si sfoglia con lo swipe (o frecce e
 * tastiera) e si conferma con "Seleziona". Rientrando nello step il carosello
 * riparte dalla via già scelta.
 */
export function ViaStep({ catalog, draft, onChange }: StepProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // L'indice della slide attiva vive in Embla: qui lo si segue solo per i
  // pallini di posizione, che a loro volta possono chiedere lo scroll.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const startIndex = Math.max(
    0,
    catalog.vie.findIndex((via) => via.key === draft.via_key),
  );

  return (
    <StepSection description="Il percorso che il personaggio seguirà crescendo di livello. Sfoglia le Vie e seleziona la tua.">
      <Carousel
        setApi={setApi}
        opts={{ align: "center", startIndex }}
        className="w-full"
      >
        <CarouselContent>
          {catalog.vie.map((via) => {
            const iniziale = talentoIniziale(via);
            const selected = draft.via_key === via.key;

            return (
              <CarouselItem key={via.key} className="basis-[88%] sm:basis-3/4 lg:basis-3/5">
                <article
                  className={cn(
                    "relative flex h-full flex-col items-center gap-6 overflow-hidden rounded-2xl border bg-card px-6 pb-8 pt-4 text-center transition-colors",
                    selected && "border-primary ring-1 ring-primary",
                  )}
                >
                  <div className="flex w-full justify-end">
                    <Button
                      type="button"
                      variant={selected ? "ticketSecondary" : "ticket"}
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => onChange({ via_key: via.key })}
                    >
                      {selected && <Check />}
                      {selected ? "Selezionata" : "Seleziona"}
                    </Button>
                  </div>

                  {/*
                    Emblema segnaposto: quando arriverà l'arte delle vie andrà
                    importata staticamente da `assets/` (vedi
                    docs/immagini_catalogo.md) al posto di questo SVG.
                  */}
                  <EmblemaVia />

                  <div className="flex w-full flex-col items-center gap-1">
                    <span aria-hidden className="text-[0.55rem] text-muted-foreground">
                      ▲
                    </span>
                    <h4 className="w-full text-4xl font-black uppercase tracking-tight sm:text-5xl">
                      {via.name}
                    </h4>
                    <div aria-hidden className="mt-1 h-px w-full bg-border" />
                  </div>

                  <div className="flex max-w-md flex-col gap-2">
                    {via.description && (
                      <p className="text-sm italic text-muted-foreground">
                        {via.description}
                      </p>
                    )}
                    {iniziale && (
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold">Talento di via: {iniziale.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {iniziale.description}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {talentiDaScegliere(via)} talenti a scelta
                    </p>
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Su mobile si sfoglia con lo swipe; le frecce servono da sm in su. */}
        <CarouselPrevious className="left-2 hidden sm:inline-flex" />
        <CarouselNext className="right-2 hidden sm:inline-flex" />
      </Carousel>

      <div className="flex justify-center gap-2" role="tablist" aria-label="Vie">
        {catalog.vie.map((via, index) => (
          <button
            key={via.key}
            type="button"
            role="tab"
            aria-label={via.name}
            aria-selected={index === current}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              index === current ? "bg-foreground" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </StepSection>
  );
}

/** Rosone decorativo in attesa dell'arte ufficiale delle vie. */
function EmblemaVia() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      fill="none"
      stroke="currentColor"
      className="h-40 w-40 text-muted-foreground/25 sm:h-52 sm:w-52"
    >
      <circle cx="100" cy="100" r="88" strokeWidth="3" />
      <circle cx="100" cy="100" r="72" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="36" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1="12"
          x2="100"
          y2="28"
          strokeWidth="4"
          transform={`rotate(${i * 45} 100 100)`}
        />
      ))}
      <path d="M100 76 L116 100 L100 124 L84 100 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
