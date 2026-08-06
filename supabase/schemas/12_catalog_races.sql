-- ══════════════════════ CATALOGO · RAZZE E STIRPI ══════════════════════════

-- Razze: stat base al livello 1 + talento razziale.
create table public.races (
  key                text primary key,  -- 'umani' | 'nani' | ...
  name               text not null,
  base_hp            smallint,          -- NULL finché non definito
  base_mana          smallint,
  base_speed         smallint,
  racial_talent_key  text references public.talents (key),
  sort_order         smallint not null default 0
);

create index races_racial_talent_key_idx on public.races (racial_talent_key);

alter table public.races enable row level security;

create policy races_read on public.races
  for select to anon, authenticated using (true);

grant select on table public.races to anon, authenticated;

-- Stirpi: appartengono a una razza e portano un talento di stirpe.
create table public.stirpi (
  key         text primary key,         -- 'eruscal' | 'kodron' | ...
  race_key    text not null references public.races (key) on delete cascade,
  name        text not null,
  talent_key  text references public.talents (key),
  description text not null default '',
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
