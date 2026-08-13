import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";

// Ogni immagine citata dal codice deve esistere, e nessuna immagine attiva deve
// restare orfana. Senza questo controllo una conversione o una rinomina lascia
// un atleta senza sprite, e il gioco non protesta: `loadOptionalSprite` assegna
// il percorso e basta, un 404 diventa semplicemente un personaggio invisibile.

const root = new URL("../", import.meta.url);
const sources = [
  "index.html", "styles.css",
  "js/main.js", "js/ui.js", "js/data.js", "js/render.js",
  "js/game.js", "js/audio.js", "js/fx.js", "js/i18n.js", "js/drill.js", "js/build.js",
];

let text = "";
for (const file of sources) {
  text += await readFile(new URL(file, root), "utf8");
}

const referenced = [...new Set(text.match(/assets\/[A-Za-z0-9._/-]+\.(?:png|jpe?g|webp)/g) ?? [])];
assert.ok(referenced.length > 0, "Il codice deve referenziare delle immagini");

// Alcuni percorsi sono composti a runtime, per esempio gli outfit:
//   `assets/outfits/${athleteId}/${outfitId}/idle.webp`
// Un controllo che cerca solo stringhe letterali li dichiarerebbe orfani. Le
// radici dinamiche vengono raccolte a parte e tutto cio' che sta sotto di esse
// e' considerato referenziato.
const dynamicRoots = [...new Set(
  (text.match(/assets\/[A-Za-z0-9._/-]*(?=\$\{)/g) ?? []).map((r) => r.replace(/\/$/, "")),
)];
const coveredByRoot = (path) => dynamicRoots.some((root) => path.startsWith(`${root}/`));

const missing = [];
for (const path of referenced) {
  try {
    await stat(new URL(path, root));
  } catch {
    missing.push(path);
  }
}
assert.deepEqual(missing, [], `Immagini referenziate ma assenti: ${missing.join(", ")}`);

// Nessun PNG fra le immagini attive: sono illustrazioni, e un formato senza
// perdita costava dieci volte il necessario in banda.
const stillPng = referenced.filter((p) => p.endsWith(".png"));
assert.deepEqual(stillPng, [], `Immagini ancora in PNG: ${stillPng.join(", ")}`);

// Orfani: file presenti ma non citati da nessuna parte. L'archivio e' escluso,
// serve proprio a conservare i master fuori dal pacchetto.
async function walk(dir, acc = []) {
  for (const entry of await readdir(new URL(dir, root), { withFileTypes: true })) {
    const child = `${dir}${entry.name}${entry.isDirectory() ? "/" : ""}`;
    if (entry.isDirectory()) {
      if (entry.name === "_archivio") continue;
      await walk(child, acc);
    } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
      acc.push(child);
    }
  }
  return acc;
}

const onDisk = await walk("assets/");
const orphans = onDisk.filter((p) => !referenced.includes(p) && !coveredByRoot(p));
assert.deepEqual(orphans, [],
  `Immagini attive mai referenziate: vanno in assets/_archivio/ ${orphans.join(", ")}`);

// Da quando gli sprite si caricano alla prima richiesta, il peso su disco non
// e' piu' il peso al primo caricamento. Quello che conta per la demo — e quindi
// per le wishlist — e' cosa viene chiesto all'apertura: gli sprite base degli
// atleti che la build espone. Tutto il resto arriva quando serve.
const { ATHLETES } = await import("../js/data.js?v=20260813-standard-sprites-v29");
const { DEMO_CONTENT } = await import("../js/build.js?v=20260813-standard-sprites-v29");
const spriteFields = ["sprite", "backSprite", "actionSprite", "backActionSprite", "runSprite", "backRunSprite"];

async function weightOf(paths) {
  let total = 0;
  for (const path of paths) {
    try { total += (await stat(new URL(path, root))).size; } catch { /* assente */ }
  }
  return total / (1024 * 1024);
}

const eagerPaths = (ids) => ATHLETES
  .filter((a) => !ids || ids.includes(a.id))
  .flatMap((a) => spriteFields.map((f) => a[f]).filter(Boolean));

const demoEager = await weightOf(eagerPaths(DEMO_CONTENT.athletes));
const fullEager = await weightOf(eagerPaths(null));

let bytes = 0;
for (const path of onDisk) bytes += (await stat(new URL(path, root))).size;
const megabytes = bytes / (1024 * 1024);

// La demo e' il link che si condivide: deve agganciare in pochi secondi.
assert.ok(demoEager < 6,
  `La demo deve chiedere meno di 6 MB all'apertura: ${demoEager.toFixed(2)} MB`);
// Il gioco completo puo' permettersi di piu', ma non deve scivolare.
assert.ok(fullEager < 14,
  `Il gioco completo deve restare sotto i 14 MB all'apertura: ${fullEager.toFixed(2)} MB`);
// Guardia larga sul totale: serve solo a intercettare una crescita fuori
// controllo, non a limitare i contenuti differiti.
assert.ok(megabytes < 60,
  `Gli asset totali devono restare sotto i 60 MB: ${megabytes.toFixed(1)} MB`);

console.log(JSON.stringify({
  referenced: referenced.length,
  onDisk: onDisk.length,
  missing: missing.length,
  orphans: orphans.length,
  demoFirstLoadMb: Number(demoEager.toFixed(2)),
  fullFirstLoadMb: Number(fullEager.toFixed(2)),
  totalMb: Number(megabytes.toFixed(1)),
}, null, 2));
