"use server";

import { creaPersonaggio } from "@/lib/onboarding/personaggi";
import type { SavePersonaggioResult } from "@/lib/onboarding/types";

/**
 * Salvataggio finale del wizard. È un endpoint pubblico a tutti gli effetti:
 * l'argomento è `unknown` perché i tipi non sopravvivono al confine di rete —
 * forma, autenticazione e validazione stanno lato server.
 */
export async function salvaPersonaggio(input: unknown): Promise<SavePersonaggioResult> {
  return creaPersonaggio(input);
}
