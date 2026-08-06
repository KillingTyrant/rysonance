-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE TYPE public.character_status AS ENUM (
  'draft',
  'completed'
);

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

CREATE TABLE public.character_traits (
  key           text     NOT NULL,
  left_label    text     NOT NULL,
  right_label   text     NOT NULL,
  default_value smallint DEFAULT 50 NOT NULL,
  sort_order    smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.character_traits
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.character_traits
  ADD CONSTRAINT character_traits_default_value_check CHECK (default_value >= 0 AND default_value <= 100);

ALTER TABLE public.character_traits
  ADD CONSTRAINT character_traits_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.character_traits TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.character_traits TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.character_traits TO service_role;

CREATE POLICY character_traits_read ON public.character_traits
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.characters (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id            uuid                     NOT NULL,
  status             public.character_status  DEFAULT 'draft'::public.character_status NOT NULL,
  name               text,
  race_key           text,
  stirpe_key         text,
  gender_key         text,
  gender_category    text                     GENERATED ALWAYS AS ('gender'::text) STORED,
  via_key            text,
  attack_key         text,
  attack_category    text                     GENERATED ALWAYS AS ('attacco'::text) STORED,
  defense_key        text,
  defense_category   text                     GENERATED ALWAYS AS ('difesa'::text) STORED,
  reaction_key       text,
  reaction_category  text                     GENERATED ALWAYS AS ('reazione'::text) STORED,
  alignment_key      text,
  alignment_category text                     GENERATED ALWAYS AS ('allineamento'::text) STORED,
  morality_key       text,
  morality_category  text                     GENERATED ALWAYS AS ('moralita'::text) STORED,
  trait_social       smallint,
  trait_kindness     smallint,
  trait_ambition     smallint,
  trait_curiosity    smallint,
  discipline_points  jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  level              smallint                 DEFAULT 1 NOT NULL,
  hp                 smallint,
  mana               smallint,
  speed              smallint,
  created_at         timestamp with time zone DEFAULT now() NOT NULL,
  updated_at         timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.characters
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.characters
  ADD CONSTRAINT characters_completed_required CHECK (status <> 'completed'::public.character_status OR name IS NOT NULL AND race_key IS NOT NULL AND stirpe_key IS
    NOT NULL AND gender_key IS NOT NULL AND via_key IS NOT NULL AND attack_key IS NOT NULL AND defense_key IS NOT NULL AND reaction_key IS NOT NULL AND alignment_key IS
    NOT NULL AND morality_key IS NOT NULL);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_discipline_points_check CHECK (jsonb_typeof(discipline_points) = 'object'::text);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_level_check CHECK (level >= 1);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_name_check CHECK (name IS NULL OR length(btrim(name)) > 0);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_pkey PRIMARY KEY (id);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_trait_ambition_check CHECK (trait_ambition >= 0 AND trait_ambition <= 100);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_trait_curiosity_check CHECK (trait_curiosity >= 0 AND trait_curiosity <= 100);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_trait_kindness_check CHECK (trait_kindness >= 0 AND trait_kindness <= 100);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_trait_social_check CHECK (trait_social >= 0 AND trait_social <= 100);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.characters TO anon;

GRANT ALL ON public.characters TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.characters TO service_role;

CREATE INDEX characters_via_key_idx ON public.characters (via_key);

CREATE INDEX characters_user_id_idx ON public.characters (user_id);

CREATE INDEX characters_user_status_idx ON public.characters (user_id, status);

CREATE INDEX characters_race_key_idx ON public.characters (race_key);

CREATE INDEX characters_stirpe_key_idx ON public.characters (stirpe_key);

CREATE TRIGGER characters_touch_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY characters_delete_own ON public.characters
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY characters_insert_own ON public.characters
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY characters_select_own ON public.characters
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY characters_update_own ON public.characters
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.discipline_groups (
  key        text     NOT NULL,
  name       text     NOT NULL,
  sort_order smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.discipline_groups
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.discipline_groups
  ADD CONSTRAINT discipline_groups_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.discipline_groups TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.discipline_groups TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.discipline_groups TO service_role;

CREATE POLICY discipline_groups_read ON public.discipline_groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.disciplines (
  key        text     NOT NULL,
  group_key  text     NOT NULL,
  name       text     NOT NULL,
  sort_order smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.disciplines
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.disciplines
  ADD CONSTRAINT disciplines_group_key_fkey FOREIGN KEY (group_key) REFERENCES public.discipline_groups(key) ON DELETE CASCADE;

ALTER TABLE public.disciplines
  ADD CONSTRAINT disciplines_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.disciplines TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.disciplines TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.disciplines TO service_role;

CREATE INDEX disciplines_group_key_idx ON public.disciplines (group_key);

CREATE POLICY disciplines_read ON public.disciplines
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.game_config (
  key   text  NOT NULL,
  value jsonb NOT NULL
);

ALTER TABLE public.game_config
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.game_config
  ADD CONSTRAINT game_config_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.game_config TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.game_config TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.game_config TO service_role;

CREATE POLICY game_config_read ON public.game_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.races (
  key               text     NOT NULL,
  name              text     NOT NULL,
  base_hp           smallint,
  base_mana         smallint,
  base_speed        smallint,
  racial_talent_key text,
  sort_order        smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.races
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.races
  ADD CONSTRAINT races_pkey PRIMARY KEY (key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_race_key_fkey FOREIGN KEY (race_key) REFERENCES public.races(key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.races TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.races TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.races TO service_role;

CREATE INDEX races_racial_talent_key_idx ON public.races (racial_talent_key);

CREATE POLICY races_read ON public.races
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.stirpi (
  key         text     NOT NULL,
  race_key    text     NOT NULL,
  name        text     NOT NULL,
  talent_key  text,
  description text     DEFAULT ''::text NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.stirpi
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stirpi
  ADD CONSTRAINT stirpi_pkey PRIMARY KEY (key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_stirpe_key_fkey FOREIGN KEY (stirpe_key) REFERENCES public.stirpi(key);

ALTER TABLE public.stirpi
  ADD CONSTRAINT stirpi_race_key_fkey FOREIGN KEY (race_key) REFERENCES public.races(key) ON DELETE CASCADE;

ALTER TABLE public.stirpi
  ADD CONSTRAINT stirpi_race_key_key_key UNIQUE (race_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_race_key_stirpe_key_fkey FOREIGN KEY (race_key, stirpe_key) REFERENCES public.stirpi(race_key, key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.stirpi TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.stirpi TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.stirpi TO service_role;

CREATE INDEX stirpi_talent_key_idx ON public.stirpi (talent_key);

CREATE INDEX stirpi_race_key_idx ON public.stirpi (race_key);

CREATE POLICY stirpi_read ON public.stirpi
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.talents (
  key         text     NOT NULL,
  name        text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  kind        text     DEFAULT 'generic'::text NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.talents
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.talents
  ADD CONSTRAINT talents_kind_check CHECK (kind = ANY (ARRAY['racial'::text, 'stirpe'::text, 'via'::text, 'generic'::text]));

ALTER TABLE public.talents
  ADD CONSTRAINT talents_pkey PRIMARY KEY (key);

ALTER TABLE public.races
  ADD CONSTRAINT races_racial_talent_key_fkey FOREIGN KEY (racial_talent_key) REFERENCES public.talents(key);

ALTER TABLE public.stirpi
  ADD CONSTRAINT stirpi_talent_key_fkey FOREIGN KEY (talent_key) REFERENCES public.talents(key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.talents TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.talents TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.talents TO service_role;

CREATE POLICY talents_read ON public.talents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.via_discipline_groups (
  via_key   text NOT NULL,
  group_key text NOT NULL
);

ALTER TABLE public.via_discipline_groups
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.via_discipline_groups
  ADD CONSTRAINT via_discipline_groups_group_key_fkey FOREIGN KEY (group_key) REFERENCES public.discipline_groups(key) ON DELETE CASCADE;

ALTER TABLE public.via_discipline_groups
  ADD CONSTRAINT via_discipline_groups_pkey PRIMARY KEY (via_key, group_key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.via_discipline_groups TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.via_discipline_groups TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.via_discipline_groups TO service_role;

CREATE INDEX via_discipline_groups_group_key_idx ON public.via_discipline_groups (group_key);

CREATE POLICY via_discipline_groups_read ON public.via_discipline_groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.vie (
  key              text     NOT NULL,
  name             text     NOT NULL,
  per_level_hp     smallint DEFAULT 0 NOT NULL,
  per_level_mana   smallint DEFAULT 0 NOT NULL,
  per_level_speed  smallint DEFAULT 0 NOT NULL,
  first_talent_key text,
  description      text     DEFAULT ''::text NOT NULL,
  sort_order       smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.vie
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vie
  ADD CONSTRAINT vie_first_talent_key_fkey FOREIGN KEY (first_talent_key) REFERENCES public.talents(key);

ALTER TABLE public.vie
  ADD CONSTRAINT vie_pkey PRIMARY KEY (key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_via_key_fkey FOREIGN KEY (via_key) REFERENCES public.vie(key);

ALTER TABLE public.via_discipline_groups
  ADD CONSTRAINT via_discipline_groups_via_key_fkey FOREIGN KEY (via_key) REFERENCES public.vie(key) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.vie TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.vie TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.vie TO service_role;

CREATE INDEX vie_first_talent_key_idx ON public.vie (first_talent_key);

CREATE POLICY vie_read ON public.vie
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.wizard_categories (
  key         text     NOT NULL,
  step        smallint NOT NULL,
  title       text     NOT NULL,
  description text     DEFAULT ''::text NOT NULL,
  sort_order  smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.wizard_categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wizard_categories
  ADD CONSTRAINT wizard_categories_pkey PRIMARY KEY (key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.wizard_categories TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.wizard_categories TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.wizard_categories TO service_role;

CREATE POLICY wizard_categories_read ON public.wizard_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.wizard_options (
  category_key text     NOT NULL,
  key          text     NOT NULL,
  name         text     NOT NULL,
  description  text     DEFAULT ''::text NOT NULL,
  sort_order   smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.wizard_options
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wizard_options
  ADD CONSTRAINT wizard_options_category_key_fkey FOREIGN KEY (category_key) REFERENCES public.wizard_categories(key) ON DELETE CASCADE;

ALTER TABLE public.wizard_options
  ADD CONSTRAINT wizard_options_pkey PRIMARY KEY (category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_alignment_category_alignment_key_fkey FOREIGN KEY (alignment_category, alignment_key) REFERENCES public.wizard_options(category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_attack_category_attack_key_fkey FOREIGN KEY (attack_category, attack_key) REFERENCES public.wizard_options(category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_defense_category_defense_key_fkey FOREIGN KEY (defense_category, defense_key) REFERENCES public.wizard_options(category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_gender_category_gender_key_fkey FOREIGN KEY (gender_category, gender_key) REFERENCES public.wizard_options(category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_morality_category_morality_key_fkey FOREIGN KEY (morality_category, morality_key) REFERENCES public.wizard_options(category_key, key);

ALTER TABLE public.characters
  ADD CONSTRAINT characters_reaction_category_reaction_key_fkey FOREIGN KEY (reaction_category, reaction_key) REFERENCES public.wizard_options(category_key, key);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.wizard_options TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.wizard_options TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.wizard_options TO service_role;

CREATE POLICY wizard_options_read ON public.wizard_options
  FOR SELECT
  TO anon, authenticated
  USING (true);