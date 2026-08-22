-- ═══════════════════════════════ CATALOGO ══════════════════════════════════
-- Struttura del catalogo di gioco. I CONTENUTI (le righe) non stanno qui né
-- nelle migrazioni: vivono in `supabase/seeds/00_catalog.sql`.
--
-- Il catalogo descrive SOLO il gioco: non c'è nulla che descriva la forma della
-- UI (numeri di step, categorie di widget). Il wizard interroga queste tabelle,
-- non è definito da esse. Viene letto a build time da Next.js e congelato nelle
-- pagine, quindi a runtime non ci sono query. Lettura pubblica (anon +
-- authenticated); le scritture passano solo da service_role / seed.
--
-- Le relazioni verso i talenti vanno in UNA sola direzione: è il proprietario
-- del talento a puntarlo (razze / tribù / sottovie → talenti), mai il
-- contrario. Se anche `talenti` puntasse indietro alle sue origini si creerebbe
-- un ciclo di foreign key: impossibile da scrivere in un file dichiarativo (una
-- delle due tabelle non esisterebbe ancora) e impossibile da popolare senza
-- vincoli `deferrable`. Fanno eccezione i talenti `kind = 'scelta'`, che nel
-- catalogo non hanno un proprietario: li punta il personaggio (vedi
-- `public.personaggio_talenti`).
--
-- La coerenza fra `talenti.kind` e chi lo assegna è imposta dal DB con una FK
-- composta su (talent_key, talent_kind), dove `talent_kind` è una colonna
-- generata costante: il DB rifiuta di assegnare a una razza un talento di via.
--
-- Ordine di dichiarazione (dipendenze delle FK):
--   talenti → caratteristiche → razze → razza_caratteristiche → tribu
--   → vie → sottovie → tendenze

-- ──────────────────────────────── TALENTI ──────────────────────────────────
-- Abilità speciali dei personaggi. `kind` dice da dove arriva il talento:
--
--   'razza' | 'tribu' | 'via'  assegnati dalle scelte del wizard; il legame con
--                              la specifica razza o via non è qui, è sul lato di
--                              chi lo assegna
--   'scelta'                   li aggiunge l'utente nel proprio step, senza
--                              vincoli: nessuno li assegna, li punta il
--                              personaggio
--
-- `scuola` / `disciplina` / `ramo` esistono solo per i talenti a scelta e sono
-- ETICHETTE, non entità: nessuna tabella, nessuna FK, nessuna gerarchia da
-- navigare. Servono a raggruppare e filtrare le 254 opzioni dello step, che
-- altrimenti sarebbero una lista piatta impraticabile. La scelta non è
-- vincolata da nessuna delle tre.

create table public.talenti (
  key         text primary key,        -- 'rz-umano-apprendimento' | 'ff-fiammata' | ...
  name        text not null,
  description text not null default '',
  kind        text not null check (kind in ('razza', 'tribu', 'via', 'scelta')),

  scuola      text,                    -- 'magia elementale' | 'armi da mischia' | ...
  disciplina  text,                    -- 'magia del fuoco' | 'arco e frecce' | ...
  ramo        text,                    -- 'incarnazione' | 'cacciatore primordiale' | ...

  -- Effetti di gioco, forma ancora da definire. Il check impedisce che diventi
  -- per sbaglio un array o uno scalare. L'unica chiave già letta dal codice è
  -- `talenti_scelta_extra`: quanti talenti a scelta IN PIÙ concede questo
  -- talento (è così che "giusta scelta" del Viandante ne dà tre invece di due).
  properties  jsonb not null default '{}'::jsonb
              check (jsonb_typeof(properties) = 'object'),
  sort_order  smallint not null default 0,

  -- Le tre etichette vanno tutte insieme e solo sui talenti a scelta: così la
  -- UI può contare su di esse senza `?.` sparsi, e un talento di razza non può
  -- ritrovarsi con una disciplina addosso.
  check (num_nonnulls(scuola, disciplina, ramo) = case when kind = 'scelta' then 3 else 0 end),

  -- NON è ridondante nonostante `key` sia già PK: Postgres pretende un vincolo
  -- unico esattamente su (key, kind) per poterlo usare come bersaglio delle FK
  -- composte di razze/tribu/sottovie e di personaggio_talenti. È ciò che
  -- impedisce di assegnare un talento del kind sbagliato — non toglierlo.
  unique (key, kind)
);

alter table public.talenti enable row level security;

create policy talenti_read on public.talenti
  for select to anon, authenticated using (true);

grant select on table public.talenti to anon, authenticated;

-- ───────────────────────────── CARATTERISTICHE ─────────────────────────────
-- Le sei Caratteristiche Base. Sono contenuto di catalogo e non un enum perché
-- hanno una descrizione che cambierà con le regole. Il wizard non le mostra
-- più: aspettano le meccaniche di crescita e il motore di combattimento.
--
-- La maggior parte degli effetti di gioco (Forza → danno fisico, Destrezza →
-- probabilità di colpire) non è ancora modellata: per ora vive nella
-- descrizione, e diventerà struttura quando servirà al motore di combattimento.
--
-- Fanno eccezione hp_per_punto e mana_per_punto, già modellati come colonne:
-- la regola "ogni punto di Vigore vale 2 PF" sta nel catalogo insieme alle
-- altre, pronta per quando il motore di combattimento la consumerà. La
-- creazione non le usa più: il wizard non distribuisce punti Caratteristica.

create table public.caratteristiche (
  key            text primary key,     -- 'forza' | 'intelletto' | ...
  name           text not null,
  description    text not null default '',
  hp_per_punto   smallint not null default 0 check (hp_per_punto >= 0),
  mana_per_punto smallint not null default 0 check (mana_per_punto >= 0),
  sort_order     smallint not null default 0
);

alter table public.caratteristiche enable row level security;

create policy caratteristiche_read on public.caratteristiche
  for select to anon, authenticated using (true);

grant select on table public.caratteristiche to anon, authenticated;

-- ───────────────────────────────── RAZZE ───────────────────────────────────
-- Raggruppano le tribù e portano il talento razziale. Le statistiche base non
-- stanno qui: appartengono alla tribù.

create table public.razze (
  key         text primary key,        -- 'umani' | 'nani' | ...
  name        text not null,
  description text not null default '',
  sort_order  smallint not null default 0,

  -- `unique`: un talento razziale appartiene a una sola razza (e dà l'indice che
  -- serve alla FK, quindi non ne serve un altro). La FK composta qui sotto
  -- implica già l'esistenza del talento: una FK semplice su talent_key sarebbe
  -- ridondante.
  talent_key  text unique,
  talent_kind text generated always as ('razza'::text) stored,
  foreign key (talent_key, talent_kind) references public.talenti (key, kind)
);

alter table public.razze enable row level security;

create policy razze_read on public.razze
  for select to anon, authenticated using (true);

grant select on table public.razze to anon, authenticated;

-- ────────────────────────── CARATTERISTICHE DI RAZZA ───────────────────────
-- Le Caratteristiche in cui la razza eccelle. La creazione non le usa più (il
-- +1 di razza non esiste più nel wizard): restano contenuto di catalogo, pronte
-- per le meccaniche di crescita che le consumeranno.
--
-- È una tabella e non una colonna array perché la relazione deve poter essere
-- bersaglio di FK composte (razza_key, caratteristica_key) quando una scelta
-- per-personaggio dovrà rispettarla, come accadeva con il +1 alla creazione.

create table public.razza_caratteristiche (
  razza_key          text not null references public.razze (key) on delete cascade,
  caratteristica_key text not null references public.caratteristiche (key),
  sort_order         smallint not null default 0,

  -- Copre anche la FK verso razze, che è la colonna guida.
  primary key (razza_key, caratteristica_key)
);

create index razza_caratteristiche_caratteristica_key_idx
  on public.razza_caratteristiche (caratteristica_key);

alter table public.razza_caratteristiche enable row level security;

create policy razza_caratteristiche_read on public.razza_caratteristiche
  for select to anon, authenticated using (true);

grant select on table public.razza_caratteristiche to anon, authenticated;

-- ────────────────────────────────── TRIBÙ ──────────────────────────────────
-- Appartengono a una razza e portano un talento di tribù.
--
-- Punti Ferita e Mana non sono più qui: derivano interamente dalle
-- Caratteristiche (Vigore ed Empatia Arcana). La tribù conserva solo la
-- velocità base, che le Caratteristiche non toccano.

create table public.tribu (
  key         text primary key,        -- 'eruscal' | 'kodron' | ...
  razza_key   text not null references public.razze (key) on delete cascade,
  name        text not null,
  description text not null default '',
  base_speed  smallint,                -- NULL = dato di gioco non ancora definito
  sort_order  smallint not null default 0,

  talent_key  text unique,
  talent_kind text generated always as ('tribu'::text) stored,
  foreign key (talent_key, talent_kind) references public.talenti (key, kind),

  -- Bersaglio della FK composta di `personaggi`: garantisce che la tribù scelta
  -- appartenga davvero alla razza scelta. Ha razza_key come colonna guida,
  -- quindi copre anche la FK verso razze: non serve un indice separato.
  unique (razza_key, key)
);

alter table public.tribu enable row level security;

create policy tribu_read on public.tribu
  for select to anon, authenticated using (true);

grant select on table public.tribu to anon, authenticated;

-- ────────────────────────────────── VIE ────────────────────────────────────
-- Il percorso di crescita del personaggio, ed è da qui che comincia la
-- creazione. Il talento non sta qui: ogni talento della via arriva da una
-- sottovia, incluso il primo, che è la sottovia di livello 0.

create table public.vie (
  key         text primary key,        -- 'combattente' | 'sapiente' | 'viandante'
  name        text not null,
  description text not null default '',
  sort_order  smallint not null default 0
);

alter table public.vie enable row level security;

create policy vie_read on public.vie
  for select to anon, authenticated using (true);

grant select on table public.vie to anon, authenticated;

-- ──────────────────────────────── SOTTOVIE ─────────────────────────────────
-- Una via ha molte sottovie, una per livello: la FK sta solo qui, sul figlio.
-- `level` 0 = onboarding, ossia il talento con cui la via comincia.

create table public.sottovie (
  key         text primary key,        -- 'combattente_0' | ...
  via_key     text not null references public.vie (key) on delete cascade,
  level       smallint not null default 0 check (level >= 0),
  name        text not null,
  description text not null default '',

  talent_key  text unique,
  talent_kind text generated always as ('via'::text) stored,
  foreign key (talent_key, talent_kind) references public.talenti (key, kind),

  -- Una sola sottovia per livello di ciascuna via. Ha via_key come colonna
  -- guida, quindi copre anche la FK verso vie: non serve un indice separato.
  unique (via_key, level)
);

alter table public.sottovie enable row level security;

create policy sottovie_read on public.sottovie
  for select to anon, authenticated using (true);

grant select on table public.sottovie to anon, authenticated;

-- ──────────────────────────────── TENDENZE ─────────────────────────────────
-- Gli assi che descrivono il personaggio: come si allinea, che carattere ha.
-- Ogni tendenza è un asse fra due poli, non un elenco di opzioni — per questo
-- non esiste un valore "neutrale": è il centro dell'asse.
--
-- La creazione non le usa più (lo step del carattere è uscito dal wizard, e
-- con lui `personaggio_tendenze`): restano contenuto di catalogo per quando il
-- gioco tornerà a chiederle. Attacco e difesa non sono mai state qui in questa
-- forma: erano assi continui, poi scelte binarie su `personaggi`, oggi fuori
-- dalla creazione.
--
-- `type` ha significato di gioco, non serve alla UI: l'ordine di
-- visualizzazione è dato da sort_order, che è globale.

create table public.tendenze (
  key         text primary key,        -- 'allineamento' | 'socialita' | ...
  type        text not null
              check (type in ('allineamento', 'moralita', 'tendenza')),
  name        text not null,
  description text not null default '',
  min_label   text not null default 'Minimo',
  min_value   smallint not null default 0,
  max_label   text not null default 'Massimo',
  max_value   smallint not null default 100,

  -- Valore iniziale: la metà fra i due poli. Con min = max la tendenza è fissa
  -- e non modificabile, e questa espressione dà comunque il valore giusto.
  -- Il cast è esplicito perché smallint + smallint in Postgres dà integer.
  default_value smallint generated always as (((min_value + max_value) / 2)::smallint) stored,

  sort_order  smallint not null default 0,

  check (min_value <= max_value)
);

alter table public.tendenze enable row level security;

create policy tendenze_read on public.tendenze
  for select to anon, authenticated using (true);

grant select on table public.tendenze to anon, authenticated;
