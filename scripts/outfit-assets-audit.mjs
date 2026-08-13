import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { ATHLETE_OUTFITS } from "../js/data.js?v=20260813-outfit-lossless-v21";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

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
      const generated = await sharp(outfit.sprites[key]).metadata();
      const generatedStats = await sharp(outfit.sprites[key]).stats();
      const originalPath = key === "sprite" ? `assets/sprites/${athleteId}.webp`
        : key === "backSprite" ? `assets/sprites/back/${athleteId}.webp`
          : key === "actionSprite" ? `assets/sprites/${athleteId}-action.webp`
            : key === "backActionSprite" ? `assets/sprites/back/${athleteId}-action.webp`
              : key === "runSprite" ? `assets/sprites/${athleteId}-run-v3.webp`
                : `assets/sprites/back/${athleteId}-run-v3.webp`;
      const original = await sharp(originalPath).metadata();
      const frameCount = key.toLowerCase().includes("run") ? 8 : 4;
      const expectedWidth = Math.round((original.width * 0.6) / frameCount) * frameCount;
      assert.equal(generated.width, expectedWidth, `${athleteId}/${outfit.id}/${key}: lo sprite deve essere a 0,6x`);
      assert.equal(generated.format, "webp", `${athleteId}/${outfit.id}/${key}: formato non WebP`);
      assert.equal(generatedStats.isOpaque, false, `${athleteId}/${outfit.id}/${key}: trasparenza persa`);
      dedicatedSheets += 1;
    }
  }
}

assert.equal(dedicatedSheets, 48, "La guardaroba deve avere 48 fogli sprite dedicati");
console.log(JSON.stringify({ athletes: expectedAthletes.length, outfits: 12, dedicatedSheets }, null, 2));
