import assert from "node:assert/strict";

import { createMatchState, hitBall, updateMatch } from "../js/game.js";
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
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createRallyState(athlete = ATHLETES[0], aiIndex = 1) {
  const state = createMatchState("quick", athlete, ARENAS[0], AI_OPPONENTS[aiIndex]);
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

function simulateFirstReply(kind, aiIndex, aim, aimY, seed) {
  Math.random = seededRandom(seed);
  const state = createRallyState(ATHLETES[0], aiIndex);
  hitBall(state, state.player, 1.35, false, true, aim, false, kind, aimY);
  let maxSmashStage = 0;
  let usedGlass = false;
  for (let frame = 0; frame < 2600; frame += 1) {
    updateMatch(state, 1 / 240, EMPTY_INPUT);
    maxSmashStage = Math.max(maxSmashStage, state.ball.smashStage);
    usedGlass ||= state.ball.postGlassSide === "ai";
    if (state.rallyHits >= 5 || state.stats.pointsWon.player || state.stats.pointsWon.ai) break;
  }
  return {
    returned: state.rallyHits >= 5,
    winner: state.stats.pointsWon.player > 0,
    maxSmashStage,
    usedGlass,
  };
}

function lobLanding(power, aimY) {
  Math.random = () => 0.5;
  const state = createRallyState();
  hitBall(state, state.player, power, false, true, 0, false, "lob", aimY);
  for (let frame = 0; frame < 5000; frame += 1) {
    updateMatch(state, 0.001, EMPTY_INPUT);
    state.aiReactionDelay = 99;
    if (state.ball.bounces.ai) return state.ball.y;
    if (state.stats.pointsWon.ai) return null;
  }
  return null;
}

const shortLob = lobLanding(0.4, 0);
const mediumLob = lobLanding(0.8, 0);
const deepLob = lobLanding(1.1, -1);
assert(shortLob && mediumLob && deepLob, "I lob controllati devono rimbalzare in campo");
assert(shortLob > mediumLob && mediumLob > deepLob, "La carica deve aumentare la profondità del lob");

let panteraLobErrors = 0;
for (let seed = 1; seed <= 300; seed += 1) {
  Math.random = seededRandom(seed);
  const state = createRallyState(ATHLETES[1]);
  hitBall(state, state.player, 1.35, false, true, 0, false, "lob", -1);
  for (let frame = 0; frame < 5000; frame += 1) {
    updateMatch(state, 0.001, EMPTY_INPUT);
    state.aiReactionDelay = 99;
    if (state.ball.bounces.ai || state.stats.pointsWon.ai) break;
  }
  if (state.stats.pointsWon.ai) panteraLobErrors += 1;
}
const panteraLobErrorRate = panteraLobErrors / 300;
assert(panteraLobErrorRate > 0.2 && panteraLobErrorRate < 0.75,
  `Il lob massimo della Pantera deve essere rischioso ma utilizzabile: ${panteraLobErrorRate}`);

Math.random = () => 0.5;
const glassState = createRallyState();
Object.assign(glassState.opponent, { x: 480, y: 135 });
hitBall(glassState, glassState.player, 1.35, false, true, 0, false, "lob", 0);
let glassReached = false;
for (let frame = 0; frame < 5000 && glassState.rallyHits < 5; frame += 1) {
  updateMatch(glassState, 0.001, EMPTY_INPUT);
  glassReached ||= glassState.ball.postGlassSide === "ai";
  if (!glassReached) glassState.aiReactionDelay = 99;
}
assert(glassReached, "Il lob profondo deve poter raggiungere il vetro");
assert(glassState.rallyHits >= 5, "L'IA deve poter rispondere dopo il proprio vetro");

for (let aiIndex = 0; aiIndex < AI_OPPONENTS.length; aiIndex += 1) {
  let x2ThroughGlass = 0;
  let x2Winners = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const result = simulateFirstReply("smash", aiIndex, 0, -1, seed + aiIndex * 1000);
    if (result.maxSmashStage >= 2) x2ThroughGlass += 1;
    if (result.winner) x2Winners += 1;
  }
  assert(x2ThroughGlass / 300 > 0.9, `Lo X2 deve svilupparsi attraverso il vetro (AI ${aiIndex})`);
  assert(x2Winners > 0 && x2Winners < 120, `Lo X2 deve essere forte ma difendibile (AI ${aiIndex})`);
}

let mediumX3Winners = 0;
for (let seed = 1; seed <= 300; seed += 1) {
  if (simulateFirstReply("smash", 1, 0.8, -1, seed).winner) mediumX3Winners += 1;
}
assert(mediumX3Winners > 120 && mediumX3Winners < 270,
  `Lo X3 contro IA media deve restare speciale ma non automatico: ${mediumX3Winners}`);

Math.random = seededRandom(20260811);
const aiRepertoire = new Set();
for (let sample = 0; sample < 2500; sample += 1) {
  const state = createRallyState(ATHLETES[0], 2);
  Object.assign(state.opponent, { x: 480, y: 230, hitCooldown: 0 });
  Object.assign(state.player, { x: 330, y: 390 });
  Object.assign(state.playerMate, { x: 650, y: 400 });
  Object.assign(state.ball, { x: 480, y: 250, z: 70, vy: -80 });
  hitBall(state, state.opponent, 1, false, true);
  aiRepertoire.add(state.ball.shotType);
}
for (const requiredShot of ["drive", "lob", "volley", "vibora", "smash-x2", "smash-x3", "error"]) {
  assert(aiRepertoire.has(requiredShot), `Repertorio IA incompleto: manca ${requiredShot}`);
}

console.log(JSON.stringify({
  lobDepths: { short: shortLob, medium: mediumLob, deep: deepLob },
  panteraLobErrorRate,
  mediumX3WinnerRate: mediumX3Winners / 300,
  aiRepertoire: [...aiRepertoire].sort(),
}, null, 2));
