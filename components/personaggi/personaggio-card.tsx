import { resolveRow } from "@/lib/onboarding/selectors";
import type { Catalog, Personaggio } from "@/lib/onboarding/types";

import { PersonaggioSheet } from "./personaggio-sheet";

const DATE_FORMAT = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });

/**
 * Un personaggio salvato nella lobby. Le chiavi vengono risolte sul catalogo e
 * il disegno lo fa `PersonaggioSheet`, lo stesso del wizard.
 */
export function PersonaggioCard({
  personaggio,
  catalog,
}: {
  personaggio: Personaggio;
  catalog: Catalog;
}) {
  return (
    <PersonaggioSheet
      resolved={resolveRow(catalog, personaggio)}
      variant="card"
      footer={
        <p className="text-xs text-muted-foreground">
          Creato il {DATE_FORMAT.format(new Date(personaggio.created_at))}
        </p>
      }
    />
  );
}
