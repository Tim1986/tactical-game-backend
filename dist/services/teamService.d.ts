import { Team, UnitCustomization } from '../types/index.js';
export declare class TeamValidationError extends Error {
    constructor(message: string);
}
export declare class TeamNotFoundError extends Error {
    constructor();
}
export declare function getUserTeams(userId: string): Promise<Team[]>;
export declare function getTeam(teamId: string, userId: string): Promise<Team | null>;
export interface CreateTeamInput {
    name: string;
    unitIds: string[];
    userId: string;
    accountLevel: number;
    placement?: Array<{
        x: number;
        y: number;
    }>;
    unitCustomizations?: UnitCustomization[];
}
export declare function createTeam(input: CreateTeamInput): Promise<Team>;
export interface UpdateTeamInput {
    teamId: string;
    userId: string;
    accountLevel: number;
    name?: string;
    unitIds?: string[];
    placement?: Array<{
        x: number;
        y: number;
    }>;
    unitCustomizations?: UnitCustomization[];
}
export declare function updateTeam(input: UpdateTeamInput): Promise<Team>;
export declare function deleteTeam(teamId: string, userId: string): Promise<void>;
//# sourceMappingURL=teamService.d.ts.map