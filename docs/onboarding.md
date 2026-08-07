Ecco come funziona la creazione del personaggio (l'onboarding), dall'alto verso il basso.

1. Il catalogo — dati statici, letti a build time

app/onboarding/page.tsx:14 chiama getCatalog() (lib/onboarding/catalog.ts:34), un Server Component async.

- getCatalog è marcata "use cache" + cacheLife("max"): viene risolta a build time e congelata nella shell statica, quindi a runtime non parte nessuna query per disegnare il wizard.
- Usa un client Supabase anonimo, senza cookie (catalogClient(), riga 17): tutte le tabelle di catalogo hanno RLS con policy for select to anon using (true) (es. supabase/schemas/14_catalog_wizard.sql:14), quindi la lettura non dipende dalla request — condizione necessaria perché sia prerenderizzabile.
- Legge 11 tabelle in parallelo e le ricompone secondo le relazioni: razza → stirpi (+ talento razziale/di stirpe), via → gruppi di discipline → discipline, categoria → opzioni, più traits e disciplineSlotBudget (letto da game_config, chiave discipline_slot_budget).
- Se una query fallisce, select() lancia: un catalogo incompleto farebbe fallire la build invece di rendere un wizard rotto.

Il risultato è un unico oggetto Catalog (lib/onboarding/types.ts:35) passato come prop a <CharacterWizard>.

2. Il wizard client — solo lo stato delle scelte

components/onboarding/character-wizard.tsx è l'unico "use client" rilevante. Riceve il catalogo già risolto e tiene in useState solo WizardState (lib/onboarding/wizard-state.ts:30): nome, le chiavi scelte, traits e discipline_points. Niente viene salvato finché non si preme "Salva".

6 step (WIZARD_STEPS, riga 18): Razza/specie → La Via → Stile di combattimento → Tendenza sociale → Talenti e magie → Riepilogo. Ogni step ha il suo componente in components/onboarding/steps/; gli step 3 e 4 sono generici (CategoriesStep) e si disegnano da wizard_categories.step.

La logica di navigazione e coerenza vive in funzioni pure fuori da React:

- selectRace (riga 68): cambiare razza azzera la stirpe se non appartiene più alla nuova razza — la FK composta (race_key, stirpe_key) non ammette combinazioni miste.
- selectVia (riga 90): cambiare Via restituisce gli slot spesi su discipline non più sbloccate, e lo comunica all'utente.
- changeDisciplinePoints (riga 111): non si sfora il budget in incremento, ma un decremento toglie sempre esattamente quanto chiesto.
- isStepComplete / missingForStep / firstIncompleteStep: abilitano "Avanti", dicono cosa manca, e limitano lo stepper al primo step incompleto (reachableLimit, riga 74).

3. Il salvataggio — server action + rivalidazione integrale

handleSave (riga 105) costruisce il payload con toCharacterInput e chiama saveCharacter (app/onboarding/actions.ts:11) dentro una startTransition, con try/catch per non smontare il wizard (e perdere tutte le scelte) se la rete cade.

La server action prende input: unknown di proposito: è un endpoint pubblico, i tipi TS non sopravvivono al confine di rete. Delega a createCompletedCharacter (lib/onboarding/characters.ts:45), che fa tutto lato server:

1. supabase.auth.getClaims() → user_id dal JWT, mai dal client;
2. rilegge il catalogo (dalla cache);
3. normalizeCharacterInput (rules.ts:235) — verifica la forma a runtime, riempie i trait mancanti col default di catalogo, filtra discipline_points a interi positivi;
4. validateCharacterInput (rules.ts:310) — riapplica le stesse regole della UI: stirpe appartenente alla razza, ogni scelta esistente nella sua categoria, trait 0..100, discipline sbloccate dalla Via, e la regola di prodotto "spendi tutti gli slot";
5. ricalcola le stat con computeStats (base stirpe + per-livello della Via) invece di fidarsi del client;
6. un solo INSERT con status: 'completed', level: 1. Le colonne *_category sono GENERATED e non vengono mai inviate.

Il modulo lib/onboarding/rules.ts non ha direttive: è condiviso fra componenti client e server action — è questo che tiene allineate validazione UI e validazione pre-INSERT.

4. La rete di sicurezza nel DB

supabase/schemas/20_characters.sql è l'ultimo strato:

- RLS per owner su tutte e 4 le operazioni, insert con with check (auth.uid() = user_id);
- FK composta (race_key, stirpe_key) e una FK per ogni scelta singola verso (category_key, key) di wizard_options, con la categoria come colonna generata costante — il DB rifiuta p.es. un allineamento infilato in attack_key;
- il check characters_completed_required: i campi sono obbligatori solo se status = 'completed' (la tabella prevede bozze parziali, anche se il wizard oggi non le usa);
- describeError (characters.ts:141) mappa il nome del vincolo — estratto via regex dal messaggio PostgREST, l'unico posto dove compare — in un messaggio leggibile. Se l'utente ne vede uno, significa che la validazione applicativa ha lasciato passare qualcosa.

Note su cosa non c'è

- Nessuna bozza persistita: lo stato vive solo in memoria del browser; un refresh a metà wizard perde tutto. Lo schema è già pronto per le bozze (status = 'draft', colonne nullable, indice unico commentato alla riga 89), ma non c'è codice che le scriva.
- Nessun controllo di auth sulla pagina /onboarding: la protezione è solo nel proxy (lib/supabase/proxy.ts:50, redirect a / senza sessione) — coerente col fatto che la pagina dev'essere prerenderizzabile. La verifica reale avviene al salvataggio.
- Nessun revalidatePath dopo l'INSERT: la lobby è raggiunta con un <Link> dopo il successo.