/**
 * THE RULEBOOK — single source of truth for every functional game rule.
 *
 * Each rule has a stable id. Two consumers depend on this file:
 *   1. The in-app Rulebook screen (mobile/app/rules.tsx) renders these
 *      sections verbatim — players read exactly what is written here.
 *   2. rulebookSpec.ts holds at least one executable check per rule id,
 *      and a meta-test fails the build if any rule here has no check.
 *
 * So: adding a rule without a test breaks CI, and changing engine behavior
 * that contradicts a rule breaks CI. If you change a rule's text, make sure
 * its checks still verify what the text now claims.
 */
export interface Rule {
    /** Stable id, e.g. 'MOV-3'. Never reuse a retired id. */
    id: string;
    /** Player-facing rule text. Written for players — keep it plain. */
    text: string;
}
export interface RuleSection {
    id: string;
    title: string;
    rules: Rule[];
}
export declare const RULEBOOK: RuleSection[];
/** Flat list of every rule (for the meta-test and for search). */
export declare const ALL_RULES: Rule[];
//# sourceMappingURL=rulebook.d.ts.map