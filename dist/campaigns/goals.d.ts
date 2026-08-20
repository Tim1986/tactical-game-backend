/**
 * goals.ts — CAMPAIGN battle goals (ENCOUNTER_SPEC A7).
 *
 * Goals are TEAM-level optional bonus objectives, 0–2 per encounter, shown
 * with the objective before the fight and evaluated ONLY on a won encounter,
 * from the final MatchState (whose goalStats the engine maintained during
 * play — see updateGoalStats in turnProcessor.ts). Difficulty never changes
 * goals. Each achieved goal maps to a campaign achievement.
 */
import { MatchState } from '../types/matchState.js';
import { BattleGoal } from './types.js';
export interface GoalResult {
    slug: string;
    name: string;
    description: string;
    achieved: boolean;
}
/** Evaluate an encounter's goals against the FINAL state of a WON match.
 *  Caller guarantees the win — calling on a loss is a bug (goals are only
 *  ever judged on victories, per spec). */
export declare function evaluateBattleGoals(goals: BattleGoal[], finalState: MatchState): GoalResult[];
//# sourceMappingURL=goals.d.ts.map