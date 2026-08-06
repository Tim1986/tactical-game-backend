import { describe, it, expect } from 'vitest';
import { abilityShape } from '../src/config/abilityShape.js';
import { ABILITY_DEFS } from '../src/config/gameData.js';
import { isInAoe } from '../src/game/boardUtils.js';

// `ability_definitions` has no area_shape / self_status column, so an
// AbilityDefinition rebuilt from a DB row loses them unless abilityShape() is
// spread over it. When that happened, LIVE matches resolved Ring of Fire /
// Ring of Frost / Leaping Slam as full squares that hit their own centre, and
// Whirlwind / Ground Slam as 8-way blasts. Offline play was correct, so the
// two modes disagreed about the rules.
describe('DB-row abilities keep their engine shape', () => {
  const dbColumns = new Set([
    'id','slug','name','description','targeting_type','range','area_radius',
    'cooldown_turns','is_special','is_unblockable','exclude_allies','is_multi_hit','effects',
  ]);

  it('every shape field gameData declares is covered by abilityShape()', () => {
    // Any gameData key with no DB column MUST be supplied by abilityShape(),
    // otherwise it silently vanishes on the server.
    const covered = new Set(['area_shape','self_status','is_multi_hit']);
    const uncovered = new Set<string>();
    for (const a of ABILITY_DEFS as readonly Record<string, unknown>[]) {
      for (const k of Object.keys(a)) {
        if (!dbColumns.has(k) && !covered.has(k)) uncovered.add(k);
      }
    }
    expect([...uncovered], 'gameData fields with no DB column and no overlay').toEqual([]);
  });

  it('rings spare their centre and orthogonal AoEs spare diagonals after a DB round-trip', () => {
    for (const slug of ['ffh','blizzard','roar']) {
      expect(abilityShape(slug).areaShape, slug).toBe('ring');
      expect(isInAoe({x:4,y:4},{x:4,y:4},1,abilityShape(slug).areaShape), `${slug} centre`).toBe(false);
    }
    for (const slug of ['whirlwind','shockwave']) {
      expect(abilityShape(slug).areaShape, slug).toBe('orthogonal');
      expect(isInAoe({x:4,y:4},{x:5,y:5},1,abilityShape(slug).areaShape), `${slug} diagonal`).toBe(false);
    }
    expect(abilityShape('twin').isMultiHit).toBe(true);
    expect(abilityShape('sword').areaShape).toBe('chebyshev');
  });
});
