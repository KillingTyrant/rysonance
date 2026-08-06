-- ═══════════════════════ CATALOGO · CONFIG DI GIOCO ════════════════════════
-- Valori scalari letti a build time (budget slot dello step 5, ecc.).

create table public.game_config (
  key   text primary key,
  value jsonb not null
);

alter table public.game_config enable row level security;

create policy game_config_read on public.game_config
  for select to anon, authenticated using (true);

grant select on table public.game_config to anon, authenticated;
