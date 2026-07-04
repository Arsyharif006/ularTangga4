import type { BoardConfig } from '@/types/game';

export const winterBoardConfig: BoardConfig = {
  snakes: [
    { head: 93, tail: 55 },
    { head: 78, tail: 57 },
    { head: 73, tail: 35 },
    { head: 52, tail: 30 },
    { head: 47, tail: 13 },
    { head: 38, tail: 19 },
  ],
  ladders: [
    { bottom: 4, top: 37 },
    { bottom: 15, top: 36 },
    { bottom: 41, top: 60 },
    { bottom: 51, top: 69 },
    { bottom: 66, top: 76 },
    { bottom: 80, top: 98 },
  ],
  mysteryBoxes: [
    { position: 2 },
    { position: 7 },
    { position: 22 },
    { position: 27 },
    { position: 62 },
    { position: 67 },
    { position: 44 },
    { position: 87 },
    { position: 94 },
  ],
};

export default winterBoardConfig;