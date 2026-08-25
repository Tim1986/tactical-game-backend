# GATE 1 — the CAMPAIGN_GROWTH package (for owner sign-off)

Prepared 2026-08-24 after runs 1–3b (~350k games) + the double-charge audit.
**Nothing below is implemented.** Sign, amend, or reject; §4's re-walk starts
only after this is settled and the engine freezes.

---

## 1. What the measurement changed about the plan

The stage was launched to fix a **damage tax** — the theory that enemy-HP
scaling penalises damage classes while control/sustain ride free. **Three
independent measurements say that tax does not exist**, and Fable's post-hoc
derivation says it never could: hit resolution is a fresh d20 per attack
(rulebook DGE-1), so a miss chance is a flat multiplicative toll at every
scale, with no compounding term for a sweep to find.

| run | design | verdict |
|---|---|---|
| 1–2 | cross-cell regression, 12→20 cells | slopes CONFOUNDED (scale is authored, not random) |
| 3a | fixed-k sweep | FAILED — floor trap, zero discriminating power |
| 3b set A | piloted windows, k50 metric | flat; spread 0.056 k, inside every SE |
| 3b set B | living cast, 4 campaigns | flat; ordering INCONSISTENT with A = noise |

**Therefore CAMPAIGN_GROWTH is NOT a tax refund.** Its job is the one the
owner actually asked for: the anchor architecture (arena = campaign L5) plus
**visible progression** above it. That is a FEEL number, which is why this
gate is simpler than planned.

## 2. What IS real (all mean-level, all from run 2 at n=250)

| finding | number | proposed handling |
|---|---|---|
| warlock dominance | **+14.0** ±2.4, flat across scale | ⏳ arena cross-check RUNNING — nerf only if it is dominant in arena too; otherwise it is a BRAIN finding (the AI cannot answer fear/grasp) |
| `ffh` hole | 46% vs flame_jet 94% at k=1.95 | exceptions table #1 |
| `assassinate` decay | ≤22 flat vs scaled HP (44%→29% of pool at k=1.5) | exceptions table #2 |
| `rogue:dagger_toss` | −8.2 ±2.1 (worst mean) | watch; likely fixed by encounter mix |
| ignite ×2 | ~59 dmg, stacking 7→14 | NO CHANGE — already the boss-killer; needs shine encounters, not numbers |

## 3. THE PROPOSAL

### 3a. CAMPAIGN_GROWTH — one global table, L6–L10, campaign-only

| level | party max HP | basic-attack damage | rationale |
|---|---|---|---|
| L5 | +0 | +0 | **THE ANCHOR — arena exactly. Invariant-tested.** |
| L6 | +3 | +0 | fork level; HP only, so the fork stays the story beat |
| L7 | +3 | **+1** | Deep Gift level — first damage rung |
| L8 | +6 | +1 | |
| L9 | +6 | **+2** | fork #2 |
| L10 | +9 | +2 | max level (also gains the 2nd charge) |

**Why basics, not a percentage — corrected rationale (owner, 2026-08-24).**
An earlier draft justified this partly as "it lifts the classes the tax
punished". There is no tax, and that framing was wrong anyway: a damage buff
helping the Rogue most **is the class working as designed**, not a
distortion to be defended. Owner's ruling: *"It should be expected that a
damage buff disproportionately helps Rogue, that is part of the class
design. Balance around it."*

The real reasons to put the rung on basics are: it **never touches a
special's numbers**, which is what keeps the anchor's contract clean and
invariant-testable; it rewards sustained pressure rather than inflating
alpha strike (already the strongest pattern in the game); and it scales
with attack FREQUENCY, which is precisely how the roster differentiates
itself.

**The disproportion, measured, so it is balanced around rather than
discovered later.** `+N per damage EFFECT` (same semantics as
GIFT_DAMAGE_BONUS, which already reads "+N on every damaging effect"):

| class | basic | hits | now | at +2/effect | gain |
|---|---|---|---|---|---|
| **rogue** | twin | **2** | 16 | **20** | **+25%** |
| wizard | missile | 1 | 10 | 12 | +20% |
| sorcerer | bolt | 1 | 10 | 12 | +20% |
| fighter | sword | 1 | 11 | 13 | +18% |
| cleric | mace | 1 | 11 | 13 | +18% |
| ranger | arrow | 1 | 11 | 13 | +18% |
| warlock | eldritch | 1 | 11 | 13 | +18% |
| barbarian | strike | 1 | 13 | 15 | +15% |

Rogue's edge is **+25% vs a 15–20% field** — real, intended, and modest
enough to balance around rather than engineer away. ⚠ Two riders for §4:
(a) rogue's twin is BLOCKABLE twice, so it also loses to misses twice —
part of why its measured mean sits at −2.7 despite the buff advantage;
(b) the multi-hit interaction is the reason the rung is +1/+2 rather than
larger — at +4/effect a rogue would gain +50% and the spread would stop
being a class trait and start being a balance problem.

**Why HP too.** Enemy DAMAGE is untouched by hpScale, so HP is the only
player-side counter to a longer campaign; +9 by L10 on 34–55 pools is one
extra survived hit, not a power spike.

### 3b. Exceptions table (campaign-only, above the anchor)

| ability | change | why |
|---|---|---|
| `ffh` | 14 → **18** damage, campaign L6+ | measured hole; still the ally-hitting ring, still situational |
| `assassinate` | threshold ≤22 → **≤22 or 25% of target max, whichever is higher**, campaign L6+ | flat thresholds anti-scale with the difficulty dial; keeps arena identical |

### 3c. Content rules (no engine change)

- Boss/finale encounters carry a **≥6–7 round budget** so DoT and second
  charges can deliver.
- **Counter caps ≤20% of bodies** — fix unlitbeacon (27% stalwart) and
  goblinopolis (22% immovable) during their §4 walks.
- **Portfolio rule** enforced by viabilityAudit per campaign at hard.

## 4. What this costs

Every L6+ cell in all five campaigns gets easier and must be re-walked —
already budgeted as §4's single pass. L1–L5 rows are untouched by
construction (the anchor), so roughly **half the catalog needs no work**.

## 5. Decisions needed from the owner

1. **Approve / amend the growth table** (§3a) — the FEEL call: is +2 basic
   damage and +9 HP by L10 the right sense of growth?
2. **Approve the two exceptions** (§3b) — or defer either.
3. **Warlock:** hold until the arena cross-check reports (recommended), or
   decide now.
4. Confirm the engine freezes on sign-off.
