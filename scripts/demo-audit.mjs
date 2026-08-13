import assert from "node:assert/strict";

import { ATHLETES, ARENAS, BALANCE } from "../js/data.js";
import { DEMO_CONTENT, demoFilter } from "../js/build.js";

// `demoFilter` guarda IS_DEMO, che fuori dal browser e' false. Qui si verifica
// il contenuto dichiarato, non il rilevamento: quello dipende dal contesto.
const byId = (list, ids) => list.filter((item) => ids.includes(item.id));

const demoAthletes = byId(ATHLETES, DEMO_CONTENT.athletes);
const demoArenas = byId(ARENAS, DEMO_CONTENT.arenas);

assert.equal(demoAthletes.length, DEMO_CONTENT.athletes.length,
  "Ogni atleta dichiarato dalla demo deve esistere davvero");
assert.equal(demoArenas.length, DEMO_CONTENT.arenas.length,
  "Ogni arena dichiarata dalla demo deve esistere davvero");

// Nessun contenuto sbloccabile nella demo: chiederebbe una progressione che la
// demo non ha, quindi resterebbe inaccessibile e sembrerebbe rotto.
for (const item of [...demoAthletes, ...demoArenas]) {
  assert.ok(!item.unlock,
    `La demo non puo' proporre contenuti sbloccabili: ${item.id}`);
}

// I due atleti devono essere agli estremi opposti, altrimenti chi prova la demo
// non capisce che gli atleti giocano davvero diversi.
const [uno, due] = demoAthletes;
const scartoControllo = Math.abs(uno.stats.control - due.stats.control);
const scartoPotenza = Math.abs(uno.stats.power - due.stats.power);
assert.ok(scartoControllo >= 0.25 && scartoPotenza >= 0.25,
  `I due atleti della demo devono essere contrapposti: controllo ${scartoControllo.toFixed(2)}, potenza ${scartoPotenza.toFixed(2)}`);

// La demo taglia la progressione, non il gioco: il repertorio resta intero.
const colpiRichiesti = [
  "smashMinHeight", "smashX2MinQuality", "smashX3MinQuality",
  "cutVolleyMinQuality", "globoMinQuality", "tightAngleReachGain",
  "viboraNetWindow",
];
for (const chiave of colpiRichiesti) {
  assert.ok(BALANCE[chiave] !== undefined,
    `La demo deve mantenere tutti i colpi: manca ${chiave}`);
}

assert.deepEqual(DEMO_CONTENT.modes, ["quick"],
  "La demo espone solo la Partita Rapida: torneo e carriera sono la progressione che si compra");
assert.equal(DEMO_CONTENT.difficulty, "medium",
  "La demo gira sulla difficolta' media: il facile sembra banale, il difficile respinge");

const filtrati = demoFilter(ATHLETES, DEMO_CONTENT.athletes);
assert.ok(filtrati.length === ATHLETES.length || filtrati.length === demoAthletes.length,
  "demoFilter deve lasciare tutto nel gioco completo o solo il consentito nella demo");

console.log(JSON.stringify({
  athletes: demoAthletes.map((a) => a.id),
  arenas: demoArenas.map((a) => a.id),
  modes: DEMO_CONTENT.modes,
  difficulty: DEMO_CONTENT.difficulty,
  shotsKept: colpiRichiesti.length,
  fullGameAthletes: ATHLETES.length,
  fullGameArenas: ARENAS.length,
}, null, 2));
