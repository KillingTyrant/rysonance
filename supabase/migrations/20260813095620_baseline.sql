-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE TYPE public.sesso AS ENUM (
  'maschio',
  'femmina'
);

CREATE FUNCTION public.check_tendenza_value()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE FUNCTION public.crea_personaggio (
  p_name           text,
  p_sesso          public.sesso,
  p_razza_key      text,
  p_sottorazza_key text,
  p_via_key        text,
  p_tendenze       jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_id    uuid;
  v_hp    smallint;
  v_mana  smallint;
  v_speed smallint;
begin
  select s.base_hp, s.base_mana, s.base_speed
    into v_hp, v_mana, v_speed
  from public.sottorazze s
  where s.key = p_sottorazza_key;

  if not found then
    raise exception 'Sottorazza inesistente: "%"', p_sottorazza_key
      using errcode = 'foreign_key_violation';
  end if;

  insert into public.personaggi (
    user_id, name, sesso, razza_key, sottorazza_key, via_key, hp, mana, speed
  ) values (
    (select auth.uid()), btrim(p_name), p_sesso,
    p_razza_key, p_sottorazza_key, p_via_key,
    v_hp, v_mana, v_speed
  )
  returning id into v_id;

  -- Si itera sul CATALOGO, non sull'input: le chiavi sono valide e complete per
  -- costruzione. Un valore mancante o non numerico cade sul default della
  -- tendenza; uno fuori scala viene riportato dentro i limiti.
  insert into public.personaggio_tendenze (personaggio_id, tendenza_key, value)
  select
    v_id,
    t.key,
    greatest(t.min_value, least(t.max_value, coalesce(
      case when jsonb_typeof(coalesce(p_tendenze, '{}'::jsonb) -> t.key) = 'number'
           then round((p_tendenze ->> t.key)::numeric)::smallint
      end,
      t.default_value
    )))
  from public.tendenze t;

  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb) TO authenticated;

CREATE FUNCTION public.touch_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TABLE public.personaggi (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id        uuid                     NOT NULL,
  name           text                     NOT NULL,
  sesso          public.sesso             NOT NULL,
  razza_key      text                     NOT NULL,
  sottorazza_key text                     NOT NULL,
  via_key        text                     NOT NULL,
  hp             smallint,
  mana           smallint,
  speed          smallint,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  updated_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.personaggi
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_name_check CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 40);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_pkey PRIMARY KEY (id);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggi TO anon;

GRANT ALL ON public.personaggi TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggi TO service_role;

CREATE INDEX personaggi_via_key_idx ON public.personaggi (via_key);

CREATE INDEX personaggi_user_id_idx ON public.personaggi (user_id);

CREATE INDEX personaggi_razza_sottorazza_idx ON public.personaggi (razza_key, sottorazza_key);

CREATE TRIGGER personaggi_touch_updated_at
  BEFORE UPDATE ON public.personaggi
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY personaggi_delete_own ON public.personaggi
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY personaggi_insert_own ON public.personaggi
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY personaggi_select_own ON public.personaggi
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY personaggi_update_own ON public.personaggi
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.personaggio_tendenze (
  personaggio_id uuid     NOT NULL,
  tendenza_key   text     NOT NULL,
  value          smallint NOT NULL
);

ALTER TABLE public.personaggio_tendenze
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personaggio_tendenze
  ADD CONSTRAINT personaggio_tendenze_personaggio_id_fkey FOREIGN KEY (personaggio_id) REFERENCES public.personaggi(id) ON DELETE CASCADE;

ALTER TABLE public.personaggio_tendenze
  ADD CONSTRAINT personaggio_tendenze_pkey PRIMARY KEY (personaggio_id, tendenza_key);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_tendenze TO anon;

GRANT ALL ON public.personaggio_tendenze TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_tendenze TO service_role;

CREATE INDEX personaggio_tendenze_tendenza_key_idx ON public.personaggio_tendenze (tendenza_key);

CREATE TRIGGER personaggio_tendenze_check_value
  BEFORE INSERT OR UPDATE OF tendenza_key, VALUE ON public.personaggio_tendenze
  FOR EACH ROW
  EXECUTE FUNCTION public.check_tendenza_value();

CREATE POLICY personaggio_tendenze_delete_own ON public.personaggio_tendenze
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_tendenze.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_tendenze_insert_own ON public.personaggio_tendenze
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_tendenze.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_tendenze_select_own ON public.personaggio_tendenze
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_tendenze.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_tendenze_update_own ON public.personaggio_tendenze
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_tendenze.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_tendenze.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE TABLE public.razze (
  key         text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL,
  talent_key  text,
  talent_kind text     GENERATED ALWAYS AS ('razza'::text) STORED
);

ALTER TABLE public.razze
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.razze
  ADD CONSTRAINT razze_pkey PRIMARY KEY (key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_razza_key_fkey FOREIGN KEY (razza_key) REFERENCES public.razze(key);

ALTER TABLE public.razze
  ADD CONSTRAINT razze_talent_key_key UNIQUE (talent_key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.razze TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.razze TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.razze TO service_role;

CREATE POLICY razze_read ON public.razze
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.sottorazze (
  key         text     NOT NULL,
  razza_key   text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  base_hp     smallint,
  base_mana   smallint,
  base_speed  smallint,
  sort_order  smallint DEFAULT 0 NOT NULL,
  talent_key  text,
  talent_kind text     GENERATED ALWAYS AS ('sottorazza'::text) STORED
);

ALTER TABLE public.sottorazze
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sottorazze
  ADD CONSTRAINT sottorazze_pkey PRIMARY KEY (key);

ALTER TABLE public.sottorazze
  ADD CONSTRAINT sottorazze_razza_key_fkey FOREIGN KEY (razza_key) REFERENCES public.razze(key) ON DELETE CASCADE;

ALTER TABLE public.sottorazze
  ADD CONSTRAINT sottorazze_razza_key_key_key UNIQUE (razza_key, key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_razza_key_sottorazza_key_fkey FOREIGN KEY (razza_key, sottorazza_key) REFERENCES public.sottorazze(razza_key, key);

ALTER TABLE public.sottorazze
  ADD CONSTRAINT sottorazze_talent_key_key UNIQUE (talent_key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.sottorazze TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.sottorazze TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.sottorazze TO service_role;

CREATE POLICY sottorazze_read ON public.sottorazze
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.sottovie (
  key         text     NOT NULL,
  via_key     text     NOT NULL,
  level       smallint DEFAULT 0 NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  talent_key  text,
  talent_kind text     GENERATED ALWAYS AS ('via'::text) STORED
);

ALTER TABLE public.sottovie
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_level_check CHECK (level >= 0);

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_pkey PRIMARY KEY (key);

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_talent_key_key UNIQUE (talent_key);

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_via_key_level_key UNIQUE (via_key, level);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.sottovie TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.sottovie TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.sottovie TO service_role;

CREATE POLICY sottovie_read ON public.sottovie
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.talenti (
  key         text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  kind        text     NOT NULL,
  properties  jsonb    DEFAULT '{}'::jsonb NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.talenti
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_key_kind_key UNIQUE (key, kind);

ALTER TABLE public.razze
  ADD CONSTRAINT razze_talent_key_talent_kind_fkey FOREIGN KEY (talent_key, talent_kind) REFERENCES public.talenti(key, kind);

ALTER TABLE public.sottorazze
  ADD CONSTRAINT sottorazze_talent_key_talent_kind_fkey FOREIGN KEY (talent_key, talent_kind) REFERENCES public.talenti(key, kind);

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_talent_key_talent_kind_fkey FOREIGN KEY (talent_key, talent_kind) REFERENCES public.talenti(key, kind);

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_kind_check CHECK (kind = ANY (ARRAY['razza'::text, 'sottorazza'::text, 'via'::text]));

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_pkey PRIMARY KEY (key);

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_properties_check CHECK (jsonb_typeof(properties) = 'object'::text);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.talenti TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.talenti TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.talenti TO service_role;

CREATE POLICY talenti_read ON public.talenti
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.tendenze (
  key           text     NOT NULL,
  type          text     NOT NULL,
  name          text     NOT NULL,
  description   text     DEFAULT ''::text NOT NULL,
  min_label     text     DEFAULT 'Minimo'::text NOT NULL,
  min_value     smallint DEFAULT 0 NOT NULL,
  max_label     text     DEFAULT 'Massimo'::text NOT NULL,
  max_value     smallint DEFAULT 100 NOT NULL,
  default_value smallint GENERATED ALWAYS AS ((((min_value + max_value) / 2))::smallint) STORED,
  sort_order    smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.tendenze
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tendenze
  ADD CONSTRAINT tendenze_check CHECK (min_value <= max_value);

ALTER TABLE public.tendenze
  ADD CONSTRAINT tendenze_pkey PRIMARY KEY (key);

ALTER TABLE public.personaggio_tendenze
  ADD CONSTRAINT personaggio_tendenze_tendenza_key_fkey FOREIGN KEY (tendenza_key) REFERENCES public.tendenze(key);

ALTER TABLE public.tendenze
  ADD CONSTRAINT tendenze_type_check CHECK (type = ANY (ARRAY['combattimento'::text, 'allineamento'::text, 'moralita'::text, 'tendenza'::text]));

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.tendenze TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.tendenze TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.tendenze TO service_role;

CREATE POLICY tendenze_read ON public.tendenze
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.vie (
  key         text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.vie
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vie
  ADD CONSTRAINT vie_pkey PRIMARY KEY (key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_via_key_fkey FOREIGN KEY (via_key) REFERENCES public.vie(key);

ALTER TABLE public.sottovie
  ADD CONSTRAINT sottovie_via_key_fkey FOREIGN KEY (via_key) REFERENCES public.vie(key) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.vie TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.vie TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.vie TO service_role;

CREATE POLICY vie_read ON public.vie
  FOR SELECT
  TO anon, authenticated
  USING (true);