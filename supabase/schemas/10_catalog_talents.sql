-- ═══════════════════════════ CATALOGO · TALENTI ════════════════════════════
-- Il catalogo è l'unica fonte di verità del wizard di onboarding: viene letto a
-- build time da Next.js (force-static) e congelato nelle pagine, quindi a
-- runtime non ci sono query. Lettura pubblica (anon + authenticated); le
-- scritture passano solo da service_role / migrazioni.

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
