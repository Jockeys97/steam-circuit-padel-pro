import { ATHLETES, ARENAS, AI_OPPONENTS, COURT, isUnlocked, seasonObjectives, matchObjective, OBJECTIVE_DEFS, UNLOCK_CODE } from "./data.js?v=20260813-demo-v12";
import { getMatchInfo } from "./game.js?v=20260813-demo-v12";
import { getVolume, isMuted } from "./audio.js?v=20260813-demo-v12";
import { getLang, t } from "./i18n.js?v=20260813-demo-v12";
import { IS_DEMO, DEMO_CONTENT, demoFilter } from "./build.js?v=20260813-demo-v12";

const PREFS_KEY = "padel.prefs";
const HISTORY_KEY = "padel.history";
const CAREER_KEY = "padel.career";
const DEFAULT_CAREER = {
  season: 1,
  matchIndex: 0,
  wins: 0,
  losses: 0,
  trophies: 0,
  stars: 0,
  seasonObjectives: [],
  seasonStars: 0,
  rivalStreak: 0,
  unlockAll: false,
};

export function loadCareer() {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw) return { ...DEFAULT_CAREER, ...JSON.parse(raw) };
  } catch {
    // persistenza non disponibile
  }
  return { ...DEFAULT_CAREER };
}

export function saveCareer(career) {
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(career));
  } catch {
    // persistenza non disponibile
  }
}

/** Assicura che gli obiettivi della stagione corrente siano inizializzati. */
export function ensureSeasonObjectives() {
  const career = ui.career;
  if (!career.seasonObjectives?.length) {
    career.seasonObjectives = seasonObjectives(career.season).map((o) => ({ ...o, done: false }));
    career.seasonStars = 0;
  }
  return career.seasonObjectives;
}

/** Legge la metrica del giocatore dai stats di fine match. */
function objectiveValue(defId, stats) {
  const metric = OBJECTIVE_DEFS[defId]?.metric;
  switch (metric) {
    case "smashWinners": return stats.smashWinners.player;
    case "doubleFaults": return stats.doubleFaults.player;
    case "pointsWon": return stats.pointsWon.player;
    case "longestRally": return stats.longestRally;
    case "winners": return stats.winners.player;
    case "errors": return stats.errors.player;
    default: return 0;
  }
}

function objectiveMet(defId, target, stats) {
  const value = objectiveValue(defId, stats);
  const isMax = OBJECTIVE_DEFS[defId]?.unit === "max";
  return isMax ? value <= target : value >= target;
}

/** Valuta un singolo obiettivo e ritorna { done, progress, target }. */
export function objectiveStatus(objective, stats) {
  return {
    done: objectiveMet(objective.id, objective.target, stats),
    progress: objectiveValue(objective.id, stats),
    target: objective.target,
  };
}

/**
 * Premia le stelle a fine match di carriera.
 * Ritorna { seasonDone: [...], matchDone: bool, stars: n } per il riepilogo.
 */
export function awardObjectives(state) {
  const career = ui.career;
  const stats = state.stats;
  const result = { seasonDone: [], matchDone: false, stars: 0 };
  if (!stats) return result;

  // Obiettivo per-match
  const mo = matchObjective(career.season, career.matchIndex);
  if (objectiveMet(mo.id, mo.target, stats)) {
    result.matchDone = true;
    result.stars += 1;
  }

  // Obiettivi di stagione (premio una sola volta ciascuno)
  ensureSeasonObjectives().forEach((o) => {
    if (!o.done && objectiveMet(o.id, o.target, stats)) {
      o.done = true;
      result.seasonDone.push(o.id);
      result.stars += 1;
    }
  });

  career.stars += result.stars;
  career.seasonStars += result.stars;
  saveCareer(career);
  return result;
}

/** Reset obiettivi quando inizia una nuova stagione. */
export function resetSeasonObjectives() {
  ui.career.seasonObjectives = [];
  ui.career.seasonStars = 0;
  ensureSeasonObjectives();
  saveCareer(ui.career);
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // persistenza non disponibile: nessun blocco
  }
}

export function collectPrefs() {
  return {
    athleteId: ui.selectedAthlete?.id ?? null,
    arenaId: ui.selectedArena?.id ?? null,
    mode: ui.selectedMode ?? null,
    tournamentRound: ui.selectedMode === "tournament" ? ui.tournamentRound : 0,
    muted: isMuted(),
    controlMode: ui.controlMode,
    gamepadDeadzone: ui.gamepadDeadzone,
    vibration: ui.vibration,
    aiDifficulty: ui.aiDifficulty,
    matchLength: ui.matchLength,
    volume: getVolume(),
    reduceMotion: ui.reduceMotion,
    matchPanel: ui.matchPanel,
    colorblind: ui.colorblind,
    lang: ui.lang,
    playerMode: ui.playerMode,
  };
}

const screens = {
  menu: document.getElementById("screen-menu"),
  characters: document.getElementById("screen-characters"),
  modes: document.getElementById("screen-modes"),
  arena: document.getElementById("screen-arena"),
  help: document.getElementById("screen-help"),
  history: document.getElementById("screen-history"),
  profile: document.getElementById("screen-profile"),
  drill: document.getElementById("screen-drill"),
  settings: document.getElementById("screen-settings"),
  game: document.getElementById("screen-game"),
  result: document.getElementById("screen-result"),
};

export const ui = {
  selectedAthlete: null,
  selectedMode: null,
  selectedArena: null,
  tournamentRound: 0,
  pendingContinue: false,
  controlMode: "semi",
  gamepadDeadzone: 0.15,
  vibration: true,
  aiDifficulty: "easy",
  matchLength: "points11",
  reduceMotion: false,
  // Vista immersiva: il campo riempie lo schermo, la fascia sotto e' opzionale.
  matchPanel: false,
  colorblind: false,
  lang: "it",
  playerMode: "solo",
  career: loadCareer(),
};

export function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("screen--active", key === name);
  });
  window.scrollTo(0, 0);
}

function selectAthleteCard(card, athlete) {
  document.querySelectorAll(".athlete-card").forEach((c) => c.classList.remove("athlete-card--selected"));
  card.classList.add("athlete-card--selected");
  ui.selectedAthlete = athlete;
}

function lockLabel(unlock) {
  const parts = [];
  if (unlock?.trophies) parts.push(t("unlockTrophies", { n: unlock.trophies }));
  if (unlock?.stars) parts.push(t("unlockStars", { n: unlock.stars }));
  return parts.join(" · ");
}

const UNLOCK_TAPS = 3;
const UNLOCK_TAP_WINDOW = 1400;
let unlockTaps = 0;
let unlockTapTime = 0;

/**
 * Tre tocchi su una card bloccata entro la finestra chiedono il codice di
 * sblocco. Restituisce true solo se lo sblocco e' appena avvenuto, cosi' il
 * chiamante sa se deve ridisegnare la griglia.
 */
function promptUnlockCode() {
  if (ui.career.unlockAll) return false;
  const now = Date.now();
  unlockTaps = now - unlockTapTime > UNLOCK_TAP_WINDOW ? 1 : unlockTaps + 1;
  unlockTapTime = now;
  if (unlockTaps < UNLOCK_TAPS) return false;
  unlockTaps = 0;
  const risposta = window.prompt(t("unlockPrompt"));
  if (risposta === null) return false;
  if (risposta.trim().toUpperCase() !== UNLOCK_CODE) {
    window.alert(t("unlockWrong"));
    return false;
  }
  ui.career.unlockAll = true;
  saveCareer(ui.career);
  window.alert(t("unlockDone"));
  return true;
}

/**
 * Limiti della demo applicati all'interfaccia. Le modalita' escluse restano
 * visibili ma bloccate: vedere cosa manca vende piu' che nasconderlo. Riusa
 * `mode-card--locked`, che la navigazione da controller gia' salta.
 */
export function applyDemoLimits() {
  if (!IS_DEMO) return;
  document.body.classList.add("is-demo");
  document.querySelectorAll(".mode-card").forEach((card) => {
    if (DEMO_CONTENT.modes.includes(card.dataset.mode)) return;
    card.classList.add("mode-card--locked", "mode-card--demo");
    const tag = card.querySelector(".mode-card__tag");
    if (tag) {
      tag.textContent = t("demoLockedMode");
      tag.classList.remove("mode-card__tag--ready");
    }
  });
  // La demo gira su una sola difficolta': il facile fa sembrare il gioco banale,
  // il difficile respinge chi ha in mano il controller da tre minuti.
  ui.aiDifficulty = DEMO_CONTENT.difficulty;
  ui.selectedMode = DEMO_CONTENT.modes[0];
  document.querySelectorAll("#difficultySeg button").forEach((button) => {
    if (button.dataset.value !== DEMO_CONTENT.difficulty) button.disabled = true;
  });
}

export function renderAthletes(onSelect, selectedId = null) {
  const grid = document.getElementById("athleteGrid");
  grid.innerHTML = "";

  demoFilter(ATHLETES, DEMO_CONTENT.athletes).forEach((athlete) => {
    const locked = !isUnlocked(athlete, ui.career);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "athlete-card";
    if (locked) card.classList.add("athlete-card--locked");
    card.dataset.id = athlete.id;
    card.innerHTML = `
      <div class="athlete-card__art" style="background-image:linear-gradient(180deg, transparent 48%, rgba(4, 10, 35, 0.5) 100%),url('${athlete.image}');border-bottom-color:${athlete.color}" aria-hidden="true">${locked ? `<span class="lock-badge">🔒</span>` : ""}</div>
      <div class="athlete-card__body">
        <h3 style="color:${athlete.color}">${t(`athlete_${athlete.id}_name`)}</h3>
        <p class="athlete-card__role">${t(`athlete_${athlete.id}_role`)}</p>
        <p class="athlete-card__desc">${locked ? lockLabel(athlete.unlock) : t(`athlete_${athlete.id}_desc`)}</p>
        <p class="athlete-card__special">⚡ ${t(`athlete_${athlete.id}_special`)}</p>
      </div>
    `;
    if (!locked) {
      card.addEventListener("click", () => {
        selectAthleteCard(card, athlete);
        onSelect?.(athlete);
      });
      if (athlete.id === selectedId) selectAthleteCard(card, athlete);
    } else {
      // Niente `disabled`: un bottone disabilitato non emette click, quindi il
      // triplo tocco non arriverebbe mai. Resta inselezionabile perche' l'unica
      // cosa che fa e' contare i tocchi.
      card.setAttribute("aria-disabled", "true");
      card.addEventListener("click", () => {
        if (promptUnlockCode()) renderAthletes(onSelect, selectedId);
      });
    }
    grid.appendChild(card);
  });
}

export function renderArenas(onSelect) {
  const grid = document.getElementById("arenaGrid");
  grid.innerHTML = "";

  demoFilter(ARENAS, DEMO_CONTENT.arenas).forEach((arena) => {
    const locked = !isUnlocked(arena, ui.career);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "arena-card";
    if (locked) card.classList.add("arena-card--locked");
    card.innerHTML = `
      <div class="arena-card__preview" style="--accent:${arena.palette.accent};background-image:linear-gradient(180deg, transparent 45%, rgba(5, 9, 29, 0.7) 100%),url('${arena.image}')" aria-hidden="true">
        <span>${t(`arena_${arena.id}_name`)}</span>
        ${locked ? `<span class="lock-badge">🔒</span>` : ""}
      </div>
      <div class="arena-card__body">
        <h3>${t(`arena_${arena.id}_name`)}</h3>
        <p>${locked ? lockLabel(arena.unlock) : t(`arena_${arena.id}_desc`)}</p>
      </div>
    `;
    if (!locked) {
      card.addEventListener("click", () => {
        ui.selectedArena = arena;
        onSelect?.(arena);
      });
    } else {
      card.disabled = true;
    }
    grid.appendChild(card);
  });
}

export function updateHud(state) {
  document.getElementById("playerScore").textContent = String(state.playerScore);
  document.getElementById("aiScore").textContent = String(state.aiScore);
  document.getElementById("playerName").textContent = t(`athlete_${state.athlete.id}_name`).split(" ").pop();
  document.getElementById("aiName").textContent = (state.humanMode === "pvp" && state.opponentAthlete
    ? t(`athlete_${state.opponentAthlete.id}_name`)
    : (state.ai.id ? t(`ai_${state.ai.id}_name`) : state.ai.name)).split(" ").pop();
  document.getElementById("matchInfo").textContent = getMatchInfo(state);
  const activePaddle = state[state.activePlayerKey];
  const activeRole = activePaddle.y > COURT.netY + 150 ? t("roleBack") : t("roleNet");
  const receivingServe = state.serveSide === "ai" && (state.serving || state.ball.serveInFlight);
  const receiverSide = state.ball.serveTargetSide === "left" ? t("sideLeft") : t("sideRight");
  const activePlayerLabel = document.getElementById("activePlayerLabel");
  activePlayerLabel.textContent = receivingServe
    ? t("receiverLbl", { side: receiverSide })
    : state.manualSwitchFlash > 0
      ? `${t("manual")} > ${activeRole}`
    : state.receiverSwitchFlash > 0
    ? t("autoSwitchLbl", { role: activeRole })
    : state.receiverLocked
      ? t("receiveLbl", { role: activeRole })
      : t(state.controlMode === "manual" ? "manualLbl" : "controlLbl", { role: activeRole });
  activePlayerLabel.classList.toggle("is-auto-switch", state.receiverSwitchFlash > 0);
  const tacticLabel = document.getElementById("teamTacticLabel");
  if (tacticLabel) {
    const tactic = state.playerTeamTactic ?? "balanced";
    const movementState = activePaddle.splitStep > 0.15
      ? t("splitStepLbl")
      : activePaddle.sprinting > 0.15
        ? `${t("sprintLbl")} ${Math.round(activePaddle.sprinting * 100)}%`
        : null;
    tacticLabel.textContent = movementState ? movementState.toUpperCase() : t(`tacticHud_${tactic}`);
    tacticLabel.dataset.tactic = tactic;
    tacticLabel.classList.toggle("is-flashing", state.tacticFlash > 0);
  }
  const comboEl = document.getElementById("comboDisplay");
  comboEl.textContent = t("combo", { n: state.combo });
  const comboColors = { 1: "#7ef3ff", 2: "#8fffd0", 3: "#ffe066", 4: "#ff9a5c" };
  comboEl.style.color = comboColors[state.combo] ?? "#ff6d70";
  comboEl.style.textShadow = state.combo >= 4 ? "0 0 10px rgba(255,106,92,0.8)" : "none";
  const minutes = Math.floor(state.elapsed / 60).toString().padStart(2, "0");
  const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, "0");
  document.getElementById("gameTimer").textContent = `${minutes}:${seconds}`;

  const fill = document.getElementById("specialFill");
  fill.style.width = `${Math.round(state.specialReady * 100)}%`;
  fill.style.opacity = state.specialCooldown > 0 ? "0.45" : "1";

  document.getElementById("shotPowerFill").style.width = `${Math.round(state.shotCharge * 100)}%`;
  document.getElementById("shotAimNeedle").style.left = `${50 + state.shotAim * 42}%`;
  const intentLabel = document.getElementById("shotIntentLabel");
  if (intentLabel) {
    const labels = {
      drive: t("driveLbl"),
      slice: t("sliceLbl"),
      lob: t("lobLbl"),
      "defensive-lob": t("defensiveLobLbl"),
      chiquita: t("chiquitaLbl"),
      vibora: t("viboraLbl"),
      smash: t("smashLbl"),
      auto: t("shot"),
    };
    intentLabel.textContent = (labels[state.shotIntent] ?? t("shot")).toUpperCase();
    intentLabel.dataset.intent = state.shotIntent;
  }
  const adviceLabel = document.getElementById("shotAdviceLabel");
  const advice = state.shotRead?.advice ?? "read";
  if (adviceLabel) {
    adviceLabel.textContent = t(`shotAdvice_${advice}`).toUpperCase();
    adviceLabel.dataset.profile = state.shotRead?.profile ?? "control";
  }
  const timingNeedle = document.getElementById("shotTimingNeedle");
  const timingPerfect = document.getElementById("shotTimingPerfect");
  if (timingNeedle && timingPerfect) {
    const timing = state.shotRead;
    const eta = timing?.active ? timing.eta : null;
    // The meter is a forecast: the cursor reaches the green zone when the ball reaches the contact plane.
    const position = eta === null ? -8 : Math.max(-8, Math.min(108, 52 - eta * 72));
    const width = Math.max(5, Math.min(17, (timing?.perfectWindow ?? 0.055) * 155));
    timingNeedle.style.left = `${position}%`;
    timingPerfect.style.left = `${52 - width / 2}%`;
    timingPerfect.style.width = `${width}%`;
  }

  const banner = document.getElementById("serveBanner");
  const betweenPoints = state.pointPause > 0;
  banner.classList.toggle("is-visible", state.serving || betweenPoints);
  banner.classList.toggle("serve-banner--point", betweenPoints);
  banner.textContent = betweenPoints
    ? state.pointMessage
    : state.serveSide === "player"
      ? state.serveAttempts ? t("serveSecond") : t("serveFirst")
      : t("serveOpp");

  const log = document.getElementById("eventLog");
  log.innerHTML = state.events.map((e) => `<li>${e}</li>`).join("");
}

function statRow(label, player, ai, lowerBetter = false) {
  const playerBetter = lowerBetter ? player < ai : player > ai;
  const aiBetter = lowerBetter ? ai < player : ai > player;
  return `
    <div class="result-stats__row">
      <span class="result-stats__val${playerBetter ? " is-better" : ""}">${player}</span>
      <span class="result-stats__label">${label}</span>
      <span class="result-stats__val${aiBetter ? " is-better" : ""}">${ai}</span>
    </div>
  `;
}

export function renderMatchStats(state) {
  const el = document.getElementById("resultStats");
  if (!el) return;
  const s = state.stats;
  if (!s) {
    el.innerHTML = "";
    return;
  }
  const avgRally = s.rallyCount ? (s.totalRallyHits / s.rallyCount).toFixed(1) : "0";
  el.innerHTML = `
    <div class="result-stats__head"><span>${t("statYou")}</span><span>${t("statStats")}</span><span>${t("statOpp")}</span></div>
    ${statRow(t("statPoints"), s.pointsWon.player, s.pointsWon.ai)}
    ${statRow(t("statAces"), s.aces.player, s.aces.ai)}
    ${statRow(t("statWinners"), s.winners.player, s.winners.ai)}
    ${statRow(t("statErrors"), s.errors.player, s.errors.ai, true)}
    <div class="result-stats__foot">
      <span>${t("statLongest")} <b>${s.longestRally}</b></span>
      <span>${t("statAvgRally")} <b>${avgRally}</b></span>
    </div>
  `;
}

/** Testo narrativo del rivale basato sullo streak corrente. */
function rivalNarrative(won) {
  const streak = ui.career.rivalStreak ?? 0;
  if (won && streak >= 2) return t("rivalStreakWin", { n: streak });
  if (!won && streak <= -2) return t("rivalStreakLoss", { n: -streak });
  return "";
}

function objectiveLabel(id, target) {
  return t(`obj_${id}`, { n: target });
}

/** Mostra gli obiettivi di carriera con esito nel riepilogo di fine match. */
export function renderObjectives(state) {
  const el = document.getElementById("resultObjectives");
  if (!el) return;
  if (state.mode !== "career" || !state.stats) {
    el.innerHTML = "";
    return;
  }
  const career = ui.career;
  const stats = state.stats;
  const rows = [];

  const mo = state.matchObjective;
  if (mo) {
    const st = objectiveStatus(mo, stats);
    rows.push({ label: objectiveLabel(mo.id, mo.target), done: st.done, title: t("objMatchTitle") });
  }
  const earnedStars = ui.objectiveResult?.stars ?? 0;
  (career.seasonObjectives ?? []).forEach((o) => {
    const st = objectiveStatus(o, stats);
    rows.push({ label: objectiveLabel(o.id, o.target), done: st.done, title: t("objSeasonTitle") });
  });

  if (!rows.length && !earnedStars) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="result-objectives__head">${t("objTitle")}${earnedStars ? ` &nbsp;·&nbsp; <span class="result-objectives__stars">${t("objStarsEarned", { n: earnedStars })}</span>` : ""}</div>
    ${rows.map((r) => `
      <div class="result-objectives__row${r.done ? " is-done" : ""}">
        <span class="result-objectives__check">${r.done ? "✓" : "○"}</span>
        <span class="result-objectives__label">${r.label}</span>
        <span class="result-objectives__cat">${r.title}</span>
      </div>`).join("")}
  `;
}

export function showResult(state, winner) {
  const title = document.getElementById("resultTitle");
  const message = document.getElementById("resultMessage");
  if (state.pointsToWin) {
    document.getElementById("resultPlayer").textContent = String(state.points.player);
    document.getElementById("resultAi").textContent = String(state.points.ai);
  } else {
    document.getElementById("resultPlayer").textContent = String(state.sets.player);
    document.getElementById("resultAi").textContent = String(state.sets.ai);
  }

  if (winner === "player") {
    title.textContent = t("victory");
    if (state.mode === "career") {
      const rival = rivalNarrative(true);
      message.textContent = (ui.careerSeasonWon
        ? t("careerSeasonWin", { season: state.careerSeason })
        : t("careerMatchWin", { season: state.careerSeason, match: ui.career.matchIndex }))
        + (rival ? ` ${rival}` : "");
    } else if (state.mode === "tournament" && ui.tournamentRound < 2) {
      message.textContent = t("tourneyNext", { n: ui.tournamentRound + 1 });
    } else if (state.mode === "tournament") {
      message.textContent = t("tourneyWin");
    } else {
      message.textContent = t("winArena", { arena: t(`arena_${state.arena.id}_name`) });
    }
  } else {
    title.textContent = t("defeat");
    const rival = state.mode === "career" ? rivalNarrative(false) : "";
    message.textContent = (state.mode === "career" ? t("careerLoss") : t("defeatMsg")) + (rival ? ` ${rival}` : "");
  }

  renderObjectives(state);

  const rematchBtn = document.querySelector('[data-action="rematch"]');
  if (rematchBtn) {
    rematchBtn.textContent = ui.pendingContinue ? t("nextMatch") : t("rematch");
  }

  renderMatchStats(state);
  showScreen("result");
}

export function getAiForMatch(mode, round, difficulty = "easy") {
  if (mode === "quick") {
    const index = { easy: 0, medium: 1, hard: 2 }[difficulty] ?? 0;
    return AI_OPPONENTS[index];
  }
  if (mode === "career") {
    const career = ui.career;
    const base = AI_OPPONENTS[Math.min(career.season - 1, AI_OPPONENTS.length - 1)];
    const growth = Math.max(0, career.season - AI_OPPONENTS.length) * 0.05 + career.matchIndex * 0.04;
    return {
      ...base,
      skill: Math.min(0.96, base.skill + growth),
      speed: base.speed + growth * 140,
      power: Math.min(1.2, base.power + growth),
    };
  }
  return AI_OPPONENTS[Math.min(round, AI_OPPONENTS.length - 1)];
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // persistenza non disponibile
  }
}

export function recordMatch(entry) {
  const list = loadHistory();
  list.unshift(entry);
  saveHistory(list);
}

export function renderHistory() {
  const statsEl = document.getElementById("historyStats");
  const listEl = document.getElementById("historyList");
  if (!statsEl || !listEl) return;  const list = loadHistory();
  const wins = list.filter((m) => m.winner === "player").length;
  const losses = list.filter((m) => m.winner !== "player").length;
  const trophies = list.filter((m) => m.trophy || (m.mode === "tournament" && m.winner === "player")).length;
  statsEl.innerHTML = `
    <div class="history-stats__box history-stats__box--wins"><b>${wins}</b><span>${t("histWins")}</span></div>
    <div class="history-stats__box history-stats__box--losses"><b>${losses}</b><span>${t("histLosses")}</span></div>
    <div class="history-stats__box history-stats__box--trophies"><b>${trophies}</b><span>${t("histTrophies")}</span></div>
  `;
  if (!list.length) {
    listEl.innerHTML = `<li class="history-empty">${t("histEmpty")}</li>`;
    return;
  }
  const locale = getLang() === "it" ? "it-IT" : "en-US";
  listEl.innerHTML = list.map((m) => {
    const win = m.winner === "player";
    const date = new Date(m.ts).toLocaleDateString(locale, { day: "2-digit", month: "short" });
    const modeBase = m.mode === "tournament" ? t("tournamentMatch") : m.mode === "career" ? t("careerMatch") : t("quickMatch");
    const hm = m.humanMode === "coop" ? t("hmCoop") : m.humanMode === "pvp" ? t("hmPvp") : "";
    const mode = hm ? `${modeBase} · ${hm}` : modeBase;
    return `<li>
      <span class="history-badge history-badge--${win ? "win" : "loss"}">${win ? t("histWin") : t("histLoss")}</span>
      <div class="history-main">
        <strong>${mode} ${t("histVs")} ${m.opponent || "IA"}</strong>
        <span>${m.athlete} · ${m.arena}</span>
      </div>
      <div class="history-meta"><b>${m.score}</b><span>${date}</span></div>
    </li>`;
  }).join("");
}

export function renderProfile() {
  const statsEl = document.getElementById("profileStats");
  const objEl = document.getElementById("profileObjectives");
  const unlockEl = document.getElementById("profileUnlocks");
  if (!statsEl) return;
  const career = ui.career;
  const total = career.wins + career.losses;
  const winRate = total ? Math.round((career.wins / total) * 100) : 0;
  statsEl.innerHTML = `
    <div class="history-stats__box history-stats__box--wins"><b>${career.wins}</b><span>${t("histWins")}</span></div>
    <div class="history-stats__box history-stats__box--trophies"><b>${career.trophies}</b><span>${t("profileSeasons")}</span></div>
    <div class="history-stats__box history-stats__box--stars"><b>${career.stars}</b><span>${t("profileStars")}</span></div>
    <div class="history-stats__box history-stats__box--rate"><b>${winRate}%</b><span>${t("profileWinRate")}</span></div>
  `;

  if (objEl) {
    const objectives = ensureSeasonObjectives();
    objEl.innerHTML = objectives.length
      ? objectives.map((o) => `
        <div class="result-objectives__row${o.done ? " is-done" : ""}">
          <span class="result-objectives__check">${o.done ? "✓" : "○"}</span>
          <span class="result-objectives__label">${t(`obj_${o.id}`, { n: o.target })}</span>
          <span class="result-objectives__cat">${o.done ? t("objDone") : ""}</span>
        </div>`).join("")
      : `<p class="profile-empty">${t("profileNoObjectives")}</p>`;
  }

  if (unlockEl) {
    const items = [
      ...ATHLETES.filter((a) => a.unlock).map((a) => ({ name: t(`athlete_${a.id}_name`), item: a, kind: t("profileKindAthlete") })),
      ...ARENAS.filter((a) => a.unlock).map((a) => ({ name: t(`arena_${a.id}_name`), item: a, kind: t("profileKindArena") })),
    ];
    unlockEl.innerHTML = items.length
      ? items.map(({ name, item, kind }) => {
        const unlocked = isUnlocked(item, career);
        return `
        <div class="result-objectives__row${unlocked ? " is-done" : ""}">
          <span class="result-objectives__check">${unlocked ? "🔓" : "🔒"}</span>
          <span class="result-objectives__label">${name} <em class="profile-kind">${kind}</em></span>
          <span class="result-objectives__cat">${unlocked ? t("profileUnlockedYes") : lockLabel(item.unlock)}</span>
        </div>`;
      }).join("")
      : "";
  }
}

export function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    const bold = [...el.querySelectorAll("b")].map((node) => node.outerHTML);
    el.textContent = t(key);
    if (bold.length) el.insertAdjacentHTML("beforeend", bold.join(""));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const key = el.dataset.i18nAlt;
    if (key) el.alt = t(key);
  });
  document.title = t("pageTitle");
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = t("metaDesc");
  renderHistory();
  renderProfile();
}

export function bindNavigation(handlers) {
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.dataset.action;
      handlers[action]?.();
    });
  });

  applyDemoLimits();

  document.querySelectorAll(".mode-card:not(.mode-card--locked)").forEach((card) => {
    card.addEventListener("click", () => {
      ui.selectedMode = card.dataset.mode;
      if (ui.selectedMode === "tournament") {
        ui.tournamentRound = 0;
        ui.pendingContinue = false;
      }
      savePrefs(collectPrefs());
      handlers.selectMode?.(ui.selectedMode);
    });
  });
}
