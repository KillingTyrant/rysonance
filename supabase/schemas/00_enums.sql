-- Enum condivisi.
--
-- Il sesso del personaggio è un enum e non una riga di catalogo: è un attributo
-- chiuso del dominio, non contenuto editabile. Le etichette da mostrare stanno
-- in una const TypeScript (lib/onboarding/types.ts), non nel database.
--
-- Nota per il futuro: aggiungere un valore è `alter type ... add value`, che non
-- può girare nella stessa transazione in cui il nuovo valore viene usato.

create type public.sesso as enum ('maschio', 'femmina');

-- Lo stile di attacco e di difesa, per la stessa ragione: il combattimento è
-- sempre una contrapposizione fra attacco e difesa, e ciascuno dei due può
-- essere solo fisico (arma o oggetto fisico) o magico (magia o oggetto magico).
-- Due valori chiusi dalle regole, non contenuto di catalogo.
create type public.stile as enum ('fisico', 'magico');
