-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.check_talenti_scelti()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

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
  p_name                 text,
  p_sesso                public.sesso,
  p_via_key              text,
  p_razza_key            text,
  p_tribu_key            text,
  p_caratteristiche      jsonb,
  p_bonus_caratteristica text,
  p_attacco              public.stile,
  p_difesa               public.stile,
  p_talenti              text[],
  p_tendenze             jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb, text, public.stile, public.stile, text[], jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.crea_personaggio(text, public.sesso, text, text, text, jsonb, text, public.stile, public.stile, text[], jsonb) TO authenticated;

CREATE FUNCTION public.talenti_a_scelta (
  p_via_key text
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select 2 + coalesce(max(
    case when jsonb_typeof(t.properties -> 'talenti_scelta_extra') = 'number'
         then (t.properties ->> 'talenti_scelta_extra')::integer
    end
  ), 0)
  from public.sottovie s
  join public.talenti t on t.key = s.talent_key
  where s.via_key = p_via_key and s.level = 0;
$function$;

CREATE TABLE public.personaggi (
  id                       uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id                  uuid                     NOT NULL,
  name                     text                     NOT NULL,
  sesso                    public.sesso             NOT NULL,
  via_key                  text                     NOT NULL,
  razza_key                text                     NOT NULL,
  tribu_key                text                     NOT NULL,
  bonus_caratteristica_key text                     NOT NULL,
  attacco                  public.stile             NOT NULL,
  difesa                   public.stile             NOT NULL,
  hp                       smallint                 NOT NULL,
  mana                     smallint                 NOT NULL,
  speed                    smallint,
  created_at               timestamp with time zone DEFAULT now() NOT NULL,
  updated_at               timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.personaggi
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_name_check CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 40);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_pkey PRIMARY KEY (id);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_razza_key_bonus_caratteristica_key_fkey FOREIGN KEY (razza_key, bonus_caratteristica_key)
    REFERENCES public.razza_caratteristiche(razza_key, caratteristica_key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_razza_key_fkey FOREIGN KEY (razza_key) REFERENCES public.razze(key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_razza_key_tribu_key_fkey FOREIGN KEY (razza_key, tribu_key) REFERENCES public.tribu(razza_key, key);

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.personaggi
  ADD CONSTRAINT personaggi_via_key_fkey FOREIGN KEY (via_key) REFERENCES public.vie(key);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggi TO anon;

GRANT ALL ON public.personaggi TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggi TO service_role;

CREATE INDEX personaggi_razza_bonus_idx ON public.personaggi (razza_key, bonus_caratteristica_key);

CREATE INDEX personaggi_razza_tribu_idx ON public.personaggi (razza_key, tribu_key);

CREATE INDEX personaggi_user_id_idx ON public.personaggi (user_id);

CREATE INDEX personaggi_via_key_idx ON public.personaggi (via_key);

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

CREATE TABLE public.personaggio_caratteristiche (
  personaggio_id     uuid     NOT NULL,
  caratteristica_key text     NOT NULL,
  value              smallint NOT NULL
);

ALTER TABLE public.personaggio_caratteristiche
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.personaggio_caratteristiche
  ADD CONSTRAINT personaggio_caratteristiche_caratteristica_key_fkey FOREIGN KEY (caratteristica_key) REFERENCES public.caratteristiche(key);

ALTER TABLE public.personaggio_caratteristiche
  ADD CONSTRAINT personaggio_caratteristiche_personaggio_id_fkey FOREIGN KEY (personaggio_id) REFERENCES public.personaggi(id) ON DELETE CASCADE;

ALTER TABLE public.personaggio_caratteristiche
  ADD CONSTRAINT personaggio_caratteristiche_pkey PRIMARY KEY (personaggio_id, caratteristica_key);

ALTER TABLE public.personaggio_caratteristiche
  ADD CONSTRAINT personaggio_caratteristiche_value_check CHECK (value >= 0);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_caratteristiche TO anon;

GRANT ALL ON public.personaggio_caratteristiche TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.personaggio_caratteristiche TO service_role;

CREATE INDEX personaggio_caratteristiche_caratteristica_key_idx ON public.personaggio_caratteristiche (caratteristica_key);

CREATE POLICY personaggio_caratteristiche_delete_own ON public.personaggio_caratteristiche
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_caratteristiche.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_caratteristiche_insert_own ON public.personaggio_caratteristiche
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_caratteristiche.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_caratteristiche_select_own ON public.personaggio_caratteristiche
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_caratteristiche.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY personaggio_caratteristiche_update_own ON public.personaggio_caratteristiche
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_caratteristiche.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.personaggi p
  WHERE ((p.id = personaggio_caratteristiche.personaggio_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

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

ALTER TABLE public.personaggio_tendenze
  ADD CONSTRAINT personaggio_tendenze_tendenza_key_fkey FOREIGN KEY (tendenza_key) REFERENCES public.tendenze(key);

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