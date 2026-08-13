import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Ogni `import { X } from "./y.js"` deve trovare davvero `X` in `y.js`.
//
// Sembra una verifica che non serve — un import rotto si vede subito. Non e'
// vero: i moduli si caricano nell'ordine delle dipendenze, e il primo che manca
// interrompe la catena. Il gioco non mostra un errore, mostra la pagina con
// nessun bottone che risponde, perche' nessun listener e' mai stato agganciato.
// E' esattamente com'e' andata: ripristinando `data.js` da un commit sono
// spariti cinque export che un'altra sessione aveva aggiunto senza committarli,
// e nessuno dei dieci audit se n'e' accorto, perche' nessuno di loro carica
// `ui.js` — che ha bisogno del DOM.
//
// Qui il DOM viene finto quanto basta a far valutare i moduli. Non si prova a
// far girare il gioco: si verifica solo che tutto si carichi e che ogni nome
// importato esista.

const root = new URL("../", import.meta.url);

function stubDom() {
  const el = () => new Proxy({
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
    dataset: {}, style: {}, hidden: false, innerHTML: "", textContent: "", value: "",
    appendChild() {}, addEventListener() {}, setAttribute() {}, replaceChildren() {},
    querySelector() { return null }, querySelectorAll() { return [] },
    getContext() {
      return new Proxy({
        canvas: { width: 960, height: 620 },
        measureText: () => ({ width: 10 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        getImageData: () => ({ data: [] }),
      }, { get: (target, key) => (key in target ? target[key] : () => {}) });
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 620 } },
  }, { get: (target, key) => (key in target ? target[key] : el()) });

  globalThis.document = {
    getElementById: () => el(), createElement: () => el(),
    querySelector: () => el(), querySelectorAll: () => [],
    documentElement: el(), body: el(), addEventListener() {},
  };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = globalThis;
  globalThis.location = { search: "", hostname: "localhost" };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  globalThis.Image = class { set src(value) {} addEventListener() {} };
  globalThis.AudioContext = class {
    constructor() { this.destination = {}; this.currentTime = 0; }
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} } } }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} }, type: "" } }
    createBuffer() { return { getChannelData: () => [] } }
    createBufferSource() { return { connect() {}, start() {} } }
  };
  Object.defineProperty(globalThis, "navigator", {
    value: { getGamepads: () => [], language: "it", vibrate() {} },
    configurable: true,
  });
}

stubDom();

const files = (await readdir(new URL("js/", root))).filter((name) => name.endsWith(".js"));
assert.ok(files.length >= 8, `Attesi almeno otto moduli, trovati ${files.length}`);

// La stringa di versione va letta dal codice, non scritta qui: `data.js` e
// `data.js?v=...` sono due moduli distinti per Node, ed e' una trappola in cui
// questo progetto e' gia' caduto tre volte.
const mainSource = await readFile(new URL("js/main.js", root), "utf8");
const versione = mainSource.match(/from "\.\/data\.js(\?v=[^"]*)"/)?.[1] ?? "";
assert.ok(versione, "Impossibile leggere la stringa di versione da main.js");

const caricati = new Map();
const errori = [];
for (const file of files) {
  try {
    caricati.set(file, await import(new URL(`js/${file}${versione}`, root)));
  } catch (error) {
    errori.push(`${file}: ${error.message}`);
  }
}
assert.deepEqual(errori, [], `Moduli che non si caricano:\n  ${errori.join("\n  ")}`);

// Ogni nome importato deve esistere nel modulo di destinazione. Il caricamento
// da solo non basta a garantirlo in ogni caso, e il messaggio d'errore di Node
// nomina un simbolo alla volta: qui si vede subito l'elenco completo.
const mancanti = [];
for (const [file, ] of caricati) {
  const source = await readFile(new URL(`js/${file}`, root), "utf8");
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"\.\/([a-z-]+\.js)[^"]*"/g)) {
    const target = caricati.get(match[2]);
    if (!target) continue;
    for (const raw of match[1].split(",")) {
      const nome = raw.trim().split(/\s+as\s+/)[0].trim();
      if (!nome) continue;
      if (!(nome in target)) mancanti.push(`${file} importa ${nome} da ${match[2]}, che non lo esporta`);
    }
  }
}
assert.deepEqual(mancanti, [], `Import che non trovano il proprio export:\n  ${mancanti.join("\n  ")}`);

// Tutti i moduli devono usare la stessa stringa di versione. Due versioni
// diverse non rompono nulla in modo visibile: creano semplicemente due istanze
// dello stesso modulo, con due `BALANCE` distinti che si tarano a vicenda.
const versioniViste = new Set();
for (const file of files) {
  const source = await readFile(new URL(`js/${file}`, root), "utf8");
  for (const match of source.matchAll(/from "\.\/[a-z-]+\.js\?v=([^"]+)"/g)) versioniViste.add(match[1]);
}
assert.equal(versioniViste.size, 1,
  `I moduli devono condividere una sola stringa di versione, trovate: ${[...versioniViste].join(", ")}`);

console.log(JSON.stringify({
  moduli: files.length,
  versione: [...versioniViste][0],
  importVerificati: mancanti.length === 0,
}, null, 2));
