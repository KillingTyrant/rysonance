# Immagini di catalogo ad alte performance

## Contesto

Il wizard di creazione personaggio mostra oggi solo testo: razze, tribù e vie sono
`OptionCard` con titolo, descrizione e una riga di meta. Vanno aggiunte le illustrazioni,
con la performance come obiettivo primario dichiarato.

Il progetto non ha `public/`, non usa `next/image` da nessuna parte e `next.config.ts` non
ha un blocco `images`. Si parte da zero, quindi le decisioni prese ora fissano il
comportamento per tutte le immagini future dell'app.

Vincoli: **illustrazioni raster**, file **committati in repo** (non Supabase Storage),
copertura su razze, tribù e vie. I talenti (254) restano fuori.

Il fatto che rende tutto più semplice: ogni riga di catalogo ha una **PK testuale
leggibile** (`umani`, `eruscal`, `combattente`), e il catalogo è già congelato a build time
(`cacheLife("max")` in `lib/onboarding/catalog.ts:44`, con `supabase/seeds/README.md` che
impone un redeploy dopo ogni push). Aggiungere una razza richiede **già** un redeploy: legare
le immagini a un file in repo non introduce nessun vincolo operativo nuovo.

## Approccio: import statici ES, non `public/`

I file si importano come moduli (`import umani from "./razze/umani.png"`), non si mettono in
`public/`. Il motivo decisivo non è la comodità, è l'header di cache. In
`node_modules/next/dist/server/image-optimizer.js:663` e `:1206`:

```js
const isStatic = url.startsWith('/_next/static/media') || url.startsWith('/_next/static/immutable/media');
res.setHeader('Cache-Control', isStatic
  ? 'public, max-age=315360000, immutable'
  : `public, max-age=${maxAge}, must-revalidate`)
```

Stessa immagine, stesso ottimizzatore: da import statico esce **`immutable` per 10 anni**, da
`public/` esce `must-revalidate` con TTL 4 ore. Con `public/` ogni visitatore di ritorno
rivalida 24 URL ogni 4 ore.

Ne seguono altri tre vantaggi:

- **Invalidazione corretta.** `public/logo.png` produce un URL che non cambia quando ridisegni
  l'arte, e la cache dell'ottimizzatore continua a servire il vecchio render. L'hash sul
  contenuto invalida da solo.
- **La cache sopravvive ai deploy.** L'hash è sul contenuto, non sul build id, e l'URL
  ottimizzato non porta `?dpl=`. Le ~290 trasformazioni si pagano una volta sola nella vita
  del file, non a ogni deploy.
- **`width`/`height` e `blurDataURL` automatici**, quindi zero CLS senza bookkeeping manuale.

Scartato: `unoptimized`. Zero trasformazioni ma anche zero `srcset`, quindi la card da 214px
scaricherebbe lo stesso file di quella da 599px — 4-6× di banda sul percorso desktop, che è
quello comune.

## Struttura dei file

```
assets/catalog/
  index.ts                 ← mappa slug → StaticImageData + guard
  razze/     umani.png nani.png orchi.png elfi.png ulu_ari.png gata_ari.png
  tribu/     eruscal.png kodron.png nandrein.png turuf.png ruul.png dramput.png
             elehil.png selvas.png lurven.png shakul.png oncalynx.png kajan.png
  vie/       combattente.png sapiente.png viandante.png
```

Nomi file **identici alle chiavi del DB** (underscore, minuscolo: `ulu_ari`, `gata_ari`).

Gli import dei `.png` dentro `index.ts` vanno **relativi**, non con l'alias `@/`: la
dichiarazione ambient `declare module '*.png'` di `next/image-types/global.d.ts` è un match su
specificatore wildcard, e con `paths` configurato TS tenta prima la risoluzione reale. Il
modulo si consuma comunque via alias (`import { CATALOG_IMAGES } from "@/assets/catalog"`).

La mappa sta in `assets/` e non dentro `components/onboarding/` perché serve anche a
`components/personaggi/personaggio-sheet.tsx`, che è compilato in entrambi i grafi
(client dal wizard, server dalla lobby) — per questo il modulo non deve avere direttive.

## Le tre cose che determinano la performance

### 1. `sizes` — la leva più grande

La larghezza reale della card **non** è 320px. `components/onboarding/personaggio-wizard.tsx:185`
mette lo step dentro `grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]`, quindi c'è una colonna
aside da 18rem da sottrarre:

| viewport | colonne | card |
|---|---|---|
| ≥1024 | 3 | **214px** ← desktop |
| 1023 | 2 | 486px |
| 640 | 2 | 294px |
| 639 | 1 | **599px** ← massimo assoluto |
| 390 | 1 | 350px |

```
sizes="(min-width: 1024px) 214px, (min-width: 640px) 50vw, 92vw"
```

I `vw` vanno scritti **separati da spazio**. `get-img-props.js:50-63` legge la stringa con
`/(^|\s)(1?\d?\d)vw/g` e poi filtra `allSizes.filter(s => s >= deviceSizes[0] * smallestRatio)`.
Un `calc(50vw - 26px)` non matcha (il `vw` è preceduto da `(`, non da spazio) e produce
**silenziosamente** il srcset completo.

Senza `sizes`, con `fill`, Next sostituisce `100vw`: al browser viene detto che una card da
214px occupa tutto il viewport, e su un desktop retina da 1440px sceglie la variante **3840px**,
sei volte sopra la piega. È il peggior fallimento possibile qui, ed è silenzioso — nessun
warning, pixel apparentemente corretti.

### 2. Sorgenti: 1080 × 810 px, esattamente

- **Mai sopra 1080.** `deviceSizes` si ferma a 1080, e `sharp.resize` usa
  `withoutEnlargement: true`: ogni pixel oltre 1080 viene decodificato e buttato, a ogni
  trasformazione più una volta per il blur. Autorare a 2160 quadruplica il peso del repo e
  rende identico.
- **Mai sotto 1080.** Sempre per `withoutEnlargement`, la variante 1080 sarebbe silenziosamente
  la sorgente: un tablet DPR-2 sulla card da 599px riceve un'immagine molle senza alcun segnale.
- **Formato:** JPEG q≈92 se opache; PNG-24 passato da `pngquant`/`oxipng` se con trasparenza
  (un PNG-24 grezzo di un'illustrazione dipinta è 1-2,5 MB — ×21 sono decine di MB di storia
  git per zero beneficio). Anche `.webp` è un sorgente valido per l'import statico ed è molto
  più leggero a parità di qualità.
- **Decidere prima di commissionare: dark mode.** Il progetto ha `darkMode: ["class"]` e
  next-themes. Illustrazioni opache su fondo chiaro diventano 21 rettangoli luminosi incollati
  su `bg-card` scuro. O si autora su **trasparente** (che impone l'alpha, quindi PNG/WebP), o
  si sceglie un fondo neutro che regga entrambi i temi. Ritoccarlo dopo su 21 tavole finite
  costa molto.

### 3. `next.config.ts`

```ts
images: {
  // AVIF prima di WebP: su campiture piatte pesa il 30-40% in meno. L'encode è
  // più lento ma si paga una volta sola: la sorgente è /_next/static/media/<hash>,
  // quindi la trasformazione resta valida finché il disegno non cambia davvero.
  formats: ["image/avif", "image/webp"],

  // La matrice di default (15 larghezze fino a 3840) è tarata su immagini a tutta
  // pagina. Qui la card non supera mai ~600 CSS px.
  // Il 512 non è una larghezza di viewport: è la soglia. Next scarta dal srcset
  // tutto ciò che sta sotto deviceSizes[0] * smallestRatio (0.5, dal 50vw), cioè
  // sotto 256 — che è esattamente la variante della card da 214px su schermo non
  // retina. Lasciando 640, la soglia salirebbe a 320 e quel caso scaricherebbe 384.
  deviceSizes: [512, 640, 828, 1080],
  imageSizes: [96, 128, 256, 384],

  // Una sola qualità = una sola variante per larghezza. 80 e non 75 perché le
  // campiture piatte fanno banding prima delle foto. Non serve passare `quality`
  // a ogni <Image>: findClosestQuality arrotonda alla più vicina fra quelle dichiarate.
  qualities: [80],

  // L'ottimizzatore può leggere solo i file emessi dalla build. Non c'è public/,
  // quindi non toglie niente e chiude /_next/image?url=<qualunque-cosa>.
  localPatterns: [{ pathname: "/_next/static/media/**", search: "" }],
},
```

`minimumCacheTTL` va **omesso**: per le sorgenti `/_next/static/media` la risposta è `immutable`
comunque e `maxAge = max(minTTL, upstream)` è già saturo. Impostarlo è teatro.

Costo risultante: 6 larghezze × 2 formati × 21 immagini = **252 trasformazioni una tantum**,
contro le 5.000/mese incluse su Vercel. Non è un problema.

Nota: `deviceSizes`/`imageSizes` sono globali. Il tetto a 1080 vincola anche un futuro hero a
tutta larghezza. Oggi non ci sono altri `<Image>`, quindi è una decisione da rivedere, non un bug.

## Modifiche, in ordine

**1. `package.json`** — dichiarare `"sharp": "^0.35.3"` in `dependencies`. Oggi è presente
solo come dipendenza **opzionale transitiva** di Next. Serve a build time per generare i
blurDataURL (`next-image-loader/blur.js` → `getSharp()`): un `npm ci` su una CI che salta le
opzionali fa fallire la build.

**2. `next.config.ts`** — aggiungere il blocco `images` sopra. Nessuno dipende ancora da
questo: si committa per primo e si conferma che `next build` passa.

**3. Produrre le 21 tavole** — 1080×810, secondo le decisioni su formato e dark mode. È il
pezzo a lead time lungo; tutto il resto è lavoro di un giorno.

**4. `assets/catalog/index.ts`** — la mappa e il guard:

```ts
import type { StaticImageData } from "next/image";
import umani from "./razze/umani.png";
// … 21 import statici in tutto
import type { Catalog } from "@/lib/onboarding/types";

export type CatalogImageKind = "razze" | "tribu" | "vie";

/**
 * Chiave di catalogo → illustrazione. Raggruppate per tipo e non piatte: le chiavi
 * sono uniche solo dentro la propria tabella.
 */
export const CATALOG_IMAGES: Record<
  CatalogImageKind,
  Record<string, StaticImageData | undefined>
> = {
  razze: { umani, nani, orchi, elfi, ulu_ari, gata_ari },
  tribu: { eruscal, kodron, nandrein, turuf, ruul, dramput,
           elehil, selvas, lurven, shakul, oncalynx, kajan },
  vie: { combattente, sapiente, viandante },
};

/**
 * Le chiavi senza illustrazione. Il confronto è con il DB, non con una lista
 * riscritta a mano: è l'unico modo per accorgersi di una tribù aggiunta al seed
 * e mai disegnata.
 */
export function missingCatalogImages(catalog: Catalog): string[] {
  const missing: string[] = [];
  const check = (kind: CatalogImageKind, key: string) => {
    if (!CATALOG_IMAGES[kind][key]) missing.push(`${kind}/${key}`);
  };
  for (const razza of catalog.razze) {
    check("razze", razza.key);
    for (const tribu of razza.tribu) check("tribu", tribu.key);
  }
  for (const via of catalog.vie) check("vie", via.key);
  return missing;
}
```

Tipizzazione a index signature e non union letterale: le chiavi vivono in
`supabase/seeds/00_catalog.sql`, TypeScript non le vede, e ricopiarle in una union
duplicherebbe contenuto del DB nel codice (contro la regola di `CLAUDE.md`) dando un check
contro la copia, non contro il database. Romperebbe anche i call site: con un oggetto a chiavi
letterali, `CATALOG_IMAGES.razze[item.key]` con `item.key: string` è TS7053 sotto `strict`.

**5. `lib/onboarding/catalog.ts`** — estrarre l'oggetto di ritorno in `const catalog: Catalog`
e aggiungere il guard prima del return:

```ts
const senzaImmagine = missingCatalogImages(catalog);
if (senzaImmagine.length > 0) {
  throw new Error(`Catalogo: illustrazioni mancanti per ${senzaImmagine.join(", ")}`);
}
```

Funziona a build time: `/onboarding` prerenderizza e la chiave di `"use cache"` include il
build id, quindi il corpo gira a ogni build con cache fredda. Rompe la build come già fa
`read()` a `catalog.ts:195-202`. L'`import "server-only"` del file avvelena quel modulo per
l'import client, non le sue dipendenze, quindi importare un modulo dati senza direttive è
lecito.

Caveat da conoscere: il guard sta *dentro* la funzione cachata, quindi se un domani si aggiunge
un `cacheTag` o un cache handler persistente fra build, smette di girare in silenzio. In
alternativa le due righe stanno in `app/(protected)/onboarding/page.tsx` dopo
`await getCatalog()` — stessa garanzia, fuori dalla cache, ma copre solo quella rotta.

**6. `components/onboarding/option-card.tsx`** — slot immagine. `<img>` è phrasing content,
quindi è valido dentro `<button>`; solo i wrapper di blocco devono restare `<span>`. Due
cambi strutturali: `p-4` si sposta su uno span interno, e `overflow-hidden` va sul button così
il bordo della card ritaglia gli angoli dell'immagine (`overflow-hidden` clippa i discendenti,
non il `ring-*` del button, quindi selected e focus restano intatti).

```tsx
const IMAGE_SIZES = "(min-width: 1024px) 214px, (min-width: 640px) 50vw, 92vw";

// nuovi prop: image?: StaticImageData, priority?: boolean

<button className={cn(
  "flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-colors",
  "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  selected && "border-primary bg-accent ring-1 ring-primary hover:bg-accent",
  disabled && "cursor-not-allowed opacity-50 hover:bg-card",
)}>
  {image && (
    // Il rapporto è fissato in CSS: la scatola esiste prima che l'immagine arrivi,
    // quindi nessun salto di layout. `bg-muted` è ciò che si vede nel frattempo.
    <span className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden border-b bg-muted">
      <Image src={image} alt="" fill sizes={IMAGE_SIZES}
             placeholder={priority ? "blur" : "empty"} priority={priority}
             className="object-cover" />
    </span>
  )}
  <span className="flex w-full flex-col items-start gap-1.5 p-4">
    {/* contenuto attuale invariato: title row, description, meta, disabledReason */}
  </span>
</button>
```

Scelte:
- **`alt=""` è corretto.** Il nome accessibile del `<button>` è calcolato dal testo che
  contiene, che include già nome e descrizione. Un `alt` pieno lo duplicherebbe ("Umani Umani
  Descrizione…"). L'attributo deve essere presente, e i tipi di `next/image` lo impongono.
- **`fill` + `aspect-[4/3]`** e non sizing intrinseco: anche l'intrinseco dà zero CLS, ma
  rende ogni card di una riga alta diversamente se una tavola esce con un canvas leggermente
  diverso. La scatola a rapporto fisso più `object-cover` lo rende impossibile.
- **`Check` resta nella title row.** Spostarlo in overlay sull'immagine renderebbe meglio, ma
  collide col titolo nei sette call site senza immagine (sessi, caratteristiche, combattimento,
  talenti). Zero regressioni batte la rifinitura marginale.
- **Niente `loading="eager"`**: non compra nulla (i browser scaricano subito le `lazy` già in
  viewport) e `priority` + `loading` insieme lanciano l'errore E218.
- **4:3** dà 160px di altezza sulla card desktop da 213px, dove 16:9 ne darebbe 120 e leggerebbe
  come banner. Se in review la card mobile singola (449px di altezza a 639px di viewport)
  sembra troppo alta, `aspect-[16/10] sm:aspect-[4/3]` la sistema gratis.

**7. Call site** — passare `image` e, sulle razze, `priority`:
- `components/onboarding/steps/identita-step.tsx:55-82` (razze) — `image={CATALOG_IMAGES.razze[item.key]}`,
  `priority={i < 3}` (serve `(item, i)` nella callback). Tre = la prima riga `lg`.
- `components/onboarding/steps/identita-step.tsx:95-114` (tribù) — `image={CATALOG_IMAGES.tribu[item.key]}`
- `components/onboarding/steps/via-step.tsx:20-54` (vie) — `image={CATALOG_IMAGES.vie[via.key]}`
- Invariati: sessi, caratteristiche, combattimento, talenti.

## Blur e strategia di caricamento

`blurDataURL` **non è opzionale**: `next-image-loader/index.js` lo emette sempre per
png/jpeg/webp/avif, che tu usi `placeholder="blur"` o no. Sono ~360 caratteri per PNG,
~10 KB grezzi per 21 immagini (~1,2% degli 873 KB di first-load JS di `/onboarding`). È il
prezzo dell'import statico, e l'unica via d'uscita è `public/`, che costa l'`immutable`.

Quello che si controlla è il costo in **HTML**: renderizzare il blur inlinea ~1 KB per immagine
nello shell prerenderizzato (oggi 20 KB). Quindi: **`placeholder="blur"` solo sulle razze**,
che sono nel primo paint; per tribù e vie basta il `bg-muted` della scatola. Dopo un'interazione
client, un box neutro per 150 ms e un blur per 150 ms sono indistinguibili.

`priority` non serve a niente su ciò che monta dopo un'interazione: quando React renderizza la
griglia delle tribù l'`<img>` è già nel DOM, e preload e fetch sono la stessa richiesta. L'unico
strumento reale contro il "pop" al cambio step è **prefetchare prima**. Vale la pena solo per le
vie (3 immagini, le vede chiunque, ~60 KB) con `ReactDOM.preload` + `getImageProps` in un
`requestIdleCallback` al mount del wizard — e solo dopo aver misurato che il pop dà davvero
fastidio. Per le tribù no: 12 immagini precaricate per mostrarne 2 è chiaramente sbagliato.

## Decisioni aperte

1. **Le sottovie non hanno dove essere renderizzate.** `via-step.tsx:22` le usa solo per
   *contare* i livelli (`via.sottovie.filter(s => s.level > 0).length`) e non esiste nessuna card
   di sottovia in tutto il codebase. Commissionare 3 tavole che non verrebbero mai mostrate è
   spesa secca: o si aggiunge un punto di render (un inserto nella card della via), o si tagliano
   dal brief. **Questo documento le esclude** — 21 immagini, non 24.
2. **Razze incluse.** Se vanno escluse, si tolgono 6 file e un call site.
3. **Fondo delle illustrazioni** (trasparente vs neutro), da decidere prima di commissionare.

## File critici

- `next.config.ts` — blocco `images`
- `assets/catalog/index.ts` — nuovo, mappa + guard
- `components/onboarding/option-card.tsx` — slot immagine, `p-4` su span interno
- `components/onboarding/steps/identita-step.tsx` — razze e tribù
- `components/onboarding/steps/via-step.tsx` — vie
- `lib/onboarding/catalog.ts` — guard build-time
- `package.json` — `sharp` esplicito
- `components/onboarding/personaggio-wizard.tsx:185` — la griglia che fissa i 214px (e
  l'eventuale prefetch delle vie)

## Verifica

Nell'ordine, e il punto 2 è quello che intercetta il fallimento costoso e silenzioso:

1. **`npm run dev`** — i blur si vedono (è lo smoke test di `localPatterns`: se la regola è
   sbagliata le placeholder spariscono) e la console non dà warning da `get-img-props`.
2. **`npm run build`, poi ispezionare `.next/server/app/onboarding.html`** — ogni `<img>` di
   catalogo deve avere un attributo `sizes` e un `srcset` di **sei voci**. Un srcset da 9 o 15
   voci, o un `sizes="100vw"`, significa che la stringa `IMAGE_SIZES` o la soglia `deviceSizes[0]`
   sono sbagliate.
3. **`.next/diagnostics/route-bundle-stats.json`** — `firstLoadUncompressedJsBytes` di
   `/onboarding` deve salire di ~10 KB, non di più. Un salto maggiore vuol dire che qualcos'altro
   è finito nel grafo client.
4. **Header su una richiesta `/_next/image?...`** — deve essere
   `Cache-Control: public, max-age=315360000, immutable`. Un `must-revalidate` lì significa che
   la sorgente non arriva da `/_next/static/media` e il vantaggio dell'import statico è perso.
5. **Guard**: rinominare temporaneamente un asset e confermare che `npm run build` fallisce con
   la chiave nel messaggio, poi rinominarlo indietro.
6. **Dark mode**: aprire il wizard nei due temi e controllare che le tavole non siano rettangoli
   luminosi su fondo scuro. Verificare anche una razza `disabled` — l'`opacity-50` del button
   dima anche l'illustrazione.
