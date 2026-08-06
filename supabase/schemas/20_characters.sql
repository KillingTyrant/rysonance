-- ══════════════════════════════ PERSONAGGI ═════════════════════════════════
-- Scelte per-utente del wizard: solo chiavi verso il catalogo + snapshot stat.
-- Dinamica a runtime e protetta da RLS per owner.
--
-- Le colonne *_key delle scelte singole sono vincolate al catalogo tramite una
-- FK composta (categoria, opzione): la categoria è una colonna generata
-- costante, così il DB rifiuta p.es. un allineamento messo in attack_key.
-- Colonna NULL = step non ancora compilato (le bozze sono parziali).

create table public.characters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  status        public.character_status not null default 'draft',
  name          text check (name is null or length(btrim(name)) > 0),

  -- Step 1 · Razza, stirpe, sesso
  race_key      text references public.races (key),
  stirpe_key    text references public.stirpi (key),
  gender_key    text,
  gender_category text generated always as ('gender'::text) stored,

  -- Step 2 · La Via
  via_key       text references public.vie (key),

  -- Step 3 · Stile di combattimento
  attack_key    text,
  attack_category text generated always as ('attacco'::text) stored,
  defense_key   text,
  defense_category text generated always as ('difesa'::text) stored,
  reaction_key  text,
  reaction_category text generated always as ('reazione'::text) stored,

  -- Step 4 · Tendenza sociale
  alignment_key text,
  alignment_category text generated always as ('allineamento'::text) stored,
  morality_key  text,
  morality_category text generated always as ('moralita'::text) stored,
  trait_social    smallint check (trait_social    between 0 and 100), -- Timido ↔ Estroverso
  trait_kindness  smallint check (trait_kindness  between 0 and 100), -- Arrogante ↔ Gentile
  trait_ambition  smallint check (trait_ambition  between 0 and 100), -- Umile ↔ Ambizioso
  trait_curiosity smallint check (trait_curiosity between 0 and 100), -- Disinteressato ↔ Curioso

  -- Step 5 · Allocazione slot per disciplina.
  -- es. {"acqua":1,"evocazione":1,"cura":1,"armi_una_mano":1,"armi_furtive":4}
  discipline_points jsonb not null default '{}'::jsonb
                    check (jsonb_typeof(discipline_points) = 'object'),

  -- Snapshot stat derivate (razza + via × livello) al momento del salvataggio.
  level  smallint not null default 1 check (level >= 1),
  hp     smallint,
  mana   smallint,
  speed  smallint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- La stirpe deve appartenere alla razza scelta.
  foreign key (race_key, stirpe_key) references public.stirpi (race_key, key),

  -- Ogni scelta singola deve esistere nella propria categoria di catalogo.
  foreign key (gender_category, gender_key)       references public.wizard_options (category_key, key),
  foreign key (attack_category, attack_key)       references public.wizard_options (category_key, key),
  foreign key (defense_category, defense_key)     references public.wizard_options (category_key, key),
  foreign key (reaction_category, reaction_key)   references public.wizard_options (category_key, key),
  foreign key (alignment_category, alignment_key) references public.wizard_options (category_key, key),
  foreign key (morality_category, morality_key)   references public.wizard_options (category_key, key),

  -- Campi obbligatori SOLO a personaggio completato (la bozza è parziale).
  constraint characters_completed_required check (
    status <> 'completed' or (
      name is not null and race_key is not null and stirpe_key is not null
      and gender_key is not null and via_key is not null
      and attack_key is not null and defense_key is not null and reaction_key is not null
      and alignment_key is not null and morality_key is not null
    )
  )
);

create index characters_user_id_idx     on public.characters (user_id);
create index characters_user_status_idx on public.characters (user_id, status);

-- Indici sulle FK verso il catalogo (servono a UPDATE/DELETE sul lato padre).
create index characters_race_key_idx   on public.characters (race_key);
create index characters_stirpe_key_idx on public.characters (stirpe_key);
create index characters_via_key_idx    on public.characters (via_key);

-- (Facoltativo) al massimo una bozza per utente:
-- create unique index characters_one_draft_per_user
--   on public.characters (user_id) where status = 'draft';

create trigger characters_touch_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────── RLS ───────────────────────────────────
-- Ognuno vede e modifica solo i propri personaggi. `select auth.uid()` è
-- wrappato in subquery così Postgres lo valuta una volta sola per query.

alter table public.characters enable row level security;

create policy characters_select_own on public.characters
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy characters_insert_own on public.characters
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy characters_update_own on public.characters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy characters_delete_own on public.characters
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.characters to authenticated;
