import assert from "node:assert/strict";

import { createMatchState, hitBall } from "../js/game.js";
import { AI_OPPONENTS, ARENAS, ATHLETES } from "../js/data.js";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function shot({ charge, timingAge = 0, passed = 0, aim = 0 }) {
  Math.random = seededRandom(42);
  const state = createMatchState("quick", ATHLETES[0], ARENAS[0], AI_OPPONENTS[1]);
  Object.assign(state, {
    running: true,
    serving: false,
    rallyEnergy: { player: 1, ai: 1 },
  });
  Object.assign(state.player, {
    x: 480,
    y: 430,
    moveRatio: 0,
    hitCooldown: 0,
  });
  Object.assign(state.ball, {
    x: 480,
    y: 430 + passed,
    z: 48,
    vy: 120,
    serveInFlight: false,
    netFaultOwner: null,
  });
  const power = 0.4 + charge * 0.95;
  assert(hitBall(state, state.player, power, false, true, aim, false, "drive", 0, timingAge));
  return {
    feedback: state.shotFeedback,
    energy: state.rallyEnergy.player,
    speed: Math.hypot(state.ball.vx, state.ball.vy),
  };
}

const perfect = shot({ charge: 0.5 });
const early = shot({ charge: 0.5, timingAge: 0.22 });
const late = shot({ charge: 0.5, passed: 28 });
const control = shot({ charge: 0.08 });
const power = shot({ charge: 0.92 });

assert.equal(perfect.feedback.grade, "perfect");
assert.equal(early.feedback.grade, "early");
assert.equal(late.feedback.grade, "late");
assert(perfect.feedback.quality > early.feedback.quality, "Il timing perfetto deve migliorare la qualita'");
assert.equal(control.feedback.mode, "CONTROLLO");
assert.equal(power.feedback.mode, "POTENZA");
assert(power.energy < control.energy, "Il power shot deve consumare piu' energia del controllo");
assert(power.speed > control.speed, "Il power shot pulito deve viaggiare piu' veloce");

console.log(JSON.stringify({
  quality: {
    perfect: Number(perfect.feedback.quality.toFixed(3)),
    early: Number(early.feedback.quality.toFixed(3)),
    late: Number(late.feedback.quality.toFixed(3)),
  },
  energyAfterShot: {
    control: Number(control.energy.toFixed(3)),
    power: Number(power.energy.toFixed(3)),
  },
  speed: {
    control: Number(control.speed.toFixed(1)),
    power: Number(power.speed.toFixed(1)),
  },
}, null, 2));
