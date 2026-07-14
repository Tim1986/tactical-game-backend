import { describe, it, expect } from 'vitest';
import { ABILITY_DEFS } from '../src/config/gameData.js';

/**
 * Spec-conformance guard: every ability's DESCRIPTION must agree with its DATA.
 *
 * Motivation: the Fear bug (root that never rooted) was invisible to balance
 * sims because both sides ran the same engine — win rates can't see "data
 * disagrees with tooltip". This test checks the claims a player reads against
 * the numbers the engine executes, with no simulation involved.
 *
 * Duration convention: the engine decrements at END of the victim's turn, so
 * durationTurns:N means "in force for N of the victim's turns" — descriptions
 * saying "for N turn(s)" must match durationTurns exactly.
 */

type Effect = Record<string, any>;

const byType = (ab: any, t: string): Effect[] => ab.effects.filter((e: Effect) => e.type === t);
const statusOf = (ab: any, slug: string): Effect | undefined =>
  ab.effects.find((e: Effect) => e.type === 'apply_status' && e.statusSlug === slug);

describe('ability descriptions match ability data', () => {
  for (const ab of ABILITY_DEFS) {
    const d: string = ab.description;

    describe(`${ab.slug} ("${ab.name}")`, () => {
      // "roots them/the target for N turn(s)"
      const rootM = d.match(/roots?\s+(?:them|the target|every|all)?[^.]*?for (\d+) turns?/i);
      if (rootM) {
        it(`rooted duration = ${rootM[1]}`, () => {
          expect(statusOf(ab, 'rooted')?.durationTurns).toBe(Number(rootM[1]));
        });
      }

      // "weakens ... for N turns"
      const weakM = d.match(/weaken\w*[^.]*?for (\d+) turns?/i);
      if (weakM) {
        it(`weakened duration = ${weakM[1]}`, () => {
          expect(statusOf(ab, 'weakened')?.durationTurns).toBe(Number(weakM[1]));
        });
      }

      // "freezing them for N turn(s)" / "freezes ... for N turn(s)"
      const frzM = d.match(/freez\w*[^.]*?for (\d+) turns?/i);
      if (frzM) {
        it(`frozen duration = ${frzM[1]}`, () => {
          expect(statusOf(ab, 'frozen')?.durationTurns).toBe(Number(frzM[1]));
        });
      }
      // "loses its next N initiative turns"
      const initM = d.match(/loses its next (\d+) initiative turns?/i);
      if (initM) {
        it(`frozen duration = ${initM[1]} (initiative phrasing)`, () => {
          expect(statusOf(ab, 'frozen')?.durationTurns).toBe(Number(initM[1]));
        });
      }

      // "exposes ... always hit for N turns" (exposed)
      const expM = d.match(/expos\w*[^.]*?for (\d+) turns?/i);
      if (expM) {
        it(`exposed duration = ${expM[1]}`, () => {
          expect(statusOf(ab, 'exposed')?.durationTurns).toBe(Number(expM[1]));
        });
      }

      // "N damage per turn for M turns" (burning)
      const burnM = d.match(/(\d+) damage per turn for (\d+) turns?/i);
      if (burnM) {
        it(`burning: 5/stack × stacks = ${burnM[1]}, duration = ${burnM[2]}`, () => {
          const burn = statusOf(ab, 'burning');
          expect(burn).toBeDefined();
          expect(5 * burn!.stacks).toBe(Number(burnM[1]));
          expect(burn!.durationTurns).toBe(Number(burnM[2]));
        });
      }

      // "Deals N ... damage" — first damage claim vs damage/lifesteal value.
      const dmgM = d.match(/deals (\d+)(?:\s+\w+)* damage/i);
      if (dmgM) {
        it(`damage value = ${dmgM[1]}`, () => {
          const vals = [...byType(ab, 'damage'), ...byType(ab, 'lifesteal')].map((e) => e.value);
          expect(vals).toContain(Number(dmgM[1]));
        });
      }

      // Unconditional invariant so no describe block is ever empty.
      it('has at least one effect', () => {
        expect(ab.effects.length).toBeGreaterThan(0);
      });

      // "Restores N HP"
      const restoreM = d.match(/restores (\d+) HP/i);
      if (restoreM) {
        it(`heal value = ${restoreM[1]}`, () => {
          expect(byType(ab, 'heal')[0]?.value).toBe(Number(restoreM[1]));
        });
      }

      // "N damage total" → sum of damage effects
      const totalM = d.match(/(\d+) damage total/i);
      if (totalM) {
        it(`total damage = ${totalM[1]}`, () => {
          const sum = byType(ab, 'damage').reduce((s, e) => s + e.value, 0);
          expect(sum).toBe(Number(totalM[1]));
        });
      }

      // "heals them/you for N"
      const healM = d.match(/heal\w*\s+(?:them|you|an ally|the target)?[^.]*?for (\d+)/i);
      if (healM) {
        it(`heal value = ${healM[1]}`, () => {
          const vals = [
            ...byType(ab, 'heal').map((e) => e.value),
            ...byType(ab, 'lifesteal').map((e) => e.healValue),
          ];
          expect(vals).toContain(Number(healM[1]));
        });
      }

      // "up to N tiles away" → range
      const rangeM = d.match(/up to (\d+) tiles? away/i);
      if (rangeM) {
        it(`range = ${rangeM[1]}`, () => {
          expect(ab.range).toBe(Number(rangeM[1]));
        });
      }

      // "pushes ... N tiles" / "pulls ... N tiles" → push/pull distance
      const pushM = d.match(/push\w*[^.]*?(\d+) tiles?/i);
      if (pushM) {
        it(`push distance = ${pushM[1]}`, () => {
          expect(byType(ab, 'push')[0]?.distance).toBe(Number(pushM[1]));
        });
      }
      const pullM = d.match(/pulls?[^.]*?(\d+) tiles? toward/i);
      if (pullM) {
        it(`pull distance = ${pullM[1]}`, () => {
          expect(byType(ab, 'pull')[0]?.distance).toBe(Number(pullM[1]));
        });
      }

      // "Unblockable" claimed anywhere → is_unblockable true
      if (/unblockable/i.test(d)) {
        it('is_unblockable = true', () => {
          expect(ab.is_unblockable).toBe(true);
        });
      }

      // Root/weaken/freeze effect present in DATA must be mentioned in the text
      // (catches silent riders the player can't see).
      for (const slug of ['rooted', 'weakened', 'frozen', 'burning'] as const) {
        if (statusOf(ab, slug)) {
          const words: Record<string, RegExp> = {
            rooted: /root/i, weakened: /weaken/i, frozen: /freez|daz/i, burning: /ablaze|burn/i,
          };
          it(`data applies ${slug} → description mentions it`, () => {
            expect(d).toMatch(words[slug]);
          });
        }
      }
    });
  }
});
