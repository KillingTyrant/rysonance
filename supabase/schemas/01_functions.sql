-- Funzioni condivise.

-- Aggiorna updated_at a ogni UPDATE. search_path vuoto: la funzione non deve
-- risolvere identificatori non qualificati (requisito degli advisor Supabase).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
