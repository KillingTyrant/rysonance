-- ═══════════════════════ CATALOGO DEL WIZARD · SEED ════════════════════════
-- Unica fonte di verità dei CONTENUTI del catalogo (la struttura sta in
-- `supabase/schemas/`). Il file è idempotente: ogni riapplicazione porta le
-- tabelle esattamente a questo stato — upsert di ciò che c'è, delete di ciò
-- che non c'è più.
--
--   locale : npm run db:reset                    (seed applicato in automatico)
--   cloud  : npx supabase db push --include-seed
--
-- ATTENZIONE
--   · Qui dentro possono comparire SOLO le tabelle di catalogo. Mai
--     `characters` o altre tabelle utente: in cloud questo file gira su dati
--     reali.
--   · Rimuovere una voce di catalogo già usata da un personaggio fa fallire il
--     DELETE per violazione di foreign key. È il comportamento voluto: è un
--     allarme, non un bug. Se serve ritirare una voce senza romperla, si
--     aggiunge una colonna `is_active` invece di cancellare.
--   · L'app legge il catalogo a build time (`use cache` + cacheLife("max") in
--     lib/onboarding/catalog.ts): dopo un push serve un nuovo deploy perché il
--     cambiamento si veda.
--
-- STRUTTURA
--   §1  i contenuti — l'unica parte da editare
--   §2  apply  (upsert, dalle tabelle padre alle figlie)
--   §3  prune  (delete, dalle figlie alle padri)
--   §4  cleanup
--
-- Il §1 carica tabelle temporanee di staging; §2 e §3 sono meccanici e non
-- vanno toccati quando cambia un contenuto. La separazione serve all'ordine:
-- un talento si può cancellare solo dopo che razze e vie hanno smesso di
-- puntarlo, cioè dopo tutti gli upsert (pensa a un rename di chiave, che è un
-- insert del nuovo valore + un delete del vecchio).
--
-- Tutto sta dentro un unico blocco `do`: il seeder della CLI non garantisce che
-- gli statement di un file girino nella stessa sessione (spezzato in statement
-- separati questo file fallisce, in un punto diverso a ogni run, perché le
-- tabelle temporanee spariscono a metà strada). Un solo statement risolve, e in
-- più rende l'applicazione del catalogo atomica.
--
-- 'TODO' / NULL = dato di gioco ancora da definire.

do $seed$
begin


-- ═══════════════════════════════ §1 CONTENUTI ══════════════════════════════

-- Ogni stirpe porta due talenti: quello della sua razza (condiviso con la
-- stirpe sorella) e il proprio. Qui stanno entrambi in un'unica lista, il
-- legame lo fanno `races.racial_talent_key` e `stirpi.talent_key`.
create temp table _talents (like public.talents including defaults);
insert into _talents (key, name, description, kind, sort_order) values
  -- Razziali — uno per razza, valgono per entrambe le sue stirpi.
  ('apprendimento',        'Apprendimento',        '+1 punto competenza a ogni livello, da assegnare alle Abilità Tecniche. Imparano più in fretta di ogni altra razza.', 'racial',  1),
  ('sapienza_meccanica',   'Sapienza Meccanica',   'TODO: talento razziale dei Nani.',    'racial',  2),
  ('resistenza_al_fuoco',  'Resistenza al Fuoco',  'TODO: talento razziale degli Orchi.', 'racial',  3),
  ('sensibilita_magica',   'Sensibilità Magica',   'TODO: talento razziale degli Elfi.',  'racial',  4),
  ('olfatto_acuto',        'Olfatto Acuto',        'TODO: talento razziale degli Ulu-Ari.',  'racial',  5),
  ('visione_notturna',     'Visione Notturna',     'TODO: talento razziale dei Gata-Ari.',   'racial',  6),

  -- Di stirpe — uno per stirpe, nell'ordine delle razze qui sopra.
  ('incoraggiamento',      'Incoraggiamento',      'Umani imperiali di città, di educazione cavalleresca. Prima dello scontro rialzano il morale degli alleati contro la paura.', 'stirpe',  7),
  ('tempra',               'Tempra',               'TODO: talento della stirpe Kodron.',     'stirpe',  8),
  ('stoicismo',            'Stoicismo',            'TODO: talento della stirpe Nandrein.',   'stirpe',  9),
  ('dimensioni_ridotte',   'Dimensioni Ridotte',   'TODO: talento della stirpe Turuf.',      'stirpe', 10),
  ('furia',                'Furia',                'TODO: talento della stirpe Ruul.',       'stirpe', 11),
  ('euforia',              'Euforia',              'TODO: talento della stirpe Dramput.',    'stirpe', 12),
  ('sovraccarico',         'Sovraccarico',         'TODO: talento della stirpe Elehil.',     'stirpe', 13),
  ('adattamento',          'Adattamento',          'TODO: talento della stirpe Selvas.',     'stirpe', 14),
  ('zelo',                 'Zelo',                 'TODO: talento della stirpe Lurven.',     'stirpe', 15),
  ('capo_branco',          'Capo Branco',          'TODO: talento della stirpe Shakul.',     'stirpe', 16),
  ('predatore_silenzioso', 'Predatore Silenzioso', 'TODO: talento della stirpe Oncalynx.',   'stirpe', 17),
  ('furia_felina',         'Furia Felina',         'TODO: talento della stirpe Kajan.',      'stirpe', 18),

  -- Primo talento di ciascuna Via.
  ('tecnicista',           'Tecnicista',           'TODO: descrizione del talento Tecnicista.',   'via', 19),
  ('talento_sapiente',     'TODO Sapiente',        'TODO: primo talento della Via del Sapiente.', 'via', 20),
  ('talento_viandante',    'TODO Viandante',       'TODO: primo talento della Via del Viandante.','via', 21);

create temp table _races (like public.races including defaults);
insert into _races (key, name, racial_talent_key, sort_order) values
  ('umani',    'Umani',    'apprendimento',       1),
  ('nani',     'Nani',     'sapienza_meccanica',  2),
  ('orchi',    'Orchi',    'resistenza_al_fuoco', 3),
  ('elfi',     'Elfi',     'sensibilita_magica',  4),
  ('ulu_ari',  'Ulu-Ari',  'olfatto_acuto',       5),
  ('gata_ari', 'Gata-Ari', 'visione_notturna',    6);

-- Le statistiche base appartengono alla stirpe, non alla razza
-- (migrazione 20260807150916_move_base_stats_to_stirpi). 38/20/6 era il dato
-- degli Umani: identico su entrambe le stirpi perché è l'unico che esisteva,
-- va differenziato quando le schede di Eruscal e Kodron sono definite. Le
-- altre dieci stirpi hanno stat NULL finché le schede non esistono:
-- `computeStats` (lib/onboarding/rules.ts) propaga il NULL invece di inventare
-- un numero, quindi il riepilogo mostra "—" e il personaggio resta salvabile.
-- `sort_order` è progressivo dentro la razza: il catalogo ordina globalmente e
-- poi filtra per razza, quindi l'ordine relativo delle due stirpi è preservato.
create temp table _stirpi (like public.stirpi including defaults);
insert into _stirpi (key, race_key, name, talent_key, description, base_hp, base_mana, base_speed, sort_order) values
  ('eruscal',  'umani',    'Eruscal',  'incoraggiamento',      '', 33, 17, 2, 1),
  ('kodron',   'umani',    'Kodron',   'tempra',               '', 35, 17, 2, 2),
  ('nandrein', 'nani',     'Nandrein', 'stoicismo',            '', 40, 14, 1, 1),
  ('turuf',    'nani',     'Turuf',    'dimensioni_ridotte',   '', 32, 15, 4, 2),
  ('ruul',     'orchi',    'Ruul',     'furia',                '', 37, 16, 2, 1),
  ('dramput',  'orchi',    'Dramput',  'euforia',              '', 32, 16, 2, 2),
  ('elehil',   'elfi',     'Elehil',   'sovraccarico',         '', 33, 22, 2, 1),
  ('selvas',   'elfi',     'Selvas',   'adattamento',          '', 35, 19, 3, 2),
  ('lurven',   'ulu_ari',  'Lurven',   'zelo',                 '', 35, 15, 2, 1),
  ('shakul',   'ulu_ari',  'Shakul',   'capo_branco',          '', 33, 15, 2, 2),
  ('oncalynx', 'gata_ari', 'Oncalynx', 'predatore_silenzioso', '', 33, 16, 4, 1),
  ('kajan',    'gata_ari', 'Kajan',    'furia_felina',         '', 37, 16, 3, 2);

create temp table _discipline_groups (like public.discipline_groups including defaults);
insert into _discipline_groups (key, name, sort_order) values
  ('magia_elementale', 'Magia Elementale', 1),
  ('magia_ancestrale', 'Magia Ancestrale', 2),
  ('magia_bianca',     'Magia Bianca',     3),
  ('arti_marziali',    'Arti Marziali',    4);

create temp table _disciplines (like public.disciplines including defaults);
insert into _disciplines (key, group_key, name, sort_order) values
  ('fuoco',         'magia_elementale', 'Fuoco',           1),
  ('elettricita',   'magia_elementale', 'Elettricità',     2),
  ('aria',          'magia_elementale', 'Aria',            3),
  ('acqua',         'magia_elementale', 'Acqua',           4),
  ('terra',         'magia_elementale', 'Terra',           5),
  ('druidica',      'magia_ancestrale', 'Druidica',        1),
  ('evocazione',    'magia_ancestrale', 'Evocazione',      2),
  ('cura',          'magia_bianca',     'Cura',            1),
  ('illusione',     'magia_bianca',     'Illusione',       2),
  ('armi_una_mano', 'arti_marziali',    'Armi a una mano', 1),
  ('armi_due_mani', 'arti_marziali',    'Armi a due mani', 2),
  ('armi_furtive',  'arti_marziali',    'Armi furtive',    3),
  ('arco_frecce',   'arti_marziali',    'Arco e frecce',   4);

create temp table _vie (like public.vie including defaults);
insert into _vie (key, name, per_level_hp, per_level_mana, per_level_speed, first_talent_key, description, sort_order) values
  ('combattente', 'La via del Combattente', 2, 1, 0, 'tecnicista',        'Armi a una mano · Arco e frecce · Armi a due mani', 1),
  ('sapiente',    'La via del Sapiente',    1, 2, 0, 'talento_sapiente',  'Magia elementale · Magia arcana · Magia Bianca',    2),
  ('viandante',   'La via del Viandante',   1, 1, 0, 'talento_viandante', 'Usa tutti i talenti in modo libero · Consigliato a giocatori esperti', 3);

-- NB: lo screenshot del Sapiente dice "Magia arcana" ma nello step 5 il gruppo
-- si chiama 'magia_ancestrale'. Mappato su 'magia_ancestrale': se in futuro
-- nasce un gruppo 'magia_arcana' distinto, va corretto qui.
create temp table _via_discipline_groups (like public.via_discipline_groups including defaults);
insert into _via_discipline_groups (via_key, group_key) values
  ('combattente', 'arti_marziali'),
  ('sapiente',    'magia_elementale'),
  ('sapiente',    'magia_ancestrale'),
  ('sapiente',    'magia_bianca'),
  ('viandante',   'magia_elementale'),
  ('viandante',   'magia_ancestrale'),
  ('viandante',   'magia_bianca'),
  ('viandante',   'arti_marziali');

create temp table _wizard_categories (like public.wizard_categories including defaults);
insert into _wizard_categories (key, step, title, description, sort_order) values
  ('gender',       1, 'Sesso',            '', 1),
  ('attacco',      3, 'Tipo di attacco',  'In battaglia ogni colpo conta. Corpo a corpo o colpire da lontano con precisione.', 1),
  ('difesa',       3, 'Tipo di difesa',   'Non vinci senza difenderti. Scegli come proteggerti dagli attacchi nemici.',        2),
  ('reazione',     3, 'Tipo di reazione', 'Quando il pericolo arriva, la tua reazione fa la differenza.',                      3),
  ('allineamento', 4, 'Allineamento',     '', 1),
  ('moralita',     4, 'Moralità',         '', 2);

create temp table _wizard_options (like public.wizard_options including defaults);
insert into _wizard_options (category_key, key, name, description, sort_order) values
  ('gender',       'male',       'Maschio',    '', 1),
  ('gender',       'female',     'Femmina',    '', 2),
  ('attacco',      'mischia',    'Mischia',    '', 1),
  ('attacco',      'precisione', 'Precisione', '', 2),
  ('difesa',       'parata',     'Parata',     '', 1),
  ('difesa',       'schivata',   'Schivata',   '', 2),
  ('reazione',     'volonta',    'Volontà',    '', 1),
  ('reazione',     'prontezza',  'Prontezza',  '', 2),
  ('allineamento', 'legale',     'Legale',     '', 1),
  ('allineamento', 'neutrale',   'Neutrale',   '', 2),
  ('allineamento', 'caotico',    'Caotico',    '', 3),
  ('moralita',     'buono',      'Buono',      '', 1),
  ('moralita',     'neutrale',   'Neutrale',   '', 2),
  ('moralita',     'malvagio',   'Malvagio',   '', 3);

create temp table _character_traits (like public.character_traits including defaults);
insert into _character_traits (key, left_label, right_label, default_value, sort_order) values
  ('trait_social',    'Timido',         'Estroverso', 50, 1),
  ('trait_kindness',  'Arrogante',      'Gentile',    50, 2),
  ('trait_ambition',  'Umile',          'Ambizioso',  50, 3),
  ('trait_curiosity', 'Disinteressato', 'Curioso',    50, 4);

-- Budget slot dello step 5 (dedotto dagli screenshot: 8 allocazioni, contatore
-- a 0). Probabilmente diventerà funzione del livello; per ora è uno scalare.
create temp table _game_config (like public.game_config including defaults);
insert into _game_config (key, value) values
  ('discipline_slot_budget', '8'::jsonb);


-- ══════════════════════ §2 APPLY · dai padri ai figli ══════════════════════

insert into public.talents select * from _talents
on conflict (key) do update set
  name        = excluded.name,
  description = excluded.description,
  kind        = excluded.kind,
  sort_order  = excluded.sort_order;

insert into public.races select * from _races
on conflict (key) do update set
  name              = excluded.name,
  description_name  = excluded.description_name,
  description       = excluded.description,
  racial_talent_key = excluded.racial_talent_key,
  sort_order        = excluded.sort_order;

insert into public.stirpi select * from _stirpi
on conflict (key) do update set
  race_key    = excluded.race_key,
  name        = excluded.name,
  talent_key  = excluded.talent_key,
  description = excluded.description,
  base_hp     = excluded.base_hp,
  base_mana   = excluded.base_mana,
  base_speed  = excluded.base_speed,
  sort_order  = excluded.sort_order;

insert into public.discipline_groups select * from _discipline_groups
on conflict (key) do update set
  name       = excluded.name,
  sort_order = excluded.sort_order;

insert into public.disciplines select * from _disciplines
on conflict (key) do update set
  group_key  = excluded.group_key,
  name       = excluded.name,
  sort_order = excluded.sort_order;

insert into public.vie select * from _vie
on conflict (key) do update set
  name             = excluded.name,
  per_level_hp     = excluded.per_level_hp,
  per_level_mana   = excluded.per_level_mana,
  per_level_speed  = excluded.per_level_speed,
  first_talent_key = excluded.first_talent_key,
  description      = excluded.description,
  sort_order       = excluded.sort_order;

-- Tabella di sole chiavi: non c'è nulla da aggiornare, l'unica differenza
-- possibile è la presenza o meno della riga (§3).
insert into public.via_discipline_groups select * from _via_discipline_groups
on conflict (via_key, group_key) do nothing;

insert into public.wizard_categories select * from _wizard_categories
on conflict (key) do update set
  step        = excluded.step,
  title       = excluded.title,
  description = excluded.description,
  sort_order  = excluded.sort_order;

insert into public.wizard_options select * from _wizard_options
on conflict (category_key, key) do update set
  name        = excluded.name,
  description = excluded.description,
  sort_order  = excluded.sort_order;

insert into public.character_traits select * from _character_traits
on conflict (key) do update set
  left_label    = excluded.left_label,
  right_label   = excluded.right_label,
  default_value = excluded.default_value,
  sort_order    = excluded.sort_order;

insert into public.game_config select * from _game_config
on conflict (key) do update set
  value = excluded.value;


-- ══════════════════════ §3 PRUNE · dai figli ai padri ══════════════════════
-- Toglie le righe che non compaiono più nel §1. L'ordine è l'inverso del §2:
-- nessuna riga viene cancellata finché qualcuno la referenzia ancora.

delete from public.game_config c
where not exists (select 1 from _game_config s where s.key = c.key);

delete from public.character_traits c
where not exists (select 1 from _character_traits s where s.key = c.key);

delete from public.wizard_options o
where not exists (
  select 1 from _wizard_options s
  where s.category_key = o.category_key and s.key = o.key
);

delete from public.wizard_categories c
where not exists (select 1 from _wizard_categories s where s.key = c.key);

delete from public.via_discipline_groups v
where not exists (
  select 1 from _via_discipline_groups s
  where s.via_key = v.via_key and s.group_key = v.group_key
);

delete from public.vie v
where not exists (select 1 from _vie s where s.key = v.key);

delete from public.disciplines d
where not exists (select 1 from _disciplines s where s.key = d.key);

delete from public.discipline_groups g
where not exists (select 1 from _discipline_groups s where s.key = g.key);

delete from public.stirpi t
where not exists (select 1 from _stirpi s where s.key = t.key);

delete from public.races r
where not exists (select 1 from _races s where s.key = r.key);

delete from public.talents t
where not exists (select 1 from _talents s where s.key = t.key);


-- ═════════════════════════════ §4 CLEANUP ══════════════════════════════════
-- Le tabelle temporanee morirebbero comunque con la sessione; sbarazzarsene
-- qui rende il file riapplicabile anche due volte sulla stessa connessione
-- (il seeder della CLI lavora su un pool, la connessione viene riusata).

drop table _talents, _races, _stirpi, _discipline_groups, _disciplines, _vie,
           _via_discipline_groups, _wizard_categories, _wizard_options,
           _character_traits, _game_config;

end
$seed$;
