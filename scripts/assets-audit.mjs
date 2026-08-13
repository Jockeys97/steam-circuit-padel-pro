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
const orphans = onDisk.filter((p) => !referenced.includes(p));
assert.deepEqual(orphans, [],
  `Immagini attive mai referenziate: vanno in assets/_archivio/ ${orphans.join(", ")}`);

let bytes = 0;
for (const path of onDisk) bytes += (await stat(new URL(path, root))).size;

// Il peso degli asset e' il tempo di primo caricamento della demo, e la demo e'
// il motore delle wishlist: oltre questa soglia la gente se ne va prima di
// giocare.
const megabytes = bytes / (1024 * 1024);
assert.ok(megabytes < 15,
  `Gli asset attivi devono restare sotto i 15 MB: ${megabytes.toFixed(1)} MB`);

console.log(JSON.stringify({
  referenced: referenced.length,
  onDisk: onDisk.length,
  missing: missing.length,
  orphans: orphans.length,
  activeMegabytes: Number(megabytes.toFixed(1)),
}, null, 2));
