/**
 * acExperiment.ts — AC-reduction rebalance sims (owner directive 2026-08-01:
 * "most attacks should be hitting"; cut every unit's AC by ~4–5 and rebalance).
 *
 * Applies AC deltas IN MEMORY to DEFAULT_UNITS/UNIT_DEFS before running the
 * class matrix + comp battery. Ships NO value changes — this is the tool for
 * the iterative rebalance passes. The AI brain needs no changes for AC shifts:
 * it imports the engine's missChanceOf and reads AC off unit instances.
 *
 * Hit math (engine): miss = (AC−6)·5% → hit = (26−AC)·5%.
 *   Current ACs 13–17 → hit 45–65%. Flat −4 → 65–85%. Flat −5 → 70–90%.
 *
 * Run: npx tsx src/ai/acExperiment.ts [--delta -4] [--games 60] [--stage a|b|all]
 *      npx tsx src/ai/acExperiment.ts --baseline          (delta 0)
 *      npx tsx src/ai/acExperiment.ts --sweep             (0, -3, -4, -5)
 */
import { runSim } from './simHarness.js';
import { DEFAULT_UNITS } from './defaultData.js';

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const GAMES = Number(flag('games') ?? 60);
const STAGE = flag('stage') ?? 'all';
const SWEEP = args.includes('--sweep');
const DELTAS = SWEEP ? [0, -3, -4, -5] : [args.includes('--baseline') ? 0 : Number(flag('delta') ?? -4)];

const ALL_CLASSES = Object.keys(DEFAULT_UNITS);
const pct = (x: number) => (x * 100).toFixed(0).padStart(3) + '%';
const hit = (ac: number) => Math.min(1, Math.max(0, 1 - (ac - 6) * 0.05));

// Snapshot pristine stats once so sweep iterations don't compound.
const BASE_AC: Record<string, number> = Object.fromEntries(
  ALL_CLASSES.map((c) => [c, DEFAULT_UNITS[c].armorClass]),
);
const BASE_HP: Record<string, number> = Object.fromEntries(
  ALL_CLASSES.map((c) => [c, DEFAULT_UNITS[c].maxHealth]),
);

/**
 * Named proposal presets for the iterative rebalance passes (owner directive:
 * AC down ~4–5 across the board; HP buffs — "not too much, but somewhat" — are
 * the sanctioned compensation lever, weighted toward the classes whose
 * durability identity the flat AC cut compresses hardest, i.e. the tanks).
 * Run: npx tsx src/ai/acExperiment.ts --preset <name>
 * Edit freely between passes — this table IS the working document.
 */
const PRESETS: Record<string, { ac: Record<string, number>; hp: Record<string, number> }> = {
  // Pass 1 draft, informed by the flat sweep (scratchpad ac_sweep.log,
  // 2026-08-01): the sweep's dominant distortion is RANGED vs MELEE, not
  // tank vs squishy — closing distance now costs real HP (approach turns eat
  // reliable hits), while ranged classes never pay that toll (ranger 74%,
  // snipe comp 83% at flat −5; fighter 23%, warlock 25%). So HP compensation
  // skews toward the classes that must walk into the fight; the ranged
  // winners get NOTHING. Warlock's collapse is value-loss (unblockable is
  // worth little when everything hits) — HP softens it here; pass 2 likely
  // owes it a damage/effect look.
  pass1: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 13, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
  },
};

function applyDelta(delta: number): void {
  for (const c of ALL_CLASSES) {
    // Floor at 7: below 6 the formula is a guaranteed hit and negative-miss
    // territory; 7 keeps at least a 5% whiff so "attack roll" stays meaningful.
    DEFAULT_UNITS[c].armorClass = Math.max(7, BASE_AC[c] + delta);
    DEFAULT_UNITS[c].maxHealth = BASE_HP[c];
  }
}

function applyPreset(p: { ac: Record<string, number>; hp: Record<string, number> }): void {
  for (const c of ALL_CLASSES) {
    DEFAULT_UNITS[c].armorClass = Math.max(7, BASE_AC[c] + (p.ac[c] ?? 0));
    DEFAULT_UNITS[c].maxHealth = BASE_HP[c] + (p.hp[c] ?? 0);
  }
}

function header(label: string): void {
  console.log(`\n████████ ${label} ████████`);
  console.log('  class      AC  hit%   HP   ~EHP');
  for (const c of ALL_CLASSES) {
    const ac = DEFAULT_UNITS[c].armorClass;
    const hp = DEFAULT_UNITS[c].maxHealth;
    const ehp = hp / hit(ac);
    console.log(`  ${c.padEnd(10)} ${String(ac).padStart(2)}  ${pct(hit(ac))}  ${String(hp).padStart(3)}  ${ehp.toFixed(0).padStart(4)}`);
  }
}

function stageA(delta: number, games: number): void {
  console.log(`\n──── Stage A: class matrix (${games} games/pair) ────`);
  const wins: Record<string, { w: number; g: number }> = {};
  for (const c of ALL_CLASSES) wins[c] = { w: 0, g: 0 };
  let errors = 0, turnsSum = 0, cells = 0;
  for (let i = 0; i < ALL_CLASSES.length; i++) {
    for (let j = i + 1; j < ALL_CLASSES.length; j++) {
      const a = ALL_CLASSES[i], b = ALL_CLASSES[j];
      const fill = ['fighter', 'cleric', 'barbarian', 'ranger']
        .filter((c) => c !== a && c !== b).slice(0, 2);
      // Seed offset by delta so variants don't share RNG streams.
      const r = runSim([a, a, ...fill], [b, b, ...fill], { games, seed: 9000 + (delta + 10) * 971 + i * 31 + j });
      errors += r.totalValidationErrors;
      turnsSum += r.avgTurns; cells++;
      wins[a].w += r.p1Wins; wins[a].g += r.games;
      wins[b].w += r.p2Wins; wins[b].g += r.games;
    }
  }
  const rank = ALL_CLASSES.map((c) => ({ c, wr: wins[c].w / wins[c].g })).sort((x, y) => y.wr - x.wr);
  console.log(`  avg turns/game: ${(turnsSum / cells).toFixed(1)}   validation errors: ${errors}`);
  for (const { c, wr } of rank) {
    const mark = wr >= 0.62 ? '  ▲ STRONG' : wr <= 0.38 ? '  ▼ WEAK' : '';
    console.log(`    ${c.padEnd(10)} ${pct(wr)}${mark}`);
  }
}

function stageB(delta: number, games: number): void {
  console.log(`\n──── Stage B: comp battery (${games} games/pair) ────`);
  const COMPS: [string, string[]][] = [
    ['classic',      ['barbarian', 'fighter', 'ranger', 'cleric']],
    ['double-rogue', ['rogue', 'rogue', 'sorcerer', 'sorcerer']],
    ['bruiser-wall', ['fighter', 'fighter', 'barbarian', 'barbarian']],
    ['full-caster',  ['wizard', 'sorcerer', 'warlock', 'cleric']],
    ['skirmish',     ['rogue', 'rogue', 'ranger', 'ranger']],
    ['heal-tank',    ['fighter', 'fighter', 'cleric', 'cleric']],
    ['control',      ['wizard', 'wizard', 'warlock', 'warlock']],
    ['snipe',        ['ranger', 'ranger', 'wizard', 'wizard']],
    ['rogue-heal',   ['rogue', 'rogue', 'cleric', 'cleric']],
  ];
  const wins: Record<string, { w: number; g: number }> = {};
  for (const [n] of COMPS) wins[n] = { w: 0, g: 0 };
  let errors = 0;
  for (let i = 0; i < COMPS.length; i++) {
    for (let j = i + 1; j < COMPS.length; j++) {
      const [an, a] = COMPS[i], [bn, b] = COMPS[j];
      const r = runSim(a, b, { games, seed: 40000 + (delta + 10) * 977 + i * 31 + j });
      errors += r.totalValidationErrors;
      wins[an].w += r.p1Wins; wins[an].g += r.games;
      wins[bn].w += r.p2Wins; wins[bn].g += r.games;
    }
  }
  const rank = COMPS.map(([n]) => ({ n, wr: wins[n].w / wins[n].g })).sort((x, y) => y.wr - x.wr);
  console.log(`  validation errors: ${errors}`);
  for (const { n, wr } of rank) {
    const mark = wr >= 0.68 ? '  ▲ STRONG' : wr <= 0.32 ? '  ▼ WEAK' : '';
    console.log(`    ${n.padEnd(13)} ${pct(wr)}${mark}`);
  }
}

const presetName = flag('preset');
if (presetName) {
  const preset = PRESETS[presetName];
  if (!preset) {
    console.error(`Unknown preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}`);
    process.exit(1);
  }
  applyPreset(preset);
  header(`PRESET ${presetName}`);
  if (STAGE === 'a' || STAGE === 'all') stageA(1, GAMES);
  if (STAGE === 'b' || STAGE === 'all') stageB(1, GAMES);
} else {
  for (const delta of DELTAS) {
    applyDelta(delta);
    header(`AC DELTA ${delta >= 0 ? '+' : ''}${delta}`);
    if (STAGE === 'a' || STAGE === 'all') stageA(delta, GAMES);
    if (STAGE === 'b' || STAGE === 'all') stageB(delta, GAMES);
  }
}
// Restore pristine values (matters only if this module is ever imported).
applyDelta(0);
