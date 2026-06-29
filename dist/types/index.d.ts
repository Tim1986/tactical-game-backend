export type UUID = string;
export type ISOTimestamp = string;
export interface User {
    id: UUID;
    username: string;
    email: string;
    passwordHash: string;
    elo: number;
    accountXp: number;
    accountLevel: number;
    createdAt: ISOTimestamp;
    lastActiveAt: ISOTimestamp;
}
export interface PublicUser {
    id: UUID;
    username: string;
    elo: number;
    accountLevel: number;
}
export type Platform = 'ios' | 'android';
export interface PushToken {
    id: UUID;
    userId: UUID;
    token: string;
    platform: Platform;
    isActive: boolean;
    updatedAt: ISOTimestamp;
}
export type TargetingType = 'single' | 'aoe' | 'self' | 'line' | 'cone';
export type DamageType = 'physical' | 'magical' | 'true';
export type EffectTrigger = 'on_turn_start' | 'on_turn_end' | 'on_hit' | 'on_death';
export type AbilityEffectType = 'damage' | 'heal' | 'apply_status' | 'remove_status' | 'push' | 'pull' | 'teleport' | 'modify_cooldown';
export interface DamageEffect {
    type: 'damage';
    formula: 'flat';
    value: number;
    damageType: DamageType;
}
export interface HealEffect {
    type: 'heal';
    formula: 'flat';
    value: number;
}
export interface ApplyStatusEffect {
    type: 'apply_status';
    statusSlug: string;
    stacks: number;
    durationTurns: number;
}
export interface RemoveStatusEffect {
    type: 'remove_status';
    statusSlug: string;
}
export interface PushEffect {
    type: 'push';
    direction: 'away_from_caster';
    distance: number;
}
export interface PullEffect {
    type: 'pull';
    direction: 'toward_caster';
    distance: number;
}
export interface ModifyCooldownEffect {
    type: 'modify_cooldown';
    abilitySlug: string;
    delta: number;
}
export type AbilityEffect = DamageEffect | HealEffect | ApplyStatusEffect | RemoveStatusEffect | PushEffect | PullEffect | ModifyCooldownEffect;
export interface AbilityDefinition {
    id: UUID;
    slug: string;
    name: string;
    description: string;
    targetingType: TargetingType;
    range: number;
    areaRadius: number;
    cooldownTurns: number;
    effects: AbilityEffect[];
}
export interface StatusEffectDefinition {
    slug: string;
    name: string;
    description: string;
    trigger: EffectTrigger;
    effect: AbilityEffect;
    isStackable: boolean;
    maxStacks: number;
}
export interface PassiveDefinition {
    slug: string;
    name: string;
    description: string;
}
export interface UnitDefinition {
    id: UUID;
    slug: string;
    name: string;
    maxHealth: number;
    movementRange: number;
    abilities: string[];
    passives: string[];
    unlockLevel: number;
    assetKey: string;
    isActive: boolean;
}
export interface Team {
    id: UUID;
    userId: UUID;
    name: string;
    unitIds: [UUID, UUID, UUID, UUID];
    placement: Array<{
        x: number;
        y: number;
    }>;
    isActive: boolean;
    createdAt: ISOTimestamp;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface AccessTokenPayload {
    sub: UUID;
    username: string;
    iat: number;
    exp: number;
}
export interface RefreshTokenPayload {
    sub: UUID;
    tokenVersion: number;
    iat: number;
    exp: number;
}
export interface ApiSuccess<T> {
    success: true;
    data: T;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: UUID;
                username: string;
            };
        }
    }
}
//# sourceMappingURL=index.d.ts.map