/**
 * gameData.ts — Single source of truth for all unit and ability definitions.
 *
 * This file is the ONLY place balance values should be changed.
 * Both seed.ts and ai/defaultData.ts import from here — updates
 * flow automatically to the DB (via seed) and the AI sim.
 *
 * Slug conventions: use the real in-game slugs (not namespaced).
 */
export declare const ABILITY_DEFS: readonly [{
    readonly slug: "strike";
    readonly name: "Axe";
    readonly description: "Deals 13 damage to an adjacent enemy.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 13;
    }];
}, {
    readonly slug: "whirlwind";
    readonly name: "Whirlwind";
    readonly description: "Deals 20 blockable damage to all units directly adjacent, including allies.";
    readonly targeting_type: "aoe";
    readonly range: 0;
    readonly area_radius: 1;
    readonly area_shape: "orthogonal";
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 20;
    }];
}, {
    readonly slug: "shockwave";
    readonly name: "Ground Slam";
    readonly description: "Deals 13 unblockable damage to all units directly adjacent, including allies, and roots them for 2 turns.";
    readonly targeting_type: "aoe";
    readonly range: 0;
    readonly area_radius: 1;
    readonly area_shape: "orthogonal";
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 13;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "roar";
    readonly name: "Leaping Slam";
    readonly description: "Leap to a tile up to 2 away (even if rooted, and straight over anything in the way), then deal 3 unblockable damage to every unit around where you land, allies included, and weaken them for 2 turns. You land unharmed in the centre.";
    readonly targeting_type: "aoe";
    readonly range: 2;
    readonly area_radius: 1;
    readonly area_shape: "ring";
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "move_self";
    }, {
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 3;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "weakened";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "mace";
    readonly name: "Mace";
    readonly description: "A heavy blow with a holy mace. Deals 11 damage.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 11;
    }];
}, {
    readonly slug: "heal";
    readonly name: "Heal";
    readonly description: "Restores 27 health to yourself or an ally within 2 tiles.";
    readonly targeting_type: "single";
    readonly range: 2;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "heal";
        readonly formula: "flat";
        readonly value: 27;
    }];
}, {
    readonly slug: "ward";
    readonly name: "Ward";
    readonly description: "Grants an ally within 3 tiles +16 maximum health for the rest of the match, and a shield that fully negates the next hit against them (even an unblockable one).";
    readonly targeting_type: "single";
    readonly range: 3;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "grant_max_health";
        readonly value: 16;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "shielded";
        readonly stacks: 1;
        readonly durationTurns: 3;
    }];
}, {
    readonly slug: "purify";
    readonly name: "Purify";
    readonly description: "Removes Frozen, Rooted and Burning from yourself or an ally within 3 tiles, and restores 19 health.";
    readonly targeting_type: "single";
    readonly range: 3;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "remove_status";
        readonly statusSlug: "frozen";
    }, {
        readonly type: "remove_status";
        readonly statusSlug: "rooted";
    }, {
        readonly type: "remove_status";
        readonly statusSlug: "burning";
    }, {
        readonly type: "heal";
        readonly formula: "flat";
        readonly value: 19;
    }];
}, {
    readonly slug: "sword";
    readonly name: "Sword";
    readonly description: "Deals 11 damage to an adjacent enemy.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 11;
    }];
}, {
    readonly slug: "second_wind";
    readonly name: "First Aid";
    readonly description: "Restores 18 health to yourself.";
    readonly targeting_type: "self";
    readonly range: 0;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "heal";
        readonly formula: "flat";
        readonly value: 18;
    }];
}, {
    readonly slug: "concussive";
    readonly name: "Concussive Blow";
    readonly description: "Deals 6 unblockable damage to an adjacent enemy and freezes them for 1 turn.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 6;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "shield_bash";
    readonly name: "Shield Bash";
    readonly description: "Deals 16 unblockable damage to an adjacent enemy and knocks them 2 tiles back.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 16;
    }, {
        readonly type: "push";
        readonly direction: "away_from_caster";
        readonly distance: 2;
    }];
}, {
    readonly slug: "twin";
    readonly name: "Twin Strike";
    readonly description: "Two quick strikes against an adjacent enemy, 8 damage each. Each blow is rolled separately.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly is_multi_hit: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }, {
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }];
}, {
    readonly slug: "assassinate";
    readonly name: "Kill Shot";
    readonly description: "Instantly kills an adjacent enemy at or below 22 health. Fails if the target is above that.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 9999;
        readonly healthThreshold: 22;
    }];
}, {
    readonly slug: "dagger_toss";
    readonly name: "Dagger Toss";
    readonly description: "Throws a dagger for 16 unblockable damage at an enemy within 4 tiles.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 16;
    }];
}, {
    readonly slug: "expose";
    readonly name: "Expose Weakness";
    readonly description: "Deals 16 unblockable damage to an adjacent enemy and exposes them for 3 turns — an exposed unit cannot dodge.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 16;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "exposed";
        readonly stacks: 1;
        readonly durationTurns: 3;
    }];
}, {
    readonly slug: "arrow";
    readonly name: "Arrow";
    readonly description: "Deals 11 damage from up to 6 tiles away.";
    readonly targeting_type: "single";
    readonly range: 6;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 11;
    }];
}, {
    readonly slug: "piercing";
    readonly name: "Piercing Shot";
    readonly description: "Deals 12 blockable damage to every unit in a straight line (including allies), up to 6 tiles.";
    readonly targeting_type: "line";
    readonly range: 6;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 12;
    }];
}, {
    readonly slug: "pinning";
    readonly name: "Pinning Shot";
    readonly description: "Deals 7 blockable damage to an enemy within 6 tiles and roots them for 2 turns.";
    readonly targeting_type: "single";
    readonly range: 6;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 7;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "longshot";
    readonly name: "Longshot";
    readonly description: "Deals 15 blockable damage to an enemy up to 8 tiles away.";
    readonly targeting_type: "single";
    readonly range: 8;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 15;
    }];
}, {
    readonly slug: "bolt";
    readonly name: "Flame Blast";
    readonly description: "Deals 10 damage to an enemy within 5 tiles.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }];
}, {
    readonly slug: "ffh";
    readonly name: "Ring of Fire";
    readonly description: "Deals 14 unblockable damage in a ring around any tile within 5, allies included. The centre tile is spared.";
    readonly targeting_type: "aoe";
    readonly range: 5;
    readonly area_radius: 1;
    readonly area_shape: "ring";
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 14;
    }];
}, {
    readonly slug: "flame_jet";
    readonly name: "Flame Jet";
    readonly description: "Deals 16 unblockable damage to an enemy within 4 tiles.";
    readonly targeting_type: "line";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 16;
    }];
}, {
    readonly slug: "ignite";
    readonly name: "Ignite";
    readonly description: "Deals 5 unblockable damage to an enemy within 5 tiles and sets them burning for 3 turns.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 5;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "burning";
        readonly stacks: 1;
        readonly durationTurns: 3;
    }];
}, {
    readonly slug: "eldritch";
    readonly name: "Demon Blast";
    readonly description: "Deals 11 damage to an enemy within 4 tiles.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 11;
    }];
}, {
    readonly slug: "fear";
    readonly name: "Fear";
    readonly description: "Drives an enemy within 4 tiles 3 tiles away from you and roots them for 2 turns.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "push";
        readonly direction: "away_from_caster";
        readonly distance: 3;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "grasp";
    readonly name: "Shadow Grasp";
    readonly description: "Deals 9 unblockable damage to an enemy within 5 tiles, drags them 3 tiles toward you and roots them for 1 turn.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 9;
    }, {
        readonly type: "pull";
        readonly direction: "toward_caster";
        readonly distance: 3;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "drain";
    readonly name: "Essence Drain";
    readonly description: "Drains 10 unblockable health from an enemy within 4 tiles, restoring 8 health to yourself.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "lifesteal";
        readonly formula: "flat";
        readonly value: 10;
        readonly healValue: 8;
    }];
}, {
    readonly slug: "missile";
    readonly name: "Ice Blast";
    readonly description: "Deals 10 damage to an enemy within 5 tiles.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }];
}, {
    readonly slug: "freeze";
    readonly name: "Freeze";
    readonly description: "Freezes an enemy within 4 tiles for 2 turns. A frozen unit cannot move or act.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "blizzard";
    readonly name: "Ring of Frost";
    readonly description: "Freezes every unit in a ring around any tile within 3 for 1 turn, allies included. The centre tile is spared.";
    readonly targeting_type: "aoe";
    readonly range: 3;
    readonly area_radius: 1;
    readonly area_shape: "ring";
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "cold_snap";
    readonly name: "Cold Snap";
    readonly description: "Deals 9 unblockable damage to an enemy within 5 tiles and freezes them for 1 turn.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 9;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}];
export interface PassiveOption {
    slug: string;
    name: string;
    description: string;
    stat?: 'maxHealth' | 'armorClass' | 'movementRange';
    value?: number;
    passiveFlag?: string;
}
export declare const UNIT_DEFS: {
    slug: string;
    name: string;
    max_health: number;
    armor_class: number;
    movement_range: number;
    abilities: string[];
    passives: never[];
    special_options: string[];
    passive_options: PassiveOption[];
    unlock_level: number;
    asset_key: string;
    is_active: boolean;
}[];
//# sourceMappingURL=gameData.d.ts.map