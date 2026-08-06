-- ════════════════════════ SEED DEL CATALOGO WIZARD ═════════════════════════
-- Migrazione scritta a mano (non generata): il diff dichiarativo non gestisce
-- il DML, vedi CLAUDE.md § "Eccezioni: cosa NON va in schemas/".
--
-- Il catalogo è dato di riferimento necessario anche in produzione, quindi vive
-- in una migrazione e non in supabase/seed.sql (che gira solo in locale).
-- Aggiornamenti futuri dei contenuti: nuova migrazione con upsert espliciti.
--
-- Valori presi dagli screenshot del wizard. 'TODO' / NULL = ancora da definire.

insert into public.talents (key, name, description, kind, sort_order) values
  ('apprendimento',    'Apprendimento',   '+1 punto competenza a ogni livello, da assegnare alle Abilità Tecniche. Imparano più in fretta di ogni altra razza.', 'racial', 1),
  ('incoraggiamento',  'Incoraggiamento', 'Umani imperiali di città, di educazione cavalleresca. Prima dello scontro rialzano il morale degli alleati contro la paura.', 'stirpe', 2),
  ('kodron',           'Kodron',          'TODO: talento della stirpe Kodron.', 'stirpe', 3),
  ('tecnicista',       'Tecnicista',      'TODO: descrizione del talento Tecnicista.', 'via', 4),
  ('talento_sapiente', 'TODO Sapiente',   'TODO: primo talento della Via del Sapiente.', 'via', 5),
  ('talento_viandante','TODO Viandante',  'TODO: primo talento della Via del Viandante.', 'via', 6)
on conflict (key) do nothing;

insert into public.discipline_groups (key, name, sort_order) values
  ('magia_elementale', 'Magia Elementale', 1),
  ('magia_ancestrale', 'Magia Ancestrale', 2),
  ('magia_bianca',     'Magia Bianca',     3),
  ('arti_marziali',    'Arti Marziali',    4)
on conflict (key) do nothing;

insert into public.disciplines (key, group_key, name, sort_order) values
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
  ('arco_frecce',   'arti_marziali',    'Arco e frecce',   4)
on conflict (key) do nothing;

insert into public.races (key, name, base_hp, base_mana, base_speed, racial_talent_key, sort_order) values
  ('umani',    'Umani',    38,   20,   6,    'apprendimento', 1),
  ('nani',     'Nani',     null, null, null, null,            2),
  ('orchi',    'Orchi',    null, null, null, null,            3),
  ('elfi',     'Elfi',     null, null, null, null,            4),
  ('ulu_ari',  'Ulu-Ari',  null, null, null, null,            5),
  ('gata_ari', 'Gata-Ari', null, null, null, null,            6)
on conflict (key) do nothing;

insert into public.stirpi (key, race_key, name, talent_key, sort_order) values
  ('eruscal', 'umani', 'Eruscal', 'incoraggiamento', 1),
  ('kodron',  'umani', 'Kodron',  'kodron',          2)
on conflict (key) do nothing;

insert into public.vie (key, name, per_level_hp, per_level_mana, per_level_speed, first_talent_key, description, sort_order) values
  ('combattente', 'La via del Combattente', 2, 1, 0, 'tecnicista',        'Armi a una mano · Arco e frecce · Armi a due mani', 1),
  ('sapiente',    'La via del Sapiente',    1, 2, 0, 'talento_sapiente',  'Magia elementale · Magia arcana · Magia Bianca',    2),
  ('viandante',   'La via del Viandante',   1, 1, 0, 'talento_viandante', 'Usa tutti i talenti in modo libero · Consigliato a giocatori esperti', 3)
on conflict (key) do nothing;

-- NB: lo screenshot del Sapiente dice "Magia arcana" ma nello step 5 il gruppo
-- si chiama 'magia_ancestrale'. Mappato su 'magia_ancestrale': se in futuro
-- nasce un gruppo 'magia_arcana' distinto, serve una migrazione di correzione.
insert into public.via_discipline_groups (via_key, group_key) values
  ('combattente', 'arti_marziali'),
  ('sapiente',    'magia_elementale'),
  ('sapiente',    'magia_ancestrale'),
  ('sapiente',    'magia_bianca'),
  ('viandante',   'magia_elementale'),
  ('viandante',   'magia_ancestrale'),
  ('viandante',   'magia_bianca'),
  ('viandante',   'arti_marziali')
on conflict (via_key, group_key) do nothing;

insert into public.wizard_categories (key, step, title, description, sort_order) values
  ('gender',       1, 'Sesso',            '', 1),
  ('attacco',      3, 'Tipo di attacco',  'In battaglia ogni colpo conta. Corpo a corpo o colpire da lontano con precisione.', 1),
  ('difesa',       3, 'Tipo di difesa',   'Non vinci senza difenderti. Scegli come proteggerti dagli attacchi nemici.',        2),
  ('reazione',     3, 'Tipo di reazione', 'Quando il pericolo arriva, la tua reazione fa la differenza.',                      3),
  ('allineamento', 4, 'Allineamento',     '', 1),
  ('moralita',     4, 'Moralità',         '', 2)
on conflict (key) do nothing;

insert into public.wizard_options (category_key, key, name, description, sort_order) values
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
  ('moralita',     'malvagio',   'Malvagio',   '', 3)
on conflict (category_key, key) do nothing;

insert into public.character_traits (key, left_label, right_label, default_value, sort_order) values
  ('trait_social',    'Timido',         'Estroverso', 50, 1),
  ('trait_kindness',  'Arrogante',      'Gentile',    50, 2),
  ('trait_ambition',  'Umile',          'Ambizioso',  50, 3),
  ('trait_curiosity', 'Disinteressato', 'Curioso',    50, 4)
on conflict (key) do nothing;

-- Budget slot dello step 5 (dedotto dagli screenshot: 8 allocazioni, contatore a 0).
-- Probabilmente diventerà funzione del livello; per ora è uno scalare.
insert into public.game_config (key, value) values
  ('discipline_slot_budget', '8'::jsonb)
on conflict (key) do nothing;
