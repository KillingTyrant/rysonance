-- ══════════════════════════ CATALOGO DI GIOCO · SEED ═══════════════════════
-- Unica fonte di verità dei CONTENUTI del catalogo (la struttura sta in
-- `supabase/schemas/`). Il file è idempotente: ogni riapplicazione porta le
-- tabelle esattamente a questo stato — upsert di ciò che c'è, delete di ciò
-- che non c'è più.
--
--   locale : npm run db:reset                    (seed applicato in automatico)
--   cloud  : npx supabase db push --include-seed
--
-- ATTENZIONE
--   · Qui dentro possono comparire SOLO le tabelle di catalogo. Mai
--     `personaggi` o altre tabelle utente: in cloud questo file gira su dati
--     reali.
--   · Rimuovere una voce di catalogo già usata da un personaggio fa fallire il
--     DELETE per violazione di foreign key. È il comportamento voluto: è un
--     allarme, non un bug. Se serve ritirare una voce senza romperla, si
--     aggiunge una colonna `is_active` invece di cancellare.
--   · L'app legge il catalogo a build time (`use cache` + cacheLife("max") in
--     lib/onboarding/catalog.ts): dopo un push serve un nuovo deploy perché il
--     cambiamento si veda.
--
-- STRUTTURA
--   §1  i contenuti — l'unica parte da editare
--   §2  apply  (upsert, dalle tabelle padre alle figlie)
--   §3  prune  (delete, dalle figlie alle padri)
--   §4  cleanup
--
-- Il §1 carica tabelle temporanee di staging; §2 e §3 sono meccanici e non
-- vanno toccati quando cambia un contenuto. La separazione serve all'ordine:
-- un talento si può cancellare solo dopo che razze e vie hanno smesso di
-- puntarlo, cioè dopo tutti gli upsert (pensa a un rename di chiave, che è un
-- insert del nuovo valore + un delete del vecchio).
--
-- Tutto sta dentro un unico blocco `do`: il seeder della CLI non garantisce che
-- gli statement di un file girino nella stessa sessione (spezzato in statement
-- separati questo file fallisce, in un punto diverso a ogni run, perché le
-- tabelle temporanee spariscono a metà strada). Un solo statement risolve, e in
-- più rende l'applicazione del catalogo atomica.
--
-- Le tabelle di staging elencano le colonne una per una invece di usare
-- `like public.<tabella>`: `LIKE ... INCLUDING DEFAULTS` copia le colonne
-- generate come colonne normali (l'espressione si copierebbe solo con
-- `INCLUDING GENERATED`), e l'insert successivo fallirebbe con "cannot insert a
-- non-DEFAULT value into column talent_kind". Per lo stesso motivo gli insert
-- del §2 hanno la lista di colonne esplicita invece di `select *`.
--
-- 'TODO' / NULL = dato di gioco ancora da definire.

do $seed$
begin


-- ═══════════════════════════════ §1 CONTENUTI ══════════════════════════════

create temp table _talenti (
  key text, name text, description text not null default '', kind text,
  scuola text, disciplina text, ramo text,
  properties jsonb not null default '{}'::jsonb, sort_order smallint
);

-- ── Assegnati: li porta una scelta del wizard, non li sceglie l'utente. ────
-- Ogni tribù ne porta due: quello della sua razza (condiviso con la tribù
-- sorella) e il proprio. Il legame lo fanno `razze.talent_key`,
-- `tribu.talent_key` e `sottovie.talent_key`; `kind` deve corrispondere a chi
-- lo assegna, altrimenti la FK composta rifiuta la riga.
insert into _talenti (key, name, description, kind, sort_order) values
  -- Di razza — uno per razza, vale per entrambe le sue tribù.
  ('rz-umano-apprendimento',           'Apprendimento',         '+1 punto competenza a ogni livello, da assegnare alle Abilità Tecniche. Imparano più in fretta di ogni altra razza.', 'razza',  1),
  ('rz-nano-sapienza-meccanica',       'Sapienza Meccanica',    'TODO: talento razziale dei Nani.', 'razza',  2),
  ('rz-orco-resistenza-al-fuoco',      'Resistenza al Fuoco',   'TODO: talento razziale degli Orchi.', 'razza',  3),
  ('rz-elfo-sensibilita-magica',       'Sensibilità Magica',    'TODO: talento razziale degli Elfi.', 'razza',  4),
  ('rz-ulu-ari-olfatto-acuto',         'Olfatto Acuto',         'TODO: talento razziale degli Ulu-Ari.', 'razza',  5),
  ('rz-gata-ari-visione-notturna',     'Visione Notturna',      'TODO: talento razziale dei Gata-Ari.', 'razza',  6),

  -- Di tribù — uno per tribù, nell'ordine delle razze qui sopra.
  ('rz-umano-incoraggiamento',         'Incoraggiamento',       'Umani imperiali di città, di educazione cavalleresca. Prima dello scontro rialzano il morale degli alleati contro la paura.', 'tribu',  7),
  ('rz-umano-tempra',                  'Tempra',                'TODO: talento della tribù Kodron.', 'tribu',  8),
  ('rz-nano-stoicismo',                'Stoicismo',             'TODO: talento della tribù Nandrein.', 'tribu',  9),
  ('rz-nano-dimensioni-ridotte',       'Dimensioni Ridotte',    'TODO: talento della tribù Turuf.', 'tribu', 10),
  ('rz-orco-furia',                    'Furia',                 'TODO: talento della tribù Ruul.', 'tribu', 11),
  ('rz-orco-euforia',                  'Euforia',               'TODO: talento della tribù Dramput.', 'tribu', 12),
  ('rz-elfo-sovraccarico',             'Sovraccarico',          'TODO: talento della tribù Elehil.', 'tribu', 13),
  ('rz-elfo-adattamento',              'Adattamento',           'TODO: talento della tribù Selvas.', 'tribu', 14),
  ('rz-ulu-ari-zelo',                  'Zelo',                  'TODO: talento della tribù Lurven.', 'tribu', 15),
  ('rz-ulu-ari-capo-branco',           'Capo Branco',           'TODO: talento della tribù Shakul.', 'tribu', 16),
  ('rz-gata-ari-predatore-silenzioso', 'Predatore Silenzioso',  'TODO: talento della tribù Oncalynx.', 'tribu', 17),
  ('rz-gata-ari-furia-felina',         'Furia Felina',          'TODO: talento della tribù Kajan.', 'tribu', 18),

  -- Di via — quello della sottovia di livello 0, con cui la via comincia.
  ('cb-tecnicista',                    'Tecnicista',            'TODO: descrizione del talento Tecnicista.', 'via', 19),
  ('sp-concentrazione-arcana',         'Concentrazione arcana', 'TODO: primo talento della Via del Sapiente.', 'via', 20),
  ('vd-giusta-scelta',                 'Giusta scelta',         'TODO: primo talento della Via del Viandante.', 'via', 21);

-- ── A scelta: l'utente ne prende due, senza vincoli. ──────────────────────
-- `scuola` e `disciplina` sono le stesse per tutto il blocco, quindi stanno nel
-- select invece che su ogni riga: sbagliarle su una riga sola diventa
-- impossibile. Sono ETICHETTE per raggruppare e cercare fra 254 opzioni, non
-- una gerarchia da navigare — lo step del wizard è uno solo, e nessuna delle tre
-- vincola la scelta. `sort_order` è globale e continua quello degli assegnati:
-- è l'ordine in cui compaiono nella lista.

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia elementale', 'magia del fuoco', ramo, sort_order
from (values
  ('ff-infusione-di-fuoco',           'Infusione di fuoco',             'incarnazione',          22),
  ('ff-soffio-infuocato',             'Soffio infuocato',               'precisione esplosiva',  23),
  ('ff-tocco-rovente',                'Tocco rovente',                  'incarnazione',          24),
  ('ff-arma-incandescente',           'Arma incandescente',             'incarnazione',          25),
  ('ff-fiammata',                     'Fiammata',                       'precisione esplosiva',  26),
  ('ff-vampata',                      'Vampata',                        'controllo indomito',    27),
  ('ff-colpo-ossidrico',              'Colpo ossidrico',                'incarnazione',          28),
  ('ff-infusione-continua',           'Infusione continua',             'incarnazione',          29),
  ('ff-sputafiamme',                  'Sputafiamme',                    'precisione esplosiva',  30),
  ('ff-incremento-della-temperatura', 'Incremento della temperatura',   'controllo indomito',    31),
  ('ff-incendio',                     'Incendio',                       'controllo indomito',    32),
  ('ff-lama-di-fuoco',                'Lama di fuoco',                  'incarnazione',          33),
  ('ff-scudo-di-fuoco',               'Scudo di fuoco',                 'incarnazione',          34),
  ('ff-scudo-di-fuoco-esplosione',    'Scudo di fuoco (esplosione)',    'incarnazione',          35),
  ('ff-dardo-di-fuoco',               'Dardo di fuoco',                 'precisione esplosiva',  36),
  ('ff-anelli-infuocati',             'Anelli infuocati',               'precisione esplosiva',  37),
  ('ff-esplosione-a-catena',          'Esplosione a catena',            'controllo indomito',    38),
  ('ff-area-infernale',               'Area infernale',                 'controllo indomito',    39),
  ('ff-controllo-delle-fiamme',       'Controllo delle fiamme',         'controllo indomito',    40),
  ('ff-armatura-di-fuoco',            'Armatura di fuoco',              'incarnazione',          41),
  ('ff-armatura-di-fuoco-esplosione', 'Armatura di fuoco (esplosione)', 'incarnazione',          42),
  ('ff-meteora',                      'Meteora',                        'precisione esplosiva',  43),
  ('ff-trappola-infinita',            'Trappola infinita',              'controllo indomito',    44),
  ('ff-volonta-delle-fiamme',         'Volontà delle fiamme',           'controllo indomito',    45)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia elementale', 'magia della terra', ramo, sort_order
from (values
  ('te-asperita-improvvisa',          'Asperità improvvisa',          'deformazione',          46),
  ('te-rancore-della-terra',          'Rancore della terra',          'tensione della terra',  47),
  ('te-pugno-tellurico',              'Pugno tellurico',              'oppressione',           48),
  ('te-colonna-rocciosa',             'Colonna rocciosa',             'deformazione',          49),
  ('te-fossa',                        'Fossa',                        'deformazione',          50),
  ('te-stalagmite',                   'Stalagmite',                   'tensione della terra',  51),
  ('te-magnetismo',                   'Magnetismo',                   'oppressione',           52),
  ('te-pugni-di-roccia',              'Pugni di roccia',              'oppressione',           53),
  ('te-cupola-rocciosa',              'Cupola rocciosa',              'deformazione',          54),
  ('te-frustrazione-della-terra',     'Frustrazione della terra',     'tensione della terra',  55),
  ('te-corpo-granulare',              'Corpo granulare',              'oppressione',           56),
  ('te-estrusione',                   'Estrusione',                   'deformazione',          57),
  ('te-frattura-famelica',            'Frattura famelica',            'deformazione',          58),
  ('te-ira-della-terra',              'Ira della terra',              'tensione della terra',  59),
  ('te-pugno-gravitazionale',         'Pugno gravitazionale',         'oppressione',           60),
  ('te-corpo-instabile',              'Corpo instabile',              'oppressione',           61),
  ('te-terraforming',                 'Terraforming',                 'deformazione',          62),
  ('te-voragine-del-divoratore',      'Voragine del divoratore',      'deformazione',          63),
  ('te-centro-di-gravita-permanente', 'Centro di gravità permanente', 'oppressione',           64),
  ('te-incarnazione-golem',           'Incarnazione di golem',        'oppressione',           65)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia elementale', 'magia dell''elettricità', ramo, sort_order
from (values
  ('el-elemento-delle-cariche', 'Elemento delle cariche', 'polarizzazione',         66),
  ('el-corpo-scintillante',     'Corpo scintillante',     'polarizzazione',         67),
  ('el-scossa',                 'Scossa',                 'corto circuito',         68),
  ('el-scarica',                'Scarica',                'trasmissione violenta',  69),
  ('el-campo-elettrico',        'Campo elettrico',        'polarizzazione',         70),
  ('el-cortocircuito',          'Cortocircuito',          'corto circuito',         71),
  ('el-propagazione',           'Propagazione',           'trasmissione violenta',  72),
  ('el-risonanza-dinamica',     'Risonanza dinamica',     'polarizzazione',         73),
  ('el-corpo-elementale',       'Corpo elementale',       'polarizzazione',         74),
  ('el-flash',                  'Flash',                  'corto circuito',         75),
  ('el-legame-al-plasma',       'Legame al plasma',       'trasmissione violenta',  76),
  ('el-saturazione',            'Saturazione',            'trasmissione violenta',  77),
  ('el-velocita-del-fulmine',   'Velocità del fulmine',   'polarizzazione',         78),
  ('el-blackout',               'Blackout',               'corto circuito',         79),
  ('el-folgore',                'Folgore',                'trasmissione violenta',  80)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia elementale', 'magia dell''acqua', ramo, sort_order
from (values
  ('ac-produrre-acqua',         'Produrre acqua',         'accumulo',                81),
  ('ac-onda',                   'Onda',                   'inondazione',             82),
  ('ac-scudo-dacqua',           'Scudo d''acqua',         'fonte della protezione',  83),
  ('ac-generazione-a-distanza', 'Generazione a distanza', 'accumulo',                84),
  ('ac-controcorrente',         'Controcorrente',         'inondazione',             85),
  ('ac-immersione',             'Immersione',             'fonte della protezione',  86),
  ('ac-ritenzione-idrica',      'Ritenzione idrica',      'accumulo',                87),
  ('ac-scisma',                 'Scisma',                 'inondazione',             88),
  ('ac-corpo-fluido',           'Corpo fluido',           'fonte della protezione',  89),
  ('ac-attacco-dagli-abissi',   'Attacco dagli abissi',   'fonte della protezione',  90),
  ('ac-radice-delle-acque',     'Radice delle acque',     'accumulo',                91),
  ('ac-laguna',                 'Laguna',                 'accumulo',                92),
  ('ac-tsunami',                'Tsunami',                'inondazione',             93),
  ('ac-tempesta',               'Tempesta',               'inondazione',             94),
  ('ac-cambio-fluido',          'Cambio fluido',          'fonte della protezione',  95),
  ('ac-risalita-abissale',      'Risalita abissale',      'fonte della protezione',  96),
  ('ac-giudizio-del-messia',    'Giudizio del messia',    'accumulo',                97),
  ('ac-soffio-del-leviatano',   'Soffio del leviatano',   'inondazione',             98),
  ('ac-diluvio-universale',     'Diluvio universale',     'inondazione',             99),
  ('ac-sacramento-acquatico',   'Sacramento acquatico',   'fonte della protezione', 100)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia elementale', 'magia dell''aria', ramo, sort_order
from (values
  ('ar-passo-del-vento',        'Passo del vento',          'spostamento',          101),
  ('ar-flusso-daria',           'Flusso d''aria',           'contatto impossibile', 102),
  ('ar-sollevamento',           'Sollevamento',             'rimozione',            103),
  ('ar-potenziamento-del-tiro', 'Potenziamento del tiro',   'spostamento',          104),
  ('ar-come-laria',             'Come l''aria',             'spostamento',          105),
  ('ar-turbolenza',             'Turbolenza',               'contatto impossibile', 106),
  ('ar-attrito-daria',          'Attrito d''aria',          'rimozione',            107),
  ('ar-strappo-da-terra',       'Strappo da terra',         'rimozione',            108),
  ('ar-visione-preparatoria',   'Visione preparatoria',     'contatto impossibile', 109),
  ('ar-velocita-di-dedalo',     'Velocità di dedalo',       'spostamento',          110),
  ('ar-caduta-dal-cielo',       'Caduta dal cielo',         'rimozione',            111),
  ('ar-vento-di-ritorno',       'Vento di ritorno',         'contatto impossibile', 112),
  ('ar-mulino-a-vento',         'Mulino a vento',           'rimozione',            113),
  ('ar-spezza-carica',          'Spezza carica',            'contatto impossibile', 114),
  ('ar-taglio-del-drago',       'Taglio del drago',         'rimozione',            115),
  ('ar-spostamondi',            'Spostamondi',              'spostamento',          116),
  ('ar-dedalo-drago-dellaria',  'Dedalo, drago dell''aria', 'rimozione',            117),
  ('ar-scirocco',               'Scirocco',                 'contatto impossibile', 118),
  ('ar-bora',                   'Bora',                     'rimozione',            119),
  ('ar-vuoto',                  'Vuoto',                    'rimozione',            120)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia ancestrale', 'magia druidica', ramo, sort_order
from (values
  ('dr-patto-con-la-natura',     'Patto con la natura',     'rituale ancestrale',     121),
  ('dr-ristorazione-vegetale',   'Ristorazione vegetale',   'armonia vegetale',       122),
  ('dr-corteccia-cutanea',       'Corteccia cutanea',       'armonia vegetale',       123),
  ('dr-linguaggio-animale',      'Linguaggio animale',      'simbiosi',               124),
  ('dr-spirito-guida',           'Spirito guida',           'spiritualità selvaggia', 125),
  ('dr-fame-del-sottobosco',     'Fame del sottobosco',     'armonia vegetale',       126),
  ('dr-passaggio-arboreo',       'Passaggio arboreo',       'armonia vegetale',       127),
  ('dr-amico-fedele',            'Amico fedele',            'simbiosi',               128),
  ('dr-metamorfosi-selvaggia',   'Metamorfosi selvaggia',   'spiritualità selvaggia', 129),
  ('dr-cuore-del-sottobosco',    'Cuore del sottobosco',    'armonia vegetale',       130),
  ('dr-nido-per-prede',          'Nido per prede',          'armonia vegetale',       131),
  ('dr-maledizione-vendicativa', 'Maledizione vendicativa', 'simbiosi',               132),
  ('dr-ritorno-alla-natura',     'Ritorno alla natura',     'simbiosi',               133),
  ('dr-totem-spirituale',        'Totem spirituale',        'spiritualità selvaggia', 134),
  ('dr-cometa-astrale',          'Cometa astrale',          'spiritualità selvaggia', 135),
  ('dr-protettore-della-flora',  'Protettore della flora',  'armonia vegetale',       136),
  ('dr-espiazione-dei-peccati',  'Espiazione dei peccati',  'simbiosi',               137),
  ('dr-protettore-selvaggio',    'Protettore selvaggio',    'spiritualità selvaggia', 138)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia ancestrale', 'magia di evocazione', ramo, sort_order
from (values
  ('ev-sigillo-di-evocazione',         'Sigillo di evocazione',          'materializzazione',       139),
  ('ev-stivali-del-ragno',             'Stivali del ragno',              'richiamo dall''universo', 140),
  ('ev-evocazione-di-fierdestriero',   'Evocazione di fierdestriero',    'evocazione delle entità', 141),
  ('ev-moltiplicazione-dei-sigilli',   'Moltiplicazione dei sigilli',    'materializzazione',       142),
  ('ev-doppietta',                     'Doppietta',                      'materializzazione',       143),
  ('ev-orecchie-di-granpipistrello',   'Orecchie di granpipistrello',    'richiamo dall''universo', 144),
  ('ev-guanti-di-mastroindomito',      'Guanti di mastroindomito',       'richiamo dall''universo', 145),
  ('ev-farfalla-bianca-di-efes',       'Farfalla bianca di efes',        'evocazione delle entità', 146),
  ('ev-evocazione-di-urloscimmia',     'Evocazione di urloscimmia',      'evocazione delle entità', 147),
  ('ev-posizionamento-dei-sigilli',    'Posizionamento dei sigilli',     'materializzazione',       148),
  ('ev-evocazione-senziente',          'Evocazione senziente',           'materializzazione',       149),
  ('ev-manto-di-giada',                'Manto di giada',                 'richiamo dall''universo', 150),
  ('ev-evocazione-della-spugnomagica', 'Evocazione della spugnomagica',  'evocazione delle entità', 151),
  ('ev-evocazione-multipla',           'Evocazione multipla',            'materializzazione',       152),
  ('ev-eco-lontano',                   'Eco lontano',                    'richiamo dall''universo', 153),
  ('ev-coda-di-fenice',                'Coda di fenice',                 'richiamo dall''universo', 154),
  ('ev-sentinella-scintillante',       'Sentinella scintillante',        'evocazione delle entità', 155),
  ('ev-entita-paradossale',            'Entità paradossale',             'evocazione delle entità', 156),
  ('ev-sigillo-del-movimento-irreale', 'Sigillo del movimento irreale',  'materializzazione',       157),
  ('ev-ali-di-barbadrago',             'Ali di barbadrago',              'richiamo dall''universo', 158),
  ('ev-evocazione-di-alkyria',         'Evocazione di Alkyria',          'evocazione delle entità', 159),
  ('ev-evoca-gork',                    'Evoca gork, giullare dei morti', 'evocazione delle entità', 160)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia bianca', 'magia di cura', ramo, sort_order
from (values
  ('cu-luce-del-pellegrino',      'Luce del pellegrino',      'luce divina',               161),
  ('cu-mano-curatrice',           'Mano curatrice',           'protezione della luce',     162),
  ('cu-legame-bianco',            'Legame bianco',            'benedizione della purezza', 163),
  ('cu-manto-crepuscolare',       'Manto crepuscolare',       'luce divina',               164),
  ('cu-zona-di-luce',             'Zona di luce',             'luce divina',               165),
  ('cu-ebollizione-della-cura',   'Ebollizione della cura',   'protezione della luce',     166),
  ('cu-patto-di-luce',            'Patto di luce',            'benedizione della purezza', 167),
  ('cu-glifo-della-purezza',      'Glifo della purezza',      'benedizione della purezza', 168),
  ('cu-linea-guida',              'Linea guida',              'luce divina',               169),
  ('cu-protezione-dalla-perdita', 'Protezione dalla perdita', 'protezione della luce',     170),
  ('cu-nova-sacra',               'Nova sacra',               'benedizione della purezza', 171),
  ('cu-globo-luminoso',           'Globo luminoso',           'benedizione della purezza', 172),
  ('cu-luogo-sacro',              'Luogo sacro',              'luce divina',               173),
  ('cu-tempra-del-guerriero',     'Tempra del guerriero',     'protezione della luce',     174),
  ('cu-sospensione-del-giudizio', 'Sospensione del giudizio', 'benedizione della purezza', 175),
  ('cu-cura-precisa',             'Cura precisa',             'benedizione della purezza', 176),
  ('cu-messaggero-divino',        'Messaggero divino',        'luce divina',               177),
  ('cu-ricrescita',               'Ricrescita',               'protezione della luce',     178),
  ('cu-quiete',                   'Quiete',                   'benedizione della purezza', 179),
  ('cu-legame-immortale',         'Legame immortale',         'benedizione della purezza', 180)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'magia bianca', 'magia di illusione', ramo, sort_order
from (values
  ('il-voce-nella-nebbia',      'Voce nella nebbia',       'distorsione percettiva',  181),
  ('il-dubbio',                 'Dubbio',                  'manipolazione cognitiva', 182),
  ('il-sfarfallio',             'Sfarfallio',              'frattura della realtà',   183),
  ('il-tocco-della-megera',     'Tocco della megera',      'distorsione percettiva',  184),
  ('il-dimenticanza',           'Dimenticanza',            'manipolazione cognitiva', 185),
  ('il-immagine-residua',       'Immagine residua',        'frattura della realtà',   186),
  ('il-visione-dell-aldila',    'Visione dell''aldilà',    'distorsione percettiva',  187),
  ('il-ansia-anticipatoria',    'Ansia anticipatoria',     'manipolazione cognitiva', 188),
  ('il-moltitudine',            'Moltitudine',             'frattura della realtà',   189),
  ('il-ladro-dei-sensi',        'Ladro dei sensi',         'distorsione percettiva',  190),
  ('il-paranoia',               'Paranoia',                'manipolazione cognitiva', 191),
  ('il-falsa-realta',           'Falsa realtà',            'frattura della realtà',   192),
  ('il-teatro-invisibile',      'Teatro invisibile',       'distorsione percettiva',  193),
  ('il-collasso-dell-identita', 'Collasso dell''identità', 'manipolazione cognitiva', 194),
  ('il-dandandan',              'Dandandan',               'frattura della realtà',   195)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'armi da mischia', 'armi a una mano', ramo, sort_order
from (values
  ('1m-cambio-di-posa',           'Cambio di posa',            'istinto del duellante',       196),
  ('1m-posa-difensiva',           'Posa difensiva',            'istinto del duellante',       197),
  ('1m-posa-offensiva',           'Posa offensiva',            'istinto del duellante',       198),
  ('1m-tempo-al-tempo',           'Tempo al tempo',            'silenzio dell''opportunista', 199),
  ('1m-presenza-minacciosa',      'Presenza minacciosa',       'valore del protettore',       200),
  ('1m-anatomia-del-duello',      'Anatomia del duello',       'istinto del duellante',       201),
  ('1m-colpo-improvviso',         'Colpo improvviso',          'silenzio dell''opportunista', 202),
  ('1m-guardalinea',              'Guardalinea',               'valore del protettore',       203),
  ('1m-protezione-valorosa',      'Protezione valorosa',       'valore del protettore',       204),
  ('1m-analisi-concreta',         'Analisi concreta',          'istinto del duellante',       205),
  ('1m-tempismo-perfetto',        'Tempismo perfetto',         'istinto del duellante',       206),
  ('1m-colpo-annunciato',         'Colpo annunciato',          'silenzio dell''opportunista', 207),
  ('1m-colpo-basso',              'Colpo basso',               'silenzio dell''opportunista', 208),
  ('1m-linea-infrangibile',       'Linea infrangibile',        'valore del protettore',       209),
  ('1m-colpo-punitivo',           'Colpo punitivo',            'valore del protettore',       210),
  ('1m-sacrificio',               'Sacrificio',                'valore del protettore',       211),
  ('1m-doppio-sguardo',           'Doppio sguardo',            'istinto del duellante',       212),
  ('1m-scelta-coraggiosa',        'Scelta coraggiosa',         'istinto del duellante',       213),
  ('1m-messa-in-riga',            'Messa in riga',             'istinto del duellante',       214),
  ('1m-valzer-della-battaglia',   'Valzer della battaglia',    'istinto del duellante',       215),
  ('1m-maestro-dell-amputazione', 'Maestro dell''amputazione', 'silenzio dell''opportunista', 216),
  ('1m-infierire',                'Infierire',                 'silenzio dell''opportunista', 217),
  ('1m-toccata-e-fuga',           'Toccata e fuga',            'silenzio dell''opportunista', 218),
  ('1m-fuori-dallo-sguardo',      'Fuori dallo sguardo',       'silenzio dell''opportunista', 219),
  ('1m-danza-della-battaglia',    'Danza della battaglia',     'istinto del duellante',       220),
  ('1m-ruba-morte',               'Ruba morte',                'silenzio dell''opportunista', 221)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'armi da mischia', 'armi a due mani', ramo, sort_order
from (values
  ('2m-attacco-violento',          'Attacco violento',          'mietitore di folle',      222),
  ('2m-carica',                    'Carica',                    'boia dei re',             223),
  ('2m-rinuncia-di-onnipotenza',   'Rinuncia di onnipotenza',   'giuramento del bastione', 224),
  ('2m-falciata',                  'Falciata',                  'mietitore di folle',      225),
  ('2m-potenza-lineare',           'Potenza lineare',           'mietitore di folle',      226),
  ('2m-esecuzione-formale',        'Esecuzione formale',        'boia dei re',             227),
  ('2m-deviazione-di-roccaforte',  'Deviazione di roccaforte',  'giuramento del bastione', 228),
  ('2m-passo-di-monterovina',      'Passo di monterovina',      'giuramento del bastione', 229),
  ('2m-lodare-il-sole',            'Lodare il sole',            'mietitore di folle',      230),
  ('2m-tecnica-della-rimozione',   'Tecnica della rimozione',   'mietitore di folle',      231),
  ('2m-momento-di-tensione',       'Momento di tensione',       'boia dei re',             232),
  ('2m-sequenza-di-ageria',        'Sequenza di ageria',        'giuramento del bastione', 233),
  ('2m-punizione-di-falcorovente', 'Punizione di falcorovente', 'giuramento del bastione', 234),
  ('2m-sole-rovente',              'Sole rovente',              'mietitore di folle',      235),
  ('2m-propagazione-solare',       'Propagazione solare',       'mietitore di folle',      236),
  ('2m-riflesso-del-mietitore',    'Riflesso del mietitore',    'mietitore di folle',      237),
  ('2m-virata-imprevedibile',      'Virata imprevedibile',      'boia dei re',             238),
  ('2m-compasso-violento',         'Compasso violento',         'giuramento del bastione', 239),
  ('2m-riverbero-di-falcorovente', 'Riverbero di falcorovente', 'giuramento del bastione', 240),
  ('2m-eclisse',                   'Eclisse',                   'mietitore di folle',      241),
  ('2m-raggio-catodico',           'Raggio catodico',           'mietitore di folle',      242),
  ('2m-magnitudo-nove',            'Magnitudo nove',            'mietitore di folle',      243),
  ('2m-detronizzare',              'Detronizzare',              'boia dei re',             244),
  ('2m-meridiana-di-roccaforte',   'Meridiana di roccaforte',   'giuramento del bastione', 245),
  ('2m-bastione-di-falcorovente',  'Bastione di falcorovente',  'giuramento del bastione', 246)
) as t (key, name, ramo, sort_order);

insert into _talenti (key, name, kind, scuola, disciplina, ramo, sort_order)
select key, name, 'scelta', 'armi a distanza', 'arco e frecce', ramo, sort_order
from (values
  ('af-preda-facile',            'Preda facile',            'cacciatore primordiale', 247),
  ('af-geniere-delle-lande',     'Geniere delle lande',     'segugio delle lande',    248),
  ('af-tiro-libero',             'Tiro libero',             'occhio di oltrelimite',  249),
  ('af-scoccata-rapida',         'Scoccata rapida',         'cacciatore primordiale', 250),
  ('af-frecciatrappola',         'Frecciatrappola',         'segugio delle lande',    251),
  ('af-frecciabomba',            'Frecciabomba',            'segugio delle lande',    252),
  ('af-frecciascossa',           'Frecciascossa',           'segugio delle lande',    253),
  ('af-margine-di-tiro',         'Margine di tiro',         'occhio di oltrelimite',  254),
  ('af-guardare-oltre',          'Guardare oltre',          'occhio di oltrelimite',  255),
  ('af-riflesso-del-cacciatore', 'Riflesso del cacciatore', 'cacciatore primordiale', 256),
  ('af-bersaglio-marcato',       'Bersaglio marcato',       'cacciatore primordiale', 257),
  ('af-campo-minato',            'Campo minato',            'segugio delle lande',    258),
  ('af-frecciamagica',           'Frecciamagica',           'segugio delle lande',    259),
  ('af-colpo-assicurato',        'Colpo assicurato',        'occhio di oltrelimite',  260),
  ('af-colpo-impossibile',       'Colpo impossibile',       'occhio di oltrelimite',  261),
  ('af-fiuto-del-cacciatore',    'Fiuto del cacciatore',    'cacciatore primordiale', 262),
  ('af-abbattimento',            'Abbattimento',            'cacciatore primordiale', 263),
  ('af-caccia-di-gruppo',        'Caccia di gruppo',        'segugio delle lande',    264),
  ('af-ricochet',                'Ricochet',                'segugio delle lande',    265),
  ('af-ostinazione',             'Ostinazione',             'occhio di oltrelimite',  266),
  ('af-parallelismo',            'Parallelismo',            'occhio di oltrelimite',  267),
  ('af-colpo-perforante',        'Colpo perforante',        'occhio di oltrelimite',  268),
  ('af-sequenza-perfetta',       'Sequenza perfetta',       'occhio di oltrelimite',  269),
  ('af-trofeo-di-caccia',        'Trofeo di caccia',        'cacciatore primordiale', 270),
  ('af-bottino-selvaggio',       'Bottino selvaggio',       'segugio delle lande',    271),
  ('af-freccempesta',            'Freccempesta',            'segugio delle lande',    272),
  ('af-faretra-del-protettore',  'Faretra del protettore',  'segugio delle lande',    273),
  ('af-controllo-del-respiro',   'Controllo del respiro',   'occhio di oltrelimite',  274),
  ('af-freccia-di-oltrelimite',  'Freccia di oltrelimite',  'occhio di oltrelimite',  275)
) as t (key, name, ramo, sort_order);

-- L'unica proprietà di gioco già letta dal codice: quanti talenti a scelta IN
-- PIÙ concede il talento. Sta su una riga a parte invece che in una colonna di
-- tutte e 275 le righe perché è l'eccezione, non la regola.
update _talenti set properties = '{"talenti_scelta_extra": 1}'::jsonb
where key = 'vd-giusta-scelta';


-- Le sei Caratteristiche Base. `hp_per_punto` e `mana_per_punto` sono gli unici
-- effetti già modellati: sono quelli che decidono PF e Mana di partenza, e
-- averli qui evita che la RPC e il wizard debbano conoscere le chiavi 'vigore'
-- ed 'empatia_arcana'. Gli altri effetti vivono ancora nella descrizione.
create temp table _caratteristiche (
  key text, name text, description text,
  hp_per_punto smallint, mana_per_punto smallint, sort_order smallint
);
insert into _caratteristiche (key, name, description, hp_per_punto, mana_per_punto, sort_order) values
  ('forza',          'Forza',          'La Forza rappresenta la potenza fisica del personaggio. Ogni punto di Forza aumenta il danno inflitto dagli attacchi fisici.', 0, 0, 1),
  ('intelletto',     'Intelletto',     'L''Intelletto rappresenta la conoscenza e la padronanza delle arti magiche e la loro trama. Ogni punto di Intelletto aumenta il danno inflitto dagli attacchi magici.', 0, 0, 2),
  ('destrezza',      'Destrezza',      'La Destrezza rappresenta coordinazione, precisione e controllo del corpo. Ogni punto di Destrezza aumenta la probabilità di colpire con gli attacchi fisici. Inoltre, ogni 3 punti di Destrezza si ottiene 1 cella di movimento aggiuntiva.', 0, 0, 3),
  ('concentrazione', 'Concentrazione', 'La Concentrazione rappresenta la capacità di mantenere il controllo della propria energia e della mira. Ogni punto di Concentrazione aumenta la probabilità di colpire con gli attacchi magici. Inoltre, ogni 3 punti di Concentrazione si ottiene 1 cella di gittata aggiuntiva per magie e attacchi a distanza.', 0, 0, 4),
  ('vigore',         'Vigore',         'Il Vigore rappresenta la resistenza fisica del personaggio. Ogni punto di Vigore aumenta i Punti Ferita massimi di 2 e la Difesa Fisica.', 2, 0, 5),
  ('empatia_arcana', 'Empatia Arcana', 'L''Empatia Arcana rappresenta l''affinità del personaggio con la trama magica. Ogni punto di Empatia Arcana aumenta il Mana massimo di 2, il Mana recuperato a ogni turno di 1 e la Difesa Magica.', 0, 2, 6);

create temp table _razze (
  key text, name text, description text, talent_key text, sort_order smallint
);
insert into _razze (key, name, description, talent_key, sort_order) values
  ('umani',    'Umani',    '', 'rz-umano-apprendimento',       1),
  ('nani',     'Nani',     '', 'rz-nano-sapienza-meccanica',   2),
  ('orchi',    'Orchi',    '', 'rz-orco-resistenza-al-fuoco',  3),
  ('elfi',     'Elfi',     '', 'rz-elfo-sensibilita-magica',   4),
  ('ulu_ari',  'Ulu-Ari',  '', 'rz-ulu-ari-olfatto-acuto',     5),
  ('gata_ari', 'Gata-Ari', '', 'rz-gata-ari-visione-notturna', 6);

-- ⚠️  SEGNAPOSTO: le Caratteristiche su cui ogni razza può dare il suo +1 sono
-- provvisorie, scelte per coerenza col talento razziale. Vanno sostituite con
-- le terne vere prima di andare in cloud — è l'unico dato di questo file che
-- non arriva dalle schede di gioco.
-- Il giocatore ne sceglie UNA fra quelle della sua razza; la FK composta di
-- `personaggi` rifiuta qualunque altra.
create temp table _razza_caratteristiche (
  razza_key text, caratteristica_key text, sort_order smallint
);
insert into _razza_caratteristiche (razza_key, caratteristica_key, sort_order) values
  ('umani',    'forza',          1),
  ('umani',    'intelletto',     2),
  ('umani',    'destrezza',      3),
  ('nani',     'vigore',         1),
  ('nani',     'forza',          2),
  ('nani',     'intelletto',     3),
  ('orchi',    'forza',          1),
  ('orchi',    'vigore',         2),
  ('orchi',    'destrezza',      3),
  ('elfi',     'intelletto',     1),
  ('elfi',     'empatia_arcana', 2),
  ('elfi',     'concentrazione', 3),
  ('ulu_ari',  'destrezza',      1),
  ('ulu_ari',  'forza',          2),
  ('ulu_ari',  'concentrazione', 3),
  ('gata_ari', 'destrezza',      1),
  ('gata_ari', 'concentrazione', 2),
  ('gata_ari', 'vigore',         3);

-- Punti Ferita e Mana non sono più qui: derivano dalle Caratteristiche (Vigore
-- ed Empatia Arcana). Alla tribù resta la velocità base, copiata su
-- `personaggi` da public.crea_personaggio; con base_speed NULL il riepilogo
-- mostra "—".
-- `sort_order` è progressivo dentro la razza: il catalogo ordina globalmente e
-- poi raggruppa per razza, quindi l'ordine relativo delle due è preservato.
create temp table _tribu (
  key text, razza_key text, name text, description text, talent_key text,
  base_speed smallint, sort_order smallint
);
insert into _tribu (key, razza_key, name, description, talent_key, base_speed, sort_order) values
  ('eruscal',  'umani',    'Eruscal',  '', 'rz-umano-incoraggiamento',         2, 1),
  ('kodron',   'umani',    'Kodron',   '', 'rz-umano-tempra',                  2, 2),
  ('nandrein', 'nani',     'Nandrein', '', 'rz-nano-stoicismo',                1, 1),
  ('turuf',    'nani',     'Turuf',    '', 'rz-nano-dimensioni-ridotte',       4, 2),
  ('ruul',     'orchi',    'Ruul',     '', 'rz-orco-furia',                    2, 1),
  ('dramput',  'orchi',    'Dramput',  '', 'rz-orco-euforia',                  2, 2),
  ('elehil',   'elfi',     'Elehil',   '', 'rz-elfo-sovraccarico',             2, 1),
  ('selvas',   'elfi',     'Selvas',   '', 'rz-elfo-adattamento',              3, 2),
  ('lurven',   'ulu_ari',  'Lurven',   '', 'rz-ulu-ari-zelo',                  2, 1),
  ('shakul',   'ulu_ari',  'Shakul',   '', 'rz-ulu-ari-capo-branco',           2, 2),
  ('oncalynx', 'gata_ari', 'Oncalynx', '', 'rz-gata-ari-predatore-silenzioso', 4, 1),
  ('kajan',    'gata_ari', 'Kajan',    '', 'rz-gata-ari-furia-felina',         3, 2);

-- Le descrizioni elencavano i gruppi di discipline, che non esistono più: da
-- riscrivere quando le vie hanno una descrizione vera.
create temp table _vie (
  key text, name text, description text, sort_order smallint
);
insert into _vie (key, name, description, sort_order) values
  ('combattente', 'La via del Combattente', 'TODO: descrizione della Via del Combattente.', 1),
  ('sapiente',    'La via del Sapiente',    'TODO: descrizione della Via del Sapiente.',    2),
  ('viandante',   'La via del Viandante',   'Usa tutti i talenti in modo libero · Consigliato a giocatori esperti', 3);

-- Livello 0 = onboarding: è il talento con cui la via comincia, quello che il
-- wizard mostra sulla card della via. I livelli successivi si aggiungono qui
-- man mano che le schede esistono.
create temp table _sottovie (
  key text, via_key text, level smallint, name text, description text, talent_key text
);
insert into _sottovie (key, via_key, level, name, description, talent_key) values
  ('combattente_0', 'combattente', 0, 'Tecnicista',            'TODO: descrizione della sottovia iniziale del Combattente.', 'cb-tecnicista'),
  ('sapiente_0',    'sapiente',    0, 'Concentrazione arcana', 'TODO: descrizione della sottovia iniziale del Sapiente.',    'sp-concentrazione-arcana'),
  ('viandante_0',   'viandante',   0, 'Giusta scelta',         'TODO: descrizione della sottovia iniziale del Viandante.',   'vd-giusta-scelta');

-- Ogni tendenza è un asse fra due poli, non un elenco di opzioni: "neutrale" è
-- il centro dell'asse, non una voce. `sort_order` è globale e determina
-- l'ordine nel wizard: allineamento → moralità → carattere.
--
-- Attacco, difesa e reazione non sono più qui: attacco e difesa sono diventati
-- due scelte binarie fra fisico e magico (colonne di `personaggi`), e la
-- reazione è uscita dalla creazione del personaggio.
create temp table _tendenze (
  key text, type text, name text, description text,
  min_label text, min_value smallint, max_label text, max_value smallint,
  sort_order smallint
);
insert into _tendenze (key, type, name, description, min_label, min_value, max_label, max_value, sort_order) values
  ('allineamento', 'allineamento', 'Allineamento', 'La linea di principi con cui affronterai le prime sessioni. Cambierà man mano che prendi confidenza col personaggio.', 'Legale',         0, 'Caotico',    100, 1),
  ('moralita',     'moralita',     'Moralità',     '', 'Buono',          0, 'Malvagio',   100, 2),
  ('socialita',    'tendenza',     'Socialità',    '', 'Timido',         0, 'Estroverso', 100, 3),
  ('gentilezza',   'tendenza',     'Gentilezza',   '', 'Arrogante',      0, 'Gentile',    100, 4),
  ('ambizione',    'tendenza',     'Ambizione',    '', 'Umile',          0, 'Ambizioso',  100, 5),
  ('curiosita',    'tendenza',     'Curiosità',    '', 'Disinteressato', 0, 'Curioso',    100, 6);


-- ══════════════════════ §2 APPLY · dai padri ai figli ══════════════════════

insert into public.talenti (key, name, description, kind, scuola, disciplina, ramo, properties, sort_order)
select key, name, description, kind, scuola, disciplina, ramo, properties, sort_order from _talenti
on conflict (key) do update set
  name        = excluded.name,
  description = excluded.description,
  kind        = excluded.kind,
  scuola      = excluded.scuola,
  disciplina  = excluded.disciplina,
  ramo        = excluded.ramo,
  properties  = excluded.properties,
  sort_order  = excluded.sort_order;

insert into public.caratteristiche (key, name, description, hp_per_punto, mana_per_punto, sort_order)
select key, name, description, hp_per_punto, mana_per_punto, sort_order from _caratteristiche
on conflict (key) do update set
  name           = excluded.name,
  description    = excluded.description,
  hp_per_punto   = excluded.hp_per_punto,
  mana_per_punto = excluded.mana_per_punto,
  sort_order     = excluded.sort_order;

insert into public.razze (key, name, description, talent_key, sort_order)
select key, name, description, talent_key, sort_order from _razze
on conflict (key) do update set
  name        = excluded.name,
  description = excluded.description,
  talent_key  = excluded.talent_key,
  sort_order  = excluded.sort_order;

insert into public.razza_caratteristiche (razza_key, caratteristica_key, sort_order)
select razza_key, caratteristica_key, sort_order from _razza_caratteristiche
on conflict (razza_key, caratteristica_key) do update set
  sort_order = excluded.sort_order;

insert into public.tribu (key, razza_key, name, description, talent_key, base_speed, sort_order)
select key, razza_key, name, description, talent_key, base_speed, sort_order from _tribu
on conflict (key) do update set
  razza_key   = excluded.razza_key,
  name        = excluded.name,
  description = excluded.description,
  talent_key  = excluded.talent_key,
  base_speed  = excluded.base_speed,
  sort_order  = excluded.sort_order;

insert into public.vie (key, name, description, sort_order)
select key, name, description, sort_order from _vie
on conflict (key) do update set
  name        = excluded.name,
  description = excluded.description,
  sort_order  = excluded.sort_order;

insert into public.sottovie (key, via_key, level, name, description, talent_key)
select key, via_key, level, name, description, talent_key from _sottovie
on conflict (key) do update set
  via_key     = excluded.via_key,
  level       = excluded.level,
  name        = excluded.name,
  description = excluded.description,
  talent_key  = excluded.talent_key;

insert into public.tendenze (key, type, name, description, min_label, min_value, max_label, max_value, sort_order)
select key, type, name, description, min_label, min_value, max_label, max_value, sort_order from _tendenze
on conflict (key) do update set
  type        = excluded.type,
  name        = excluded.name,
  description = excluded.description,
  min_label   = excluded.min_label,
  min_value   = excluded.min_value,
  max_label   = excluded.max_label,
  max_value   = excluded.max_value,
  sort_order  = excluded.sort_order;


-- ══════════════════════ §3 PRUNE · dai figli ai padri ══════════════════════
-- Toglie le righe che non compaiono più nel §1. L'ordine è l'inverso del §2:
-- nessuna riga viene cancellata finché qualcuno la referenzia ancora.

delete from public.tendenze t
where not exists (select 1 from _tendenze s where s.key = t.key);

delete from public.sottovie v
where not exists (select 1 from _sottovie s where s.key = v.key);

delete from public.vie v
where not exists (select 1 from _vie s where s.key = v.key);

delete from public.tribu r
where not exists (select 1 from _tribu s where s.key = r.key);

delete from public.razza_caratteristiche rc
where not exists (
  select 1 from _razza_caratteristiche s
  where s.razza_key = rc.razza_key and s.caratteristica_key = rc.caratteristica_key
);

delete from public.razze r
where not exists (select 1 from _razze s where s.key = r.key);

delete from public.caratteristiche c
where not exists (select 1 from _caratteristiche s where s.key = c.key);

delete from public.talenti t
where not exists (select 1 from _talenti s where s.key = t.key);


-- ═════════════════════════════ §4 CLEANUP ══════════════════════════════════
-- Le tabelle temporanee morirebbero comunque con la sessione; sbarazzarsene
-- qui rende il file riapplicabile anche due volte sulla stessa connessione
-- (il seeder della CLI lavora su un pool, la connessione viene riusata).

drop table _talenti, _caratteristiche, _razze, _razza_caratteristiche, _tribu,
           _vie, _sottovie, _tendenze;

end
$seed$;
