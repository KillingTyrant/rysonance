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

- **Solo tabelle di catalogo.** Mai `characters` o altre tabelle utente: in cloud questi
  file girano su dati reali.
- **Cambio di contenuto → si edita il seed**, non si scrive una migrazione. Le migrazioni
  restano per la struttura e per i travasi di dati una tantum (es.
  `20260807150916_move_base_stats_to_stirpi`).
- **Il prune può fallire per foreign key** se si toglie una voce già scelta da un
  personaggio. È voluto: è un allarme, non un bug.
- **Dopo un push serve un deploy.** L'app legge il catalogo a build time
  (`use cache` + `cacheLife("max")` in `lib/onboarding/catalog.ts`).
