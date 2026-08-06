-- ═════════════════════ CATALOGO · DISCIPLINE E GRUPPI ══════════════════════

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
