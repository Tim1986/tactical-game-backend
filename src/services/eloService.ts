const K_FACTOR = 32;

export interface EloResult {
  newWinnerElo: number;
  newLoserElo: number;
  winnerDelta: number;
  loserDelta: number;
}

export function calculateElo(winnerElo: number, loserElo: number): EloResult {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
  const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserDelta = Math.round(K_FACTOR * (0 - expectedLoser));
  return { newWinnerElo: winnerElo + winnerDelta, newLoserElo: Math.max(100, loserElo + loserDelta), winnerDelta, loserDelta };
}

export const XP_PER_MATCH = 50;
export const XP_WIN_BONUS = 100;

export function calculateXpGain(won: boolean): number {
  return won ? XP_PER_MATCH + XP_WIN_BONUS : XP_PER_MATCH;
}

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 200) + 1;
}
