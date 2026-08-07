-- ═══════════════════════════════ CATALOGO ══════════════════════════════════
-- Il catalogo è l'unica fonte di verità del wizard di onboarding: viene letto a
-- build time da Next.js (force-static) e congelato nelle pagine, quindi a
-- runtime non ci sono query. Lettura pubblica (anon + authenticated); le
-- scritture passano solo da service_role / migrazioni.
--
-- I contenuti (le righe) non stanno qui né nelle migrazioni: vivono in
-- `supabase/seeds/00_catalog.sql`.
--
-- L'ordine delle tabelle in questo file segue le dipendenze delle foreign key:
--   talents → discipline_groups → disciplines → races → stirpi
--           → vie → via_discipline_groups
--           → wizard_categories → wizard_options → character_traits
--           → game_config

-- ──────────────────────────────── TALENTI ──────────────────────────────────

create table public.talents (
  key         text primary key,        -- es. 'apprendimento', 'incoraggiamento'
  name        text not null,
  description text not null default '',
  kind        text not null default 'generic'
              check (kind in ('racial', 'stirpe', 'via', 'generic')),
  sort_order  smallint not null default 0
);

alter table public.talents enable row level security;

create policy talents_read on public.talents
  for select to anon, authenticated using (true);

grant select on table public.talents to anon, authenticated;

-- ─────────────────────── DISCIPLINE E LORO GRUPPI ──────────────────────────

-- Gruppi di discipline: le "colonne" dello step 5.
create table public.discipline_groups (
  key        text primary key,         -- 'magia_elementale' | 'arti_marziali' | ...
  name       text not null,
  sort_order smallint not null default 0
);

alter table public.discipline_groups enable row level security;

create policy discipline_groups_read on public.discipline_groups
  for select to anon, authenticated using (true);

grant select on table public.discipline_groups to anon, authenticated;

-- Discipline: ogni disciplina appartiene a un gruppo.
create table public.disciplines (
  key        text primary key,         -- 'fuoco' | 'armi_furtive' | ...
  group_key  text not null references public.discipline_groups (key) on delete cascade,
  name       text not null,
  sort_order smallint not null default 0
);

create index disciplines_group_key_idx on public.disciplines (group_key);

alter table public.disciplines enable row level security;

create policy disciplines_read on public.disciplines
  for select to anon, authenticated using (true);

grant select on table public.disciplines to anon, authenticated;

-- ─────────────────────────── RAZZE E STIRPI ────────────────────────────────

-- Razze: raggruppano le stirpi e portano il talento razziale. Le statistiche
-- base non stanno qui: appartengono alla stirpe (vedi sotto).
create table public.races (
  key                text primary key,  -- 'umani' | 'nani' | ...
  name               text not null, -- 'Umani' | 'Nani' | ...
  description_name   text not null default '', -- 'Apprendimento' | 'Sapienza meccanica' | ...
  description        text not null default '',
  racial_talent_key  text references public.talents (key),
  sort_order         smallint not null default 0
);

create index races_racial_talent_key_idx on public.races (racial_talent_key);

alter table public.races enable row level security;

create policy races_read on public.races
  for select to anon, authenticated using (true);

grant select on table public.races to anon, authenticated;

-- Stirpi: appartengono a una razza, portano un talento di stirpe e definiscono
-- le statistiche di partenza (livello 1) del personaggio.
create table public.stirpi (
  key         text primary key,         -- 'eruscal' | 'kodron' | ...
  race_key    text not null references public.races (key) on delete cascade,
  name        text not null, -- 'Eruscal' | 'Kodron' | ...
  talent_key  text references public.talents (key),
  description text not null default '',
  base_hp     smallint,                 -- NULL finché non definito
  base_mana   smallint,
  base_speed  smallint,
  sort_order  smallint not null default 0,

  -- Necessaria per la FK composta da characters: garantisce che la stirpe
  -- scelta appartenga davvero alla razza scelta.
  unique (race_key, key)
);

create index stirpi_race_key_idx on public.stirpi (race_key);
create index stirpi_talent_key_idx on public.stirpi (talent_key);

alter table public.stirpi enable row level security;

create policy stirpi_read on public.stirpi
  for select to anon, authenticated using (true);

grant select on table public.stirpi to anon, authenticated;

-- ──────────────────────────────── VIE ──────────────────────────────────────

-- Vie: incremento stat per livello, primo talento, descrizione.
create table public.vie (
  key              text primary key,    -- 'combattente' | 'sapiente' | 'viandante'
  name             text not null,
  per_level_hp     smallint not null default 0,
  per_level_mana   smallint not null default 0,
  per_level_speed  smallint not null default 0,
  first_talent_key text references public.talents (key),
  description      text not null default '',
  sort_order       smallint not null default 0
);

create index vie_first_talent_key_idx on public.vie (first_talent_key);

alter table public.vie enable row level security;

create policy vie_read on public.vie
  for select to anon, authenticated using (true);

grant select on table public.vie to anon, authenticated;

-- M:N — quali gruppi di discipline sono consentiti da ciascuna via (step 5).
create table public.via_discipline_groups (
  via_key   text not null references public.vie (key) on delete cascade,
  group_key text not null references public.discipline_groups (key) on delete cascade,
  primary key (via_key, group_key)
);

-- La PK copre già le query per via_key; questo indice serve alle FK su group_key.
create index via_discipline_groups_group_key_idx on public.via_discipline_groups (group_key);

alter table public.via_discipline_groups enable row level security;

create policy via_discipline_groups_read on public.via_discipline_groups
  for select to anon, authenticated using (true);

grant select on table public.via_discipline_groups to anon, authenticated;

-- ──────────────── SCELTE SINGOLE E ASSI DEL CARATTERE ──────────────────────

-- Categorie a scelta singola degli step "Sesso / Stile / Tendenza".
create table public.wizard_categories (
  key         text primary key,   -- 'gender' | 'attacco' | 'difesa' | 'reazione' | 'allineamento' | 'moralita'
  step        smallint not null,  -- 1 (sesso) | 3 (stile) | 4 (tendenza)
  title       text not null,
  description text not null default '',
  sort_order  smallint not null default 0
);

alter table public.wizard_categories enable row level security;

create policy wizard_categories_read on public.wizard_categories
  for select to anon, authenticated using (true);

grant select on table public.wizard_categories to anon, authenticated;

-- Opzioni di ciascuna categoria (le card/toggle selezionabili).
-- La chiave è unica solo dentro la categoria ('neutrale' esiste sia in
-- allineamento sia in moralità), da cui la PK composta.
create table public.wizard_options (
  category_key text not null references public.wizard_categories (key) on delete cascade,
  key          text not null,     -- 'mischia' | 'schivata' | 'legale' | ...
  name         text not null,
  description  text not null default '',
  sort_order   smallint not null default 0,
  primary key (category_key, key)
);

alter table public.wizard_options enable row level security;

create policy wizard_options_read on public.wizard_options
  for select to anon, authenticated using (true);

grant select on table public.wizard_options to anon, authenticated;

-- Assi del "Carattere" (slider 0..100) dello step 4.
create table public.character_traits (
  key           text primary key,  -- 'trait_social' | 'trait_kindness' | ...
  left_label    text not null,     -- valore 0
  right_label   text not null,     -- valore 100
  default_value smallint not null default 50 check (default_value between 0 and 100),
  sort_order    smallint not null default 0
);

alter table public.character_traits enable row level security;

create policy character_traits_read on public.character_traits
  for select to anon, authenticated using (true);

grant select on table public.character_traits to anon, authenticated;

-- ───────────────────────────── CONFIG DI GIOCO ─────────────────────────────
-- Valori scalari letti a build time (budget slot dello step 5, ecc.).

create table public.game_config (
  key   text primary key,
  value jsonb not null
);

alter table public.game_config enable row level security;

create policy game_config_read on public.game_config
  for select to anon, authenticated using (true);

grant select on table public.game_config to anon, authenticated;
