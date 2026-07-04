import type { BoardConfig } from '@/types/game';

export const classicBoardConfig: BoardConfig = {
  snakes: [
    { head: 93, tail: 55 },
    { head: 79, tail: 58 },
    { head: 90, tail: 53 },
    { head: 51, tail: 13 },
    { head: 45, tail: 34 },
    { head: 40, tail: 22 },
  ],
  ladders: [
    { bottom: 2, top: 17 },
    { bottom: 12, top: 30 },
    { bottom: 33, top: 67 },
    { bottom: 38, top: 57 },
    { bottom: 65, top: 97 },
    { bottom: 81, top: 99 },
  ],
  mysteryBoxes: [
    { position: 3 },
    { position: 6 },
    { position: 7 },
    { position: 9 },
    { position: 72 },
    { position: 83 },
    { position: 86 },
    { position: 87 },
    { position: 89 },
  ],
};

export default classicBoardConfig;