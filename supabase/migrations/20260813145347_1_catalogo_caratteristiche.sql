-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP FUNCTION public.crea_personaggio(p_name text, p_sesso public.sesso, p_razza_key text, p_sottorazza_key text, p_via_key text, p_tendenze jsonb, p_talenti text[]);

ALTER TABLE public.talenti
  DROP CONSTRAINT talenti_kind_check;

ALTER TABLE public.tendenze
  DROP CONSTRAINT tendenze_type_check;

DROP TRIGGER personaggi_touch_updated_at ON public.personaggi;

DROP TRIGGER personaggio_talenti_check_count ON public.personaggio_talenti;

DROP FUNCTION public.check_talenti_scelti();

DROP TRIGGER personaggio_tendenze_check_value ON public.personaggio_tendenze;

DROP FUNCTION public.check_tendenza_value();

DROP POLICY personaggi_delete_own ON public.personaggi;

DROP POLICY personaggi_insert_own ON public.personaggi;

DROP POLICY personaggi_select_own ON public.personaggi;

DROP POLICY personaggi_update_own ON public.personaggi;

DROP POLICY personaggio_talenti_delete_own ON public.personaggio_talenti;

DROP POLICY personaggio_talenti_insert_own ON public.personaggio_talenti;

DROP POLICY personaggio_talenti_select_own ON public.personaggio_talenti;

DROP POLICY personaggio_talenti_update_own ON public.personaggio_talenti;

DROP TABLE public.personaggio_talenti;

DROP POLICY personaggio_tendenze_delete_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_insert_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_select_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_update_own ON public.personaggio_tendenze;

DROP TABLE public.personaggio_tendenze;

DROP TABLE public.personaggi;

DROP POLICY sottorazze_read ON public.sottorazze;

DROP TABLE public.sottorazze;

CREATE TYPE public.stile AS ENUM (
  'fisico',
  'magico'
);

CREATE TABLE public.caratteristiche (
  key            text     NOT NULL,
  name           text     NOT NULL,
  description    text     DEFAULT ''::text NOT NULL,
  hp_per_punto   smallint DEFAULT 0 NOT NULL,
  mana_per_punto smallint DEFAULT 0 NOT NULL,
  sort_order     smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.caratteristiche
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.caratteristiche
  ADD CONSTRAINT caratteristiche_hp_per_punto_check CHECK (hp_per_punto >= 0);

ALTER TABLE public.caratteristiche
  ADD CONSTRAINT caratteristiche_mana_per_punto_check CHECK (mana_per_punto >= 0);

ALTER TABLE public.caratteristiche
  ADD CONSTRAINT caratteristiche_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.caratteristiche TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.caratteristiche TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.caratteristiche TO service_role;

CREATE POLICY caratteristiche_read ON public.caratteristiche
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.razza_caratteristiche (
  razza_key          text     NOT NULL,
  caratteristica_key text     NOT NULL,
  sort_order         smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.razza_caratteristiche
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.razza_caratteristiche
  ADD CONSTRAINT razza_caratteristiche_caratteristica_key_fkey FOREIGN KEY (caratteristica_key) REFERENCES public.caratteristiche(key);

ALTER TABLE public.razza_caratteristiche
  ADD CONSTRAINT razza_caratteristiche_pkey PRIMARY KEY (razza_key, caratteristica_key);

ALTER TABLE public.razza_caratteristiche
  ADD CONSTRAINT razza_caratteristiche_razza_key_fkey FOREIGN KEY (razza_key) REFERENCES public.razze(key) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.razza_caratteristiche TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.razza_caratteristiche TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.razza_caratteristiche TO service_role;

CREATE INDEX razza_caratteristiche_caratteristica_key_idx ON public.razza_caratteristiche (caratteristica_key);

CREATE POLICY razza_caratteristiche_read ON public.razza_caratteristiche
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_kind_check CHECK (kind = ANY (ARRAY['razza'::text, 'tribu'::text, 'via'::text, 'scelta'::text]));

ALTER TABLE public.tendenze
  ADD CONSTRAINT tendenze_type_check CHECK (type = ANY (ARRAY['allineamento'::text, 'moralita'::text, 'tendenza'::text]));

CREATE TABLE public.tribu (
  key         text     NOT NULL,
  razza_key   text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  base_speed  smallint,
  sort_order  smallint DEFAULT 0 NOT NULL,
  talent_key  text,
  talent_kind text     GENERATED ALWAYS AS ('tribu'::text) STORED
);

ALTER TABLE public.tribu
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tribu
  ADD CONSTRAINT tribu_pkey PRIMARY KEY (key);

ALTER TABLE public.tribu
  ADD CONSTRAINT tribu_razza_key_fkey FOREIGN KEY (razza_key) REFERENCES public.razze(key) ON DELETE CASCADE;

ALTER TABLE public.tribu
  ADD CONSTRAINT tribu_razza_key_key_key UNIQUE (razza_key, key);

ALTER TABLE public.tribu
  ADD CONSTRAINT tribu_talent_key_key UNIQUE (talent_key);

ALTER TABLE public.tribu
  ADD CONSTRAINT tribu_talent_key_talent_kind_fkey FOREIGN KEY (talent_key, talent_kind) REFERENCES public.talenti(key, kind);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.tribu TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.tribu TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.tribu TO service_role;

CREATE POLICY tribu_read ON public.tribu
  FOR SELECT
  TO anon, authenticated
  USING (true);