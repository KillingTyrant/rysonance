npm run db:reset


rm supabase/migrations/*.sql
npx supabase stop                    # il diff richiede il db fermo (CLAUDE.md, regola 4)
npm run db:diff -- baseline          # → supabase/migrations/<nuovo_ts>_baseline.sql


verifica in locale

npm run db:start
npm run db:reset          # una sola migrazione, deve applicare pulita da zero
npx supabase stop
npx supabase db diff      # deve stampare "No schema changes found"
Quel db diff vuoto è la prova che baseline e schemas/ coincidono. Se stampa qualcosa, hai modifiche in schemas/ non catturate: correggi lì, cancella la baseline e rigenera (regola 4: mai patchare l'output del diff).

Poi controlla i dati e la sicurezza:


npm run db:start
npm run db:advisors       # RLS + performance
npm run db:types          # rigenera lib/supabase/database.types.ts

riallinea il cloud

npx supabase db reset --linked
npx supabase migration list    # local e remote devono mostrare solo la baseline






db diff -f initial_schema → 20260807155848_initial_schema.sql, zero DROP (la cartella migrations/ era vuota, le due migrazioni precedenti erano già state cancellate).
db reset applica migrazione + seed puliti.
db advisors --local → No issues found.
db:types rigenerato.