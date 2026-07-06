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
    readonly name: "Strike";
    readonly description: "A powerful melee blow. Deals 15 damage.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 15;
    }];
}, {
    readonly slug: "whirlwind";
    readonly name: "Whirlwind";
    readonly description: "Deals 15 damage to all adjacent units (including allies). Can be blocked.";
    readonly targeting_type: "aoe";
    readonly range: 0;
    readonly area_radius: 1;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 15;
    }];
}, {
    readonly slug: "shockwave";
    readonly name: "Shockwave";
    readonly description: "Deals 8 unblockable damage to all adjacent units and knocks them 2 tiles back.";
    readonly targeting_type: "aoe";
    readonly range: 0;
    readonly area_radius: 1;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }, {
        readonly type: "push";
        readonly direction: "away_from_caster";
        readonly distance: 2;
    }];
}, {
    readonly slug: "roar";
    readonly name: "Roar";
    readonly description: "Weakens all enemies within 2 tiles, reducing their outgoing damage for 2 turns. Unblockable.";
    readonly targeting_type: "aoe";
    readonly range: 0;
    readonly area_radius: 2;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly exclude_allies: true;
    readonly effects: readonly [{
        readonly type: "apply_status";
        readonly statusSlug: "weakened";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "mace";
    readonly name: "Mace";
    readonly description: "A heavy blow with a holy mace. Deals 8 damage.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }];
}, {
    readonly slug: "heal";
    readonly name: "Heal";
    readonly description: "Restores 25 HP to an adjacent ally.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "heal";
        readonly formula: "flat";
        readonly value: 25;
    }];
}, {
    readonly slug: "ward";
    readonly name: "Ward";
    readonly description: "Shields an ally within 2 tiles, fully negating the next hit against them (including unblockable attacks).";
    readonly targeting_type: "single";
    readonly range: 2;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "apply_status";
        readonly statusSlug: "shielded";
        readonly stacks: 1;
        readonly durationTurns: 3;
    }];
}, {
    readonly slug: "purify";
    readonly name: "Purify";
    readonly description: "Cleanses frozen, rooted, and burning from an ally within 2 tiles, then heals them for 10.";
    readonly targeting_type: "single";
    readonly range: 2;
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
        readonly value: 10;
    }];
}, {
    readonly slug: "sword";
    readonly name: "Strike";
    readonly description: "A disciplined sword strike. Deals 10 damage.";
    readonly targeting_type: "single";
    readonly range: 1;
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
    readonly slug: "second_wind";
    readonly name: "First Aid";
    readonly description: "Restores 20 HP to self.";
    readonly targeting_type: "self";
    readonly range: 0;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "heal";
        readonly formula: "flat";
        readonly value: 20;
    }];
}, {
    readonly slug: "concussive";
    readonly name: "Concussive Blow";
    readonly description: "A heavy strike dealing 8 damage and dazing the target, freezing them for 1 turn. Can be blocked.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "rescue";
    readonly name: "Rescue";
    readonly description: "Pulls an ally within 4 tiles 3 tiles toward you. Unblockable.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "pull";
        readonly direction: "toward_caster";
        readonly distance: 3;
    }];
}, {
    readonly slug: "twin";
    readonly name: "Twin Strike";
    readonly description: "Two rapid dagger strikes, 20 damage total.";
    readonly targeting_type: "single";
    readonly range: 1;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }, {
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }];
}, {
    readonly slug: "assassinate";
    readonly name: "Kill Shot";
    readonly description: "Kills an adjacent enemy at 18 HP or below. Unblockable. Fails silently if target is above threshold.";
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
        readonly healthThreshold: 18;
    }];
}, {
    readonly slug: "dagger_toss";
    readonly name: "Dagger Toss";
    readonly description: "Throws a dagger for 12 unblockable damage from up to 4 tiles away.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 12;
    }];
}, {
    readonly slug: "expose";
    readonly name: "Expose Weakness";
    readonly description: "Deals 6 unblockable damage and exposes the target, causing attacks against them to always hit for 2 turns.";
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
        readonly statusSlug: "exposed";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "arrow";
    readonly name: "Arrow";
    readonly description: "Deals 12 damage from up to 6 tiles away.";
    readonly targeting_type: "single";
    readonly range: 6;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 12;
    }];
}, {
    readonly slug: "piercing";
    readonly name: "Piercing Shot";
    readonly description: "Deals 12 damage to every unit in a straight line (including allies), up to 6 tiles. Can be blocked.";
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
    readonly description: "Deals 10 damage from up to 6 tiles away and roots the target for 2 turns. Can be blocked.";
    readonly targeting_type: "single";
    readonly range: 6;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
        readonly stacks: 1;
        readonly durationTurns: 2;
    }];
}, {
    readonly slug: "longshot";
    readonly name: "Longshot";
    readonly description: "Deals 12 damage from up to 8 tiles away. Can be blocked.";
    readonly targeting_type: "single";
    readonly range: 8;
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
    readonly slug: "bolt";
    readonly name: "Arcane Bolt";
    readonly description: "Deals 8 damage from up to 5 tiles away.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }];
}, {
    readonly slug: "ffh";
    readonly name: "Firestorm";
    readonly description: "Deals 14 unblockable damage to all units (including allies) in a 3×3 area centered on any tile within range 3.";
    readonly targeting_type: "aoe";
    readonly range: 3;
    readonly area_radius: 1;
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
    readonly description: "Deals 10 unblockable damage to every unit in a straight line (including allies), up to 4 tiles.";
    readonly targeting_type: "line";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }];
}, {
    readonly slug: "ignite";
    readonly name: "Ignite";
    readonly description: "Deals 6 unblockable damage and sets the target ablaze, dealing 5 damage per turn for 3 turns.";
    readonly targeting_type: "single";
    readonly range: 5;
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
        readonly statusSlug: "burning";
        readonly stacks: 1;
        readonly durationTurns: 3;
    }];
}, {
    readonly slug: "eldritch";
    readonly name: "Demon Blast";
    readonly description: "Deals 10 unblockable damage from up to 4 tiles away.";
    readonly targeting_type: "single";
    readonly range: 4;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }];
}, {
    readonly slug: "fear";
    readonly name: "Fear";
    readonly description: "Pushes an enemy 3 tiles away and roots them for 1 turn. Rooted units cannot move or charge.";
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
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "grasp";
    readonly name: "Eldritch Grasp";
    readonly description: "Pulls an enemy within 5 tiles 3 tiles toward you and roots them for 1 turn. Unblockable.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
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
    readonly name: "Life Drain";
    readonly description: "Deals 10 unblockable damage from up to 4 tiles away and heals you for 6.";
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
        readonly healValue: 6;
    }];
}, {
    readonly slug: "missile";
    readonly name: "Ice Blast";
    readonly description: "Deals 8 damage from up to 5 tiles away.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 0;
    readonly is_special: false;
    readonly is_unblockable: false;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 8;
    }];
}, {
    readonly slug: "freeze";
    readonly name: "Freeze";
    readonly description: "Freezes an enemy within range 4. Target loses its next 2 initiative turns. Unblockable.";
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
    readonly name: "Blizzard";
    readonly description: "Deals 4 unblockable damage and freezes every unit (including allies) in a 3×3 area within 3 tiles for 1 turn.";
    readonly targeting_type: "aoe";
    readonly range: 3;
    readonly area_radius: 1;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 4;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "frozen";
        readonly stacks: 1;
        readonly durationTurns: 1;
    }];
}, {
    readonly slug: "cold_snap";
    readonly name: "Cold Snap";
    readonly description: "Deals 10 unblockable damage from up to 5 tiles away and roots the target for 1 turn.";
    readonly targeting_type: "single";
    readonly range: 5;
    readonly area_radius: 0;
    readonly cooldown_turns: 99;
    readonly is_special: true;
    readonly is_unblockable: true;
    readonly effects: readonly [{
        readonly type: "damage";
        readonly formula: "flat";
        readonly value: 10;
    }, {
        readonly type: "apply_status";
        readonly statusSlug: "rooted";
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