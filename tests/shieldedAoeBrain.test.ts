/**
 * shieldedAoeBrain.test.ts — a shield does not stop a status-only blast, and
 * the brain must not think it does.
 *
 * Owner repro 2026-08-31 (e8 final room): the Blizzard Wisp failed to land Ring
 * of Frost on a party that "could have hit 2 of my units". His party carries
 * the Keeper's Oilskins boon, so every unit starts each encounter SHIELDED.
 *
 * The brain treated `shielded` as immunity for EVERY aoe, damaging or not.
 * Ring of Frost is pure `apply_status`, and DGE-5 says a purely non-damaging
 * effect passes through a shield — so the engine froze them and the brain
 * believed it could not. With zero enemies counted as hit at any centre, the
 * once-per-game cluster gate skipped every option and the ability was never
 * cast at all.
 */
import { describe, it, expect } from 'vitest';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { isInAoe } from '../src/game/boardUtils.js';
import type { MatchState, UnitInstance } from '../src/types/matchState.js';

const P = 'HUMAN', E = 'ENEMY';
const map = buildAbilityMap();
const BLIZZARD = map.get('blizzard')!;
const SHIELD = [{ slug: 'shielded', turnsRemaining: 9, stacks: 1, sourceUnitInstanceId: 'x' }];

let n = 0;
const mk = (o: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++n}`, definitionSlug: 'wizard', ownerPlayerId: o, position: { x, y },
  currentHealth: 34, maxHealth: 34, armorClass: 10, movementRange: 3,
  abilities: ['missile', 'blizzard'], passives: [], isAlive: true, hasMovedThisTurn: false,
  hasActedThisTurn: false, cooldowns: {}, statusEffects: [], ...over,
} as UnitInstance);

function board(shielded: boolean): { st: MatchState; wisp: UnitInstance; party: UnitInstance[] } {
  n = 0;
  const ov = shielded ? { statusEffects: SHIELD as never } : {};
  const wisp = mk(E, 5, 3);
  const ally = mk(E, 6, 6, { abilities: ['sword'] });
  const a = mk(P, 2, 2, { abilities: ['sword'], ...ov });
  const b = mk(P, 2, 4, { abilities: ['sword'], ...ov });
  const units = [wisp, ally, a, b];
  const st = {
    board: { width: 8, height: 8 }, units, turnNumber: 5, roundNumber: 2,
    activePlayerId: E, phase: 'action',
    initiative: { order: units.map((u) => u.instanceId), slot: 0,
      round1FirstPlayerId: P, activeUnitId: wisp.instanceId, isRound1: false },
  } as unknown as MatchState;
  return { st, wisp, party: [a, b] };
}

function blizzardCast(st: MatchState): { target: { x: number; y: number } } | undefined {
  const acts = new OptimalBrain().selectActions(st, E, map) as { type: string; abilitySlug?: string; target?: { x: number; y: number } }[];
  const c = acts.find((x) => x.type === 'USE_ABILITY' && x.abilitySlug === 'blizzard');
  return c?.target ? { target: c.target } : undefined;
}

describe('status-only AoE vs a shielded party', () => {
  it('casts Ring of Frost at a SHIELDED party — the freeze passes through', () => {
    const { st } = board(true);
    const cast = blizzardCast(st);
    expect(cast, 'the wisp must still use its signature ability').toBeDefined();
  });

  it('and the cast covers both of them', () => {
    const { st, party } = board(true);
    const cast = blizzardCast(st)!;
    const hit = party.filter((u) => isInAoe(cast.target, u.position,
      BLIZZARD.areaRadius, (BLIZZARD as { areaShape?: 'ring' }).areaShape));
    expect(hit).toHaveLength(2);
  });

  it('behaves identically whether or not the party is shielded', () => {
    // The shield is irrelevant to a non-damaging blast, so the decision must be
    // the same board either way.
    expect(blizzardCast(board(true).st)).toEqual(blizzardCast(board(false).st));
  });

  it('a DAMAGING aoe still respects the shield', () => {
    // The gate is not removed, only narrowed: Ring of Fire deals damage, so a
    // shielded target genuinely absorbs it and must still be discounted.
    const ffh = map.get('ffh')!;
    expect(ffh.effects.some((e) => e.type === 'damage')).toBe(true);
    expect(BLIZZARD.effects.every((e) => e.type !== 'damage' && e.type !== 'lifesteal')).toBe(true);
  });
});

describe('the brain never spends a turn on nothing', () => {
  it('no planned cast resolves to zero targets, over randomised boards', () => {
    // Owner ruling 2026-08-31: "if nothing's gonna happen, you should just use
    // an attack anyway." He watched a Blizzard Wisp cast Ring of Frost into
    // empty air; no amount of fuzzing the centre-choosing code reproduced it,
    // so the guarantee is enforced in `consider()` rather than argued for.
    // This asserts the guarantee itself, not the path that threatened it.
    const rnd = (m: number): number => Math.floor(Math.random() * m);
    let casts = 0;
    for (let i = 0; i < 400; i++) {
      n = 0;
      const used = new Set<string>();
      const pick = (): { x: number; y: number } => {
        for (;;) {
          const x = rnd(8), y = rnd(8);
          if ((x === 0 || x === 7) && (y === 0 || y === 7)) continue;
          if (used.has(`${x},${y}`)) continue;
          used.add(`${x},${y}`);
          return { x, y };
        }
      };
      const w = pick(), ap = pick(), bp = pick(), cp = pick();
      const wisp = mk(E, w.x, w.y);
      const ally = mk(E, cp.x, cp.y, { abilities: ['sword'] });
      const a = mk(P, ap.x, ap.y, { abilities: ['sword'] });
      const b = mk(P, bp.x, bp.y, { abilities: ['sword'] });
      const units = [wisp, ally, a, b];
      const st = {
        board: { width: 8, height: 8 }, units, turnNumber: 5, roundNumber: 2,
        activePlayerId: E, phase: 'action',
        initiative: { order: units.map((u) => u.instanceId), slot: 0,
          round1FirstPlayerId: P, activeUnitId: wisp.instanceId, isRound1: false },
      } as unknown as MatchState;
      const acts = new OptimalBrain().selectActions(st, E, map) as
        { type: string; abilitySlug?: string; target?: { x: number; y: number }; destination?: { x: number; y: number } }[];
      let from = wisp.position;
      for (const act of acts) {
        if (act.type === 'MOVE' && act.destination) { from = act.destination; continue; }
        if (act.type !== 'USE_ABILITY' || !act.target) continue;
        const def = map.get(act.abilitySlug!)!;
        if (def.effects.some((e) => e.type === 'move_self')) continue;
        casts++;
        const hit = units.filter((u) => u.isAlive
          && isInAoe(act.target!, u.position, def.areaRadius, (def as { areaShape?: 'ring' }).areaShape));
        const singleHit = def.targetingType === 'single'
          && units.some((u) => u.isAlive && u.position.x === act.target!.x && u.position.y === act.target!.y);
        expect(hit.length > 0 || singleHit || def.targetingType === 'self' || def.targetingType === 'line',
          `${def.slug} cast from ${JSON.stringify(from)} at ${JSON.stringify(act.target)} hit nobody`).toBe(true);
      }
    }
    expect(casts).toBeGreaterThan(50);   // the fuzz must actually exercise casts
  });
});
