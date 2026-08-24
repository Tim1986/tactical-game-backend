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

> **Win rate is nearly useless for predicting how a fight FEELS.**

Three encounters, one campaign, played in order by the owner. The measured
numbers span **nine points**; the felt difficulty runs backwards through them:

| played | measured (mean) | owner's verdict | felt |
|---|---|---|---|
| **e1** — L1, `noSpecials`, kill-all | **78%** | *"Won by a very narrow margin… about the level I would expect of HARD for a first encounter."* | ✗ too hard |
| **e2** — L2, specials, kill-all + waves | **72%** | *"Felt reasonable… a little on the hard end of medium, but it was fine. Fun fight."* | hard end of OK |
| **e3** — L2, specials, HOLD two bridgeheads | **69%** | *"Felt like a good difficulty… on the easier end of medium."* | easy end of OK |

**The order of the measurements is the exact REVERSE of the order of the
feelings.** The easiest cell on paper was the only one rejected; the hardest
cell on paper felt the most comfortable. Two separate causes, and both are
things the battery cannot see:

1. **TOOLS (e1 → e2).** At L1 with `noSpecials` the party has basic attacks
   and nothing else, so a fight is a grind with no decisions in it. At L2 half
   the party has specials, and the same win rate becomes a fight you are
   *playing* rather than *waiting out*.
2. **WIN CONDITION (e2 → e3).** A kill-all with reinforcements gives the player
   no visible progress — bodies keep arriving and the finish line is wherever
   the last one dies. A `hold`/`survive` objective has a clock the player can
   watch and ground they chose; it reads as controlled even while measuring
   harder.

**Consequences, all now enforced in content:**

1. **The e1 tutorial exemption is about missing TOOLS, not about difficulty.**
   Every campaign's first encounter is calibrated to ~85% mean / ~90% median at
   easy and medium (see CAMPAIGNS.md §Balancing). It does NOT extend to e2+.
2. **The acceptable early-medium window is ~69–72% mean** — the owner has
   played both ends and named them. It is a THREE POINT window, which is well
   inside battery noise (±5 at 150 builds): do not pretend to tune inside it.
3. **Objective fights can run harder on paper than kill-alls** and still feel
   fair. When a kill-all and a hold measure the same, the kill-all is the
   harder experience.

⚠ When judging any early cell, look past the verdict at the SHAPE of the fight:
whether the party has specials yet · what the win condition is (visible
progress or not) · enemy AC (+1 = 5% more of your swings wasted) · identical
enemies sharing damage breakpoints · terrain funnels.

---

## Ledger

Add newest first. "Measured" = mean win rate from `calibrate.ts` at the scale
the owner actually played, ≥80 builds × 25 games.

| date | campaign / enc | level | diff | scale played | measured | owner verdict | action taken |
|---|---|---|---|---|---|---|---|
| 2026-08-24 | unlitbeacon e3 (hold) | L2 | medium | 0.65 | 69% mean · 72% median · 5% walls | *"Felt like a good difficulty… on the easier end of medium."* | **No change.** Sets the floor of the acceptable early-medium window. |
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
