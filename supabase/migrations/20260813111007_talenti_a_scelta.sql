-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP FUNCTION public.crea_personaggio(p_name text, p_sesso public.sesso, p_razza_key text, p_sottorazza_key text, p_via_key text, p_tendenze jsonb);

ALTER TABLE public.talenti
  DROP CONSTRAINT talenti_kind_check;

CREATE FUNCTION public.check_talenti_scelti()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (
    select count(*)
    from public.personaggio_talenti t
    where t.personaggio_id = new.personaggio_id
  ) > 2 then
    raise exception 'Un personaggio può avere al massimo 2 talenti a scelta'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$function$;

CREATE FUNCTION public.crea_personaggio (
  p_name           text,
  p_sesso          public.sesso,
  p_razza_key      text,
  p_sottorazza_key text,
  p_via_key        text,
  p_tendenze       jsonb,
  p_talenti        text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_id      uuid;
  v_hp      smallint;
  v_mana    smallint;
  v_speed   smallint;
  v_talenti text[];
begin
  select s.base_hp, s.base_mana, s.base_speed
    into v_hp, v_mana, v_speed
  from public.sottorazze s
  where s.key = p_sottorazza_key;

  if not found then
    raise exception 'Sottorazza inesistente: "%"', p_sottorazza_key
      using errcode = 'foreign_key_violation';
  end if;

  -- Il 2 è ripetuto nel trigger di personaggio_talenti e in
  -- lib/onboarding/validate.ts: se cambia, cambia in tutti e tre. Che i talenti
  -- esistano e siano di kind 'scelta' lo impone la FK composta, non serve
  -- ricontrollarlo qui.
  select array_agg(distinct k) into v_talenti
  from unnest(coalesce(p_talenti, '{}'::text[])) as k
  where k is not null;

  if coalesce(array_length(v_talenti, 1), 0) <> 2 then
    raise exception 'Servono esattamente 2 talenti a scelta, ricevuti %',
      coalesce(array_length(v_talenti, 1), 0)
      using errcode = 'check_violation';
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

  insert into public.personaggio_talenti (personaggio_id, talent_key)
  select v_id, k from unnest(v_talenti) as k;

  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb, text[]) FROM PUBLIC;

GRANT ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb, text[]) TO authenticated;

CREATE TABLE public.personaggio_talenti (
  personaggio_id uuid NOT NULL,
  talent_key     text NOT NULL,
  talent_kind    text GENERATED ALWAYS AS ('scelta'::text) STORED
);

ALTER TABLE public.personaggio_talenti
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personaggio_talenti
  ADD CONSTRAINT personaggio_talenti_personaggio_id_fkey FOREIGN KEY (personaggio_id) REFERENCES public.personaggi(id) ON DELETE CASCADE;

ALTER TABLE public.personaggio_talenti
  ADD CONSTRAINT personaggio_talenti_pkey PRIMARY KEY (personaggio_id, talent_key);

ALTER TABLE public.personaggio_talenti
  ADD CONSTRAINT personaggio_talenti_talent_key_talent_kind_fkey FOREIGN KEY (talent_key, talent_kind) REFERENCES public.talenti(key, kind);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_talenti TO anon;

GRANT ALL ON public.personaggio_talenti TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_talenti TO service_role;

CREATE INDEX personaggio_talenti_talent_key_idx ON public.personaggio_talenti (talent_key);

CREATE TRIGGER personaggio_talenti_check_count
  AFTER INSERT OR UPDATE OF personaggio_id ON public.personaggio_talenti
  FOR EACH ROW
  EXECUTE FUNCTION public.check_talenti_scelti();

CREATE POLICY personaggio_talenti_delete_own ON public.personaggio_talenti
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_talenti.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_talenti_insert_own ON public.personaggio_talenti
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_talenti.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_talenti_select_own ON public.personaggio_talenti
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_talenti.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_talenti_update_own ON public.personaggio_talenti
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_talenti.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_talenti.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_kind_check CHECK (kind = ANY (ARRAY['razza'::text, 'sottorazza'::text, 'via'::text, 'scelta'::text]));

ALTER TABLE public.talenti
  ADD COLUMN scuola text;

ALTER TABLE public.talenti
  ADD COLUMN disciplina text;

ALTER TABLE public.talenti
  ADD COLUMN ramo text;

ALTER TABLE public.talenti
  ADD CONSTRAINT talenti_check CHECK (num_nonnulls(scuola, disciplina, ramo) =
CASE
    WHEN kind = 'scelta'::text THEN 3
    ELSE 0
END);