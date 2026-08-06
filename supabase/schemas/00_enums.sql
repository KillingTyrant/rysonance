-- Enum condivisi.
--
-- Nota: il "sesso" del personaggio NON è un enum ma una riga di catalogo
-- (wizard_categories/wizard_options, categoria 'gender'): lo step 1 del wizard
-- lo renderizza come tutte le altre scelte singole, quindi vive nel catalogo.

create type public.character_status as enum ('draft', 'completed');
