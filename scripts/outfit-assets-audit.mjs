import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { ATHLETE_OUTFITS } from "../js/data.js";

const expectedAthletes = ["maestro", "pantera", "steamer", "fiamma"];
const spriteKeys = ["sprite", "backSprite", "actionSprite", "backActionSprite", "runSprite", "backRunSprite"];
let dedicatedSheets = 0;

for (const athleteId of expectedAthletes) {
  const outfits = ATHLETE_OUTFITS[athleteId];
  assert.equal(outfits?.length, 3, `${athleteId}: servono base e due completi sbloccabili`);
  assert.equal(outfits[0].id, "base", `${athleteId}: il primo completo deve restare quello base`);

  for (const outfit of outfits.slice(1)) {
    assert.ok(outfit.unlock, `${athleteId}/${outfit.id}: requisito di sblocco mancante`);
    assert.ok(outfit.preview, `${athleteId}/${outfit.id}: anteprima mancante`);
    await fs.access(outfit.preview);
    for (const key of spriteKeys) {
      assert.ok(outfit.sprites?.[key], `${athleteId}/${outfit.id}: ${key} mancante`);
      await fs.access(outfit.sprites[key]);
      dedicatedSheets += 1;
    }
  }
}

assert.equal(dedicatedSheets, 48, "La guardaroba deve avere 48 fogli sprite dedicati");
console.log(JSON.stringify({ athletes: expectedAthletes.length, outfits: 12, dedicatedSheets }, null, 2));
