# Campaign rebalance — operator brief (written by Fable, 2026-08-21)

> ## STATUS 2026-08-21 (Opus): steps 1-3 DONE. Results: `balance_runs/AUDIT_2026-08-21.md`
> - **Step 1** distinct-class sampler — done, `8110195`
> - **Step 2** boon scoping — done, `c08ceb4` + `tests/buildBatterySampling.test.ts` (22 tests)
> - **Acceptance criterion REPLACED** — owner ratified a percentile rule over the
>   old mean-in-band check; numbers now live in **`DIFFICULTY_TARGETS.md`**,
>   implemented as `ACCEPTANCE`/`ACCEPTANCE_EARLY` (`b68eae4`, `26ac03c`).
>   ⚠ That supersedes the "Acceptance (unchanged, restated)" section below.
> - **Step 3** full re-audit — done, 156 cells / ~585k games, all JSON saved.
> - **Steps 4-6 remain.** Read the audit before tuning: the campaigns need
>   OPPOSITE fixes (Sealed Deep is over-tuned; everything else is under-tuned),
>   and the prediction in the table below was confirmed exactly.

Two harness bugs were found on 2026-08-21, both in `src/ai/buildBattery.ts`,
both pushing the same direction: **they made encounters look easier than they
are for real parties**. This doc is the complete plan for re-verifying and
re-tuning every campaign. It is written for Opus to execute top to bottom.
Read this WITH `CAMPAIGN_BALANCING.md` (the operating manual — bands, levers,
smoke gates, run discipline all still apply) — this doc only says what changed,
what is tainted, and in what order to redo it.

## The two bugs

### Bug 1 — illegal duplicate-class parties (FIXED 2026-08-21, uncommitted at
time of writing — commit it before anything else)

`sampleBuild()` drew comps under `MAX_PER_CLASS = 2` — the ARENA rule. A
campaign party is **one hero + three companions, four DISTINCT classes**: the
setup screen (`mobile/app/campaign/[slug].tsx` ~line 254) filters the hero out
of the companion grid and `toggleCompanion` is a set, so a duplicate class is
unreachable in play. Only **43%** of draws under the old rule were legal
campaign parties (measured by enumeration). Worse than dilution: arena work
(`AC_REWORK.md` pass 8) shows duplicate pairs are the STRONGEST comps in the
game — warlock²+barbarian² held 74–80% through six configs and repeated nerfs.
The sampler was heavily seasoned with comps that are both illegal and
abnormally strong.

The fix (in `buildBattery.ts`, `PARTY_SIZE = 4`, distinct draw) is verified:
3,000 samples, 3,000 four-distinct-class parties. `campaignSim`'s three
representative parties were always four distinct classes — that tool never had
this bug.

### Bug 2 — unearned story boons (NOT YET FIXED — task chip
`task_11e3cf91` is pending; fix it FIRST, it is the bigger number)

`sampleBuild()` walks **all** of `campaign.nodes`, picks one granting option
per boon-granting choice node, and applies that full boon set to **every**
encounter cell. A boon granted after e6 was being applied to e1. Measured on
unlitbeacon e1/nightmare/melee, L1, 80 games:

| boons applied | win rate |
|---|---|
| none (what a real e1 party has) | **43%** |
| keepers_oilskins | 73% |
| + battlefield_arms | 88% |

`startShielded: 'all'` alone is worth ~30 points at L1. This single bug is the
entire gap between buildBattery's 86% and campaignSim's 29% on that cell.

**The fix:** boons must be per-(build, encounter), not per-build. Campaign
graphs are LINEAR chains of `next` pointers (verified on sealeddeep and
unlitbeacon), so reachability is a walk: start node → forward, collecting
boon-granting `choice` nodes encountered BEFORE the encounter node being
simmed; sample one granting option from each of those only. e.g. Sealed Deep:
e1–e6 get `[]`, e7–e9 get one boon (allegiance fork), e10+ get two.
`simEncounterCell` already accepts `boonKeys` per call — the change is confined
to how buildBattery constructs the list. Write a unit check: for each campaign,
assert the boon count per encounter is non-decreasing along the chain and zero
for every encounter before the first choice node.

### Known asymmetry in the OTHER tool (accept, don't fix now)

`campaignSim`'s battery passes NO boons at all (`campaignSim.ts:324`). That is
a conservative bias: late-campaign cells are modelled slightly harder than a
real (boon-carrying) run plays. Do not "fix" this during the rebalance — the
difficulty bands were calibrated against exactly this behaviour, and moving the
measuring stick mid-rebalance destroys comparability. Note it, leave it.

## What is tainted, what is not

| Campaign | Signed off by | Verdict status |
|---|---|---|
| Lantern, Goblinopolis, Moonberry (trilogy) | campaignSim (pre-buildBattery) | **Clean** as far as that tool sees. Both bugs are buildBattery-only. |
| The Sealed Deep | buildBattery, 4 passes to 48/48 | **TAINTED — the only campaign whose shipped tuning came from the buggy tool.** Both bugs inflated its measured win rates, so tuning drove content HARDER than intended. Prediction: over-tuned, worst on early encounters (max unearned-boon inflation) and on nightmare. |
| The Unlit Beacon | campaignSim 200g battery (`balance_runs/unlitbeacon_PASS_200g.json`) | **Clean.** The 86%-vs-29% e1 discrepancy that exposed Bug 2 was the buggy tool disagreeing with the good run, not the reverse. |
| The 2026-08-18 "trilogy is materially looser, 11/20 cells fail" audit (`CAMPAIGN_BALANCING.md` §Validation) | buildBattery | **TAINTED conclusion.** Both bugs push toward "too easy" verdicts, which is exactly what the audit found. The trilogy may be fine. Do not act on that audit; re-run it. |

## The owner's requirements for all re-testing (2026-08-21)

1. **Teams of singles.** Every simulated party is four distinct classes. No
   duplicate-class comps anywhere in campaign measurement, ever. (Sampler now
   enforces this; keep the 3,000-draw distinctness check as a regression test.)
2. **Significant build variety.** Verdicts come from build SAMPLING across the
   full loadout space — comp × special × passive × Deep Gift × fork — not from
   the 3 default-loadout representative parties. The comp space is C(8,4) = 70;
   at `--builds 150` that is ~2 samples per comp per cell, so loadout variety
   rides on top of full comp coverage. **150 builds × 25 games per cell is the
   floor for a verdict run**; spend extra budget on builds, not games
   (build-to-build spread ~±30 pts dwarfs binomial noise ~7 pts at G=25).

## Execution order

Do these in order. Each step gates the next.

1. **Commit the Bug 1 fix** (already in the working tree, `buildBattery.ts`).
2. **Fix Bug 2** (per-encounter reachable boons, above) + its unit check.
   Commit. Only now does buildBattery produce trustworthy absolute numbers.
3. **Re-audit, don't re-tune, everything first.** One full buildBattery run per
   campaign, all four difficulties, 150×25: all five campaigns. Save every
   JSON to `balance_runs/` with the content hash in the filename. THEN decide
   what needs tuning from the table of results — do not start turning knobs on
   the first bad cell. (Manual §"CENTRE EVERY NEAR-EDGE CELL IN ONE PASS"
   discipline applies at the campaign level too.)
4. **Re-tune The Sealed Deep** (near-certain to need it, direction: easier).
   Levers and process per `CAMPAIGN_BALANCING.md`; per-encounter notes and
   traps in its own balance history (git: `ee83c35..c963cf6`). Expect the
   hpScaleOverrides to come DOWN. Re-run the full battery to `RESULT: PASS`,
   save the artifact, update the campaign's notes doc.
5. **Trilogy + Unlit Beacon:** act on the step-3 audit. Unlit Beacon was
   verified clean by campaignSim four days ago, so large buildBattery
   deviations there mean re-check the harness before touching the content.
   For the trilogy, the owner has said re-tuning is not urgent ("free content
   that plays acceptably") — bring FINDINGS to the owner before changing
   shipped trilogy content.
6. **Update the docs** — `CAMPAIGN_BALANCING.md` corrections (done in the same
   commit as this file: sampler description, tainted-audit warning), the
   Sealed Deep notes, and `mobile/CAMPAIGN_ROADMAP.md` if its buildBattery
   description repeats the "max 2 per class" claim.

## Acceptance — ⚠ SUPERSEDED 2026-08-21, see `DIFFICULTY_TARGETS.md`

The mean-in-band rule below was retired the same day this doc was written. It
asked whether the AVERAGE build sat in a win-rate band; the owner's rule asks
whether enough GOOD builds clear a bar, with a median ceiling to stop a cell
being soft. Kept only so the old verdicts in git history stay readable.

### (retired) Acceptance

Per cell: **mean** win rate across sampled builds in band (easy 80–95, medium
65–80, hard 45–65, nightmare 15–45) · wall share within `MAX_WALL_SHARE`
(easy 10% / medium 15% / hard 25% / nightmare 50%, floors 40/25/10/5) ·
nightmare best sampled build ≥ 40%. Mean, not median — the bands were
calibrated on means; the mean/median gap is the bimodality signal, and
wallShare owns "how many builds are bricked". Smoke pass before every full
battery; same content hash across shards or the merge refuses.

## Traps carried forward (learned the hard way; do not relearn)

- **Cliffs**: single HP points cross one-shot thresholds and flip cells 3%↔100%
  (unlitbeacon e11, wisp 29→30 HP). If a cell teleports rather than slides as
  you move a scale, find the breakpoint before trusting any rung.
- **Scale-inert cells**: objective encounters (hold / survive / escape) can be
  flat across the whole scale range — tune STRUCTURE (bodies, positions, loss
  clocks), not scale (unlitbeacon e3/e6/e9 case law, `CAMPAIGN3_BALANCE_NOTES.md`).
- **Mechanism histograms**: after any structural change, check the win/loss
  reasons — an escort cell whose losses aren't "Your charge has fallen" isn't
  testing the escort.
- **Park mid-band**: near-edge cells flip PASS/FAIL between runs; centre them.
- **caffeinate**: long runs on this Mac App-Nap themselves to death;
  buildBattery self-caffeinates but check it survived (`ps`) before walking away.
- **A shard's verdict is not the answer**; merge first. Same content hash or
  the merge exits 2.
