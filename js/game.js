import { BALANCE, COURT, EVENT_LINES } from "./data.js?v=20260811-opponent-scale-v6";
import { clamp } from "./render.js?v=20260811-opponent-scale-v6";
import { sfx } from "./audio.js?v=20260811-shot-physics-v1";
import { t } from "./i18n.js?v=20260811-opponent-scale-v6";
import {
  emitBurst,
  emitDust,
  emitSparks,
  emitSteam,
  resetFx,
  updateFx,
} from "./fx.js?v=20260811-shot-physics-v1";

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
    actionPose: 0,
    actionIntent: "drive",
    motion: 0,
    moveRatio: 0,
    runPhase: 0,
    isPlayer,
    dashTimer: 0,
    hitCooldown: 0,
    controlled: profile.controlled ?? false,
    role: profile.role ?? "back",
    skill: profile.skill ?? 1,
    key: profile.key ?? null,
    charge: 0,
    aim: 0,
    aimY: 0,
    swingBuffer: 0,
    queuedShot: null,
    shotIntent: "drive",
    splitStep: 0,
    sprinting: 0,
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
    topspin: 0,
    shotType: "serve",
    smashStage: 0,
    smashTargetSide: null,
    postGlassSide: null,
    wallAngleResolved: false,
    bouncePulse: 0,
    netCord: 0,
    netFaultOwner: null,
    crossedNet: true,
    serveTouchedNet: false,
    served: false,
    serveInFlight: false,
    serveTargetSide: "left",
    serveTargetX: (COURT.left + COURT.right) / 2,
    serveTargetY: COURT.netY,
    bounces: { player: 0, ai: 0 },
    trail: [],
    trailTime: 0,
    landRing: 0,
  };
}

function other(side) {
  return side === "player" ? "ai" : "player";
}

function courtSide(y) {
  return y > COURT.netY ? "player" : "ai";
}

function ballPlayableDirection(side, ball) {
  const incoming = side === "player" ? ball.vy > 0 : ball.vy < 0;
  const returningFromOwnGlass = ball.postGlassSide === side && courtSide(ball.y) === side;
  return incoming || returningFromOwnGlass;
}

function pointLabel(own, opponent) {
  if (own >= 3 && opponent >= 3) {
    if (own === opponent) return "40";
    return own > opponent ? "AD" : "40";
  }
  return POINTS[Math.min(own, 3)];
}

function syncPointDisplay(state) {
  if (state.pointsToWin) {
    state.playerScore = String(state.points.player);
    state.aiScore = String(state.points.ai);
    return;
  }
  state.playerScore = state.tieBreak ? String(state.tieBreakPoints.player) : pointLabel(state.points.player, state.points.ai);
  state.aiScore = state.tieBreak ? String(state.tieBreakPoints.ai) : pointLabel(state.points.ai, state.points.player);
}

export function createMatchState(mode, athlete, arena, aiProfile, tournamentRound = 0, options = {}) {
  const humanMode = options.humanMode ?? "solo";
  const state = {
    mode,
    athlete,
    arena,
    ai: aiProfile,
    tournamentRound,
    humanMode,
    coop: humanMode === "coop",
    pvp: humanMode === "pvp",
    pvpActiveKey: "opponent",
    pvpSwitchCooldown: 0,
    pvpSwitchFlash: 0,
    pvpAthlete: null,
    scoring: "tennis",
    pointsToWin: null,
    points: { player: 0, ai: 0 },
    games: { player: 0, ai: 0 },
    sets: { player: 0, ai: 0 },
    tieBreak: false,
    tieBreakPoints: { player: 0, ai: 0 },
    playerScore: "0",
    aiScore: "0",
    combo: 1,
    rallyHits: 0,
    rallyEnergy: { player: 1, ai: 1 },
    shotFeedback: null,
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
    lastHitterSide: null,
    flash: 0,
    shieldTimer: 0,
    wallEventTimer: 0,
    paused: false,
    running: false,
    lastTime: 0,
    elapsed: 0,
    events: [],
    result: null,
    player: createPaddle((COURT.left + COURT.right) / 2, COURT.bottom - 52, true, { stats: athlete.stats, controlled: true, key: "player" }),
    playerMate: createPaddle((COURT.left + COURT.right) / 2, COURT.netY + 88, true, { stats: athlete.stats, role: "net", key: "playerMate" }),
    opponent: createPaddle((COURT.left + COURT.right) / 2, COURT.top + 76, false, {
      speed: aiProfile.speed * (0.86 + aiProfile.skill * 0.1),
      skill: aiProfile.skill,
      role: "back",
      key: "opponent",
    }),
    opponentMate: createPaddle((COURT.left + COURT.right) / 2, COURT.netY - 84, false, {
      speed: aiProfile.speed * (0.9 + aiProfile.skill * 0.1),
      skill: aiProfile.skill,
      role: "net",
      key: "opponentMate",
    }),
    ball: createBall(),
    aiTargetX: (COURT.left + COURT.right) / 2,
    aiReactionDelay: 0,
    aiPrimaryKey: "opponent",
    aiReceiverLocked: false,
    aiShotPressure: 0,
    aiRecoveryMode: false,
    aiTeamShape: "defend",
    playerTeamTactic: "balanced",
    tacticFlash: 0,
    playerSwingBuffer: 0,
    queuedShotPower: 1,
    queuedShotAim: 0,
    queuedShotAimY: 0,
    queuedShotSlice: false,
    queuedShotVariant: "auto",
    queuedShotAge: 0,
    queuedShotCharge: 0,
    smashPrimed: false,
    smashTapWindow: 0,
    smashContactGrace: 0,
    smashContactFallback: false,
    shotCharge: 0,
    shotAim: 0,
    shotAimY: 0,
    shotIntent: "drive",
    activePlayerKey: "player",
    controlMode: "semi",
    switchCooldown: 0,
    receiverLocked: false,
    manualReceiverOverride: false,
    manualMovementTimer: 0,
    receiverSwitchFlash: 0,
    manualSwitchFlash: 0,
    hapticPulse: null,
    stats: {
      pointsWon: { player: 0, ai: 0 },
      aces: { player: 0, ai: 0 },
      winners: { player: 0, ai: 0 },
      errors: { player: 0, ai: 0 },
      smashWinners: { player: 0, ai: 0 },
      doubleFaults: { player: 0, ai: 0 },
      longestRally: 0,
      totalRallyHits: 0,
      rallyCount: 0,
    },
    replayFrames: [],
    replayMax: 720,
  };
  if (state.coop) {
    state.player.controlled = true;
    state.playerMate.controlled = true;
    state.activePlayerKey = "player";
  } else if (state.pvp) {
    state.opponent.controlled = true;
  }
  resetFx(state);
  prepareServe(state);
  return state;
}

export function addEvent(state, message) {
  state.events.unshift(message);
  if (state.events.length > 5) state.events.pop();
}

/** Azzera il buffer del replay all'inizio di ogni nuovo punto. */
export function resetReplayBuffer(state) {
  state.replayFrames = [];
}

function captureReplayFrame(state) {
  const { ball } = state;
  const snap = {
    serveSide: state.serveSide,
    serveCourt: state.serveCourt,
    activePlayerKey: state.activePlayerKey,
    ball: {
      x: ball.x, y: ball.y, z: ball.z,
      vx: ball.vx, vy: ball.vy, vz: ball.vz,
      spin: ball.spin, topspin: ball.topspin, backspin: ball.backspin,
      shotType: ball.shotType,
      serveInFlight: ball.serveInFlight,
      serveTouchedNet: ball.serveTouchedNet,
      bouncePulse: ball.bouncePulse,
      landRing: ball.landRing,
    },
    pads: [state.player, state.playerMate, state.opponent, state.opponentMate].map((p) => ({
      x: p.x, y: p.y, swing: p.swing, swingSide: p.swingSide,
      motion: p.motion, charge: p.charge, runPhase: p.runPhase,
      actionPose: p.actionPose, actionIntent: p.actionIntent, moveRatio: p.moveRatio,
    })),
  };
  state.replayFrames.push(snap);
  if (state.replayFrames.length > state.replayMax) state.replayFrames.splice(0, state.replayFrames.length - state.replayMax);
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
  paddle.moveRatio = 0;
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
  if (state.pvp) setPvpActive(state, state.aiServiceReceiverKey);
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
  if (state.coop) return;
  if (state.activePlayerKey === key) return;
  state.activePlayerKey = key;
  state.player.controlled = key === "player";
  state.playerMate.controlled = key === "playerMate";
  state.switchCooldown = manual ? 0.7 : 0.28;
  const position = state[key].y > COURT.netY + 150 ? t("roleBackPos") : t("roleNetPos");
  addEvent(state, t("controlMsg", { position }));
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

function contactWidth(paddle, ball) {
  if (paddle.isPlayer) return paddle.w * 0.78 + ball.r;
  const skillReach = 0.5 + clamp(paddle.skill, 0, 1) * 0.16;
  return paddle.w * skillReach + ball.r;
}

function responderForecast(paddle, ball) {
  if (!ballPlayableDirection("player", ball)) return { score: Infinity, reachable: false };
  const contactY = clamp(paddle.y, COURT.netY + 42, COURT.bottom - 42);
  const time = (contactY - ball.y) / ball.vy;
  if (time < 0.04 || time > 1.65) return { score: Infinity, reachable: false };

  const contactX = reflectedCourtX(ball.x + ball.vx * time);
  const contactZ = Math.max(0, ball.z + ball.vz * time - 0.5 * BALANCE.ballGravity * time * time);
  const horizontalReach = contactWidth(paddle, ball);
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

function aiResponderForecast(paddle, ball) {
  if (!ballPlayableDirection("ai", ball)) {
    return { score: Infinity, reachable: false, contactX: paddle.x };
  }
  const contactY = clamp(paddle.y, COURT.top + 42, COURT.netY - 42);
  const time = (contactY - ball.y) / ball.vy;
  if (time < 0.04 || time > 1.8) return { score: Infinity, reachable: false, contactX: paddle.x };

  const contactX = reflectedCourtX(ball.x + ball.vx * time);
  const contactZ = Math.max(0, ball.z + ball.vz * time - 0.5 * BALANCE.ballGravity * time * time);
  const horizontalReach = contactWidth(paddle, ball);
  const travelDistance = Math.max(0, Math.abs(contactX - paddle.x) - horizontalReach);
  const travelTime = travelDistance / paddle.speed;
  const lateBy = Math.max(0, travelTime - time);
  const heightPenalty = contactZ > BALANCE.playableHitHeight
    ? 1.4 + (contactZ - BALANCE.playableHitHeight) / 80
    : 0;

  return {
    score: travelTime + lateBy * 3.2 + heightPenalty,
    reachable: lateBy <= 0.12 && contactZ <= BALANCE.playableHitHeight + 12,
    contactX,
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
  if (state.coop) {
    state.receiverLocked = false;
    state.manualReceiverOverride = false;
    return;
  }
  if (!ballPlayableDirection("player", state.ball)) return;
  const choice = bestResponder(state);
  const controlMode = state.controlMode ?? "semi";
  let key = isServe ? (state.serviceReceiverKey ?? serviceReceiverKey(state)) : choice.key;
  const currentForecast = responderForecast(activePlayer(state), state.ball);
  const isCloseDecision = currentForecast.score <= choice.forecast.score + 0.1;
  if (!isServe) {
    if (controlMode === "manual") {
      state.receiverLocked = false;
      state.manualReceiverOverride = true;
      return;
    }
    if (controlMode === "semi") {
      const decisiveAdvantage = choice.forecast.score + 0.32 < currentForecast.score;
      const rescueNeeded = !currentForecast.reachable && choice.forecast.reachable;
      key = decisiveAdvantage || rescueNeeded ? choice.key : state.activePlayerKey;
    } else if (state.manualMovementTimer > 0 && currentForecast.reachable && isCloseDecision) {
      key = state.activePlayerKey;
    }
  }
  if (key !== state.activePlayerKey) {
    setActivePlayer(state, key);
    state.receiverSwitchFlash = 0.65;
  }
  state.receiverLocked = true;
  state.manualReceiverOverride = false;
}

function lockAiReceiverForIncomingShot(state, isServe = false) {
  if (!ballPlayableDirection("ai", state.ball)) return;
  const pace = Math.hypot(state.ball.vx, state.ball.vy);
  const pacePressure = clamp((pace - 250) / 270, 0, 1);
  const anglePressure = clamp(Math.abs(state.ball.vx) / 380, 0, 1);
  state.aiShotPressure = pacePressure * 0.55 + anglePressure * 0.45;
  let key = state.aiServiceReceiverKey;
  let forecast;
  if (isServe && key) {
    forecast = aiResponderForecast(state[key], state.ball);
  } else {
    const back = aiResponderForecast(state.opponent, state.ball);
    const mate = aiResponderForecast(state.opponentMate, state.ball);
    const bestKey = back.score <= mate.score ? "opponent" : "opponentMate";
    const bestForecast = bestKey === "opponent" ? back : mate;
    const committedKey = state.aiPrimaryKey;
    const committedForecast = committedKey === "opponent" ? back : mate;
    const commitmentChance = (1 - state.ai.skill) * (0.1 + state.aiShotPressure * 0.35);
    const canBeWrongFooted = committedKey !== bestKey
      && committedForecast.score <= bestForecast.score + 0.75;
    if (canBeWrongFooted && Math.random() < commitmentChance) {
      key = committedKey;
      forecast = committedForecast;
    } else if (back.score <= mate.score) {
      key = "opponent";
      forecast = back;
    } else {
      key = "opponentMate";
      forecast = mate;
    }
  }
  state.aiPrimaryKey = key ?? "opponent";
  state.aiTargetX = forecast?.contactX ?? state[state.aiPrimaryKey].x;
  state.aiReceiverLocked = true;
  const baseReaction = 0.28 - state.ai.skill * 0.25;
  const pressurePenalty = state.aiShotPressure * (1 - state.ai.skill) * 0.42;
  const wrongFootedChance = isServe
    ? 0
    : clamp(
      (state.aiShotPressure - 0.25) * (2 - state.ai.skill * 1.8),
      0,
      0.7,
    );
  const wrongFooted = Math.random() < wrongFootedChance;
  const wrongFootedDelay = wrongFooted ? 0.28 + state.aiShotPressure * 0.22 : 0;
  state.aiReactionDelay = isServe
    ? 0
    : clamp(baseReaction + pressurePenalty, 0.07, 0.42) + wrongFootedDelay;
  if (wrongFooted) addEvent(state, t("evCounter"));
}

function updateActivePlayer(state, dt, forceSwitch, switchDirection = null) {
  state.switchCooldown = Math.max(0, state.switchCooldown - dt);
  if (!forceSwitch && !switchDirection) return;
  if (state.serviceReceiverKey) {
    addEvent(state, t("evReceiverLock"));
    return;
  }
  const otherKey = state.activePlayerKey === "player" ? "playerMate" : "player";
  if (switchDirection) {
    const current = activePlayer(state);
    const alternate = state[otherKey];
    const dx = alternate.x - current.x;
    const dy = alternate.y - current.y;
    const length = Math.hypot(dx, dy) || 1;
    const directionLength = Math.hypot(switchDirection.x, switchDirection.y) || 1;
    const alignment = (dx / length) * (switchDirection.x / directionLength)
      + (dy / length) * (switchDirection.y / directionLength);
    if (alignment < 0.2) return;
  }
  setActivePlayer(state, otherKey, true);
  state.receiverSwitchFlash = 0;
  state.manualSwitchFlash = 0.55;
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
  state.aiReceiverLocked = false;
  state.aiReactionDelay = 0;
  state.aiShotPressure = 0;
  state.aiRecoveryMode = false;
  state.smashPrimed = false;
  state.smashTapWindow = 0;
  state.smashContactGrace = 0;
  state.smashContactFallback = false;
  state.playerSwingBuffer = 0;
  state.queuedShotVariant = "auto";
  for (const paddle of [state.player, state.playerMate, state.opponent, state.opponentMate]) {
    paddle.smashPrimed = false;
    paddle.smashTapWindow = 0;
    paddle.smashContactGrace = 0;
    paddle.smashContactFallback = false;
    paddle.swingBuffer = 0;
    paddle.queuedShot = null;
  }
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
  sfx.serve();
  emitSteam(state, ball.x, ball.y, ball.z);
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
  ball.crossedNet = false;
  state.lastHitterSide = state.serveSide;
  ball.trail = [];
  ball.trailTime = 0;
  ball.landRing = 0;
  state.serving = false;
  state.rallyHits = 0;
  state.combo = 1;
  server.shotIntent = "serve";
  server.actionIntent = "serve";
  server.actionPose = 0.46;
  server.swing = 1;
  server.swingSide = state.serveCourt === "right" ? -1 : 1;
  if (isPlayer) lockAiReceiverForIncomingShot(state, true);
  else lockReceiverForIncomingShot(state, true);
}

function canHit(paddle, ball) {
  // The returner must let a serve bounce in the diagonal service box.
  if (ball.serveInFlight || ball.netFaultOwner) return false;
  const withinX = Math.abs(ball.x - paddle.x) < contactWidth(paddle, ball);
  const withinY = Math.abs(ball.y - paddle.y) < paddle.reach * 1.3;
  const side = paddle.isPlayer ? "player" : "ai";
  return withinX && withinY && ballPlayableDirection(side, ball)
    && ball.z <= BALANCE.playableHitHeight;
}

function crossedPaddle(paddle, ball, previousBall) {
  if (!previousBall || ball.z > BALANCE.playableHitHeight) return false;
  const side = paddle.isPlayer ? "player" : "ai";
  if (!ballPlayableDirection(side, ball)) return false;
  const crossedY = (previousBall.y - paddle.y) * (ball.y - paddle.y) <= 0;
  if (!crossedY) return false;
  const distance = ball.y - previousBall.y;
  if (Math.abs(distance) < 0.001) return false;
  const t = clamp((paddle.y - previousBall.y) / distance, 0, 1);
  const contactX = previousBall.x + (ball.x - previousBall.x) * t;
  return Math.abs(contactX - paddle.x) <= contactWidth(paddle, ball);
}

function hitPowerProfile(paddle, state, power) {
  if (paddle.isPlayer) return power * state.athlete.stats.power;
  if (state.pvp && paddle.controlled) return power * (state.pvpAthlete?.stats.power ?? state.ai.power);
  return power * state.ai.power;
}

function shotSide(paddle) {
  return paddle.isPlayer ? "player" : "ai";
}

function shotMode(charge) {
  if (charge < 0.2) return "control";
  if (charge > 0.7) return "power";
  return "balanced";
}

function evaluateShotQuality(
  state,
  paddle,
  { charge = 0.5, aim = 0, variant = "drive", timingAge = 0, aiTiming = null } = {},
) {
  const { ball } = state;
  const side = shotSide(paddle);
  const passedDistance = Math.max(0, (ball.y - paddle.y) * (paddle.isPlayer ? 1 : -1));
  const lateralDistance = Math.abs(ball.x - paddle.x) / Math.max(1, contactWidth(paddle, ball));
  const longitudinalDistance = Math.abs(ball.y - paddle.y) / Math.max(1, paddle.reach * 1.3);
  const contactDistance = Math.hypot(lateralDistance * 0.82, longitudinalDistance * 0.58);
  const position = clamp(1.08 - contactDistance * 0.58 - passedDistance / 155, 0.18, 1);
  const sprintPenalty = clamp(paddle.sprinting ?? 0, 0, 1) * BALANCE.sprintAccuracyPenalty;
  const splitStepBonus = clamp(paddle.splitStep ?? 0, 0, 1) * BALANCE.splitStepQualityBonus;
  const movementPenalty = clamp(paddle.moveRatio ?? paddle.motion ?? 0, 0, 1) * 0.22 + sprintPenalty;
  const balance = clamp(1 - movementPenalty - Math.max(0, lateralDistance - 0.68) * 0.32, 0.28, 1);
  const timing = aiTiming ?? clamp(
    1
      - Math.max(0, timingAge - BALANCE.perfectTimingWindow)
        / Math.max(0.01, BALANCE.goodTimingWindow * 1.7)
      - passedDistance / 60,
    0.18,
    1,
  );
  const overhead = variant === "smash" || variant.startsWith("smash-");
  const height = overhead
    ? clamp((ball.z - 42) / 35, 0.2, 1)
    : clamp(1 - Math.max(0, ball.z - 82) / 100, 0.55, 1);
  const energy = clamp(state.rallyEnergy?.[side] ?? 1, BALANCE.rallyEnergyFloor, 1);
  const control = paddle.isPlayer
    ? clamp(state.athlete.stats.control / 1.22, 0.72, 1.05)
    : state.pvp && paddle.controlled
      ? clamp((state.pvpAthlete?.stats.control ?? 1) / 1.22, 0.72, 1.05)
      : clamp(0.72 + state.ai.skill * 0.34, 0.72, 1.02);
  const quality = clamp(
    timing * 0.34
      + position * 0.25
      + balance * 0.16
      + height * 0.1
      + energy * 0.09
      + control * 0.06
      + splitStepBonus,
    0,
    1,
  );
  const mode = shotMode(charge);
  const aggression = clamp(
    charge * 0.72 + Math.abs(aim) * 0.28 + (overhead ? 0.16 : 0),
    0,
    1.2,
  );
  const risk = clamp(
    (1 - quality) * (0.48 + aggression * 0.82)
      + Math.max(0, Math.abs(aim) - 0.72) * 0.5
      + (mode === "power" ? Math.max(0, 0.62 - energy) * 0.42 : 0),
    0,
    1.25,
  );
  const grade = timing >= 0.9
    ? "perfect"
    : passedDistance > 12
      ? "late"
      : timing >= 0.7
        ? "good"
        : "early";
  return { quality, timing, position, balance, height, energy, aggression, risk, mode, grade };
}

function consumeRallyEnergy(state, paddle, assessment, variant, slice) {
  const side = shotSide(paddle);
  const isSmash = variant === "smash" || variant.startsWith("smash-");
  const isLob = variant === "lob" || variant === "defensive-lob";
  const baseCost = variant === "chiquita" ? 0.025 : slice ? 0.035 : isLob ? 0.055 : isSmash ? 0.13 : 0.045;
  const powerCost = assessment.mode === "power" ? 0.095 : assessment.mode === "balanced" ? 0.04 : 0.012;
  const movementCost = (paddle.moveRatio ?? 0) * 0.025;
  state.rallyEnergy[side] = clamp(
    state.rallyEnergy[side] - baseCost - powerCost - movementCost,
    BALANCE.rallyEnergyFloor,
    1,
  );
}

function showShotFeedback(state, paddle, assessment) {
  if (!paddle.controlled) return;
  const labels = {
    perfect: t("shotPerfect"),
    good: t("shotGood"),
    early: t("shotEarly"),
    late: t("shotLate"),
  };
  state.shotFeedback = {
    text: labels[assessment.grade],
    mode: t(`shotMode${assessment.mode[0].toUpperCase()}${assessment.mode.slice(1)}`),
    grade: assessment.grade,
    quality: assessment.quality,
    life: 0.78,
    paddleKey: paddle.key ?? state.activePlayerKey,
  };
}

function computerProfile(state, paddle) {
  if (!paddle.isPlayer) return state.ai;
  const control = state.athlete.stats.control;
  return {
    skill: clamp(0.6 + (control - 0.9) * 0.34, 0.58, 0.78),
    power: state.athlete.stats.power,
    speed: paddle.speed,
  };
}

function targetYForSide(side, depth) {
  return side === "ai" ? COURT.netY - depth : COURT.netY + depth;
}

function opponentsNearNet(opponentSide, opponents) {
  const averageY = (opponents[0].y + opponents[1].y) / 2;
  return opponentSide === "ai"
    ? averageY > COURT.netY - 132
    : averageY < COURT.netY + 132;
}

function paddleUnderPressure(paddle) {
  return paddle.isPlayer
    ? paddle.y > COURT.netY + 168
    : paddle.y < COURT.netY - 168;
}

function chooseComputerShot(state, paddle, profile) {
  const opponentSide = paddle.isPlayer ? "ai" : "player";
  const opponents = opponentSide === "ai"
    ? [state.opponent, state.opponentMate]
    : [state.player, state.playerMate];
  const coverageX = (opponents[0].x + opponents[1].x) / 2;
  const centerX = (COURT.left + COURT.right) / 2;
  const sideBias = coverageX <= centerX ? 1 : -1;
  const accuracyError = (1 - profile.skill) * 44;
  const atNet = paddle.isPlayer
    ? paddle.y < COURT.netY + 126
    : paddle.y > COURT.netY - 126;
  const pressured = paddleUnderPressure(paddle) || state.ball.z < 38;
  const opponentsAreForward = opponentsNearNet(opponentSide, opponents);
  const choice = Math.random();
  const overheadReady = atNet && state.ball.z >= 58;

  let kind = "drive";
  if (overheadReady && choice < 0.08 + profile.skill * 0.14) {
    const x3Chance = clamp((profile.skill - 0.48) * 0.55, 0.02, 0.16);
    kind = Math.random() < x3Chance ? "smash-x3" : "smash-x2";
  } else if ((pressured || opponentsAreForward) && choice < 0.28 + profile.skill * 0.18) {
    kind = "lob";
  } else if (atNet && state.ball.z > 42 && choice < 0.78) {
    kind = Math.random() < 0.28 + profile.skill * 0.12 ? "vibora" : "volley";
  }

  const shotSetups = {
    lob: { depth: 202, lateral: 76, margin: 92, flightTime: 1.28 },
    "smash-x2": { depth: 222, lateral: 52, margin: 82, flightTime: 0.62 },
    "smash-x3": { depth: 218, lateral: 260, margin: 48, flightTime: 0.66 },
    vibora: { depth: 154, lateral: 184, margin: 68, flightTime: 0.84 },
    volley: { depth: 132, lateral: 142, margin: 76, flightTime: 0.8 },
    drive: { depth: 168, lateral: 126, margin: 84, flightTime: 0.98 },
  };
  const setup = shotSetups[kind] ?? shotSetups.drive;
  const x = clamp(
    centerX + sideBias * setup.lateral + (Math.random() - 0.5) * accuracyError,
    COURT.left + setup.margin,
    COURT.right - setup.margin,
  );
  return {
    kind,
    x,
    y: targetYForSide(opponentSide, setup.depth),
    flightTime: setup.flightTime * (1.06 - profile.skill * 0.08),
  };
}

function aiShotError(state, profile, assessment, kind = "drive") {
  // Gli errori derivano da pressione, energia e qualità del contatto, come per il giocatore.
  const rally = Math.min(1, Math.max(0, (state.rallyHits - 2) / 10));
  const aggressive = kind === "smash-x2" || kind === "smash-x3" || kind === "vibora";
  const chance = clamp(
    ((1 - profile.skill) ** 2) * 0.82
      + assessment.risk * (1 - profile.skill) * 0.1
      + rally * (1 - assessment.energy) * 0.12
      + (aggressive ? 0.025 : 0),
    0.025,
    0.38,
  );
  const roll = Math.random();
  if (roll < chance * (aggressive ? 0.34 : 0.16)) return { type: "out" };
  return roll < chance ? { type: "short" } : null;
}

function setComputerTrajectory(ball, targetX, targetY, flightTime) {
  const dragRate = -60 * Math.log(BALANCE.airDrag);
  const dragDistanceFactor = dragRate > 0.0001
    ? (1 - Math.exp(-dragRate * flightTime)) / (dragRate * flightTime)
    : 1;
  const dragCompensation = 1 / dragDistanceFactor;
  ball.vx = ((targetX - ball.x) / flightTime) * dragCompensation;
  ball.vy = ((targetY - ball.y) / flightTime) * dragCompensation;
  ball.vz = (BALANCE.ballGravity * flightTime * flightTime * 0.5 - ball.z) / flightTime;
}

function applyComputerShot(state, paddle) {
  const { ball } = state;
  ball.backspin = 0;
  const opponentSide = paddle.isPlayer ? "ai" : "player";
  const centerX = (COURT.left + COURT.right) / 2;
  const profile = computerProfile(state, paddle);
  const target = chooseComputerShot(state, paddle, profile);
  const aiCharge = target.kind === "lob" || target.kind === "drive"
    ? 0.38 + profile.skill * 0.34
    : 0.62 + profile.skill * 0.28;
  const pressure = paddle.isPlayer ? 0 : state.aiShotPressure;
  const timingVariance = (Math.random() - 0.5) * (0.42 - profile.skill * 0.3);
  const aiTiming = clamp(0.72 + profile.skill * 0.3 - pressure * 0.25 + timingVariance, 0.25, 1);
  const targetAim = clamp(
    (target.x - centerX) / ((COURT.right - COURT.left) * 0.42),
    -1,
    1,
  );
  const assessment = evaluateShotQuality(state, paddle, {
    charge: aiCharge,
    aim: targetAim,
    variant: target.kind,
    aiTiming,
  });
  const error = aiShotError(state, profile, assessment, target.kind);
  consumeRallyEnergy(state, paddle, assessment, target.kind, target.kind === "vibora");

  if (error?.type === "out") {
    const targetY = opponentSide === "ai" ? COURT.top - 34 : COURT.bottom + 34;
    setComputerTrajectory(ball, centerX + (Math.random() - 0.5) * 260, targetY, 0.78);
    ball.shotType = "error";
    if (!paddle.isPlayer) addEvent(state, t("evAiForced"));
    return;
  }

  if (error?.type === "short") {
    // Palla debole ma valida: resta oltre la rete e offre tempo per attaccare.
    const variant = Math.random();
    let targetX;
    let targetY;
    let flightTime;
    if (variant < 0.45) {
      // Lob lento centrale a mezzo campo.
      targetX = centerX + (Math.random() - 0.5) * 220;
      targetY = targetYForSide(opponentSide, 142);
      flightTime = 1.16;
    } else if (variant < 0.75) {
      // Palla larga vicino al vetro: scomoda ma recuperabile.
      targetX = Math.random() < 0.5 ? COURT.left + 82 : COURT.right - 82;
      targetY = targetYForSide(opponentSide, 176);
      flightTime = 1.08;
    } else {
      // Smorzata troppo alta: invito a scendere a rete.
      targetX = centerX + (Math.random() - 0.5) * 130;
      targetY = targetYForSide(opponentSide, 78);
      flightTime = 1.02;
    }
    setComputerTrajectory(ball, targetX, targetY, flightTime);
    ball.backspin = 0.3;
    ball.spin = clamp(ball.vx * 0.05, -18, 18);
    if (!paddle.isPlayer) {
      state.aiRecoveryMode = true;
      addEvent(state, t("evOppOutOfPos"));
    }
    return;
  }

  const powerScale = clamp(profile.power, 0.84, 1.08);
  const executionSpread = assessment.risk * (1 - profile.skill * 0.45);
  target.x += (Math.random() - 0.5) * executionSpread * 150;
  target.y += (Math.random() - 0.45) * executionSpread * 105;
  if (target.kind === "smash-x2" || target.kind === "smash-x3") {
    const targetY = opponentSide === "ai" ? COURT.top + 44 : COURT.bottom - 44;
    setComputerTrajectory(ball, target.x, targetY, target.flightTime / powerScale);
    ball.shotType = target.kind;
    ball.smashTargetSide = opponentSide;
    ball.topspin = target.kind === "smash-x3" ? 1.12 : 0.98;
    ball.spin = target.kind === "smash-x3"
      ? Math.sign(target.x - centerX || 1) * 76
      : clamp(ball.vx * 0.04, -24, 24);
  } else {
    setComputerTrajectory(ball, target.x, target.y, target.flightTime / (0.92 + powerScale * 0.08));
    ball.shotType = target.kind;
    ball.spin = clamp(ball.vx * (target.kind === "vibora" ? 0.2 : 0.08), -72, 72);
    if (target.kind === "vibora") ball.backspin = 0.76;
  }
  if (!paddle.isPlayer) {
    state.aiRecoveryMode = false;
    if (target.kind === "lob") addEvent(state, t("evOppLob"));
    else if (target.kind === "volley") addEvent(state, t("evCoverCenter"));
    else if (target.kind === "vibora") addEvent(state, t("evOppVibora"));
    else if (target.kind === "smash-x2") addEvent(state, t("evOppSmashX2"));
    else if (target.kind === "smash-x3") addEvent(state, t("evOppSmashX3"));
  }
}

export function hitBall(
  state,
  paddle,
  power = 1,
  isSpecial = false,
  forceContact = false,
  aim = 0,
  slice = false,
  shotVariant = "auto",
  aimY = 0,
  timingAge = 0,
) {
  const { ball, athlete } = state;
  if (paddle.hitCooldown > 0 || (!forceContact && !canHit(paddle, ball))) return false;

  const contactHeight = ball.z;
  const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
  const rawCharge = clamp((power - 0.4) / 0.95, 0, 1);
  const assessment = evaluateShotQuality(state, paddle, {
    charge: rawCharge,
    aim,
    variant: shotVariant,
    timingAge,
  });
  const powerMul = hitPowerProfile(paddle, state, power);
  const control = paddle.isPlayer
    ? athlete.stats.control
    : state.pvp && paddle.controlled
      ? (state.pvpAthlete?.stats.control ?? 0.92 + state.ai.skill * 0.1)
      : 0.92 + state.ai.skill * 0.1;
  const direction = paddle.isPlayer ? -1 : 1;
  ball.y = paddle.y + direction * (ball.r + 6);
  ball.z = Math.max(22, Math.min(ball.z, 74));
  ball.topspin = 0;
  ball.shotType = "drive";
  ball.smashStage = 0;
  ball.smashTargetSide = null;
  ball.postGlassSide = null;
  ball.wallAngleResolved = false;
  if (paddle.controlled) {
    const shotPower = clamp(powerMul, 0.34, 1.5);
    const aimFreedom = assessment.mode === "control"
      ? 1
      : assessment.mode === "balanced"
        ? 0.94
        : 0.86;
    const aimedOffset = clamp(aim * control * aimFreedom + offset * 0.24, -1, 1);
    const aimedDepth = clamp(aimY, -1, 1);
    const centerX = (COURT.left + COURT.right) / 2;
    const nearNet = paddle.y <= COURT.netY + BALANCE.smashNetWindow;
    const explicitSmash = shotVariant === "smash";
    const smashReady = !slice
      && (explicitSmash || shotVariant === "auto")
      && nearNet
      && contactHeight >= BALANCE.smashMinHeight
      && shotPower >= BALANCE.smashMinPower;
    let smashType = null;
    if (smashReady && explicitSmash) {
      if (aimedDepth <= -0.28) {
        smashType = Math.abs(aimedOffset) >= 0.42 ? "smash-x3" : "smash-x2";
      } else if (aimedDepth >= 0.32) {
        smashType = "bandeja";
      } else {
        smashType = "smash-flat";
      }
    } else if (smashReady) {
      smashType = Math.abs(aimedOffset) >= 0.52 ? "smash-x3" : "smash-x2";
    } else if (explicitSmash) {
      smashType = "bandeja";
    }
    const seeksSideGlass = !smashType
      && !slice
      && shotVariant !== "lob"
      && Math.abs(aimedOffset) >= 0.72;
    const safePower = 1.16 + (control - 1) * 0.16;
    const overchargeRisk = Math.max(0, shotPower - safePower);
    const controlRisk = clamp(1.3 - control, 0.06, 0.46);
    const executionRisk = assessment.risk * (0.72 + controlRisk * 0.7);
    const lateralJitter = (Math.random() - 0.5)
      * (overchargeRisk * controlRisk * 300 + executionRisk * 170);
    const depthJitter = (Math.random() - 0.44)
      * (overchargeRisk * controlRisk * 480 + executionRisk * 210);
    const targetMargin = seeksSideGlass ? 30 : 72;
    const rawTargetX = centerX + aimedOffset * (COURT.right - COURT.left) * 0.42
      + lateralJitter;
    const targetX = overchargeRisk > 0.04 || executionRisk > 0.34
      ? clamp(rawTargetX, COURT.left - 24, COURT.right + 24)
      : clamp(rawTargetX, COURT.left + targetMargin, COURT.right - targetMargin);
    const baseTargetDepth = slice
      ? 92 + shotPower * 62
      : 72 + shotPower * 78;
    const targetDepth = clamp(
      baseTargetDepth
        - aimedDepth * 42
        + overchargeRisk * 70
        + depthJitter
        - Math.max(0, 0.68 - assessment.quality) * 105,
      62,
      292,
    );
    const targetY = targetYForSide(paddle.isPlayer ? "ai" : "player", targetDepth);
    const qualityPace = 0.88 + assessment.quality * 0.14;
    const flightTime = (slice
      ? 1.08 - shotPower * 0.14
      : 1.16 - shotPower * 0.22) / qualityPace;
    setComputerTrajectory(ball, targetX, targetY, flightTime);
    ball.spin = aimedOffset * 45 * control;
    ball.backspin = slice ? 0.65 + shotPower * 0.35 : 0;
    if (shotVariant === "chiquita") {
      const chiquitaX = clamp(
        centerX + aimedOffset * (COURT.right - COURT.left) * 0.3,
        COURT.left + 62,
        COURT.right - 62,
      );
      const chiquitaDepth = 62 + shotPower * 34 - aimedDepth * 18;
      setComputerTrajectory(
        ball,
        chiquitaX,
        targetYForSide(paddle.isPlayer ? "ai" : "player", chiquitaDepth),
        1.02,
      );
      ball.topspin = 0.48;
      ball.spin = aimedOffset * 30 * control;
      ball.shotType = "chiquita";
      addEvent(state, t("evChiquita"));
    } else if (shotVariant === "lob" || shotVariant === "defensive-lob") {
      const defensiveLob = shotVariant === "defensive-lob";
      const powerRatio = clamp((shotPower - 0.34) / 1.16, 0, 1);
      const safePower = 1.12 + (control - 1) * 0.18;
      const overcharge = Math.max(0, shotPower - safePower);
      const controlError = clamp(1.28 - control, 0.05, 0.42);
      const lobRisk = assessment.risk * (0.7 + overcharge * 0.8);
      const lateralError = (Math.random() - 0.5)
        * (overcharge * controlError * 340 + lobRisk * 150);
      const depthError = (Math.random() - 0.46)
        * (overcharge * controlError * 320 + lobRisk * 190);
      const lobTargetX = centerX
        + aimedOffset * (COURT.right - COURT.left) * (0.31 + overcharge * 0.12)
        + lateralError;
      const lobDepth = (defensiveLob ? 112 : 96) + powerRatio * (defensiveLob ? 98 : 118) - aimedDepth * 24
        + overcharge * 70 + depthError;
      const lobTargetY = targetYForSide(paddle.isPlayer ? "ai" : "player", lobDepth);
      const lobFlightTime = (defensiveLob ? 1.68 : 1.5) - powerRatio * (defensiveLob ? 0.12 : 0.18);
      setComputerTrajectory(ball, lobTargetX, lobTargetY, lobFlightTime);
      ball.shotType = defensiveLob ? "defensive-lob" : "lob";
      addEvent(state, overcharge > 0.06
        ? t("evLobOver")
        : powerRatio < 0.3
          ? t("evLobShort")
          : t(defensiveLob ? "evDefensiveLob" : "evLobHigh"));
    } else if (smashType === "smash-x3" && assessment.quality >= BALANCE.smashX3MinQuality) {
      const side = Math.sign(aimedOffset) || (paddle.x < centerX ? 1 : -1);
      const smashTargetX = centerX + side * (COURT.right - COURT.left) * 0.34;
      setComputerTrajectory(ball, smashTargetX, COURT.top + 50, 0.62);
      ball.topspin = 1.15;
      ball.spin = side * 82 * control;
      ball.shotType = "smash-x3";
      ball.smashTargetSide = "ai";
      addEvent(state, t("evSmashX3"));
    } else if (smashType === "smash-x3" && assessment.quality >= BALANCE.smashX2MinQuality) {
      const smashTargetX = centerX + aimedOffset * (COURT.right - COURT.left) * 0.12;
      setComputerTrajectory(ball, smashTargetX, COURT.top + 44, 0.61);
      ball.topspin = 0.96;
      ball.spin = aimedOffset * 25;
      ball.shotType = "smash-x2";
      ball.smashTargetSide = "ai";
      addEvent(state, t("evSmashX3Downgrade"));
    } else if (smashType === "smash-x2" && assessment.quality >= BALANCE.smashX2MinQuality) {
      const smashTargetX = centerX + aimedOffset * (COURT.right - COURT.left) * 0.12;
      setComputerTrajectory(ball, smashTargetX, COURT.top + 44, 0.58);
      ball.topspin = 1;
      ball.spin = aimedOffset * 28;
      ball.shotType = "smash-x2";
      ball.smashTargetSide = "ai";
      addEvent(state, t("evSmashX2Deep"));
    } else if (smashReady && smashType && assessment.quality >= BALANCE.smashFlatMinQuality) {
      const flatTargetX = clamp(
        centerX + aimedOffset * (COURT.right - COURT.left) * 0.24,
        COURT.left + 76,
        COURT.right - 76,
      );
      setComputerTrajectory(ball, flatTargetX, COURT.netY - 174, 0.61);
      ball.topspin = 0.72;
      ball.shotType = "smash-flat";
      addEvent(state, smashType === "smash-flat" ? t("evSmashCenter") : t("evSmashFlatFallback"));
    } else if (smashType) {
      const bandejaSide = Math.sign(aimedOffset) || 1;
      const bandejaTargetX = centerX + bandejaSide * (COURT.right - COURT.left) * 0.22;
      setComputerTrajectory(ball, bandejaTargetX, COURT.netY - 152, 1.02);
      ball.backspin = 0.58;
      ball.spin = bandejaSide * 48;
      ball.shotType = "bandeja";
      addEvent(state, explicitSmash && (!smashReady || assessment.quality < BALANCE.smashX2MinQuality)
        ? t("evBandejaConverted")
        : t("evBandeja"));
    } else if (seeksSideGlass) {
      ball.shotType = "wall-angle";
      ball.spin = aimedOffset * 68 * control;
      addEvent(state, t("evAngleWall"));
    } else if (slice) {
      if (nearNet && contactHeight >= (shotVariant === "vibora" ? 42 : 48)) {
        const viboraSide = Math.sign(aimedOffset) || 1;
        const viboraDepth = 132 + shotPower * 28 + overchargeRisk * 96;
        setComputerTrajectory(
          ball,
          centerX + viboraSide * (COURT.right - COURT.left) * 0.31,
          targetYForSide(paddle.isPlayer ? "ai" : "player", viboraDepth),
          0.82,
        );
        ball.backspin = 0.82;
        ball.spin = viboraSide * 76;
        ball.shotType = "vibora";
        addEvent(state, t("evVibora"));
      } else {
        ball.shotType = "slice";
        addEvent(state, t("evSlice"));
      }
    }
    if (isSpecial) applySpecial(state, aimedOffset, paddle);
    consumeRallyEnergy(state, paddle, assessment, shotVariant, slice);
    showShotFeedback(state, paddle, assessment);
    if (explicitSmash && state.shotFeedback) {
      const successfulSmash = ball.shotType.startsWith("smash-");
      state.shotFeedback.text = successfulSmash
        ? t(`shot${ball.shotType === "smash-x3" ? "SmashX3" : ball.shotType === "smash-x2" ? "SmashX2" : "SmashFlat"}`)
        : t("shotBandejaFallback");
      state.shotFeedback.mode = successfulSmash ? assessment.grade.toUpperCase() : t("smashNotReady");
    }
    state.receiverLocked = false;
    state.manualReceiverOverride = false;
    state.serviceReceiverKey = null;
    if (!paddle.isPlayer) state.aiServiceReceiverKey = null;
  } else {
    applyComputerShot(state, paddle);
    if (!paddle.isPlayer) {
      state.aiPrimaryKey = paddle === state.opponent ? "opponent" : "opponentMate";
      state.aiServiceReceiverKey = null;
      state.aiReceiverLocked = false;
      state.aiReactionDelay = 0;
      lockReceiverForIncomingShot(state);
    }
  }
  if (paddle.isPlayer) {
    lockAiReceiverForIncomingShot(state);
    if (ball.shotType === "smash-x2" || ball.shotType === "smash-x3") {
      const smashReadPenalty = ball.shotType === "smash-x2" ? 0.48 : 0.18;
      state.aiReactionDelay += smashReadPenalty + (1 - state.ai.skill) * 0.16;
    } else if (ball.shotType === "lob") {
      state.aiReactionDelay = Math.max(0.04, state.aiReactionDelay - state.ai.skill * 0.08);
    }
  }
  ball.serveInFlight = false;
  ball.serveTouchedNet = false;
  ball.netFaultOwner = null;
  ball.netCord = 0;
  ball.crossedNet = false;
  state.lastHitterSide = paddle.isPlayer ? "player" : "ai";
  ball.bounces = { player: 0, ai: 0 };

  paddle.shotIntent = ball.shotType;
  paddle.actionIntent = ball.shotType;
  paddle.actionPose = 0.42;
  paddle.swing = 1;
  paddle.swingSide = (paddle.controlled ? aim : offset) < -0.08 ? -1 : 1;
  paddle.hitCooldown = paddle.isPlayer ? BALANCE.hitCooldownPlayer : BALANCE.hitCooldownAi;
  sfx.hit();
  if (isSpecial) {
    sfx.special();
    emitBurst(state, ball.x, ball.y, ball.z, { count: 18, color: state.athlete.color, speed: 210, size: 6, life: 0.4 });
  } else {
    emitBurst(state, ball.x, ball.y, ball.z, { count: 8, color: "#d8ff5f", speed: 130, size: 6, life: 0.32 });
  }
  state.rallyHits += 1;
  state.combo = Math.min(BALANCE.comboMax, 1 + Math.floor(state.rallyHits / BALANCE.comboStep));
  state.flash = 0.65;
  if (paddle.controlled) {
    const finishingShot = ball.shotType === "smash-x2" || ball.shotType === "smash-x3";
    state.hapticPulse = finishingShot
      ? { duration: 120, strong: 0.82, weak: 0.48 }
      : ball.shotType === "smash-flat" || ball.shotType === "vibora"
        ? { duration: 82, strong: 0.58, weak: 0.38 }
        : { duration: 48, strong: 0.26, weak: 0.3 };
  }
  if (state.rallyHits > 0 && state.rallyHits % 5 === 0) addEvent(state, t(`eventLine${Math.floor(Math.random() * EVENT_LINES.length)}`));
  return true;
}

function applySpecial(state, offset, paddle) {
  const { athlete, ball } = state;
  if (athlete.id === "maestro") {
    ball.vx = offset * 480;
    ball.vy = -470;
    ball.vz = 325;
    addEvent(state, t("evPrecision"));
  } else if (athlete.id === "pantera") {
    paddle.dashTimer = 0.26;
    ball.vy = -455;
    ball.vz = 300;
    addEvent(state, t("evLightningDash"));
  } else if (athlete.id === "steamer") {
    ball.vx = offset * 250;
    ball.vy = -520;
    ball.vz = 410;
    addEvent(state, t("evSteamSmash"));
  } else if (athlete.id === "fiamma") {
    state.shieldTimer = 2.2;
    ball.vy = -410;
    ball.vz = 280;
    addEvent(state, t("evSteamShield"));
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
    addEvent(state, t("evSteamShieldAbsorb"));
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
  addEvent(state, winner === "player" ? t("setToYou") : t("setToCircuit"));
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
    addEvent(state, t("tieBreak"));
  }
  state.serveSide = other(state.serveSide);
  state.serveCourt = "right";
}

function recordPointStats(state, winner, reason) {
  const stats = state.stats;
  if (!stats) return;
  const loser = other(winner);
  stats.pointsWon[winner] += 1;
  stats.longestRally = Math.max(stats.longestRally, state.rallyHits);
  stats.totalRallyHits += state.rallyHits;
  stats.rallyCount += 1;
  const text = reason || "";
  const isWinnerShot = /Secondo rimbalzo|Parete avversaria|SMASH x[23]/.test(text);
  const isError = /Rete|Palla corta|Palla fuori|Doppio fallo/.test(text);
  if (isWinnerShot) stats.winners[winner] += 1;
  if (isError) stats.errors[loser] += 1;
  if (state.ball.shotType === "smash-x2" || state.ball.shotType === "smash-x3") stats.smashWinners[winner] += 1;
  if (state.doubleFaultFlag) stats.doubleFaults[loser] += 1;
  if (isWinnerShot && winner === state.serveSide && state.rallyHits === 0) {
    stats.aces[winner] += 1;
  }
}

function scorePoint(state, winner, reason) {
  const receiver = other(state.serveSide);
  if (reason) addEvent(state, reason);
  recordPointStats(state, winner, reason);
  if (state.tieBreak) {
    state.tieBreakPoints[winner] += 1;
    if (state.tieBreakPoints[winner] >= 7 && state.tieBreakPoints[winner] - state.tieBreakPoints[other(winner)] >= 2) finishSet(state, winner);
  } else if (state.pointsToWin) {
    state.points[winner] += 1;
    if (state.points[winner] >= state.pointsToWin) state.result = { winner };
  } else {
    state.points[winner] += 1;
    if (gameWon(state.points[winner], state.points[other(winner)])) finishGame(state, winner);
  }
  if (state.pointsToWin && !state.result) state.serveSide = other(state.serveSide);
  state.combo = 1;
  state.rallyHits = 0;
  state.rallyEnergy = { player: 1, ai: 1 };
  state.shotFeedback = null;
  state.receiverLocked = false;
  state.manualReceiverOverride = false;
  state.serviceReceiverKey = null;
  state.aiServiceReceiverKey = null;
  state.aiReceiverLocked = false;
  state.aiReactionDelay = 0;
  state.aiShotPressure = 0;
  state.aiRecoveryMode = false;
  state.serveAttempts = 0;
  state.serveCourt = state.serveCourt === "right" ? "left" : "right";
  syncPointDisplay(state);
  if (!state.result) {
    state.pointPause = 1.4;
    state.pointMessage = `${winner === "player" ? t("pointYou") : t("pointOpp")}${reason ? ` · ${reason}` : ""}`;
    sfx.point(winner === "player");
  } else if (winner === "player") {
    sfx.victoryMatch();
  } else {
    sfx.defeatMatch();
  }
  return receiver;
}

function serveFault(state, reason) {
  if (state.serveAttempts === 0) {
    state.serveAttempts = 1;
    addEvent(state, `${reason} ${t("secondServeSuffix")}`);
    prepareServe(state);
    return;
  }
  state.doubleFaultFlag = true;
  scorePoint(state, other(state.serveSide), t("doubleFault", { reason: reason.toLowerCase() }));
  state.doubleFaultFlag = false;
}

function serveLet(state) {
  state.ball.serveInFlight = false;
  state.pointPause = 1;
  state.pointMessage = "LET · Servizio da ripetere";
  addEvent(state, t("evLet"));
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
    scorePoint(state, other(ball.netFaultOwner), t("msgNetFault"));
    return true;
  }
  if (ball.y < COURT.top || ball.y > COURT.bottom) {
    scorePoint(state, other(side), t("msgOut"));
    return true;
  }
  if (ball.serveInFlight) {
    if (!validServiceBounce(state, side)) {
      serveFault(state, t("serveOutBox"));
      return true;
    }
    if (ball.serveTouchedNet) {
      serveLet(state);
      return true;
    }
    ball.serveInFlight = false;
    ball.bounces[side] = 1;
    addEvent(state, t("evServeValid"));
  } else {
    if (state.lastHitterSide === side && !ball.crossedNet) {
      scorePoint(state, other(side), t("msgNetShort"));
      return true;
    }
    ball.bounces[side] += 1;
    if (ball.bounces[side] > 1) {
      scorePoint(state, other(side), t("msgDoubleBounce"));
      return true;
    }
  }
  const impactSpeed = Math.abs(impactVz);
  const speedFactor = clamp(impactSpeed / 520, 0, 1);
  const sliceAmount = clamp(ball.backspin ?? 0, 0, 1.2);
  const topspinAmount = clamp(ball.topspin ?? 0, 0, 1.3);
  const restitution = (BALANCE.groundRestitution + BALANCE.groundRestitutionBoost * speedFactor)
    * (1 - sliceAmount * 0.28)
    + topspinAmount * 0.12;
  const minimumBounce = BALANCE.minimumBounceVz * (1 - sliceAmount * 0.26);
  const reboundVz = Math.max(minimumBounce, impactSpeed * restitution);
  ball.vx = (ball.vx + ball.spin * BALANCE.groundSpinTransfer) * BALANCE.groundTangentialDamping;
  ball.vy *= BALANCE.groundTangentialDamping
    * (1 - sliceAmount * 0.14)
    * (1 + topspinAmount * 0.08);
  ball.spin *= 0.7;
  ball.backspin *= 0.35;
  ball.topspin *= 0.72;
  if ((ball.shotType === "smash-x2" || ball.shotType === "smash-x3")
    && side === ball.smashTargetSide) {
    ball.smashStage = Math.max(ball.smashStage, 1);
    addEvent(state, t("evSmashValid"));
  }
  ball.z = Math.max(0, reboundVz * remainingTime - 0.5 * BALANCE.ballGravity * remainingTime * remainingTime);
  ball.vz = reboundVz - BALANCE.ballGravity * remainingTime;
  ball.bouncePulse = 1;
  ball.landRing = 0.5;
  sfx.bounce();
  emitDust(state, ball.x, ball.y, 6);
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
    if (ball.serveInFlight) {
      serveFault(state, t("serveWallFault"));
      return true;
    }
    if (state.lastHitterSide !== side || ball.crossedNet) {
      scorePoint(state, side, t("msgWallNoBounce"));
      return true;
    }
    addEvent(state, t("evOwnWallOut"));
  }
  if (hitSideWall && ball.shotType === "smash-x3" && ball.smashStage >= 2) {
    scorePoint(state, state.lastHitterSide, t("msgSmashX3Wall"));
    return true;
  }
  if (hitSideWall) {
    ball.x = clamp(ball.x, COURT.left + ball.r, COURT.right - ball.r);
    ball.vx *= -state.arena.wallBounce;
    ball.vy *= BALANCE.wallTangentialDamping;
    if (hasBounced && ball.shotType === "wall-angle" && !ball.wallAngleResolved) {
      ball.vx *= 1.08;
      ball.wallAngleResolved = true;
      state.aiReactionDelay += (1 - state.ai.skill) * 0.22;
      addEvent(state, t("evSideWallCenter"));
    }
  }
  if (hitBackWall) {
    ball.y = clamp(ball.y, COURT.top + ball.r, COURT.bottom - ball.r);
    ball.vy *= -state.arena.wallBounce;
    ball.vx *= BALANCE.wallTangentialDamping;
    if (hasBounced && ball.shotType === "smash-x3" && side === ball.smashTargetSide) {
      const outward = Math.sign(ball.vx || ball.spin) || 1;
      ball.vx = outward * Math.max(275, Math.abs(ball.vx));
      ball.vy = (side === "ai" ? 1 : -1) * Math.max(115, Math.abs(ball.vy) * 0.46);
      ball.vz = Math.max(245, ball.vz);
      ball.smashStage = 2;
      addEvent(state, t("evSmashX3Grid"));
    } else if (hasBounced && ball.shotType === "smash-x2" && side === ball.smashTargetSide) {
      ball.vy = (side === "ai" ? 1 : -1) * Math.max(430, Math.abs(ball.vy) * 1.08);
      ball.vz = Math.max(290, ball.vz);
      ball.smashStage = 2;
      addEvent(state, t("evSmashX2"));
    }
  }
  if (hasBounced) {
    ball.postGlassSide = side;
    if (side === "ai") lockAiReceiverForIncomingShot(state);
    else lockReceiverForIncomingShot(state);
  }
  ball.spin *= -0.45;
  sfx.wall();
  emitSparks(state, ball.x, ball.y, ball.z);
  if (state.wallEventTimer <= 0) {
    addEvent(state, t("evWallValid"));
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
  sfx.net();
  emitDust(state, ball.x, contactZ + 2);

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
    addEvent(state, t("evTape"));
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
  addEvent(state, t("evNetRebound"));
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
  const side = paddle.isPlayer ? "player" : "ai";
  const incoming = ballPlayableDirection(side, ball);
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
  paddle.moveRatio = clamp(
    Math.hypot(paddle.x - startX, paddle.y - startY) / Math.max(1, paddle.speed * dt),
    0,
    1,
  );
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
  paddle.moveRatio = clamp(
    Math.hypot(paddle.x - startX, paddle.y - startY) / Math.max(1, paddle.speed * dt),
    0,
    1,
  );
}

function moveOpponentTeam(state, dt) {
  const { ball, opponent, opponentMate } = state;
  const centerX = (COURT.left + COURT.right) / 2;
  const courtWidth = COURT.right - COURT.left;
  const livePrediction = clamp(ball.x + ball.vx * 0.2, COURT.left + 72, COURT.right - 72);
  const aiDefendingDirection = ballPlayableDirection("ai", ball);
  const predictedX = state.aiReceiverLocked && aiDefendingDirection
    ? clamp(state.aiTargetX, COURT.left + 72, COURT.right - 72)
    : livePrediction;
  const primary = state[state.aiPrimaryKey] ?? opponent;
  const support = primary === opponent ? opponentMate : opponent;
  const ballOnAiSide = ball.y < COURT.netY;
  const defending = ballOnAiSide && aiDefendingDirection;
  const attacking = !state.aiRecoveryMode
    && !ballOnAiSide
    && ball.vy > 0
    && (state.rallyHits > 0 || ball.served)
    && ball.z < 165;
  const minSeparation = courtWidth * 0.24;
  let primaryTargetX = predictedX;
  let supportTargetX = predictedX < centerX
    ? centerX + courtWidth * 0.2
    : centerX - courtWidth * 0.2;

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
    // Difesa di coppia: entrambi dietro, su due corsie e quasi sulla stessa linea.
    const glassReturnOffset = ball.postGlassSide === "ai" ? 42 : -18;
    primaryTargetY = clamp(ball.y + glassReturnOffset, COURT.top + 76, COURT.netY - 104);
    supportTargetY = clamp(primaryTargetY - 10, COURT.top + 70, COURT.netY - 112);
    state.aiTeamShape = "defend";
  } else if (attacking) {
    // Dopo un buon colpo avanzano insieme, mantenendo il centro coperto.
    primaryTargetY = COURT.netY - 70;
    supportTargetY = COURT.netY - 78;
    state.aiTeamShape = "attack";
  } else {
    primaryTargetY = COURT.top + 92;
    supportTargetY = COURT.top + 84;
    state.aiTeamShape = "reset";
  }

  const readingIncomingShot = defending && state.aiReceiverLocked && state.aiReactionDelay > 0;
  if (!readingIncomingShot) movePaddleTo(primary, primaryTargetX, primaryTargetY, dt);
  else primary.motion = Math.max(0, primary.motion - dt * 7);
  movePaddleTo(support, supportTargetX, supportTargetY, dt);
}

function updateDoublesAI(state, dt) {
  if (state.serving) return;
  const { ball, opponent, opponentMate, ai } = state;
  state.aiReactionDelay = Math.max(0, state.aiReactionDelay - dt);
  const inactiveTeamMate = state.activePlayerKey === "player" ? state.playerMate : state.player;
  const inactiveHomeY = inactiveTeamMate.role === "net" ? COURT.netY + 92 : COURT.bottom - 86;
  if (!state.coop) {
    if (state.serviceReceiverKey) {
      const width = COURT.right - COURT.left;
      const receptionX = inactiveTeamMate === state.player
        ? COURT.left + width * 0.28
        : COURT.left + width * 0.72;
      const receptionY = COURT.bottom - 74;
      inactiveTeamMate.x += clamp(receptionX - inactiveTeamMate.x, -inactiveTeamMate.speed * dt, inactiveTeamMate.speed * dt);
      inactiveTeamMate.y += clamp(receptionY - inactiveTeamMate.y, -inactiveTeamMate.speed * 0.56 * dt, inactiveTeamMate.speed * 0.56 * dt);
    } else moveTacticalMate(state, inactiveTeamMate, dt);
  }
  if (state.pvp) {
    const inactivePvp = state.pvpActiveKey === "opponent" ? opponentMate : opponent;
    const pvpHomeY = inactivePvp.role === "net" ? COURT.netY - 84 : COURT.top + 76;
    if (state.aiServiceReceiverKey) {
      const width = COURT.right - COURT.left;
      const receiver = state[state.aiServiceReceiverKey];
      const receptionX = inactivePvp === opponent
        ? COURT.left + width * 0.28
        : COURT.left + width * 0.72;
      const targetX = inactivePvp === receiver && !ball.serveInFlight ? ball.x : receptionX;
      const receptionY = COURT.top + 74;
      inactivePvp.x += clamp(targetX - inactivePvp.x, -inactivePvp.speed * dt, inactivePvp.speed * dt);
      inactivePvp.y += clamp(receptionY - inactivePvp.y, -inactivePvp.speed * 0.56 * dt, inactivePvp.speed * 0.56 * dt);
    } else {
      moveComputerPaddle(inactivePvp, ball, dt, pvpHomeY, state.pvpAthlete?.stats.control ?? ai.skill);
    }
    return;
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

  const controllableHeight = ball.z <= BALANCE.playableHitHeight;
  const defenders = state.aiReceiverLocked
    ? [state[state.aiPrimaryKey]]
    : [opponent, opponentMate].sort((a, b) => paddleDistance(a, ball) - paddleDistance(b, ball));
  const responder = defenders.find((paddle) => canHit(paddle, ball));
  if (responder && controllableHeight && state.aiReactionDelay <= 0) {
    hitBall(state, responder, 0.88 + ai.skill * 0.12);
  }
}

function updateServing(state, dt, input, second = EMPTY_INPUT) {
  const isPlayer = state.serveSide === "player";
  if (isPlayer && state.activePlayerKey !== "player") setActivePlayer(state, "player");
  const server = isPlayer ? activePlayer(state) : state.opponent;
  if (isPlayer) {
    const startX = server.x;
    const startY = server.y;
    const moveX = clamp(input.moveX ?? ((input.left ? -1 : 0) + (input.right ? 1 : 0)), -1, 1);
    const moveY = clamp(input.moveY ?? ((input.up ? -1 : 0) + (input.down ? 1 : 0)), -1, 1);
    server.x += moveX * server.speed * dt;
    server.y += moveY * server.speed * 0.58 * dt;
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
      state.shotAimY = 0;
      addEvent(state, t("serveHint", {
        ordinal: t(state.serveAttempts ? "serveOrdSecond" : "serveOrdFirst"),
        suffix: input.slice ? t("serveSliceSuffix") : "",
      }));
    }
  } else if (state.humanMode === "pvp") {
    if (state.pvpActiveKey !== "opponent") setPvpActive(state, "opponent");
    state.serveTimer = 0;
    const startX = server.x;
    const startY = server.y;
    const moveX = clamp(second.moveX ?? 0, -1, 1);
    const moveY = clamp(second.moveY ?? 0, -1, 1);
    server.x += moveX * server.speed * dt;
    server.y += moveY * server.speed * 0.58 * dt;
    const serviceBounds = serviceCourtBounds(state, server);
    server.x = clamp(server.x, serviceBounds.min, serviceBounds.max);
    server.y = clamp(server.y, COURT.top + 28, SERVICE_TOP - 42);
    server.motion = Math.abs(server.x - startX) + Math.abs(server.y - startY) > 0.4
      ? 1
      : Math.max(0, server.motion - dt * 7);
    state.ball.x = server.x - 28;
    state.ball.y = server.y + 24;
    controlPaddleCharge(state, server, second, dt);
    if (second.hit) {
      performServe(state, server.charge, second.slice);
      server.charge = 0;
      server.aim = 0;
      server.aimY = 0;
      addEvent(state, t("serveHint", {
        ordinal: t(state.serveAttempts ? "serveOrdSecond" : "serveOrdFirst"),
        suffix: second.slice ? t("serveSliceSuffix") : "",
      }));
    }
  } else {
    state.serveTimer -= dt;
    server.x += (serviceOriginX(state) - server.x) * Math.min(1, dt * 4);
    state.ball.x = server.x - 28;
    state.ball.y = server.y + 24;
    if (state.serveTimer <= 0) {
      performServe(state);
      addEvent(state, t("evOppServe"));
    }
  }
}

function updateShotControl(state, dt, input) {
  if (input.analogAim) {
    state.shotAim = clamp(input.aim ?? 0, -1, 1);
    state.shotAimY = clamp(input.aimY ?? 0, -1, 1);
  }
  if (!input.charging) {
    if (!input.hit) {
      state.shotAim *= Math.max(0, 1 - dt * 8);
      state.shotAimY *= Math.max(0, 1 - dt * 8);
    }
    return;
  }
  state.shotCharge = Math.min(1, state.shotCharge + dt / 1.05);
  if (!input.analogAim) {
    const aimDirection = input.left ? -1 : input.right ? 1 : 0;
    state.shotAim = clamp(state.shotAim + aimDirection * dt * 1.9, -1, 1);
  }
  state.shotIntent = input.shotVariant ?? (input.slice ? "slice" : "drive");
}

function queueChargedShot(state, slice = false, variant = "auto") {
  state.queuedShotPower = 0.4 + state.shotCharge * 0.95;
  state.queuedShotCharge = state.shotCharge;
  state.queuedShotAge = 0;
  state.queuedShotAim = state.shotAim;
  state.queuedShotAimY = state.shotAimY;
  state.queuedShotSlice = slice;
  state.queuedShotVariant = variant;
  state.shotCharge = 0;
  state.shotAim = 0;
  state.shotAimY = 0;
}

const EMPTY_INPUT = {
  left: false,
  right: false,
  up: false,
  down: false,
  moveX: 0,
  moveY: 0,
  charging: false,
  hit: false,
  slice: false,
  shotVariant: null,
  special: false,
  switchPlayer: false,
  switchDirection: null,
  aim: 0,
  aimY: 0,
  analogAim: false,
  splitStep: 0,
  sprint: 0,
  technicalModifier: false,
  teamTactic: null,
};

function moveHumanPaddle(state, paddle, input, dt) {
  const digitalX = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const digitalY = (input.up ? -1 : 0) + (input.down ? 1 : 0);
  const moveX = clamp(input.moveX ?? digitalX, -1, 1);
  const moveY = clamp(input.moveY ?? digitalY, -1, 1);
  const splitStep = input.charging ? 0 : clamp(input.splitStep ?? 0, 0, 1);
  const sprint = input.charging || splitStep > 0.15 ? 0 : clamp(input.sprint ?? 0, 0, 1);
  const chargeMovement = input.charging ? 0.32 : 1;
  const movementMultiplier = chargeMovement
    * (1 - splitStep * (1 - BALANCE.splitStepSpeed))
    * (1 + sprint * BALANCE.sprintSpeedBonus);
  paddle.splitStep = splitStep;
  paddle.sprinting = sprint;
  const startX = paddle.x;
  const startY = paddle.y;
  paddle.x += moveX * paddle.speed * movementMultiplier * dt;
  paddle.y += moveY * paddle.speed * 0.68 * movementMultiplier * dt;
  if (paddle.dashTimer > 0) {
    paddle.x += moveX * 260 * dt;
    paddle.dashTimer -= dt;
  }
  paddle.x = clamp(paddle.x, COURT.left + paddle.w / 2, COURT.right - paddle.w / 2);
  const receiverKey = paddle.isPlayer ? state.serviceReceiverKey : state.aiServiceReceiverKey;
  let minY;
  let maxY;
  if (paddle.isPlayer) {
    minY = COURT.netY + 42;
    maxY = COURT.bottom - 42;
    if (receiverKey === paddle.key) minY = SERVICE_BOTTOM + 20;
  } else {
    minY = COURT.top + 42;
    maxY = COURT.netY - 42;
    if (receiverKey === paddle.key) maxY = SERVICE_TOP - 20;
  }
  paddle.y = clamp(paddle.y, minY, maxY);
  paddle.motion = Math.abs(paddle.x - startX) + Math.abs(paddle.y - startY) > 0.4
    ? 1
    : Math.max(0, paddle.motion - dt * 7);
  paddle.moveRatio = clamp(
    Math.hypot(paddle.x - startX, paddle.y - startY) / Math.max(1, paddle.speed * dt),
    0,
    1,
  );
  paddle.hitCooldown = Math.max(0, paddle.hitCooldown - dt);
}

function setPlayerTeamTactic(state, tactic) {
  if (!tactic || state.playerTeamTactic === tactic) return;
  state.playerTeamTactic = tactic;
  state.tacticFlash = 1.1;
  addEvent(state, t(`tactic_${tactic}`));
}

function tacticalMateTarget(state, mate) {
  const active = activePlayer(state);
  const width = COURT.right - COURT.left;
  const leftLane = COURT.left + width * 0.28;
  const rightLane = COURT.left + width * 0.72;
  const oppositeLane = active.x < (COURT.left + COURT.right) / 2 ? rightLane : leftLane;
  const tactic = state.playerTeamTactic ?? "balanced";
  if (tactic === "attack") return { x: oppositeLane, y: COURT.netY + 78 };
  if (tactic === "defend") return { x: oppositeLane, y: COURT.bottom - 76 };
  if (tactic === "staggered") {
    const activeAtNet = active.y < COURT.netY + 150;
    return { x: oppositeLane, y: activeAtNet ? COURT.bottom - 92 : COURT.netY + 88 };
  }
  const incoming = ballPlayableDirection("player", state.ball) && state.ball.y > COURT.netY;
  return {
    x: incoming ? clamp(state.ball.x < active.x ? rightLane : leftLane, COURT.left + 72, COURT.right - 72) : oppositeLane,
    y: active.y < COURT.netY + 145 ? COURT.netY + 88 : COURT.bottom - 92,
  };
}

function moveTacticalMate(state, mate, dt) {
  const target = tacticalMateTarget(state, mate);
  const startX = mate.x;
  const startY = mate.y;
  mate.x = clamp(mate.x + clamp(target.x - mate.x, -mate.speed * dt, mate.speed * dt), COURT.left + mate.w / 2, COURT.right - mate.w / 2);
  mate.y = clamp(mate.y + clamp(target.y - mate.y, -mate.speed * 0.56 * dt, mate.speed * 0.56 * dt), COURT.netY + 42, COURT.bottom - 42);
  mate.motion = Math.abs(mate.x - startX) + Math.abs(mate.y - startY) > 0.4 ? 1 : Math.max(0, mate.motion - dt * 7);
  mate.moveRatio = clamp(Math.hypot(mate.x - startX, mate.y - startY) / Math.max(1, mate.speed * dt), 0, 1);
}

function controlPaddleCharge(state, paddle, input, dt) {
  if (input.analogAim) {
    paddle.aim = clamp(input.aim ?? 0, -1, 1);
    paddle.aimY = clamp(input.aimY ?? 0, -1, 1);
  }
  if (input.charging) {
    paddle.charge = Math.min(1, paddle.charge + dt / 1.05);
    if (!input.analogAim) {
      const aimDirection = input.left ? -1 : input.right ? 1 : 0;
      paddle.aim = clamp(paddle.aim + aimDirection * dt * 1.9, -1, 1);
    }
    paddle.shotIntent = input.shotVariant ?? (input.slice ? "slice" : "drive");
  } else if (!input.hit) {
    paddle.aim *= Math.max(0, 1 - dt * 8);
    paddle.aimY *= Math.max(0, 1 - dt * 8);
  }
}

function queuePaddleHit(state, paddle, input) {
  if (input.smashUpgrade && paddle.smashPrimed && paddle.queuedShot) {
    paddle.queuedShot.variant = "smash";
    paddle.queuedShot.aim = clamp(input.aim ?? paddle.queuedShot.aim, -1, 1);
    paddle.queuedShot.aimY = clamp(input.aimY ?? paddle.queuedShot.aimY, -1, 1);
    paddle.queuedShot.age = 0;
    paddle.smashPrimed = false;
    paddle.smashTapWindow = 0;
    paddle.shotIntent = "smash";
    addEvent(state, t("evSmashTapConfirmed"));
    return;
  }
  if (!input.hit) return;
  paddle.queuedShot = {
    power: 0.4 + paddle.charge * 0.95,
    charge: paddle.charge,
    aim: paddle.aim,
    aimY: paddle.aimY,
    slice: input.slice,
    variant: input.shotVariant ?? (input.slice ? "slice" : "auto"),
    age: 0,
  };
  const nearNet = paddle.isPlayer
    ? paddle.y <= COURT.netY + BALANCE.smashNetWindow
    : paddle.y >= COURT.netY - BALANCE.smashNetWindow;
  const canPrimeSmash = paddle.queuedShot.variant === "drive"
    && !paddle.queuedShot.slice
    && nearNet
    && state.ball.z >= BALANCE.smashMinHeight - 8
    && hitPowerProfile(paddle, state, paddle.queuedShot.power) >= BALANCE.smashMinPower;
  paddle.smashPrimed = canPrimeSmash;
  paddle.smashTapWindow = canPrimeSmash ? BALANCE.smashDoubleTapWindow : 0;
  paddle.swingBuffer = canPrimeSmash ? BALANCE.smashBufferWindow : BALANCE.shotBufferWindow;
  if (canPrimeSmash) addEvent(state, t("evSmashPrimed"));
  paddle.charge = 0;
  paddle.aim = 0;
  paddle.aimY = 0;
}

function decayHumanSwing(state, paddle, dt) {
  if (paddle.swingBuffer <= 0) return;
  const hadContactGrace = (paddle.smashContactGrace ?? 0) > 0;
  paddle.smashContactGrace = Math.max(0, (paddle.smashContactGrace ?? 0) - dt);
  if (hadContactGrace && paddle.smashContactGrace === 0 && paddle.smashPrimed) {
    paddle.smashPrimed = false;
    paddle.smashTapWindow = 0;
    paddle.smashContactFallback = true;
    addEvent(state, t("evSmashTapExpired"));
  }
  if (paddle.smashPrimed) {
    paddle.smashTapWindow = Math.max(0, paddle.smashTapWindow - dt);
    if (paddle.smashTapWindow === 0) {
      paddle.smashPrimed = false;
      addEvent(state, t("evSmashTapExpired"));
    }
  }
  if (paddle.queuedShot) paddle.queuedShot.age += dt;
  paddle.swingBuffer = Math.max(0, paddle.swingBuffer - dt);
  if (paddle.swingBuffer === 0 && paddle.queuedShot?.variant === "smash") {
    state.shotFeedback = {
      text: t("smashMissedContact"),
      mode: t("smashMissedHint"),
      grade: "early",
      quality: 0,
      life: 1.05,
      paddleKey: paddle.key,
    };
    paddle.queuedShot = null;
  }
}

function attemptHumanSwing(state, paddle, previousBall) {
  if (paddle.swingBuffer <= 0 || !paddle.queuedShot) return;
  const contactNow = canHit(paddle, state.ball) || crossedPaddle(paddle, state.ball, previousBall);
  if (paddle.smashPrimed && contactNow) {
    paddle.smashContactGrace = Math.max(
      paddle.smashContactGrace ?? 0,
      BALANCE.smashContactGrace,
    );
    return;
  }
  if (paddle.smashPrimed) return;
  if (!contactNow && !paddle.smashContactFallback && !(paddle.smashContactGrace > 0)) return;
  const q = paddle.queuedShot;
  if (hitBall(
    state,
    paddle,
    q.power,
    false,
    true,
    q.aim,
    q.slice,
    q.variant,
    q.aimY,
    q.variant === "smash" ? Math.min(q.age, BALANCE.smashTimingAgeCap) : q.age,
  )) {
    paddle.swingBuffer = 0;
    paddle.queuedShot = null;
    paddle.smashContactGrace = 0;
    paddle.smashContactFallback = false;
  }
}

function setPvpActive(state, key) {
  if (state.pvpActiveKey === key) return;
  state.pvpActiveKey = key;
  state.opponent.controlled = key === "opponent";
  state.opponentMate.controlled = key === "opponentMate";
  state.pvpSwitchCooldown = 0.28;
}

function updatePvpActive(state, dt, forceSwitch, switchDirection = null) {
  state.pvpSwitchCooldown = Math.max(0, state.pvpSwitchCooldown - dt);
  if (!forceSwitch && !switchDirection) return;
  if (state.aiServiceReceiverKey) return;
  const otherKey = state.pvpActiveKey === "opponent" ? "opponentMate" : "opponent";
  if (switchDirection) {
    const current = state[state.pvpActiveKey];
    const alternate = state[otherKey];
    const dx = alternate.x - current.x;
    const dy = alternate.y - current.y;
    const length = Math.hypot(dx, dy) || 1;
    const directionLength = Math.hypot(switchDirection.x, switchDirection.y) || 1;
    const alignment = (dx / length) * (switchDirection.x / directionLength)
      + (dy / length) * (switchDirection.y / directionLength);
    if (alignment < 0.2) return;
  }
  setPvpActive(state, otherKey);
  state.pvpSwitchFlash = 0.55;
}

export function updateMatch(state, dt, input, input2 = null) {
  const second = input2 ?? EMPTY_INPUT;
  if (state.paused || !state.running) return null;
  state.elapsed += dt;
  state.receiverSwitchFlash = Math.max(0, state.receiverSwitchFlash - dt);
  state.manualSwitchFlash = Math.max(0, state.manualSwitchFlash - dt);
  state.pvpSwitchFlash = Math.max(0, state.pvpSwitchFlash - dt);
  state.tacticFlash = Math.max(0, state.tacticFlash - dt);
  setPlayerTeamTactic(state, input.teamTactic);
  if (state.shotFeedback) {
    state.shotFeedback.life = Math.max(0, state.shotFeedback.life - dt);
    if (state.shotFeedback.life === 0) state.shotFeedback = null;
  }
  updateFx(state, dt);
  for (const paddle of [state.player, state.playerMate, state.opponent, state.opponentMate]) {
    paddle.actionPose = Math.max(0, paddle.actionPose - dt);
    if (paddle.motion > 0.12) {
      const pace = 3
        + (paddle.moveRatio ?? 0.6) * 2.2
        + (paddle.sprinting ?? 0) * 0.6;
      const splitStepFactor = 1 - (paddle.splitStep ?? 0) * 0.22;
      paddle.runPhase = (paddle.runPhase + dt * pace * splitStepFactor) % 4;
    }
  }
  if (state.pointPause > 0) {
    for (const paddle of [state.player, state.playerMate, state.opponent, state.opponentMate]) {
      paddle.motion = 0;
      paddle.moveRatio = 0;
    }
    state.pointPause = Math.max(0, state.pointPause - dt);
    if (state.pointPause === 0 && !state.result) {
      resetReplayBuffer(state);
      prepareServe(state);
    }
    return state.result;
  }
  if (state.humanMode !== "coop" || state.serving) {
    updateShotControl(state, dt, input);
  }
  const { ball } = state;
  if (state.serving) {
    updateServing(state, dt, input, second);
    captureReplayFrame(state);
    return state.result;
  }

  let player = activePlayer(state);
  if (state.humanMode === "coop") {
    controlPaddleCharge(state, player, input, dt);
    queuePaddleHit(state, player, input);
    moveHumanPaddle(state, player, input, dt);
    decayHumanSwing(state, player, dt);
    controlPaddleCharge(state, state.playerMate, second, dt);
    queuePaddleHit(state, state.playerMate, second);
    moveHumanPaddle(state, state.playerMate, second, dt);
    decayHumanSwing(state, state.playerMate, dt);
    state.opponent.hitCooldown = Math.max(0, state.opponent.hitCooldown - dt);
    state.opponentMate.hitCooldown = Math.max(0, state.opponentMate.hitCooldown - dt);
    state.wallEventTimer = Math.max(0, state.wallEventTimer - dt);
    const hadSmashContactGrace = state.smashContactGrace > 0;
    state.smashContactGrace = Math.max(0, state.smashContactGrace - dt);
    if (hadSmashContactGrace && state.smashContactGrace === 0 && state.smashPrimed) {
      state.smashPrimed = false;
      state.smashTapWindow = 0;
      state.smashContactFallback = true;
      addEvent(state, t("evSmashTapExpired"));
    }
    if (input.special) {
      state.playerSwingBuffer = 0.24;
      trySpecial(state);
    }
    state.shotCharge = player.charge;
    state.shotAim = player.aim;
    state.shotAimY = player.aimY;
  } else {
    const digitalMoveX = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const digitalMoveY = (input.up ? -1 : 0) + (input.down ? 1 : 0);
    const moveX = clamp(input.moveX ?? digitalMoveX, -1, 1);
    const moveY = clamp(input.moveY ?? digitalMoveY, -1, 1);
    const movementIntent = Math.hypot(moveX, moveY) > 0.08;
    state.manualMovementTimer = movementIntent
      ? 0.18
      : Math.max(0, state.manualMovementTimer - dt);
    updateActivePlayer(state, dt, input.switchPlayer, input.switchDirection);
    player = activePlayer(state);
    const playerStartX = player.x;
    const playerStartY = player.y;

    const splitStep = input.charging ? 0 : clamp(input.splitStep ?? 0, 0, 1);
    const sprint = input.charging || splitStep > 0.15 ? 0 : clamp(input.sprint ?? 0, 0, 1);
    const chargeMovement = input.charging ? 0.32 : 1;
    const movementMultiplier = chargeMovement
      * (1 - splitStep * (1 - BALANCE.splitStepSpeed))
      * (1 + sprint * BALANCE.sprintSpeedBonus);
    player.splitStep = splitStep;
    player.sprinting = sprint;
    player.x += moveX * player.speed * movementMultiplier * dt;
    player.y += moveY * player.speed * 0.68 * movementMultiplier * dt;
    if (player.dashTimer > 0) {
      player.x += moveX * 260 * dt;
      player.dashTimer -= dt;
    }
    player.x = clamp(player.x, COURT.left + player.w / 2, COURT.right - player.w / 2);
    const playerMinY = state.serviceReceiverKey ? SERVICE_BOTTOM + 20 : COURT.netY + 42;
    player.y = clamp(player.y, playerMinY, COURT.bottom - 42);
    player.motion = Math.abs(player.x - playerStartX) + Math.abs(player.y - playerStartY) > 0.4
      ? 1
      : Math.max(0, player.motion - dt * 7);
    player.moveRatio = clamp(
      Math.hypot(player.x - playerStartX, player.y - playerStartY) / Math.max(1, player.speed * dt),
      0,
      1,
    );
    player.hitCooldown = Math.max(0, player.hitCooldown - dt);
    state.playerMate.hitCooldown = Math.max(0, state.playerMate.hitCooldown - dt);
    state.opponent.hitCooldown = Math.max(0, state.opponent.hitCooldown - dt);
    state.opponentMate.hitCooldown = Math.max(0, state.opponentMate.hitCooldown - dt);
    state.wallEventTimer = Math.max(0, state.wallEventTimer - dt);
    if (state.smashPrimed) {
      state.smashTapWindow = Math.max(0, state.smashTapWindow - dt);
      if (state.smashTapWindow === 0) {
        state.smashPrimed = false;
        addEvent(state, t("evSmashTapExpired"));
      }
    }
    if (input.hit) {
      queueChargedShot(state, input.slice, input.shotVariant ?? (input.slice ? "slice" : "auto"));
      const queuedPower = state.queuedShotPower * state.athlete.stats.power;
      const canPrimeSmash = state.queuedShotVariant === "drive"
        && !state.queuedShotSlice
        && player.y <= COURT.netY + BALANCE.smashNetWindow
        && ball.z >= BALANCE.smashMinHeight - 8
        && queuedPower >= BALANCE.smashMinPower;
      state.smashPrimed = canPrimeSmash;
      state.smashTapWindow = canPrimeSmash ? BALANCE.smashDoubleTapWindow : 0;
      state.playerSwingBuffer = canPrimeSmash ? BALANCE.smashBufferWindow : BALANCE.shotBufferWindow;
      if (canPrimeSmash) addEvent(state, t("evSmashPrimed"));
    }
    if (input.smashUpgrade && state.smashPrimed && state.playerSwingBuffer > 0) {
      state.queuedShotVariant = "smash";
      state.queuedShotAim = clamp(input.aim ?? state.queuedShotAim, -1, 1);
      state.queuedShotAimY = clamp(input.aimY ?? state.queuedShotAimY, -1, 1);
      state.queuedShotAge = 0;
      state.shotIntent = "smash";
      state.smashPrimed = false;
      state.smashTapWindow = 0;
      addEvent(state, t("evSmashTapConfirmed"));
    }
    const hadSwingBuffer = state.playerSwingBuffer > 0;
    if (state.playerSwingBuffer > 0) state.queuedShotAge += dt;
    state.playerSwingBuffer = Math.max(0, state.playerSwingBuffer - dt);
    if (hadSwingBuffer && state.playerSwingBuffer === 0 && state.queuedShotVariant === "smash") {
      state.shotFeedback = {
        text: t("smashMissedContact"),
        mode: t("smashMissedHint"),
        grade: "early",
        quality: 0,
        life: 1.05,
        paddleKey: state.activePlayerKey,
      };
      state.queuedShotAge = 0;
      state.queuedShotVariant = "auto";
    }
    if (input.special) {
      state.playerSwingBuffer = 0.24;
      trySpecial(state);
    }
  }
  if (state.humanMode === "pvp") {
    updatePvpActive(state, dt, second.switchPlayer, second.switchDirection);
    const p2 = state[state.pvpActiveKey];
    controlPaddleCharge(state, p2, second, dt);
    queuePaddleHit(state, p2, second);
    moveHumanPaddle(state, p2, second, dt);
    decayHumanSwing(state, p2, dt);
  }

  if (state.shieldTimer > 0 && ball.vy > 0) ball.vy *= 1 - dt * 0.55;
  state.shieldTimer = Math.max(0, state.shieldTimer - dt);
  const humanSprintLoad = state.humanMode === "coop"
    ? Math.max(state.player.sprinting ?? 0, state.playerMate.sprinting ?? 0)
    : player.sprinting ?? 0;
  state.rallyEnergy.player = clamp(
    state.rallyEnergy.player
      + dt * BALANCE.rallyEnergyRecovery * (1 - player.moveRatio * 0.7)
      - dt * BALANCE.sprintEnergyDrain * clamp(humanSprintLoad, 0, 1) * player.moveRatio,
    BALANCE.rallyEnergyFloor,
    1,
  );
  state.rallyEnergy.ai = clamp(
    state.rallyEnergy.ai + dt * BALANCE.rallyEnergyRecovery * 0.72,
    BALANCE.rallyEnergyFloor,
    1,
  );

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
  ball.topspin *= Math.pow(0.995, dt * 60);
  ball.bouncePulse = Math.max(0, (ball.bouncePulse ?? 0) - dt * 8.5);
  ball.netCord = Math.max(0, (ball.netCord ?? 0) - dt * 5.5);
  ball.landRing = Math.max(0, (ball.landRing ?? 0) - dt);

  if (!state.serving) {
    ball.trailTime -= dt;
    if (ball.trailTime <= 0 && Math.hypot(ball.vx, ball.vy) > 80) {
      ball.trail.push({ x: ball.x, y: ball.y, z: ball.z, life: 0.3 });
      if (ball.trail.length > 10) ball.trail.shift();
      ball.trailTime = 0.022;
    }
    for (const point of ball.trail) point.life -= dt;
    if (ball.trail.length && ball.trail[0].life <= 0) ball.trail.shift();
  } else {
    ball.trail = [];
  }

  const playerContactNow = canHit(player, ball) || crossedPaddle(player, ball, previousBall);
  if (state.playerSwingBuffer > 0 && state.smashPrimed && playerContactNow) {
    state.smashContactGrace = Math.max(state.smashContactGrace, BALANCE.smashContactGrace);
  }
  if (state.playerSwingBuffer > 0
    && !state.smashPrimed
    && (playerContactNow || state.smashContactGrace > 0 || state.smashContactFallback)) {
    if (hitBall(
      state,
      player,
      state.queuedShotPower,
      false,
      true,
      state.queuedShotAim,
      state.queuedShotSlice,
      state.queuedShotVariant,
      state.queuedShotAimY,
      state.queuedShotVariant === "smash"
        ? Math.min(state.queuedShotAge, BALANCE.smashTimingAgeCap)
        : state.queuedShotAge,
    )) {
      state.playerSwingBuffer = 0;
      state.queuedShotAge = 0;
      state.queuedShotSlice = false;
      state.queuedShotVariant = "auto";
      state.smashPrimed = false;
      state.smashTapWindow = 0;
      state.smashContactGrace = 0;
      state.smashContactFallback = false;
    }
  }
  if (state.humanMode === "coop") {
    attemptHumanSwing(state, state.player, previousBall);
    attemptHumanSwing(state, state.playerMate, previousBall);
  } else if (state.humanMode === "pvp") {
    attemptHumanSwing(state, state[state.pvpActiveKey], previousBall);
  }
  if (handleNetCollision(state, previousBall)) return state.result;
  const smashReturnsOverNet = ball.shotType === "smash-x2"
    && ball.smashStage >= 2
    && ((state.lastHitterSide === "player"
      && previousBall.y < COURT.netY
      && ball.y >= COURT.netY
      && ball.vy > 0)
      || (state.lastHitterSide === "ai"
        && previousBall.y > COURT.netY
        && ball.y <= COURT.netY
        && ball.vy < 0));
  if (smashReturnsOverNet) {
    scorePoint(state, state.lastHitterSide, t("msgSmashReturned"));
    return state.result;
  }
  if (!ball.crossedNet
    && (previousBall.y - COURT.netY) * (ball.y - COURT.netY) <= 0
    && Math.abs(ball.y - previousBall.y) > 0.01) {
    ball.crossedNet = true;
  }
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
  captureReplayFrame(state);
  return state.result;
}

export function getMatchInfo(state) {
  const match = state.mode === "tournament"
    ? `${t("tournamentMatch")} ${state.tournamentRound + 1}/3`
    : state.mode === "career"
      ? `${t("careerMatch")} · ${t("careerSeason", { n: state.careerSeason })}`
      : t("quickMatch");
  const hm = state.humanMode === "coop" ? t("hmCoop") : state.humanMode === "pvp" ? t("hmPvp") : "";
  const base = hm ? `${match} · ${hm}` : match;
  if (state.pointsToWin) {
    return `${base} · ${t("ptsToWin", { n: state.pointsToWin })}`;
  }
  const games = state.tieBreak
    ? `${t("tieBreakShort")} ${state.tieBreakPoints.player}-${state.tieBreakPoints.ai}`
    : `${t("setLbl")} ${state.sets.player + state.sets.ai + 1} · ${t("gamesLbl")} ${state.games.player}-${state.games.ai}`;
  return `${base} · ${games}`;
}
