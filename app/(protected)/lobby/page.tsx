import { Suspense } from "react";
import Link from "next/link";

import {
  PersonaggioList,
  PersonaggioListSkeleton,
} from "@/components/personaggi/personaggio-list";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "I tuoi personaggi · Rysonance",
};

export default function LobbyPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold">I tuoi personaggi</h1>
          <p className="text-muted-foreground">
            Tutti i personaggi che hai creato con il wizard.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/onboarding">Crea un personaggio</Link>
        </Button>
      </header>

      <Suspense fallback={<PersonaggioListSkeleton />}>
        <PersonaggioList />
      </Suspense>
    </div>
  );
}
