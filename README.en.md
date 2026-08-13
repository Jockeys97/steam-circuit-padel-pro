*[Italiano](README.md) · **English***

# Steam Circuit Padel Pro

A steampunk arcade padel game in HTML5 Canvas. Playable in the browser, no install.

**Zero dependencies**: no `package.json`, no npm, no bundler. 8,500 lines of plain
JavaScript on Canvas 2D, with a hand-written perspective projection. Audio is synthesised
at runtime through `AudioContext` — there isn't a single audio file in the project.

---

## Why this README talks about decisions

A feature list says very little about a game. What follows is the reasoning behind a
handful of balance decisions instead: what was broken, **how I measured it**, and what I
changed. Every number below comes from a runnable script, not from a hunch.

### 1. The slice dominated the flat drive

I suspected an imbalance and measured it from the baseline:

| charge | shot | speed | depth | 2nd bounce | energy |
|---|---|---|---|---|---|
| 0.5 | drive | 380 | 136 | **41** | 0.085 |
| 0.5 | slice | **393** | **144** | **22** | **0.075** |

The slice was faster, deeper, cheaper in energy **and** handed the opponent a bounce half
as high. There was no situation in which pressing drive was the right call: a dead button.

While fixing it I discovered an engine constraint I hadn't known about.
`setComputerTrajectory` solves for the velocity that lands on the target in the given
time, so **the apex is a pure function of flight time**. Slowing the slice down to make it
"pay in time" turned it into a half-lob (apex from 94 to 140).

I had to change what it trades: the slice doesn't buy time, it buys a flattened bounce by
giving up depth and pace. The flat drive stays the pressure shot.

### 2. The player could not miss

I flew the ball forward using the game's own physics to count real outcomes. Stacking
everything bad at once — terrible timing, running, sprinting, ball out to the side, energy
at the floor, ball already past the body:

| situation | quality | outcomes out of 80 |
|---|---|---|
| still, terrible timing | 0.72 | 80 in court |
| + running | 0.67 | 80 in court |
| + drained | 0.56 | 80 in court |
| + ball already past | 0.51 | 80 in court |

**480 shots, zero errors.** The cause was structural, not a tuning issue: the target is
clamped inside the court and the solver always lands on it. On top of that, the penalty
meant to shorten a bad ball triggered below quality 0.68, while the floor reachable by
timing alone was 0.72 — that branch never ran.

### 3. Threshold effects cannot be tuned

The first error model used continuous perturbations: lateral spread, a flatter arc.
Measured, it turned out to be a switch rather than a curve — either nothing happened, or
everything failed.

The same shape showed up later on the "x2" smash, whose outcome depended on an
interception race:

| return velocity | Rival | Engineer | Champion |
|---|---|---|---|
| 430 | 18.3% | 16.3% | 11.3% |
| 520 | **100%** | 28.7% | 18.8% |

Ninety points of velocity flipped the easy opponent from 18% to 100%.

The lesson, applied twice: where the outcome hinges on crossing a geometric threshold, **a
discrete decision taken once** is tunable and a continuous perturbation is not. Both the
player's errors and the x2 read now use that shape — which is also what the design
document prescribes.

### 4. The AI had no concept of an attackable ball

On a soft, high sitter at the net, 2,000 trials per difficulty, the Champion:

- smashed **20%** of the time
- **lobbed 22% of the time**, standing at the net, off a ball sitting up in front of it
- and was practically identical to the easy opponent: six points apart

Shot selection only looked at its own position, the contact height and a dice roll. Worse:
`hitBall` clamped `ball.z` to 74 **before** the decision, so a ball at 88 and one at 105
were the same object as far as the AI was concerned.

I added an attackability score (real contact height, how slow the ball is, how far forward
it can be taken) and wired it into the choice:

| | before | after |
|---|---|---|
| Rival | 14.3% | **58.7%** |
| Champion | 20.2% | **76.1%** |

Lobbing from the net off a high ball is now forbidden. The spread between difficulties
went from 6 to 17 points.

### 5. A stat that did nothing

`stats.stamina` appeared in **exactly one place** in the whole engine: special-ability
recharge. It never touched rally energy, which drives shot quality, the timing window and
the error rate.

So the character described as *"unbreakable, retrieves every point"* had one advantage: a
slightly faster special. Once stamina fed rally energy, the difference over a long rally
became real: 2.89 errors against 3.30 for the most brittle athlete.

### 6. The serve could not fail

400 trials at every charge level: **100% valid**, always. Second serve, double fault and
`serveAttempts` were unreachable code paths, even though the design document devotes a
chapter to them.

I added execution spread that grows with charge and shrinks with the athlete's control. A
half-power serve is now safe for everyone, while at full charge the Maestro (control 1.28)
faults 16.5% and never double-faults, and the Steamer (0.90) faults 36% and double-faults
8.6%.

---

## When the test harness lies

Two measurement mistakes worth telling, because they nearly led me to the wrong
conclusions.

**The pseudo-random generator.** Measuring the AI's shot selection I was getting zero
smashes out of 600 trials, with a value that *never* fell below the threshold. The flaw was
mine: I was reseeding a linear congruential generator with consecutive seeds 1, 2, 3… and
an LCG seeded that way produces correlated values that sweep a lattice instead of covering
the interval. Rewritten with a generator seeded once and a sanity check on the real code
path (mean 0.496 against an expected 0.5), the numbers changed completely.

**Module identity.** A parameter sweep kept returning the same result. The reason: the
game's modules import each other with a cache-busting query (`data.js?v=…`) and my script
imported `data.js` without one. To Node those are **two distinct modules**, so I was
mutating an object the game never read.

Both taught me to verify the instrument before the results: if a parameter doesn't move
the output, the measurement is the first suspect.

---

## The audit suite

Five runnable scripts in `scripts/`, no test framework:

```bash
node scripts/shot-quality-audit.mjs       # timing, quality, energy, speed
node scripts/shot-balance-audit.mjs       # lobs, x3, AI repertoire
node scripts/smash-input-audit.mjs        # double tap, downgrades, serve return
node scripts/difficulty-audit.mjs         # the three-difficulty ladder
node scripts/controller-tactics-audit.mjs # technical shots, movement, tactics
```

They don't check that the code runs: they check that the **balance** holds. Some assertions
are explicit design constraints — for instance that the x2 smash stays *"strong but
defendable"*, under 40% of points won. While tuning I had pushed it to 54% and that test
stopped me: it was right and I was wrong.

All tuning lives in a single `BALANCE` object in [`js/data.js`](js/data.js), so a value can
be moved without touching the logic.

---

## Architecture

| file | responsibility |
|---|---|
| `game.js` | simulation: physics, rules, AI, scoring |
| `render.js` | drawing: projection, court, characters, HUD |
| `data.js` | balance constants, athletes, arenas |
| `main.js` | game loop, input, gamepad |
| `audio.js` | procedural audio synthesis |
| `ui.js`, `i18n.js`, `fx.js`, `drill.js` | interface, languages, particles, practice |

The simulation knows nothing about the renderer: `game.js` imports nothing from
`render.js` except one maths helper. The graphics layer could be replaced without touching
a line of gameplay.

---

## Running it

Any static server will do, since the game uses ES modules:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Modules carry a version query (`?v=…`) for cache busting. **If you change one, all 23
occurrences** in `index.html` and `js/*.js` must be updated: leave them out of sync and the
browser can serve an old module alongside a new one — and an import that can't find its
export doesn't degrade, the game simply won't start.

```bash
grep -c "20260813-intercept-v17" index.html js/*.js styles.css   # must total 23
```

---

## Controls

Keyboard and gamepad. On a controller: **A** drive, **X** slice/víbora, **Y** lob, **B**
special, **LB** switch player, **RB** technical modifier, **LT** split-step, **RT** sprint
— and, while charging a shot, **RT** becomes the tight angle: it pulls the target towards
the glass and sharpens execution, but adds an irreducible spread that turns the shot into a
deliberate gamble.

## Status

Playable alpha. Two unlockable athletes are still missing their artwork and are drawn
procedurally in the meantime.
