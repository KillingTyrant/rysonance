import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  talentiDaScegliere,
  talentoSceltaByKey,
  viaByKey,
} from "@/lib/onboarding/selectors";
import type { Talento } from "@/lib/onboarding/types";

import { OptionCard } from "../option-card";
import { StepSection } from "../step-section";
import type { StepProps } from "../wizard-steps";

/**
 * Gli unici talenti che sceglie l'utente: li prende da tutta la lista, senza
 * vincoli. Scuola, disciplina e ramo servono a cercare e a spezzare l'elenco in
 * blocchi leggibili — non sono livelli da attraversare, e non limitano la
 * scelta: si possono prendere talenti della stessa disciplina o di due scuole
 * lontanissime.
 *
 * Quanti se ne scelgono lo decide la Via: due, tre per il Viandante, che apre
 * con "giusta scelta". Il numero non è scritto qui.
 */
export function TalentiStep({ catalog, draft, onChange }: StepProps) {
  const [query, setQuery] = useState("");
  const quanti = talentiDaScegliere(viaByKey(catalog, draft.via_key));

  const gruppi = useMemo(() => {
    const cercato = normalize(query);
    const visibili = cercato
      ? catalog.talentiScelta.filter((talento) => cerca(talento).includes(cercato))
      : catalog.talentiScelta;
    return raggruppa(visibili);
  }, [catalog.talentiScelta, query]);

  const scelti = draft.talenti
    .map((key) => talentoSceltaByKey(catalog, key))
    .filter((talento): talento is Talento => talento !== null);
  const completo = draft.talenti.length >= quanti;

  function toggle(key: string) {
    onChange({
      talenti: draft.talenti.includes(key)
        ? draft.talenti.filter((scelto) => scelto !== key)
        : [...draft.talenti, key],
    });
  }

  return (
    <StepSection
      title="Talenti"
      description={`Scegline ${quanti} fra tutti quelli disponibili. Nessuna combinazione è vietata: gli altri talenti del personaggio arrivano già da razza, tribù e Via.`}
      // Detto una volta qui invece che su ognuna delle card disabilitate, che
      // sono tutte quelle non scelte.
      hint={
        completo
          ? `Hai scelto ${quanti} talenti: toglierne uno libera il posto.`
          : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <Label htmlFor="cerca-talento" className="sr-only">
              Cerca un talento
            </Label>
            <Input
              id="cerca-talento"
              type="search"
              value={query}
              autoComplete="off"
              placeholder="Cerca per nome, disciplina o ramo…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {draft.talenti.length} di {quanti} scelti
          </p>
        </div>

        {/* I talenti scelti restano visibili anche quando la ricerca li ha
            nascosti: è l'unico punto da cui si può sempre toglierne uno. */}
        {scelti.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {scelti.map((talento) => (
              <li key={talento.key}>
                <button
                  type="button"
                  onClick={() => toggle(talento.key)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-accent px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {talento.name}
                  <X className="h-3 w-3" aria-hidden />
                  <span className="sr-only">Togli {talento.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {gruppi.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun talento corrisponde alla ricerca.
          </p>
        ) : (
          gruppi.map((gruppo) => (
            <section key={gruppo.disciplina} className="flex flex-col gap-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {gruppo.scuola} · {gruppo.disciplina}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gruppo.talenti.map((talento) => {
                  const selected = draft.talenti.includes(talento.key);
                  return (
                    <OptionCard
                      key={talento.key}
                      title={talento.name}
                      description={talento.description || undefined}
                      meta={
                        <span className="text-sm text-muted-foreground">
                          {talento.ramo}
                        </span>
                      }
                      selected={selected}
                      disabled={completo && !selected}
                      onSelect={() => toggle(talento.key)}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </StepSection>
  );
}

type Gruppo = { scuola: string; disciplina: string; talenti: Talento[] };

/**
 * Un blocco per disciplina, nell'ordine del catalogo (`sort_order`). Le
 * etichette sono valorizzate per costruzione su ogni talento a scelta — lo
 * impone il check `talenti_check` — quindi qui non c'è nessun caso "senza
 * disciplina" da gestire.
 */
function raggruppa(talenti: Talento[]): Gruppo[] {
  const gruppi: Gruppo[] = [];
  for (const talento of talenti) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.disciplina === talento.disciplina) ultimo.talenti.push(talento);
    else
      gruppi.push({
        scuola: talento.scuola ?? "",
        disciplina: talento.disciplina ?? "",
        talenti: [talento],
      });
  }
  return gruppi;
}

/** Cercare "elettricita" deve trovare "magia dell'elettricità". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const CERCABILE = new WeakMap<Talento, string>();

/** Il testo su cui filtra la ricerca, calcolato una volta per talento. */
function cerca(talento: Talento): string {
  const cached = CERCABILE.get(talento);
  if (cached !== undefined) return cached;

  const testo = normalize(
    [talento.name, talento.scuola, talento.disciplina, talento.ramo].join(" "),
  );
  CERCABILE.set(talento, testo);
  return testo;
}
