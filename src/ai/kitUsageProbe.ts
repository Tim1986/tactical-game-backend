/**
 * kitUsageProbe.ts — does the brain actually CAST a campaign's enemy kits?
 *
 * A special the brain never uses is dead content: it shows on the intro
 * card, costs the designer a balance pass, and changes nothing on the board.
 * campaignSim reports outcomes, not casts, so this mirrors its setup and
 * tallies every enemy USE_ABILITY by slug across G games per encounter.
 *
 *   npx tsx src/ai/kitUsageProbe.ts <campaign> [--difficulty medium] [--games 20] [--encounter eN]
 */
import { CAMPAIGNS } from '../campaigns/index.js';
import { buildEncounterState } from '../campaigns/runtime.js';
import type { CampaignDifficulty } from '../campaigns/types.js';
import { REPRESENTATIVE_PARTIES, choicesForLevel } from './campaignSim.js';
import { frontlineOrder } from './simPlacement.js';
import { buildAbilityMap } from './defaultData.js';
import { applyCooldownOverrides, applyCampaignAbilities, applyCampaignAbilityTuning } from '../game/abilityOverrides.js';
import { OptimalBrain } from './aiBrain.js';
import { processTurn } from '../game/turnProcessor.js';
import type { MatchState } from '../types/matchState.js';
import type { BoardPosition } from '../types/matchState.js';

const HUMAN = 'p1', ENEMY = 'p2';
const getArg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const slug = process.argv[2];
const campaign = CAMPAIGNS[slug];
if (!campaign) { console.error('usage: kitUsageProbe <campaign> [--difficulty d] [--games N] [--encounter eN]'); process.exit(1); }
const difficulty = (getArg('--difficulty') ?? 'medium') as CampaignDifficulty;
const games = parseInt(getArg('--games') ?? '20', 10);
const encs = getArg('--encounter') ? [getArg('--encounter')!] : Object.keys(campaign.encounters);
const TURN_CAP = 400;

console.log(`${campaign.title} — enemy kit usage @ ${difficulty}, ${games} games x ${Object.keys(REPRESENTATIVE_PARTIES).length} parties per encounter\n`);
for (const encId of encs) {
  const enc = campaign.encounters[encId];
  const level = enc.level;
  const casts: Record<string, number> = {};
  const present: Record<string, number> = {}; // enemy-name → instances seen
  let turnsTotal = 0, gamesRun = 0;
  let map = buildAbilityMap();
  for (const [, partySlugs] of Object.entries(REPRESENTATIVE_PARTIES)) {
    const choices = choicesForLevel(partySlugs, level);
    const placement = frontlineOrder(partySlugs, enc.playerPlacement,
      (enc as { enemyPlacement?: BoardPosition[]; rooms?: { enemyPlacement?: BoardPosition[] }[] }).enemyPlacement ?? enc.rooms?.[0]?.enemyPlacement ?? []);
    const probe = buildEncounterState(campaign, encId, partySlugs, choices, level, difficulty, HUMAN, ENEMY, undefined, undefined, undefined, placement);
    map = applyCampaignAbilityTuning(applyCooldownOverrides(applyCampaignAbilities(buildAbilityMap(), probe.campaignAbilities), probe.cooldownOverrides), level);
    const b1 = new OptimalBrain(), b2 = new OptimalBrain();
    for (let g = 0; g < games; g++) {
      let state: MatchState = buildEncounterState(campaign, encId, partySlugs, choices, level, difficulty, HUMAN, ENEMY, undefined, undefined, undefined, placement).state;
      for (const u of state.units) if (u.ownerPlayerId === ENEMY) present[u.definitionSlug] = (present[u.definitionSlug] ?? 0) + 1;
      let turns = 0;
      while (turns < TURN_CAP) {
        const pid = state.activePlayerId;
        const brain = pid === HUMAN ? b1 : b2;
        const actions = brain.selectActions(state, pid, map);
        if (pid === ENEMY) for (const a of actions) if (a.type === 'USE_ABILITY') casts[a.abilitySlug] = (casts[a.abilitySlug] ?? 0) + 1;
        let r;
        try { r = processTurn(state, actions, pid, HUMAN, ENEMY, map); } catch { break; }
        state = r.updatedState; turns++;
        if (r.matchOver) break;
      }
      turnsTotal += turns; gamesRun++;
    }
  }
  const kit = new Set<string>();
  for (const key of (enc.enemies ?? enc.rooms?.flatMap((r) => r.enemies) ?? [])) {
    const e = campaign.enemies[key];
    for (const s of (e.abilities ?? (e.specialSlug ? [e.specialSlug] : []))) kit.add(s);
  }
  for (const w of enc.waves ?? []) for (const key of w.enemies) { const e = campaign.enemies[key]; for (const s of (e.abilities ?? (e.specialSlug ? [e.specialSlug] : []))) kit.add(s); }
  const line = [...kit].filter((s) => (campaign.abilities?.[s] || map.get(s)?.isSpecial)).map((s) => `${s}=${((casts[s] ?? 0) / gamesRun).toFixed(2)}/game`).join('  ');
  const dead = [...kit].filter((s) => (campaign.abilities?.[s] || map.get(s)?.isSpecial) && !(casts[s] ?? 0));
  console.log(`${encId.padEnd(4)} L${String(level).padEnd(3)} avg ${(turnsTotal / gamesRun).toFixed(0)} turns  ${line}${dead.length ? `   ⚠ NEVER CAST: ${dead.join(', ')}` : ''}`);
}
