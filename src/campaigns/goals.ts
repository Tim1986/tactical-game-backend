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
export function evaluateBattleGoals(goals: BattleGoal[], finalState: MatchState): GoalResult[] {
  const obj = finalState.objective;
  const gs = finalState.goalStats;
  if (!obj) throw new Error('evaluateBattleGoals: final state has no objective (not a campaign match)');
  const allySet = new Set(obj.allyIds ?? []);
  const party = finalState.units.filter(
    (u) => u.ownerPlayerId === obj.partyId && !allySet.has(u.instanceId),
  );

  return goals.map((g) => {
    let achieved = false;
    switch (g.check.kind) {
      case 'win_by_round':
        achieved = finalState.roundNumber <= g.check.round;
        break;
      case 'no_party_deaths':
        achieved = (gs?.partyDeaths ?? 0) === 0;
        break;
      case 'unit_survives': {
        const scope = g.check.scope;
        if (scope === 'main') achieved = party.some((u) => u.instanceId === obj.mainId && u.isAlive);
        else if (scope === 'all') achieved = party.every((u) => u.isAlive);
        else achieved = party.some((u) => u.isAlive);
        break;
      }
      case 'killing_blow_by_main':
        achieved = !!gs?.lastEnemyKillerId && gs.lastEnemyKillerId === obj.mainId;
        break;
      case 'no_damage_to_main':
        achieved = !(gs?.mainTookDamage ?? false);
        break;
    }
    return { slug: g.slug, name: g.name, description: g.description, achieved };
  });
}
