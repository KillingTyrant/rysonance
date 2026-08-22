# Creazione del personaggio

Come funziona l'onboarding, dall'alto verso il basso.

## 0. I quattro passi, e perché in quest'ordine

La creazione parte da una hub ("Creazione dell'eroe") che elenca i macro-passi: ognuno
si apre con una schermata introduttiva e contiene i suoi step. Le righe della hub si
sbloccano completando le precedenti (`isGroupUnlocked`), e la CTA "Crea Eroe" porta al
riepilogo quando tutto è completo.

| macro-passo | step | cosa raccoglie |
|---|---|---|
| Scegli la tua razza | Identità | `sesso`, `razza_key`, `tribu_key` |
| Scegli la tua Via | La Via | `via_key` |
| Scegli i tuoi talenti | Talenti | i talenti a scelta |
| — (CTA della hub) | Riepilogo | `name`: l'ultima scelta, a eroe completo |

L'ordine non è solo estetico, c'è una dipendenza vera: quanti talenti si scelgono
dipende dalla **Via** — chiesta prima di chi la usa. Cambiare una scelta a monte
invalida quelle a valle, e se ne occupa `handleChange` (vedi *Coerenza fra campi*).

## 1. Il catalogo — dati statici, letti a build time

`app/(protected)/onboarding/page.tsx` chiama `getCatalog()`
(`lib/onboarding/catalog.ts`), un Server Component async.

- `getCatalog` è marcata `"use cache"` + `cacheLife("max")`: viene risolta a build time
  e congelata nella shell statica, quindi a runtime non parte nessuna query per disegnare
  il wizard.
- Usa un client Supabase anonimo, senza cookie: tutte le tabelle di catalogo hanno RLS
  con policy `for select to anon using (true)`, quindi la lettura non dipende dalla
  request — condizione necessaria perché sia prerenderizzabile.
- Legge **cinque** tabelle (`talenti`, `razze`, `tribu`, `vie`, `sottovie`) con le
  colonne elencate una per una, e le ricompone: razza → tribù, via → sottovie, ciascuna
  col proprio talento.
- Non usa l'embedding PostgREST perché il legame verso i talenti è una FK **composta**
  `(talent_key, talent_kind)`, che l'embedding non risolve.
- `talenti.properties` è l'unica colonna che si legge e non prosegue: serve a ricavare
  `via.talenti_extra` e poi viene buttata, così gli effetti di gioco non finiscono nel
  payload del client.
- I talenti `kind = 'scelta'` non appartengono a nessuno: finiscono in
  `catalog.talentiScelta`, la lista piatta da cui l'utente pesca nel suo step.
- Se una query fallisce, `read()` lancia: un catalogo incompleto farebbe fallire la build
  invece di produrre un deploy con un wizard rotto.

Il catalogo descrive **solo il gioco**. Non c'è nessuna tabella che descriva la forma
della UI: il wizard interroga il catalogo, non è definito da esso.

## 2. Il wizard client — solo il draft delle scelte

`components/onboarding/personaggio-wizard.tsx` è l'unico `"use client"` rilevante. Riceve
il catalogo già risolto e tiene in `useState` un solo oggetto, `PersonaggioDraft`. Quel
draft **è anche il payload** mandato alla server action — non c'è nessuna conversione in
mezzo.

### La validazione è per campo, non per step

`validateDraft` (`lib/onboarding/validate.ts`) è l'unica definizione di "personaggio
valido" dell'applicazione. Restituisce una lista di `Problem`, ognuno legato a un
`DraftField`. Gli step dichiarano quali campi raccolgono, e tutto il resto ne discende:

| consumatore | derivazione |
|---|---|
| bottone "Avanti" | `problemsForStep(problems, step)` è vuoto |
| "Manca: Razza, Tribù" | le `label` dei problemi di quello step |
| spunte e sblocco delle righe della hub | `isGroupComplete` / `isGroupUnlocked` |
| CTA "Crea Eroe" | `allGroupsComplete(problems)` |
| riepilogo | i problemi di tutti gli step, con il link per andarci |
| server action | la **stessa** `validateDraft`, prima di scrivere |

`lib/onboarding/validate.ts` non ha direttive: è importato sia dal componente client sia
dal modulo server — è questo, e non una convenzione, che impedisce alle due validazioni di
divergere.

### Step → componente

`STEP_COMPONENTS` (`components/onboarding/wizard-steps.tsx`) è un
`Record<StepId, ComponentType<StepProps>>`: esaustivo per costruzione, quindi aggiungere
uno step senza il suo componente non compila. Nel wizard non esiste nessuna catena di `if`
né nessun numero di step scritto a mano.

### Coerenza fra campi

`handleChange` è l'unico punto in cui il draft cambia, e quindi l'unico posto in cui
vivono gli invarianti. Sono tutti della stessa forma — una scelta a monte ne invalida una
a valle — e la reazione è sempre la stessa: si toglie ciò che non è più valido e lo si
dice, invece di bloccare il cambio.

| cambia | viene tolto |
|---|---|
| razza | la tribù, se era di un'altra razza |
| Via | i talenti in eccesso, se la nuova Via ne dà meno |

La prima è anche una FK composta nel database (`(razza_key, tribu_key)`): il wizard evita
il vicolo cieco, il DB garantisce che non ci si possa arrivare per altre strade.

### I talenti

Un personaggio finisce il wizard con cinque talenti (sei da Viandante), che arrivano da
due strade diverse:

| origine | quanti | come |
|---|---|---|
| razza, tribù, via | 3 | **assegnati** dalle scelte degli step precedenti; non si salvano, sono già deducibili da `razza_key` / `tribu_key` / `via_key` (`talentiAssegnati`) |
| step "Talenti" | 2 o 3 | **scelti** dall'utente fra i 254 `kind = 'scelta'`, e salvati in `personaggio_talenti` |

Quanti se ne scelgono lo decide la Via: due, più quelli concessi dal talento con cui
comincia. Il terzo talento del Viandante non è una regola cablata sul nome della via — è
`talenti.properties.talenti_scelta_extra` su `vd-giusta-scelta`, letto dal DB in
`public.talenti_a_scelta` e, sul client, da `talentiDaScegliere`. Un altro talento che
desse lo stesso bonus non richiederebbe di toccare codice.

La scelta non ha altri vincoli: qualunque combinazione va bene. `scuola`, `disciplina` e
`ramo` sono colonne di `talenti` valorizzate solo per i talenti a scelta, e sono
**etichette, non entità** — nessuna tabella, nessuna FK, nessuna gerarchia da navigare.
Servono a cercare (`TalentiStep` filtra su nome + tutte e tre, senza accenti) e a spezzare
l'elenco in blocchi per disciplina, altrimenti sarebbero 254 card di fila. Lo step resta
uno solo: l'utente non sceglie prima una scuola e poi un talento.

## 3. Il salvataggio — server action + RPC transazionale

`handleSave` manda il draft a `salvaPersonaggio`
(`app/(protected)/onboarding/actions.ts`) dentro una `startTransition`, con `try/catch`
per non smontare il wizard — e perdere tutte le scelte — se la rete cade.

La server action prende `input: unknown` di proposito: è un endpoint pubblico, i tipi TS
non sopravvivono al confine di rete. Delega a `creaPersonaggio`
(`lib/onboarding/personaggi.ts`):

1. `supabase.auth.getClaims()` — sessione valida;
2. `parseDraft` — **solo** coercizione di forma, nessuna regola;
3. `validateDraft` — le stesse regole della UI;
4. `supabase.rpc("crea_personaggio", …)`.

La scrittura tocca due tabelle e PostgREST non fa transazioni multi-statement: il
confine transazionale è la funzione `public.crea_personaggio`
(`supabase/schemas/21_rpc.sql`), che è anche il posto in cui il database decide da sé le
cose di cui il client non è fidato:

- `user_id` da `auth.uid()`;
- la velocità copiata da `tribu.base_speed`;
- i talenti scelti, deduplicati e rifiutati se non sono esattamente quanti ne dà la Via.

## 4. La rete di sicurezza nel DB

`supabase/schemas/20_personaggi.sql` è l'ultimo strato:

- RLS per owner su tutte e quattro le operazioni; su `personaggio_talenti` l'ownership è
  indiretta e passa da `personaggi`;
- la FK composta `(razza_key, tribu_key) → tribu(razza_key, key)`: il DB rifiuta una tribù
  che non appartiene alla razza scelta;
- la FK composta `(talent_key, talent_kind) → talenti(key, kind)` con `talent_kind`
  colonna generata costante `'scelta'`: come nel catalogo, è ciò che impedisce di
  scegliersi un talento di razza o di via;
- il trigger `personaggio_talenti_check_count`: tiene il tetto ai talenti che la Via
  concede — il numero lo chiede a `public.talenti_a_scelta`, non lo conosce. **Non è
  ridondante**: la RLS concede l'insert all'owner, quindi senza trigger un utente
  autenticato potrebbe aggiungersi talenti con una richiesta diretta a PostgREST col
  proprio JWT, scavalcando la server action. Il minimo invece lo garantisce
  `crea_personaggio`, che li inserisce tutti nella stessa transazione;
- `describeError` (`personaggi.ts`) mappa il nome del vincolo — estratto via regex dal
  messaggio PostgREST, l'unico posto in cui compare — in un messaggio leggibile. Se
  l'utente ne vede uno, significa che il catalogo è cambiato sotto i piedi di una pagina
  già prerenderizzata.

## Cosa non c'è

- **Nessuna bozza persistita**: il draft vive solo in memoria del browser, un refresh a
  metà wizard perde tutto. Non c'è nessuno `status` su `personaggi`: tutte le colonne di
  scelta sono `not null`, e questo è ciò che tiene il TypeScript a valle libero da
  null-guard difensivi. Se le bozze serviranno, sono un concetto diverso — non uno stato
  di `personaggi`.
- **Nessuna Caratteristica, PF/Mana, combattimento o carattere**: sono usciti dalla
  creazione — i macro-passi della Via e dei talenti sono un solo step ciascuno. Nel
  catalogo restano `caratteristiche`, `razza_caratteristiche` (con `hp_per_punto` /
  `mana_per_punto` già modellati) e `tendenze`, pronte per le meccaniche che le
  consumeranno. Su `personaggi` l'unico snapshot rimasto è `speed`, copiato da
  `tribu.base_speed`.
- **Nessun livello**: la progressione è già modellata nel catalogo (`sottovie.level`, una
  sottovia per livello), ma non c'è ancora codice che la applichi. Per la stessa ragione,
  dei talenti di via il catalogo contiene solo i tre di livello 0: gli altri (17 del
  Combattente, 14 del Viandante, 13 del Sapiente) esistono nelle schede di gioco ma non
  hanno ancora una sottovia che li porti.
- **Nessun effetto di gioco applicato**: le Caratteristiche del catalogo descrivono cosa
  faranno (danno, probabilità di colpire, movimento, gittata, difese), ma nessuno di quei
  numeri viene ancora calcolato. Il resto aspetta il motore di combattimento.
- **Nessun controllo di auth sulla pagina** `/onboarding`: la protezione è nel proxy
  (`lib/supabase/proxy.ts`, redirect a `/` senza sessione) — coerente col fatto che la
  pagina dev'essere prerenderizzabile. La verifica reale avviene al salvataggio.
- **Nessun `revalidatePath`** dopo la creazione: la lobby è raggiunta con un `<Link>`.
