import { ARENAS, ATHLETES, BALANCE, COURT, matchObjective } from "./data.js?v=20260812-character-sprites-v8";
import {
  createMatchState,
  resetReplayBuffer,
  updateMatch,
} from "./game.js?v=20260812-deterministic-v8";
import { getVolume, initAudio, isMuted, music, setMuted, setVolume } from "./audio.js?v=20260812-deterministic-v8";
import { setReduceMotion } from "./fx.js?v=20260812-deterministic-v8";
import { createDrill, updateDrill } from "./drill.js?v=20260812-deterministic-v8";
import { getLang, setLang, t } from "./i18n.js?v=20260812-deterministic-v8";
import {
  drawArena,
  drawActiveIndicator,
  drawBall,
  drawFx,
  drawHitZone,
  drawLandingMarker,
  drawPaddle,
  drawServeBox,
  drawShotFeedback,
  drawTeamGeometry,
  drawTimingHud,
} from "./render.js?v=20260812-deterministic-v8";
import {
  applyLanguage,
  awardObjectives,
  bindNavigation,
  collectPrefs,
  ensureSeasonObjectives,
  getAiForMatch,
  loadPrefs,
  recordMatch,
  renderArenas,
  renderAthletes,
  renderHistory,
  renderProfile,
  resetSeasonObjectives,
  saveCareer,
  savePrefs,
  showResult,
  showScreen,
  ui,
  updateHud,
} from "./ui.js?v=20260812-deterministic-v8";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const miniMap = document.getElementById("miniMap");
const miniCtx = miniMap.getContext("2d");
const pauseOverlay = document.getElementById("pauseOverlay");
const pauseTabs = [...document.querySelectorAll("[data-pause-tab]")];
const pausePanels = [...document.querySelectorAll("[data-pause-panel]")];
const pauseControlsOverview = document.getElementById("pauseControlsOverview");
const smashTutorial = document.getElementById("smashTutorial");
const openSmashTutorialButton = document.getElementById("openSmashTutorial");
const closeSmashTutorialButton = document.getElementById("closeSmashTutorial");
const trySmashTutorialButton = document.getElementById("trySmashTutorial");
const eventLog = document.getElementById("eventLog");
const eventLogToggle = document.getElementById("eventLogToggle");

function loadOptionalSprite(path) {
  const sprite = new Image();
  sprite.decoding = "async";
  if (path) sprite.src = path;
  return sprite;
}

const athleteSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.sprite)];
}));

const athleteBackSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.backSprite)];
}));

const athleteActionSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.actionSprite)];
}));

const athleteBackActionSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.backActionSprite)];
}));

const athleteRunSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.runSprite)];
}));

const athleteBackRunSprites = new Map(ATHLETES.map((athlete) => {
  return [athlete.id, loadOptionalSprite(athlete.backRunSprite)];
}));

const keys = new Set();
let hitQueued = false;
let sliceQueued = false;
let shotVariantQueued = null;
let shotAimQueued = null;
let specialQueued = false;
let switchQueued = false;
let switchDirectionQueued = null;
let matchState = null;
let gameLoopGeneration = 0;
let replayActive = false;
let replayIndex = 0;
let replayAccum = 0;
let drillState = null;
let drillLoopGen = 0;
let drillLastTime = 0;

const GAMEPAD_MENU_DEADZONE = 0.28;
const gamepad = {
  index: null,
  connected: false,
  prevButtons: {},
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  chargeAction: null,
  smashTapConsumed: false,
  smashUpgradeQueued: false,
  cutVolleyQueued: false,
  switchStickLatched: false,
  splitStep: 0,
  sprint: 0,
  technicalModifier: false,
  tacticQueued: null,
  awaitingGameplayRelease: false,
  id: "",
  menuDir: null,
  menuRepeatAt: 0,
};
const gamepad2 = {
  index: null,
  connected: false,
  prevButtons: {},
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  chargeAction: null,
  smashTapConsumed: false,
  smashUpgradeQueued: false,
  cutVolleyQueued: false,
  switchStickLatched: false,
  splitStep: 0,
  sprint: 0,
  technicalModifier: false,
  tacticQueued: null,
  awaitingGameplayRelease: false,
  hitQueued: false,
  sliceQueued: false,
  shotVariantQueued: null,
  shotAimQueued: null,
  specialQueued: false,
  switchQueued: false,
  switchDirectionQueued: null,
};

let menuFocusEl = null;
let activePauseTab = "match";
let quitConfirmArmed = false;
let smashTutorialOpen = false;

function hideSmashTutorial(focusTrigger = false) {
  smashTutorialOpen = false;
  if (pauseControlsOverview) pauseControlsOverview.hidden = false;
  if (smashTutorial) smashTutorial.hidden = true;
  setMenuFocus(null);
  if (focusTrigger && openSmashTutorialButton) {
    requestAnimationFrame(() => setMenuFocus(openSmashTutorialButton));
  }
}

function showSmashTutorial() {
  smashTutorialOpen = true;
  if (pauseControlsOverview) pauseControlsOverview.hidden = true;
  if (smashTutorial) smashTutorial.hidden = false;
  setMenuFocus(null);
  requestAnimationFrame(() => setMenuFocus(closeSmashTutorialButton));
}

function setPauseTab(tabName, focusTab = false) {
  if (smashTutorialOpen) hideSmashTutorial(false);
  activePauseTab = tabName;
  let activeButton = null;
  pauseTabs.forEach((button) => {
    const active = button.dataset.pauseTab === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    if (active) activeButton = button;
  });
  pausePanels.forEach((panel) => {
    const active = panel.dataset.pausePanel === tabName;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  setMenuFocus(null);
  if (focusTab && gamepad.connected && activeButton) {
    requestAnimationFrame(() => setMenuFocus(activeButton));
  }
}

function gamepadAxis(pad, axis) {
  const v = pad.axes[axis] ?? 0;
  return Math.abs(v) < GAMEPAD_MENU_DEADZONE ? 0 : v;
}

function radialStick(x, y, deadzone = 0.15) {
  const magnitude = Math.min(1, Math.hypot(x, y));
  if (magnitude <= deadzone) return { x: 0, y: 0, magnitude: 0 };
  const normalized = (magnitude - deadzone) / (1 - deadzone);
  const curved = normalized ** 1.28;
  return {
    x: (x / magnitude) * curved,
    y: (y / magnitude) * curved,
    magnitude: curved,
  };
}

function shotAimAxis(value) {
  const clamped = Math.max(-1, Math.min(1, value));
  return Math.sign(clamped) * Math.pow(Math.abs(clamped), 0.72);
}

function isSliceAction(action) {
  return action === "slice" || action === "vibora";
}

function currentPad() {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  const selected = gamepad.index !== null ? pads[gamepad.index] : null;
  return selected?.connected ? selected : pads.find((pad) => pad?.connected) ?? null;
}

function pulseGamepad(duration = 55, strong = 0.35, weak = 0.22) {
  if (!ui.vibration) return;
  const actuator = currentPad()?.vibrationActuator;
  actuator?.playEffect?.("dual-rumble", {
    duration,
    strongMagnitude: strong,
    weakMagnitude: weak,
  }).catch(() => {});
}

function releaseGamepadKeys() {
  gamepad.move = { x: 0, y: 0 };
  gamepad.aim = { x: 0, y: 0 };
  gamepad.chargeAction = null;
  gamepad.smashTapConsumed = false;
  gamepad.smashUpgradeQueued = false;
  gamepad.cutVolleyQueued = false;
  gamepad.switchStickLatched = false;
  gamepad.splitStep = 0;
  gamepad.sprint = 0;
  gamepad.technicalModifier = false;
  gamepad.tacticQueued = null;
}

function releaseGamepadKeys2() {
  gamepad2.move = { x: 0, y: 0 };
  gamepad2.aim = { x: 0, y: 0 };
  gamepad2.chargeAction = null;
  gamepad2.smashTapConsumed = false;
  gamepad2.smashUpgradeQueued = false;
  gamepad2.cutVolleyQueued = false;
  gamepad2.switchStickLatched = false;
  gamepad2.splitStep = 0;
  gamepad2.sprint = 0;
  gamepad2.technicalModifier = false;
  gamepad2.tacticQueued = null;
  gamepad2.hitQueued = false;
  gamepad2.sliceQueued = false;
  gamepad2.shotVariantQueued = null;
  gamepad2.shotAimQueued = null;
  gamepad2.specialQueued = false;
  gamepad2.switchQueued = false;
  gamepad2.switchDirectionQueued = null;
}

function resetTransientInput({ awaitRelease = false, resetButtons = false } = {}) {
  releaseGamepadKeys();
  releaseGamepadKeys2();
  gamepad.awaitingGameplayRelease = awaitRelease;
  gamepad.menuDir = null;
  gamepad.menuRepeatAt = 0;
  if (resetButtons) gamepad.prevButtons = {};
  hitQueued = false;
  sliceQueued = false;
  shotVariantQueued = null;
  shotAimQueued = null;
  specialQueued = false;
  switchQueued = false;
  switchDirectionQueued = null;
  keys.clear();
}

function updateGamepadIndicator(connected, id = "") {
  const el = document.getElementById("gamepadIndicator");
  if (!el) return;
  el.hidden = !connected;
  const layout = detectControllerLayout(id);
  el.textContent = connected ? layout.badge : "🎮";
  el.dataset.controller = layout.type;
  el.title = connected ? t("gamepadConnected") : t("gamepadDisconnected");
}

function detectControllerLayout(id = "") {
  const value = String(id).toLowerCase();
  if (/xbox|xinput|microsoft/.test(value)) {
    return { type: "xbox", badge: "XBOX", image: "assets/ui/xbox-controller-steam.png", caption: t("xboxLayout"), keys: ["LS", "RS", "A", "X", "Y", "B", "LB", "LT", "RT", "RB", "D-PAD", "A+A", "☰"] };
  }
  if (/playstation|dualshock|dualsense|sony|ps[345]/.test(value)) {
    return { type: "playstation", badge: "PS", image: "assets/ui/playstation-controller-steam.png", caption: t("playstationLayout"), keys: ["L3", "R3", "✕", "□", "△", "○", "L1", "L2", "R2", "R1", "D-PAD", "✕+✕", "OPTIONS"] };
  }
  return { type: "generic", badge: "🎮", image: "assets/ui/generic-controller-steam.png", caption: t("genericControllerLayout"), keys: ["LS", "RS", "1", "3", "4", "2", "LB", "LT", "RT", "RB", "D-PAD", "1+1", "MENU"] };
}

function applyControllerLayout(id = gamepad.id) {
  const layout = detectControllerLayout(id);
  const italian = getLang() === "it";
  const faceHints = layout.type === "playstation"
    ? (italian ? "✕ drive · □ slice · △ lob · ○ speciale" : "✕ drive · □ slice · △ lob · ○ special")
    : layout.type === "generic"
      ? (italian ? "1 drive · 3 slice · 4 lob · 2 speciale" : "1 drive · 3 slice · 4 lob · 2 special")
      : (italian ? "A drive · X slice · Y lob · B speciale" : "A drive · X slice · Y lob · B special");
  const technicalHints = layout.type === "playstation"
    ? (italian ? "✕ chiquita, □ víbora, △ lob difensivo" : "✕ chiquita, □ vibora, △ defensive lob")
    : layout.type === "generic"
      ? (italian ? "1 chiquita, 3 víbora, 4 lob difensivo" : "1 chiquita, 3 vibora, 4 defensive lob")
      : (italian ? "A chiquita, X víbora, Y lob difensivo" : "A chiquita, X vibora, Y defensive lob");
  const smashHint = layout.type === "playstation"
    ? (italian ? "Carica e rilascia, poi premi ✕ all'impatto" : "Charge and release, then press ✕ at contact")
    : layout.type === "generic"
      ? (italian ? "Carica e rilascia, poi premi 1 all'impatto" : "Charge and release, then press 1 at contact")
      : (italian ? "Carica e rilascia, poi premi A all'impatto" : "Charge and release, then press A at contact");
  document.querySelectorAll("[data-controller-image]").forEach((image) => {
    image.src = layout.image;
    image.alt = `${layout.caption} · ${t("controllerDetected")}`;
  });
  document.querySelectorAll("[data-controller-caption]").forEach((caption) => {
    caption.textContent = layout.caption;
  });
  document.querySelectorAll('[data-i18n="padButtons"]').forEach((label) => { label.textContent = faceHints; });
  document.querySelectorAll('[data-i18n="padTechnicalDesc"]').forEach((label) => { label.textContent = technicalHints; });
  document.querySelectorAll('[data-i18n="padSmashDesc"]').forEach((label) => { label.textContent = smashHint; });
  const keycaps = document.querySelectorAll(".controls-guide__legend > div > kbd:first-child, .controls-guide__legend > button > kbd:first-child");
  keycaps.forEach((keycap, index) => {
    if (layout.keys[index]) keycap.textContent = layout.keys[index];
  });
  document.querySelectorAll(".help-controller-legend kbd").forEach((keycap, index) => {
    if (layout.keys[index]) keycap.textContent = layout.keys[index];
  });
  document.querySelectorAll("[data-controller-panel]").forEach((panel) => {
    panel.dataset.controller = layout.type;
  });
}

function updateStickMonitor(left = { x: 0, y: 0 }, right = { x: 0, y: 0 }) {
  const leftDot = document.getElementById("leftStickDot");
  const rightDot = document.getElementById("rightStickDot");
  if (leftDot) leftDot.style.transform = `translate(calc(-50% + ${left.x * 17}px), calc(-50% + ${left.y * 17}px))`;
  if (rightDot) rightDot.style.transform = `translate(calc(-50% + ${right.x * 17}px), calc(-50% + ${right.y * 17}px))`;
}

function togglePause() {
  if (!matchState?.running) return;
  if (matchState.paused) resumeGame();
  else pauseGame();
}

function menuContext() {
  if (matchState?.running && !matchState?.paused) return null;
  return pauseOverlay.hidden ? document.querySelector(".screen--active") : pauseOverlay;
}

function collectMenuTargets() {
  const root = menuContext();
  if (!root) return [];
  return [...root.querySelectorAll("button, input, .mode-card, .athlete-card, .arena-card")].filter((el) => {
    if (el.disabled) return false;
    if (el.closest("[hidden]")) return false;
    if (el.classList.contains("mode-card--locked")) return false;
    return el.offsetParent !== null;
  });
}

function setMenuFocus(el) {
  if (menuFocusEl === el) return;
  if (menuFocusEl) menuFocusEl.classList.remove("menu-focus");
  menuFocusEl = el;
  if (el) {
    el.classList.add("menu-focus");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function ensureMenuFocus() {
  const targets = collectMenuTargets();
  if (!targets.length) {
    setMenuFocus(null);
    return;
  }
  if (!menuFocusEl || !targets.includes(menuFocusEl)) setMenuFocus(targets[0]);
}

function moveMenuFocus(dir) {
  const targets = collectMenuTargets();
  if (!targets.length) return;
  const cur = menuFocusEl && targets.includes(menuFocusEl) ? menuFocusEl : null;
  if (!cur) {
    setMenuFocus(targets[0]);
    return;
  }
  if (cur.matches('input[type="range"]') && (dir === "left" || dir === "right")) {
    const step = Number(cur.step) || 0.01;
    const direction = dir === "left" ? -1 : 1;
    cur.value = String(Math.min(Number(cur.max), Math.max(Number(cur.min), Number(cur.value) + step * direction)));
    cur.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const curRect = cur.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const el of targets) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - curCx;
    const dy = r.top + r.height / 2 - curCy;
    let ok = false;
    if (dir === "left") ok = dx < -8;
    else if (dir === "right") ok = dx > 8;
    else if (dir === "up") ok = dy < -8;
    else ok = dy > 8;
    if (!ok) continue;
    const score = dir === "left" || dir === "right" ? Math.abs(dy) * 3 + Math.abs(dx) : Math.abs(dx) * 3 + Math.abs(dy);
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) setMenuFocus(best);
}

function activateMenuFocus() {
  ensureMenuFocus();
  menuFocusEl?.click();
}

function menuBack() {
  if (!pauseOverlay.hidden) {
    if (smashTutorialOpen) {
      hideSmashTutorial(true);
      return;
    }
    if (activePauseTab !== "match") {
      setPauseTab("match", true);
      return;
    }
    resumeGame();
    return;
  }
  const active = document.querySelector(".screen--active");
  const back = active?.querySelector('[data-action^="to-"]');
  if (back) back.click();
}

function pollGamepads() {
  const pads = (typeof navigator !== "undefined" && navigator.getGamepads)
    ? navigator.getGamepads()
    : [];
  const connected = [...pads].filter((pad) => pad?.connected);
  const pad = connected[0] ?? null;
  const pad2 = connected[1] ?? null;

  if (pad) {
    gamepad.connected = true;
    gamepad.index = pad.index;
    gamepad.id = pad.id ?? "";
    applyControllerLayout(gamepad.id);
    updateGamepadIndicator(true, gamepad.id);
    const previewDeadzone = ui.gamepadDeadzone ?? 0.15;
    updateStickMonitor(
      radialStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0, previewDeadzone),
      radialStick(pad.axes[2] ?? 0, pad.axes[3] ?? 0, previewDeadzone),
    );

    const b = (i) => pad.buttons[i]?.pressed ?? false;
    const inGame = !!matchState?.running && !matchState?.paused;
    if (inGame) pollGamepadGameplay(gamepad, pad, b);
    else pollGamepadMenu(pad, b);

    if (b(9) && !gamepad.prevButtons[9]) togglePause();
    gamepad.prevButtons[9] = b(9);
  } else if (gamepad.connected) {
    gamepad.connected = false;
    gamepad.index = null;
    releaseGamepadKeys();
    updateStickMonitor();
    setMenuFocus(null);
    updateGamepadIndicator(false);
    applyControllerLayout("");
  }

  if (pad2) {
    gamepad2.connected = true;
    gamepad2.index = pad2.index;
    const inGame = !!matchState?.running && !matchState?.paused;
    const multiplayer = matchState && (matchState.humanMode === "coop" || matchState.humanMode === "pvp");
    if (inGame && multiplayer) {
      const b2 = (i) => pad2.buttons[i]?.pressed ?? false;
      pollGamepadGameplay(gamepad2, pad2, b2, true);
    }
  } else if (gamepad2.connected) {
    gamepad2.connected = false;
    gamepad2.index = null;
    releaseGamepadKeys2();
  }
}

function pollGamepadGameplay(g, pad, b, isSecond = false) {
  const deadzone = ui.gamepadDeadzone ?? 0.15;
  const left = radialStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0, deadzone);
  const directionStick = left;
  g.move = directionStick;
  g.splitStep = pad.buttons[6]?.value ?? (b(6) ? 1 : 0);
  g.sprint = pad.buttons[7]?.value ?? (b(7) ? 1 : 0);
  g.technicalModifier = b(5);

  if (g.awaitingGameplayRelease) {
    g.aim = { x: 0, y: 0 };
    if (!b(0) && !b(1) && !b(2) && !b(3) && !b(4) && !b(5)) {
      g.awaitingGameplayRelease = false;
    }
    return;
  }

  const tacticButtons = [12, 13, 14, 15];
  const tactics = ["attack", "defend", "staggered", "balanced"];
  tacticButtons.forEach((button, index) => {
    if (b(button) && !g.prevButtons[button]) {
      g.tacticQueued = tactics[index];
      if (!isSecond) pulseGamepad(42, 0.2, 0.28);
    }
    g.prevButtons[button] = b(button);
  });

  const right = radialStick(pad.axes[2] ?? 0, pad.axes[3] ?? 0, deadzone);
  const secondPaddle = isSecond && matchState
    ? matchState.humanMode === "coop"
      ? matchState.playerMate
      : matchState.humanMode === "pvp"
        ? matchState[matchState.pvpActiveKey]
        : null
    : null;
  const smashPrimed = isSecond
    ? secondPaddle?.smashPrimed
    : matchState?.humanMode === "coop"
      ? matchState.player?.smashPrimed
      : matchState?.smashPrimed;
  const aJustPressed = b(0) && !g.prevButtons[0];
  if (!b(0)) g.smashTapConsumed = false;
  if (aJustPressed && smashPrimed) {
    g.smashUpgradeQueued = true;
    const tapAim = {
      x: shotAimAxis(directionStick.x),
      y: shotAimAxis(directionStick.y),
    };
    if (isSecond) g.shotAimQueued = tapAim;
    else shotAimQueued = tapAim;
    g.smashTapConsumed = true;
    g.move = { x: 0, y: 0 };
    if (!isSecond) pulseGamepad(95, 0.72, 0.5);
  }
  // Secondo tocco su X: stessa grammatica del doppio tap su A per lo smash.
  const cutVolleyPrimed = isSecond
    ? secondPaddle?.cutVolleyPrimed
    : matchState?.cutVolleyPrimed;
  const xJustPressed = b(2) && !g.prevButtons[2];
  if (!b(2)) g.cutVolleyTapConsumed = false;
  if (xJustPressed && cutVolleyPrimed) {
    g.cutVolleyQueued = true;
    g.cutVolleyTapConsumed = true;
    if (!isSecond) pulseGamepad(80, 0.6, 0.42);
  }
  g.prevButtons[2] = b(2);

  const shotButton = b(2) && !g.cutVolleyTapConsumed
    ? (g.technicalModifier ? "vibora" : "slice")
    : b(3)
      ? (g.technicalModifier ? "defensive-lob" : "lob")
      : b(0) && !g.smashTapConsumed
        ? (g.technicalModifier ? "chiquita" : "drive")
        : null;

  if (shotButton) {
    if (!g.chargeAction && !isSecond) initAudio();
    if (!g.chargeAction) {
      g.chargeAction = shotButton;
    }
    g.aim = {
      x: shotAimAxis(directionStick.x),
      y: shotAimAxis(directionStick.y),
    };
    g.move = { x: 0, y: 0 };
    g.switchStickLatched = false;
  } else if (g.chargeAction) {
    if (isSecond) {
      g.shotAimQueued = { ...g.aim };
      g.hitQueued = true;
      g.sliceQueued = isSliceAction(g.chargeAction);
      g.shotVariantQueued = g.chargeAction;
    } else {
      shotAimQueued = { ...gamepad.aim };
      hitQueued = true;
      sliceQueued = isSliceAction(gamepad.chargeAction);
      shotVariantQueued = gamepad.chargeAction;
      pulseGamepad(45, 0.28, 0.34);
    }
    g.chargeAction = null;
    g.aim = { x: 0, y: 0 };
  } else {
    g.aim = { x: 0, y: 0 };
    if (right.magnitude >= 0.72 && !g.switchStickLatched) {
      if (isSecond) g.switchDirectionQueued = { x: right.x, y: right.y };
      else switchDirectionQueued = { x: right.x, y: right.y };
      g.switchStickLatched = true;
      if (!isSecond) pulseGamepad(38, 0.18, 0.26);
    } else if (right.magnitude <= 0.3) {
      g.switchStickLatched = false;
    }
  }

  if (b(1) && !g.prevButtons[1]) {
    if (isSecond) g.specialQueued = true;
    else {
      specialQueued = true;
      initAudio();
      pulseGamepad(85, 0.55, 0.38);
    }
  }
  g.prevButtons[1] = b(1);

  if (b(4) && !g.prevButtons[4]) {
    if (isSecond) g.switchQueued = true;
    else switchQueued = true;
    if (!isSecond) pulseGamepad(38, 0.18, 0.26);
  }
  g.prevButtons[4] = b(4);
  g.prevButtons[0] = b(0);
}

function pollGamepadMenu(pad, b) {
  gamepad.aim = { x: 0, y: 0 };
  gamepad.move = { x: 0, y: 0 };
  gamepad.chargeAction = null;
  gamepad.switchStickLatched = false;
  ensureMenuFocus();

  const stickY = gamepadAxis(pad, 1);
  const stickX = gamepadAxis(pad, 0);
  const dpadUp = b(12);
  const dpadDown = b(13);
  const dpadLeft = b(14);
  const dpadRight = b(15);
  const dir = dpadUp || stickY < 0
    ? "up"
    : dpadDown || stickY > 0
      ? "down"
      : dpadLeft || stickX < 0
        ? "left"
        : dpadRight || stickX > 0
          ? "right"
          : null;

  const now = performance.now();
  if (dir) {
    if (dir !== gamepad.menuDir) {
      gamepad.menuDir = dir;
      gamepad.menuRepeatAt = now + 400;
      moveMenuFocus(dir);
    } else if (now >= gamepad.menuRepeatAt) {
      gamepad.menuRepeatAt = now + 150;
      moveMenuFocus(dir);
    }
  } else {
    gamepad.menuDir = null;
  }

  if (b(0) && !gamepad.prevButtons[0]) {
    initAudio();
    activateMenuFocus();
  }
  gamepad.prevButtons[0] = b(0);

  if (b(2) && !gamepad.prevButtons[2]) {
    menuBack();
  }
  gamepad.prevButtons[2] = b(2);
}

function gamepadLoop() {
  pollGamepads();
  requestAnimationFrame(gamepadLoop);
}

function getInput() {
  const keyboardX = (keys.has("a") || keys.has("arrowleft") ? -1 : 0)
    + (keys.has("d") || keys.has("arrowright") ? 1 : 0);
  const keyboardY = (keys.has("w") || keys.has("arrowup") ? -1 : 0)
    + (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  const keyboardLength = Math.max(1, Math.hypot(keyboardX, keyboardY));
  const usingGamepadMove = Math.hypot(gamepad.move.x, gamepad.move.y) > 0.02;
  const keyboardCharging = keys.has(" ") || keys.has("meta");
  const controllerVariant = gamepad.chargeAction ?? shotVariantQueued;
  const controllerAim = gamepad.chargeAction ? gamepad.aim : shotAimQueued;
  const input = {
    left: keyboardX < 0,
    right: keyboardX > 0,
    up: keyboardY < 0,
    down: keyboardY > 0,
    moveX: usingGamepadMove ? gamepad.move.x : keyboardX / keyboardLength,
    moveY: usingGamepadMove ? gamepad.move.y : keyboardY / keyboardLength,
    charging: keyboardCharging || Boolean(gamepad.chargeAction),
    hit: hitQueued,
    slice: sliceQueued || isSliceAction(gamepad.chargeAction),
    shotVariant: controllerVariant,
    special: specialQueued,
    switchPlayer: switchQueued,
    switchDirection: switchDirectionQueued,
    aim: controllerAim?.x ?? 0,
    aimY: controllerAim?.y ?? 0,
    analogAim: Boolean(controllerAim),
    smashUpgrade: gamepad.smashUpgradeQueued,
    cutVolley: gamepad.cutVolleyQueued,
    splitStep: gamepad.splitStep,
    sprint: gamepad.sprint,
    technicalModifier: gamepad.technicalModifier,
    teamTactic: gamepad.tacticQueued,
  };
  hitQueued = false;
  sliceQueued = false;
  shotVariantQueued = null;
  shotAimQueued = null;
  specialQueued = false;
  switchQueued = false;
  switchDirectionQueued = null;
  gamepad.smashUpgradeQueued = false;
  gamepad.cutVolleyQueued = false;
  gamepad.tacticQueued = null;
  return input;
}

function getInput2() {
  const controllerAim2 = gamepad2.chargeAction ? gamepad2.aim : gamepad2.shotAimQueued;
  const input2 = {
    left: gamepad2.move.x < -0.2,
    right: gamepad2.move.x > 0.2,
    up: gamepad2.move.y < -0.2,
    down: gamepad2.move.y > 0.2,
    moveX: gamepad2.move.x,
    moveY: gamepad2.move.y,
    charging: gamepad2.chargeAction !== null,
    hit: gamepad2.hitQueued,
    slice: gamepad2.sliceQueued,
    shotVariant: gamepad2.shotVariantQueued,
    special: gamepad2.specialQueued,
    switchPlayer: gamepad2.switchQueued,
    switchDirection: gamepad2.switchDirectionQueued,
    aim: controllerAim2?.x ?? 0,
    aimY: controllerAim2?.y ?? 0,
    analogAim: Boolean(controllerAim2?.x || controllerAim2?.y),
    smashUpgrade: gamepad2.smashUpgradeQueued,
    cutVolley: gamepad2.cutVolleyQueued,
    splitStep: gamepad2.splitStep,
    sprint: gamepad2.sprint,
    technicalModifier: gamepad2.technicalModifier,
    teamTactic: gamepad2.tacticQueued,
  };
  gamepad2.hitQueued = false;
  gamepad2.sliceQueued = false;
  gamepad2.shotVariantQueued = null;
  gamepad2.shotAimQueued = null;
  gamepad2.specialQueued = false;
  gamepad2.switchQueued = false;
  gamepad2.switchDirectionQueued = null;
  gamepad2.smashUpgradeQueued = false;
  gamepad2.cutVolleyQueued = false;
  gamepad2.tacticQueued = null;
  return input2;
}

const CAREER_MATCHES = 3;

function startMatch() {
  gameLoopGeneration += 1;
  resetTransientInput({ awaitRelease: true, resetButtons: true });
  const athlete = ui.selectedAthlete ?? ATHLETES[0];
  const arena = ui.selectedArena ?? ARENAS[0];
  const ai = getAiForMatch(ui.selectedMode, ui.tournamentRound, ui.aiDifficulty);
  const humanMode = ui.selectedMode === "quick" ? (ui.playerMode ?? "solo") : "solo";

  matchState = createMatchState(
    ui.selectedMode,
    athlete,
    arena,
    ai,
    ui.tournamentRound,
    { humanMode },
  );
  const supportingAthletes = ATHLETES.filter((candidate) => candidate.id !== athlete.id);
  matchState.playerMateAthlete = supportingAthletes[0];
  matchState.opponentAthlete = supportingAthletes[1];
  matchState.opponentMateAthlete = supportingAthletes[2];
  matchState.pvpAthlete = matchState.opponentAthlete;
  matchState.controlMode = ui.controlMode;
  if (ui.selectedMode === "quick" && ui.matchLength !== "set") {
    matchState.scoring = "points";
    matchState.pointsToWin = ui.matchLength === "points21" ? 21 : 11;
  } else if (ui.selectedMode === "career") {
    matchState.scoring = "points";
    matchState.pointsToWin = 11;
    matchState.careerSeason = ui.career.season;
    matchState.careerMatch = ui.career.matchIndex + 1;
    matchState.matchObjective = matchObjective(ui.career.season, ui.career.matchIndex);
    ensureSeasonObjectives();
    ui.careerSeasonWon = false;
  }
  matchState.running = true;
  resetReplayBuffer(matchState);
  replayActive = false;
  replayIndex = 0;
  replayAccum = 0;
  matchState.lastTime = performance.now();
  simAccumulator = 0;
  pauseOverlay.hidden = true;

  showScreen("game");
  updateHud(matchState);
  music.setIntensity(0.12);
  music.start();
  const generation = gameLoopGeneration;
  requestAnimationFrame((now) => gameLoop(now, generation));
}

const FIXED_STEP = 1 / 120;
const MAX_SIM_STEPS = 8;
let simAccumulator = 0;

/** Azzera i comandi che devono valere una volta sola per fotogramma. */
function consumeOneShot(input) {
  if (!input) return input;
  return {
    ...input,
    hit: false,
    special: false,
    switchPlayer: false,
    switchDirection: null,
    smashUpgrade: false,
    cutVolley: false,
    teamTactic: null,
  };
}

function gameLoop(now, generation) {
  if (generation !== gameLoopGeneration || !matchState?.running) return;

  const dt = Math.min((now - matchState.lastTime) / 1000, 0.25);
  matchState.lastTime = now;

  let result = null;
  if (replayActive) {
    stepReplay(dt);
    result = null;
  } else {
    // Passo fisso con accumulatore: prima la fisica dipendeva dal frame rate,
    // quindi a 144 Hz si giocava una partita leggermente diversa che a 60.
    simAccumulator = Math.min(simAccumulator + dt, FIXED_STEP * MAX_SIM_STEPS);
    let input = getInput();
    let input2 = getInput2();
    let steps = 0;
    while (simAccumulator >= FIXED_STEP && steps < MAX_SIM_STEPS) {
      result = updateMatch(matchState, FIXED_STEP, input, input2);
      simAccumulator -= FIXED_STEP;
      steps += 1;
      if (result) break;
      // Gli input a colpo singolo valgono per un passo solo: ripetendoli si
      // accoderebbe lo stesso colpo piu' volte nello stesso fotogramma.
      if (steps === 1) {
        input = consumeOneShot(input);
        input2 = consumeOneShot(input2);
      }
    }
  }
  if (matchState.hapticPulse) {
    const { duration, strong, weak } = matchState.hapticPulse;
    pulseGamepad(duration, strong, weak);
    matchState.hapticPulse = null;
  }
  updateHud(matchState);

  const rallyTension = Math.min(1, matchState.rallyHits / 12);
  const stakes = Math.min(
    0.35,
    (matchState.sets.player + matchState.sets.ai) * 0.15
      + (matchState.games.player + matchState.games.ai) * 0.02,
  );
  music.setIntensity(Math.min(1, 0.12 + rallyTension * 0.55 + stakes));

  let replayApplied = null;
  if (replayActive) replayApplied = applyReplayFrame();

    drawArena(ctx, canvas, matchState.arena, now / 1000);
  drawServeBox(ctx, matchState, now / 1000);
  drawLandingMarker(ctx, matchState.ball, now / 1000);
  drawTeamGeometry(ctx, matchState);
  drawHitZone(ctx, matchState[matchState.activePlayerKey], "#fff36a");
  drawPaddle(ctx, matchState.opponent, matchState.opponentAthlete.color, false, matchState.opponent.swing,
    matchState.humanMode === "pvp" && matchState.pvpActiveKey === "opponent" ? matchState.opponent.charge : 0,
    matchState.opponentAthlete, athleteSprites.get(matchState.opponentAthlete.id),
    athleteActionSprites.get(matchState.opponentAthlete.id),
    athleteRunSprites.get(matchState.opponentAthlete.id), now / 1000);
  drawPaddle(ctx, matchState.opponentMate, matchState.opponentMateAthlete.color, false, matchState.opponentMate.swing,
    matchState.humanMode === "pvp" && matchState.pvpActiveKey === "opponentMate" ? matchState.opponentMate.charge : 0,
    matchState.opponentMateAthlete, athleteSprites.get(matchState.opponentMateAthlete.id),
    athleteActionSprites.get(matchState.opponentMateAthlete.id),
    athleteRunSprites.get(matchState.opponentMateAthlete.id), now / 1000);
  drawPaddle(ctx, matchState.playerMate, matchState.playerMateAthlete.color, true, matchState.playerMate.swing,
    matchState.humanMode === "coop" ? matchState.playerMate.charge
      : matchState.activePlayerKey === "playerMate" ? matchState.shotCharge : 0,
    matchState.playerMateAthlete, athleteBackSprites.get(matchState.playerMateAthlete.id),
    athleteBackActionSprites.get(matchState.playerMateAthlete.id),
    athleteBackRunSprites.get(matchState.playerMateAthlete.id), now / 1000);
  drawPaddle(ctx, matchState.player, matchState.athlete.color, true, matchState.player.swing,
    matchState.humanMode === "coop" ? matchState.player.charge
      : matchState.activePlayerKey === "player" ? matchState.shotCharge : 0, matchState.athlete,
    athleteBackSprites.get(matchState.athlete.id),
    athleteBackActionSprites.get(matchState.athlete.id),
    athleteBackRunSprites.get(matchState.athlete.id), now / 1000);
  const activeSprite = matchState.activePlayerKey === "player"
    ? athleteBackSprites.get(matchState.athlete.id)
    : athleteBackSprites.get(matchState.playerMateAthlete.id);
  const smashChargeThreshold = Math.max(
    0,
    Math.min(1, (BALANCE.smashMinPower / matchState.athlete.stats.power - 0.4) / 0.95),
  );
  const activePaddle = matchState[matchState.activePlayerKey];
  const ballToPaddleY = activePaddle.y - matchState.ball.y;
  const smashImpactEta = matchState.ball.vy > 30
    ? ballToPaddleY / matchState.ball.vy
    : Number.POSITIVE_INFINITY;
  const smashImpactX = matchState.ball.x + matchState.ball.vx * Math.max(0, smashImpactEta);
  const smashImpactZ = Number.isFinite(smashImpactEta) && smashImpactEta >= 0
    ? matchState.ball.z
      + matchState.ball.vz * smashImpactEta
      - 0.5 * BALANCE.ballGravity * smashImpactEta * smashImpactEta
    : matchState.ball.z;
  const smashContactGeometry = smashImpactEta >= -0.04
    && smashImpactEta <= 0.2
    && Math.abs(smashImpactX - activePaddle.x) <= activePaddle.w * 0.9;
  const smashHeightReady = (smashContactGeometry ? smashImpactZ : matchState.ball.z)
    >= BALANCE.smashMinHeight;
  const smashPrimedActive = Boolean(matchState.smashPrimed || activePaddle.smashPrimed);
  const smashIntentActive = matchState.shotIntent === "smash" || smashPrimedActive;
  const smashStatus = !smashIntentActive
    ? ""
    : activePaddle.y > COURT.netY + BALANCE.smashNetWindow
      ? t("smashCueNet")
      : !smashHeightReady
        ? t("smashCueHigh")
        : !smashPrimedActive && matchState.shotCharge < smashChargeThreshold
          ? t("smashCueCharge")
          : smashContactGeometry
            ? t("smashCueSecondTap")
            : t("smashCuePrimed");
  drawActiveIndicator(
    ctx,
    matchState[matchState.activePlayerKey],
    Boolean(activeSprite?.complete),
    matchState.shotCharge,
    smashChargeThreshold,
    smashIntentActive,
    matchState.rallyEnergy.player,
    smashStatus,
  );
  drawTimingHud(ctx, matchState, now / 1000);
  drawShotFeedback(ctx, matchState);
  drawBall(ctx, matchState.ball, matchState.flash);
  drawFx(ctx, matchState);
  drawMiniMap(matchState);

  if (matchState.flash > 0) {
    ctx.fillStyle = `rgba(255, 209, 102, ${matchState.flash * 0.14})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (replayActive) {
    drawReplayOverlay(now / 1000);
    if (replayApplied) restoreReplayFrame(replayApplied);
  }

  if (result) {
    endMatch(result.winner);
    return;
  }

  requestAnimationFrame((nextNow) => gameLoop(nextNow, generation));
}

const REPLAY_PAD_KEYS = ["player", "playerMate", "opponent", "opponentMate"];
const REPLAY_PAD_FIELDS = ["x", "y", "swing", "swingSide", "motion", "charge", "runPhase", "actionPose", "actionIntent", "moveRatio"];
const REPLAY_BALL_FIELDS = ["x", "y", "z", "vx", "vy", "vz", "spin", "topspin", "backspin", "shotType", "serveInFlight", "serveTouchedNet", "bouncePulse", "landRing", "hitFlash", "hitPulse", "trail"];

function stepReplay(dt) {
  const frames = matchState.replayFrames;
  if (!frames.length) {
    replayActive = false;
    return;
  }
  replayAccum += dt;
  while (replayAccum >= 1 / 60) {
    replayAccum -= 1 / 60;
    if (replayIndex < frames.length - 1) replayIndex += 1;
  }
}

/** Applica lo snapshot al matchState per il frame di replay. Restituisce i valori da ripristinare. */
function applyReplayFrame() {
  const snap = matchState.replayFrames[replayIndex];
  if (!snap) return null;
  const savedPads = [];
  REPLAY_PAD_KEYS.forEach((key, i) => {
    const pad = matchState[key];
    const s = snap.pads[i];
    const saved = {};
    REPLAY_PAD_FIELDS.forEach((f) => {
      saved[f] = pad[f];
      pad[f] = s[f];
    });
    savedPads.push(saved);
  });
  const savedBall = {};
  REPLAY_BALL_FIELDS.forEach((f) => {
    savedBall[f] = matchState.ball[f];
    matchState.ball[f] = snap.ball[f];
  });
  const savedServeSide = matchState.serveSide;
  const savedServeCourt = matchState.serveCourt;
  const savedActiveKey = matchState.activePlayerKey;
  matchState.serveSide = snap.serveSide;
  matchState.serveCourt = snap.serveCourt;
  matchState.activePlayerKey = snap.activePlayerKey;
  return { savedPads, savedBall, savedServeSide, savedServeCourt, savedActiveKey };
}

function restoreReplayFrame(saved) {
  if (!saved) return;
  saved.savedPads.forEach((vals, i) => {
    const pad = matchState[REPLAY_PAD_KEYS[i]];
    REPLAY_PAD_FIELDS.forEach((f) => { pad[f] = vals[f]; });
  });
  REPLAY_BALL_FIELDS.forEach((f) => { matchState.ball[f] = saved.savedBall[f]; });
  matchState.serveSide = saved.savedServeSide;
  matchState.serveCourt = saved.savedServeCourt;
  matchState.activePlayerKey = saved.savedActiveKey;
}

function drawReplayOverlay(time) {
  const frames = matchState.replayFrames;
  const total = frames.length;
  const progress = total ? (replayIndex + 1) / total : 0;
  ctx.fillStyle = "rgba(6, 12, 30, 0.42)";
  ctx.fillRect(0, 0, canvas.width, 40);
  ctx.fillStyle = "#ffcc00";
  ctx.font = "12px 'Lilita One', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`▶ ${t("replay")}`, 14, 26);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "11px 'Lilita One', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${t("replayExit")}`, canvas.width - 14, 26);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(0, canvas.height - 8, canvas.width, 8);
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(0, canvas.height - 8, canvas.width * Math.min(1, Math.max(0, progress)), 8);
  ctx.textAlign = "left";
}

function toggleReplay() {
  if (!matchState?.running) return;
  if (replayActive) {
    replayActive = false;
    matchState.paused = false;
    return;
  }
  if (matchState.replayFrames.length < 2) return;
  replayActive = true;
  replayIndex = 0;
  replayAccum = 0;
  matchState.paused = false;
}

function drawMiniMap(state) {
  const { width, height } = miniMap;
  const padding = 11;
  const courtWidth = width - padding * 2;
  const courtHeight = height - padding * 2;
  const mapPoint = (x, y) => ({
    x: padding + ((x - 80) / 800) * courtWidth,
    y: padding + ((y - 56) / 508) * courtHeight,
  });
  miniCtx.clearRect(0, 0, width, height);
  miniCtx.fillStyle = "#123d68";
  miniCtx.fillRect(padding, padding, courtWidth, courtHeight);
  miniCtx.strokeStyle = "rgba(255,255,255,0.86)";
  miniCtx.lineWidth = 2;
  miniCtx.strokeRect(padding, padding, courtWidth, courtHeight);
  miniCtx.beginPath();
  miniCtx.moveTo(padding, height / 2);
  miniCtx.lineTo(width - padding, height / 2);
  miniCtx.stroke();
  const players = [
    [state.player, "#12dff0"],
    [state.playerMate, "#55f1ff"],
    [state.opponent, "#ff5d7a"],
    [state.opponentMate, "#ffad45"],
  ];
  players.forEach(([paddle, color]) => {
    const p = mapPoint(paddle.x, paddle.y);
    miniCtx.fillStyle = color;
    miniCtx.beginPath();
    miniCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    miniCtx.fill();
  });
  const ball = mapPoint(state.ball.x, state.ball.y);
  miniCtx.fillStyle = "#fff36a";
  miniCtx.beginPath();
  miniCtx.arc(ball.x, ball.y, 3.2, 0, Math.PI * 2);
  miniCtx.fill();
}

function endMatch(winner) {
  matchState.running = false;
  music.stop();

  const score = matchState.pointsToWin
    ? `${matchState.points.player}-${matchState.points.ai}`
    : `${matchState.sets.player}-${matchState.sets.ai}`;
  const careerWin = winner === "player" && ui.selectedMode === "career";
  const careerSeasonWon = careerWin && ui.career.matchIndex >= CAREER_MATCHES - 1;
  const tournamentTrophy = winner === "player" && ui.selectedMode === "tournament" && ui.tournamentRound === 2;
  recordMatch({
    ts: Date.now(),
    mode: ui.selectedMode,
    humanMode: matchState.humanMode,
    winner,
    score,
    opponent: matchState.humanMode === "pvp" && matchState.opponentAthlete
      ? t(`athlete_${matchState.opponentAthlete.id}_name`)
      : matchState.ai.id ? t(`ai_${matchState.ai.id}_name`) : matchState.ai.name,
    athlete: t(`athlete_${matchState.athlete.id}_name`),
    arena: t(`arena_${matchState.arena.id}_name`),
    difficulty: ui.aiDifficulty,
    pointsToWin: matchState.pointsToWin ?? null,
    trophy: careerSeasonWon || tournamentTrophy,
    season: ui.selectedMode === "career" ? ui.career.season : undefined,
  });

  if (ui.selectedMode === "career") {
    ui.objectiveResult = awardObjectives(matchState);
  } else {
    ui.objectiveResult = null;
  }

  if (careerWin) {
    ui.career.wins += 1;
    ui.career.matchIndex += 1;
    ui.career.rivalStreak = Math.max(0, ui.career.rivalStreak) + 1;
    if (careerSeasonWon) {
      ui.career.trophies += 1;
      ui.career.season += 1;
      ui.career.matchIndex = 0;
      resetSeasonObjectives();
    }
    ui.careerSeasonWon = careerSeasonWon;
    saveCareer(ui.career);
    ui.pendingContinue = true;
    savePrefs(collectPrefs());
    updateCareerTag();
    showResult(matchState, winner);
    return;
  }

  if (ui.selectedMode === "career") {
    ui.career.losses += 1;
    ui.career.rivalStreak = Math.min(0, ui.career.rivalStreak) - 1;
    saveCareer(ui.career);
    updateCareerTag();
  }

  if (winner === "player" && ui.selectedMode === "tournament" && ui.tournamentRound < 2) {
    ui.tournamentRound += 1;
    ui.pendingContinue = true;
    savePrefs(collectPrefs());
    showResult(matchState, winner);
    return;
  }

  if (ui.selectedMode === "tournament") {
    ui.tournamentRound = 0;
    ui.pendingContinue = false;
  }

  savePrefs(collectPrefs());
  showResult(matchState, winner);
}

function updateCareerTag() {
  const el = document.getElementById("careerTag");
  if (!el) return;
  el.textContent = t("careerTag", { season: ui.career.season, match: ui.career.matchIndex });
}

function rematch() {
  if (ui.pendingContinue) {
    ui.pendingContinue = false;
    startMatch();
    return;
  }

  if (ui.selectedMode === "tournament") {
    ui.tournamentRound = 0;
  }

  startMatch();
}

function pauseGame() {
  if (!matchState?.running) return;
  resetTransientInput();
  matchState.paused = true;
  pauseOverlay.hidden = false;
  resetQuitConfirm();
  setPauseTab("match", true);
}

function resumeGame() {
  if (!matchState) return;
  resetTransientInput({ awaitRelease: true });
  matchState.paused = false;
  matchState.lastTime = performance.now();
  simAccumulator = 0;
  pauseOverlay.hidden = true;
}

function quitMatch() {
  gameLoopGeneration += 1;
  resetTransientInput({ resetButtons: true });
  matchState = null;
  music.stop();
  pauseOverlay.hidden = true;
  resetQuitConfirm();
  showScreen("menu");
}

function resetQuitConfirm() {
  quitConfirmArmed = false;
  const quitBtn = document.querySelector('[data-action="quit-match"]');
  if (quitBtn) {
    quitBtn.textContent = t("quit");
    quitBtn.classList.remove("btn--confirm");
  }
}

function handleQuitMatch() {
  if (!quitConfirmArmed) {
    quitConfirmArmed = true;
    const quitBtn = document.querySelector('[data-action="quit-match"]');
    if (quitBtn) {
      quitBtn.textContent = t("quitConfirm");
      quitBtn.classList.add("btn--confirm");
      pulseGamepad(45, 0.25, 0.25);
    }
    return;
  }
  quitMatch();
}

function syncMatchSetup() {
  const setup = document.getElementById("matchSetup");
  if (!setup) return;
  setup.hidden = ui.selectedMode !== "quick";
  if (ui.selectedMode === "tournament") setup.hidden = true;
  if (playerModeSetup) playerModeSetup.hidden = ui.selectedMode !== "quick";
}

function syncSegmented(container, value) {
  const buttons = [...container.querySelectorAll("button[data-value]")];
  buttons.forEach((button) => {
    const active = button.dataset.value === value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

const drillCanvas = document.getElementById("drillCanvas");
const drillCtx = drillCanvas ? drillCanvas.getContext("2d") : null;

function drillInput() {
  const hit = hitQueued;
  hitQueued = false;
  return {
    left: keys.has("arrowleft") || keys.has("a"),
    right: keys.has("arrowright") || keys.has("d") || keys.has("l"),
    hold: keys.has(" ") || keys.has("enter"),
    hit,
  };
}

function startDrill() {
  if (matchState?.running) quitMatch();
  drillLoopGen += 1;
  drillState = createDrill();
  drillState.running = true;
  drillState.paddle.x = COURT.right / 2;
  drillState.paddle.y = COURT.netY + 88;
  drillState.ball.x = COURT.right / 2;
  drillState.ball.y = COURT.netY + 88;
  drillLastTime = performance.now();
  showScreen("drill");
  requestAnimationFrame((now) => drillLoop(now, drillLoopGen));
}

function stopDrill() {
  drillLoopGen += 1;
  if (drillState) drillState.running = false;
}

function drawDrillOverlay(now) {
  if (!drillCtx) return;
  const d = drillState;
  const c = drillCtx;

  if (d.phase === "ready") {
    c.fillStyle = "rgba(6, 12, 30, 0.5)";
    c.fillRect(0, 0, drillCanvas.width, drillCanvas.height);
    c.fillStyle = "#ffcc00";
    c.font = "30px 'Lilita One', sans-serif";
    c.textAlign = "center";
    c.fillText(t("drillReady"), drillCanvas.width / 2, 430);
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.font = "15px 'Lilita One', sans-serif";
    c.fillText(t("drillHint1"), drillCanvas.width / 2, 466);
  }

  if (d.phase === "charge") {
    c.fillStyle = "rgba(6, 12, 30, 0.38)";
    c.fillRect(300, 596, 360, 22);
    c.fillStyle = "#123d68";
    c.fillRect(304, 600, 352, 14);
    const perfectLeft = 300 + 352 * 0.5;
    const perfectWidth = 352 * 0.24;
    c.fillStyle = "rgba(26, 255, 138, 0.45)";
    c.fillRect(perfectLeft, 600, perfectWidth, 14);
    c.fillStyle = "#ffcc00";
    c.fillRect(300 + 352 * Math.min(1, Math.max(0, d.meter)), 596, 5, 22);
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.font = "13px 'Lilita One', sans-serif";
    c.textAlign = "center";
    c.fillText(t("drillMeter"), drillCanvas.width / 2, 588);
  }

  if (d.phase === "result" && d.grade) {
    c.font = "28px 'Lilita One', sans-serif";
    c.textAlign = "center";
    c.fillStyle = d.grade === "perfect" ? "#1aff8a" : d.grade === "good" ? "#ffcc00" : "#ff6d70";
    c.fillText(
      d.grade === "perfect" ? "PERFECT ⭐" : d.grade === "good" ? "GOOD" : "EARLY",
      drillCanvas.width / 2,
      380,
    );
    c.fillStyle = "#ffffff";
    c.font = "18px 'Lilita One', sans-serif";
    c.fillText(`${t("drillPoints")} +${d.points}`, drillCanvas.width / 2, 414);
  }

  if (d.phase === "flight" || d.phase === "result") {
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.strokeStyle = "rgba(255,204,0,0.9)";
    c.lineWidth = 2;
    const gp = c.__padelProject ? c.__padelProject(d.goal.x, d.goal.y) : { x: d.goal.x, y: d.goal.y, scale: 1 };
    c.beginPath();
    c.ellipse(gp.x, gp.y, d.goal.r * gp.scale, d.goal.r * 0.55 * gp.scale, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  }
}

function drawDrill(now) {
  if (!drillCtx || !drillState) return;
  const d = drillState;
  const c = drillCtx;
  const athlete = ui.selectedAthlete ?? ATHLETES[0];

  drawArena(c, drillCanvas, ui.selectedArena ?? ARENAS[0], now / 1000);

  c.setLineDash([6, 6]);
  c.strokeStyle = "rgba(255,204,0,0.95)";
  c.lineWidth = 2;
  const rp = c.__padelProject(d.reticle.x, d.reticle.y);
  c.beginPath();
  c.moveTo(rp.x - 12, rp.y); c.lineTo(rp.x + 12, rp.y);
  c.moveTo(rp.x, rp.y - 12); c.lineTo(rp.x, rp.y + 12);
  c.stroke();
  c.setLineDash([]);

  if (d.phase === "charge") {
    const perfect = 0.5 + 0.24 * 0.5;
    const spread = Math.abs(d.meter - 0.62);
    const radius = 20 + spread * 60;
    c.strokeStyle = spread < 0.28 ? "rgba(26,255,138,0.85)" : "rgba(255,204,0,0.7)";
    c.lineWidth = 3;
    const pp = c.__padelProject(d.paddle.x, d.paddle.y);
    c.beginPath();
    c.ellipse(pp.x, pp.y - 30, radius, radius * 0.6, 0, 0, Math.PI * 2);
    c.stroke();
  }

  if (d.ball.active) {
    drawBall(c, d.ball, 0);
  }
  c.fillStyle = "rgba(255,255,255,0.16)";
  if (d.landing) {
    const lp = c.__padelProject(d.landing.x, d.landing.y);
    c.beginPath();
    c.ellipse(lp.x, lp.y, 16, 8, 0, 0, Math.PI * 2);
    c.fill();
  }

  drawPaddle(c, d.paddle, athlete.color, true, d.paddle.swing, d.phase === "charge" ? d.meter : 0, athlete, null, null, null, now / 1000);
  drawDrillOverlay(now);
}

function drillLoop(now, generation) {
  if (generation !== drillLoopGen) return;
  const dt = Math.min((now - drillLastTime) / 1000, 0.033);
  drillLastTime = now;
  updateDrill(drillState, dt, drillInput());
  document.getElementById("drillScore").textContent = String(drillState.score);
  document.getElementById("drillBest").textContent = String(drillState.best);
  document.getElementById("drillHits").textContent = `${drillState.hits}/${drillState.attempts}`;
  document.getElementById("drillStreak").textContent = String(drillState.streak);
  drawDrill(now);
  requestAnimationFrame((nextNow) => drillLoop(nextNow, generation));
}

bindNavigation({
  "to-menu": () => {
    quitMatch();
    stopDrill();
    showScreen("menu");
  },
  "to-characters": () => showScreen("characters"),
  "to-modes": () => {
    syncMatchSetup();
    showScreen("modes");
  },
  "to-help": () => showScreen("help"),
  "to-history": () => {
    showScreen("history");
    renderHistory();
  },
  "to-drill": startDrill,
  "to-profile": () => {
    showScreen("profile");
    renderProfile();
  },
  "to-settings": () => {
    showScreen("settings");
    syncAllSettings();
  },
  selectMode: () => {
    syncMatchSetup();
    showScreen("arena");
  },
  rematch,
  resume: resumeGame,
  pause: pauseGame,
  "quit-match": handleQuitMatch,
  replay: () => {
    if (pauseOverlay) pauseOverlay.hidden = true;
    toggleReplay();
  },
});

const muteBtn = document.getElementById("muteBtn");

function updateMuteButton() {
  muteBtn.textContent = isMuted() ? "🔇" : "🔊";
  muteBtn.title = isMuted() ? t("muteOn") : t("muteOff");
  muteBtn.setAttribute("aria-pressed", String(isMuted()));
}

muteBtn.addEventListener("click", () => {
  initAudio();
  setMuted(!isMuted());
  updateMuteButton();
  savePrefs(collectPrefs());
});

const prefs = loadPrefs();
if (prefs.muted) setMuted(true);
if (prefs.mode) ui.selectedMode = prefs.mode;
if (prefs.tournamentRound) ui.tournamentRound = prefs.tournamentRound;
if (["assisted", "semi", "manual"].includes(prefs.controlMode)) ui.controlMode = prefs.controlMode;
if (Number.isFinite(prefs.gamepadDeadzone)) ui.gamepadDeadzone = Math.min(0.3, Math.max(0.08, prefs.gamepadDeadzone));
if (typeof prefs.vibration === "boolean") ui.vibration = prefs.vibration;
if (["easy", "medium", "hard"].includes(prefs.aiDifficulty)) ui.aiDifficulty = prefs.aiDifficulty;
if (["points11", "points21", "set"].includes(prefs.matchLength)) ui.matchLength = prefs.matchLength;
if (Number.isFinite(prefs.volume)) setVolume(Math.min(1, Math.max(0, prefs.volume)));
if (typeof prefs.reduceMotion === "boolean") ui.reduceMotion = prefs.reduceMotion;
if (typeof prefs.colorblind === "boolean") ui.colorblind = prefs.colorblind;
if (["solo", "coop", "pvp"].includes(prefs.playerMode)) ui.playerMode = prefs.playerMode;
if (["it", "en"].includes(prefs.lang)) {
  ui.lang = prefs.lang;
  setLang(prefs.lang);
}
applyAccessibility();
applyLanguage();
applyControllerLayout(gamepad.connected ? gamepad.id : "xbox");
updateMuteButton();

const controlModeButtons = [...document.querySelectorAll("[data-control-mode]")];
const deadzoneInput = document.getElementById("gamepadDeadzone");
const deadzoneValue = document.getElementById("deadzoneValue");
const vibrationInput = document.getElementById("gamepadVibration");
const langToggle = document.getElementById("langToggle");
const settingsLangSeg = document.getElementById("settingsLangSeg");
const optReduceMotion = document.getElementById("optReduceMotion");
const optColorblind = document.getElementById("optColorblind");
const masterVolume = document.getElementById("masterVolume");
const volumeValue = document.getElementById("volumeValue");
const settingsVolume = document.getElementById("settingsVolume");
const settingsVolumeValue = document.getElementById("settingsVolumeValue");
const settingsDeadzone = document.getElementById("settingsDeadzone");
const settingsDeadzoneValue = document.getElementById("settingsDeadzoneValue");
const settingsVibration = document.getElementById("settingsVibration");
const difficultySeg = document.getElementById("difficultySeg");
const lengthSeg = document.getElementById("lengthSeg");
const playerModeSeg = document.getElementById("playerModeSeg");
const playerModeSetup = document.getElementById("playerModeSetup");
const helpInputTabs = [...document.querySelectorAll("[data-help-input]")];
const helpInputPanels = [...document.querySelectorAll("[data-help-panel]")];

function setHelpInputView(view) {
  helpInputTabs.forEach((button) => {
    const active = button.dataset.helpInput === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  helpInputPanels.forEach((panel) => {
    const active = panel.dataset.helpPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
}

pauseTabs.forEach((button) => {
  button.addEventListener("click", () => setPauseTab(button.dataset.pauseTab, gamepad.connected));
});

openSmashTutorialButton?.addEventListener("click", showSmashTutorial);
closeSmashTutorialButton?.addEventListener("click", () => hideSmashTutorial(true));
trySmashTutorialButton?.addEventListener("click", () => {
  hideSmashTutorial(false);
  resumeGame();
});

helpInputTabs.forEach((button) => {
  button.addEventListener("click", () => setHelpInputView(button.dataset.helpInput));
});
setHelpInputView("keyboard");
applyControllerLayout(gamepad.id);

function applyAccessibility() {
  document.body.classList.toggle("reduce-motion", ui.reduceMotion);
  document.body.classList.toggle("mode-colorblind", ui.colorblind);
  setReduceMotion(ui.reduceMotion);
}

function setLanguage(lang) {
  ui.lang = lang;
  setLang(lang);
  document.documentElement.lang = lang;
  langToggle.textContent = getLang() === "it" ? "EN" : "IT";
  applyLanguage();
  updateMuteButton();
  updateGamepadIndicator(gamepad.connected, gamepad.id);
  applyControllerLayout(gamepad.id);
  updateCareerTag();
  renderAthletes(() => {
    savePrefs(collectPrefs());
    showScreen("modes");
  }, ui.selectedAthlete?.id ?? prefs.athleteId);
  renderArenas(() => {
    savePrefs(collectPrefs());
    startMatch();
  });
  syncAllSettings();
  savePrefs(collectPrefs());
}

function syncControllerSettings() {
  controlModeButtons.forEach((button) => {
    const active = button.dataset.controlMode === ui.controlMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  deadzoneInput.value = String(ui.gamepadDeadzone);
  deadzoneValue.textContent = `${Math.round(ui.gamepadDeadzone * 100)}%`;
  vibrationInput.checked = ui.vibration;
}

function syncAllSettings() {
  syncControllerSettings();
  settingsDeadzone.value = String(ui.gamepadDeadzone);
  settingsDeadzoneValue.textContent = `${Math.round(ui.gamepadDeadzone * 100)}%`;
  settingsVibration.checked = ui.vibration;
  masterVolume.value = String(getVolume());
  volumeValue.textContent = `${Math.round(getVolume() * 100)}%`;
  settingsVolume.value = String(getVolume());
  settingsVolumeValue.textContent = `${Math.round(getVolume() * 100)}%`;
  syncSegmented(difficultySeg, ui.aiDifficulty);
  syncSegmented(lengthSeg, ui.matchLength);
  syncSegmented(settingsLangSeg, getLang());
  optReduceMotion.checked = ui.reduceMotion;
  optColorblind.checked = ui.colorblind;
  if (playerModeSeg) syncSegmented(playerModeSeg, ui.playerMode);
}

controlModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ui.controlMode = button.dataset.controlMode;
    if (matchState) matchState.controlMode = ui.controlMode;
    syncAllSettings();
    savePrefs(collectPrefs());
    pulseGamepad(45, 0.2, 0.3);
  });
});

deadzoneInput.addEventListener("input", () => {
  ui.gamepadDeadzone = Number(deadzoneInput.value);
  syncAllSettings();
  savePrefs(collectPrefs());
});

vibrationInput.addEventListener("change", () => {
  ui.vibration = vibrationInput.checked;
  syncAllSettings();
  savePrefs(collectPrefs());
  pulseGamepad(70, 0.34, 0.34);
});

langToggle.addEventListener("click", () => {
  setLanguage(getLang() === "it" ? "en" : "it");
});

settingsLangSeg.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.value));
});

optReduceMotion.addEventListener("change", () => {
  ui.reduceMotion = optReduceMotion.checked;
  applyAccessibility();
  savePrefs(collectPrefs());
});

optColorblind.addEventListener("change", () => {
  ui.colorblind = optColorblind.checked;
  applyAccessibility();
  savePrefs(collectPrefs());
});

function bindVolume(input, valueEl) {
  input.addEventListener("input", () => {
    setVolume(Number(input.value));
    syncAllSettings();
    savePrefs(collectPrefs());
  });
}

bindVolume(masterVolume, volumeValue);
bindVolume(settingsVolume, settingsVolumeValue);

settingsDeadzone.addEventListener("input", () => {
  ui.gamepadDeadzone = Number(settingsDeadzone.value);
  syncAllSettings();
  savePrefs(collectPrefs());
});

settingsVibration.addEventListener("change", () => {
  ui.vibration = settingsVibration.checked;
  syncAllSettings();
  savePrefs(collectPrefs());
  pulseGamepad(70, 0.34, 0.34);
});

difficultySeg.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    ui.aiDifficulty = button.dataset.value;
    syncAllSettings();
    savePrefs(collectPrefs());
  });
});

lengthSeg.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    ui.matchLength = button.dataset.value;
    syncAllSettings();
    savePrefs(collectPrefs());
  });
});

playerModeSeg?.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    ui.playerMode = button.dataset.value;
    syncAllSettings();
    savePrefs(collectPrefs());
    pulseGamepad(40, 0.16, 0.2);
  });
});

syncAllSettings();
langToggle.textContent = getLang() === "it" ? "EN" : "IT";
updateCareerTag();

renderAthletes(() => {
  savePrefs(collectPrefs());
  showScreen("modes");
}, prefs.athleteId);
renderArenas(() => {
  savePrefs(collectPrefs());
  startMatch();
});

window.addEventListener("pointerdown", initAudio, { passive: true });

document.addEventListener("pointerover", (event) => {
  if (!gamepad.connected) return;
  const root = menuContext();
  if (!root) return;
  const target = event.target.closest("button, input, .mode-card, .athlete-card, .arena-card");
  if (target && root.contains(target) && !target.disabled && !target.classList.contains("mode-card--locked")) {
    setMenuFocus(target);
  }
});

window.addEventListener("keydown", (event) => {
  initAudio();
  const key = event.key.toLowerCase();
  if ([" ", "meta", "alt", "tab", "z", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape" && matchState?.running) {
    event.preventDefault();
    if (replayActive) {
      toggleReplay();
      return;
    }
    if (matchState.paused && smashTutorialOpen) hideSmashTutorial(false);
    else if (matchState.paused && activePauseTab !== "match") setPauseTab("match", false);
    else if (matchState.paused) resumeGame();
    else pauseGame();
    return;
  }
  if (key === "r" && matchState?.running) {
    event.preventDefault();
    if (!matchState.paused || replayActive) {
      hideSmashTutorial(false);
      if (pauseOverlay && !pauseOverlay.hidden && !replayActive) {
        pauseOverlay.hidden = true;
        matchState.paused = false;
      }
      toggleReplay();
      return;
    }
  }
  const menuActive = !matchState?.running || matchState?.paused;
  if (menuActive) {
    if (key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright") {
      event.preventDefault();
      moveMenuFocus(key.replace("arrow", ""));
      return;
    }
    if (key === "enter" || key === " ") {
      event.preventDefault();
      activateMenuFocus();
      return;
    }
    if (key === "escape") {
      event.preventDefault();
      menuBack();
      return;
    }
  }
  if (key === "alt") specialQueued = true;
  if (key === "tab" || key === "z") switchQueued = true;
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === " ") {
    hitQueued = true;
    sliceQueued = false;
  }
  if (key === "meta") {
    hitQueued = true;
    sliceQueued = true;
  }
  keys.delete(key);
});

document.querySelectorAll("[data-dir]").forEach((button) => {
  const direction = button.dataset.dir;
  const map = { left: "a", right: "d", up: "w", down: "s" };
  button.addEventListener("pointerdown", () => {
    if (direction === "hit") hitQueued = true;
    else if (direction === "special") specialQueued = true;
    else if (direction === "switch") switchQueued = true;
    else keys.add(map[direction]);
  });
  button.addEventListener("pointerup", () => {
    if (map[direction]) keys.delete(map[direction]);
  });
  button.addEventListener("pointerleave", () => {
    if (map[direction]) keys.delete(map[direction]);
  });
});

eventLogToggle.addEventListener("click", () => {
  const expanded = eventLog.hidden;
  eventLog.hidden = !expanded;
  eventLogToggle.setAttribute("aria-expanded", String(expanded));
  eventLogToggle.title = expanded ? "Chiudi cronaca" : "Apri cronaca";
});

window.addEventListener("gamepadconnected", (event) => {
  gamepad.connected = true;
  gamepad.index = event.gamepad.index;
  gamepad.id = event.gamepad.id ?? "";
  applyControllerLayout(gamepad.id);
  updateGamepadIndicator(true, gamepad.id);
});

window.addEventListener("gamepaddisconnected", (event) => {
  if (gamepad.index === event.gamepad.index) {
    gamepad.connected = false;
    gamepad.index = null;
    applyControllerLayout("");
    releaseGamepadKeys();
    updateGamepadIndicator(false);
  }
});

requestAnimationFrame(gamepadLoop);

window.__padelDebug = () => matchState;
