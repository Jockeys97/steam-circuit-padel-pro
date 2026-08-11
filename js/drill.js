import { BALANCE, COURT } from "./data.js";

const GRAVITY = BALANCE.ballGravity;
const GOAL_R = 34;

export function createDrill() {
  return {
    running: false,
    phase: "ready",
    charge: 0,
    meter: 0.3,
    attempts: 0,
    hits: 0,
    score: 0,
    best: 0,
    streak: 0,
    grade: null,
    gradeLife: 0,
    points: 0,
    resultTimer: 0,
    ball: { x: COURT.right / 2, y: COURT.netY + 88, z: 0, vx: 0, vy: 0, vz: 0, active: false },
    paddle: { x: COURT.right / 2, y: COURT.netY + 88, w: 112, reach: 50, swing: 0 },
    reticle: { x: COURT.right / 2, y: 132 },
    goal: { x: 0, y: 0, r: GOAL_R, active: false },
    landing: null,
  };
}

export function resetDrill(drill) {
  drill.phase = "ready";
  drill.charge = 0;
  drill.grade = null;
  drill.gradeLife = 0;
  drill.ball.active = false;
  drill.ball.z = 0;
  drill.ball.x = drill.paddle.x;
  drill.ball.y = drill.paddle.y;
  drill.landing = null;
  drill.goal.active = false;
  drill.reticle.x = COURT.right / 2;
  drill.resultTimer = 0;
}

function placeGoal(drill) {
  const pad = 60;
  drill.goal.x = COURT.left + pad + Math.random() * (COURT.right - COURT.left - pad * 2);
  drill.goal.y = COURT.top + 46 + Math.random() * (COURT.netY - 130);
  drill.goal.r = GOAL_R;
  drill.goal.active = true;
}

function startDrillRound(drill) {
  placeGoal(drill);
  drill.phase = "charge";
  drill.charge = 0;
  drill.meter = 0.3;
  drill.grade = null;
  drill.gradeLife = 0;
  drill.landing = null;
}

function launchDrillBall(drill) {
  const charge = drill.meter;
  const perfect = 0.62;
  const dist = Math.abs(charge - perfect);
  const grade = dist < 0.12 ? "perfect" : dist < 0.28 ? "good" : "early";
  drill.grade = grade;
  drill.gradeLife = 1.2;
  drill.charge = charge;

  const target = { x: drill.reticle.x, y: drill.reticle.y };
  const time = 1.15 - charge * 0.25;
  const dragRate = -60 * Math.log(BALANCE.airDrag);
  const dragFactor = dragRate > 0.0001
    ? (1 - Math.exp(-dragRate * time)) / (dragRate * time)
    : 1;
  const dragComp = 1 / dragFactor;
  const b = drill.ball;
  b.active = true;
  b.vx = ((target.x - b.x) / time) * dragComp;
  b.vy = ((target.y - b.y) / time) * dragComp;
  b.vz = GRAVITY * time * 0.45 + (1 - charge) * 60;
  drill.landing = null;
  drill.phase = "flight";
}

function updateTargetAim(drill, input, dt) {
  const speed = 420;
  const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  drill.reticle.x += dir * speed * dt;
  drill.reticle.x = Math.max(COURT.left + 30, Math.min(COURT.right - 30, drill.reticle.x));
}

export function updateDrill(drill, dt, input) {
  if (!drill.running) return;
  drill.gradeLife = Math.max(0, drill.gradeLife - dt);
  drill.paddle.swing = Math.max(0, drill.paddle.swing - dt * 5);

  if (drill.phase === "ready") {
    if (input.hit) startDrillRound(drill);
    return;
  }

  if (drill.phase === "charge") {
    updateTargetAim(drill, input, dt);
    if (input.hold) {
      drill.meter = Math.min(1, drill.meter + dt * 0.85);
    } else if (!input.hit) {
      drill.meter = Math.max(0, drill.meter - dt * 1.4);
    }
    if (input.hit) launchDrillBall(drill);
    return;
  }

  if (drill.phase === "flight") {
    const b = drill.ball;
    const wasInAir = b.z > 0;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vz -= GRAVITY * dt;
    b.z += b.vz * dt;
    if (wasInAir && b.z <= 0) {
      b.z = 0;
      drill.landing = { x: b.x, y: b.y };
      const dist = Math.hypot(b.x - drill.goal.x, b.y - drill.goal.y);
      const inZone = dist <= drill.goal.r;
      const tier = dist < drill.goal.r * 0.45 ? 1 : inZone ? 0.6 : 0.2;
      const gradeMult = drill.grade === "perfect" ? 1 : drill.grade === "good" ? 0.7 : 0.45;
      drill.points = Math.round(10 * tier * gradeMult);
      drill.attempts += 1;
      if (inZone) drill.hits += 1;
      drill.score += drill.points;
      drill.streak = inZone ? drill.streak + 1 : 0;
      drill.best = Math.max(drill.best, drill.score);
      drill.phase = "result";
      drill.resultTimer = 1.3;
    }
    return;
  }

  if (drill.phase === "result") {
    if (input.hit) {
      resetDrill(drill);
      startDrillRound(drill);
    } else if (drill.resultTimer > 0) {
      drill.resultTimer = Math.max(0, drill.resultTimer - dt);
      if (drill.resultTimer === 0) resetDrill(drill);
    }
  }
}

export function drillScoreLine(drill) {
  if (!drill.grade) return "—";
  const gradeLabel = drill.grade === "perfect"
    ? "PERFECT ⭐"
    : drill.grade === "good"
      ? "GOOD"
      : "EARLY";
  return `${gradeLabel} · ${drill.points}`;
}