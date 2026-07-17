/**
 * fullBalanceReport.ts — One-shot balance battery for the current gameData.
 *
 * Stages:
 *   A. Class matrix     — 4×C vs 4×D for all class pairs (class power).
 *   B. Comp battery     — archetype comps round-robin (comp power).
 *   C. Loadout duels    — per class, all 9×9 loadout pairs in 4-stack
 *                         mirrors (intra-class special/passive marginals).
 *   D. Reference runs   — per class, each loadout's 4-stack vs the classic
 *                         party (cross-class special/passive marginals).
 *
 * Findings printed at the end map to the balance questions:
 *   1/2  unplayable / too-strong classes  → stage A (+ D context)
 *   3    too-strong comps                 → stage B
 *   4/5  dominant / unplayable specials   → C+D marginals per special
 *   6/7  dominant / unplayable passives   → C+D marginals per passive
 *
 * Run: npx tsx src/ai/fullBalanceReport.ts [--fast]
 * (--fast quarters the game counts for a smoke-level pass.)
 */
export {};
//# sourceMappingURL=fullBalanceReport.d.ts.map