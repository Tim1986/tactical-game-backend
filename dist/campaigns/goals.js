"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBattleGoals = evaluateBattleGoals;
/** Evaluate an encounter's goals against the FINAL state of a WON match.
 *  Caller guarantees the win — calling on a loss is a bug (goals are only
 *  ever judged on victories, per spec). */
function evaluateBattleGoals(goals, finalState) {
    const obj = finalState.objective;
    const gs = finalState.goalStats;
    if (!obj)
        throw new Error('evaluateBattleGoals: final state has no objective (not a campaign match)');
    const allySet = new Set(obj.allyIds ?? []);
    const party = finalState.units.filter((u) => u.ownerPlayerId === obj.partyId && !allySet.has(u.instanceId));
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
                if (scope === 'main')
                    achieved = party.some((u) => u.instanceId === obj.mainId && u.isAlive);
                else if (scope === 'all')
                    achieved = party.every((u) => u.isAlive);
                else
                    achieved = party.some((u) => u.isAlive);
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
//# sourceMappingURL=goals.js.map