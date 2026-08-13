import assert from "node:assert/strict";
import { ATHLETES, ATHLETE_OUTFITS } from "../js/data.js?v=20260813-unlockable-animation-v27";

const unlockables = ["oracolo", "colosso"];
const states = ["idle", "action", "run"];
const views = ["front", "back"];

for (const athleteId of unlockables) {
  const athlete = ATHLETES.find((candidate) => candidate.id === athleteId);
  assert.ok(athlete, `${athleteId}: atleta mancante`);
  assert.equal(athlete.runFrames, 8, `${athleteId}: la corsa deve dichiarare 8 frame`);
  if (athleteId === "colosso") {
    assert.deepEqual(athlete.runGrid?.front, { columns: 4, rows: 2 },
      "colosso/front/run: l'atlante sorgente deve essere letto come griglia 4x2");
  }
  for (const view of views) {
    for (const state of states) {
      const aspect = athlete.spriteAspect?.[view]?.[state];
      const height = athlete.spriteHeights?.[view]?.[state];
      assert.ok(Number.isFinite(aspect) && aspect > 0, `${athleteId}/${view}/${state}: proporzione visiva mancante`);
      assert.ok(Number.isFinite(height) && height > 0, `${athleteId}/${view}/${state}: altezza visiva mancante`);
    }
  }
  for (const outfit of ATHLETE_OUTFITS[athleteId]) {
    if (outfit.id === "base") continue;
    assert.ok(outfit.sprites, `${athleteId}/${outfit.id}: fogli outfit mancanti`);
  }
}

console.log(JSON.stringify({ unlockables: unlockables.length, calibratedStates: unlockables.length * views.length * states.length }, null, 2));
