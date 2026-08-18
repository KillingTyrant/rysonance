-- ═════════════════════════════════ RPC ═════════════════════════════════════
-- Creare un personaggio tocca quattro tabelle, e PostgREST non fa transazioni
-- multi-statement: quattro insert da supabase-js possono lasciare un
-- personaggio senza caratteristiche o senza talenti. Questa funzione è il
-- confine transazionale.
--
-- È anche il posto in cui vivono le regole della CREAZIONE, quelle che non sono
-- invarianti delle righe e quindi non possono essere `check`: "4 punti da
-- distribuire", "nessuna Caratteristica sopra 3 alla creazione", "una riga per
-- OGNI Caratteristica e per OGNI tendenza di catalogo", "tanti talenti quanti
-- ne concede la Via". E le statistiche le decide il database, non il client.

create or replace function public.crea_personaggio(
  p_name                 text,
  p_sesso                public.sesso,
  p_via_key              text,
  p_razza_key            text,
  p_tribu_key            text,
  p_caratteristiche      jsonb,   -- chiave della Caratteristica → punti distribuiti
  p_bonus_caratteristica text,    -- su quale va il +1 della razza
  p_attacco              public.stile,
  p_difesa               public.stile,
  p_talenti              text[],
  p_tendenze             jsonb
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
  v_valori  jsonb;      -- chiave → valore finale (punti + bonus)
  v_punti   integer;    -- quanti ne ha distribuiti il giocatore
  v_minimo  integer;    -- il più basso dei punti distribuiti
  v_massimo integer;    -- il più alto dei valori finali
  v_hp      integer;
  v_mana    integer;
  v_talenti text[];
begin
  select t.base_speed into v_speed
  from public.tribu t
  where t.key = p_tribu_key;

  if not found then
    raise exception 'Tribù inesistente: "%"', p_tribu_key
      using errcode = 'foreign_key_violation';
  end if;

  -- Si itera sul CATALOGO, non sull'input: una chiave in più nel payload viene
  -- ignorata, una in meno vale zero punti. Da qui escono in una passata sola i
  -- valori finali, i tre numeri che servono a validare la distribuzione e le
  -- statistiche derivate.
  --
  -- Che il +1 sia su una Caratteristica davvero offerta dalla razza non si
  -- controlla qui: lo impone la FK composta (razza_key, bonus_caratteristica_key).
  with valori as (
    select
      c.key,
      case when jsonb_typeof(coalesce(p_caratteristiche, '{}'::jsonb) -> c.key) = 'number'
           then floor((p_caratteristiche ->> c.key)::numeric)::integer
           else 0
      end as punti,
      case when c.key = p_bonus_caratteristica then 1 else 0 end as bonus,
      c.hp_per_punto,
      c.mana_per_punto
    from public.caratteristiche c
  )
  select
    coalesce(jsonb_object_agg(key, punti + bonus), '{}'::jsonb),
    coalesce(sum(punti), 0),
    coalesce(min(punti), 0),
    coalesce(max(punti + bonus), 0),
    coalesce(sum((punti + bonus) * hp_per_punto), 0),
    coalesce(sum((punti + bonus) * mana_per_punto), 0)
  into v_valori, v_punti, v_minimo, v_massimo, v_hp, v_mana
  from valori;

  -- I due numeri (4 punti, tetto 3) sono ripetuti in lib/onboarding/validate.ts:
  -- se cambiano, cambiano in tutti e due.
  if v_minimo < 0 then
    raise exception 'I punti Caratteristica non possono essere negativi'
      using errcode = 'check_violation';
  end if;

  if v_punti <> 4 then
    raise exception 'Vanno distribuiti esattamente 4 punti Caratteristica, ricevuti %', v_punti
      using errcode = 'check_violation';
  end if;

  if v_massimo > 3 then
    raise exception 'Alla creazione nessuna Caratteristica può superare 3, ricevuto %', v_massimo
      using errcode = 'check_violation';
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
    user_id, name, sesso, via_key, razza_key, tribu_key,
    bonus_caratteristica_key, attacco, difesa, hp, mana, speed
  ) values (
    (select auth.uid()), btrim(p_name), p_sesso, p_via_key, p_razza_key, p_tribu_key,
    p_bonus_caratteristica, p_attacco, p_difesa, v_hp, v_mana, v_speed
  )
  returning id into v_id;

  insert into public.personaggio_caratteristiche (personaggio_id, caratteristica_key, value)
  select v_id, chiave, valore::smallint
  from jsonb_each_text(v_valori) as e(chiave, valore);

  -- Anche qui si itera sul catalogo: un valore mancante o non numerico cade sul
  -- default della tendenza, uno fuori scala viene riportato dentro i limiti.
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
$$;

-- create function concede execute a PUBLIC per default: qui serve solo agli
-- utenti autenticati.
revoke execute on function public.crea_personaggio(
  text, public.sesso, text, text, text, jsonb, text, public.stile, public.stile, text[], jsonb
) from public;
grant execute on function public.crea_personaggio(
  text, public.sesso, text, text, text, jsonb, text, public.stile, public.stile, text[], jsonb
) to authenticated;
