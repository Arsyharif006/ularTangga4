import { Player, SnakeConfig, LadderConfig } from '@/types/game';

export const calculateNewPosition = (currentPosition: number, diceValue: number): number => {
  const next = currentPosition + diceValue;
  // Exact finish at 100 or bounce back? The PRD doesn't explicitly state bounce back.
  // Standard rule: first to reach 100 wins. Let's cap at 100 for simplicity.
  if (next > 100) return 100;
  return next;
};

export const getPlayersInRadius = (players: Player[], currentPlayerId: number, currentPos: number, radius: number): Player[] => {
  return players.filter(
    (p) => p.id !== currentPlayerId && p.position > 0 && Math.abs(p.position - currentPos) <= radius
  );
};

export const isValidBombPlacement = (pos: number, snakes: SnakeConfig[], ladders: LadderConfig[]): boolean => {
  if (pos <= 1 || pos >= 100) return false;
  
  // Check if snake head or tail
  const onSnake = snakes.some(s => s.head === pos || s.tail === pos);
  if (onSnake) return false;

  // Check if ladder top or bottom
  const onLadder = ladders.some(l => l.bottom === pos || l.top === pos);
  if (onLadder) return false;

  return true;
};
