import assert from "node:assert/strict";

import { createMatchState, hitBall, performServe, updateMatch } from "../js/game.js";
import { AI_OPPONENTS, ARENAS, ATHLETES } from "../js/data.js";

const EMPTY_INPUT = {
  moveX: 0,
  moveY: 0,
  charging: false,
  hit: false,
  slice: false,
  special: false,
  switchPlayer: false,
  switchDirection: null,
  aim: 0,
  aimY: 0,
  analogAim: false,
};

function seededRandom(seed) {
  // Generatore di qualita' (mulberry32). Il congruenziale lineare usato prima
  // aveva correlazioni forti fra estrazioni vicine e falsava le misure: il tasso
  // d'errore dell'IA media risultava 0.082 invece dei ~0.148 reali del browser.
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRallyState(aiIndex) {
  const state = createMatchState("quick", ATHLETES[0], ARENAS[0], AI_OPPONENTS[aiIndex]);
  Object.assign(state, {
    running: true,
    serving: false,
    pointPause: 0,
    lastHitterSide: "ai",
    rallyHits: 3,
  });
  Object.assign(state.player, { x: 480, y: 395, controlled: true, isPlayer: true, hitCooldown: 0 });
  Object.assign(state.playerMate, { x: 700, y: 405, hitCooldown: 0 });
  Object.assign(state.opponent, { x: 330, y: 145, hitCooldown: 0 });
  Object.assign(state.opponentMate, { x: 650, y: 210, hitCooldown: 0 });
  Object.assign(state.ball, {
    x: 480,
    y: 375,
    z: 70,
    vx: 0,
    vy: 100,
    vz: 0,
    bounces: { player: 0, ai: 0 },
    serveInFlight: false,
    netFaultOwner: null,
    crossedNet: true,
  });
  return state;
}

function simulatePlayerSmash(aiIndex, aim, seed) {
  Math.random = seededRandom(seed);
  const state = createRallyState(aiIndex);
  hitBall(state, state.player, 1.35, false, true, aim, false, "smash", -1);
  for (let frame = 0; frame < 2600; frame += 1) {
    updateMatch(state, 1 / 240, EMPTY_INPUT);
    if (state.rallyHits >= 5 || state.stats.pointsWon.player || state.stats.pointsWon.ai) break;
  }
  return {
    returned: state.rallyHits >= 5,
    winner: state.stats.pointsWon.player > 0,
  };
}

function simulateServeReturn(aiIndex, charge, seed) {
  Math.random = seededRandom(seed);
  const state = createMatchState("quick", ATHLETES[0], ARENAS[0], AI_OPPONENTS[aiIndex]);
  state.running = true;
  performServe(state, charge, false);
  for (let frame = 0; frame < 2600; frame += 1) {
    updateMatch(state, 1 / 240, EMPTY_INPUT);
    if (state.rallyHits >= 1 || state.stats.pointsWon.player || state.stats.pointsWon.ai) break;
  }
  return state.rallyHits >= 1;
}

function sampleAiErrors(aiIndex, samples = 1000) {
  let errors = 0;
  for (let seed = 1; seed <= samples; seed += 1) {
    Math.random = seededRandom(seed + aiIndex * 10000);
    const state = createRallyState(aiIndex);
    state.rallyHits = 12;
    Object.assign(state.opponent, { x: 480, y: 230, hitCooldown: 0 });
    Object.assign(state.ball, { x: 480, y: 250, z: 70, vy: -80 });
    hitBall(state, state.opponent, 1, false, true);
    if (state.ball.shotType === "error" || state.aiRecoveryMode) errors += 1;
  }
  return errors / samples;
}

const samples = 240;
const report = AI_OPPONENTS.map((profile, aiIndex) => {
  let x2Winners = 0;
  let x3Winners = 0;
  let servesReturned = 0;
  for (let seed = 1; seed <= samples; seed += 1) {
    if (simulatePlayerSmash(aiIndex, 0, seed + aiIndex * 1000).winner) x2Winners += 1;
    if (simulatePlayerSmash(aiIndex, 0.8, seed + aiIndex * 2000).winner) x3Winners += 1;
    if (simulateServeReturn(aiIndex, 0.82, seed + aiIndex * 3000)) servesReturned += 1;
  }
  return {
    id: profile.id,
    skill: profile.skill,
    effectiveSpeed: Number((profile.speed * (0.86 + profile.skill * 0.1)).toFixed(1)),
    baseReactionMs: Math.round((0.28 - profile.skill * 0.25) * 1000),
    aimErrorPx: Number(((1 - profile.skill) * 44).toFixed(1)),
    longRallyErrorRate: Number(sampleAiErrors(aiIndex).toFixed(3)),
    serveReturnRate: Number((servesReturned / samples).toFixed(3)),
    x2PlayerWinnerRate: Number((x2Winners / samples).toFixed(3)),
    x3PlayerWinnerRate: Number((x3Winners / samples).toFixed(3)),
  };
});

console.log(JSON.stringify(report, null, 2));

for (let index = 1; index < report.length; index += 1) {
  const easier = report[index - 1];
  const harder = report[index];
  assert(harder.skill > easier.skill, "La skill deve crescere con la difficolta");
  assert(harder.effectiveSpeed > easier.effectiveSpeed, "La velocita deve crescere con la difficolta");
  assert(harder.baseReactionMs < easier.baseReactionMs, "Il tempo di reazione deve calare con la difficolta");
  assert(harder.aimErrorPx < easier.aimErrorPx, "L'errore di mira deve calare con la difficolta");
  assert(harder.longRallyErrorRate < easier.longRallyErrorRate, "Gli errori IA devono calare con la difficolta");
  assert(harder.x2PlayerWinnerRate <= easier.x2PlayerWinnerRate, "La difesa dello X2 deve migliorare");
  assert(harder.x3PlayerWinnerRate < easier.x3PlayerWinnerRate, "La difesa dello X3 deve migliorare");
}

for (const difficulty of report) {
  assert(difficulty.serveReturnRate >= 0.9, `${difficulty.id} deve rispondere ai servizi validi`);
}
