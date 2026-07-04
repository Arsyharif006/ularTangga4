import type { BoardConfig } from '@/types/game';

export const spaceBoardConfig: BoardConfig = {
  snakes: [
    { head: 94, tail: 56 },
    { head: 86, tail: 58 },
    { head: 74, tail: 55 },
    { head: 54, tail: 20 },
    { head: 49, tail: 34 },
    { head: 42, tail: 22 },
  ],
  ladders: [
    { bottom: 5, top: 25 },
    { bottom: 9, top: 29 },
    { bottom: 13, top: 46 },
    { bottom: 53, top: 71 },
    { bottom: 73, top: 88 },
    { bottom: 78, top: 99 },
  ],
  mysteryBoxes: [
    { position: 4 },
    { position: 31 },
    { position: 37 },
    { position: 40 },
    { position: 61 },
    { position: 64 },
    { position: 70 },
    { position: 84 },
    { position: 97 },
  ],
};

export default spaceBoardConfig;