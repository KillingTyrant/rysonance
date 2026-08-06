"use server";

import { createCompletedCharacter } from "@/lib/onboarding/characters";
import type { CharacterInput, SaveCharacterResult } from "@/lib/onboarding/types";

/**
 * Salvataggio finale del wizard. È un endpoint pubblico a tutti gli effetti:
 * autenticazione, validazione e calcolo delle stat avvengono lato server, la
 * UI non fa da guardia.
 */
export async function saveCharacter(
  input: CharacterInput,
): Promise<SaveCharacterResult> {
  return createCompletedCharacter(input);
}
