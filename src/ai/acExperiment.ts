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
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from './defaultData.js';
import { loadoutsFor, runDuelMatrix, runReferenceMatrix } from './loadoutMatrix.js';

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
interface Preset {
  ac: Record<string, number>;
  hp: Record<string, number>;
  /** Ability-slug → delta applied to EVERY 'damage' effect of that ability
   * (twin has two — a +1 here is +1 per dagger). */
  dmg?: Record<string, number>;
  /** Ability-slug → delta applied to the ability's range. */
  range?: Record<string, number>;
  /** Ability-slug → delta applied to every 'heal' effect value. */
  heal?: Record<string, number>;
  /** Ability-slug → delta applied to every apply_status durationTurns. */
  statusDur?: Record<string, number>;
}

const PRESETS: Record<string, Preset> = {
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
  // Pass 2 (owner calls, 2026-08-01): −5 locked; fighter trimmed 2 HP from
  // pass 1 (58→56); eldritch +1 (9→10 — boosted but still bottom-tier, only
  // bolt below it; unblockable + guaranteed-finisher value priced in); twin
  // +1 per dagger (9+8→10+9); arrow −1 (11→10). Freeze untouched (2-turn
  // duration stays; 1-turn would gut it per owner).
  pass2: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 1, twin: 1, arrow: -1 },
  },
  // Comparison variant: eldritch +2 (9→11, ties sword/mace) — for the owner to
  // see whether +1 is enough for warlock or +2 overshoots "low end".
  pass2b: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1 },
  },
  // Pass 3 (owner calls, 2026-08-01): pass2b base (eldritch 11) + freeze range
  // 4→3 (wizard steps into danger to deny a turn; duration sacredly 2) + ignite
  // upfront 6→4 (tick untouched — it's the GLOBAL burning constant and Firestorm
  // (26%▼) would eat the splash) + grasp root 1→2 turns (the big knob: 30%▼
  // needed real help; pull-3-into-my-team-and-hold-2 is an identity Fear lacks)
  // + First Aid 14→16.
  pass3: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: { grasp: 1 },
  },
  // Pass 4 (owner-approved bundle, 2026-08-01): grasp back to root 1 but
  // damage 4→9 (root-2 + pull feeding Whirlwind made grasp-spin 77% — the
  // smaller knob it is); cold_snap 10→7 (was a free basic attack with a
  // 1-turn freeze stapled on — the wizard outlier's real carry). Everything
  // else held from pass 3.
  pass4: {
    ac: { fighter: -5, ranger: -5, cleric: -5, wizard: -5, barbarian: -5, warlock: -5, sorcerer: -5, rogue: -5 },
    hp: { fighter: 11, barbarian: 9, rogue: 8, warlock: 8, cleric: 4, ranger: 0, wizard: 0, sorcerer: 0 },
    dmg: { eldritch: 2, twin: 1, arrow: -1, ignite: -2, grasp: 5, cold_snap: -3 },
    range: { freeze: -1 },
    heal: { second_wind: 2 },
    statusDur: {},
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

// Snapshot pristine values per ability so presets can be applied repeatedly
// without compounding.
type Eff = { type: string; value?: number; durationTurns?: number };
const BASE_DMG: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'damage').map((e) => e.value ?? 0),
  ]),
);
const BASE_RANGE: Record<string, number> = Object.fromEntries(DEFAULT_ABILITIES.map((a) => [a.slug, a.range]));
const BASE_HEAL: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'heal').map((e) => e.value ?? 0),
  ]),
);
const BASE_SDUR: Record<string, number[]> = Object.fromEntries(
  DEFAULT_ABILITIES.map((a) => [
    a.slug,
    (a.effects as Eff[]).filter((e) => e.type === 'apply_status').map((e) => e.durationTurns ?? 0),
  ]),
);

function applyPreset(p: Preset): void {
  for (const c of ALL_CLASSES) {
    DEFAULT_UNITS[c].armorClass = Math.max(7, BASE_AC[c] + (p.ac[c] ?? 0));
    DEFAULT_UNITS[c].maxHealth = BASE_HP[c] + (p.hp[c] ?? 0);
  }
  for (const a of DEFAULT_ABILITIES) {
    const dDmg = p.dmg?.[a.slug] ?? 0;
    const dHeal = p.heal?.[a.slug] ?? 0;
    const dDur = p.statusDur?.[a.slug] ?? 0;
    (a as { range: number }).range = BASE_RANGE[a.slug] + (p.range?.[a.slug] ?? 0);
    let i = 0, h = 0, d = 0;
    for (const e of a.effects as Eff[]) {
      if (e.type === 'damage') { e.value = BASE_DMG[a.slug][i] + dDmg; i++; }
      if (e.type === 'heal') { e.value = BASE_HEAL[a.slug][h] + dHeal; h++; }
      if (e.type === 'apply_status') { e.durationTurns = BASE_SDUR[a.slug][d] + dDur; d++; }
    }
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
    // Owner-requested (2026-08-01): grasp-synergy comps — warlocks drag
    // targets into bruiser range (and, with placement, into Whirlwinds).
    // Slug syntax "class:special" forces that special (default loadouts would
    // give these warlocks FEAR, which defeats the test).
    ['grasp-spin',   ['warlock:grasp', 'warlock:grasp', 'barbarian', 'barbarian']],
    ['grasp-wall',   ['warlock:grasp', 'warlock:grasp', 'fighter', 'fighter']],
  ];
  // Parse "class:special" into slugs + customizations for runSim.
  const parseComp = (team: string[]) => {
    const slugs = team.map((t) => t.split(':')[0]);
    const custs = team.map((t) => {
      const special = t.split(':')[1];
      return special ? { specialSlug: special, passiveSlug: null } : undefined;
    });
    return { slugs, custs: custs.some(Boolean) ? custs : undefined };
  };
  const wins: Record<string, { w: number; g: number }> = {};
  for (const [n] of COMPS) wins[n] = { w: 0, g: 0 };
  let errors = 0;
  for (let i = 0; i < COMPS.length; i++) {
    for (let j = i + 1; j < COMPS.length; j++) {
      const [an, a] = COMPS[i], [bn, b] = COMPS[j];
      const pa = parseComp(a), pb = parseComp(b);
      const r = runSim(pa.slugs, pb.slugs, {
        games, seed: 40000 + (delta + 10) * 977 + i * 31 + j,
        p1Customizations: pa.custs, p2Customizations: pb.custs,
      });
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

/** Stage C+D: specials/passives marginals under the active preset (duel =
 * intra-class loadout round-robin; ref = each loadout's 4-stack vs the classic
 * party). This is the within-class balance view the owner asked for in pass 2. */
function stageMarginals(duelGames: number, refGames: number): void {
  console.log(`\n──── Stage C+D: loadout marginals (duel ${duelGames}, ref ${refGames} games) ────`);
  interface M { w: number; g: number }
  const sd: Record<string, M> = {}, pd: Record<string, M> = {};
  const sr: Record<string, M> = {}, pr: Record<string, M> = {};
  const add = (m: Record<string, M>, k: string, w: number, g: number) => {
    m[k] = m[k] ?? { w: 0, g: 0 }; m[k].w += w; m[k].g += g;
  };
  for (const c of ALL_CLASSES) {
    const d = runDuelMatrix(c, duelGames, () => {});
    for (const s of d.scores) {
      add(sd, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
      add(pd, `${c}/${s.loadout.passiveSlug ?? 'none'}`, s.wins, s.games);
    }
    const r = runReferenceMatrix(c, refGames, () => {});
    for (const s of r.scores) {
      add(sr, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
      add(pr, `${c}/${s.loadout.passiveSlug ?? 'none'}`, s.wins, s.games);
    }
    console.log(`  ${c}: done`);
  }
  const wr = (m: M | undefined) => (m && m.g > 0 ? m.w / m.g : NaN);
  console.log('\n  SPECIALS (intra-class duel% | vs-classic%)  ▲≥62 ▼≤38 on duel:');
  for (const c of ALL_CLASSES) {
    const specials = loadoutsFor(c).map((l) => l.specialSlug).filter((v, i, a) => a.indexOf(v) === i);
    for (const s of specials) {
      const d = wr(sd[`${c}/${s}`]), r = wr(sr[`${c}/${s}`]);
      const mark = d >= 0.62 ? ' ▲' : d <= 0.38 ? ' ▼' : '';
      console.log(`    ${c.padEnd(10)} ${s.padEnd(14)} ${pct(d)} | ${pct(r)}${mark}`);
    }
  }
  console.log('\n  PASSIVES (intra-class duel% | vs-classic%):');
  for (const c of ALL_CLASSES) {
    const passives = loadoutsFor(c).map((l) => l.passiveSlug ?? 'none').filter((v, i, a) => a.indexOf(v) === i);
    for (const p of passives) {
      const d = wr(pd[`${c}/${p}`]), r = wr(pr[`${c}/${p}`]);
      const mark = d >= 0.62 ? ' ▲' : d <= 0.38 ? ' ▼' : '';
      console.log(`    ${c.padEnd(10)} ${p.padEnd(14)} ${pct(d)} | ${pct(r)}${mark}`);
    }
  }
}

/**
 * Stage E — systematic pair-comp scan (owner directive after grasp-spin was
 * caught only by a hand-added comp): EVERY class pair X²Y² (28), EVERY
 * specials×passives loadout combination for both classes (9×9 = 81 per pair),
 * measured vs the classic reference party. ~91k games at 40/cell — run in
 * background. Prints per-pair aggregates and flags cells ≥65% / ≤35%.
 */
function stagePairComps(games: number): void {
  console.log(`\n──── Stage E: all pair-comps × full loadout grid (${games} games/cell) ────`);
  const REF = ['barbarian', 'fighter', 'ranger', 'cleric'];
  interface Cell { pair: string; lx: string; ly: string; wr: number }
  const cells: Cell[] = [];
  const pairAgg: Record<string, { w: number; g: number }> = {};
  let errors = 0;
  for (let i = 0; i < ALL_CLASSES.length; i++) {
    for (let j = i + 1; j < ALL_CLASSES.length; j++) {
      const X = ALL_CLASSES[i], Y = ALL_CLASSES[j];
      const pair = `${X}²/${Y}²`;
      pairAgg[pair] = { w: 0, g: 0 };
      const lxs = loadoutsFor(X), lys = loadoutsFor(Y);
      for (const lx of lxs) {
        for (const ly of lys) {
          const custs = [
            { specialSlug: lx.specialSlug, passiveSlug: lx.passiveSlug },
            { specialSlug: lx.specialSlug, passiveSlug: lx.passiveSlug },
            { specialSlug: ly.specialSlug, passiveSlug: ly.passiveSlug },
            { specialSlug: ly.specialSlug, passiveSlug: ly.passiveSlug },
          ];
          const r = runSim([X, X, Y, Y], REF, {
            games,
            seed: 70000 + i * 3131 + j * 97 + lxs.indexOf(lx) * 13 + lys.indexOf(ly),
            p1Customizations: custs,
          });
          errors += r.totalValidationErrors;
          cells.push({ pair, lx: lx.label, ly: ly.label, wr: r.p1WinRate });
          pairAgg[pair].w += r.p1Wins; pairAgg[pair].g += r.games;
        }
      }
      const agg = pairAgg[pair];
      console.log(`  ${pair.padEnd(22)} mean ${pct(agg.w / agg.g)}  (81 cells done)`);
    }
  }
  console.log(`\n  validation errors: ${errors}`);
  console.log('\n  PAIR-COMP RANKING (mean over all 81 loadout cells, vs classic):');
  const rank = Object.entries(pairAgg).map(([p2, m]) => ({ p2, wr: m.w / m.g })).sort((a, b) => b.wr - a.wr);
  for (const { p2, wr } of rank) {
    const mark = wr >= 0.62 ? '  ▲ STRONG' : wr <= 0.38 ? '  ▼ WEAK' : '';
    console.log(`    ${p2.padEnd(22)} ${pct(wr)}${mark}`);
  }
  console.log('\n  OUTLIER CELLS (specific loadout combos ≥65% or ≤35%):');
  const outliers = cells.filter((c) => c.wr >= 0.65 || c.wr <= 0.35).sort((a, b) => b.wr - a.wr);
  for (const c of outliers) {
    console.log(`    ${pct(c.wr)}  ${c.pair.padEnd(22)} ${c.lx.padEnd(24)} + ${c.ly}`);
  }
  console.log(`  (${outliers.length} outlier cells of ${cells.length})`);
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
  if (STAGE === 'c' || args.includes('--marginals')) stageMarginals(16, 40);
  if (STAGE === 'e' || args.includes('--paircomps')) stagePairComps(Number(flag('cellgames') ?? 40));
} else {
  for (const delta of DELTAS) {
    applyDelta(delta);
    header(`AC DELTA ${delta >= 0 ? '+' : ''}${delta}`);
    if (STAGE === 'a' || STAGE === 'all') stageA(delta, GAMES);
    if (STAGE === 'b' || STAGE === 'all') stageB(delta, GAMES);
  }
}
// Restore pristine values (matters only if this module is ever imported).
applyPreset({ ac: {}, hp: {} }); // dmg/range/heal/statusDur omitted → restored to BASE_* inside
