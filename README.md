# Steam Circuit Padel Pro

Arcade padel steampunk in HTML5 Canvas — alpha giocabile nel browser.

## Bilanciamento (Alpha 0.2)

Tutti i valori di tuning sono in `js/data.js` → oggetto `BALANCE`.

| Atleta | Punto di forza | Trade-off |
|--------|----------------|-----------|
| Maestro | Controllo, reach, angoli | Velocità e potenza medie |
| Pantera | Velocità, dash speciale | Reach ridotto |
| Steamer | Potenza smash | Lento, reach corto |
| Fiamma | Scudo difensivo, rigenerazione abilità | Colpi meno violenti |

**Partita Rapida** usa il Rivale del Circuito (facile). Il torneo scala fino al Campione Steampunk.


- **4 atleti** con statistiche e abilità speciali uniche
- **Partita Rapida** e **Torneo Campionato** contro IA
- **3 arene steampunk** con ambientazioni e rimbalzi differenti
- Doppio 2 vs 2, servizio diagonale, due tentativi e pausa tra i punti
- Fisica: rimbalzi su vetro e fondo, rete centrale, slice e combo rally
- Controlli da tastiera e touch mobile

## Prossimamente

- Modalità Carriera
- Multiplayer online
- Più arene e colpi speciali

## Controlli

| Tasto | Azione |
|-------|--------|
| `W` / `A` / `S` / `D` | Muovi e vai a rete |
| `Space` | Carica e rilascia il colpo |
| `⌘ Command` | Carica e rilascia lo slice |
| `A` / `D` o `←` / `→` durante la carica | Mira il colpo |
| `Option` | Abilità speciale |
| `Z` | Cambia giocatore |
| `Esc` | Pausa |

## Atleti

| Campione | Ruolo | Abilità |
|----------|-------|---------|
| Il Maestro | Tecnica | Colpo di Precisione |
| La Pantera | Velocità | Scatto Fulmineo |
| Lo Steamer | Potenza | Smash a Vapore |
| La Fiamma | Resistenza | Scudo di Vapore |

## Avvio locale

```bash
cd /Users/alessiofantini/Documents/Padel
npx serve .
```

Poi apri l'URL indicato (serve necessario per i moduli ES6).

## Struttura

```
index.html          Shell UI + schermate
styles.css          Tema steampunk
js/data.js          Atleti, arene, costanti
js/game.js          Logica partita e fisica
js/render.js        Rendering canvas
js/ui.js            Navigazione schermate
js/main.js          Bootstrap e input
```
