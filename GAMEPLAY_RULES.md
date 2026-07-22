# Padel Flow Arena - Gameplay Rules

## Obiettivo

Il gioco deve sembrare padel prima che arcade: rally leggibili, recuperi possibili,
scelte di posizione riconoscibili e punti vinti per costruzione dello scambio, non
per traiettorie casuali o colpi inevitabili.

## Scala del Campo

- Il campo logico rappresenta un rettangolo 20 x 10 metri.
- La rete separa due meta campo. Ogni lato ha una zona di fondo e una zona di rete.
- La palla usa coordinate orizzontali `x/y` e altezza `z`.
- Il vetro e' attivo soltanto dopo un primo rimbalzo valido sul lato che lo riceve.
- Il secondo rimbalzo sullo stesso lato termina il punto.

## Servizio

- Il battitore resta dietro la propria linea di servizio.
- Il battitore resta nel proprio riquadro (destra o sinistra), alternato a ogni punto.
- Il servizio e' dal basso, attraversa la rete e rimbalza soltanto nel riquadro diagonale opposto.
- La risposta non puo' essere una volée prima del rimbalzo.
- Un errore produce seconda palla; due errori consecutivi producono doppio fallo.
- Il servizio ha una velocita' massima distinta da drive e smash: deve iniziare il
  rally, non chiuderlo.

## Palla e Colpi

- Un colpo standard usa una velocita' orizzontale moderata e una parabola leggibile.
- L'altezza del colpo determina la parabola: piu' alto significa piu' margine sulla
  rete e piu' tempo di risposta, non piu' potenza gratuita.
- La volée e' rapida ma meno potente di uno smash pulito.
- Lo smash ha una finestra precisa: palla alta, giocatore vicino alla rete, direzione
  sicura. In ogni altra situazione viene convertito in bandeja controllata.
- I colpi laterali sono limitati: la palla non deve poter uscire dal campo con una
  piccola imprecisione dell'AI.

## Logica dell'AI

### Priorita' di decisione

1. Rientrare in una posizione sicura rispetto alla palla e al compagno.
2. Colpire soltanto una palla raggiungibile e sotto l'altezza massima di controllo.
3. Scegliere un bersaglio nel campo avversario con margini dal vetro e dalle linee.
4. Usare vetri e accelerazioni solo quando il contesto li rende sicuri.

### Zone bersaglio

- **Sicura:** centro o tre quarti del campo avversario, lontano almeno 12% della
  larghezza dai vetri laterali e dal vetro di fondo.
- **Pressione:** angolo solo con palla bassa e avversari fuori posizione.
- **Recupero:** lob alto e centrale quando l'AI e' in ritardo o la palla e' sotto
  la linea della rete.
- **Vietata:** traiettoria che raggiunge il vetro avversario prima del rimbalzo.

### Errore controllato

- L'AI non sbaglia aggiungendo potenza casuale.
- La difficolta' modifica tempo di reazione, precisione del bersaglio e probabilita'
  di scegliere il colpo migliore.
- Anche alla difficolta' alta, il bersaglio resta dentro una zona sicura. Gli errori
  devono essere recuperabili dal giocatore o derivare da un rischio scelto.

### Compagni di squadra

- Un giocatore copre la rete e uno il fondo; entrambi non inseguono la stessa palla
  quando non serve.
- Il giocatore di rete intercetta volée e palle corte; quello di fondo copre lob,
  vetro e palle profonde.
- Se un compagno puo' colpire, l'altro rientra in una posizione di copertura.
- Il cambio automatico valuta tempo di arrivo, distanza laterale e altezza prevista.
  La scelta avviene al colpo avversario e resta stabile fino alla risposta del giocatore.
- Se la scelta e' quasi alla pari, il movimento gia' iniziato mantiene il controllo.
  Se il compagno e' nettamente favorito, il cambio automatico ha priorita'. Un cambio
  manuale resta bloccato fino alla risposta.
- In risposta al servizio i compagni hanno diagonali fisse: il giocatore di sinistra
  riceve il servizio diretto a sinistra, quello di destra riceve il servizio diretto
  a destra. La selezione avviene prima della battuta e resta stabile fino alla risposta.
- Durante il servizio avversario entrambi i giocatori della squadra in risposta restano
  dietro la linea di servizio. Possono avanzare verso la rete solo dopo la risposta.
- La stessa formazione vale per la squadra AI quando serve il giocatore: entrambi gli
  avversari partono dietro la linea e solo il ricevitore del diagonale puo' rispondere.

## Parametri di Bilanciamento

- Velocita' standard: deve attraversare il campo in circa 1.0-1.4 secondi.
- Velocita' massima AI: non oltre il 15% sopra un drive standard.
- Deviazione laterale AI: ridotta vicino ai vetri, maggiore solo sui colpi sicuri.
- Altezza massima di risposta: impedisce smash automatici su palle troppo alte.
- Dopo un rimbalzo, la velocita' diminuisce abbastanza da rendere possibile leggere
  vetro e recupero.

## Feedback al Giocatore

- Il log deve spiegare gli eventi rilevanti: servizio valido, vetro valido, secondo
  rimbalzo, doppio fallo e colpo difensivo.
- Il punteggio resta tennis: 0, 15, 30, 40, vantaggio, game, set e tie-break.
- L'animazione della palla deve rendere evidente altezza e punto di rimbalzo.

## Criteri di Accettazione

- L'AI completa rally multipli senza colpire direttamente pareti o uscire dal campo
  nella maggior parte degli scambi.
- I colpi dell'AI restano dentro i margini del campo salvo un rischio deliberato.
- Ogni punto perso dall'AI corrisponde a una regola visibile, non a casualita'.
- Il giocatore puo' prevedere dove arrivera' la palla e ha tempo per muoversi.
