# Creazione del personaggio

Come funziona l'onboarding, dall'alto verso il basso.

## 0. I sette passi, e perché in quest'ordine

La creazione di un eroe comincia da chi è e finisce da com'è fatto dentro:

| # | step | cosa raccoglie |
|---|---|---|
| 1 | Identità | `name`, `sesso`, `razza_key`, `tribu_key` |
| 2 | La Via | `via_key` |
| 3 | Caratteristiche | i 4 punti da distribuire e su quale Caratteristica cade il +1 della razza |
| 4 | Combattimento | `attacco` e `difesa`, fisici o magici |
| 5 | Talenti | i talenti a scelta |
| 6 | Carattere | allineamento, moralità e i quattro assi di carattere |
| 7 | Riepilogo | niente: mostra i problemi degli altri |

L'ordine non è solo estetico, ci sono due dipendenze vere: le Caratteristiche su cui
può cadere il +1 dipendono dalla **razza**, e quanti talenti si scelgono dipende dalla
**Via** — entrambe chieste prima di chi le usa. Cambiare una scelta a monte invalida
quelle a valle, e se ne occupa `handleChange` (vedi *Coerenza fra campi*).

## 1. Il catalogo — dati statici, letti a build time

`app/(protected)/onboarding/page.tsx` chiama `getCatalog()`
(`lib/onboarding/catalog.ts`), un Server Component async.

- `getCatalog` è marcata `"use cache"` + `cacheLife("max")`: viene risolta a build time
  e congelata nella shell statica, quindi a runtime non parte nessuna query per disegnare
  il wizard.
- Usa un client Supabase anonimo, senza cookie: tutte le tabelle di catalogo hanno RLS
  con policy `for select to anon using (true)`, quindi la lettura non dipende dalla
  request — condizione necessaria perché sia prerenderizzabile.
- Legge **otto** tabelle (`talenti`, `caratteristiche`, `razze`, `razza_caratteristiche`,
  `tribu`, `vie`, `sottovie`, `tendenze`) con le colonne elencate una per una, e le
  ricompone: razza → tribù + Caratteristiche candidate al +1, via → sottovie, ciascuna
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
| spunte dello stepper | `isStepComplete` per ogni step |
| limite di navigazione | `firstIncompleteStep(problems)` |
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
| razza | il +1, se la nuova razza non lo offre su quella Caratteristica |
| Via | i talenti in eccesso, se la nuova Via ne dà meno |

Le prime due sono anche FK composte nel database (`(razza_key, tribu_key)` e
`(razza_key, bonus_caratteristica_key)`): il wizard evita il vicolo cieco, il DB
garantisce che non ci si possa arrivare per altre strade.

### Le Caratteristiche

Sei Caratteristiche Base, **4 punti** da distribuire più **+1** dalla razza, con il tetto
di **3** per Caratteristica alla creazione (bonus incluso).

Il draft tiene solo i punti **distribuiti**: il +1 non ci viene sommato dentro, si vede
sommato a schermo e lo somma la RPC. È la stessa forma che riceve `crea_personaggio`,
quindi il valore finale è calcolato in un posto solo (`valoriCaratteristiche`) e non può
divergere fra UI e database.

Punti Ferita e Mana **derivano interamente dalle Caratteristiche**, con il moltiplicatore
scritto nel catalogo (`caratteristiche.hp_per_punto` / `mana_per_punto`): né la RPC né il
wizard conoscono le chiavi `vigore` ed `empatia_arcana`. Alla tribù resta solo
`base_speed`. Gli altri effetti (Forza → danno fisico, Destrezza → probabilità di colpire
e movimento) vivono ancora nella descrizione della Caratteristica: diventeranno struttura
quando servirà al motore di combattimento.

I due numeri della creazione vivono in due punti che devono restare allineati:
`PUNTI_CARATTERISTICHE` / `CARATTERISTICA_MAX` (`validate.ts`) e i check dentro
`crea_personaggio`. Non sono `check` di tabella perché valgono **alla creazione**:
salendo di livello i valori supereranno 3, e un vincolo di riga lo impedirebbe per sempre.

### Attacco e difesa

Il combattimento è sempre una contrapposizione fra attacco e difesa, e da lì partono
talenti, magie e combo. Ciascuno dei due è fisico (arma o oggetto fisico) o magico (magia
o oggetto magico), e sono **due assi indipendenti**: si può attaccare con l'acciaio e
difendersi con la magia.

Sono l'enum `public.stile` e due colonne di `personaggi`, non righe di catalogo: due
valori chiusi dalle regole, come `sesso`. Le etichette stanno in `STILI`
(`lib/onboarding/types.ts`) — insieme a `SESSI`, sono gli unici testi di gioco che
vivono nel codice invece che in `supabase/seeds`.

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

### Il carattere

Allineamento, moralità e i quattro assi di carattere sono **assi fra due poli**, non
elenchi di opzioni: `TendenzaSlider` li disegna tutti, e l'elenco lo decide
`public.tendenze`. Per questo "neutrale" non esiste come voce — è il centro dell'asse. Se
`min_value = max_value` la tendenza è fissa e lo slider è disabilitato.

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

La scrittura tocca quattro tabelle e PostgREST non fa transazioni multi-statement: il
confine transazionale è la funzione `public.crea_personaggio`
(`supabase/schemas/21_rpc.sql`), che è anche il posto in cui il database decide da sé le
cose di cui il client non è fidato:

- `user_id` da `auth.uid()`;
- i valori finali delle Caratteristiche (punti + bonus), una riga per **ogni**
  Caratteristica di catalogo;
- PF e Mana, calcolati da quei valori con i moltiplicatori del catalogo; la velocità
  copiata da `tribu.base_speed`;
- una riga di `personaggio_tendenze` per **ogni** tendenza di catalogo (i valori mancanti
  cadono sul default, quelli fuori scala vengono riportati dentro i limiti);
- i talenti scelti, deduplicati e rifiutati se non sono esattamente quanti ne dà la Via.

## 4. La rete di sicurezza nel DB

`supabase/schemas/20_personaggi.sql` è l'ultimo strato:

- RLS per owner su tutte e quattro le operazioni; sulle tre tabelle figlie
  (`personaggio_caratteristiche`, `personaggio_tendenze`, `personaggio_talenti`)
  l'ownership è indiretta e passa da `personaggi`;
- la FK composta `(razza_key, tribu_key) → tribu(razza_key, key)`: il DB rifiuta una tribù
  che non appartiene alla razza scelta;
- la FK composta `(razza_key, bonus_caratteristica_key) → razza_caratteristiche`: il +1 può
  cadere solo su una Caratteristica che quella razza offre davvero;
- la FK composta `(talent_key, talent_kind) → talenti(key, kind)` con `talent_kind`
  colonna generata costante `'scelta'`: come nel catalogo, è ciò che impedisce di
  scegliersi un talento di razza o di via;
- il trigger `personaggio_tendenze_check_value`: il limite di una tendenza sta su un'altra
  riga, quindi non è esprimibile con un `check`. **Non è ridondante**: la RLS concede
  `update` all'owner, quindi senza trigger un utente autenticato potrebbe fare una `PATCH`
  diretta a PostgREST col proprio JWT e scavalcare del tutto la server action;
- il trigger `personaggio_talenti_check_count`, per lo stesso motivo: tiene il tetto ai
  talenti che la Via concede — il numero lo chiede a `public.talenti_a_scelta`, non lo
  conosce. Il minimo invece lo garantisce `crea_personaggio`, che li inserisce tutti nella
  stessa transazione;
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
- **Nessun livello**: il personaggio nasce con le Caratteristiche che ha scelto. La
  progressione è già modellata nel catalogo (`sottovie.level`, una sottovia per livello),
  ma non c'è ancora codice che la applichi. Per la stessa ragione, dei talenti di via il
  catalogo contiene solo i tre di livello 0: gli altri (17 del Combattente, 14 del
  Viandante, 13 del Sapiente) esistono nelle schede di gioco ma non hanno ancora una
  sottovia che li porti.
- **Nessuna base fissa di PF e Mana**: derivano solo dalle Caratteristiche, quindi alla
  creazione stanno fra 0 e 6. Se servirà una base — un valore di partenza uguale per
  tutti, o di nuovo per tribù — è una colonna nuova, non un numero da spargere nel codice.
- **Nessun effetto di gioco applicato**: le Caratteristiche descrivono cosa faranno
  (danno, probabilità di colpire, movimento, gittata, difese), ma solo PF e Mana sono
  calcolati. Il resto aspetta il motore di combattimento.
- **Nessun controllo di auth sulla pagina** `/onboarding`: la protezione è nel proxy
  (`lib/supabase/proxy.ts`, redirect a `/` senza sessione) — coerente col fatto che la
  pagina dev'essere prerenderizzabile. La verifica reale avviene al salvataggio.
- **Nessun `revalidatePath`** dopo la creazione: la lobby è raggiunta con un `<Link>`.
