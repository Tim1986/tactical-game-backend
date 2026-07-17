/**
 * initialState.ts — Pure engine helpers for building a fresh MatchState.
 *
 * Extracted from matchService.ts so the mobile app can import this without
 * pulling in any server dependencies (Postgres, auth, etc.).
 * No external dependencies — works in both Node.js and React Native.
 */
import { MatchState, UnitInstance, BoardPosition } from '../types/matchState.js';
import { UnitDefinition, UnitCustomization } from '../types/index.js';
export declare const FABLE_PLAYER_ID = "00000000-0000-0000-0000-000000000001";
export declare const FABLE_HP_SCALE: {
    readonly easy: 0.8;
    readonly medium: 0.9;
    readonly hard: 1;
};
export type FableDifficulty = keyof typeof FABLE_HP_SCALE;
export declare function newInstanceId(): string;
export declare function buildUnitInstance(def: UnitDefinition, ownerId: string, position: BoardPosition, customization?: UnitCustomization): UnitInstance;
export declare function buildInitialState(playerOneId: string, playerTwoId: string, p1Units: UnitDefinition[], p2Units: UnitDefinition[], p1Placement: BoardPosition[], p2Placement: BoardPosition[], forceFirstPlayerId?: string, p1Customizations?: UnitCustomization[], p2Customizations?: UnitCustomization[], fableHpScale?: number): MatchState;
//# sourceMappingURL=initialState.d.ts.map