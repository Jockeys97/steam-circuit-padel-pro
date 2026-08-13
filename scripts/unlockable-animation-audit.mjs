import assert from "node:assert/strict";
import sharp from "sharp";
import path from "node:path";
import { ATHLETES, ATHLETE_OUTFITS } from "../js/data.js?v=20260813-standard-sprites-v29";

const unlockables = ["oracolo", "colosso"];
const states = ["idle", "action", "run"];
const views = ["front", "back"];
const standardModels = { oracolo: "maestro", colosso: "steamer" };
const root = path.resolve(import.meta.dirname, "..");

function spritePath(athlete, view, state) {
  if (view === "back") return state === "idle" ? athlete.backSprite : state === "action" ? athlete.backActionSprite : athlete.backRunSprite;
  return state === "idle" ? athlete.sprite : state === "action" ? athlete.actionSprite : athlete.runSprite;
}

for (const athleteId of unlockables) {
  const athlete = ATHLETES.find((candidate) => candidate.id === athleteId);
  assert.ok(athlete, `${athleteId}: atleta mancante`);
  assert.equal(athlete.runFrames, 8, `${athleteId}: la corsa deve dichiarare 8 frame`);
  const standard = ATHLETES.find((candidate) => candidate.id === standardModels[athleteId]);
  assert.deepEqual(athlete.runDisplay, standard.runDisplay, `${athleteId}: scala corsa diversa dal modello standard`);
  assert.equal(athlete.runGrid, undefined, `${athleteId}: non deve richiedere griglie speciali`);
  assert.equal(athlete.spriteAspect, undefined, `${athleteId}: non deve richiedere correzioni di proporzione`);
  assert.equal(athlete.spriteHeights, undefined, `${athleteId}: non deve richiedere correzioni di altezza`);
  for (const view of views) {
    for (const state of states) {
      const actual = await sharp(path.join(root, spritePath(athlete, view, state))).metadata();
      const expected = await sharp(path.join(root, spritePath(standard, view, state))).metadata();
      assert.deepEqual(
        { width: actual.width, height: actual.height },
        { width: expected.width, height: expected.height },
        `${athleteId}/${view}/${state}: il foglio non rispetta le dimensioni del modello standard`,
      );
      const frames = state === "run" ? 8 : 4;
      assert.equal(actual.width % frames, 0, `${athleteId}/${view}/${state}: i frame non sono una striscia orizzontale regolare`);
    }
  }
  for (const outfit of ATHLETE_OUTFITS[athleteId]) {
    if (outfit.id === "base") continue;
    assert.ok(outfit.sprites, `${athleteId}/${outfit.id}: fogli outfit mancanti`);
  }
}

console.log(JSON.stringify({ unlockables: unlockables.length, standardizedStates: unlockables.length * views.length * states.length }, null, 2));
