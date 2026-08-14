import assert from "node:assert/strict";

import { ATHLETES, ARENAS, ATHLETE_OUTFITS, BALANCE } from "../js/data.js?v=20260814-feedback-v38";
import { DEMO_CONTENT, demoFilter, demoLocked, IS_DEMO } from "../js/build.js?v=20260814-feedback-v38";

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

// --- si mostra, non si nasconde -------------------------------------------
//
// `demoLocked` e' la controparte di `demoFilter`: dice che un contenuto esiste
// ma la demo non lo concede, cosi' l'interfaccia lo puo' mostrare bloccato.
// Prima atleti e arene fuori demo sparivano, e la demo si contraddiceva: la
// schermata Obiettivi elencava sei atleti e nove arene, la partita ne schierava
// in campo di non selezionabili, e la griglia di scelta ne mostrava due e una.
const fuoriDemo = (item, allowed) => !allowed.includes(item.id);

const atletiEsclusi = ATHLETES.filter((a) => fuoriDemo(a, DEMO_CONTENT.athletes));
const areneEscluse = ARENAS.filter((a) => fuoriDemo(a, DEMO_CONTENT.arenas));

assert.ok(atletiEsclusi.length > 0 && areneEscluse.length > 0,
  "Se la demo contenesse tutto non ci sarebbe niente da vendere");

// `demoLocked` risponde sul contenuto, non sulla build: fuori dalla demo deve
// tacere, altrimenti bloccherebbe il gioco completo.
for (const atleta of atletiEsclusi) {
  assert.equal(demoLocked(atleta, DEMO_CONTENT.athletes), IS_DEMO,
    `demoLocked deve valere solo dentro la demo: ${atleta.id}`);
}
for (const atleta of byId(ATHLETES, DEMO_CONTENT.athletes)) {
  assert.equal(demoLocked(atleta, DEMO_CONTENT.athletes), false,
    `Un atleta della demo non puo' risultare bloccato: ${atleta.id}`);
}

// I completi sono l'unica cosa che la demo lascia conquistare davvero, perche'
// le loro sfide si vincono in partita rapida. E' il suo unico gancio a lungo
// termine: se un giorno le sfide tornassero legate alla progressione, la demo
// resterebbe senza niente da inseguire e questo assert lo direbbe.
assert.equal(DEMO_CONTENT.outfitChallenges, true,
  "La demo deve dichiarare che le sfide dei completi valgono anche qui");
let sfideDemo = 0;
for (const id of DEMO_CONTENT.athletes) {
  sfideDemo += (ATHLETE_OUTFITS[id] ?? []).filter((o) => o.challenge).length;
}
assert.ok(sfideDemo >= 6,
  `Gli atleti della demo devono avere completi da vincere: ${sfideDemo}`);

console.log(JSON.stringify({
  athletes: demoAthletes.map((a) => a.id),
  arenas: demoArenas.map((a) => a.id),
  modes: DEMO_CONTENT.modes,
  difficulty: DEMO_CONTENT.difficulty,
  shotsKept: colpiRichiesti.length,
  fullGameAthletes: ATHLETES.length,
  fullGameArenas: ARENAS.length,
  mostratiBloccati: atletiEsclusi.length + areneEscluse.length,
  sfideCompletiInDemo: sfideDemo,
}, null, 2));
