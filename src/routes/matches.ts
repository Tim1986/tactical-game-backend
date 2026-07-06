import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as matchService from '../services/matchService.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, Errors } from '../utils/response.js';

export const matchRouter = Router();
matchRouter.use(requireAuth);

const BoardPositionSchema = z.object({ x: z.number().int().min(0).max(7), y: z.number().int().min(0).max(7) });
const MoveActionSchema = z.object({ type: z.literal('MOVE'), unitInstanceId: z.string().uuid(), destination: BoardPositionSchema });
const UseAbilityActionSchema = z.object({ type: z.literal('USE_ABILITY'), unitInstanceId: z.string().uuid(), abilitySlug: z.string().min(1), target: BoardPositionSchema });
const EndTurnActionSchema = z.object({ type: z.literal('END_TURN') });
const ChargeActionSchema = z.object({ type: z.literal('CHARGE'), unitInstanceId: z.string().uuid(), destination: BoardPositionSchema });
const TurnActionSchema = z.discriminatedUnion('type', [MoveActionSchema, ChargeActionSchema, UseAbilityActionSchema, EndTurnActionSchema]);
const SubmitTurnSchema = z.object({ actions: z.array(TurnActionSchema).min(1).max(10) });

matchRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const matches = await matchService.getUserMatches(req.user!.id);
  const summary = matches.map((m) => ({ id: m.id, playerOneId: m.player_one_id, playerTwoId: m.player_two_id, playerOneUsername: m.player_one_username, playerTwoUsername: m.player_two_username, status: m.status, activePlayerId: m.active_player_id, turnNumber: m.turn_number, turnDeadline: m.turn_deadline, winnerId: m.winner_id, eloDeltaP1: m.elo_delta_p1, eloDeltaP2: m.elo_delta_p2, createdAt: m.created_at, updatedAt: m.updated_at, completedAt: m.completed_at, isPve: m.is_pve, isMyTurn: m.active_player_id === req.user!.id && m.status === 'active' }));
  sendSuccess(res, { matches: summary });
});

matchRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { match, playerOneUsername, playerTwoUsername } = await matchService.getMatchWithPlayers(req.params.id, req.user!.id);
    sendSuccess(res, { id: match.id, playerOneId: match.player_one_id, playerTwoId: match.player_two_id, playerOneUsername, playerTwoUsername, status: match.status, activePlayerId: match.active_player_id, turnNumber: match.turn_number, turnDeadline: match.turn_deadline, winnerId: match.winner_id, matchState: match.match_state, lastTurnEvents: match.last_turn_events ?? [], eloDeltaP1: match.elo_delta_p1, eloDeltaP2: match.elo_delta_p2, createdAt: match.created_at, completedAt: match.completed_at, isMyTurn: match.active_player_id === req.user!.id && match.status === 'active', isPve: match.is_pve ?? false });
  } catch (err) {
    if (err instanceof matchService.MatchNotFoundError) { Errors.notFound(res, 'Match'); return; }
    if (err instanceof matchService.MatchAccessError) { Errors.forbidden(res); return; }
    throw err;
  }
});

matchRouter.post('/:id/turn', async (req: Request, res: Response): Promise<void> => {
  const parsed = SubmitTurnSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, 'Invalid turn data', parsed.error.flatten()); return; }
  try {
    const { result, match } = await matchService.submitTurn(req.params.id, req.user!.id, parsed.data.actions);
    sendSuccess(res, { events: result.events, matchOver: result.matchOver, winnerId: result.winnerId, updatedState: result.updatedState, match: { id: match.id, status: match.status, activePlayerId: match.active_player_id, turnNumber: match.turn_number, turnDeadline: match.turn_deadline, winnerId: match.winner_id, isPve: match.is_pve ?? false } });
  } catch (err) {
    if (err instanceof matchService.MatchNotFoundError) { Errors.notFound(res, 'Match'); return; }
    if (err instanceof matchService.MatchAccessError) { Errors.forbidden(res); return; }
    if (err instanceof matchService.MatchNotActiveError) { Errors.conflict(res, 'This match is no longer active'); return; }
    if (err instanceof matchService.TurnValidationError) { Errors.validation(res, err.message); return; }
    throw err;
  }
});

matchRouter.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await matchService.getTurnHistory(req.params.id, req.user!.id);
    sendSuccess(res, { history });
  } catch (err) {
    if (err instanceof matchService.MatchNotFoundError) { Errors.notFound(res, 'Match'); return; }
    if (err instanceof matchService.MatchAccessError) { Errors.forbidden(res); return; }
    throw err;
  }
});

const CreatePveMatchSchema = z.object({ myTeamId: z.string().uuid(), fableTeamId: z.string().uuid() });

matchRouter.post('/pve', async (req: Request, res: Response): Promise<void> => {
  const parsed = CreatePveMatchSchema.safeParse(req.body);
  if (!parsed.success) { Errors.validation(res, parsed.error.message); return; }
  const { myTeamId, fableTeamId } = parsed.data;
  const { matchId, state } = await matchService.createPveMatch(req.user!.id, myTeamId, fableTeamId);
  sendSuccess(res, { matchId, state });
});

matchRouter.post('/:id/forfeit', async (req: Request, res: Response): Promise<void> => {
  try {
    await matchService.forfeitMatch(req.params.id, req.user!.id);
    sendSuccess(res, { message: 'Match forfeited' });
  } catch (err) {
    if (err instanceof matchService.MatchNotFoundError) { Errors.notFound(res, 'Match'); return; }
    if (err instanceof matchService.MatchAccessError) { Errors.forbidden(res); return; }
    if (err instanceof matchService.MatchNotActiveError) { Errors.conflict(res, 'This match is no longer active'); return; }
    throw err;
  }
});
