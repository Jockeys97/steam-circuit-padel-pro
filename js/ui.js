import { ATHLETES, ARENAS, AI_OPPONENTS, COURT, isUnlocked, seasonObjectives, matchObjective, OBJECTIVE_DEFS, UNLOCK_CODE, outfitsForAthlete, SEASON_METRIC_AGG, emptySeasonProgress, CAREER_MATCHES, CAREER_PROMOTION_WINS, CAREER_FINAL_SEASON, careerAiProfile, careerFixture } from "./data.js?v=20260813-standard-sprites-v29";
import { getMatchInfo } from "./game.js?v=20260813-standard-sprites-v29";
import { getVolume, isMuted } from "./audio.js?v=20260813-standard-sprites-v29";
import { getLang, t } from "./i18n.js?v=20260813-standard-sprites-v29";
import { IS_DEMO, DEMO_CONTENT, demoFilter } from "./build.js?v=20260813-standard-sprites-v29";

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
  // Vittorie nella stagione in corso: decide se si avanza, se si vince il
  // trofeo o se la stagione va rigiocata.
  seasonWins: 0,
  // Totale delle metriche sui match della stagione: gli obiettivi di stagione si
  // misurano qui, non sull'ultima partita.
  seasonProgress: emptySeasonProgress(),
  // Obiettivi di stagione gia' premiati, per stagione: "3" -> ["winners", ...].
  // Ripetere una stagione non deve poter ridare la stessa stella.
  claimedObjectives: {},
  // Stagione piu' alta raggiunta: il finale si vede una volta sola.
  bestSeason: 1,
  finaleSeen: false,
  unlockAll: false,
  equippedOutfits: {},
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
    // `claimed` distingue "da centrare" da "gia' pagato in un tentativo
    // precedente di questa stagione": il secondo si centra ancora, ma non da'
    // un'altra stella.
    const claimed = new Set(career.claimedObjectives?.[career.season] ?? []);
    career.seasonObjectives = seasonObjectives(career.season)
      .map((o) => ({ ...o, done: false, claimed: claimed.has(o.id) }));
    career.seasonStars = 0;
  }
  return career.seasonObjectives;
}

/**
 * Riduce i stats di un match alla mappa piatta `metrica -> valore` con cui si
 * misurano gli obiettivi. Match e stagione usano cosi' la stessa forma: prima la
 * valutazione leggeva direttamente `stats.x.player` e il totale di stagione non
 * aveva modo di passare da li'.
 */
export function matchProgress(stats) {
  return {
    pointsWon: stats.pointsWon.player,
    winners: stats.winners.player,
    smashWinners: stats.smashWinners.player,
    errors: stats.errors.player,
    doubleFaults: stats.doubleFaults.player,
    longestRally: stats.longestRally,
  };
}

/**
 * Somma un match nel totale della stagione. Gli obiettivi di stagione si
 * valutano su questo, non sull'ultima partita giocata.
 */
export function accumulateSeasonProgress(stats) {
  const career = ui.career;
  const totals = { ...emptySeasonProgress(), ...(career.seasonProgress ?? {}) };
  const match = matchProgress(stats);
  Object.entries(SEASON_METRIC_AGG).forEach(([metric, agg]) => {
    totals[metric] = agg === "max"
      ? Math.max(totals[metric] ?? 0, match[metric])
      : (totals[metric] ?? 0) + match[metric];
  });
  career.seasonProgress = totals;
  return totals;
}

/** Il totale di stagione, anche prima che sia stato giocato un match. */
export function seasonProgress() {
  return { ...emptySeasonProgress(), ...(ui.career.seasonProgress ?? {}) };
}

function objectiveMet(defId, target, progress) {
  const metric = OBJECTIVE_DEFS[defId]?.metric;
  const value = progress?.[metric] ?? 0;
  return OBJECTIVE_DEFS[defId]?.unit === "max" ? value <= target : value >= target;
}

/** Valuta un obiettivo su una mappa di progresso e ritorna { done, progress, target }. */
export function objectiveStatus(objective, progress) {
  const metric = OBJECTIVE_DEFS[objective.id]?.metric;
  return {
    done: objectiveMet(objective.id, objective.target, progress),
    progress: progress?.[metric] ?? 0,
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

  // L'obiettivo bonus vive dentro il singolo match: si valuta su quello.
  const mo = matchObjective(career.season, career.matchIndex);
  if (objectiveMet(mo.id, mo.target, matchProgress(stats))) {
    result.matchDone = true;
    result.stars += 1;
  }

  // Gli obiettivi di stagione si valutano sul totale accumulato, e una stella
  // per obiettivo si prende una volta per stagione: `claimedObjectives` lo
  // ricorda anche quando la stagione viene rigiocata. Prima le stelle si
  // riazzeravano a ogni ripetizione, quindi perdendo di proposito si restava in
  // stagione 1 e si rifarmavano le stesse tre stelle all'infinito — 60 stelle in
  // dieci cicli, abbastanza per tutto cio' che le stelle sbloccano.
  const totals = accumulateSeasonProgress(stats);
  const claimed = new Set(career.claimedObjectives?.[career.season] ?? []);
  ensureSeasonObjectives().forEach((o) => {
    if (!objectiveMet(o.id, o.target, totals)) return;
    o.done = true;
    if (claimed.has(o.id)) return;
    claimed.add(o.id);
    result.seasonDone.push(o.id);
    result.stars += 1;
  });
  career.claimedObjectives = { ...(career.claimedObjectives ?? {}), [career.season]: [...claimed] };

  career.stars += result.stars;
  career.seasonStars += result.stars;
  saveCareer(career);
  return result;
}

/**
 * Azzera lo stato di stagione: obiettivi e totali ripartono da zero. Le stelle
 * gia' riscosse no — quelle vivono in `career.claimedObjectives`, che sopravvive
 * alla ripetizione della stagione.
 */
export function resetSeasonObjectives() {
  ui.career.seasonObjectives = [];
  ui.career.seasonStars = 0;
  ui.career.seasonProgress = emptySeasonProgress();
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
    lineup: ui.lineup,
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
  lang: "en",
  playerMode: "solo",
  // Chi occupa le altre tre posizioni: identificativi, non oggetti, perche'
  // vengono salvati fra una sessione e l'altra. `null` significa "scegli tu",
  // ed e' il valore con cui il gioco parte.
  lineup: { playerMate: null, opponent: null, opponentMate: null },
  career: loadCareer(),
};

/** Gli atleti effettivamente schierabili: niente bloccati, niente fuori demo. */
export function selectableAthletes() {
  return demoFilter(ATHLETES, DEMO_CONTENT.athletes).filter((a) => isUnlocked(a, ui.career));
}

/** Le arene giocabili, con lo stesso criterio degli atleti. */
export function selectableArenas() {
  return demoFilter(ARENAS, DEMO_CONTENT.arenas).filter((a) => isUnlocked(a, ui.career));
}

/**
 * Il turno di calendario in corso: quale arena e quale rivale. In carriera l'arena
 * la decide il circuito, non il menu — tre match nello stesso campo scelto da te
 * erano tre match indistinguibili, e non davano nessun motivo per giocare l'arena
 * difficile.
 */
export function currentFixture() {
  return careerFixture(ui.career.season, ui.career.matchIndex, selectableArenas());
}

/**
 * Da tre identificativi alle tre formazioni complete.
 *
 * Le posizioni non scelte vengono riempite con i primi atleti disponibili, che
 * e' esattamente cio' che il gioco faceva prima in automatico. Serve anche a
 * reggere i casi limite senza schermate d'errore: nella demo ci sono due soli
 * atleti, e un identificativo salvato puo' riferirsi a un atleta non ancora
 * sbloccato in questa carriera.
 */
export function resolveLineup(athlete) {
  const disponibili = selectableAthletes();
  const scelto = (id) => (id ? disponibili.find((a) => a.id === id) : null) ?? null;
  // Si sceglie solo fra gli atleti disponibili, ma il ripiego pesca dal roster
  // intero: nella demo si gioca con due atleti e si affrontano gli altri, che e'
  // esattamente cio' che accadeva prima. Restringere anche il ripiego avrebbe
  // messo lo stesso avversario in tutte e tre le posizioni.
  // Un identificativo vale solo se l'atleta e' disponibile, non e' quello con
  // cui si gioca e non e' gia' schierato altrove: cambiando atleta principale
  // ci si ritroverebbe altrimenti due volte lo stesso in campo.
  const lineup = { playerMate: null, opponent: null, opponentMate: null };
  const usati = new Set([athlete.id]);
  for (const ruolo of ["playerMate", "opponent", "opponentMate"]) {
    const candidato = scelto(ui.lineup[ruolo]);
    if (candidato && !usati.has(candidato.id)) {
      lineup[ruolo] = candidato;
      usati.add(candidato.id);
    }
  }
  // Il ripiego non ripesca chi e' gia' in campo, cosi' una partita fra quattro
  // atleti diversi resta il caso normale anche senza scegliere niente.
  const riserve = ATHLETES.filter((a) => a.id !== athlete.id);
  const libero = () => {
    const occupati = new Set([athlete.id, ...Object.values(lineup).filter(Boolean).map((a) => a.id)]);
    return riserve.find((a) => !occupati.has(a.id)) ?? riserve[0] ?? athlete;
  };
  for (const ruolo of ["playerMate", "opponent", "opponentMate"]) {
    if (!lineup[ruolo]) lineup[ruolo] = libero();
  }
  return lineup;
}

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

function selectedOutfit(athlete, career = ui.career) {
  const outfits = outfitsForAthlete(athlete?.id);
  if (!outfits.length) return null;
  const selectedId = career.equippedOutfits?.[athlete.id] ?? "base";
  const candidate = outfits.find((outfit) => outfit.id === selectedId);
  return candidate && isUnlocked(candidate, career) ? candidate : outfits[0];
}

/** Restituisce un profilo di gara con una sola variazione estetica, mai di gameplay. */
export function athleteWithOutfit(athlete, career = ui.career) {
  const outfit = selectedOutfit(athlete, career);
  if (!outfit) return athlete;
  return {
    ...athlete,
    ...(outfit.sprites ?? {}),
    outfit,
    outfitId: outfit.id,
    color: outfit.colors?.[0] ?? athlete.color,
  };
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

/**
 * Cosa e' successo alla stagione. Da quando la sconfitta fa avanzare comunque
 * il calendario, la fine stagione ha tre esiti e vanno raccontati: altrimenti
 * il giocatore non capisce perche' a volte avanza e a volte no.
 */
function careerOutcomeText(state, won) {
  const stagione = state.careerSeason;
  const rivale = state.careerRival ? t(`ai_${state.careerRival.id}_name`) : "";
  switch (ui.careerSeasonOutcome) {
    case "finale": return t("careerFinale", { season: stagione, rival: rivale });
    case "trophy": return t("careerSeasonWin", { season: stagione });
    case "promoted": return t("careerSeasonPromoted", { season: stagione });
    case "repeat": return t("careerSeasonRepeat", { season: stagione });
    default:
      return won
        ? t("careerMatchWin", { season: stagione, match: ui.career.matchIndex })
        : t("careerMatchLoss", { season: stagione, match: ui.career.matchIndex });
  }
}

/**
 * La selezione atleta ha due viste sulla STESSA griglia: prima gli atleti, poi
 * i completi di quello scelto, con la medesima card. Prima il guardaroba stava
 * in una sezione sotto la griglia e bisognava scorrere per vederlo; e ogni card
 * resta un bottone a se', quindi non ci sono bottoni annidati.
 */
/**
 * Le tre statistiche che si sentono in campo, come barrette compatte. Nel
 * pannello squadra la descrizione narrativa non serve: quello che si sta
 * decidendo e' come giochera' quella posizione.
 */
function statLine(athlete) {
  const barra = (valore) => {
    const pieni = Math.round(clampUnit((valore - 0.85) / 0.55) * 5);
    return `<span class="stat-bar">${"▮".repeat(pieni)}${"▯".repeat(5 - pieni)}</span>`;
  };
  const { power, control, speed } = athlete.stats;
  return `<span class="stat-line">
    ${t("statPower")} ${barra(power)}
    ${t("statControl")} ${barra(control)}
    ${t("statSpeed")} ${barra(speed)}
  </span>`;
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}

function athleteCardMarkup(art, color, title, subtitle, description, footer, locked) {
  return `
    <div class="athlete-card__art" style="background-image:linear-gradient(180deg, transparent 48%, rgba(4, 10, 35, 0.5) 100%),url('${art}');border-bottom-color:${color}" aria-hidden="true">${locked ? `<span class="lock-badge">🔒</span>` : ""}</div>
    <div class="athlete-card__body">
      <h3 style="color:${color}">${title}</h3>
      <p class="athlete-card__role">${subtitle}</p>
      <p class="athlete-card__desc">${description}</p>
      <p class="athlete-card__special">${footer}</p>
    </div>
  `;
}

export function renderAthletes(onSelect, selectedId = null) {
  const grid = document.getElementById("athleteGrid");
  const header = document.getElementById("athleteGridHead");

  const showOutfits = (athlete) => {
    const outfits = outfitsForAthlete(athlete.id);
    if (!outfits.length) {
      showTeam(athlete);
      return;
    }
    ui.selectedAthlete = athlete;
    grid.innerHTML = "";
    if (header) {
      header.innerHTML = `<button class="btn btn--ghost" type="button" data-outfit-back>${t("outfitBack")}</button>
        <span class="athlete-grid__hint">${t("outfitSub")}</span>`;
      header.hidden = false;
      header.querySelector("[data-outfit-back]")?.addEventListener("click", () => showAthletes());
    }
    const equipped = selectedOutfit(athlete);
    outfits.forEach((outfit) => {
      const unlocked = isUnlocked(outfit, ui.career);
      const active = equipped?.id === outfit.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "athlete-card";
      if (!unlocked) card.classList.add("athlete-card--locked");
      if (active) card.classList.add("athlete-card--selected");
      card.dataset.outfit = outfit.id;
      const art = outfit.preview ?? athlete.image;
      card.innerHTML = athleteCardMarkup(
        art,
        outfit.colors?.[0] ?? athlete.color,
        t(outfit.nameKey),
        t(`athlete_${athlete.id}_name`),
        unlocked ? (active ? t("outfitEquipped") : t("outfitAvailable")) : lockLabel(outfit.unlock),
        unlocked ? `▶ ${t("outfitPick")}` : "",
        !unlocked,
      );
      if (unlocked) {
        card.addEventListener("click", () => {
          ui.career.equippedOutfits = { ...(ui.career.equippedOutfits ?? {}), [athlete.id]: outfit.id };
          saveCareer(ui.career);
          showTeam(athlete);
        });
      } else {
        card.setAttribute("aria-disabled", "true");
      }
      grid.appendChild(card);
    });
  };

  /**
   * Il pannello squadra: quattro caselle nella stessa griglia a quattro colonne
   * delle card, cosi' non serve un layout nuovo e ogni posizione ha la faccia
   * di chi la occupa. Le caselle sono gia' riempite, quindi chi non vuole
   * scegliere preme Conferma e va: la scelta e' un'opzione, non un pedaggio.
   */
  const showTeam = (athlete) => {
    ui.selectedAthlete = athlete;
    const lineup = resolveLineup(athlete);
    // Si salva la formazione risolta, non quella richiesta: quello che si vede
    // nel pannello e' esattamente quello che scendera' in campo.
    ui.lineup = {
      playerMate: lineup.playerMate.id,
      opponent: lineup.opponent.id,
      opponentMate: lineup.opponentMate.id,
    };
    grid.innerHTML = "";
    if (header) {
      header.innerHTML = `<button class="btn btn--ghost" type="button" data-team-back>${t("teamBack")}</button>
        <span class="athlete-grid__hint">${t("teamSub")}</span>
        <button class="btn btn--primary" type="button" data-team-confirm>${t("teamConfirm")}</button>`;
      header.hidden = false;
      header.querySelector("[data-team-back]")?.addEventListener("click", () => showOutfits(athlete));
      header.querySelector("[data-team-confirm]")?.addEventListener("click", () => {
        onSelect?.(athleteWithOutfit(athlete));
      });
    }

    const caselle = [
      { ruolo: null, atleta: athlete, etichetta: t("slotYou") },
      { ruolo: "playerMate", atleta: lineup.playerMate, etichetta: t("slotPartner") },
      { ruolo: "opponent", atleta: lineup.opponent, etichetta: t("slotOpponent") },
      { ruolo: "opponentMate", atleta: lineup.opponentMate, etichetta: t("slotOpponentNet") },
    ];

    caselle.forEach(({ ruolo, atleta, etichetta }) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "athlete-card team-slot";
      if (!ruolo) card.classList.add("team-slot--fixed");
      if (ruolo === "opponent" || ruolo === "opponentMate") card.classList.add("team-slot--rival");
      const completo = selectedOutfit(atleta);
      card.innerHTML = `<span class="team-slot__tag">${etichetta}</span>` + athleteCardMarkup(
        completo?.preview ?? atleta.image,
        atleta.color,
        t(`athlete_${atleta.id}_name`),
        t(`athlete_${atleta.id}_role`),
        statLine(atleta),
        ruolo ? t("slotChange") : t("slotFixed"),
        false,
      );
      if (ruolo) {
        card.addEventListener("click", () => showPicker(athlete, ruolo));
      } else {
        card.setAttribute("aria-disabled", "true");
      }
      grid.appendChild(card);
    });
  };

  /**
   * La griglia con cui si riempie una casella. Sceglierne uno gia' schierato
   * altrove non e' un errore: le due posizioni si scambiano, che e' quello che
   * uno intende quando sposta un atleta da una parte all'altra della rete.
   */
  const showPicker = (athlete, ruolo) => {
    grid.innerHTML = "";
    if (header) {
      header.innerHTML = `<button class="btn btn--ghost" type="button" data-team-pick-back>${t("teamPickBack")}</button>
        <span class="athlete-grid__hint">${t("teamChoose")}</span>`;
      header.hidden = false;
      header.querySelector("[data-team-pick-back]")?.addEventListener("click", () => showTeam(athlete));
    }
    selectableAthletes().forEach((candidato) => {
      if (candidato.id === athlete.id) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "athlete-card";
      if (ui.lineup[ruolo] === candidato.id) card.classList.add("athlete-card--selected");
      const completo = selectedOutfit(candidato);
      card.innerHTML = athleteCardMarkup(
        completo?.preview ?? candidato.image,
        candidato.color,
        t(`athlete_${candidato.id}_name`),
        t(`athlete_${candidato.id}_role`),
        statLine(candidato),
        `⚡ ${t(`athlete_${candidato.id}_special`)}`,
        false,
      );
      card.addEventListener("click", () => {
        const precedente = ui.lineup[ruolo];
        const altrove = Object.keys(ui.lineup).find((k) => k !== ruolo && ui.lineup[k] === candidato.id);
        if (altrove) ui.lineup[altrove] = precedente;
        ui.lineup[ruolo] = candidato.id;
        showTeam(athlete);
      });
      grid.appendChild(card);
    });
  };

  const showAthletes = () => {
    grid.innerHTML = "";
    if (header) {
      header.innerHTML = "";
      header.hidden = true;
    }
    demoFilter(ATHLETES, DEMO_CONTENT.athletes).forEach((athlete) => {
      const locked = !isUnlocked(athlete, ui.career);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "athlete-card";
      if (locked) card.classList.add("athlete-card--locked");
      card.dataset.id = athlete.id;
      const equipped = selectedOutfit(athlete);
      card.innerHTML = athleteCardMarkup(
        equipped?.preview ?? athlete.image,
        athlete.color,
        t(`athlete_${athlete.id}_name`),
        t(`athlete_${athlete.id}_role`),
        locked ? lockLabel(athlete.unlock) : t(`athlete_${athlete.id}_desc`),
        `⚡ ${t(`athlete_${athlete.id}_special`)}`,
        locked,
      );
      if (!locked) {
        card.addEventListener("click", () => {
          selectAthleteCard(card, athlete);
          showOutfits(athlete);
        });
      } else {
        // Niente `disabled`: un bottone disabilitato non emette click e il
        // triplo tocco per il codice di sblocco non arriverebbe mai.
        card.setAttribute("aria-disabled", "true");
        card.addEventListener("click", () => {
          if (promptUnlockCode()) renderAthletes(onSelect, selectedId);
        });
      }
      grid.appendChild(card);
    });
  };

  showAthletes();
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

/**
 * Testo narrativo del rivale. Ora il rivale ha un nome — quello del gradino di
 * calendario — perche' lo streak raccontava un antagonista che nel codice non
 * esisteva come entita'.
 */
function rivalNarrative(won, rival) {
  const streak = ui.career.rivalStreak ?? 0;
  const nome = rival ? t(`ai_${rival.id}_name`) : t("rivalGeneric");
  if (won && streak >= 2) return t("rivalStreakWin", { n: streak, rival: nome });
  if (!won && streak <= -2) return t("rivalStreakLoss", { n: -streak, rival: nome });
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
  const rows = [];

  // L'obiettivo bonus si misura sul match, quelli di stagione sul totale.
  const mo = state.matchObjective;
  if (mo) {
    const st = objectiveStatus(mo, matchProgress(state.stats));
    rows.push({ label: objectiveLabel(mo.id, mo.target), done: st.done, title: t("objMatchTitle"), st });
  }
  const earnedStars = ui.objectiveResult?.stars ?? 0;
  const totals = seasonProgress();
  (career.seasonObjectives ?? []).forEach((o) => {
    const st = objectiveStatus(o, totals);
    rows.push({
      label: objectiveLabel(o.id, o.target),
      done: st.done,
      title: o.claimed && st.done ? t("objAlreadyClaimed") : t("objSeasonTitle"),
      st,
    });
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
        <span class="result-objectives__progress">${r.st.progress}/${r.st.target}</span>
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
      const rival = rivalNarrative(true, state.careerRival);
      message.textContent = careerOutcomeText(state, true) + (rival ? ` ${rival}` : "");
    } else if (state.mode === "tournament" && ui.tournamentRound < 2) {
      message.textContent = t("tourneyNext", { n: ui.tournamentRound + 1 });
    } else if (state.mode === "tournament") {
      message.textContent = t("tourneyWin");
    } else {
      message.textContent = t("winArena", { arena: t(`arena_${state.arena.id}_name`) });
    }
  } else {
    title.textContent = t("defeat");
    const rival = state.mode === "career" ? rivalNarrative(false, state.careerRival) : "";
    message.textContent = (state.mode === "career"
      ? careerOutcomeText(state, false)
      : t("defeatMsg")) + (rival ? ` ${rival}` : "");
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
    const index = { easy: 0, medium: 1, hard: 2, legend: 3 }[difficulty] ?? 0;
    return AI_OPPONENTS[index];
  }
  if (mode === "career") {
    return careerAiProfile(ui.career.season, ui.career.matchIndex);
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
    // Il progresso e' il totale della stagione: senza mostrarlo, un obiettivo
    // cumulativo e' indistinguibile da uno da centrare in una partita sola.
    const totals = seasonProgress();
    objEl.innerHTML = objectives.length
      ? objectives.map((o) => {
        const st = objectiveStatus(o, totals);
        const cat = st.done ? t("objDone") : o.claimed ? t("objAlreadyClaimed") : "";
        return `
        <div class="result-objectives__row${st.done ? " is-done" : ""}">
          <span class="result-objectives__check">${st.done ? "✓" : "○"}</span>
          <span class="result-objectives__label">${t(`obj_${o.id}`, { n: o.target })}</span>
          <span class="result-objectives__progress">${st.progress}/${st.target}</span>
          <span class="result-objectives__cat">${cat}</span>
        </div>`;
      }).join("")
      : `<p class="profile-empty">${t("profileNoObjectives")}</p>`;
  }

  if (unlockEl) {
    const items = [
      ...ATHLETES.filter((a) => a.unlock).map((a) => ({ name: t(`athlete_${a.id}_name`), item: a, kind: t("profileKindAthlete") })),
      ...ARENAS.filter((a) => a.unlock).map((a) => ({ name: t(`arena_${a.id}_name`), item: a, kind: t("profileKindArena") })),
      ...ATHLETES.flatMap((athlete) => outfitsForAthlete(athlete.id)
        .filter((outfit) => outfit.unlock)
        .map((outfit) => ({ name: `${t(`athlete_${athlete.id}_name`)} · ${t(outfit.nameKey)}`, item: outfit, kind: t("profileKindOutfit") }))),
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
