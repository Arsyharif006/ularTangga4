import type { BoardConfig } from '@/types/game';

/**
 * Board helpers and human-friendly config
 *
 * Row/Col coordinate system used here:
 * - `row` is 1..10 with 1 = bottom row, 10 = top row
 * - `col` is 1..10 with 1 = left column, 10 = right column
 *
 * The board uses classic zig-zag numbering:
 * - Row 1: left -> right  (1..10)
 * - Row 2: right -> left  (11..20)
 * - Row 3: left -> right  (21..30)
 * - and so on.
 *
 * Editing the RC arrays below is easier than editing raw position numbers.
 * The module converts RC pairs to numeric positions and exports a
 * `boardConfig` object compatible with the rest of the codebase.
 */

import { posFromRowCol, BOARD_GRID as GRID } from '@/lib/boardUtils';

import classicBoardConfig from './boards/classic';
import winterBoardConfig from './boards/winter';
import forestBoardConfig from './boards/forest';
import lavaBoardConfig from './boards/lava';
import spaceBoardConfig from './boards/space';

export const BOARD_CONFIGS: Record<string, BoardConfig> = {
  classic: classicBoardConfig,
  winter: winterBoardConfig,
  forest: forestBoardConfig,
  lava: lavaBoardConfig,
  space: spaceBoardConfig,
};

// Backwards compatibility: default boardConfig points to classic
export const boardConfig: BoardConfig = classicBoardConfig;

// Optional: export a human-readable grid (top-to-bottom rows) to help
// maintainers visualize positions while editing.
export const BOARD_GRID = GRID;
export { posFromRowCol };

