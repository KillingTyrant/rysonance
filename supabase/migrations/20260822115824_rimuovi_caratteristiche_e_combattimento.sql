-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP FUNCTION
  public.crea_personaggio(p_name text, p_sesso public.sesso, p_via_key text, p_razza_key text, p_tribu_key text, p_caratteristiche jsonb, p_bonus_caratteristica text, p_attacco
  public.stile, p_difesa public.stile, p_talenti text[], p_tendenze jsonb);

ALTER TABLE public.personaggi
  DROP COLUMN attacco;

ALTER TABLE public.personaggi
  DROP COLUMN difesa;

ALTER TABLE public.personaggi
  DROP COLUMN hp;

ALTER TABLE public.personaggi
  DROP COLUMN mana;

ALTER TABLE public.personaggi
  DROP CONSTRAINT personaggi_razza_key_bonus_caratteristica_key_fkey;

DROP INDEX public.personaggi_razza_bonus_idx;

ALTER TABLE public.personaggi
  DROP COLUMN bonus_caratteristica_key;

DROP POLICY personaggio_caratteristiche_delete_own ON public.personaggio_caratteristiche;

DROP POLICY personaggio_caratteristiche_insert_own ON public.personaggio_caratteristiche;

DROP POLICY personaggio_caratteristiche_select_own ON public.personaggio_caratteristiche;

DROP POLICY personaggio_caratteristiche_update_own ON public.personaggio_caratteristiche;

DROP TABLE public.personaggio_caratteristiche;

CREATE FUNCTION public.crea_personaggio (
  p_name      text,
  p_sesso     public.sesso,
  p_via_key   text,
  p_razza_key text,
  p_tribu_key text,
  p_talenti   text[],
  p_tendenze  jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_id      uuid;
  v_speed   smallint;
  v_talenti text[];
begin
  select t.base_speed into v_speed
  from public.tribu t
  where t.key = p_tribu_key;

  if not found then
    raise exception 'Tribù inesistente: "%"', p_tribu_key
      using errcode = 'foreign_key_violation';
  end if;

  -- Che i talenti esistano e siano di kind 'scelta' lo impone la FK composta di
  -- personaggio_talenti, non serve ricontrollarlo qui. Quanti ne spettano lo
  -- decide la Via: due, più quelli concessi dal talento con cui comincia.
  select array_agg(distinct k) into v_talenti
  from unnest(coalesce(p_talenti, '{}'::text[])) as k
  where k is not null;

  if coalesce(array_length(v_talenti, 1), 0) <> public.talenti_a_scelta(p_via_key) then
    raise exception 'Servono esattamente % talenti a scelta, ricevuti %',
      public.talenti_a_scelta(p_via_key), coalesce(array_length(v_talenti, 1), 0)
      using errcode = 'check_violation';
  end if;

  insert into public.personaggi (
    user_id, name, sesso, via_key, razza_key, tribu_key, speed
  ) values (
    (select auth.uid()), btrim(p_name), p_sesso, p_via_key, p_razza_key, p_tribu_key,
    v_speed
  )
  returning id into v_id;

  -- Si itera sul catalogo: un valore mancante o non numerico cade sul default
  -- della tendenza, uno fuori scala viene riportato dentro i limiti.
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

REVOKE ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, text[], jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, text[], jsonb) TO authenticated;