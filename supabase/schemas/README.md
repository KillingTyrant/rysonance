# supabase/schemas

Fonte di verità dello schema del database (declarative schema workflow).

Ogni file `.sql` qui descrive lo **stato desiderato** dello schema: si modifica il
`CREATE TABLE` / `CREATE FUNCTION` esistente in place, non si aggiungono `ALTER`.

Le migrazioni in `../migrations/` sono **generate** da questi file:

```bash
npx supabase stop
npx supabase db diff -f <nome_descrittivo>
npx supabase start && npx supabase migration up
```

Regole complete e le eccezioni che richiedono una migrazione scritta a mano: vedi
`CLAUDE.md` nella root del progetto.
