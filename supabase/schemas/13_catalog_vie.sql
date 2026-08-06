-- ═══════════════════════════ CATALOGO · VIE ════════════════════════════════

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
