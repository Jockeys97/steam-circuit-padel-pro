import { ARENAS, ATHLETES } from "./data.js?v=20260721-arenas-v1";
import {
  createMatchState,
  updateMatch,
} from "./game.js?v=20260721-service-formation-v1";
import {
  drawArena,
  drawActiveIndicator,
  drawBall,
  drawHitZone,
  drawMenuPreview,
  drawPaddle,
} from "./render.js?v=20260721-arenas-v3";
import {
  bindNavigation,
  getAiForMatch,
  renderArenas,
  renderAthletes,
  showResult,
  showScreen,
  ui,
  updateHud,
} from "./ui.js?v=20260721-arenas-v1";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const miniMap = document.getElementById("miniMap");
const miniCtx = miniMap.getContext("2d");
const menuCanvas = document.getElementById("menuPreview");
const menuCtx = menuCanvas.getContext("2d");
const pauseOverlay = document.getElementById("pauseOverlay");
const eventLog = document.getElementById("eventLog");
const eventLogToggle = document.getElementById("eventLogToggle");

const athleteSprites = new Map(ATHLETES.map((athlete) => {
  const sprite = new Image();
  sprite.decoding = "async";
  sprite.src = athlete.sprite;
  return [athlete.id, sprite];
}));

const athleteBackSprites = new Map(ATHLETES.map((athlete) => {
  const sprite = new Image();
  sprite.decoding = "async";
  sprite.src = athlete.backSprite;
  return [athlete.id, sprite];
}));

const keys = new Set();
let hitQueued = false;
let sliceQueued = false;
let specialQueued = false;
let switchQueued = false;
let matchState = null;
let menuTime = 0;
let menuAnimId = 0;

function getInput() {
  const input = {
    left: keys.has("a") || keys.has("arrowleft"),
    right: keys.has("d") || keys.has("arrowright"),
    up: keys.has("w") || keys.has("arrowup"),
    down: keys.has("s") || keys.has("arrowdown"),
    charging: keys.has(" ") || keys.has("meta"),
    hit: hitQueued,
    slice: sliceQueued,
    special: specialQueued,
    switchPlayer: switchQueued,
  };
  hitQueued = false;
  sliceQueued = false;
  specialQueued = false;
  switchQueued = false;
  return input;
}

function startMatch() {
  const athlete = ui.selectedAthlete ?? ATHLETES[0];
  const arena = ui.selectedArena ?? ARENAS[0];
  const ai = getAiForMatch(ui.selectedMode, ui.tournamentRound);

  matchState = createMatchState(
    ui.selectedMode,
    athlete,
    arena,
    ai,
    ui.tournamentRound,
  );
  const supportingAthletes = ATHLETES.filter((candidate) => candidate.id !== athlete.id);
  matchState.playerMateAthlete = supportingAthletes[0];
  matchState.opponentAthlete = supportingAthletes[1];
  matchState.opponentMateAthlete = supportingAthletes[2];
  matchState.running = true;
  matchState.lastTime = performance.now();
  pauseOverlay.hidden = true;

  showScreen("game");
  updateHud(matchState);
  requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  if (!matchState?.running) return;

  const dt = Math.min((now - matchState.lastTime) / 1000, 0.033);
  matchState.lastTime = now;

  const result = updateMatch(matchState, dt, getInput());
  updateHud(matchState);

  drawArena(ctx, canvas, matchState.arena, now / 1000);
  drawHitZone(ctx, matchState[matchState.activePlayerKey], "#fff36a");
  drawPaddle(ctx, matchState.opponent, matchState.opponentAthlete.color, false, matchState.opponent.swing,
    0, matchState.opponentAthlete, athleteSprites.get(matchState.opponentAthlete.id));
  drawPaddle(ctx, matchState.opponentMate, matchState.opponentMateAthlete.color, false, matchState.opponentMate.swing,
    0, matchState.opponentMateAthlete, athleteSprites.get(matchState.opponentMateAthlete.id));
  drawPaddle(ctx, matchState.playerMate, matchState.playerMateAthlete.color, true, matchState.playerMate.swing,
    matchState.activePlayerKey === "playerMate" ? matchState.shotCharge : 0,
    matchState.playerMateAthlete, athleteBackSprites.get(matchState.playerMateAthlete.id));
  drawPaddle(ctx, matchState.player, matchState.athlete.color, true, matchState.player.swing,
    matchState.activePlayerKey === "player" ? matchState.shotCharge : 0, matchState.athlete,
    athleteBackSprites.get(matchState.athlete.id));
  const activeSprite = matchState.activePlayerKey === "player"
    ? athleteBackSprites.get(matchState.athlete.id)
    : athleteBackSprites.get(matchState.playerMateAthlete.id);
  drawActiveIndicator(ctx, matchState[matchState.activePlayerKey], Boolean(activeSprite?.complete));
  drawBall(ctx, matchState.ball, matchState.flash);
  drawMiniMap(matchState);

  if (matchState.flash > 0) {
    ctx.fillStyle = `rgba(255, 209, 102, ${matchState.flash * 0.14})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (result) {
    endMatch(result.winner);
    return;
  }

  requestAnimationFrame(gameLoop);
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

  if (winner === "player" && ui.selectedMode === "tournament" && ui.tournamentRound < 2) {
    ui.tournamentRound += 1;
    ui.pendingContinue = true;
    showResult(matchState, winner);
    return;
  }

  if (ui.selectedMode === "tournament") {
    ui.tournamentRound = 0;
    ui.pendingContinue = false;
  }

  showResult(matchState, winner);
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
  matchState.paused = true;
  pauseOverlay.hidden = false;
}

function resumeGame() {
  if (!matchState) return;
  matchState.paused = false;
  matchState.lastTime = performance.now();
  pauseOverlay.hidden = true;
  requestAnimationFrame(gameLoop);
}

function quitMatch() {
  matchState = null;
  pauseOverlay.hidden = true;
  showScreen("menu");
}

function menuLoop(now) {
  menuTime = now / 1000;
  drawMenuPreview(menuCtx, menuCanvas, menuTime);
  menuAnimId = requestAnimationFrame(menuLoop);
}

bindNavigation({
  "to-menu": () => {
    quitMatch();
    showScreen("menu");
  },
  "to-characters": () => showScreen("characters"),
  "to-modes": () => showScreen("modes"),
  selectMode: () => showScreen("arena"),
  rematch,
  resume: resumeGame,
  pause: pauseGame,
  "quit-match": quitMatch,
});

document.getElementById("confirmAthlete").addEventListener("click", () => {
  if (ui.selectedAthlete) showScreen("modes");
});

renderAthletes();
renderArenas(() => startMatch());

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ([" ", "meta", "tab", "z", "arrowleft", "arrowright", "arrowup", "arrowdown", "shift"].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape" && matchState?.running) {
    event.preventDefault();
    if (matchState.paused) resumeGame();
    else pauseGame();
    return;
  }
  if (key === "shift") specialQueued = true;
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

menuAnimId = requestAnimationFrame(menuLoop);

window.__padelDebug = () => matchState;
