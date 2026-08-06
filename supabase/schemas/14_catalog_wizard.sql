-- ══════════════ CATALOGO · SCELTE SINGOLE E ASSI DEL CARATTERE ═════════════

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
