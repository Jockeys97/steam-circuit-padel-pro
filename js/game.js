import { BALANCE, COURT, EVENT_LINES } from "./data.js?v=20260720-ball-physics-v1";
import { clamp } from "./render.js?v=20260721-net-physics-v1";

const SERVICE_LINE_OFFSET = 126;
const SERVICE_TOP = COURT.netY - SERVICE_LINE_OFFSET;
const SERVICE_BOTTOM = COURT.netY + SERVICE_LINE_OFFSET;
const POINTS = ["0", "15", "30", "40"];

export function createPaddle(x, y, isPlayer, profile) {
  const stats = profile.stats ?? { speed: 1, control: 1, reach: 1 };
  return {
    x,
    y,
    w: BALANCE.basePaddleWidth * (isPlayer ? 0.86 + stats.control * 0.14 : 0.94),
    h: 16,
    speed: profile.speed ?? BALANCE.basePaddleSpeed * stats.speed,
    reach: 46 * (isPlayer ? stats.reach ?? 1 : 1),
    swing: 0,
    swingSide: 1,
    motion: 0,
    isPlayer,
    dashTimer: 0,
    hitCooldown: 0,
    controlled: profile.controlled ?? false,
    role: profile.role ?? "back",
  };
}

export function createBall() {
  return {
    x: (COURT.left + COURT.right) / 2,
    y: COURT.bottom - 80,
    z: 36,
    r: 11,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    backspin: 0,
    bouncePulse: 0,
    netCord: 0,
    netFaultOwner: null,
    serveTouchedNet: false,
    served: false,
    serveInFlight: false,
    serveTargetSide: "left",
    serveTargetX: (COURT.left + COURT.right) / 2,
    serveTargetY: COURT.netY,
    bounces: { player: 0, ai: 0 },
  };
}

function other(side) {
  return side === "player" ? "ai" : "player";
}

function courtSide(y) {
  return y > COURT.netY ? "player" : "ai";
}

function pointLabel(own, opponent) {
  if (own >= 3 && opponent >= 3) {
    if (own === opponent) return "40";
    return own > opponent ? "AD" : "40";
  }
  return POINTS[Math.min(own, 3)];
}

function syncPointDisplay(state) {
  state.playerScore = state.tieBreak ? String(state.tieBreakPoints.player) : pointLabel(state.points.player, state.points.ai);
  state.aiScore = state.tieBreak ? String(state.tieBreakPoints.ai) : pointLabel(state.points.ai, state.points.player);
}

export function createMatchState(mode, athlete, arena, aiProfile, tournamentRound = 0) {
  const state = {
    mode,
    athlete,
    arena,
    ai: aiProfile,
    tournamentRound,
    points: { player: 0, ai: 0 },
    games: { player: 0, ai: 0 },
    sets: { player: 0, ai: 0 },
    tieBreak: false,
    tieBreakPoints: { player: 0, ai: 0 },
    playerScore: "0",
    aiScore: "0",
    combo: 1,
    rallyHits: 0,
    specialCooldown: 0,
    specialReady: 1,
    serveSide: "player",
    serveCourt: "right",
    serveAttempts: 0,
    serving: true,
    serveTimer: 0.9,
    serviceReceiverKey: null,
    aiServiceReceiverKey: null,
    pointPause: 0,
    pointMessage: "",
    flash: 0,
    shieldTimer: 0,
    wallEventTimer: 0,
    paused: false,
    running: false,
    lastTime: 0,
    elapsed: 0,
    events: [],
    result: null,
    player: createPaddle((COURT.left + COURT.right) / 2, COURT.bottom - 52, true, { stats: athlete.stats, controlled: true }),
    playerMate: createPaddle((COURT.left + COURT.right) / 2, COURT.netY + 88, true, { stats: athlete.stats, role: "net" }),
    opponent: createPaddle((COURT.left + COURT.right) / 2, COURT.top + 76, false, { speed: aiProfile.speed, role: "back" }),
    opponentMate: createPaddle((COURT.left + COURT.right) / 2, COURT.netY - 84, false, { speed: aiProfile.speed * 1.05, role: "net" }),
    ball: createBall(),
    aiTargetX: (COURT.left + COURT.right) / 2,
    aiReactionDelay: 0,
    aiPrimaryKey: "opponent",
    aiTeamShape: "defend",
    playerSwingBuffer: 0,
    queuedShotPower: 1,
    queuedShotAim: 0,
    queuedShotSlice: false,
    shotCharge: 0,
    shotAim: 0,
    activePlayerKey: "player",
    switchCooldown: 0,
    receiverLocked: false,
    manualReceiverOverride: false,
    manualMovementTimer: 0,
    receiverSwitchFlash: 0,
  };
  prepareServe(state);
  return state;
}

export function addEvent(state, message) {
  state.events.unshift(message);
  if (state.events.length > 5) state.events.pop();
}

function serveTargetX(state) {
  const width = COURT.right - COURT.left;
  const isRightCourt = state.serveCourt === "right";
  return COURT.left + width * (isRightCourt ? 0.28 : 0.72);
}

function serviceOriginX(state) {
  const width = COURT.right - COURT.left;
  // Il battitore parte vicino alla T: resta nel proprio quadrante, ma non serve dalla recinzione laterale.
  return COURT.left + width * (state.serveCourt === "right" ? 0.61 : 0.39);
}

function serviceCourtBounds(state, paddle) {
  const middle = (COURT.left + COURT.right) / 2;
  const padding = paddle.w / 2 + 14;
  return state.serveCourt === "right"
    ? { min: middle + padding, max: COURT.right - padding }
    : { min: COURT.left + padding, max: middle - padding };
}

function partnerServiceX(state) {
  const width = COURT.right - COURT.left;
  return COURT.left + width * (state.serveCourt === "right" ? 0.31 : 0.69);
}

function resetPaddleForServe(paddle, x, y) {
  paddle.x = x;
  paddle.y = y;
  paddle.dashTimer = 0;
  paddle.hitCooldown = 0;
  paddle.swing = 0;
  paddle.swingSide = 1;
  paddle.motion = 0;
}

function serviceReceiverKey(state) {
  return state.ball.serveTargetSide === "left" ? "player" : "playerMate";
}

function prepareOpponentServeReception(state) {
  const width = COURT.right - COURT.left;
  const leftX = COURT.left + width * 0.28;
  const rightX = COURT.left + width * 0.72;

  // In doubles each receiver owns one diagonal for the whole game.
  resetPaddleForServe(state.player, leftX, COURT.bottom - 74);
  resetPaddleForServe(state.playerMate, rightX, COURT.bottom - 74);
  state.serviceReceiverKey = serviceReceiverKey(state);

  if (state.activePlayerKey !== state.serviceReceiverKey) {
    setActivePlayer(state, state.serviceReceiverKey);
    state.receiverSwitchFlash = 0.65;
  }
  state.receiverLocked = true;
  state.manualReceiverOverride = false;
}

function prepareAiServeReception(state) {
  const width = COURT.right - COURT.left;
  resetPaddleForServe(state.opponent, COURT.left + width * 0.28, COURT.top + 74);
  resetPaddleForServe(state.opponentMate, COURT.left + width * 0.72, COURT.top + 74);
  state.aiServiceReceiverKey = state.ball.serveTargetSide === "left" ? "opponent" : "opponentMate";
}

function preparePlayerServeFormation(state) {
  resetPaddleForServe(state.player, serviceOriginX(state), COURT.bottom - 78);
  resetPaddleForServe(state.playerMate, partnerServiceX(state), COURT.netY + 62);
  if (state.activePlayerKey !== "player") setActivePlayer(state, "player");
}

function prepareAiServeFormation(state) {
  resetPaddleForServe(state.opponent, serviceOriginX(state), COURT.top + 78);
  resetPaddleForServe(state.opponentMate, partnerServiceX(state), COURT.netY - 62);
}

function activePlayer(state) {
  return state[state.activePlayerKey];
}

function setActivePlayer(state, key, manual = false) {
  if (state.activePlayerKey === key) return;
  state.activePlayerKey = key;
  state.player.controlled = key === "player";
  state.playerMate.controlled = key === "playerMate";
  state.switchCooldown = manual ? 0.7 : 0.28;
  const position = state[key].y > COURT.netY + 150 ? "di fondo" : "a rete";
  addEvent(state, `Controlli il giocatore ${position}.`);
}

function reflectedCourtX(x) {
  const min = COURT.left + 24;
  const max = COURT.right - 24;
  let reflected = x;
  while (reflected < min || reflected > max) {
    if (reflected < min) reflected = min + (min - reflected);
    if (reflected > max) reflected = max - (reflected - max);
  }
  return reflected;
}

function responderForecast(paddle, ball) {
  if (ball.vy <= 0) return { score: Infinity, reachable: false };
  const contactY = clamp(paddle.y, COURT.netY + 42, COURT.bottom - 42);
  const time = (contactY - ball.y) / ball.vy;
  if (time < 0.04 || time > 1.65) return { score: Infinity, reachable: false };

  const contactX = reflectedCourtX(ball.x + ball.vx * time);
  const contactZ = Math.max(0, ball.z + ball.vz * time - 0.5 * BALANCE.ballGravity * time * time);
  const horizontalReach = paddle.w * 0.78 + ball.r;
  const travelDistance = Math.max(0, Math.abs(contactX - paddle.x) - horizontalReach);
  const travelTime = travelDistance / paddle.speed;
  const lateBy = Math.max(0, travelTime - time);
  const heightPenalty = contactZ > BALANCE.playableHitHeight
    ? 1.4 + (contactZ - BALANCE.playableHitHeight) / 80
    : 0;

  return {
    score: travelTime + lateBy * 3.2 + heightPenalty,
    reachable: lateBy <= 0.1 && contactZ <= BALANCE.playableHitHeight + 12,
  };
}

function bestResponder(state) {
  const back = responderForecast(state.player, state.ball);
  const net = responderForecast(state.playerMate, state.ball);
  return back.score <= net.score
    ? { key: "player", forecast: back, alternate: net }
    : { key: "playerMate", forecast: net, alternate: back };
}

function lockReceiverForIncomingShot(state, isServe = false) {
  if (state.ball.vy <= 0) return;
  const choice = bestResponder(state);
  let key = isServe ? (state.serviceReceiverKey ?? serviceReceiverKey(state)) : choice.key;
  const currentForecast = responderForecast(activePlayer(state), state.ball);
  const isCloseDecision = currentForecast.score <= choice.forecast.score + 0.1;
  if (!isServe && state.manualMovementTimer > 0 && currentForecast.reachable && isCloseDecision) {
    key = state.activePlayerKey;
  }
  if (key !== state.activePlayerKey) {
    setActivePlayer(state, key);
    state.receiverSwitchFlash = 0.65;
  }
  state.receiverLocked = true;
  state.manualReceiverOverride = false;
}

function updateActivePlayer(state, dt, forceSwitch) {
  state.switchCooldown = Math.max(0, state.switchCooldown - dt);
  if (!forceSwitch) return;
  if (state.serviceReceiverKey) {
    addEvent(state, "Ricevitore bloccato sul diagonale fino alla risposta.");
    return;
  }
  setActivePlayer(state, state.activePlayerKey === "player" ? "playerMate" : "player", true);
  state.receiverSwitchFlash = 0;
  if (state.receiverLocked || state.ball.vy > 0) {
    state.receiverLocked = true;
    state.manualReceiverOverride = true;
  }
}

export function prepareServe(state) {
  const isPlayer = state.serveSide === "player";
  state.serviceReceiverKey = null;
  state.aiServiceReceiverKey = null;
  state.receiverLocked = false;
  state.manualReceiverOverride = false;
  state.ball = createBall();
  state.ball.serveTargetSide = state.serveCourt === "right" ? "left" : "right";
  if (isPlayer) {
    preparePlayerServeFormation(state);
    prepareAiServeReception(state);
  } else {
    prepareAiServeFormation(state);
    prepareOpponentServeReception(state);
  }
  const server = isPlayer ? state.player : state.opponent;
  state.ball.x = server.x + (isPlayer ? 28 : -28);
  state.ball.y = isPlayer ? server.y - 24 : server.y + 24;
  state.ball.z = 34;
  state.serving = true;
  state.serveTimer = state.serveSide === "ai" ? 0.75 : 0;
}

export function performServe(state, requestedCharge = null, slice = false) {
  const { ball } = state;
  const isPlayer = state.serveSide === "player";
  const server = isPlayer ? state.player : state.opponent;
  const charge = clamp(requestedCharge ?? (isPlayer ? state.shotCharge : 0.62), 0, 1);
  const serviceBoxDepth = SERVICE_LINE_OFFSET * (0.24 + charge * 0.52);
  const targetY = isPlayer ? COURT.netY - serviceBoxDepth : COURT.netY + serviceBoxDepth;
  const time = 1.02 - charge * 0.24;
  const dragRate = -60 * Math.log(BALANCE.airDrag);
  const dragDistanceFactor = dragRate > 0.0001
    ? (1 - Math.exp(-dragRate * time)) / (dragRate * time)
    : 1;
  const dragCompensation = 1 / dragDistanceFactor;
  const targetX = serveTargetX(state);
  ball.serveTargetSide = state.serveCourt === "right" ? "left" : "right";
  ball.serveTargetX = targetX;
  ball.serveTargetY = targetY;
  if (isPlayer) prepareAiServeReception(state);
  else prepareOpponentServeReception(state);
  ball.vx = ((targetX - ball.x) / time) * dragCompensation;
  ball.vy = ((targetY - ball.y) / time) * dragCompensation;
  ball.vz = BALANCE.ballGravity * time * 0.5 - ball.z / time + 18 + (1 - charge) * 18;
  ball.spin = (state.serveCourt === "right" ? -1 : 1) * 14;
  ball.backspin = slice ? 0.75 : 0;
  if (slice) ball.spin *= 1.8;
  ball.served = true;
  ball.serveInFlight = true;
  ball.serveTouchedNet = false;
  ball.netFaultOwner = null;
  ball.bounces = { player: 0, ai: 0 };
  state.serving = false;
  state.rallyHits = 0;
  state.combo = 1;
  server.swing = 1;
  server.swingSide = state.serveCourt === "right" ? -1 : 1;
  if (!isPlayer) lockReceiverForIncomingShot(state, true);
}

function canHit(paddle, ball) {
  // The returner must let a serve bounce in the diagonal service box.
  if (ball.serveInFlight || ball.netFaultOwner) return false;
  const withinX = Math.abs(ball.x - paddle.x) < paddle.w * 0.78 + ball.r;
  const withinY = Math.abs(ball.y - paddle.y) < paddle.reach * 1.3;
  const incoming = paddle.isPlayer ? ball.vy > 0 : ball.vy < 0;
  return withinX && withinY && incoming && ball.z <= BALANCE.playableHitHeight;
}

function crossedPaddle(paddle, ball, previousBall) {
  if (!previousBall || ball.z > BALANCE.playableHitHeight) return false;
  const crossedY = paddle.isPlayer
    ? previousBall.y <= paddle.y && ball.y >= paddle.y
    : previousBall.y >= paddle.y && ball.y <= paddle.y;
  if (!crossedY) return false;
  const distance = ball.y - previousBall.y;
  if (Math.abs(distance) < 0.001) return false;
  const t = clamp((paddle.y - previousBall.y) / distance, 0, 1);
  const contactX = previousBall.x + (ball.x - previousBall.x) * t;
  return Math.abs(contactX - paddle.x) <= paddle.w * 0.78 + ball.r;
}

function hitPowerProfile(paddle, state, power) {
  return paddle.isPlayer ? power * state.athlete.stats.power : power * state.ai.power;
}

function chooseSafeTarget(state, paddle) {
  const opponentSide = paddle.isPlayer ? "ai" : "player";
  const opponents = opponentSide === "ai"
    ? [state.opponent, state.opponentMate]
    : [state.player, state.playerMate];
  const coverageX = (opponents[0].x + opponents[1].x) / 2;
  const centerX = (COURT.left + COURT.right) / 2;
  const safeMargin = 118;
  const sideBias = coverageX <= centerX ? 1 : -1;
  const accuracy = paddle.isPlayer ? state.athlete.stats.control : state.ai.skill;
  const controlledError = (1 - accuracy) * 34;
  const x = clamp(
    centerX + sideBias * 118 + (Math.random() - 0.5) * controlledError,
    COURT.left + safeMargin,
    COURT.right - safeMargin,
  );
  const y = opponentSide === "ai"
    ? COURT.netY - 116
    : COURT.netY + 116;
  return { x, y };
}

function applySafeComputerShot(state, paddle) {
  const { ball } = state;
  ball.backspin = 0;
  const target = chooseSafeTarget(state, paddle);
  const flightTime = ball.z > 64 ? 0.82 : 0.96;
  ball.vx = clamp((target.x - ball.x) / flightTime, -285, 285);
  ball.vy = clamp((target.y - ball.y) / flightTime, -355, 355);
  ball.vz = Math.max(225, (BALANCE.ballGravity * flightTime * flightTime * 0.5 - ball.z) / flightTime);
  ball.spin = clamp(ball.vx * 0.08, -24, 24);
}

export function hitBall(state, paddle, power = 1, isSpecial = false, forceContact = false, aim = 0, slice = false) {
  const { ball, athlete } = state;
  if (paddle.hitCooldown > 0 || (!forceContact && !canHit(paddle, ball))) return false;

  const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
  const powerMul = hitPowerProfile(paddle, state, power);
  const control = paddle.isPlayer ? athlete.stats.control : 0.92 + state.ai.skill * 0.1;
  const direction = paddle.isPlayer ? -1 : 1;
  ball.y = paddle.y + direction * (ball.r + 6);
  ball.z = Math.max(22, Math.min(ball.z, 74));
  if (paddle.controlled) {
    const shotPower = clamp(powerMul, 0.34, 1.5);
    const aimedOffset = clamp(aim * control + offset * 0.24, -1, 1);
    ball.vx = aimedOffset * 300 * control * shotPower + ball.spin * BALANCE.spinInfluence;
    ball.vy = direction * (slice ? 210 + shotPower * 115 : 220 + shotPower * 120);
    ball.vz = slice ? 170 + shotPower * 72 : 195 + shotPower * 90;
    ball.spin = aimedOffset * 45 * control;
    ball.backspin = slice ? 0.65 + shotPower * 0.35 : 0;
    if (slice) addEvent(state, "Slice: traiettoria bassa e rimbalzo tagliato.");
    if (isSpecial) applySpecial(state, aimedOffset, paddle);
    state.receiverLocked = false;
    state.manualReceiverOverride = false;
    state.serviceReceiverKey = null;
  } else {
    applySafeComputerShot(state, paddle);
    if (!paddle.isPlayer) {
      state.aiPrimaryKey = paddle === state.opponent ? "opponent" : "opponentMate";
      state.aiServiceReceiverKey = null;
      lockReceiverForIncomingShot(state);
    }
  }
  ball.serveInFlight = false;
  ball.serveTouchedNet = false;
  ball.netFaultOwner = null;
  ball.netCord = 0;
  ball.bounces = { player: 0, ai: 0 };

  paddle.swing = 1;
  paddle.swingSide = (paddle.controlled ? aim : offset) < -0.08 ? -1 : 1;
  paddle.hitCooldown = paddle.isPlayer ? BALANCE.hitCooldownPlayer : BALANCE.hitCooldownAi;
  state.rallyHits += 1;
  state.combo = Math.min(BALANCE.comboMax, 1 + Math.floor(state.rallyHits / BALANCE.comboStep));
  state.flash = 0.65;
  if (state.rallyHits > 0 && state.rallyHits % 5 === 0) addEvent(state, EVENT_LINES[Math.floor(Math.random() * EVENT_LINES.length)]);
  return true;
}

function applySpecial(state, offset, paddle) {
  const { athlete, ball } = state;
  if (athlete.id === "maestro") {
    ball.vx = offset * 480;
    ball.vy = -470;
    ball.vz = 325;
    addEvent(state, "Colpo di Precisione: angolo chirurgico!");
  } else if (athlete.id === "pantera") {
    paddle.dashTimer = 0.26;
    ball.vy = -455;
    ball.vz = 300;
    addEvent(state, "Scatto Fulmineo: volée letale!");
  } else if (athlete.id === "steamer") {
    ball.vx = offset * 250;
    ball.vy = -520;
    ball.vz = 410;
    addEvent(state, "Smash a Vapore: palla alta e profonda!");
  } else if (athlete.id === "fiamma") {
    state.shieldTimer = 2.2;
    ball.vy = -410;
    ball.vz = 280;
    addEvent(state, "Scudo di Vapore: difesa e controattacco!");
  }
}

export function trySpecial(state) {
  if (state.specialCooldown > 0 || state.specialReady < BALANCE.specialMinCharge) return;
  const hit = hitBall(state, activePlayer(state), 1.15, true);
  if (hit) {
    state.specialCooldown = state.athlete.special.cooldown;
    state.specialReady = 0;
  } else if (state.athlete.id === "fiamma" && state.ball.vy > 0) {
    state.shieldTimer = 2.4;
    state.specialCooldown = state.athlete.special.cooldown;
    state.specialReady = 0;
    addEvent(state, "Scudo di Vapore: pressione assorbita!");
  }
}

function gameWon(points, opponent) {
  return points >= 4 && points - opponent >= 2;
}

function finishSet(state, winner) {
  state.sets[winner] += 1;
  state.games = { player: 0, ai: 0 };
  state.tieBreak = false;
  state.tieBreakPoints = { player: 0, ai: 0 };
  addEvent(state, `Set a ${winner === "player" ? "te" : "Circuito"}!`);
  const targetSets = state.mode === "tournament" ? 2 : 1;
  if (state.sets[winner] >= targetSets) state.result = { winner };
}

function finishGame(state, winner) {
  state.games[winner] += 1;
  state.points = { player: 0, ai: 0 };
  const loser = other(winner);
  if (state.games[winner] >= 6 && state.games[winner] - state.games[loser] >= 2) {
    finishSet(state, winner);
  } else if (state.games.player === 6 && state.games.ai === 6) {
    state.tieBreak = true;
    state.tieBreakPoints = { player: 0, ai: 0 };
    addEvent(state, "Tie-break a 7: due punti di scarto.");
  }
  state.serveSide = other(state.serveSide);
  state.serveCourt = "right";
}

function scorePoint(state, winner, reason) {
  const receiver = other(state.serveSide);
  if (reason) addEvent(state, reason);
  if (state.tieBreak) {
    state.tieBreakPoints[winner] += 1;
    if (state.tieBreakPoints[winner] >= 7 && state.tieBreakPoints[winner] - state.tieBreakPoints[other(winner)] >= 2) finishSet(state, winner);
  } else {
    state.points[winner] += 1;
    if (gameWon(state.points[winner], state.points[other(winner)])) finishGame(state, winner);
  }
  state.combo = 1;
  state.rallyHits = 0;
  state.receiverLocked = false;
  state.manualReceiverOverride = false;
  state.serviceReceiverKey = null;
  state.aiServiceReceiverKey = null;
  state.serveAttempts = 0;
  state.serveCourt = state.serveCourt === "right" ? "left" : "right";
  syncPointDisplay(state);
  if (!state.result) {
    state.pointPause = 1.4;
    state.pointMessage = `${winner === "player" ? "PUNTO TUO" : "PUNTO AVVERSARIO"}${reason ? ` · ${reason}` : ""}`;
  }
  return receiver;
}

function serveFault(state, reason) {
  if (state.serveAttempts === 0) {
    state.serveAttempts = 1;
    addEvent(state, `${reason} Seconda di servizio.`);
    prepareServe(state);
    return;
  }
  scorePoint(state, other(state.serveSide), `Doppio fallo: ${reason.toLowerCase()}`);
}

function serveLet(state) {
  state.ball.serveInFlight = false;
  state.pointPause = 1;
  state.pointMessage = "LET · Servizio da ripetere";
  addEvent(state, "Let: nastro e rimbalzo nel riquadro corretto. Servizio da ripetere.");
}

function validServiceBounce(state, side) {
  const { ball } = state;
  const receiver = other(state.serveSide);
  if (side !== receiver) return false;
  const inDepth = receiver === "ai"
    ? ball.y >= SERVICE_TOP && ball.y < COURT.netY
    : ball.y > COURT.netY && ball.y <= SERVICE_BOTTOM;
  const isLeft = ball.x < (COURT.left + COURT.right) / 2;
  return inDepth && (ball.serveTargetSide === "left" ? isLeft : !isLeft);
}

function handleGroundBounce(state, impactVz, remainingTime) {
  const { ball } = state;
  const side = courtSide(ball.y);
  if (ball.netFaultOwner) {
    scorePoint(state, other(ball.netFaultOwner), "Rete: la palla è ricaduta nel campo di chi ha colpito.");
    return true;
  }
  if (ball.y < COURT.top || ball.y > COURT.bottom) {
    scorePoint(state, other(side), "Palla fuori dal campo.");
    return true;
  }
  if (ball.serveInFlight) {
    if (!validServiceBounce(state, side)) {
      serveFault(state, "Servizio fuori dal riquadro diagonale.");
      return true;
    }
    if (ball.serveTouchedNet) {
      serveLet(state);
      return true;
    }
    ball.serveInFlight = false;
    ball.bounces[side] = 1;
    addEvent(state, "Servizio valido: rimbalzo nel riquadro opposto.");
  } else {
    ball.bounces[side] += 1;
    if (ball.bounces[side] > 1) {
      scorePoint(state, other(side), "Secondo rimbalzo: punto perso.");
      return true;
    }
  }
  const impactSpeed = Math.abs(impactVz);
  const speedFactor = clamp(impactSpeed / 520, 0, 1);
  const sliceAmount = clamp(ball.backspin ?? 0, 0, 1.2);
  const restitution = (BALANCE.groundRestitution + BALANCE.groundRestitutionBoost * speedFactor)
    * (1 - sliceAmount * 0.28);
  const minimumBounce = BALANCE.minimumBounceVz * (1 - sliceAmount * 0.26);
  const reboundVz = Math.max(minimumBounce, impactSpeed * restitution);
  ball.vx = (ball.vx + ball.spin * BALANCE.groundSpinTransfer) * BALANCE.groundTangentialDamping;
  ball.vy *= BALANCE.groundTangentialDamping * (1 - sliceAmount * 0.14);
  ball.spin *= 0.7;
  ball.backspin *= 0.35;
  ball.z = Math.max(0, reboundVz * remainingTime - 0.5 * BALANCE.ballGravity * remainingTime * remainingTime);
  ball.vz = reboundVz - BALANCE.ballGravity * remainingTime;
  ball.bouncePulse = 1;
  return false;
}

function handleWalls(state) {
  const { ball } = state;
  const side = courtSide(ball.y);
  const hasBounced = ball.bounces[side] > 0;
  const hitSideWall = ball.x - ball.r < COURT.left || ball.x + ball.r > COURT.right;
  const hitBackWall = ball.y - ball.r < COURT.top || ball.y + ball.r > COURT.bottom;
  if (!hitSideWall && !hitBackWall) return false;
  if (!hasBounced) {
    if (ball.serveInFlight) serveFault(state, "La palla ha colpito il vetro prima del rimbalzo");
    else scorePoint(state, other(side), "Parete avversaria colpita senza rimbalzo.");
    return true;
  }
  if (hitSideWall) {
    ball.x = clamp(ball.x, COURT.left + ball.r, COURT.right - ball.r);
    ball.vx *= -state.arena.wallBounce;
    ball.vy *= BALANCE.wallTangentialDamping;
  }
  if (hitBackWall) {
    ball.y = clamp(ball.y, COURT.top + ball.r, COURT.bottom - ball.r);
    ball.vy *= -state.arena.wallBounce;
    ball.vx *= BALANCE.wallTangentialDamping;
  }
  ball.spin *= -0.45;
  if (state.wallEventTimer <= 0) {
    addEvent(state, "Vetro valido dopo il rimbalzo!");
    state.wallEventTimer = BALANCE.wallEventCooldown;
  }
  return false;
}

function handleNetCollision(state, previousBall) {
  const { ball } = state;
  const deltaY = ball.y - previousBall.y;
  const crossed = (previousBall.y - COURT.netY) * (ball.y - COURT.netY) <= 0;
  if (!crossed || Math.abs(deltaY) < 0.01) return false;

  const crossingT = clamp((COURT.netY - previousBall.y) / deltaY, 0, 1);
  const contactZ = previousBall.z + (ball.z - previousBall.z) * crossingT;
  const touchesNet = contactZ <= BALANCE.netClearance + ball.r * 0.35;
  if (!touchesNet) return false;

  const direction = Math.sign(deltaY) || Math.sign(ball.vy) || 1;
  const speed = Math.abs(ball.vy);
  const tapeContact = contactZ >= BALANCE.netClearance - 6 && speed >= 250;
  ball.netCord = 1;
  ball.bouncePulse = Math.max(ball.bouncePulse, 0.72);

  if (tapeContact) {
    ball.y = COURT.netY + direction * (ball.r + 2);
    ball.z = Math.max(BALANCE.netClearance - 2, contactZ);
    ball.vx *= 0.78;
    ball.vy *= 0.48;
    ball.vz = Math.max(42, ball.vz * 0.3);
    if (ball.serveInFlight) ball.serveTouchedNet = true;
    addEvent(state, "Nastro: la palla rallenta e ricade oltre la rete.");
    return false;
  }

  ball.y = COURT.netY - direction * (ball.r + 2);
  ball.z = Math.max(2, contactZ);
  ball.vx *= 0.58;
  ball.vy *= -0.18;
  ball.vz = Math.max(20, Math.abs(ball.vz) * 0.14);
  if (ball.serveInFlight) {
    ball.serveTouchedNet = true;
  } else {
    ball.netFaultOwner = direction < 0 ? "player" : "ai";
  }
  addEvent(state, "Rete piena: la palla viene respinta e perde velocità.");
  return false;
}

function roleBounds(paddle) {
  if (paddle.isPlayer) {
    return paddle.role === "net"
      ? { minY: COURT.netY + 42, maxY: COURT.netY + 158 }
      : { minY: COURT.netY + 158, maxY: COURT.bottom - 42 };
  }
  return paddle.role === "net"
    ? { minY: COURT.netY - 158, maxY: COURT.netY - 42 }
    : { minY: COURT.top + 42, maxY: COURT.netY - 158 };
}

function paddleDistance(paddle, ball) {
  return Math.abs(paddle.x - ball.x) + Math.abs(paddle.y - ball.y) * 1.35;
}

function moveComputerPaddle(paddle, ball, dt, homeY, accuracy) {
  const startX = paddle.x;
  const startY = paddle.y;
  const incoming = paddle.isPlayer ? ball.vy > 0 : ball.vy < 0;
  const { minY, maxY } = roleBounds(paddle);
  const ballOnOwnSide = paddle.isPlayer ? ball.y > COURT.netY : ball.y < COURT.netY;
  const shift = paddle.isPlayer ? -16 : 16;
  const targetY = incoming && ballOnOwnSide ? clamp(ball.y + shift, minY, maxY) : homeY;
  const targetX = incoming && ballOnOwnSide
    ? ball.x + (Math.random() - 0.5) * (1 - accuracy) * 20
    : (COURT.left + COURT.right) / 2;
  paddle.x = clamp(paddle.x + clamp(targetX - paddle.x, -paddle.speed * dt, paddle.speed * dt), COURT.left + paddle.w / 2, COURT.right - paddle.w / 2);
  paddle.y = clamp(paddle.y + clamp(targetY - paddle.y, -paddle.speed * 0.56 * dt, paddle.speed * 0.56 * dt), minY, maxY);
  paddle.motion = Math.abs(paddle.x - startX) + Math.abs(paddle.y - startY) > 0.4
    ? 1
    : Math.max(0, paddle.motion - dt * 7);
}

function movePaddleTo(paddle, targetX, targetY, dt) {
  const startX = paddle.x;
  const startY = paddle.y;
  paddle.x = clamp(
    paddle.x + clamp(targetX - paddle.x, -paddle.speed * dt, paddle.speed * dt),
    COURT.left + paddle.w / 2,
    COURT.right - paddle.w / 2,
  );
  paddle.y = clamp(
    paddle.y + clamp(targetY - paddle.y, -paddle.speed * 0.56 * dt, paddle.speed * 0.56 * dt),
    COURT.top + 42,
    COURT.netY - 42,
  );
  paddle.motion = Math.abs(paddle.x - startX) + Math.abs(paddle.y - startY) > 0.4
    ? 1
    : Math.max(0, paddle.motion - dt * 7);
}

function moveOpponentTeam(state, dt) {
  const { ball, opponent, opponentMate } = state;
  const centerX = (COURT.left + COURT.right) / 2;
  const courtWidth = COURT.right - COURT.left;
  const predictedX = clamp(ball.x + ball.vx * 0.16, COURT.left + 72, COURT.right - 72);
  const targetBall = { x: predictedX, y: ball.y };
  const currentPrimary = state[state.aiPrimaryKey] ?? opponent;
  const alternate = currentPrimary === opponent ? opponentMate : opponent;

  if (paddleDistance(alternate, targetBall) + 38 < paddleDistance(currentPrimary, targetBall)) {
    state.aiPrimaryKey = alternate === opponent ? "opponent" : "opponentMate";
  }

  const primary = state[state.aiPrimaryKey];
  const support = primary === opponent ? opponentMate : opponent;
  const ballOnAiSide = ball.y < COURT.netY;
  const defending = ballOnAiSide && ball.vy < 0;
  const attacking = !ballOnAiSide && ball.vy > 0 && (state.rallyHits > 0 || ball.served) && ball.z < 165;
  const minSeparation = courtWidth * 0.19;
  let primaryTargetX = predictedX;
  let supportTargetX = predictedX < centerX
    ? centerX + courtWidth * 0.22
    : centerX - courtWidth * 0.22;

  if (Math.abs(primaryTargetX - supportTargetX) < minSeparation) {
    const coverDirection = primaryTargetX < centerX ? 1 : -1;
    supportTargetX = clamp(
      primaryTargetX + coverDirection * minSeparation,
      COURT.left + 72,
      COURT.right - 72,
    );
  }

  let primaryTargetY;
  let supportTargetY;
  if (defending) {
    primaryTargetY = clamp(ball.y - 16, COURT.top + 68, COURT.netY - 72);
    supportTargetY = clamp(primaryTargetY - 18, COURT.top + 64, COURT.netY - 82);
    state.aiTeamShape = "defend";
  } else if (attacking) {
    primaryTargetY = COURT.netY - 68;
    supportTargetY = COURT.netY - 86;
    state.aiTeamShape = "attack";
  } else {
    primaryTargetY = COURT.top + 88;
    supportTargetY = COURT.top + 94;
    state.aiTeamShape = "reset";
  }

  movePaddleTo(primary, primaryTargetX, primaryTargetY, dt);
  movePaddleTo(support, supportTargetX, supportTargetY, dt);
}

function updateDoublesAI(state, dt) {
  if (state.serving) return;
  const { ball, opponent, opponentMate, ai } = state;
  const inactiveTeamMate = state.activePlayerKey === "player" ? state.playerMate : state.player;
  const inactiveHomeY = inactiveTeamMate.role === "net" ? COURT.netY + 92 : COURT.bottom - 86;
  if (state.serviceReceiverKey) {
    const width = COURT.right - COURT.left;
    const receptionX = inactiveTeamMate === state.player
      ? COURT.left + width * 0.28
      : COURT.left + width * 0.72;
    const receptionY = COURT.bottom - 74;
    inactiveTeamMate.x += clamp(receptionX - inactiveTeamMate.x, -inactiveTeamMate.speed * dt, inactiveTeamMate.speed * dt);
    inactiveTeamMate.y += clamp(receptionY - inactiveTeamMate.y, -inactiveTeamMate.speed * 0.56 * dt, inactiveTeamMate.speed * 0.56 * dt);
  } else {
    moveComputerPaddle(inactiveTeamMate, ball, dt, inactiveHomeY, state.athlete.stats.control);
  }
  if (state.aiServiceReceiverKey) {
    const width = COURT.right - COURT.left;
    const receiver = state[state.aiServiceReceiverKey];
    [opponent, opponentMate].forEach((paddle) => {
      const receptionX = paddle === opponent
        ? COURT.left + width * 0.28
        : COURT.left + width * 0.72;
      const targetX = paddle === receiver && !ball.serveInFlight ? ball.x : receptionX;
      const receptionY = COURT.top + 74;
      paddle.x += clamp(targetX - paddle.x, -paddle.speed * dt, paddle.speed * dt);
      paddle.y += clamp(receptionY - paddle.y, -paddle.speed * 0.56 * dt, paddle.speed * 0.56 * dt);
    });
  } else {
    moveOpponentTeam(state, dt);
  }

  const hitChance = 0.34 + ai.skill * 0.5;
  const controllableHeight = ball.z <= 88;
  const defenders = state.aiServiceReceiverKey
    ? [state[state.aiServiceReceiverKey]]
    : [opponent, opponentMate].sort((a, b) => paddleDistance(a, ball) - paddleDistance(b, ball));
  const returnOfServe = !ball.serveInFlight && ball.bounces.ai === 1 && ball.vy < 0;
  const responder = defenders.find((paddle) => canHit(paddle, ball));
  const responseChance = returnOfServe ? 0.96 : hitChance;
  if (responder && controllableHeight && Math.random() < responseChance) {
    hitBall(state, responder, 0.88 + ai.skill * 0.12);
  }
}

function updateServing(state, dt, input) {
  const isPlayer = state.serveSide === "player";
  if (isPlayer && state.activePlayerKey !== "player") setActivePlayer(state, "player");
  const server = isPlayer ? activePlayer(state) : state.opponent;
  if (isPlayer) {
    const startX = server.x;
    const startY = server.y;
    if (input.left) server.x -= server.speed * dt;
    if (input.right) server.x += server.speed * dt;
    if (input.up) server.y -= server.speed * 0.58 * dt;
    if (input.down) server.y += server.speed * 0.58 * dt;
    const serviceBounds = serviceCourtBounds(state, server);
    server.x = clamp(server.x, serviceBounds.min, serviceBounds.max);
    // The server must remain behind the service line until the ball is struck.
    server.y = clamp(server.y, SERVICE_BOTTOM + 28, COURT.bottom - 42);
    server.motion = Math.abs(server.x - startX) + Math.abs(server.y - startY) > 0.4
      ? 1
      : Math.max(0, server.motion - dt * 7);
    state.ball.x = server.x + 28;
    state.ball.y = server.y - 24;
    if (input.hit || input.special) {
      performServe(state, state.shotCharge, input.slice);
      state.shotCharge = 0;
      state.shotAim = 0;
      addEvent(state, `${state.serveAttempts ? "Seconda" : "Prima"} di servizio dal basso${input.slice ? " in slice" : ""}: cerca il diagonale.`);
    }
  } else {
    state.serveTimer -= dt;
    server.x += (serviceOriginX(state) - server.x) * Math.min(1, dt * 4);
    state.ball.x = server.x - 28;
    state.ball.y = server.y + 24;
    if (state.serveTimer <= 0) {
      performServe(state);
      addEvent(state, "Servizio avversario: attendi il rimbalzo o gioca la volée.");
    }
  }
}

function updateShotControl(state, dt, input) {
  if (!input.charging) {
    state.shotAim *= Math.max(0, 1 - dt * 8);
    return;
  }
  state.shotCharge = Math.min(1, state.shotCharge + dt / 1.05);
  const aimDirection = input.left ? -1 : input.right ? 1 : 0;
  state.shotAim = clamp(state.shotAim + aimDirection * dt * 1.9, -1, 1);
}

function queueChargedShot(state, slice = false) {
  state.queuedShotPower = 0.4 + state.shotCharge * 0.95;
  state.queuedShotAim = state.shotAim;
  state.queuedShotSlice = slice;
  state.shotCharge = 0;
  state.shotAim = 0;
}

export function updateMatch(state, dt, input) {
  if (state.paused || !state.running) return null;
  state.elapsed += dt;
  state.receiverSwitchFlash = Math.max(0, state.receiverSwitchFlash - dt);
  if (state.pointPause > 0) {
    state.pointPause = Math.max(0, state.pointPause - dt);
    if (state.pointPause === 0 && !state.result) prepareServe(state);
    return state.result;
  }
  updateShotControl(state, dt, input);
  const { ball } = state;
  if (state.serving) {
    updateServing(state, dt, input);
    return state.result;
  }

  const movementIntent = (!input.charging && (input.left || input.right)) || input.up || input.down;
  state.manualMovementTimer = movementIntent
    ? 0.18
    : Math.max(0, state.manualMovementTimer - dt);
  updateActivePlayer(state, dt, input.switchPlayer);
  const player = activePlayer(state);
  const playerStartX = player.x;
  const playerStartY = player.y;

  if (!input.charging && input.left) player.x -= player.speed * dt;
  if (!input.charging && input.right) player.x += player.speed * dt;
  if (input.up) player.y -= player.speed * 0.68 * dt;
  if (input.down) player.y += player.speed * 0.68 * dt;
  if (player.dashTimer > 0) {
    player.x += (input.left ? -1 : input.right ? 1 : 0) * 260 * dt;
    player.dashTimer -= dt;
  }
  player.x = clamp(player.x, COURT.left + player.w / 2, COURT.right - player.w / 2);
  const playerMinY = state.serviceReceiverKey ? SERVICE_BOTTOM + 20 : COURT.netY + 42;
  player.y = clamp(player.y, playerMinY, COURT.bottom - 42);
  player.motion = Math.abs(player.x - playerStartX) + Math.abs(player.y - playerStartY) > 0.4
    ? 1
    : Math.max(0, player.motion - dt * 7);
  player.hitCooldown = Math.max(0, player.hitCooldown - dt);
  state.playerMate.hitCooldown = Math.max(0, state.playerMate.hitCooldown - dt);
  state.opponent.hitCooldown = Math.max(0, state.opponent.hitCooldown - dt);
  state.opponentMate.hitCooldown = Math.max(0, state.opponentMate.hitCooldown - dt);
  state.wallEventTimer = Math.max(0, state.wallEventTimer - dt);
  if (input.hit) {
    queueChargedShot(state, input.slice);
    state.playerSwingBuffer = 0.24;
  }
  state.playerSwingBuffer = Math.max(0, state.playerSwingBuffer - dt);
  if (input.special) {
    state.playerSwingBuffer = 0.24;
    trySpecial(state);
  }

  if (state.shieldTimer > 0 && ball.vy > 0) ball.vy *= 1 - dt * 0.55;
  state.shieldTimer = Math.max(0, state.shieldTimer - dt);

  const previousBall = { x: ball.x, y: ball.y, z: ball.z };
  const previousVz = ball.vz;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += previousVz * dt - 0.5 * BALANCE.ballGravity * dt * dt;
  ball.vz = previousVz - BALANCE.ballGravity * dt;
  const airDrag = Math.pow(BALANCE.airDrag, dt * 60);
  ball.vx = (ball.vx + ball.spin * BALANCE.airSpinCurve * dt) * airDrag;
  ball.vy *= airDrag;
  ball.spin *= BALANCE.spinDecay;
  ball.backspin *= Math.pow(0.996, dt * 60);
  ball.bouncePulse = Math.max(0, (ball.bouncePulse ?? 0) - dt * 8.5);
  ball.netCord = Math.max(0, (ball.netCord ?? 0) - dt * 5.5);

  if (state.playerSwingBuffer > 0 && (canHit(player, ball) || crossedPaddle(player, ball, previousBall))) {
    if (hitBall(state, player, state.queuedShotPower, false, true, state.queuedShotAim, state.queuedShotSlice)) {
      state.playerSwingBuffer = 0;
      state.queuedShotSlice = false;
    }
  }
  if (handleNetCollision(state, previousBall)) return state.result;
  if (ball.z <= 0) {
    const discriminant = Math.max(0, previousVz * previousVz + 2 * BALANCE.ballGravity * Math.max(0, previousBall.z));
    const impactTime = clamp((previousVz + Math.sqrt(discriminant)) / BALANCE.ballGravity, 0, dt);
    const impactVz = previousVz - BALANCE.ballGravity * impactTime;
    if (handleGroundBounce(state, impactVz, dt - impactTime)) return state.result;
  }
  if (handleWalls(state)) return state.result;
  updateDoublesAI(state, dt);

  player.swing = Math.max(0, player.swing - dt * 5);
  state.playerMate.swing = Math.max(0, state.playerMate.swing - dt * 5);
  state.opponent.swing = Math.max(0, state.opponent.swing - dt * 5);
  state.opponentMate.swing = Math.max(0, state.opponentMate.swing - dt * 5);
  state.specialCooldown = Math.max(0, state.specialCooldown - dt);
  if (state.specialCooldown <= 0) state.specialReady = Math.min(1, state.specialReady + dt * BALANCE.specialRegen * state.athlete.stats.stamina);
  state.flash = Math.max(0, state.flash - dt * 3);
  return state.result;
}

export function getMatchInfo(state) {
  const match = state.mode === "tournament" ? `Torneo ${state.tournamentRound + 1}/3` : "Partita Rapida";
  const games = state.tieBreak
    ? `Tie-break ${state.tieBreakPoints.player}-${state.tieBreakPoints.ai}`
    : `Set ${state.sets.player + state.sets.ai + 1} · Giochi ${state.games.player}-${state.games.ai}`;
  return `${match} · ${games}`;
}
