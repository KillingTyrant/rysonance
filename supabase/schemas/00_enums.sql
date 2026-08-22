-- Enum condivisi.
--
-- Il sesso del personaggio è un enum e non una riga di catalogo: è un attributo
-- chiuso del dominio, non contenuto editabile. Le etichette da mostrare stanno
-- in una const TypeScript (lib/onboarding/types.ts), non nel database.
--
-- Nota per il futuro: aggiungere un valore è `alter type ... add value`, che non
-- può girare nella stessa transazione in cui il nuovo valore viene usato.

create type public.sesso as enum ('maschio', 'femmina');
