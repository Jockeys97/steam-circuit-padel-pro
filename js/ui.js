import { ATHLETES, ARENAS, AI_OPPONENTS, COURT } from "./data.js?v=20260721-arenas-v1";
import { getMatchInfo } from "./game.js?v=20260720-sprite-athletes-v3";

const screens = {
  menu: document.getElementById("screen-menu"),
  characters: document.getElementById("screen-characters"),
  modes: document.getElementById("screen-modes"),
  arena: document.getElementById("screen-arena"),
  game: document.getElementById("screen-game"),
  result: document.getElementById("screen-result"),
};

export const ui = {
  selectedAthlete: null,
  selectedMode: null,
  selectedArena: null,
  tournamentRound: 0,
  pendingContinue: false,
};

export function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("screen--active", key === name);
  });
}

export function renderAthletes(onSelect) {
  const grid = document.getElementById("athleteGrid");
  grid.innerHTML = "";

  ATHLETES.forEach((athlete) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "athlete-card";
    card.dataset.id = athlete.id;
    card.innerHTML = `
      <div class="athlete-card__art" style="background-image:linear-gradient(180deg, transparent 48%, rgba(4, 10, 35, 0.5) 100%),url('${athlete.image}');border-bottom-color:${athlete.color}" aria-hidden="true"></div>
      <div class="athlete-card__body">
        <h3 style="color:${athlete.color}">${athlete.name}</h3>
        <p class="athlete-card__role">${athlete.role}</p>
        <p class="athlete-card__desc">${athlete.desc}</p>
        <p class="athlete-card__special">⚡ ${athlete.special.name}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".athlete-card").forEach((c) => c.classList.remove("athlete-card--selected"));
      card.classList.add("athlete-card--selected");
      ui.selectedAthlete = athlete;
      document.getElementById("confirmAthlete").disabled = false;
      onSelect?.(athlete);
    });
    grid.appendChild(card);
  });
}

export function renderArenas(onSelect) {
  const grid = document.getElementById("arenaGrid");
  grid.innerHTML = "";

  ARENAS.forEach((arena) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "arena-card";
    card.innerHTML = `
      <div class="arena-card__preview" style="--accent:${arena.palette.accent};background-image:linear-gradient(180deg, transparent 45%, rgba(5, 9, 29, 0.7) 100%),url('${arena.image}')" aria-hidden="true">
        <span>${arena.name}</span>
      </div>
      <div class="arena-card__body">
        <h3>${arena.name}</h3>
        <p>${arena.desc}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      ui.selectedArena = arena;
      onSelect?.(arena);
    });
    grid.appendChild(card);
  });
}

export function updateHud(state) {
  document.getElementById("playerScore").textContent = String(state.playerScore);
  document.getElementById("aiScore").textContent = String(state.aiScore);
  document.getElementById("playerName").textContent = state.athlete.name.split(" ").pop();
  document.getElementById("aiName").textContent = state.ai.name.split(" ").pop();
  document.getElementById("matchInfo").textContent = getMatchInfo(state);
  const activePaddle = state[state.activePlayerKey];
  const activeRole = activePaddle.y > COURT.netY + 150 ? "FONDO" : "RETE";
  const receivingServe = state.serveSide === "ai" && (state.serving || state.ball.serveInFlight);
  const receiverSide = state.ball.serveTargetSide === "left" ? "SINISTRA" : "DESTRA";
  const activePlayerLabel = document.getElementById("activePlayerLabel");
  activePlayerLabel.textContent = receivingServe
    ? `RICEVITORE: ${receiverSide}`
    : state.receiverSwitchFlash > 0
    ? `AUTO > ${activeRole}`
    : state.receiverLocked
      ? `RICEZIONE: ${activeRole}`
      : `CONTROLLO: ${activeRole}`;
  activePlayerLabel.classList.toggle("is-auto-switch", state.receiverSwitchFlash > 0);
  document.getElementById("comboDisplay").textContent = `Combo x${state.combo}`;
  const minutes = Math.floor(state.elapsed / 60).toString().padStart(2, "0");
  const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, "0");
  document.getElementById("gameTimer").textContent = `${minutes}:${seconds}`;

  const fill = document.getElementById("specialFill");
  fill.style.width = `${Math.round(state.specialReady * 100)}%`;
  fill.style.opacity = state.specialCooldown > 0 ? "0.45" : "1";

  document.getElementById("shotPowerFill").style.width = `${Math.round(state.shotCharge * 100)}%`;
  document.getElementById("shotAimNeedle").style.left = `${50 + state.shotAim * 42}%`;

  const banner = document.getElementById("serveBanner");
  const betweenPoints = state.pointPause > 0;
  banner.classList.toggle("is-visible", state.serving || betweenPoints);
  banner.classList.toggle("serve-banner--point", betweenPoints);
  banner.textContent = betweenPoints
    ? state.pointMessage
    : state.serveSide === "player"
      ? `${state.serveAttempts ? "SECONDA" : "PRIMA"} DI SERVIZIO · SPAZIO`
      : "SERVIZIO AVVERSARIO";

  const log = document.getElementById("eventLog");
  log.innerHTML = state.events.map((e) => `<li>${e}</li>`).join("");
}

export function showResult(state, winner) {
  const title = document.getElementById("resultTitle");
  const message = document.getElementById("resultMessage");
  document.getElementById("resultPlayer").textContent = String(state.sets.player);
  document.getElementById("resultAi").textContent = String(state.sets.ai);

  if (winner === "player") {
    title.textContent = "VITTORIA!";
    if (state.mode === "tournament" && ui.tournamentRound < 2) {
      message.textContent = `Match ${ui.tournamentRound + 1} vinto. Prossimo avversario più forte!`;
    } else if (state.mode === "tournament") {
      message.textContent = "Hai conquistato il trofeo del circuito Steam!";
    } else {
      message.textContent = `Hai dominato ${state.arena.name}.`;
    }
  } else {
    title.textContent = "SCONFITTA";
    message.textContent = "Il circuito a vapore ti aspetta per una rivincita.";
  }

  const rematchBtn = document.querySelector('[data-action="rematch"]');
  if (rematchBtn) {
    rematchBtn.textContent = ui.pendingContinue ? "PROSSIMO MATCH" : "RIGIOCA";
  }

  showScreen("result");
}

export function getAiForMatch(mode, round) {
  if (mode === "quick") return AI_OPPONENTS[0];
  return AI_OPPONENTS[Math.min(round, AI_OPPONENTS.length - 1)];
}

export function bindNavigation(handlers) {
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.dataset.action;
      handlers[action]?.();
    });
  });

  document.querySelectorAll(".mode-card:not(.mode-card--locked)").forEach((card) => {
    card.addEventListener("click", () => {
      ui.selectedMode = card.dataset.mode;
      if (ui.selectedMode === "tournament") {
        ui.tournamentRound = 0;
        ui.pendingContinue = false;
      }
      handlers.selectMode?.(ui.selectedMode);
    });
  });
}
