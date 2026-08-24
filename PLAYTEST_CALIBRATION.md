# PLAYTEST_CALIBRATION.md — owner-played encounters vs. what the sim measured

**Why this file exists.** The battery measures WIN RATE. It cannot measure
grind, agency, or whether a fight was fun. Every entry below pairs a
**measured number** with the **owner's verbatim verdict after actually playing
it**, so the bands can be corrected by ground truth instead of re-argued from
first principles each time.

**Read this before tuning any early-campaign cell**, and **add a row every time
the owner reports on a fight he played.** The measurement must be taken at the
scale he actually played, or the row is worthless.

Linked from `CAMPAIGNS.md` (§Balancing) and `CAMPAIGN_BALANCING.md`.

---

## The headline finding (2026-08-24)

> **A win rate does not tell you how a fight FEELS. What the party can DO does.**

Two encounters, same campaign, played back to back by the owner:

| played | measured (mean) | owner's verdict |
|---|---|---|
| unlitbeacon **e1** — L1, `noSpecials` | **78%** | *"I won by a very narrow margin… this is about the level I would expect of HARD for a first encounter."* |
| unlitbeacon **e2** — L2, specials unlocked | **72%** | *"This felt reasonable. Maybe a little on the hard end of medium… but it was fine. Fun fight."* |

**e2 measures six points HARDER and felt BETTER.** The variable is not
difficulty — it is that at L2 the party has specials and therefore choices. A
level-1 party with basic attacks only, grinding down AC-12 enemies, experiences
the same win rate as a slog.

**Consequences, both now enforced in content:**

1. **The e1 tutorial exemption is about missing TOOLS, not about difficulty.**
   Every campaign's first encounter is calibrated to ~85% mean / ~90% median at
   easy and medium (see CAMPAIGNS.md §Balancing). It does not extend to e2+.
2. **~72% mean is the measured CEILING for an early-campaign medium cell.**
   The owner has played a 72% cell and called it the hard end of acceptable.
   Anything early measuring below that is above his stated tolerance.

⚠ When judging any tutorial or early cell, look past the verdict at the SHAPE
of the fight: enemy AC (+1 = 5% more of your swings wasted), identical enemies
sharing damage breakpoints, terrain funnels, and above all **whether the party
has specials yet.**

---

## Ledger

Add newest first. "Measured" = mean win rate from `calibrate.ts` at the scale
the owner actually played, ≥80 builds × 25 games.

| date | campaign / enc | level | diff | scale played | measured | owner verdict | action taken |
|---|---|---|---|---|---|---|---|
| 2026-08-24 | unlitbeacon e2 | L2 | medium | 1.00 | 72% mean · 76% median · 4% walls | *"Felt reasonable. Maybe a little on the hard end of medium, wouldn't want a medium to feel much harder than that at level 2, but it was fine. Fun fight."* | **No change.** Recorded as the early-medium ceiling. |
| 2026-08-24 | unlitbeacon e1 | L1 | medium | 1.25 | 78% mean · 80% median · 3% walls | *"Won by a very narrow margin. The calibration for medium on a level 1 scenario, no specials at this point, is off. Too hard for this level — about the level I would expect of HARD for a first encounter."* | medium 1.25 → **1.12** (88% mean). Exemption then applied to all five campaigns' e1. |

### Cross-checks run off these rows

**All five e1s at medium** (the exemption sweep, 80 builds × 25 games) — every
one sat in the same 71–78% zone the owner rejected, and all five were retuned:
lantern 1.20→1.00, goblinopolis 1.46→1.32, moonberry 1.26→1.08,
sealeddeep 1.18→1.06, unlitbeacon 1.25→1.12. Full table in CAMPAIGNS.md.

**All five e2s at medium**, checked against the 72% ceiling — nothing exceeds
it, so no action:

| campaign | scale | measured mean | vs ceiling |
|---|---|---|---|
| lantern | 1.44 | 82% | comfortably inside (reads TOO EASY vs the general band) |
| goblinopolis | 1.30 | 74% | inside |
| moonberry | 1.45 | 73% | inside (14% walls — watch it) |
| sealeddeep | 0.90 | 71% | at the line |
| unlitbeacon | 1.00 | 72% | **the reference row** |

---

## How to add a row

1. Get the verdict verbatim — paraphrase loses the signal ("narrow margin",
   "fun", "slog" are the data).
2. Read the scale actually played from the campaign file at that commit.
3. `npx tsx src/ai/calibrate.ts <campaign> <enc> <difficulty> <scale> --builds 80 --games 25`
4. Add the row, then ask what it implies for the same encounter INDEX across
   every other campaign — the e1 sweep found a catalog-wide problem from a
   single report, and that is the main value of this file.
