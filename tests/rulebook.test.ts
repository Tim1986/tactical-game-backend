import { describe, it, expect } from 'vitest';
import { ALL_RULES, RULEBOOK } from '../src/game/rulebook.js';
import { RULE_CHECKS } from '../src/game/rulebookSpec.js';

/**
 * Server-side run of the rulebook battery. The same battery runs against the
 * mobile engine copy in mobile/tests/rulebook.test.ts — a rule that breaks on
 * either side fails that side's CI.
 */

describe('rulebook coverage (meta)', () => {
  it('every rule in the rulebook has at least one executable check', () => {
    const checked = new Set(RULE_CHECKS.map((c) => c.rule));
    const uncovered = ALL_RULES.filter((r) => !checked.has(r.id)).map((r) => r.id);
    expect(uncovered, `rules without a check: ${uncovered.join(', ')}`).toEqual([]);
  });

  it('every check references a rule that exists', () => {
    const ids = new Set(ALL_RULES.map((r) => r.id));
    const orphans = RULE_CHECKS.filter((c) => !ids.has(c.rule)).map((c) => c.rule);
    expect(orphans, `checks referencing unknown rules: ${orphans.join(', ')}`).toEqual([]);
  });

  it('rule ids are unique', () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every rule id matches its section prefix', () => {
    for (const section of RULEBOOK) {
      for (const rule of section.rules) {
        expect(rule.id.startsWith(`${section.id}-`), `${rule.id} in section ${section.id}`).toBe(true);
      }
    }
  });
});

describe('rulebook checks (server engine)', () => {
  for (const check of RULE_CHECKS) {
    it(`[${check.rule}] ${check.name}`, () => {
      check.run();
    });
  }
});
