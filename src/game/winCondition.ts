import { MatchState } from '../types/matchState.js';

export interface WinCheckResult {
  isOver: boolean;
  winnerId: string | null;
  loserId: string | null;
}

export function checkWinCondition(state: MatchState, playerOneId: string, playerTwoId: string): WinCheckResult {
  const p1Alive = state.units.some((u) => u.ownerPlayerId === playerOneId && u.isAlive);
  const p2Alive = state.units.some((u) => u.ownerPlayerId === playerTwoId && u.isAlive);
  if (!p1Alive && !p2Alive) return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
  if (!p1Alive) return { isOver: true, winnerId: playerTwoId, loserId: playerOneId };
  if (!p2Alive) return { isOver: true, winnerId: playerOneId, loserId: playerTwoId };
  return { isOver: false, winnerId: null, loserId: null };
}
