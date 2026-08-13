# Balance Grid — Methodology & Data-Quality Pitfalls

Initial question from User: This balance process has been a wild ride of a data analysis story, with great examples of wrong assumptions messing up data. Examples include: bad reference team compositions for the simulations, bad reference team placement for the simulations, looking at full aggregate numbers instead of top numbers, looking at median percentages instead of mean percentages, and today realizing the need to look at top teams to determine if passives are balanced. I'm not sure what your memory capabilities are for something like this, am I missing any?

How to run and (more importantly) how to *read* the balance grid
(`src/ai/acExperiment.ts --stage e`): 28 class pairs × 81 loadout combos =
2268 cells, each played N games against a 12-team reference panel
(`--refs fable`). Column **G = Mean Win %** is the score.

Every pitfall below actually happened during the 2026-08 rebalance and silently
corrupted — or nearly corrupted — a conclusion. The throughline: **almost every
error was trusting an aggregate or a yardstick without checking what it was made
of. The fix each time was to look one level deeper** (per-cell, per-build,
per-mechanic, per-run).

---

## 1. Analysis-lens pitfalls — how you READ the data

- **Mean, not median, per cell.** Median misreads bimodal cells (a comp that
  stomps some refs and loses to others). Use column G (Mean Win %); F (Median)
  is a trap.
- **Top-N representation, not aggregate mean.** A class's overall mean is
  polluted by junk-synergy cells (e.g. two backliners with no tank) dragging
  down its good builds. What matters is how many *strong* builds a class has —
  top-10/25/50/100 appearance counts.
- **Dedup to the *real* build before counting representation.** Keep only the
  best-passive row per (class-pair + both specials): 3×3 = 9 rows per pair →
  **252 "real builds"**. Passive-variant duplicates of one strong build
  otherwise pad the top-100 and make dead passives (e.g. Anchor) look playable
  when nobody actually runs them. Script: group by `combo|s1|s2`, keep max mean
  → `top_builds.csv`.
- **To judge PASSIVE balance, use the top-builds view + the competitiveness
  GAP.** A passive is healthy (a meta-dependent call) if it trails the best
  passive of the *same build* by only ~1–3% — even if it never tops the deduped
  chart. Gap ≈ 0 = dominant (kills counterplay → stale meta); gap > 5–6% = dead.
  We do **not** want any passive to be the strictly-best option (that kills the
  mechanics it counters, e.g. roots/pushes).
- **Correlation ≠ mechanism.** A strong two-piece cell does not mean those two
  pieces synergize. "Expose + Blizzard" topping the grid was really Opportunist
  + mass-freeze: Blizzard blankets a status on the whole enemy team, turning on
  team-wide Opportunist. Dig into the actual engine interaction before naming a
  synergy — otherwise you tune the wrong thing.

## 2. Yardstick / comparability pitfalls — what you compare AGAINST

- **Reference-team composition matters.** Weak/stale refs (e.g. the old
  barbarian/warlock whirlwind+grasp, dead at rank ~892) give a soft, misleading
  yardstick. Refs should be strong, diverse, top-~3% builds.
- **Reference-team PLACEMENT matters.** Refs must use `planPlacement()` (brain
  mode) — the same placement the sim runs — or the win rates are invalid.
- **Comparability breaks on ANY yardstick change.** Swapping the ref panel, OR
  editing the AI brain (`aiBrain.ts`), makes a new grid non-comparable to old
  ones. Only compare grids run on the SAME panel + SAME brain. Re-baseline after
  any such change.
- **Absolute win% is panel-relative.** A stronger ref panel lowers EVERY cell
  ~uniformly (overall mean fell 36 → 32 when we swapped panels). Don't misread
  the level shift as a nerf; only relative (within-grid) deltas are meaningful.

## 3. Harness / data-collection pitfalls — whether the run MEASURED anything

- **Verify the sim actually implements the rule before trusting a whole grid.**
  Near-miss: specials were feared not once-per-match because a probe read a
  nonexistent `cooldown` field; the real field is `cooldownTurns: 99`. Confirm
  end-to-end, or a whole grid can be built on nothing.
- **Smoke-test every preset/harness change on ~1 cell BEFORE the ~2h full run:**
  `--pair X,Y --cellgames 1 --dump <slugs>`. The no-preset "baseline" produced
  ZERO cells because stage E only runs inside the `--preset` branch (bare runs
  fall into an unrelated AC-delta sweep). It looked like it ran; it measured
  nothing. Use an empty `baseline` preset.
- **Delta presets double-apply once shipped.** Presets are deltas ON TOP of
  gameData. Once a change ships into gameData (e.g. the c6/c6_rogue44 chassis),
  re-running its preset stacks it again. Retire or neutralize shipped presets.
- **The sim AI can't play around mechanics it doesn't model.** Channeler
  (+damage if you didn't move) measures a *floor* — the brain won't sandbag
  movement to proc it. Automatic passives (Siphon, merged Stalwart) measure
  true; conditional-on-skilled-play ones are under-valued.
- **Long runs get App-Napped when the Mac idles.** Background `node` grid procs
  drop to ~26% duty cycle (CPU-time << elapsed) when the machine idles — it
  looks like a 4× slowdown / thermal throttle but isn't. Wrap every long grid in
  `caffeinate -i`, and launch it as ONE harness-tracked orchestrator (not
  `nohup … &` inside a foreground call, which gets reaped).

---

## Tooling quick reference

- `--refs fable` — score against the 12 shipped Fable rosters (the reference
  panel) instead of the hand-built panel.
- `--focus <class>` — fast 7-pair slice for judging one class's internal balance
  without the full 28-pair grid.
- `--part N` (1–7) — disjoint slice for checkpointing/parallelism; a pair belongs
  to the part of its alphabetically-first class.
- Per-class bonus maps: `OPPORTUNIST_BONUS_BY_CLASS` / `VENGEFUL_BONUS_BY_CLASS`
  (preset knobs `oppBonus` / `vengBonus`). Per-passive HP tax via `passiveHp`
  (same pattern as Undying's per-class HP cost).
- Merge parts: `node scripts/mergeGridParts.mjs grids/<dir>/part*.csv -o merged.csv`
- Workbook: `node scripts/buildGridXlsx.mjs merged.csv merged.xlsx`

See also `AC_REWORK.md` (the original sim-driven rebalance handoff) and
`TESTING_PLAN.md`.
