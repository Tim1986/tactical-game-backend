/**
 * buildBattery.ts — [E2.0] Balance measurement by BUILD SAMPLING.
 *
 * WHY THIS REPLACES campaignSim's battery for campaign 2
 * campaignSim fights 3 fixed parties on DEFAULT loadouts (each class's first
 * special/passive). Raising --games only shrinks binomial noise around those
 * same 3 builds — it cannot tell you whether the OTHER builds are walled. With
 * the L10 ladder there are four more axes it never sweeps at all: special,
 * passive, Deep Gift, and which fork the run took.
 *
 * Exhaustive is impossible (~330 legal comps x 81 special x 625 passive x 81
 * gift x 4 fork ≈ 10^10 builds per cell), so this samples K random legal builds
 * per cell, runs G games each, and reports the DISTRIBUTION.
 *
 * ⚠ SPEND THE BUDGET ON BUILDS, NOT GAMES. Build-to-build spread is ~±30 pts
 * (measured in D2); binomial noise at G=50 is ~7 pts. Doubling K halves the
 * error on the cell's true build-space mean; doubling G barely moves it.
 *
 * Usage — two parallel shards (owner runs at most 2 jobs), then merge:
 *   npx tsx src/ai/buildBattery.ts sealed-deep --builds 100 --games 50 \
 *     --shard 0 --shards 2 --json shard0.json
 *   npx tsx src/ai/buildBattery.ts sealed-deep --builds 100 --games 50 \
 *     --shard 1 --shards 2 --json shard1.json
 *   npx tsx src/ai/buildBattery.ts --merge shard0.json shard1.json
 *
 * Sharding is by BUILD INDEX (build i goes to shard i % shards), not by cell,
 * so both shards cover every cell and a merge is a straight union of build
 * samples. Each build's RNG seed is derived from (campaign, cell, buildIndex),
 * so builds are reproducible and the two shards can never draw the same build.
 */
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';
import { makeRng } from './simHarness.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { DEEP_GIFTS, DeepGiftSlug, CampaignUnitChoice } from '../campaigns/runtime.js';
import { CampaignDifficulty, CampaignDefinition, CampaignNode } from '../campaigns/types.js';
import { DEFAULT_UNITS } from './defaultData.js';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

const DIFFICULTIES: CampaignDifficulty[] = ['easy', 'medium', 'hard', 'nightmare'];
/**
 * A campaign party is FOUR DISTINCT CLASSES — one hero plus three companions,
 * no duplicates.
 *
 * This used to read `MAX_PER_CLASS = 2` with the comment "mirrors teamService /
 * simHarness: a real player cannot field 3+ of a class". That is the ARENA
 * rule, and this harness only ever sims campaigns, so it was sampling parties
 * that cannot exist: the setup screen (mobile `app/campaign/[slug].tsx`) filters
 * the hero out of the companion grid and stores companions in a set, so a
 * duplicate class is unreachable in play.
 *
 * It mattered — only 43% of draws under the old rule were legal campaign
 * parties, so well over half of every sampled cell was measuring comps no
 * player can field, and duplicate-heavy comps (which arena work shows behave
 * very differently, e.g. warlock²+barbarian²) were dragging the distribution.
 * Any campaign balance verdict produced by this file before 2026-08-21 was
 * computed over that polluted sample and should be re-run.
 */
const PARTY_SIZE = 4;

/** A build below this is "walled" — it cannot progress, and the party is
 *  locked for the whole campaign so it cannot re-comp around the problem.
 *  Owner-accepted 2026-08-18 as a best guess: reasoned from the difficulty
 *  philosophy, NOT calibrated from play. If a WALLS verdict ever looks wrong,
 *  check the named walled builds the report prints —
 *  incoherent parties mean this cap is too tight; parties a player would
 *  actually field mean the cell really is bricking them. */
const WALL_FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.40, medium: 0.25, hard: 0.10, nightmare: 0.05,
};
/**
 * Tolerated share of sampled builds below the wall floor — SCALED BY DIFFICULTY
 * (owner call, 2026-08-18). Some builds having a rough fight is IDENTITY (the
 * comp metagame); many hitting a wall is a bug — but "many" means something
 * different at each difficulty, and a flat 15% got that wrong.
 *
 * Why it had to scale: measured across six of campaign 2's encounters, the
 * hpScale that CENTRES a nightmare mean in its 15-45% band also puts 28-64% of
 * builds under the floor. That is arithmetic, not bad content — a 30% mean over
 * a bimodal build distribution NECESSARILY leaves a large share near 0%. Under a
 * flat cap, the only way to pass nightmare was to make it not-nightmare.
 *
 * So the cap now encodes the actual design intent per difficulty:
 *  - easy/medium: strict. The party is LOCKED for the whole campaign and cannot
 *    re-comp around a wall, so a wall here is a dead run — the thing floors exist
 *    to prevent.
 *  - hard: loosened. Some comps should genuinely struggle.
 *  - nightmare: loose. The owner's bar is "only beatable with certain
 *    strategies", which literally describes a high wall share. Selectivity is
 *    the product here, not a defect. The ACCEPTANCE floor still guarantees a
 *    real subset of builds cracks every cell, so "loose" never means
 *    "unsolvable".
 */
const MAX_WALL_SHARE: Record<CampaignDifficulty, number> = {
  easy: 0.10, medium: 0.15, hard: 0.25, nightmare: 0.50,
};

export interface SampledBuild {
  slugs: string[];
  choices: CampaignUnitChoice[];
  boonKeys: string[];
  label: string;
}

/**
 * Boon-granting choice nodes a player MUST already have passed to be standing
 * at `encounterId` — i.e. the only boons that encounter's cell may hand out.
 *
 * ⚠ This exists because of a real bug (2026-08-21). `sampleBuild` used to walk
 * EVERY choice node in the campaign and apply the whole boon set to every cell,
 * so an encounter was fought with rewards from choices that happen later in the
 * story. Measured on unlitbeacon e1/nightmare/melee at L1: 43% with no boons
 * (correct), 73% with one, 88% with both — the entire gap between this tool's
 * 86% for that cell and campaignSim's 29%. `startShielded: 'all'` alone is
 * worth ~30 points at L1, where nobody has a special yet.
 *
 * A choice node counts as "before" the encounter iff it can still REACH the
 * encounter node — computed on the reversed edge set, so it is correct for
 * branching graphs and not just the linear chains the trilogy happens to use.
 * The node itself is excluded: you make a choice on the way TO a fight, and
 * its reward lands on the next one.
 */
export function boonChoicesBefore(campaign: CampaignDefinition, encounterId: string): string[][] {
  const nodes = campaign.nodes ?? {};
  const edges = (n: CampaignNode): string[] =>
    n.kind === 'choice' ? n.choices.map((c) => c.next)
      : n.kind === 'end' ? []
      : [n.next];

  // Nodes that can reach ANY node staging this encounter (BFS on reversed edges).
  const targets = Object.entries(nodes)
    .filter(([, n]) => n.kind === 'encounter' && n.encounter === encounterId)
    .map(([id]) => id);
  if (!targets.length) throw new Error(`No node stages encounter "${encounterId}" in ${campaign.slug}`);

  const back = new Map<string, string[]>();
  for (const [id, n] of Object.entries(nodes)) {
    for (const to of edges(n)) (back.get(to) ?? back.set(to, []).get(to)!).push(id);
  }
  const canReach = new Set<string>();
  const queue = [...targets];
  while (queue.length) {
    for (const prev of back.get(queue.pop()!) ?? []) {
      if (canReach.has(prev)) continue;
      canReach.add(prev);
      queue.push(prev);
    }
  }

  const out: string[][] = [];
  for (const id of canReach) {
    const n = nodes[id];
    if (n?.kind !== 'choice') continue;
    const granting = n.choices.filter((c) => c.grantBoon).map((c) => c.grantBoon!);
    if (granting.length) out.push(granting);
  }
  return out;
}

/** Draw one legal build: comp (four distinct classes), a loadout per unit, and
 *  the fork state EARNED BY THIS POINT in the story. Level gates which loadout
 *  parts exist, matching choicesForLevel; `encounterId` gates the boons. */
export function sampleBuild(rng: () => number, campaign: CampaignDefinition, level: number, encounterId: string): SampledBuild {
  const classes = Object.keys(DEFAULT_UNITS);
  const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];

  // Four distinct classes; slugs[0] is the hero, the rest are companions (the
  // order is load-bearing — choicesForLevel front-loads main + first companion).
  const slugs: string[] = [];
  while (slugs.length < PARTY_SIZE) {
    const c = pick(classes);
    if (slugs.includes(c)) continue;
    slugs.push(c);
  }

  const choices: CampaignUnitChoice[] = slugs.map((slug, i) => {
    const def = DEFAULT_UNITS[slug];
    const early = i <= 1; // main + first companion level first
    const out: CampaignUnitChoice = {};
    if (level >= (early ? 2 : 3) && def?.specialOptions?.length) out.specialSlug = pick(def.specialOptions);
    if (level >= (early ? 4 : 5) && def?.passiveOptions?.length) out.passiveSlug = pick(def.passiveOptions).slug;
    if (level >= (early ? 7 : 8)) out.deepGiftSlug = pick(Object.keys(DEEP_GIFTS) as DeepGiftSlug[]);
    return out;
  });

  // Fork state: one option from each boon-granting choice the player has
  // already reached at this point in the story (NOT the whole campaign — see
  // boonChoicesBefore). Encounters before the first fork correctly yield [].
  const boonKeys = boonChoicesBefore(campaign, encounterId).map(pick);

  const label = slugs.map((s, i) => {
    const c = choices[i];
    const bits = [c.specialSlug, c.passiveSlug, c.deepGiftSlug].filter(Boolean).join('/');
    return bits ? `${s}(${bits})` : s;
  }).join(' + ') + (boonKeys.length ? ` [${boonKeys.join(',')}]` : '');
  return { slugs, choices, boonKeys, label };
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface CellRow {
  campaign: string; encounter: string; difficulty: CampaignDifficulty; level: number;
  builds: { label: string; winRate: number }[];
}

/**
 * ACCEPTANCE — judge the GOOD teams, not the average team.
 * (Owner, 2026-08-21: "I don't care about weak teams doing poorly, I care about
 * how better teams do... if 50% of possible teams on nightmare have less than
 * 5% wins, that's fine, get good, play better teams. But there needs to be a
 * subset of good teams that can meet those percents, different demands for how
 * many of those teams need to be successful, based on difficulty level.")
 *
 * ⚠ THIS REPLACED A MEAN-IN-BAND CHECK, and the replacement is the point.
 * The old check asked whether the AVERAGE sampled build sat in a win-rate band.
 * That is the wrong question twice over: a pile of hopeless comps drags a cell
 * that is well-tuned for good comps, and the bands themselves were calibrated
 * against the mean of campaignSim's three representative parties — which,
 * measured over all 70 legal comps on unlitbeacon e1, sit at percentiles 57,
 * 26 and 19, a mean 12.3 points BELOW the true comp-space mean. Every band
 * verdict inherited that bias. Asking a question about the distribution's
 * upper half sidesteps the anchor problem entirely.
 *
 * Two bounds per cell:
 *   FLOOR   — at least `share` of sampled builds must reach win rate `target`.
 *             Weak builds failing costs the cell nothing; that IS the comp
 *             metagame. This subsumes the old nightmare solvability check
 *             (which demanded exactly one build clear 40%) by demanding a real
 *             subset instead of a single lucky draw.
 *   CEILING — the MEDIAN build must not exceed `ceiling`, or the cell is soft
 *             no matter how the good builds do. Without this, "10% of builds
 *             beat 40%" passes trivially on a fight everyone wins.
 */
const ACCEPTANCE: Record<CampaignDifficulty, { target: number; share: number; ceiling: number }> = {
  easy:      { target: 0.80, share: 0.50, ceiling: 0.95 },
  medium:    { target: 0.65, share: 0.35, ceiling: 0.80 },
  hard:      { target: 0.45, share: 0.20, ceiling: 0.65 },
  nightmare: { target: 0.40, share: 0.10, ceiling: 0.45 },
};

/**
 * EARLY-ENCOUNTER RELAXATION (owner, 2026-08-21: "for the first 2 rounds it
 * should be easier. should still require decent play, but you don't have all
 * your tools, it'll be boring to get stuck there").
 *
 * Keyed on LEVEL, not encounter index, because level is the actual cause: at
 * L1 nobody has a special, at L2 only the hero and first companion do (see
 * choicesForLevel). That covers e1-e2 in the 5-encounter trilogy and e1-e3 in
 * the 12-encounter campaigns, whose e3 is also L2.
 *
 * BOTH bounds loosen, roughly halfway to the next-easier tier. The ceiling has
 * to move too: a fight deliberately made gentler would otherwise be flagged
 * TOO EASY for complying.
 */
const ACCEPTANCE_EARLY: Record<CampaignDifficulty, { target: number; share: number; ceiling: number }> = {
  easy:      { target: 0.80, share: 0.65, ceiling: 1.00 },
  medium:    { target: 0.65, share: 0.50, ceiling: 0.90 },
  hard:      { target: 0.45, share: 0.35, ceiling: 0.80 },
  nightmare: { target: 0.40, share: 0.20, ceiling: 0.60 },
};

/** L<=2 — the party does not have its full kit yet. */
export const isEarlyEncounter = (level: number) => level <= 2;

function summarize(row: CellRow) {
  const wrs = row.builds.map((b) => b.winRate);
  const early = isEarlyEncounter(row.level);
  const { target, share, ceiling } = (early ? ACCEPTANCE_EARLY : ACCEPTANCE)[row.difficulty];
  const floor = WALL_FLOOR[row.difficulty];
  const walled = row.builds.filter((b) => b.winRate < floor);
  const mean = wrs.reduce((s, x) => s + x, 0) / wrs.length;
  const med = median(wrs);
  const best = Math.max(...wrs);
  const solveShare = wrs.filter((w) => w >= target).length / wrs.length;
  const wallShare = walled.length / wrs.length;
  const floorOk = solveShare >= share;   // enough good teams can win it
  const ceilOk = med <= ceiling;         // the typical team cannot walk it
  const wallOk = wallShare <= MAX_WALL_SHARE[row.difficulty];
  return {
    mean, med, best, min: Math.min(...wrs), wallShare, walled, early,
    target, share, ceiling, solveShare,
    floorOk, ceilOk, wallOk, ok: floorOk && ceilOk && wallOk,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
// Guarded like campaignSim: this module exports sampleBuild for reuse/testing,
// and importing it must not launch a battery.
const isMain = process.argv[1]?.endsWith('buildBattery.ts') || process.argv[1]?.endsWith('buildBattery.js');
const args = process.argv.slice(2);
const getArg = (f: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
const pct = (n: number) => (n * 100).toFixed(0).padStart(3) + '%';

function report(rows: CellRow[], header: string) {
  console.log(`\n${header}\n`);
  console.log('enc  lvl difficulty  builds  median   solve%  need   ceil  walled  verdict');
  const bad: string[] = [];
  for (const row of rows) {
    const s = summarize(row);
    // TOO HARD = not enough good teams can win it. TOO EASY = the median team
    // walks it. These are opposite fixes, so never collapse them into one flag.
    const flags = [!s.floorOk && 'TOO HARD', !s.ceilOk && 'TOO EASY', !s.wallOk && 'WALLS'].filter(Boolean).join('+');
    if (!s.ok) bad.push(`${row.encounter}/${row.difficulty}(${flags})`);
    console.log(
      `${row.encounter.padEnd(4)} L${String(row.level).padEnd(2)} ${row.difficulty.padEnd(10)} ${String(row.builds.length).padStart(6)}  ${pct(s.med)}   ${(s.solveShare * 100).toFixed(0).padStart(3)}%>=${(s.target * 100).toFixed(0)}%  ${(s.share * 100).toFixed(0).padStart(3)}%  <=${(s.ceiling * 100).toFixed(0).padStart(3)}%  ${(s.wallShare * 100).toFixed(0).padStart(3)}%  ${s.ok ? 'OK' : '⚠ ' + flags}`
      + (s.early ? '  [early]' : '')
      // A large mean/median gap means the build space is BIMODAL: the cell is
      // not "medium difficulty", it is easy for some builds and a brick wall
      // for others. Tune the brick, not the average.
      + (Math.abs(s.mean - s.med) > 0.15 ? '  ⚠ bimodal' : ''),
    );
    // The actionable output: WHICH builds are being bricked.
    if (!s.wallOk) {
      for (const w of s.walled.slice(0, 3).sort((a, b) => a.winRate - b.winRate)) {
        console.log(`       └ walled ${pct(w.winRate)}  ${w.label}`);
      }
    }
  }
  console.log(`\n${bad.length ? `⚠ ${bad.length} cell(s) failing: ${bad.join(', ')}` : '✓ every cell passes (enough good teams win it, the median team cannot walk it, no wall)'}`);
  return bad.length === 0;
}

if (isMain) {
  if (args[0] === '--merge') {
    // Skip flags AND their values — `--merge a.json b.json --json out.json`
    // must not treat the OUTPUT path as another input shard.
    const FLAGS_WITH_VALUES = new Set(['--json']);
    const files: string[] = [];
    for (let i = 1; i < args.length; i++) {
      if (args[i].startsWith('--')) { if (FLAGS_WITH_VALUES.has(args[i])) i++; continue; }
      files.push(args[i]);
    }
    if (!files.length) { console.error('Usage: --merge shard0.json shard1.json ...'); process.exit(1); }
    const byCell = new Map<string, CellRow>();
    let meta: { campaign?: string; contentHash?: string; games?: number } = {};
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(f, 'utf8')) as { meta: typeof meta; rows: CellRow[] };
      if (meta.contentHash && data.meta.contentHash !== meta.contentHash) {
        console.error(`✗ REFUSING to merge: "${f}" measured different content (${data.meta.contentHash} vs ${meta.contentHash}).`);
        console.error('  Both shards must run the SAME campaign content — re-run them from one commit.');
        process.exit(2);
      }
      meta = data.meta;
      for (const row of data.rows) {
        const k = `${row.encounter}|${row.difficulty}`;
        const cur = byCell.get(k);
        if (cur) cur.builds.push(...row.builds);
        else byCell.set(k, { ...row, builds: [...row.builds] });
      }
    }
    const rows = [...byCell.values()];
    const total = rows.reduce((s, r) => s + r.builds.length, 0);
    const ok = report(rows, `MERGED ${files.length} shard(s) — ${meta.campaign}, ${total} builds across ${rows.length} cells`);
    const out = getArg('--json');
    if (out) fs.writeFileSync(out, JSON.stringify({ meta: { ...meta, merged: files.length }, rows }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  const campaignSlug = args[0];
  if (!campaignSlug || !CAMPAIGNS[campaignSlug]) {
    console.error('Usage: npx tsx src/ai/buildBattery.ts <campaign> [--builds 100] [--games 50] [--shard 0 --shards 2] [--encounter eN] [--json out.json]');
    console.error('       npx tsx src/ai/buildBattery.ts --merge shard0.json shard1.json');
    console.error(`Known campaigns: ${Object.keys(CAMPAIGNS).join(', ')}`);
    process.exit(1);
  }
  const campaign = CAMPAIGNS[campaignSlug];
  const builds = parseInt(getArg('--builds') ?? '100', 10);
  const games = parseInt(getArg('--games') ?? '50', 10);
  const shard = parseInt(getArg('--shard') ?? '0', 10);
  const shards = parseInt(getArg('--shards') ?? '1', 10);
  const encounterIds = getArg('--encounter') ? [getArg('--encounter')!] : Object.keys(campaign.encounters);
  const difficulties = getArg('--difficulty') ? [getArg('--difficulty') as CampaignDifficulty] : DIFFICULTIES;
  const contentHash = createHash('sha1').update(JSON.stringify(campaign)).digest('hex').slice(0, 12);

  if (process.platform === 'darwin') {
    try { spawn('caffeinate', ['-i', '-w', String(process.pid)], { detached: true, stdio: 'ignore' }).unref(); }
    catch { /* proceed uncaffeinated */ }
  }

  const mine = Array.from({ length: builds }, (_, i) => i).filter((i) => i % shards === shard);
  const cells = encounterIds.length * difficulties.length;
  console.log(`${campaign.title} — shard ${shard + 1}/${shards}: ${mine.length} of ${builds} builds x ${games} games x ${cells} cells = ${(mine.length * games * cells).toLocaleString()} games`);
  console.log(`content ${contentHash}\n`);

  const rows: CellRow[] = [];
  const started = Date.now();
  for (const encounter of encounterIds) {
    const level = campaign.encounters[encounter].level;
    for (const difficulty of difficulties) {
      const out: { label: string; winRate: number }[] = [];
      for (const i of mine) {
        // Seed from (campaign, cell, buildIndex): reproducible, and shard 0 and
        // shard 1 draw disjoint build indices so they never duplicate work.
        const seed = parseInt(createHash('sha1').update(`${campaignSlug}|${encounter}|${difficulty}|${i}`).digest('hex').slice(0, 8), 16);
        const b = sampleBuild(makeRng(seed), campaign, level, encounter);
        const r = simEncounterCell(campaignSlug, encounter, difficulty, b.label, b.slugs, {
          games, level, seed, choicesOverride: b.choices, boonKeys: b.boonKeys,
        });
        out.push({ label: b.label, winRate: r.winRate });
      }
      rows.push({ campaign: campaignSlug, encounter, difficulty, level, builds: out });
      const s = summarize(rows[rows.length - 1]);
        console.log(`  ${encounter} ${difficulty.padEnd(10)} mean ${pct(s.mean)}  median ${pct(s.med)}  walls ${(s.wallShare * 100).toFixed(0)}%  ${s.ok ? '' : '⚠'}`);
    }
  }
  console.log(`\nshard done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  report(rows, `SHARD ${shard + 1}/${shards} (partial — merge with the other shard for the real verdict)`);

  const jsonPath = getArg('--json');
  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ meta: { campaign: campaignSlug, contentHash, games, builds, shard, shards }, rows }, null, 2));
    console.log(`\nJSON written: ${jsonPath}`);
  }
}
