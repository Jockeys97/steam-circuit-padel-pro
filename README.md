*[**Italiano**](README.md) · [English](README.en.md)*

# Steam Circuit Padel Pro

Padel arcade steampunk in HTML5 Canvas. Giocabile nel browser, senza installazione.

**Zero dipendenze**: niente `package.json`, niente npm, niente bundler. 8.500 righe di
JavaScript puro su Canvas 2D, con una proiezione prospettica scritta a mano. L'audio è
sintetizzato a runtime con `AudioContext` — nel progetto non esiste un solo file audio.

---

## Perché questo README parla di decisioni

L'elenco delle funzionalità dice poco su un gioco. Quello che segue è invece il
ragionamento dietro alcune scelte di bilanciamento: cosa non funzionava, **come l'ho
misurato**, e cosa ho cambiato. Ogni numero qui sotto viene da uno script eseguibile,
non da una sensazione.

### 1. Il colpo tagliato dominava quello piatto

Sospettavo uno sbilanciamento e l'ho misurato dal fondo campo:

| carica | colpo | velocità | profondità | 2° arco | energia |
|---|---|---|---|---|---|
| 0.5 | drive | 380 | 136 | **41** | 0.085 |
| 0.5 | slice | **393** | **144** | **22** | **0.075** |

Il taglio era più veloce, più profondo, costava meno energia **e** consegnava un
rimbalzo alto la metà. Non c'era una sola situazione in cui premere il drive fosse
giusto: un pulsante morto.

Provando a correggerlo ho scoperto un vincolo del motore che non conoscevo:
`setComputerTrajectory` risolve la velocità per atterrare sul bersaglio nel tempo dato,
quindi **l'apice dipende solo dal tempo di volo**. Rallentare il taglio per fargli
"pagare del tempo" lo trasformava in un mezzo pallonetto (apice da 94 a 140).

Ho dovuto cambiare la moneta di scambio: il taglio non compra tempo, compra un rimbalzo
schiacciato rinunciando a profondità e spinta. Il piatto resta il colpo di pressione.

### 2. Il giocatore non poteva sbagliare

Ho fatto volare la palla con la stessa fisica del gioco per contare gli esiti reali.
Accumulando tutto il peggio possibile — timing pessimo, corsa, sprint, palla lontana,
energia al minimo, palla già superata:

| situazione | qualità | esiti su 80 |
|---|---|---|
| fermo, timing pessimo | 0.72 | 80 in campo |
| + in corsa | 0.67 | 80 in campo |
| + energia scarica | 0.56 | 80 in campo |
| + palla superata | 0.51 | 80 in campo |

**480 colpi, zero errori.** La causa era strutturale, non di taratura: il bersaglio è
clampato dentro il campo e il solutore ci atterra sempre. Inoltre la penalità che
avrebbe dovuto accorciare la palla si attivava sotto qualità 0.68, mentre il pavimento
raggiungibile dal solo timing era 0.72 — quel ramo di codice non veniva mai eseguito.

### 3. Gli effetti a soglia non si tarano

Il primo modello d'errore usava perturbazioni continue: dispersione laterale, arco più
piatto. Misurandolo si è rivelato un interruttore, non una curva — o non succedeva
niente, o falliva tutto.

Stessa cosa più avanti sullo smash "x2", il cui esito dipendeva da una corsa di
intercettazione:

| velocità di ritorno | Rivale | Ingegnere | Campione |
|---|---|---|---|
| 430 | 18.3% | 16.3% | 11.3% |
| 520 | **100%** | 28.7% | 18.8% |

Novanta punti di velocità ribaltavano il livello facile dal 18% al 100%.

La lezione, applicata due volte: dove l'esito dipende dal superamento di una soglia
geometrica, **una decisione discreta presa una volta sola** è tarabile, una
perturbazione continua no. Sia gli errori del giocatore sia la lettura dello x2 usano
ora quella forma — che è anche quella prescritta dal documento di design.

### 4. L'IA non sapeva cosa fosse una palla attaccabile

Su un pallonetto molle e alto a rete, 2000 prove per livello, il Campione:

- smashava nel **20%** dei casi
- **pallonettava a sua volta nel 22%**, stando a rete su una palla che gli sedeva davanti
- ed era praticamente identico al livello facile: sei punti di scarto

La scelta del colpo guardava solo la propria posizione, l'altezza di contatto e un dado.
Peggio: `hitBall` schiacciava `ball.z` a 74 **prima** della decisione, quindi una palla
a 88 e una a 105 erano per l'IA lo stesso oggetto.

Ho aggiunto un punteggio di attaccabilità (altezza reale del contatto, lentezza della
palla, quanto avanti la si prende) e l'ho agganciato alla scelta:

| | prima | dopo |
|---|---|---|
| Rivale | 14.3% | **58.7%** |
| Campione | 20.2% | **76.1%** |

Il lob dalla rete su palla alta è vietato. La forbice fra i livelli è passata da 6 a 17
punti.

### 5. Una statistica che non faceva niente

`stats.stamina` compariva in **un solo punto** dell'intero motore: la ricarica
dell'abilità speciale. Non toccava l'energia dello scambio, che invece governa qualità
del colpo, finestra di timing e tasso d'errore.

Il personaggio descritto come *"inossidabile, recupera ogni punto"* aveva quindi come
unico vantaggio una speciale più rapida. Collegata l'energia alla stamina, la differenza
in uno scambio lungo è diventata reale: 2.89 errori contro 3.30 della più fragile.

### 6. Il servizio non poteva fallire

400 prove per ogni livello di carica: **100% validi**, sempre. Seconda palla, doppio
fallo e `serveAttempts` erano percorsi di codice irraggiungibili, malgrado il documento
di design dedichi loro un capitolo.

Aggiunta una dispersione d'esecuzione che cresce con la carica e cala con il controllo
dell'atleta. Ora un servizio a mezza forza resta sicuro per tutti, mentre a carica piena
il Maestro (controllo 1.28) fallisce il 16.5% e non arriva mai al doppio fallo, lo
Steamer (0.90) fallisce il 36% e doppia l'8.6%.

---

## Quando il banco di prova mente

Due errori di misurazione che vale la pena raccontare, perché mi hanno quasi portato a
conclusioni sbagliate.

**Il generatore pseudocasuale.** Misurando le scelte dell'IA ottenevo zero smash su 600
prove, con un valore che non scendeva *mai* sotto la soglia. Il difetto era mio:
riseminavo un generatore lineare con semi consecutivi 1, 2, 3… e un LCG così produce
valori correlati che spazzano un reticolo invece di coprire l'intervallo. Riscritto con
un generatore seminato una volta sola e un controllo di sanità sul percorso reale (media
0.496 contro 0.5 atteso), i numeri sono cambiati completamente.

**L'identità dei moduli.** Una ricerca sui parametri restituiva sempre lo stesso
risultato. Il motivo: i moduli del gioco si importano con una query di cache busting
(`data.js?v=…`) e il mio script importava `data.js` senza. Per Node sono **due moduli
distinti**, quindi stavo mutando un oggetto che il gioco non leggeva mai.

Da entrambi ho preso l'abitudine di verificare lo strumento prima dei risultati: se un
parametro non cambia l'output, il primo sospettato è la misura.

---

## La suite di audit

Cinque script eseguibili in `scripts/`, senza framework di test:

```bash
node scripts/shot-quality-audit.mjs      # timing, qualità, energia, velocità
node scripts/shot-balance-audit.mjs      # lob, x3, repertorio dell'IA
node scripts/smash-input-audit.mjs       # doppio tap, degrado, risposta al servizio
node scripts/difficulty-audit.mjs        # scala dei tre livelli
node scripts/controller-tactics-audit.mjs # colpi tecnici, movimento, tattiche
```

Non verificano che il codice giri: verificano che il **bilanciamento** regga. Alcune
asserzioni sono vincoli di design espliciti — per esempio che lo smash x2 resti *"forte
ma difendibile"*, sotto il 40% di punti vinti. Durante il bilanciamento ero arrivato al
54% e quel test mi ha fermato: aveva ragione lui.

Tutta la taratura è in un unico oggetto `BALANCE` in [`js/data.js`](js/data.js), così
un valore si sposta senza entrare nella logica.

---

## Architettura

| file | responsabilità |
|---|---|
| `game.js` | simulazione: fisica, regole, IA, punteggio |
| `render.js` | disegno: proiezione, campo, personaggi, HUD |
| `data.js` | costanti di bilanciamento, atleti, arene |
| `main.js` | ciclo di gioco, input, gamepad |
| `audio.js` | sintesi audio procedurale |
| `ui.js`, `i18n.js`, `fx.js`, `drill.js` | interfaccia, lingue, particelle, allenamento |

La simulazione non conosce il renderer: `game.js` non importa niente da `render.js` a
parte una funzione di utilità matematica. Il motore grafico è sostituibile senza toccare
una riga di gioco.

---

## Come si esegue

Serve un server statico qualsiasi, perché il gioco usa moduli ES:

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

I moduli usano una query di versione (`?v=…`) come cache busting. **Cambiandone uno,
vanno aggiornate tutte e 23 le occorrenze** in `index.html` e `js/*.js`: se restano
disallineate il browser può servire un modulo vecchio insieme a uno nuovo, e un import
che non trova il proprio export non degrada — il gioco non parte.

```bash
grep -c "20260813-legend-v16" index.html js/*.js styles.css   # deve dare 23 in totale
```

---

## Controlli

Tastiera e gamepad. Su controller: **A** drive, **X** slice/víbora, **Y** lob, **B**
speciale, **LB** cambio giocatore, **RB** modificatore tecnico, **LT** split-step, **RT**
sprint — e, tenendo la carica, **RT** diventa l'angolo stretto: avvicina il bersaglio al
vetro guadagnando precisione, ma con una dispersione incomprimibile che rende il colpo un
azzardo consapevole.

## Stato

Alpha giocabile. Mancano le illustrazioni di due atleti sbloccabili, che nel frattempo
vengono disegnati proceduralmente.
