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
import { MatchState, UnitInstance, GameEvent, PendingWave } from '../types/matchState.js';
/** Any waves or rooms still to come? Suppresses kill-all / the mercy rule. */
export declare function hasPendingContent(state: MatchState): boolean;
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
export declare function weaveIntoInitiative(state: MatchState, spawned: UnitInstance[], events: GameEvent[]): void;
/** Spawn one wave's units onto the current board and weave them in. */
export declare function spawnWave(state: MatchState, wave: PendingWave, events: GameEvent[]): void;
/**
 * Fire any due triggers. Call after every resolved action (mover = the unit
 * that just finished a MOVE/CHARGE, if any) and at round starts.
 */
export declare function checkSpawnTriggers(state: MatchState, events: GameEvent[], mover?: UnitInstance): void;
/**
 * Room transition: a party unit ENDED ITS TURN on an active exit door,
 * having moved this turn (the caller enforces both — see finalizeTurnInternal;
 * firing mid-turn orphaned the rest of the mover's queued actions).
 * on_clear doors require the board clear of living enemies (room_cleared
 * waves fire BEFORE this check, so a clear that spawns a wave shuts the door
 * again); 'always' doors work mid-fight and abandon whoever is left behind
 * (removed from the match — they count as gone for kill-all).
 */
export declare function maybeRoomTransition(state: MatchState, mover: UnitInstance, events: GameEvent[]): boolean;
//# sourceMappingURL=encounterFlow.d.ts.map