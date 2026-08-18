import { MatchState, UnitInstance, ObjectiveState, ResolvedWinCondition, ResolvedLossCondition, BoardPosition } from '../types/matchState.js';
import { hasPendingContent } from './encounterFlow.js';

export interface WinCheckResult {
  isOver: boolean;
  winnerId: string | null;
  loserId: string | null;
  /** CAMPAIGN objectives only: player-facing reason ("The deadline passed"). */
  reason?: string;
}

const ONGOING: WinCheckResult = { isOver: false, winnerId: null, loserId: null };

/**
 * Match-over check. Arena (no state.objective): classic mutual kill-all,
 * byte-identical to the original implementation. Campaign encounters with an
 * objective evaluate ENCOUNTER_SPEC A3 semantics:
 *   - party wipe is always an implicit loss;
 *   - WIN conditions are checked before LOSS conditions (a simultaneous
 *     win+loss resolves as a WIN — player-favoring tie, owner call);
 *   - enemy wipe is a mercy win even when kill-all isn't listed: with nothing
 *     left to oppose the party, no remaining condition can be stopped.
 *     (Revisit at A4 — pending waves/rooms must suppress the mercy rule.)
 */
export function checkWinCondition(state: MatchState, playerOneId: string, playerTwoId: string): WinCheckResult {
  const obj = state.objective;
  if (obj) return checkObjective(state, obj);

  const p1Alive = state.units.some((u) => u.ownerPlayerId === playerOneId && u.isAlive);
  const p2Alive = state.units.some((u) => u.ownerPlayerId === playerTwoId && u.isAlive);
  if (!p1Alive && !p2Alive) return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
  if (!p1Alive) return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
  if (!p2Alive) return { isOver: true, winnerId: playerOneId, loserId: playerTwoId };
  return ONGOING;
}

function livingOf(state: MatchState, ownerId: string): UnitInstance[] {
  return state.units.filter((u) => u.isAlive && u.ownerPlayerId === ownerId);
}

const onAnyTile = (u: UnitInstance, tiles: BoardPosition[]): boolean =>
  tiles.some((t) => t.x === u.position.x && t.y === u.position.y);

function winSatisfied(state: MatchState, obj: ObjectiveState, c: ResolvedWinCondition): string | null {
  switch (c.kind) {
    case 'all_enemies_dead':
      // A4: pending waves/rooms mean the fight is not over on a clear board.
      if (hasPendingContent(state)) return null;
      return livingOf(state, obj.enemyId).length === 0 ? 'Every enemy has fallen' : null;
    case 'units_dead': {
      // A4 bug fix (surfaced by campaign 2's e12, a `units_dead` naming a boss
      // that lives in the LAST room): named units from a later room/wave don't
      // exist in state.units until they actually spawn, so `anyAlive` was
      // false — not because the unit died, but because it was never born yet —
      // and the fight "won" on turn 1. Mirror all_enemies_dead's guard: while
      // pending content remains, this can never vacuously satisfy.
      if (hasPendingContent(state)) return null;
      const anyAlive = state.units.some((u) => u.isAlive && c.unitIds.includes(u.instanceId));
      return anyAlive ? null : 'The target is destroyed';
    }
    case 'round_reached':
      return state.roundNumber > c.round ? `You survived ${c.round} rounds` : null;
    case 'units_at_tiles': {
      const party = livingOf(state, obj.partyId);
      if (party.length === 0) return null;
      if (c.scope === 'main') {
        const main = party.find((u) => u.instanceId === obj.mainId);
        return main && onAnyTile(main, c.tiles) ? 'You reached the goal' : null;
      }
      if (c.simultaneous) {
        // Every listed tile covered by a living party unit at once.
        const covered = c.tiles.every((t) => party.some((u) => u.position.x === t.x && u.position.y === t.y));
        return covered ? 'Every mark is held' : null;
      }
      if (c.scope === 'all') {
        return party.every((u) => onAnyTile(u, c.tiles)) ? 'The whole party escaped' : null;
      }
      return party.some((u) => onAnyTile(u, c.tiles)) ? 'You reached the goal' : null;
    }
    case 'ally_at_tiles': {
      const escort = state.units.find((u) => u.isAlive && c.unitIds.includes(u.instanceId) && onAnyTile(u, c.tiles));
      return escort ? 'The escort made it through' : null;
    }
  }
}

function lossSatisfied(state: MatchState, obj: ObjectiveState, c: ResolvedLossCondition): string | null {
  switch (c.kind) {
    case 'ally_dead': {
      const dead = state.units.some((u) => !u.isAlive && c.unitIds.includes(u.instanceId));
      return dead ? 'Your charge has fallen' : null;
    }
    case 'round_reached':
      return state.roundNumber > c.round ? 'The deadline passed' : null;
    case 'main_dead': {
      const main = state.units.find((u) => u.instanceId === obj.mainId);
      return main && !main.isAlive ? 'Your hero has fallen' : null;
    }
  }
}

function checkObjective(state: MatchState, obj: ObjectiveState): WinCheckResult {
  // WIN first — player-favoring tie resolution (ENCOUNTER_SPEC A3).
  for (const c of obj.win) {
    const reason = winSatisfied(state, obj, c);
    if (reason) return { isOver: true, winnerId: obj.partyId, loserId: obj.enemyId, reason };
  }
  // Mercy rule: enemy side wiped → nothing can stop the remaining conditions.
  // A4: suppressed while waves/rooms are still pending — more is coming.
  if (!hasPendingContent(state) && livingOf(state, obj.enemyId).length === 0) {
    return { isOver: true, winnerId: obj.partyId, loserId: obj.enemyId, reason: 'Every enemy has fallen' };
  }
  // Implicit party-wipe loss, then authored losses. Allies (A5) don't count —
  // a lone surviving escort/VIP is not a fighting force.
  const allySet = new Set(obj.allyIds ?? []);
  if (livingOf(state, obj.partyId).filter((u) => !allySet.has(u.instanceId)).length === 0) {
    return { isOver: true, winnerId: obj.enemyId, loserId: obj.partyId, reason: 'Your party has fallen' };
  }
  for (const c of obj.loss) {
    const reason = lossSatisfied(state, obj, c);
    if (reason) return { isOver: true, winnerId: obj.enemyId, loserId: obj.partyId, reason };
  }
  return ONGOING;
}
