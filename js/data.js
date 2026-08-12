export const COURT = {
  left: 80,
  right: 880,
  top: 56,
  bottom: 564,
  netY: 310,
  netHeight: 38,
};

export const WIN_SCORE = 11;

/** Parametri globali di bilanciamento — unico punto di tuning */
export const BALANCE = {
  gravity: 38,
  ballGravity: 720,
  groundRestitution: 0.56,
  groundRestitutionBoost: 0.07,
  minimumBounceVz: 118,
  groundTangentialDamping: 0.955,
  groundSpinTransfer: 0.38,
  airDrag: 0.9985,
  airSpinCurve: 0.42,
  wallTangentialDamping: 0.975,
  netClearance: 42,
  playableHitHeight: 108,
  serviceBounceTime: 0.92,
  basePaddleSpeed: 498,
  basePaddleWidth: 112,
  hitCooldownPlayer: 0.18,
  hitCooldownAi: 0.26,
  baseHitLift: 430,
  baseHitAngle: 345,
  spinInfluence: 0.32,
  spinDecay: 0.992,
  specialMinCharge: 0.32,
  specialRegen: 0.3,
  serveVy: 380,
  serveVx: 125,
  // Il servizio ora puo' fallire: dispersione laterale in pixel a carica piena
  // e controllo neutro, moltiplicatore sulla profondita', sconto sulla seconda
  // palla. `serveFlight*` tiene il servizio piu' lento di un drive.
  serveSpread: 60,
  serveSpreadBase: 0.42,
  serveDepthSpread: 1.15,
  serveSecondSafety: 0.70,
  serveFlightBase: 1.16,
  serveFlightGain: 0.18,
  outMargin: 36,
  wallEventCooldown: 1.4,
  comboStep: 4,
  comboMax: 4,
  shotBufferWindow: 0.28,
  smashBufferWindow: 0.9,
  smashDoubleTapWindow: 0.7,
  smashContactGrace: 0.18,
  smashTimingAgeCap: 0.11,
  perfectTimingWindow: 0.055,
  goodTimingWindow: 0.13,
  timingWindowRunPenalty: 0.018,
  timingWindowEnergyPenalty: 0.018,
  timingWindowGlassPenalty: 0.009,
  timingWindowSplitStepBonus: 0.012,
  timingWindowChargePenalty: 0.018,
  timingWindowMin: 0.026,
  timingWindowMax: 0.07,
  hitStopPerfect: 0.055,
  hitStopTimeScale: 0.15,
  // Sotto `shotErrorThreshold` l'esecuzione comincia a produrre errori veri.
  // `shotErrorSpan` e' di quanto deve ancora scendere la qualita' per arrivare
  // all'errore pieno. Gli altri valori sono le ampiezze dei tre canali.
  shotErrorThreshold: 0.8,
  shotErrorSpan: 0.32,
  shotErrorCurve: 1.6,
  shotErrorMaxChance: 0.5,
  shotErrorWideAim: 0.62,
  shotErrorWideShare: 0.45,
  // Angolo stretto su RT: portata della mira, margine dal vetro, taglio alla
  // dispersione e quota di errori laterali.
  tightAngleReachGain: 0.065,
  tightAngleMargin: 10,
  tightAngleJitterCut: 0.45,
  tightAngleMinSpread: 65,
  tightAngleWideShare: 0.85,
  tightDepthReachGain: 54,
  tightDepthMinSpread: 70,
  tightDepthLongShare: 0.8,
  shotErrorShort: 55,
  shotErrorDepth: 150,
  shotErrorMaxDepth: 292,
  rallyEnergyRecovery: 0.062,
  rallyEnergyFloor: 0.16,
  splitStepSpeed: 0.62,
  splitStepQualityBonus: 0.075,
  sprintSpeedBonus: 0.34,
  sprintEnergyDrain: 0.105,
  sprintAccuracyPenalty: 0.12,
  smashNetWindow: 190,
  // La vibora e' un colpo da rete: senza una finestra propria ereditava quella
  // dello smash, larga il 75% del proprio campo, e cancellava lo slice puro.
  viboraNetWindow: 96,
  // Lettura della palla attaccabile da parte dell'IA.
  attackReadHeightLo: 40,
  attackReadHeightHi: 110,
  attackReadSlowSpeed: 150,
  attackReadFastSpeed: 470,
  attackReadAdvance: 200,
  attackReadWeightHeight: 0.46,
  attackReadWeightSlow: 0.28,
  attackReadWeightAdvance: 0.26,
  attackReadSmashGain: 0.35,
  attackReadSmashSkillGain: 0.45,
  attackReadSmashCap: 0.9,
  attackReadVolleyGain: 0.2,
  smashMinHeight: 46,
  smashMinPower: 0.98,
  // Risposta a uno smash: perfetto controbatti, buono difendi, sbagliato regali.
  aiErrorSkillWeight: 0.82,
  aiErrorExecutionWeight: 0.5,
  aiTimingBase: 0.58,
  aiTimingSkill: 0.46,
  aiTimingSpread: 0.95,
  aiTimingSpreadSkill: 0.85,
  playerX3RecoveryWindow: 1.05,
  lateGraceFactor: 0.3,
  smashCounterSplitStep: 0.45,
  smashReturnCounterTiming: 0.93,
  smashReturnDefenceAim: 0.5,
  smashReturnScrambleAim: 0.22,
  smashReturnDefenceDepth: 34,
  smashReturnScrambleDepth: 78,
  smashReturnDefenceArc: 0.16,
  smashReturnScrambleArc: 0.38,
  // Lettura dell'uscita dello x2: decisa una volta sola sul vetro di fondo.
  smashX2ReadBase: 0.05,
  smashX2ReadSkill: 0.90,
  smashX2ReadProximity: 0.22,
  smashX2ReadCap: 0.82,
  smashX2ReadVy: 300,
  smashX2ReadVz: 250,
  smashX2ReadRange: 420,
  smashX2ReturnVy: 580,
  smashX2ReturnVz: 290,
  // Volee tagliata: secondo tocco su X, muore alla base del vetro di FONDO.
  // Il laterale ha gia' due significati (wall-angle e uscita x3) e un terzo lo
  // renderebbe illeggibile; il fondo e' la parete del recupero, ed e' quella
  // che il colpo deve negare.
  cutVolleyTapWindow: 0.7,
  cutVolleyBufferWindow: 0.85,
  cutVolleyMinHeight: 34,
  cutVolleyDepth: 214,
  cutVolleyFlightTime: 0.86,
  cutVolleyBackspin: 1.15,
  cutVolleyMinQuality: 0.52,
  cutVolleyKillVz: -270,
  cutVolleyKillDamp: 0.42,
  cutVolleyReadBase: 0.2,
  cutVolleyReadSkill: 0.62,
  cutVolleyReadSuppress: 0.4,
  smashX2MinQuality: 0.6,
  smashX3MinQuality: 0.7,
  smashFlatMinQuality: 0.48,
};

export const ATHLETES = [
  {
    id: "maestro",
    name: "IL MAESTRO",
    image: "assets/athletes/maestro.png",
    sprite: "assets/sprites/maestro.png",
    backSprite: "assets/sprites/back/maestro.png",
    actionSprite: "assets/sprites/maestro-action.png",
    backActionSprite: "assets/sprites/back/maestro-action.png",
    runSprite: "assets/sprites/maestro-run-v3.png",
    backRunSprite: "assets/sprites/back/maestro-run-v3.png",
    runFrames: 8,
    runDisplay: { front: 123, back: 85 },
    role: "Tecnica",
    color: "#00e5ff",
    visual: { frame: "athletic", skin: "#c98258", hair: "#241b19", hairStyle: "short", headband: "#f4fbff", kit: "#08bfe8", secondary: "#102d68", accent: "#f4fbff", kitStyle: "diagonal", shoes: "#123f78" },
    desc: "Precisione millimetrica e lettura di gioco superiore.",
    stats: { speed: 0.96, power: 0.94, control: 1.28, reach: 1.12, stamina: 1.00 },
    special: {
      name: "Colpo di Precisione",
      cooldown: 3.0,
      desc: "Angolo estremo e palla difficile da leggere.",
    },
    pattern: "repeating-linear-gradient(135deg,#1c1e50 0,#1c1e50 10px,#14163e 10px,#14163e 20px)",
  },
  {
    id: "pantera",
    name: "LA PANTERA",
    image: "assets/athletes/pantera.png",
    sprite: "assets/sprites/pantera.png",
    backSprite: "assets/sprites/back/pantera.png",
    actionSprite: "assets/sprites/pantera-action.png",
    backActionSprite: "assets/sprites/back/pantera-action.png",
    runSprite: "assets/sprites/pantera-run-v3.png",
    backRunSprite: "assets/sprites/back/pantera-run-v3.png",
    runFrames: 8,
    runDisplay: { front: 128, back: 79 },
    role: "Velocità",
    color: "#ff4b6e",
    visual: { frame: "slim", skin: "#b96543", hair: "#251516", hairStyle: "long-pony", headband: "#f52f61", kit: "#ed3e5d", secondary: "#29283b", accent: "#ff7690", kitStyle: "side", shoes: "#9d304b" },
    desc: "Riflessi fulminei e movimenti imprevedibili a rete.",
    stats: { speed: 1.30, power: 1.00, control: 0.96, reach: 0.98, stamina: 1.06 },
    special: {
      name: "Scatto Fulmineo",
      cooldown: 2.6,
      desc: "Dash laterale e volée rapidissima.",
    },
    pattern: "repeating-linear-gradient(135deg,#301222 0,#301222 10px,#201018 10px,#201018 20px)",
  },
  {
    id: "steamer",
    name: "LO STEAMER",
    image: "assets/athletes/steamer.png",
    sprite: "assets/sprites/steamer.png",
    backSprite: "assets/sprites/back/steamer.png",
    actionSprite: "assets/sprites/steamer-action.png",
    backActionSprite: "assets/sprites/back/steamer-action.png",
    runSprite: "assets/sprites/steamer-run-v3.png",
    backRunSprite: "assets/sprites/back/steamer-run-v3.png",
    runFrames: 8,
    runDisplay: { front: 143, back: 77 },
    role: "Potenza",
    color: "#ff8c00",
    visual: { frame: "broad", skin: "#cf7b4e", hair: "#43251b", hairStyle: "spiked", headband: "#ff711c", kit: "#f47713", secondary: "#172c57", accent: "#ff9a35", kitStyle: "raglan", shoes: "#e66b18", beard: true },
    desc: "Smash devastanti e colpi wall che sfondano ogni difesa.",
    stats: { speed: 0.92, power: 1.24, control: 0.96, reach: 1.06, stamina: 1.12 },
    special: {
      name: "Smash a Vapore",
      cooldown: 3.4,
      desc: "Potenza massima con effetto wall.",
    },
    pattern: "repeating-linear-gradient(135deg,#301a06 0,#301a06 10px,#201208 10px,#201208 20px)",
  },
  {
    id: "fiamma",
    name: "LA FIAMMA",
    image: "assets/athletes/fiamma.png",
    sprite: "assets/sprites/fiamma.png",
    backSprite: "assets/sprites/back/fiamma.png",
    actionSprite: "assets/sprites/fiamma-action.png",
    backActionSprite: "assets/sprites/back/fiamma-action.png",
    runSprite: "assets/sprites/fiamma-run-v3.png",
    backRunSprite: "assets/sprites/back/fiamma-run-v3.png",
    runFrames: 8,
    runDisplay: { front: 126, back: 70 },
    role: "Resistenza",
    color: "#1aff8a",
    visual: { frame: "slim", skin: "#c87848", hair: "#251717", hairStyle: "curly-pony", headband: null, kit: "#a9e71d", secondary: "#162d56", accent: "#d7ff4b", kitStyle: "side", shoes: "#9ee31d" },
    desc: "Inossidabile, recupera ogni punto e stanca gli avversari.",
    stats: { speed: 0.96, power: 0.98, control: 1.00, reach: 0.98, stamina: 1.38 },
    special: {
      name: "Scudo di Vapore",
      cooldown: 2.8,
      desc: "Assorbe la pressione e rallenta la palla avversaria.",
    },
    pattern: "repeating-linear-gradient(135deg,#0c2c10 0,#0c2c10 10px,#081e0c 10px,#081e0c 20px)",
  },
  {
    id: "oracolo",
    name: "L'ORACOLO",
    image: "assets/athletes/oracolo.png",
    sprite: "assets/sprites/oracolo-idle-unique.png",
    backSprite: "assets/sprites/back/oracolo-idle-unique.png",
    actionSprite: "assets/sprites/oracolo-action-unique.png",
    backActionSprite: "assets/sprites/back/oracolo-action-unique.png",
    runSprite: "assets/sprites/oracolo-run-unique.png",
    backRunSprite: "assets/sprites/back/oracolo-run-unique.png",
    runFrames: 8,
    runDisplay: { front: 123, back: 85 },
    spriteHeights: {
      front: { idle: 180, action: 180, run: 148 },
      back: { idle: 180, action: 180, run: 148 },
    },
    role: "Tecnica",
    color: "#c98bff",
    unlock: { trophies: 1 },
    visual: { frame: "slim", skin: "#8a5a3b", hair: "#0e0c16", hairStyle: "long-pony", headband: "#c98bff", kit: "#6b3df0", secondary: "#1a0f38", accent: "#e3c6ff", kitStyle: "diagonal", shoes: "#3c1f8a" },
    desc: "Prevede ogni traiettoria: controllo e lettura ai massimi livelli.",
    stats: { speed: 0.94, power: 0.96, control: 1.34, reach: 1.02, stamina: 1.04 },
    special: {
      name: "Visione Perfetta",
      cooldown: 3.1,
      desc: "Angolo impossibile calcolato al millimetro.",
    },
    pattern: "repeating-linear-gradient(135deg,#241640 0,#241640 10px,#180f2c 10px,#180f2c 20px)",
  },
  {
    id: "colosso",
    name: "IL COLOSSO",
    image: "assets/athletes/colosso.png",
    sprite: "assets/sprites/colosso-idle-unique.png",
    backSprite: "assets/sprites/back/colosso-idle-unique.png",
    actionSprite: "assets/sprites/colosso-action-unique.png",
    backActionSprite: "assets/sprites/back/colosso-action-unique.png",
    runSprite: "assets/sprites/colosso-run-unique.png",
    backRunSprite: "assets/sprites/back/colosso-run-unique.png",
    runFrames: 8,
    runDisplay: { front: 143, back: 77 },
    spriteHeights: {
      front: { idle: 180, action: 180, run: 148 },
      back: { idle: 180, action: 180, run: 148 },
    },
    role: "Potenza",
    color: "#ffd54a",
    unlock: { stars: 6 },
    visual: { frame: "broad", skin: "#b06a3f", hair: "#1c130d", hairStyle: "spiked", headband: "#ffd54a", kit: "#e8b400", secondary: "#2b1e07", accent: "#ffe98a", kitStyle: "raglan", shoes: "#8a6a00", beard: true },
    desc: "Una potenza bruta che piega il vetro ad ogni impatto.",
    stats: { speed: 0.94, power: 1.32, control: 0.96, reach: 1.04, stamina: 1.04 },
    special: {
      name: "Martello a Vapore",
      cooldown: 3.2,
      desc: "Smash che fa tremare l'intera officina.",
    },
    pattern: "repeating-linear-gradient(135deg,#3a2a06 0,#3a2a06 10px,#241a04 10px,#241a04 20px)",
  },
];

export const ARENAS = [
  {
    id: "officina",
    name: "Officina a Vapore",
    desc: "Campo equilibrato, riferimento del circuito.",
    image: "assets/arenas/officina-vapore.png",
    wallBounce: 0.89,
    floorGrip: 1.0,
    palette: { floor: "#1a2840", accent: "#00e5ff", gear: "#c89000" },
  },
  {
    id: "locomotive",
    name: "Deposito Locomotive",
    desc: "Vetro più vivo, palla più veloce dopo il wall.",
    image: "assets/arenas/deposito-locomotive.png",
    wallBounce: 0.92,
    floorGrip: 0.97,
    palette: { floor: "#241818", accent: "#ffcc00", gear: "#cc2040" },
  },
  {
    id: "clockwork",
    name: "Clockwork Factory",
    desc: "Pavimento pesante, rally più lunghi.",
    image: "assets/arenas/clockwork-factory.png",
    wallBounce: 0.86,
    floorGrip: 1.06,
    palette: { floor: "#1a2038", accent: "#ff4b6e", gear: "#ffcc00" },
  },
  {
    id: "cattedrale",
    name: "Cattedrale di Vapore",
    desc: "Vetro reattivo e palla veloce: premi la precisione.",
    image: "assets/arenas/deposito-locomotive.png",
    wallBounce: 0.94,
    floorGrip: 0.95,
    unlock: { trophies: 2 },
    palette: { floor: "#101c3a", accent: "#c98bff", gear: "#5a7bff" },
  },
  {
    id: "forgia",
    name: "Forgia Abyssal",
    desc: "Grip altissimo e vetro smorzato: rally fisici e tecnici.",
    image: "assets/arenas/clockwork-factory.png",
    wallBounce: 0.83,
    floorGrip: 1.1,
    unlock: { stars: 10 },
    palette: { floor: "#241014", accent: "#ffd54a", gear: "#ff5c3a" },
  },
];

export const AI_OPPONENTS = [
  { id: "rivale", name: "Rivale del Circuito", skill: 0.46, speed: 352, power: 0.88 },
  { id: "ingegnere", name: "Ingegnere del Vapore", skill: 0.6, speed: 388, power: 0.96 },
  { id: "campione", name: "Campione Steampunk", skill: 0.76, speed: 428, power: 1.05 },
];

export const EVENT_LINES = [
  "Rimbalzo sul vetro: angolo perfetto!",
  "Combo attiva: pressione sul fondo!",
  "Lettura steampunk: palla letta al millimetro.",
  "Volée fulminea sul circuito!",
  "Smash a vapore: difesa sfondata!",
  "Wall shot: il vetro lavora per te.",
];

/**
 * Progressione carriera — sbloccabili.
 * `unlock` può richiedere `trophies` (trofei vinti) o `stars` (stelle guadagnate).
 */
/** Codice di sblocco per demo e collaudo: si inserisce dalla selezione atleti. */
export const UNLOCK_CODE = "GAPROVA";

export function isUnlocked(item, career) {
  if (!item?.unlock) return true;
  if (career?.unlockAll) return true;
  const { trophies = 0, stars = 0 } = item.unlock;
  return (career?.trophies ?? 0) >= trophies && (career?.stars ?? 0) >= stars;
}

/** Pool obiettivi di stagione / match. Ogni obiettivo ha una metrica e un target. */
export const OBJECTIVE_DEFS = {
  smashWins: { metric: "smashWinners", unit: "count" },
  noDoubleFault: { metric: "doubleFaults", unit: "max" },
  winPoints: { metric: "pointsWon", unit: "count" },
  winRally: { metric: "longestRally", unit: "count" },
  winners: { metric: "winners", unit: "count" },
  fewErrors: { metric: "errors", unit: "max" },
};

/** Obiettivi di stagione: tre per stagione, scelti deterministicamente. */
export function seasonObjectives(season) {
  const pool = [
    { id: "smashWins", target: 3 + Math.floor(season / 2) },
    { id: "winners", target: 6 + season },
    { id: "winRally", target: 8 + season },
    { id: "noDoubleFault", target: 0 },
    { id: "winPoints", target: 20 + season * 2 },
    { id: "fewErrors", target: Math.max(4, 8 - season) },
  ];
  const offset = (season - 1) % pool.length;
  return [0, 1, 2].map((i) => pool[(offset + i) % pool.length]);
}

/** Obiettivo bonus casuale per il singolo match di carriera. */
export function matchObjective(season, matchIndex) {
  const pool = [
    { id: "smashWins", target: 1 },
    { id: "winners", target: 2 },
    { id: "winRally", target: 6 },
    { id: "noDoubleFault", target: 0 },
  ];
  return pool[(season * 7 + matchIndex * 3) % pool.length];
}
