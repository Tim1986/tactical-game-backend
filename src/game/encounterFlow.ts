/**
 * encounterFlow.ts — CAMPAIGN-ONLY waves, doors, and rooms (ENCOUNTER_SPEC A4).
 *
 * Everything here is keyed off MatchState.encounterProgress, which arena
 * matches never carry — with it absent every export is a no-op (the
 * arena-untouched invariant).
 *
 * Initiative weave (owner 2026-08-14): the party's committed order NEVER
 * resets. New enemies are INSERTED into the existing order so the alternating
 * PC/enemy pattern re-forms — each spawn goes after a party unit that has no
 * enemy following it (in order), extras append at the end. A spawn whose slot
 * is still ahead of the current position acts THIS round; one woven behind it
 * acts from the next round (no time travel). `surprise` spawns carry
 * skipFirstSlot and sit out their first slot entirely.
 */
import {
  MatchState, UnitInstance, GameEvent, BoardPosition, PendingWave, PendingRoom,
} from '../types/matchState.js';
import { isInBounds } from './boardUtils.js';
import { isTerrainBlocked } from '../ai/geometry.js';
import { applyEntryHazard } from './abilityExecutor.js';

/** Any waves or rooms still to come? Suppresses kill-all / the mercy rule. */
export function hasPendingContent(state: MatchState): boolean {
  const ep = state.encounterProgress;
  return !!ep && (ep.waves.length > 0 || ep.rooms.length > 0);
}

function livingEnemies(state: MatchState): UnitInstance[] {
  // Ownership-based: allies (A5) are party-OWNED but not party MEMBERS — an
  // id-based check would count the escort as a living enemy and jam doors.
  const ep = state.encounterProgress;
  const partyOwner = state.units.find((u) => ep?.partyIds.includes(u.instanceId))?.ownerPlayerId;
  return state.units.filter((u) => u.isAlive && u.ownerPlayerId !== partyOwner);
}

/**
 * Deterministic spawn placement: the authored tile, or — if occupied/invalid —
 * the nearest free, non-wall, non-hazard tile by Manhattan ring scan
 * (y-then-x within each ring, so content authors can predict it).
 */
function resolveSpawnTile(state: MatchState, want: BoardPosition): BoardPosition | null {
  const free = (p: BoardPosition): boolean =>
    isInBounds(p)
    && !isTerrainBlocked(state.terrain, p)
    && !state.terrain?.hazards?.some((h) => h.pos.x === p.x && h.pos.y === p.y)
    && !state.units.some((u) => u.isAlive && u.position.x === p.x && u.position.y === p.y);
  if (free(want)) return want;
  for (let r = 1; r <= 7; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const p = { x: want.x + dx, y: want.y + dy };
        if (free(p)) return p;
      }
    }
  }
  return null;
}

/**
 * Insert spawned units into the initiative order per the owner's weave rule.
 * Round 1 special case: order is still being committed — spawns simply join
 * the committable pool (they'll be woven by buildFinalOrder-equivalent flow);
 * we append their ids nowhere and let round-1 commitment logic handle them?
 * NO — enemies in campaigns are committed by the ENEMY player's round-1 turns.
 * A spawn during round 1 appends to the un-committed pool automatically (it is
 * simply a new unit the enemy side has not committed yet). Only a round-2+
 * spawn needs explicit insertion, which is what this function does.
 */
export function weaveIntoInitiative(state: MatchState, spawned: UnitInstance[], events: GameEvent[]): void {
  const initiative = state.initiative;
  if (initiative.isRound1) return; // joins the round-1 commit pool naturally
  const partyIds = new Set(state.encounterProgress?.partyIds ?? []);
  const order = initiative.order;
  for (const unit of spawned) {
    // Find the first party slot with no enemy directly after it, scanning in
    // order; insert there. Otherwise append.
    let insertAt = order.length;
    for (let i = 0; i < order.length; i++) {
      if (!partyIds.has(order[i])) continue;
      const next = order[i + 1];
      if (next === undefined || partyIds.has(next)) { insertAt = i + 1; break; }
    }
    order.splice(insertAt, 0, unit.instanceId);
    // Keep the pointer on the SAME unit it was on: an insertion at or before
    // the current slot shifts everything after it by one.
    if (insertAt <= initiative.slot) initiative.slot += 1;
  }
  void events;
}

/** Spawn one wave's units onto the current board and weave them in. */
export function spawnWave(state: MatchState, wave: PendingWave, events: GameEvent[]): void {
  const spawned: UnitInstance[] = [];
  wave.units.forEach((unit, i) => {
    const tile = resolveSpawnTile(state, wave.placement[i] ?? wave.placement[wave.placement.length - 1] ?? unit.position);
    if (!tile) return; // board completely packed — drop the spawn (authored content should never hit this)
    unit.position = tile;
    if (wave.surprise) unit.skipFirstSlot = true;
    state.units.push(unit);
    spawned.push(unit);
    events.push({ type: 'UNIT_SPAWNED', targetUnitInstanceId: unit.instanceId, position: tile, message: wave.surprise ? 'Caught off guard!' : 'Reinforcements!' });
  });
  weaveIntoInitiative(state, spawned, events);
}

/**
 * Fire any due triggers. Call after every resolved action (mover = the unit
 * that just finished a MOVE/CHARGE, if any) and at round starts.
 */
export function checkSpawnTriggers(state: MatchState, events: GameEvent[], mover?: UnitInstance): void {
  const ep = state.encounterProgress;
  if (!ep || ep.waves.length === 0) return;
  const partyIds = new Set(ep.partyIds);
  const due: PendingWave[] = [];
  const keep: PendingWave[] = [];
  const boardClear = livingEnemies(state).length === 0;
  for (const w of ep.waves) {
    const fire =
      (w.trigger.on === 'round' && state.roundNumber >= w.trigger.round)
      || (w.trigger.on === 'room_cleared' && boardClear)
      || (w.trigger.on === 'door' && !!mover && partyIds.has(mover.instanceId)
          && mover.position.x === w.trigger.tile.x && mover.position.y === w.trigger.tile.y);
    (fire ? due : keep).push(w);
  }
  if (due.length === 0) return;
  ep.waves = keep;
  for (const w of due) spawnWave(state, w, events);
}

/**
 * Room transition: a party unit ENDED ITS TURN on an active exit door,
 * having moved this turn (the caller enforces both — see finalizeTurnInternal;
 * firing mid-turn orphaned the rest of the mover's queued actions).
 * on_clear doors require the board clear of living enemies (room_cleared
 * waves fire BEFORE this check, so a clear that spawns a wave shuts the door
 * again); 'always' doors work mid-fight and abandon whoever is left behind
 * (removed from the match — they count as gone for kill-all).
 */
export function maybeRoomTransition(state: MatchState, mover: UnitInstance, events: GameEvent[]): boolean {
  const ep = state.encounterProgress;
  if (!ep || ep.rooms.length === 0) return false;
  if (!ep.partyIds.includes(mover.instanceId)) return false;
  const onDoor = ep.exitDoors.some((d) => d.x === mover.position.x && d.y === mover.position.y);
  if (!onDoor) return false;
  if (ep.doorMode === 'on_clear' && livingEnemies(state).length > 0) return false;

  const room = ep.rooms[0];

  // Abandon living enemies + this room's unspawned waves ('always' doors).
  const left = livingEnemies(state);
  const leftIds = new Set(left.map((u) => u.instanceId));
  state.units = state.units.filter((u) => !leftIds.has(u.instanceId));
  state.initiative.order = state.initiative.order.filter((id, idx) => {
    if (!leftIds.has(id)) return true;
    if (idx <= state.initiative.slot) state.initiative.slot -= 1;
    return false;
  });

  // New carve.
  if (room.terrain && (room.terrain.blocked?.length || room.terrain.hazards?.length)) {
    state.terrain = { blocked: room.terrain.blocked ?? [], hazards: room.terrain.hazards ?? [] };
  } else {
    delete state.terrain;
  }

  events.push({ type: 'ROOM_ENTERED', message: `The party presses on…`, position: mover.position });

  // Party enters in party order (living members only), on the entry tiles —
  // then the allies (A5) file in behind them via the same ring-scan fallback.
  const allyIds = Object.keys(state.allies ?? {});
  const living = [...ep.partyIds, ...allyIds]
    .map((id) => state.units.find((u) => u.instanceId === id))
    .filter((u): u is UnitInstance => !!u && u.isAlive);
  living.forEach((u, i) => {
    const tile = resolveSpawnTile(state, room.entryTiles[i] ?? room.entryTiles[room.entryTiles.length - 1] ?? u.position);
    if (tile) {
      u.position = tile;
      events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: u.instanceId, position: tile, message: 'entered the next room' });
      applyEntryHazard(state, u, events); // authored entry tiles are validated hazard-free; displaced landings are not
    }
  });

  // Progress bookkeeping BEFORE spawning (spawn placement sees new terrain).
  ep.rooms = ep.rooms.slice(1);
  ep.waves = room.waves;
  ep.exitDoors = room.exitDoors;
  ep.doorMode = room.doorMode;
  ep.roomIndex += 1;

  // The room's garrison enters as a wave (weave + optional surprise).
  spawnWave(state, { units: room.units, placement: room.placement, trigger: { on: 'room_cleared' }, surprise: room.surprise }, events);
  return true;
}
