<a href="https://rysonancerpg.com/">
  <h1 align="center">Rysonance RPG</h1>
</a>

<p align="center">
  Codebase
</p>

<p align="center">
  <a href="#funzionalità"><strong>Funzionalità</strong></a> ·
  <a href="#esecuzione-in-locale"><strong>Esecuzione in locale</strong></a> ·
  <a href="#sviluppo-locale-con-supabase-in-localhost"><strong>Sviluppo con Supabase locale</strong></a> ·
  <a href="#segnalazioni-e-issue"><strong>Segnalazioni e issue</strong></a> ·
  <a href="#altri-esempi-supabase"><strong>Altri esempi</strong></a>
</p>
<br/>

## Funzionalità

- Funziona su tutto lo stack [Next.js](https://nextjs.org)
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - Funziona e basta!
- supabase-ssr: un pacchetto per configurare Supabase Auth in modo che usi i cookie
- Blocco di autenticazione con password installato tramite la [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Stili con [Tailwind CSS](https://tailwindcss.com)
- Componenti con [shadcn/ui](https://ui.shadcn.com/)
- Deploy opzionale con [l'integrazione Supabase per Vercel e il deploy su Vercel](#deploy-your-own)
  - Variabili d'ambiente assegnate automaticamente al progetto Vercel

## Esecuzione in locale

1. Spostati nella directory dell'app con `cd`

   ```bash
   cd rysonance
   ```

2. Rinomina `.env.example` in `.env.local` e aggiorna i valori seguenti:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[URL DEL PROGETTO SUPABASE]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[PUBLISHABLE KEY O ANON KEY DEL PROGETTO SUPABASE]
  ```
  > [!NOTE]
  > Questo esempio usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, che si riferisce al nuovo formato di chiave **publishable** di Supabase.
  > Durante il periodo di transizione, con questo nome di variabile si possono usare sia le vecchie chiavi **anon** sia le nuove chiavi **publishable**. La dashboard di Supabase potrebbe mostrare `NEXT_PUBLIC_SUPABASE_ANON_KEY`: il suo valore va bene per questo esempio.
  > Per maggiori informazioni vedi l'[annuncio completo](https://github.com/orgs/supabase/discussions/29260).

  Sia `NEXT_PUBLIC_SUPABASE_URL` che `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` si trovano nelle [impostazioni API del tuo progetto Supabase](https://supabase.com/dashboard/project/_?showConnect=true).

3. Ora puoi avviare il server di sviluppo locale di Next.js:

   ```bash
   npm run dev
   ```

   Lo starter kit dovrebbe essere raggiungibile su [localhost:3000](http://localhost:3000/).

4. Questo template è inizializzato con lo stile predefinito di shadcn/ui. Se preferisci un altro stile di ui.shadcn, cancella `components.json` e [reinstalla shadcn/ui](https://ui.shadcn.com/docs/installation/next).

## Sviluppo locale con Supabase in localhost

Questo progetto è configurato per girare interamente in locale: lo stack Supabase gira in
Docker sulla tua macchina, senza toccare il progetto cloud.

### Prerequisiti

Un container runtime compatibile Docker: Docker Desktop, OrbStack, Rancher Desktop, Podman
o colima. La CLI Supabase è già una devDependency — si usa via `npx supabase` o tramite gli
script npm, senza installazione globale.

### Avvio

```bash
npm run db:start     # avvia lo stack (il primo avvio scarica le immagini: alcuni minuti)
npm run db:status    # URL e chiavi locali
```

Servizi esposti in locale:

| Servizio            | URL                                                       |
| ------------------- | --------------------------------------------------------- |
| API Gateway         | http://127.0.0.1:54321                                    |
| Studio (UI)         | http://127.0.0.1:54323                                    |
| Mailpit (email)     | http://127.0.0.1:54324                                    |
| Postgres            | postgresql://postgres:postgres@127.0.0.1:54322/postgres   |

### Puntare l'app allo stack locale

Le credenziali del progetto cloud stanno in `.env.local`. Per lo sviluppo locale **non
modificarle**: crea `.env.development.local`, che in Next.js ha precedenza su `.env.local`
quando `NODE_ENV=development` (ordine di lookup: `process.env` → `.env.$(NODE_ENV).local` →
`.env.local` → `.env.$(NODE_ENV)` → `.env`).

```bash
npm run db:status    # copia API URL e publishable key dall'output
```

```env
# .env.development.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key da `npm run db:status`>
```

Poi `npm run dev` usa Supabase locale, mentre `npm run build && npm run start` continua a
usare il progetto cloud di `.env.local`. Entrambi i file sono già in `.gitignore` (`.env*.local`).

Le chiavi locali sono credenziali demo fisse dello stack di sviluppo, non segreti di
produzione — ma la secret key locale resta comunque fuori dal codice client.

### Comandi

| Comando               | Cosa fa                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `npm run db:start`    | Avvia lo stack locale                                            |
| `npm run db:stop`     | Ferma lo stack conservando i dati (`--no-backup` per cancellarli) |
| `npm run db:status`   | Mostra URL e chiavi locali                                       |
| `npm run db:diff <n>` | Genera una migrazione dai file in `supabase/schemas/`            |
| `npm run db:migrate`  | Applica le migrazioni pendenti al DB locale                      |
| `npm run db:reset`    | Ricrea il DB locale da migrazioni + seed                         |
| `npm run db:advisors` | Controlli di sicurezza e performance sul DB locale               |
| `npm run db:push`     | Applica le migrazioni al progetto remoto linkato                 |

Per il DB remoto serve prima il link: `npx supabase login && npx supabase link --project-ref <ref>`.

### Modifiche allo schema

Lo schema si modifica **solo** dai file dichiarativi in `supabase/schemas/`; le migrazioni
in `supabase/migrations/` sono generate, mai scritte a mano. Il ciclo tipico:

```bash
# 1. edita supabase/schemas/*.sql
npm run db:diff -- <nome_descrittivo>   # genera la migrazione dal diff
npm run db:migrate                      # applicala in locale
npm run db:advisors                     # controlla RLS e performance
```

Regole complete, eccezioni (DML, `ALTER POLICY`, viste materializzate…) e checklist di
sicurezza: vedi [`CLAUDE.md`](./CLAUDE.md).

### Problemi comuni

- **`supabase_analytics_... container is not ready: unhealthy`**: il container Logflare
  (analytics) è il più pesante dello stack e non diventa healthy quando Docker ha poca RAM,
  facendo fallire l'intero `start`. In questo progetto `[analytics] enabled = false` in
  `supabase/config.toml`: si perde solo il Logs Explorer locale. Se ti serve quella UI,
  rimetti `true` e assegna a Docker almeno 8 GB.
- **`LegacyHealthCheckTimeoutError` al primo `db:start`**: al primo avvio le immagini vengono
  scaricate e i container partono lenti, superando il timeout degli health check; la CLI
  smonta lo stack. Rilancia `npm run db:start`: al secondo tentativo le immagini sono in
  cache e parte correttamente.
- **`container is not running: exited`** su `db:status`: lo stack non è attivo, esegui
  `npm run db:start`.
- **Porte occupate** (54321-54324): sono configurate in `supabase/config.toml`.

> Riferimento upstream: [docs Local Development](https://supabase.com/docs/guides/getting-started/local-development).

## Segnalazioni e issue

Apri segnalazioni e issue sull'[organizzazione GitHub di Supabase](https://github.com/supabase/supabase/issues/new/choose).

## Altri esempi Supabase

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Autenticazione basata su cookie e App Router di Next.js 13 (corso gratuito)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth e l'App Router di Next.js](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
