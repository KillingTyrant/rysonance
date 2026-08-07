"use server";

import { createCompletedCharacter } from "@/lib/onboarding/characters";
import type { SaveCharacterResult } from "@/lib/onboarding/types";

/**
 * Salvataggio finale del wizard. È un endpoint pubblico a tutti gli effetti:
 * l'argomento è `unknown` perché i tipi non sopravvivono al confine di rete —
 * forma, autenticazione, validazione e calcolo delle stat stanno lato server.
 */
export async function saveCharacter(input: unknown): Promise<SaveCharacterResult> {
  return createCompletedCharacter(input);
}
