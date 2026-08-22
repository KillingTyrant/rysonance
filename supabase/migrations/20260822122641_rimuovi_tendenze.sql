-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP FUNCTION public.crea_personaggio(p_name text, p_sesso public.sesso, p_via_key text, p_razza_key text, p_tribu_key text, p_talenti text[], p_tendenze jsonb);

DROP TRIGGER personaggio_tendenze_check_value ON public.personaggio_tendenze;

DROP FUNCTION public.check_tendenza_value();

DROP POLICY personaggio_tendenze_delete_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_insert_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_select_own ON public.personaggio_tendenze;

DROP POLICY personaggio_tendenze_update_own ON public.personaggio_tendenze;

DROP TABLE public.personaggio_tendenze;

CREATE FUNCTION public.crea_personaggio (
  p_name      text,
  p_sesso     public.sesso,
  p_via_key   text,
  p_razza_key text,
  p_tribu_key text,
  p_talenti   text[]
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

  insert into public.personaggio_talenti (personaggio_id, talent_key)
  select v_id, k from unnest(v_talenti) as k;

  return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, text[]) FROM PUBLIC;

GRANT ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, text[]) TO authenticated;