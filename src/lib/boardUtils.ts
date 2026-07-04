import type { BoardCoordinate } from '@/types/game';

// The board is 10x10, so 100 cells
export const BOARD_SIZE = 10;
export const TOTAL_CELLS = 100;

/**
 * Converts a cell number (1-100) to its logical row and column on the board
 * using boustrophedon numbering (snaking path).
 * Row 0 is the bottom row. Col 0 is the left-most column.
 */
export function getBoardCoordinate(cellNumber: number): BoardCoordinate {
  // Invalid numbers default to outside the board or start
  if (cellNumber < 1) return { row: 0, col: -1 };
  if (cellNumber > TOTAL_CELLS) return { row: BOARD_SIZE - 1, col: 0 }; // past 100 defaults to 100

  // 0-indexed cell internally
  const index = cellNumber - 1;

  // Row from bottom (0 to 9)
  const row = Math.floor(index / BOARD_SIZE);

  // Column calculation based on snaking pattern
  // Even rows (0, 2, 4...) go left to right: col = index % 10
  // Odd rows (1, 3, 5...) go right to left: col = 9 - (index % 10)
  let col = index % BOARD_SIZE;
  if (row % 2 !== 0) {
    col = BOARD_SIZE - 1 - col;
  }

  return { row, col };
}

/**
 * Get coordinates for CSS positioning (top and left percentages)
 */
export function getPixelCoordinate(cellNumber: number): { top: string; left: string } {
  if (cellNumber < 1) {
    // Return off-screen or start position
    return { top: '90%', left: '-10%' };
  }
  
  const coord = getBoardCoordinate(cellNumber);
  
  // top% = (BOARD_SIZE - 1 - row) * (100 / BOARD_SIZE)
  const topPercent = (BOARD_SIZE - 1 - coord.row) * (100 / BOARD_SIZE);
  
  // left% = col * (100 / BOARD_SIZE)
  const leftPercent = coord.col * (100 / BOARD_SIZE);
  
  return {
    top: `${topPercent}%`,
    left: `${leftPercent}%`
  };
}

/**
 * Helper: convert 1-based row/col to board cell number (1..100)
 * row: 1..10 (1 = bottom), col: 1..10 (1 = left)
 */
export function posFromRowCol(row: number, col: number): number {
  if (row < 1 || row > BOARD_SIZE || col < 1 || col > BOARD_SIZE) {
    throw new Error(`Invalid row/col: ${row},${col}`);
  }
  const base = (row - 1) * BOARD_SIZE;
  if (row % 2 === 1) return base + col;
  return base + (BOARD_SIZE + 1 - col);
}

export const BOARD_GRID: number[][] = (() => {
  const grid: number[][] = [];
  for (let r = BOARD_SIZE; r >= 1; r--) {
    const row: number[] = [];
    for (let c = 1; c <= BOARD_SIZE; c++) {
      row.push(posFromRowCol(r, c));
    }
    grid.push(row);
  }
  return grid;
})();

export default posFromRowCol;
