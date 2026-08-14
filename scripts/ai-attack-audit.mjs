import assert from "node:assert/strict";

import { createMatchState, updateMatch, hitBall } from "../js/game.js?v=20260814-feedback-v38";
import { ATHLETES, ARENAS, AI_OPPONENTS, COURT } from "../js/data.js?v=20260814-feedback-v38";

/**
 * L'IA deve punire un pallonetto mal riuscito, e lasciar stare quello buono.
 *
 * E' la promessa che regge il pallonetto come colpo: se un lob corto non viene
 * castigato, alzare la palla diventa gratis e il repertorio si riduce a uno.
 * Nessun audit la sorvegliava, e non e' una proprieta' che si nota rompendola —
 * si nota mesi dopo, quando il gioco e' diventato piatto senza sapere quando.
 *
 * ATTENZIONE AL BANCO DI PROVA. `aiServiceReceiverKey` vale "opponent" da quando
 * la partita nasce, e finche' e' impostata le racchette avversarie vengono
 * portate in posizione di ricezione del servizio — `COURT.top + 74`, cioe'
 * y=130 — da un ramo che precede del tutto la logica di difesa. Uno scambio
 * simulato senza azzerarla non misura l'IA che difende: misura l'IA che aspetta
 * un servizio. Su quell'errore ho concluso che l'IA arretrava sempre e non
 * attaccava mai, che e' esattamente il contrario di quello che fa.
 */

const VUOTO = {
  moveX: 0, moveY: 0, charging: false, hit: false, slice: false, special: false,
  switchPlayer: false, switchDirection: null, aim: 0, aimY: 0, analogAim: false,
};

const ATTACCANTI = new Set(["smash-x2", "smash-x3", "vibora", "volley"]);

function pallonetto(carica, seme, aiIndex = 2) {
  const state = createMatchState("quick", ATHLETES[0], ARENAS[0], AI_OPPONENTS[aiIndex]);
  state.rngState = seme;
  Object.assign(state, {
    running: true, serving: false, pointPause: 0, lastHitterSide: "ai", rallyHits: 3,
    aiServiceReceiverKey: null, serviceReceiverKey: null, aiReceiverLocked: false,
  });
  Object.assign(state.player, { x: 480, y: 500, controlled: true, isPlayer: true, hitCooldown: 0 });
  Object.assign(state.playerMate, { x: 700, y: 480, hitCooldown: 0 });
  Object.assign(state.opponent, { x: 480, y: COURT.top + 76, hitCooldown: 0 });
  Object.assign(state.opponentMate, { x: 650, y: COURT.netY - 84, hitCooldown: 0 });
  Object.assign(state.ball, {
    x: 480, y: 480, z: 70, vx: 0, vy: -100, vz: 0,
    bounces: { player: 0, ai: 0 }, serveInFlight: false, netFaultOwner: null, crossedNet: true,
  });

  hitBall(state, state.player, carica, false, true, 0, false, "lob", 0);

  const partenza = state.opponent.y;
  let avanzataMax = 0;
  const colpiPrima = state.rallyHits;
  for (let frame = 0; frame < 2400; frame += 1) {
    updateMatch(state, 1 / 240, VUOTO);
    avanzataMax = Math.max(avanzataMax, state.opponent.y - partenza);
    if (state.rallyHits > colpiPrima) return { colpo: state.ball.shotType, avanzata: avanzataMax };
    if (state.stats.pointsWon.player || state.stats.pointsWon.ai) break;
  }
  return { colpo: null, avanzata: avanzataMax };
}

function campagna(carica, quanti = 60) {
  const esiti = [];
  for (let i = 0; i < quanti; i += 1) esiti.push(pallonetto(carica, 1000 + i * 7919));
  const giocati = esiti.filter((e) => e.colpo);
  return {
    giocati: giocati.length,
    attacchi: giocati.filter((e) => ATTACCANTI.has(e.colpo)).length,
    smash: giocati.filter((e) => e.colpo.startsWith("smash")).length,
    avanzata: esiti.reduce((somma, e) => somma + e.avanzata, 0) / esiti.length,
    colpi: giocati.reduce((conta, e) => ({ ...conta, [e.colpo]: (conta[e.colpo] ?? 0) + 1 }), {}),
  };
}

const corto = campagna(0.45);
const profondo = campagna(1.1);

assert.ok(corto.giocati > 40, `Il pallonetto corto deve essere rigiocato quasi sempre: ${corto.giocati}/60`);
assert.ok(profondo.giocati > 40, `Il pallonetto profondo deve essere rigiocato quasi sempre: ${profondo.giocati}/60`);

// --- il lob corto si paga -------------------------------------------------

const tassoAttacco = corto.attacchi / corto.giocati;
assert.ok(tassoAttacco > 0.6,
  `Un pallonetto corto deve essere aggredito nella maggioranza dei casi: ${(tassoAttacco * 100).toFixed(0)}% (${JSON.stringify(corto.colpi)})`);
assert.ok(corto.smash / corto.giocati > 0.4,
  `E lo smash deve essere la risposta piu' comune, non un caso raro: ${corto.smash}/${corto.giocati}`);

// L'IA ci arriva avanzando: se restasse ferma la palla le scenderebbe sotto e
// nessuna taratura di `attackRead` potrebbe salvarla.
assert.ok(corto.avanzata > 30,
  `Per prendere il pallonetto in aria l'IA deve farsi avanti: avanza ${corto.avanzata.toFixed(0)} px`);

// --- il lob profondo no ---------------------------------------------------

const tassoProfondo = profondo.attacchi / profondo.giocati;
assert.ok(tassoProfondo < 0.2,
  `Un pallonetto profondo non si attacca da fondo campo: ${(tassoProfondo * 100).toFixed(0)}% (${JSON.stringify(profondo.colpi)})`);
assert.ok(tassoAttacco > tassoProfondo + 0.4,
  `La differenza fra corto e profondo deve essere netta: ${(tassoAttacco * 100).toFixed(0)}% contro ${(tassoProfondo * 100).toFixed(0)}%`);

console.log(JSON.stringify({
  corto: { attacchiPercento: Math.round(tassoAttacco * 100), avanzataPx: Math.round(corto.avanzata), colpi: corto.colpi },
  profondo: { attacchiPercento: Math.round(tassoProfondo * 100), colpi: profondo.colpi },
}, null, 2));
