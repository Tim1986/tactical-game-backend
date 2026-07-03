/**
 * defaultData.ts — Ability and unit definitions matching seed.ts exactly.
 * Used by the sim harness to run matches without a DB connection.
 * Keep in sync with seed.ts whenever stats change.
 */

import { AbilityDefinition, UnitDefinition } from '../types/index.js';

export const ABILITY_DEFS: AbilityDefinition[] = [
  // ── Barbarian ──────────────────────────────────────────────────────────────
  { id: 'strike',    slug: 'strike',    name: 'Strike',         description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 15 }] },
  { id: 'whirlwind', slug: 'whirlwind', name: 'Whirlwind',      description: '', targetingType: 'aoe',    range: 0, areaRadius: 1, cooldownTurns: 99, isSpecial: true,  isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 15 }] },
  // ── Cleric ─────────────────────────────────────────────────────────────────
  { id: 'mace',      slug: 'mace',      name: 'Mace',           description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8  }] },
  { id: 'heal',      slug: 'heal',      name: 'Heal',           description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: true,  effects: [{ type: 'heal',   formula: 'flat', value: 25 }] },
  // ── Fighter ────────────────────────────────────────────────────────────────
  { id: 'sword',       slug: 'sword',       name: 'Strike',    description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10 }] },
  { id: 'second_wind', slug: 'second_wind', name: 'First Aid', description: '', targetingType: 'self',   range: 0, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: true,  effects: [{ type: 'heal',   formula: 'flat', value: 20 }] },
  // ── Rogue ──────────────────────────────────────────────────────────────────
  { id: 'twin',       slug: 'twin',       name: 'Twin Strike', description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10 }, { type: 'damage', formula: 'flat', value: 10 }] },
  { id: 'assassinate', slug: 'assassinate', name: 'Kill Shot', description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 9999, healthThreshold: 20 }] },
  // ── Ranger ─────────────────────────────────────────────────────────────────
  { id: 'arrow',    slug: 'arrow',    name: 'Arrow',          description: '', targetingType: 'single', range: 6, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 12 }] },
  { id: 'piercing', slug: 'piercing', name: 'Piercing Shot',  description: '', targetingType: 'line',   range: 6, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 12 }] },
  // ── Sorcerer ───────────────────────────────────────────────────────────────
  { id: 'bolt', slug: 'bolt', name: 'Arcane Bolt', description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10 }] },
  { id: 'ffh',  slug: 'ffh',  name: 'Firestorm',   description: '', targetingType: 'aoe',    range: 3, areaRadius: 1, cooldownTurns: 99, isSpecial: true,  isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 14 }] },
  // ── Warlock ────────────────────────────────────────────────────────────────
  { id: 'eldritch', slug: 'eldritch', name: 'Demon Blast', description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: true, effects: [{ type: 'damage', formula: 'flat', value: 9  }] },
  { id: 'fear',     slug: 'fear',     name: 'Fear',        description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 3 }, { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 }] },
  // ── Wizard ─────────────────────────────────────────────────────────────────
  { id: 'missile', slug: 'missile', name: 'Ice Blast', description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0,  isSpecial: false, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8  }] },
  { id: 'freeze',  slug: 'freeze',  name: 'Freeze',    description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isSpecial: true,  isUnblockable: true,  effects: [{ type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 2 }] },
];

export const UNIT_DEFS: Record<string, UnitDefinition> = {
  fighter:   { id: 'fighter',   slug: 'fighter',   name: 'Fighter',   maxHealth: 42, armorClass: 17, movementRange: 3, abilities: ['sword', 'second_wind'], passives: [], unlockLevel: 1, assetKey: 'unit_fighter',   isActive: true },
  barbarian: { id: 'barbarian', slug: 'barbarian', name: 'Barbarian', maxHealth: 45, armorClass: 15, movementRange: 3, abilities: ['strike', 'whirlwind'],  passives: [], unlockLevel: 1, assetKey: 'unit_barbarian', isActive: true },
  ranger:    { id: 'ranger',    slug: 'ranger',    name: 'Ranger',    maxHealth: 38, armorClass: 16, movementRange: 3, abilities: ['arrow', 'piercing'],    passives: [], unlockLevel: 1, assetKey: 'unit_ranger',    isActive: true },
  rogue:     { id: 'rogue',     slug: 'rogue',     name: 'Rogue',     maxHealth: 35, armorClass: 15, movementRange: 4, abilities: ['twin', 'assassinate'],  passives: [], unlockLevel: 1, assetKey: 'unit_rogue',     isActive: true },
  cleric:    { id: 'cleric',    slug: 'cleric',    name: 'Cleric',    maxHealth: 40, armorClass: 16, movementRange: 3, abilities: ['mace', 'heal'],         passives: [], unlockLevel: 3, assetKey: 'unit_cleric',    isActive: true },
  wizard:    { id: 'wizard',    slug: 'wizard',    name: 'Wizard',    maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['missile', 'freeze'],    passives: [], unlockLevel: 3, assetKey: 'unit_wizard',    isActive: true },
  sorcerer:  { id: 'sorcerer',  slug: 'sorcerer',  name: 'Sorcerer',  maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['bolt', 'ffh'],          passives: [], unlockLevel: 3, assetKey: 'unit_sorcerer',  isActive: true },
  warlock:   { id: 'warlock',   slug: 'warlock',   name: 'Warlock',   maxHealth: 32, armorClass: 15, movementRange: 3, abilities: ['eldritch', 'fear'],     passives: [], unlockLevel: 3, assetKey: 'unit_warlock',   isActive: true },
};

export function buildAbilityMap(): Map<string, AbilityDefinition> {
  return new Map(ABILITY_DEFS.map(a => [a.slug, a]));
}
