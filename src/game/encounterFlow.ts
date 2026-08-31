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
export function checkSpawnTriggers(
  state: MatchState,
  events: GameEvent[],
  mover?: UnitInstance,
  /** Tiles the mover occupied this turn (turnContext.visited). Defaults to its
   *  current tile. Door triggers match against ALL of them, so a unit that
   *  stepped on the tile and moved on still springs the ambush. */
  moverTiles?: BoardPosition[],
): void {
  const ep = state.encounterProgress;
  if (!ep || ep.waves.length === 0) return;
  const partyIds = new Set(ep.partyIds);
  const due: PendingWave[] = [];
  const keep: PendingWave[] = [];
  const boardClear = livingEnemies(state).length === 0;
  for (const w of ep.waves) {
    const fire =
      (w.trigger.on === 'round' && state.roundNumber >= w.trigger.round)
      || (w.trigger.on === 'rounds_after_entry'
          && state.roundNumber >= (ep.roomEnteredRound ?? 0) + w.trigger.rounds)
      || (w.trigger.on === 'room_cleared' && boardClear)
      || (w.trigger.on === 'door' && !!mover && partyIds.has(mover.instanceId)
          && (moverTiles ?? [mover.position]).some(
            (t) => t.x === (w.trigger as { tile: BoardPosition }).tile.x
                && t.y === (w.trigger as { tile: BoardPosition }).tile.y));
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
 * again); 'always' doors work mid-fight and the survivors FOLLOW THE PARTY
 * THROUGH (owner ruling 2026-08-24: "if you have an open door, and you go
 * through it without killing all the baddies, the rest of the baddies should
 * follow you into the next room").
 *
 * They used to be DELETED from the match, which made an 'always' door a free
 * room-skip: walk out, and everything still standing simply ceased to exist.
 * Following is the better rule on every axis — it removes the exploit, it
 * makes the escape hatch an honest trade (you leave a bad position but bring
 * the problem with you), and it is what the fiction says happens when you run
 * from someone up a staircase.
 */
export function maybeRoomTransition(state: MatchState, mover: UnitInstance, events: GameEvent[]): boolean {
  const ep = state.encounterProgress;
  if (!ep || ep.rooms.length === 0) return false;
  if (!ep.partyIds.includes(mover.instanceId)) return false;
  const onDoor = ep.exitDoors.some((d) => d.x === mover.position.x && d.y === mover.position.y);
  if (!onDoor) return false;
  if (ep.doorMode === 'on_clear' && livingEnemies(state).length > 0) return false;

  const room = ep.rooms[0];

  // Survivors of the room being left ('always' doors only — an on_clear door
  // cannot open with anyone still standing). They keep their instance ids,
  // their HP, their cooldowns and their initiative slots; only their tiles
  // change, below, once the party has taken the entry tiles. This room's
  // UNSPAWNED waves are still abandoned: they belonged to a fight the party
  // has walked out of, and ep.waves is replaced by the new room's list anyway.
  const pursuers = livingEnemies(state);

  // New carve.
  if (room.terrain && (room.terrain.blocked?.length || room.terrain.hazards?.length)) {
    state.terrain = { blocked: room.terrain.blocked ?? [], hazards: room.terrain.hazards ?? [] };
  } else {
    delete state.terrain;
  }

  events.push({ type: 'ROOM_ENTERED', message: `The party presses on…`, position: mover.position });

  // Party enters in party order (living members only), on the entry tiles —
  // then the allies (A5) file in behind them via the same ring-scan fallback.
  // ⚠ THE PLAYER'S OPENING CARRIES INTO EVERY ROOM. This used to walk the
  // party in in PARTY ORDER — slot i takes entryTiles[i] — which threw away the
  // placement chosen at the door of room 1 and put the hero on whatever
  // entryTiles[0] happened to be. On e8 that is a back corner, so a Barbarian
  // placed at the front re-entered at the rear every time (owner repro
  // 2026-08-31). A party member keeps ITS OWN tile index, so the arrangement
  // survives a death instead of the survivors shuffling forward into each
  // other's places. Allies still file in behind on whatever is left.
  const allyIds = Object.keys(state.allies ?? {});
  const slotOf = (id: string): number => ep.partyIds.indexOf(id);
  const tileIndexFor = (u: UnitInstance, fallbackIdx: number): number => {
    const slot = slotOf(u.instanceId);
    if (slot < 0) return fallbackIdx;                       // an ally, not party
    return ep.placementOrder?.[slot] ?? slot;
  };
  const living = [...ep.partyIds, ...allyIds]
    .map((id) => state.units.find((u) => u.instanceId === id))
    .filter((u): u is UnitInstance => !!u && u.isAlive);
  living.forEach((u, i) => {
    const idx = tileIndexFor(u, i);
    const tile = resolveSpawnTile(state, room.entryTiles[idx] ?? room.entryTiles[room.entryTiles.length - 1] ?? u.position);
    if (tile) {
      u.position = tile;
      events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: u.instanceId, position: tile, message: 'entered the next room' });
      applyEntryHazard(state, u, events); // authored entry tiles are validated hazard-free; displaced landings are not
    }
  });

  // ...and the pursuers come through the door behind them. Placed from the
  // party's own entry tiles, so the ring-scan in resolveSpawnTile pushes them
  // to the nearest free ground AROUND the party — they arrive at your back,
  // which is exactly what following someone through a door looks like.
  // Anything that cannot be placed at all is dropped rather than stacked.
  if (pursuers.length > 0) {
    const doorway = room.entryTiles[0] ?? mover.position;
    const stranded: string[] = [];
    for (const e of pursuers) {
      const tile = resolveSpawnTile(state, doorway);
      if (tile) {
        e.position = tile;
        events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: e.instanceId, position: tile, message: 'followed the party through' });
        applyEntryHazard(state, e, events);
      } else {
        stranded.push(e.instanceId);
      }
    }
    if (stranded.length > 0) {
      const drop = new Set(stranded);
      state.units = state.units.filter((u) => !drop.has(u.instanceId));
      state.initiative.order = state.initiative.order.filter((id, idx) => {
        if (!drop.has(id)) return true;
        if (idx <= state.initiative.slot) state.initiative.slot -= 1;
        return false;
      });
    }
  }

  // ⚠ CLEAR THE FALLEN GARRISON — but ENEMIES ONLY, never party or allies.
  // Owner 2026-08-27: "By the time we get to room 3, there are so many dead
  // enemies that the initiative column gets really filled up. Let's clear out
  // the dead enemies when you go through a new room." Corpses from a room the
  // party has already walked out of are pure clutter in the strip.
  //
  // ⚠ THE SCOPE IS LOAD-BEARING. winCondition's `ally_dead` loss detects a
  // fallen escort by finding it PRESENT-BUT-DEAD in state.units
  // (`some(u => !u.isAlive && ids.includes(u))`). Purging every corpse would
  // delete the evidence and silently disable escort-death losses — the run
  // would simply continue after Tam died. Party corpses are likewise left
  // alone (revival/counting and the initiative strip both expect them).
  // `units_dead` WINS are unaffected either way: they test for anyone still
  // ALIVE, which stays false once the body is gone.
  {
    const keepIds = new Set<string>([...ep.partyIds, ...Object.keys(state.allies ?? {})]);
    const purge = new Set(state.units.filter((u) => !u.isAlive && !keepIds.has(u.instanceId))
      .map((u) => u.instanceId));
    if (purge.size > 0) {
      state.units = state.units.filter((u) => !purge.has(u.instanceId));
      state.initiative.order = state.initiative.order.filter((id, idx) => {
        if (!purge.has(id)) return true;
        if (idx <= state.initiative.slot) state.initiative.slot -= 1;
        return false;
      });
    }
  }

  // Progress bookkeeping BEFORE spawning (spawn placement sees new terrain).
  ep.rooms = ep.rooms.slice(1);
  ep.waves = room.waves;
  ep.exitDoors = room.exitDoors;
  ep.doorMode = room.doorMode;
  ep.roomIndex += 1;
  // Reset the room clock so 'rounds_after_entry' waves in the NEW room are
  // measured from this moment, not from the start of the encounter.
  ep.roomEnteredRound = state.roundNumber;

  // The room's garrison enters as a wave (weave + optional surprise).
  spawnWave(state, { units: room.units, placement: room.placement, trigger: { on: 'room_cleared' }, surprise: room.surprise }, events);
  return true;
}
