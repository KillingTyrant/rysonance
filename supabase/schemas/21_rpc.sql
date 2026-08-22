-- ═════════════════════════════════ RPC ═════════════════════════════════════
-- Creare un personaggio tocca due tabelle, e PostgREST non fa transazioni
-- multi-statement: due insert da supabase-js possono lasciare un personaggio
-- senza talenti. Questa funzione è il confine transazionale.
--
-- È anche il posto in cui vivono le regole della CREAZIONE, quelle che non sono
-- invarianti delle righe e quindi non possono essere `check`: "tanti talenti
-- quanti ne concede la Via". E le statistiche le decide il database, non il
-- client.

create or replace function public.crea_personaggio(
  p_name     text,
  p_sesso    public.sesso,
  p_via_key  text,
  p_razza_key text,
  p_tribu_key text,
  p_talenti  text[]
)
returns uuid
language plpgsql
-- security invoker: la RLS di personaggi si applica normalmente, quindi la
-- funzione non può creare personaggi per conto di altri utenti.
security invoker
set search_path = ''
as $$
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
$$;

-- create function concede execute a PUBLIC per default: qui serve solo agli
-- utenti autenticati.
revoke execute on function public.crea_personaggio(
  text, public.sesso, text, text, text, text[]
) from public;
grant execute on function public.crea_personaggio(
  text, public.sesso, text, text, text, text[]
) to authenticated;
