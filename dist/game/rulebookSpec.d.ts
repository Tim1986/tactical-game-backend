/**
 * rulebookSpec.ts — executable checks for every rule in rulebook.ts.
 *
 * Each check is keyed by a rule id and throws on failure (plain assertions,
 * no test-framework dependency). Thin wrappers run this battery in BOTH
 * repos:
 *   - backend/tests/rulebook.test.ts        (server engine)
 *   - mobile/tests/rulebook.test.ts         (mobile/engine synced copy)
 * The backend wrapper also meta-checks that every rule id in rulebook.ts
 * has at least one check here — a rule without a test fails CI.
 *
 * Keep checks BEHAVIORAL: drive the same public entry points the game uses
 * (processTurn, executeAbility, reachableFrom, buildUnitInstance), so a
 * regression anywhere in the pipeline trips the rule.
 */
export interface RuleCheck {
    /** Rule id from rulebook.ts this check verifies. */
    rule: string;
    name: string;
    run: () => void;
}
export declare const RULE_CHECKS: RuleCheck[];
/** Run every check; returns failures (empty = all rules hold). */
export declare function runRulebookChecks(): {
    rule: string;
    name: string;
    error: string;
}[];
//# sourceMappingURL=rulebookSpec.d.ts.map