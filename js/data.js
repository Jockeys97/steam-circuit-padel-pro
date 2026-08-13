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
  // Lettura anticipata dello smash: chi la indovina taglia il colpo prima del
  // vetro. Legata a `skill`, non ai riflessi.
  smashInterceptBase: -0.06,
  smashInterceptSkill: 0.3,
  smashInterceptCap: 0.3,
  smashInterceptPenalty: 0.24,
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
  // Globo: doppio Y. Un globo riuscito e' altissimo e profondo e costringe la
  // coppia avversaria a indietreggiare. Uno sbagliato resta corto e alto, cioe'
  // il punteggio massimo di attaccabilita' — se ne abusi te lo smashano.
  globoTapWindow: 0.7,
  globoBufferWindow: 0.85,
  globoMinCharge: 0.55,
  globoMaxHeight: 92,
  globoMinQuality: 0.72,
  globoDepth: 218,
  globoFlightTime: 1.98,
  globoFailDepth: 118,
  globoFailFlightTime: 1.52,
  globoEnergyCost: 0.115,
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
    image: "assets/athletes/maestro.webp",
    sprite: "assets/sprites/maestro.webp",
    backSprite: "assets/sprites/back/maestro.webp",
    actionSprite: "assets/sprites/maestro-action.webp",
    backActionSprite: "assets/sprites/back/maestro-action.webp",
    runSprite: "assets/sprites/maestro-run-v3.webp",
    backRunSprite: "assets/sprites/back/maestro-run-v3.webp",
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
    image: "assets/athletes/pantera.webp",
    sprite: "assets/sprites/pantera.webp",
    backSprite: "assets/sprites/back/pantera.webp",
    actionSprite: "assets/sprites/pantera-action.webp",
    backActionSprite: "assets/sprites/back/pantera-action.webp",
    runSprite: "assets/sprites/pantera-run-v3.webp",
    backRunSprite: "assets/sprites/back/pantera-run-v3.webp",
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
    image: "assets/athletes/steamer.webp",
    sprite: "assets/sprites/steamer.webp",
    backSprite: "assets/sprites/back/steamer.webp",
    actionSprite: "assets/sprites/steamer-action.webp",
    backActionSprite: "assets/sprites/back/steamer-action.webp",
    runSprite: "assets/sprites/steamer-run-v3.webp",
    backRunSprite: "assets/sprites/back/steamer-run-v3.webp",
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
    image: "assets/athletes/fiamma.webp",
    sprite: "assets/sprites/fiamma.webp",
    backSprite: "assets/sprites/back/fiamma.webp",
    actionSprite: "assets/sprites/fiamma-action.webp",
    backActionSprite: "assets/sprites/back/fiamma-action.webp",
    runSprite: "assets/sprites/fiamma-run-v3.webp",
    backRunSprite: "assets/sprites/back/fiamma-run-v3.webp",
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
    image: "assets/athletes/oracolo.webp",
    sprite: "assets/sprites/oracolo-idle-unique.webp",
    backSprite: "assets/sprites/back/oracolo-idle-unique.webp",
    actionSprite: "assets/sprites/oracolo-action-unique.webp",
    backActionSprite: "assets/sprites/back/oracolo-action-unique.webp",
    runSprite: "assets/sprites/oracolo-run-unique.webp",
    backRunSprite: "assets/sprites/back/oracolo-run-unique.webp",
    runFrames: 8,
    runDisplay: { front: 123, back: 85 },
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
    image: "assets/athletes/colosso.webp",
    sprite: "assets/sprites/colosso-idle-unique.webp",
    backSprite: "assets/sprites/back/colosso-idle-unique.webp",
    actionSprite: "assets/sprites/colosso-action-unique.webp",
    backActionSprite: "assets/sprites/back/colosso-action-unique.webp",
    runSprite: "assets/sprites/colosso-run-unique.webp",
    backRunSprite: "assets/sprites/back/colosso-run-unique.webp",
    runFrames: 8,
    runDisplay: { front: 143, back: 77 },
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

/**
 * Media delle statistiche sul roster.
 *
 * Serve a far contare l'atleta scelto anche sulle racchette guidate dal
 * computer senza spostare la difficolta' del livello. Le statistiche degli
 * avversari entrano come rapporto rispetto a questa media, quindi l'atleta
 * medio vale esattamente 1,00: chi sceglie Il Colosso trova un avversario che
 * picchia di piu' ed e' piu' lento, ma "Difficile" resta difficile come prima.
 * Senza questa normalizzazione la scelta dell'avversario diventerebbe un
 * secondo selettore di difficolta' nascosto dentro quello vero.
 */
export const ROSTER_AVERAGE = (() => {
  const keys = ["speed", "power", "control", "reach", "stamina"];
  const media = {};
  for (const key of keys) {
    media[key] = ATHLETES.reduce((somma, a) => somma + a.stats[key], 0) / ATHLETES.length;
  }
  return media;
})();

/**
 * Completi estetici: non toccano mai statistiche, hitbox o abilita'.
 * Ogni variante punta a sei fogli dedicati, cosi' pelle, volto, capelli e
 * racchetta restano invariati in base, corsa e azioni.
 */
function outfitSpritePaths(athleteId, outfitId) {
  const root = `assets/outfits/${athleteId}/${outfitId}`;
  return {
    sprite: `${root}/idle.webp`,
    backSprite: `${root}/back-idle.webp`,
    actionSprite: `${root}/action.webp`,
    backActionSprite: `${root}/back-action.webp`,
    runSprite: `${root}/run.webp`,
    backRunSprite: `${root}/back-run.webp`,
  };
}

export const ATHLETE_OUTFITS = {
  maestro: [
    { id: "base", nameKey: "outfitBase", colors: ["#08bfe8", "#f4fbff"] },
    { id: "circuit", nameKey: "outfitCircuit", unlock: { stars: 3 }, colors: ["#315cff", "#9ef8ff"], preview: "assets/outfits/maestro/circuit-preview.webp", sprites: outfitSpritePaths("maestro", "circuit") },
    { id: "legend", nameKey: "outfitLegend", unlock: { trophies: 1, stars: 5 }, colors: ["#d5a62a", "#fff0a3"], preview: "assets/outfits/maestro/legend-preview.webp", sprites: outfitSpritePaths("maestro", "legend") },
    { id: "signature", nameKey: "outfitSignatureMaestro", unlock: { trophies: 2, stars: 8 }, colors: ["#03c7ed", "#162f61"], preview: "assets/outfits/maestro/signature-preview.webp", sprites: outfitSpritePaths("maestro", "signature") },
    { id: "mythic", nameKey: "outfitMythicMaestro", unlock: { trophies: 4, stars: 12 }, colors: ["#172f67", "#f5f1df"], preview: "assets/outfits/maestro/mythic-preview.webp", sprites: outfitSpritePaths("maestro", "mythic") },
  ],
  pantera: [
    { id: "base", nameKey: "outfitBase", colors: ["#ed3e5d", "#ff7690"] },
    { id: "circuit", nameKey: "outfitCircuit", unlock: { stars: 3 }, colors: ["#2c6fff", "#caefff"], preview: "assets/outfits/pantera/circuit-preview.webp", sprites: outfitSpritePaths("pantera", "circuit") },
    { id: "legend", nameKey: "outfitLegend", unlock: { trophies: 1, stars: 5 }, colors: ["#ffb626", "#fff0a0"], preview: "assets/outfits/pantera/legend-preview.webp", sprites: outfitSpritePaths("pantera", "legend") },
    { id: "signature", nameKey: "outfitSignaturePantera", unlock: { trophies: 2, stars: 8 }, colors: ["#d20d43", "#17151e"], preview: "assets/outfits/pantera/signature-preview.webp", sprites: outfitSpritePaths("pantera", "signature") },
    { id: "mythic", nameKey: "outfitMythicPantera", unlock: { trophies: 4, stars: 12 }, colors: ["#bd174a", "#11131c"], preview: "assets/outfits/pantera/mythic-preview.webp", sprites: outfitSpritePaths("pantera", "mythic") },
  ],
  steamer: [
    { id: "base", nameKey: "outfitBase", colors: ["#f47713", "#ff9a35"] },
    { id: "circuit", nameKey: "outfitCircuit", unlock: { stars: 3 }, colors: ["#087b86", "#c8fff5"], preview: "assets/outfits/steamer/circuit-preview.webp", sprites: outfitSpritePaths("steamer", "circuit") },
    { id: "legend", nameKey: "outfitLegend", unlock: { trophies: 1, stars: 5 }, colors: ["#e3c232", "#fff3af"], preview: "assets/outfits/steamer/legend-preview.webp", sprites: outfitSpritePaths("steamer", "legend") },
    { id: "signature", nameKey: "outfitSignatureSteamer", unlock: { trophies: 2, stars: 8 }, colors: ["#e85d16", "#252a31"], preview: "assets/outfits/steamer/signature-preview.webp", sprites: outfitSpritePaths("steamer", "signature") },
    { id: "mythic", nameKey: "outfitMythicSteamer", unlock: { trophies: 4, stars: 12 }, colors: ["#cf531c", "#29211c"], preview: "assets/outfits/steamer/mythic-preview.webp", sprites: outfitSpritePaths("steamer", "mythic") },
  ],
  fiamma: [
    { id: "base", nameKey: "outfitBase", colors: ["#a9e71d", "#d7ff4b"] },
    { id: "circuit", nameKey: "outfitCircuit", unlock: { stars: 3 }, colors: ["#326dff", "#c8ecff"], preview: "assets/outfits/fiamma/circuit-preview.webp", sprites: outfitSpritePaths("fiamma", "circuit") },
    { id: "legend", nameKey: "outfitLegend", unlock: { trophies: 1, stars: 5 }, colors: ["#f2a72b", "#fff0a7"], preview: "assets/outfits/fiamma/legend-preview.webp", sprites: outfitSpritePaths("fiamma", "legend") },
    { id: "signature", nameKey: "outfitSignatureFiamma", unlock: { trophies: 2, stars: 8 }, colors: ["#087a75", "#adf51e"], preview: "assets/outfits/fiamma/signature-preview.webp", sprites: outfitSpritePaths("fiamma", "signature") },
    { id: "mythic", nameKey: "outfitMythicFiamma", unlock: { trophies: 4, stars: 12 }, colors: ["#075c68", "#f27b18"], preview: "assets/outfits/fiamma/mythic-preview.webp", sprites: outfitSpritePaths("fiamma", "mythic") },
  ],
  oracolo: [
    { id: "base", nameKey: "outfitBase", colors: ["#6d42b8", "#a96cff"] },
    { id: "signature", nameKey: "outfitSignatureOracolo", unlock: { trophies: 3, stars: 10 }, colors: ["#38216f", "#29dfff"], preview: "assets/outfits/oracolo/signature-preview.webp", sprites: outfitSpritePaths("oracolo", "signature") },
    { id: "mythic", nameKey: "outfitMythicOracolo", unlock: { trophies: 5, stars: 14 }, colors: ["#161224", "#28d7ff"], preview: "assets/outfits/oracolo/mythic-preview.webp", sprites: outfitSpritePaths("oracolo", "mythic") },
  ],
  colosso: [
    { id: "base", nameKey: "outfitBase", colors: ["#e8b400", "#ffe98a"] },
    { id: "signature", nameKey: "outfitSignatureColosso", unlock: { trophies: 3, stars: 10 }, colors: ["#25211e", "#ff7a12"], preview: "assets/outfits/colosso/signature-preview.webp", sprites: outfitSpritePaths("colosso", "signature") },
    { id: "mythic", nameKey: "outfitMythicColosso", unlock: { trophies: 5, stars: 14 }, colors: ["#ede3c5", "#174b38"], preview: "assets/outfits/colosso/mythic-preview.webp", sprites: outfitSpritePaths("colosso", "mythic") },
  ],
};

export function outfitsForAthlete(athleteId) {
  return ATHLETE_OUTFITS[athleteId] ?? [];
}

export const ARENAS = [
  {
    id: "officina",
    name: "Officina a Vapore",
    desc: "Campo equilibrato, riferimento del circuito.",
    image: "assets/arenas/officina-vapore.webp",
    wallBounce: 0.89,
    floorGrip: 1.0,
    palette: { floor: "#1a2840", accent: "#00e5ff", gear: "#c89000" },
  },
  {
    id: "locomotive",
    name: "Deposito Locomotive",
    desc: "Vetro più vivo, palla più veloce dopo il wall.",
    image: "assets/arenas/deposito-locomotive.webp",
    wallBounce: 0.92,
    floorGrip: 0.97,
    palette: { floor: "#241818", accent: "#ffcc00", gear: "#cc2040" },
  },
  {
    id: "clockwork",
    name: "Clockwork Factory",
    desc: "Pavimento pesante, rally più lunghi.",
    image: "assets/arenas/clockwork-factory.webp",
    wallBounce: 0.86,
    floorGrip: 1.06,
    palette: { floor: "#1a2038", accent: "#ff4b6e", gear: "#ffcc00" },
  },
  {
    id: "cattedrale",
    name: "Cattedrale di Vapore",
    desc: "Vetro reattivo e palla veloce: premi la precisione.",
    image: "assets/arenas/deposito-locomotive.webp",
    wallBounce: 0.94,
    floorGrip: 0.95,
    unlock: { trophies: 2 },
    palette: { floor: "#101c3a", accent: "#c98bff", gear: "#5a7bff" },
  },
  {
    id: "forgia",
    name: "Forgia Abyssal",
    desc: "Grip altissimo e vetro smorzato: rally fisici e tecnici.",
    image: "assets/arenas/clockwork-factory.webp",
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
  // Leggenda: stessa progressione degli altri gradini (+0.14 skill, +42 velocita',
  // +0.09 potenza). Non e' un avversario che bara: reagisce in 55 ms invece che
  // in 90 e sbaglia molto meno, ma resta dentro le stesse regole.
  // `reactionSkill` tenuto a 0.78: sopra quella soglia intercetta lo smash prima
  // del vetro e annulla lo x2. La Leggenda e' piu' forte perche' sbaglia meno e
  // sceglie meglio, non perche' ha riflessi impossibili.
  { id: "leggenda", name: "Leggenda del Circuito", skill: 0.90, reactionSkill: 0.78, speed: 452, power: 1.14 },
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
/**
 * Parametri della Carriera.
 *
 * RICOSTRUITI. Questo blocco esisteva nel working tree della sessione parallela
 * e non era mai stato committato; l'ho perso ripristinando `data.js` da HEAD.
 * I nomi e la semantica sono fissati dai punti d'uso in `ui.js` e `main.js`,
 * che sono intatti, e i due valori numerici vengono dalla storia di git
 * (`const CAREER_MATCHES = 3` e `pointsToWin = 11` in main.js prima dello
 * spostamento). L'unico valore non deducibile e' CAREER_PROMOTION_WINS: con tre
 * partite a stagione, "stagione positiva ma senza trofeo" puo' solo essere due
 * vittorie. Va confermato da chi ha scritto il refactor.
 */
export const CAREER_MATCHES = 3;
export const CAREER_POINTS_TO_WIN = 11;
export const CAREER_PROMOTION_WINS = 2;

/**
 * Come si accumula ogni metrica sulla stagione. Le metriche di conteggio si
 * sommano; quelle su cui l'obiettivo pone un tetto — errori e doppi falli —
 * tengono il caso peggiore, perche' "al massimo N errori" deve valere per ogni
 * partita e non in media. Lo scambio piu' lungo e' un massimo per definizione.
 */
export const SEASON_METRIC_AGG = {
  pointsWon: "sum",
  winners: "sum",
  smashWinners: "sum",
  errors: "max",
  doubleFaults: "max",
  longestRally: "max",
};

/** Totale di stagione a zero: le stesse chiavi che produce `matchProgress`. */
export function emptySeasonProgress() {
  return Object.fromEntries(Object.keys(SEASON_METRIC_AGG).map((metric) => [metric, 0]));
}

/**
 * Ogni obiettivo dichiara la metrica e il verso (`count` da superare, `max` da
 * non superare). *Come* si aggrega sulla stagione non si scrive qui: lo dice
 * `SEASON_METRIC_AGG`, che e' l'unica fonte. Duplicarlo su questi oggetti aveva
 * gia' prodotto due tabelle in disaccordo — `errors` sommato qui e tenuto al
 * massimo la' — con il gioco che seguiva una delle due e nessuno che notasse.
 */
export const OBJECTIVE_DEFS = {
  smashWins: { metric: "smashWinners", unit: "count" },
  noDoubleFault: { metric: "doubleFaults", unit: "max" },
  winPoints: { metric: "pointsWon", unit: "count" },
  winRally: { metric: "longestRally", unit: "count" },
  winners: { metric: "winners", unit: "count" },
  fewErrors: { metric: "errors", unit: "max" },
};

/** Obiettivi di stagione: tre per stagione, scelti deterministicamente. */
export function seasonObjectives(season, { pointsToWin = CAREER_POINTS_TO_WIN, matches = CAREER_MATCHES } = {}) {
  // Punti conquistabili in una stagione, e quelli di una stagione da promozione.
  const cap = pointsToWin * matches;
  const promotionPoints = pointsToWin * CAREER_PROMOTION_WINS;
  // La richiesta cresce con le stagioni ma satura: oltre, tornerebbe impossibile.
  const step = Math.min(Math.max(season - 1, 0), 6);
  const pool = [
    { id: "smashWins", target: 4 + step },
    { id: "winners", target: Math.min(cap - 6, 10 + step) },
    { id: "winRally", target: 10 + step },
    // Questi due si misurano sul match peggiore della stagione (vedi
    // SEASON_METRIC_AGG), quindi il tetto e' quello di una partita sola: con un
    // target sopra `pointsToWin` non si potrebbero piu' fallire.
    { id: "noDoubleFault", target: Math.max(0, 2 - Math.floor(step / 3)) },
    { id: "winPoints", target: Math.min(cap - 3, promotionPoints + step) },
    { id: "fewErrors", target: Math.max(3, 8 - step) },
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

/**
 * Ultima stagione del circuito: vincerla e' il finale della carriera. Oltre si
 * gioca ancora, ma come circuito aperto — prima la carriera non finiva mai e
 * dalla stagione 5 era la Leggenda ogni volta, sempre piu' veloce.
 */
export const CAREER_FINAL_SEASON = 6;

/**
 * I quattro rivali del circuito, uno per gradino. Restano gli stessi profili di
 * `AI_OPPONENTS`: qui si aggiunge solo l'identita' che ritorna, perche' lo streak
 * raccontava un rivale che nel codice non esisteva come entita'.
 */
export function careerRival(season) {
  const index = Math.min(Math.max(season - 1, 0), AI_OPPONENTS.length - 1);
  return AI_OPPONENTS[index];
}

/**
 * Rampa di difficolta' della carriera. La crescita e' la stessa di prima, ma con
 * un tetto anche sulla velocita': skill e potenza saturavano alla stagione 4-5
 * mentre la velocita' continuava a salire senza limite (704 alla stagione 40),
 * ed e' l'unica variabile che gli audit mostrano capace di ribaltare l'esito di
 * uno scambio da sola.
 */
export const CAREER_RAMP = {
  skillCap: 0.96,
  powerCap: 1.2,
  // Il gradino piu' alto e' la Leggenda a 452: oltre +48 la difesa dello smash
  // diventa una lotteria di pixel, non una lettura.
  speedCap: 500,
  seasonGain: 0.05,
  matchGain: 0.04,
};

export function careerAiProfile(season, matchIndex) {
  const base = careerRival(season);
  const growth = Math.max(0, season - AI_OPPONENTS.length) * CAREER_RAMP.seasonGain
    + matchIndex * CAREER_RAMP.matchGain;
  return {
    ...base,
    skill: Math.min(CAREER_RAMP.skillCap, base.skill + growth),
    speed: Math.min(CAREER_RAMP.speedCap, base.speed + growth * 140),
    power: Math.min(CAREER_RAMP.powerCap, base.power + growth),
  };
}

/**
 * Calendario di stagione: ogni match ha la sua arena, invece di lasciare la
 * scelta libera e identica per tutte e tre le partite. Le arene bloccate non
 * entrano in calendario, cosi' il calendario non puo' mandarti dove non puoi
 * ancora giocare.
 */
export function careerFixture(season, matchIndex, availableArenas = ARENAS) {
  const pool = availableArenas.length ? availableArenas : ARENAS;
  const arena = pool[(season * 3 + matchIndex) % pool.length];
  return { arena, rival: careerRival(season), matchIndex, season };
}
