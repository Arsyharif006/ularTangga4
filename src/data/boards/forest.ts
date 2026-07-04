import type { BoardConfig } from '@/types/game';

export const forestBoardConfig: BoardConfig = {
  snakes: [
    { head: 96, tail: 65 },
    { head: 94, tail: 71 },
    { head: 80, tail: 61 },
    { head: 73, tail: 55 },
    { head: 68, tail: 31 },
    { head: 15, tail: 7 },
  ],
  ladders: [
    { bottom: 9, top: 28 },
    { bottom: 11, top: 46 },
    { bottom: 13, top: 26 },
    { bottom: 19, top: 57 },
    { bottom: 20, top: 42 },
    { bottom: 45, top: 64 },
  ],
  mysteryBoxes: [
    { position: 8 },
    { position: 23 },
    { position: 34 },
    { position: 48 },
    { position: 53 },
    { position: 63 },
    { position: 72 },
    { position: 83 },
    { position: 91 },
  ],
};

export default forestBoardConfig;