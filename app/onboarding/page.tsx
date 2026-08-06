import { CharacterWizard } from "@/components/onboarding/character-wizard";
import { getCatalog } from "@/lib/onboarding/catalog";

export const metadata = {
  title: "Crea il tuo personaggio · Rysonance",
};

/**
 * Il catalogo è risolto a build time (`getCatalog` è `"use cache"`), quindi
 * tutta la UI del wizard finisce nella shell statica: a runtime restano solo
 * le scelte dell'utente e la server action di salvataggio.
 */
export default async function OnboardingPage() {
  const catalog = await getCatalog();

  return (
    <div className="flex w-full flex-col items-center">
      <CharacterWizard catalog={catalog} />
    </div>
  );
}
