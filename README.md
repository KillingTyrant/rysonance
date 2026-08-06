<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```
  > [!NOTE]
  > This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

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

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
