# CLAUDE.md

## Regola: le migrazioni Supabase si generano da schemi dichiarativi

Questo progetto usa il **declarative schema workflow** di Supabase
([docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)).
`supabase/schemas/` è l'unica fonte di verità dello schema; `supabase/migrations/` contiene
solo file **generati**.

### Obbligatorio

1. **Ogni modifica di schema parte da `supabase/schemas/*.sql`.** Si edita lì lo stato
   desiderato (il `CREATE TABLE` esistente viene modificato in place, non si aggiunge un
   `ALTER`), poi si genera la migrazione.
2. **Non scrivere a mano file in `supabase/migrations/`.** Niente `npx supabase migration new`
   per cambi di schema, niente file inventati a mano.
3. **Non modificare lo schema direttamente sul database** (SQL Editor, `execute_sql`,
   `psql`, MCP `apply_migration`) e poi fare `db pull`. `supabase db diff` confronta i
   **file** in `schemas/` con le migrazioni: le modifiche fatte solo sul DB vengono perse.
   Per esperimenti usa il DB locale, ma riporta sempre il risultato nei file `schemas/`.
4. **Genera e rivedi la migrazione** prima di committare:
   ```bash
   npx supabase stop                       # il diff richiede il db fermo
   npx supabase db diff -f <nome_descrittivo>
   npx supabase start && npx supabase migration up   # verifica che applichi pulita
   ```
   La CLI è una devDependency del progetto: usa sempre `npx supabase` (non un binario
   globale, che potrebbe essere di una versione diversa).
   Rileggi sempre l'SQL generato: il diff può produrre `DROP` distruttivi (es. una colonna
   rinominata diventa drop + add, con perdita di dati). Se il diff è sbagliato, correggi i
   file `schemas/`, cancella la migrazione generata e rigenerala — non patchare l'output.
5. **Committa insieme** il file in `schemas/` e la migrazione generata. Una PR con una
   migrazione senza il corrispondente cambio in `schemas/` non è valida.
6. **Le migrazioni già committate sono immutabili.** Si corregge con una nuova migrazione
   generata, mai riscrivendo un file esistente. In sviluppo locale si può ripartire con
   `npx supabase db reset` / `npx supabase db reset --version <timestamp>`.

### Sviluppo locale (Supabase in localhost)

Lo sviluppo si fa contro lo **stack Supabase locale in Docker**, mai direttamente contro il
progetto cloud. Il ciclo di lavoro è:

```bash
npm run db:start                        # stack locale su 127.0.0.1:54321 (Studio :54323)
# edita supabase/schemas/*.sql
npm run db:diff -- <nome_descrittivo>   # genera la migrazione
npm run db:migrate                      # applicala al DB locale
npm run db:advisors                     # verifica RLS/performance
```

Regole per l'ambiente locale:

- **L'app punta al locale via `.env.development.local`**, che in Next.js vince su `.env.local`
  quando `NODE_ENV=development`. `.env.local` resta riservato alle credenziali del progetto
  cloud e non va modificato per lavorare in locale. Valori: `NEXT_PUBLIC_SUPABASE_URL` =
  `http://127.0.0.1:54321`, publishable key da `npm run db:status`.
- **Il DB locale è usa e getta.** Se lo stato locale diverge da migrazioni + seed, si riparte
  con `npm run db:reset` (che riapplica tutte le migrazioni da zero): è anche il modo per
  verificare che le migrazioni generate applichino pulite su un DB vuoto.
- **Studio locale (`:54323`) è per ispezionare, non per modificare lo schema.** Ogni modifica
  fatta lì va persa al primo `db reset` e non finisce in `schemas/`. Vale la regola 3 sopra.
- **Le email di auth in locale non escono**: si leggono su Mailpit, http://127.0.0.1:54324.
- **`npm run db:push` tocca il progetto remoto.** Va eseguito solo dopo che le migrazioni
  sono state verificate in locale con un `db:reset` pulito, e mai come scorciatoia per
  "sistemare" il cloud a mano.
- Le chiavi dello stack locale sono credenziali demo fisse, non segreti di produzione; la
  secret key locale resta comunque fuori dal codice client.
- `npm run db:stop` conserva i dati locali; `npx supabase stop --no-backup` li cancella.

### Ordine dei file

`schema_paths` in `supabase/config.toml` definisce l'ordine di esecuzione (default:
lessicografico). Le tabelle padre devono precedere quelle figlie con foreign key. Se serve
un ordine specifico, elencare i file espliciti prima del glob:

```toml
[db.migrations]
schema_paths = ["./schemas/00_extensions.sql", "./schemas/*.sql"]
```

### Eccezioni: cosa NON va in `schemas/`

Il diff dichiarativo non gestisce queste entità — vanno in una migrazione versionata scritta
a mano (`npx supabase migration new <nome>`), con un commento che spieghi perché:

- DML (`INSERT` / `UPDATE` / `DELETE`) e backfill di dati **una tantum** (es. il travaso di
  una colonna da una tabella a un'altra). I contenuti del catalogo sono l'eccezione
  all'eccezione: vedi sotto.
- `ALTER POLICY` (RLS) — la `CREATE POLICY` iniziale sta in `schemas/`, le modifiche no
- viste materializzate, ownership delle viste e `security_invoker`
- privilegi su colonne e schemi, grant duplicati da default privileges
- `COMMENT ON`, partizioni, publication, domain

### Contenuti del catalogo: `supabase/seeds/`

I dati di riferimento del wizard (talenti, razze, stirpi, vie, discipline, opzioni,
`game_config`) **non** stanno nelle migrazioni: vivono in `supabase/seeds/00_catalog.sql`,
che è idempotente e descrive lo stato desiderato come fanno i file in `schemas/`. Cambiare
una descrizione o aggiungere una stirpe significa editare quel file, non generare una
migrazione. Si applica con `npm run db:reset` in locale e
`npx supabase db push --include-seed` in cloud. Regole e vincoli: `supabase/seeds/README.md`.

### Sicurezza (vale anche nei file `schemas/`)

- RLS abilitata su **ogni** tabella in `public`, con policy che riflettano il modello di
  accesso reale (non `auth.uid()` copiato ovunque).
- Policy con `TO authenticated` **+** predicato di ownership in `USING`; le `UPDATE` devono
  avere sia `USING` che `WITH CHECK`.
- Viste create con `WITH (security_invoker = true)`.
- Mai `user_metadata` nelle decisioni di autorizzazione (è modificabile dall'utente).
- Dopo ogni cambio: `npx supabase db advisors` (o MCP `get_advisors`) e correggere i rilievi.

### Prima di iniziare

Carica le skill `supabase` e `supabase-postgres-best-practices` prima di scrivere o
modificare qualsiasi cosa che viva nel database.
