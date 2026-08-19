import { PersonaggioWizard } from "@/components/onboarding/personaggio-wizard";
import { getCatalog } from "@/lib/onboarding/catalog";

export const metadata = {
  title: "Creazione dell'eroe · Rysonance",
};

/**
 * Il catalogo è risolto a build time (`getCatalog` è `"use cache"`), quindi
 * tutta la UI del wizard finisce nella shell statica: a runtime restano solo
 * le scelte dell'utente e la server action di salvataggio.
 */
export default async function OnboardingPage() {
  const catalog = await getCatalog();

  return (
    <div className="flex w-full flex-1 flex-col items-center">
      <PersonaggioWizard catalog={catalog} />
    </div>
  );
}
