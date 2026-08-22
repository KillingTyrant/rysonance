-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.tribu
  ADD COLUMN base_hp smallint;

ALTER TABLE public.tribu
  ADD COLUMN base_mana smallint;