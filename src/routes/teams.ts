import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as teamService from '../services/teamService.js';
import * as userService from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';
import { FABLE_TEAMS } from '../config/fableTeams.js';
import { isCorner } from '../game/boardUtils.js';

export const teamRouter = Router();

teamRouter.use(requireAuth);

// ---------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------

// x max is 2, not 3: the deployment zone is the left three COLUMNS (x 0–2), which
// is what the team builder enforces and what planPlacement()/mirrorPlacement()
// assume. Accepting x=3 let an API caller save a team deployed mid-board — and a
// mirrored P2 team at x=4, right on the human zone's edge.
// The zone rule and the board's SHAPE are separate constraints. x<=2 alone still
// admitted (0,0) and (0,7) — two of the four removed corner tiles — so a saved
// team could deploy a unit onto a tile the board does not have (QA F-20).
const PlacementSchema = z.array(
  z.object({ x: z.number().int().min(0).max(2), y: z.number().int().min(0).max(7) })
    .refine(p => !isCorner(p.x, p.y), { message: 'placement cannot be a removed corner tile' }),
).length(4).optional();

const UnitCustomizationSchema = z.object({
  specialSlug: z.string(),
  passiveSlug: z.string().nullable(),
});

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(40),
  unitIds: z.array(z.string().uuid()).length(4, 'Team must have exactly 4 units'),
  placement: PlacementSchema,
  unitCustomizations: z.array(UnitCustomizationSchema).length(4).optional(),
});

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  unitIds: z.array(z.string().uuid()).length(4).optional(),
  placement: PlacementSchema,
  unitCustomizations: z.array(UnitCustomizationSchema).length(4).optional(),
});

// Helper to get account level for the current user
async function getAccountLevel(userId: string): Promise<number> {
  const me = await userService.getMe(userId);
  return me?.accountLevel ?? 1;
}

// ---------------------------------------------------------------
// GET /teams
// ---------------------------------------------------------------
teamRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const teams = await teamService.getUserTeams(req.user!.id);
  sendSuccess(res, { teams });
});

// ---------------------------------------------------------------
// GET /teams/fable — Fable's own rosters, for the "Fable's Own Roster"
// picker. Static config, not user data, so no per-user query. Declared
// before any '/:id' route so 'fable' is never read as an id.
// ---------------------------------------------------------------
teamRouter.get('/fable', async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, {
    teams: FABLE_TEAMS.map((t) => ({
      id: t.id,
      name: t.name,
      style: t.style,
      slugs: t.slugs,
    })),
  });
});

// ---------------------------------------------------------------
// POST /teams
// ---------------------------------------------------------------
teamRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid team data', parsed.error.flatten());
    return;
  }

  const accountLevel = await getAccountLevel(req.user!.id);

  try {
    const team = await teamService.createTeam({
      ...parsed.data,
      userId: req.user!.id,
      accountLevel,
    });
    sendSuccess(res, { team }, 201);
  } catch (err) {
    if (err instanceof teamService.TeamValidationError) {
      Errors.validation(res, err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// PUT /teams/:id
// ---------------------------------------------------------------
teamRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = UpdateTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    Errors.validation(res, 'Invalid team data', parsed.error.flatten());
    return;
  }

  const accountLevel = await getAccountLevel(req.user!.id);

  try {
    const team = await teamService.updateTeam({
      teamId: req.params.id,
      userId: req.user!.id,
      accountLevel,
      ...parsed.data,
    });
    sendSuccess(res, { team });
  } catch (err) {
    if (err instanceof teamService.TeamNotFoundError) {
      Errors.notFound(res, 'Team');
      return;
    }
    if (err instanceof teamService.TeamValidationError) {
      Errors.validation(res, err.message);
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------
// DELETE /teams/:id
// ---------------------------------------------------------------
teamRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await teamService.deleteTeam(req.params.id, req.user!.id);
    sendSuccess(res, { message: 'Team deleted' });
  } catch (err) {
    if (err instanceof teamService.TeamNotFoundError) {
      Errors.notFound(res, 'Team');
      return;
    }
    throw err;
  }
});
