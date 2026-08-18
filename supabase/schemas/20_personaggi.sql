-- ══════════════════════════════ PERSONAGGI ═════════════════════════════════
-- Le scelte per-utente: solo chiavi verso il catalogo, più lo snapshot delle
-- statistiche al momento della creazione. Dinamica a runtime e protetta da RLS
-- per owner.
--
-- Non esistono bozze: il wizard tiene lo stato in memoria del browser e scrive
-- una sola volta, a fine percorso. Per questo tutte le colonne di scelta sono
-- `not null` e non serve né uno `status` né un check "obbligatorio solo se
-- completato".

create table public.personaggi (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,

  name           text not null check (char_length(btrim(name)) between 1 and 40),
  sesso          public.sesso not null,

  -- Nell'ordine in cui il wizard le chiede: la creazione comincia dalla Via.
  via_key        text not null references public.vie (key),
  razza_key      text not null references public.razze (key),
  tribu_key      text not null,

  -- La Caratteristica su cui è finito il +1 della razza. Non è ricavabile dai
  -- valori (un +1 non si distingue da un punto speso), e serve a rileggere la
  -- creazione: senza, un personaggio con Forza 3 non dice quanto ci ha messo il
  -- giocatore. Il valore finale sta comunque in personaggio_caratteristiche.
  bonus_caratteristica_key text not null,

  -- Il combattimento è una contrapposizione fra attacco e difesa, e ciascuno
  -- dei due è fisico o magico. Sono due assi indipendenti: si può attaccare
  -- fisicamente e difendersi magicamente.
  attacco        public.stile not null,
  difesa         public.stile not null,

  -- Snapshot scritto dal DB in crea_personaggio: la scheda non cambia sotto i
  -- piedi se il catalogo viene ritoccato. PF e Mana vengono dalle
  -- Caratteristiche (Vigore ed Empatia Arcana), la velocità dalla tribù —
  -- che può non averla ancora definita, da cui il null.
  hp    smallint not null,
  mana  smallint not null,
  speed smallint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- La tribù deve appartenere alla razza scelta. Implica già l'esistenza della
  -- tribù: una FK semplice su tribu_key sarebbe ridondante.
  foreign key (razza_key, tribu_key) references public.tribu (razza_key, key),

  -- E il +1 dev'essere su una delle Caratteristiche che quella razza offre.
  -- Stesso meccanismo: è il database a impedire un Nano col bonus su una
  -- Caratteristica che i Nani non danno, non la validazione dell'app.
  foreign key (razza_key, bonus_caratteristica_key)
    references public.razza_caratteristiche (razza_key, caratteristica_key)
);

-- user_id è il predicato di ogni policy RLS: senza indice ogni lettura è un seq scan.
create index personaggi_user_id_idx on public.personaggi (user_id);

-- Coprono le FK composte e, come colonna guida, anche la FK verso razze.
create index personaggi_razza_tribu_idx on public.personaggi (razza_key, tribu_key);
create index personaggi_razza_bonus_idx
  on public.personaggi (razza_key, bonus_caratteristica_key);
create index personaggi_via_key_idx on public.personaggi (via_key);

create trigger personaggi_touch_updated_at
  before update on public.personaggi
  for each row execute function public.touch_updated_at();

-- ─────────────────────── CARATTERISTICHE DEL PERSONAGGIO ───────────────────
-- Una riga per ogni Caratteristica di catalogo, col valore finale: i punti
-- distribuiti dal giocatore più l'eventuale +1 della razza. La completezza
-- (tutte e sei presenti) è garantita per costruzione da public.crea_personaggio,
-- che le inserisce leggendo `caratteristiche`.
--
-- Il tetto di 3 NON è qui: è una regola della creazione, non un invariante
-- della riga — salendo di livello i valori lo supereranno. Lo applica
-- crea_personaggio, che è l'unico posto in cui "alla creazione" ha senso.

create table public.personaggio_caratteristiche (
  personaggio_id     uuid not null references public.personaggi (id) on delete cascade,
  caratteristica_key text not null references public.caratteristiche (key),
  value              smallint not null check (value >= 0),

  -- Copre anche la FK verso personaggi, che è la colonna guida.
  primary key (personaggio_id, caratteristica_key)
);

create index personaggio_caratteristiche_caratteristica_key_idx
  on public.personaggio_caratteristiche (caratteristica_key);

-- ─────────────────────────── TENDENZE DEL PERSONAGGIO ──────────────────────
-- Una riga per ogni tendenza di catalogo. La completezza (tutte presenti) è
-- garantita per costruzione da public.crea_personaggio, che le inserisce
-- leggendo `tendenze`; la FK garantisce che la chiave esista davvero.

create table public.personaggio_tendenze (
  personaggio_id uuid not null references public.personaggi (id) on delete cascade,
  tendenza_key   text not null references public.tendenze (key),
  value          smallint not null,

  -- Copre anche la FK verso personaggi, che è la colonna guida.
  primary key (personaggio_id, tendenza_key)
);

create index personaggio_tendenze_tendenza_key_idx
  on public.personaggio_tendenze (tendenza_key);

-- Il limite di ciascuna tendenza sta su un'altra riga (tendenze.min_value /
-- max_value), quindi non è esprimibile con un `check`: serve un trigger.
--
-- Non è difesa in profondità teorica: la RLS concede insert/update all'owner,
-- quindi un utente autenticato può fare una PATCH diretta a PostgREST con il
-- proprio JWT e scavalcare del tutto la server action. Questo trigger è ciò che
-- rende il vincolo reale.
create or replace function public.check_tendenza_value()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.tendenze t
    where t.key = new.tendenza_key
      and new.value between t.min_value and t.max_value
  ) then
    raise exception 'Valore % fuori dai limiti della tendenza "%"',
      new.value, new.tendenza_key
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger personaggio_tendenze_check_value
  before insert or update of tendenza_key, value on public.personaggio_tendenze
  for each row execute function public.check_tendenza_value();

-- ─────────────────────────── TALENTI DEL PERSONAGGIO ───────────────────────
-- Solo i talenti SCELTI dall'utente nel proprio step del wizard. Quelli di
-- razza, tribù e via non stanno qui: sono già deducibili da razza_key /
-- tribu_key / via_key, e duplicarli vorrebbe dire tenerli in sync a mano.
--
-- È l'unica relazione verso `talenti` che parte dal personaggio: nel catalogo
-- questi talenti non hanno un proprietario che li punti.

create table public.personaggio_talenti (
  personaggio_id uuid not null references public.personaggi (id) on delete cascade,
  talent_key     text not null,

  -- Stesso meccanismo del catalogo: colonna generata costante + FK composta su
  -- (key, kind). È ciò che impedisce di scegliere come talento libero un
  -- talento di razza o di via — la FK semplice su talent_key sarebbe implicita
  -- in questa, quindi non c'è.
  talent_kind    text generated always as ('scelta'::text) stored,
  foreign key (talent_key, talent_kind) references public.talenti (key, kind),

  -- Copre anche la FK verso personaggi, che è la colonna guida, e impedisce di
  -- scegliere due volte lo stesso talento.
  primary key (personaggio_id, talent_key)
);

create index personaggio_talenti_talent_key_idx
  on public.personaggio_talenti (talent_key);

-- Quanti talenti a scelta spettano a chi percorre questa via: due, più quelli
-- che concede il talento con cui la via comincia. È così che "giusta scelta"
-- del Viandante ne dà tre — la regola sta nel catalogo
-- (`talenti.properties.talenti_scelta_extra`), non nel codice, quindi un altro
-- talento che desse lo stesso bonus non richiederebbe di toccare niente.
--
-- Il 2 di base è ripetuto in lib/onboarding/selectors.ts (TALENTI_SCELTI_BASE):
-- se cambia, cambia in tutti e due.
create or replace function public.talenti_a_scelta(p_via_key text)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 2 + coalesce(max(
    case when jsonb_typeof(t.properties -> 'talenti_scelta_extra') = 'number'
         then (t.properties ->> 'talenti_scelta_extra')::integer
    end
  ), 0)
  from public.sottovie s
  join public.talenti t on t.key = s.talent_key
  where s.via_key = p_via_key and s.level = 0;
$$;

-- Il numero esatto non è esprimibile come check: le righe di un personaggio non
-- si vedono dalla riga che si sta scrivendo, e il limite dipende dalla via.
-- Il tetto però sì, ed è la metà che conta — il minimo lo garantisce
-- public.crea_personaggio, che le inserisce tutte nella stessa transazione.
--
-- Come per personaggio_tendenze, non è difesa in profondità teorica: la RLS
-- concede l'insert all'owner, quindi un utente autenticato può chiamare
-- PostgREST con il proprio JWT e aggiungersi un talento in più scavalcando la
-- server action.
create or replace function public.check_talenti_scelti()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_max integer;
begin
  select public.talenti_a_scelta(p.via_key) into v_max
  from public.personaggi p
  where p.id = new.personaggio_id;

  if (
    select count(*)
    from public.personaggio_talenti t
    where t.personaggio_id = new.personaggio_id
  ) > coalesce(v_max, 2) then
    raise exception 'Questo personaggio può avere al massimo % talenti a scelta',
      coalesce(v_max, 2)
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create trigger personaggio_talenti_check_count
  after insert or update of personaggio_id on public.personaggio_talenti
  for each row execute function public.check_talenti_scelti();

-- ─────────────────────────────────── RLS ───────────────────────────────────
-- Ognuno vede e modifica solo i propri personaggi. `select auth.uid()` è
-- wrappato in subquery così Postgres lo valuta una volta sola per query.

alter table public.personaggi enable row level security;

create policy personaggi_select_own on public.personaggi
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy personaggi_insert_own on public.personaggi
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy personaggi_update_own on public.personaggi
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy personaggi_delete_own on public.personaggi
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.personaggi to authenticated;

-- L'ownership delle tre tabelle figlie è indiretta: passa dal personaggio.
-- L'indice su personaggi.user_id e le loro PK rendono la subquery una lookup,
-- non una scansione.

alter table public.personaggio_caratteristiche enable row level security;

create policy personaggio_caratteristiche_select_own on public.personaggio_caratteristiche
  for select to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_caratteristiche_insert_own on public.personaggio_caratteristiche
  for insert to authenticated
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_caratteristiche_update_own on public.personaggio_caratteristiche
  for update to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_caratteristiche_delete_own on public.personaggio_caratteristiche
  for delete to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on table public.personaggio_caratteristiche to authenticated;

alter table public.personaggio_tendenze enable row level security;

create policy personaggio_tendenze_select_own on public.personaggio_tendenze
  for select to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_tendenze_insert_own on public.personaggio_tendenze
  for insert to authenticated
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_tendenze_update_own on public.personaggio_tendenze
  for update to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_tendenze_delete_own on public.personaggio_tendenze
  for delete to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on table public.personaggio_tendenze to authenticated;

alter table public.personaggio_talenti enable row level security;

create policy personaggio_talenti_select_own on public.personaggio_talenti
  for select to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_talenti_insert_own on public.personaggio_talenti
  for insert to authenticated
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_talenti_update_own on public.personaggio_talenti
  for update to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

create policy personaggio_talenti_delete_own on public.personaggio_talenti
  for delete to authenticated
  using (exists (
    select 1 from public.personaggi p
    where p.id = personaggio_id and p.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on table public.personaggio_talenti to authenticated;
