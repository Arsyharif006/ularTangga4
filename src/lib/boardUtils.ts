// ============================================================
// Board Utilities - Row/Col coordinate conversion
// ============================================================

/**
 * Convert row/col coordinates to a board position (1-100).
 *
 * Row/Col system:
 * - 
ow is 1..10 (1 = bottom, 10 = top)
 * - col is 1..10 (1 = left, 10 = right)
 *
 * Zig-zag numbering:
 * - Odd rows (1, 3, 5, ...): left -> right
 * - Even rows (2, 4, 6, ...): right -> left
 */
export function posFromRowCol(row: number, col: number): number {
  const isEvenRow = row % 2 === 0;
  const basePos = (row - 1) * 10;

  if (isEvenRow) {
    // Even row: right to left
    return basePos + (11 - col);
  } else {
    // Odd row: left to right
    return basePos + col;
  }
}

/**
 * Convert a board position (1-100) to row/col coordinates (0-based).
 * Used for rendering the board grid and calculating visual positions.
 *
 * Returns: { row: 0-9, col: 0-9 }
 */
export function getBoardCoordinate(position: number): { row: number; col: number } {
  const row = Math.floor((position - 1) / 10);
  const baseCol = (position - 1) % 10;

  // Even rows (0, 2, 4, ...): left to right
  // Odd rows (1, 3, 5, ...): right to left
  const col = row % 2 === 0 ? baseCol : 9 - baseCol;

  return { row, col };
}

/**
 * Generate a 10x10 grid representation for visualization.
 * Grid is ordered top-to-bottom (row 10 at top, row 1 at bottom).
 */
export const BOARD_GRID: number[][] = Array.from({ length: 10 }, (_, rowIndex) => {
  const row = 10 - rowIndex; // Top-to-bottom: row 10, 9, 8, ..., 1
  return Array.from({ length: 10 }, (_, colIndex) => {
    const col = colIndex + 1; // Left-to-right: col 1, 2, 3, ..., 10
    return posFromRowCol(row, col);
  });
});
