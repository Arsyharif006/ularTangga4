import type { BoardConfig } from '@/types/game';

export const lavaBoardConfig: BoardConfig = {
  snakes: [
    { head: 95, tail: 61 },
    { head: 93, tail: 85 },
    { head: 77, tail: 53 },
    { head: 63, tail: 30 },
    { head: 35, tail: 15 },
    { head: 29, tail: 11 },
  ],
  ladders: [
    { bottom: 9, top: 27 },
    { bottom: 18, top: 44 },
    { bottom: 23, top: 39 },
    { bottom: 48, top: 69 },
    { bottom: 50, top: 72 },
    { bottom: 67, top: 92 },
  ],
  mysteryBoxes: [
    { position: 2 },
    { position: 5 },
    { position: 36 },
    { position: 56 },
    { position: 59 },
    { position: 60 },
    { position: 79 },
    { position: 81 },
    { position: 82 },
  ],
};

export default lavaBoardConfig;