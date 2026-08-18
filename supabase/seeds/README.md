# supabase/seeds

Fonte di verità dei **contenuti** del catalogo (la struttura sta in `../schemas/`).

I file qui sono **idempotenti**: ogni riapplicazione porta le tabelle di catalogo
esattamente allo stato descritto — upsert di ciò che c'è, delete di ciò che non c'è più.
Si editano a mano, non si generano.

```bash
npm run db:reset                        # locale: migrazioni + seed da zero
npx supabase db push --include-seed     # cloud: migrazioni + seed
```

Vengono caricati in ordine lessicografico (`sql_paths = ["./seeds/*.sql"]` in
`config.toml`).

## Regole

- **Solo tabelle di catalogo.** Mai `personaggi` / `personaggio_tendenze` o altre tabelle
  utente: in cloud questi file girano su dati reali.
- **Cambio di contenuto → si edita il seed**, non si scrive una migrazione. Le migrazioni
  restano per la struttura e per i travasi di dati una tantum.
- **Liste di colonne esplicite**, sia nelle temp table di staging sia negli `insert`. Mai
  `like public.<tabella>` + `select *`: `LIKE ... INCLUDING DEFAULTS` copia le colonne
  generate (`talent_kind`, `default_value`) come colonne normali, e l'insert fallisce con
  `cannot insert a non-DEFAULT value into column ...`. È un errore che si manifesta solo a
  `db:reset`, non al `db diff`.
- **Il prune può fallire per foreign key** se si toglie una voce già scelta da un
  personaggio. È voluto: è un allarme, non un bug.
- **Dopo un push serve un deploy.** L'app legge il catalogo a build time
  (`use cache` + `cacheLife("max")` in `lib/onboarding/catalog.ts`).
