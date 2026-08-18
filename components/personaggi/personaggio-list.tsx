import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/onboarding/catalog";
import { listPersonaggi } from "@/lib/onboarding/personaggi";

import { PersonaggioCard } from "./personaggio-card";

/**
 * Lista dei personaggi dell'utente. Legge i cookie (sessione), quindi va
 * renderizzata dentro un `<Suspense>`: resta fuori dalla shell statica.
 */
export async function PersonaggioList() {
  const catalog = await getCatalog();

  let personaggi;
  try {
    personaggi = await listPersonaggi();
  } catch {
    return (
      <p className="text-sm text-red-500">
        Non è stato possibile caricare i personaggi. Ricarica la pagina.
      </p>
    );
  }

  if (personaggi.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-8 shadow">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Nessun personaggio</h2>
          <p className="text-sm text-muted-foreground">
            Non hai ancora creato nessun personaggio. Il wizard richiede un paio di
            minuti.
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">Crea il primo personaggio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {personaggi.length === 1 ? "1 personaggio" : `${personaggi.length} personaggi`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {personaggi.map((personaggio) => (
          <PersonaggioCard
            key={personaggio.id}
            personaggio={personaggio}
            catalog={catalog}
          />
        ))}
      </div>
    </div>
  );
}

/** Segnaposto mostrato mentre la lista viene caricata. */
export function PersonaggioListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
      {[0, 1].map((index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-xl border bg-card shadow"
        />
      ))}
    </div>
  );
}
