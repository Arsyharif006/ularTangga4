import { create } from 'zustand';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import playStepSound from '@/lib/audio/sfx';
import type { Player, GamePhase, DiceValue, Question, PlacedBomb, QuestionTheme, GameItem, BoardThemeName } from '@/types/game';
import { BOARD_THEMES } from '@/data/boardThemes';
import { ALL_QUESTIONS } from '@/data/questions';
import { ALL_ITEMS } from '@/data/items';
import { BOMB_PENALTY_STEPS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameStoreState {
  phase: GamePhase | 'golden_dice' | 'swap_position' | 'dice_rolling';
  players: Player[];
  currentPlayerIndex: number;
  diceValue: DiceValue | null;
  currentQuestion: Question | null;
  placedBombs: PlacedBomb[];
  winnerId: number | null;
  turnCount: number;
  usedQuestionIds: string[];
  theme: QuestionTheme;
  boardTheme: BoardThemeName;
  mysteryBoxItem: GameItem | null;
  hintActive: boolean;
  hintRemovedIndex: number | null;
  diceIsRolling: boolean;
  lastRollWasRemote: boolean;
  setLastRollWasRemote: (val: boolean) => void;
  freezeTimerPlayerId: number | null;
  movementStepsRemaining: number;
  strikeNotification: { playerId: number; itemName: string } | null;
  awardedItem: { playerId: number; item: GameItem } | null;
  awardContext: 'mystery' | 'strike' | null;
  pendingItemId: string | null;
  turnActionLock: boolean;
  isItemInUse: boolean;

  // Actions
  initGame: (players: Player[], theme: QuestionTheme, boardTheme?: BoardThemeName) => void;
  rollDice: (overrideValue?: DiceValue, isRemote?: boolean) => void;
  finishDiceRoll: () => void;
  movePlayerStep: () => void;
  handlePostMove: () => void;
  triggerMysteryBox: () => void;
  claimMysteryBox: () => void;
  closeAwardedItemModal: () => void;
  showQuestion: () => void;
  answerQuestion: (isCorrect: boolean) => void;
  nextTurn: () => void;
  useItem: (itemId: string, targetId?: number, position?: number) => void;
  awardItem: (playerId: number, item: GameItem) => void;
  setPhase: (phase: GameStoreState['phase']) => void;
  setTurnActionLock: (val: boolean) => void;
  setItemInUse: (val: boolean) => void;
  resetGame: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: 'setup',
  players: [],
  currentPlayerIndex: 0,
  diceValue: null,
  currentQuestion: null,
  placedBombs: [],
  winnerId: null,
  turnCount: 0,
  usedQuestionIds: [],
  theme: 'general',
  boardTheme: 'classic',
  mysteryBoxItem: null,
  hintActive: false,
  hintRemovedIndex: null,
  freezeTimerPlayerId: null,
  diceIsRolling: false,
  lastRollWasRemote: false,
  movementStepsRemaining: 0,
  strikeNotification: null,
  awardedItem: null,
  awardContext: null,
  pendingItemId: null,
  turnActionLock: false,
  isItemInUse: false,

  // ── initGame ───────────────────────────────────────────────────────────────
  initGame: (players, theme, boardTheme = 'classic') => {
    set({
      players,
      theme,
      boardTheme,
      phase: 'rolling',
      currentPlayerIndex: 0,
      diceValue: null,
      currentQuestion: null,
      placedBombs: [],
      winnerId: null,
      turnCount: 1,
      usedQuestionIds: [],
      mysteryBoxItem: null,
      hintActive: false,
      freezeTimerPlayerId: null,
      diceIsRolling: false,
      lastRollWasRemote: false,
      movementStepsRemaining: 0,
      strikeNotification: null,
      turnActionLock: false,
      isItemInUse: false,
    });
  },

  setLastRollWasRemote: (val) => set({ lastRollWasRemote: val }),

  // ── rollDice ───────────────────────────────────────────────────────────────
  rollDice: (overrideValue, isRemote = false) => {
    const { phase, players, currentPlayerIndex } = get();
    if (phase !== 'rolling' && phase !== 'golden_dice') return;
    if (!players?.length) return;
    if (currentPlayerIndex < 0 || currentPlayerIndex >= players.length) return;

    const newPlayers = [...players];
    const player = newPlayers[currentPlayerIndex];
    if (!player) return;

    newPlayers[currentPlayerIndex] = { ...player, previousPosition: player.position };

    set({ players: newPlayers, diceIsRolling: true, phase: 'dice_rolling', lastRollWasRemote: isRemote, turnActionLock: !isRemote });

    setTimeout(() => {
      const finalValue: DiceValue =
        overrideValue !== undefined && overrideValue !== null
          ? overrideValue
          : ((Math.floor(Math.random() * 6) + 1) as DiceValue);

      if (phase === 'golden_dice') {
        const fresh = get().players;
        const freshCopy = [...fresh];
        const p = freshCopy[currentPlayerIndex];
        const gIdx = p.inventory.findIndex((i) => i.type === 'golden_dice');
        if (gIdx !== -1) {
          const inv = [...p.inventory];
          inv.splice(gIdx, 1);
          freshCopy[currentPlayerIndex] = { ...p, inventory: inv };
          set({ players: freshCopy });
        }

        const startPos = typeof p.previousPosition === 'number' ? p.previousPosition : p.position;
        if (startPos + finalValue >= 100) {
          const newPlayers = [...freshCopy];
          newPlayers[currentPlayerIndex] = { ...p, position: 100 };
          set({ players: newPlayers, phase: 'finished', winnerId: p.id, diceValue: finalValue, diceIsRolling: false, movementStepsRemaining: 0 });
          return;
        }
      }

      set({
        diceValue: finalValue,
        diceIsRolling: false,
        movementStepsRemaining: finalValue,
        phase: 'moving',
      });
    }, 600);
  },

  finishDiceRoll: () => {},

  // ── movePlayerStep ─────────────────────────────────────────────────────────
  movePlayerStep: () => {
    const { players, currentPlayerIndex, movementStepsRemaining, diceValue } = get();
    if (!players?.length) return;
    if (currentPlayerIndex < 0 || currentPlayerIndex >= players.length) return;

    if (movementStepsRemaining <= 0) {
      get().handlePostMove();
      return;
    }

    const newPlayers = [...players];
    const player = newPlayers[currentPlayerIndex];
    if (!player) return;

    const totalDice = diceValue || 0;
    const stepsTaken = totalDice - movementStepsRemaining;
    const nextStep = stepsTaken + 1;

    const startPos = typeof player.previousPosition === 'number' ? player.previousPosition : player.position;

    const calcBounced = (start: number, steps: number) => {
      const total = start + steps;
      if (total <= 100) return total;
      return 100 - (total - 100);
    };

    const newPos = calcBounced(startPos, nextStep);
    newPlayers[currentPlayerIndex] = { ...player, position: newPos };

    try { playStepSound(); } catch {}

    if (movementStepsRemaining - 1 <= 0) {
      set({ players: newPlayers, movementStepsRemaining: 0 });
      get().handlePostMove();
    } else {
      set({ players: newPlayers, movementStepsRemaining: movementStepsRemaining - 1 });
    }
  },

  // ── handlePostMove ─────────────────────────────────────────────────────────
  handlePostMove: () => {
    const { players, currentPlayerIndex, placedBombs, lastRollWasRemote, boardTheme } = get();
    const currentBoardConfig = BOARD_THEMES[boardTheme].config;
    const player = players[currentPlayerIndex];
    let newPos = player.position;

    if (newPos >= 100) {
      set({ phase: 'finished', winnerId: player.id, lastRollWasRemote: false });
      return;
    }

    let newPlayers = [...players];
    let bombs = [...placedBombs];

    // ── Bomb ──
    const bombIdx = bombs.findIndex((b) => b.position === newPos);
    if (bombIdx !== -1) {
      newPos = Math.max(1, newPos - BOMB_PENALTY_STEPS);
      bombs.splice(bombIdx, 1);
      newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], position: newPos };

      if (lastRollWasRemote) {
        set({
          players: newPlayers,
          placedBombs: bombs,
          lastRollWasRemote: false,
          diceIsRolling: false,
          movementStepsRemaining: 0,
          phase: 'rolling',
          diceValue: null,
          turnActionLock: false,
        });
      } else {
        set({ players: newPlayers, placedBombs: bombs, lastRollWasRemote: false, diceIsRolling: false, movementStepsRemaining: 0 });
        get().nextTurn();
      }
      return;
    }

    // ── Snake ──
    const snake = currentBoardConfig.snakes.find((s) => s.head === newPos);
    if (snake) {
      const hasProtection = newPlayers[currentPlayerIndex].inventory.some(
        (i) => i.type === 'snake_protection'
      );
      if (hasProtection) {
        const newInv = newPlayers[currentPlayerIndex].inventory.filter(
          (i) => i.type !== 'snake_protection'
        );
        newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], inventory: newInv };
      } else {
        newPos = snake.tail;
        newPlayers[currentPlayerIndex] = { ...newPlayers[currentPlayerIndex], position: newPos };
      }

      if (lastRollWasRemote) {
        set({
          players: newPlayers,
          lastRollWasRemote: false,
          diceIsRolling: false,
          movementStepsRemaining: 0,
          phase: 'rolling',
          diceValue: null,
          turnActionLock: false,
        });
      } else {
        set({ players: newPlayers, lastRollWasRemote: false, diceIsRolling: false, movementStepsRemaining: 0 });
        get().nextTurn();
      }
      return;
    }

    // ── Mystery Box ──
    const hasBox = currentBoardConfig.mysteryBoxes.some((b) => b.position === newPos);
    if (hasBox) {
      set({ lastRollWasRemote: false });
      if (lastRollWasRemote) {
        set({ phase: 'rolling', diceValue: null, diceIsRolling: false, movementStepsRemaining: 0, turnActionLock: false });
      } else {
        get().triggerMysteryBox();
      }
      return;
    }

    // ── Normal cell ──
    if (lastRollWasRemote) {
      set({
        lastRollWasRemote: false,
        phase: 'rolling',
        diceValue: null,
        diceIsRolling: false,
        movementStepsRemaining: 0,
        turnActionLock: false,
      });
      return;
    }

    const { theme: qTheme, usedQuestionIds: qUsed, hintActive: qHint } = get();
    let themeQs = ALL_QUESTIONS[qTheme] || ALL_QUESTIONS['general'];
    let available = themeQs.filter((q) => !qUsed.includes(q.id));
    if (available.length === 0) available = themeQs;
    const question = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : themeQs[0];

    const applyQuestion = (removedIndex: number | null) => {
      set({
        currentQuestion: question,
        usedQuestionIds: [...qUsed, question.id],
        phase: 'question',
        hintActive: false,
        hintRemovedIndex: removedIndex,
      });
    };

    if (qHint) {
      const wrongIndices = [0, 1, 2, 3].filter((i) => i !== question.correctAnswer);
      const removedIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
      setTimeout(() => applyQuestion(removedIndex), 1000);
    } else {
      setTimeout(() => applyQuestion(null), 1000);
    }
  },

  // ── triggerMysteryBox ──────────────────────────────────────────────────────
  triggerMysteryBox: () => {
    const { players, currentPlayerIndex } = get();
    const randomItem = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
    setTimeout(() => {
      set({
        awardedItem: { playerId: players[currentPlayerIndex].id, item: randomItem },
        awardContext: 'mystery',
        phase: 'item_awarded',
      });
    }, 1000);
  },

  claimMysteryBox: () => {
    const { mysteryBoxItem, players, currentPlayerIndex } = get();
    if (mysteryBoxItem) {
      set({
        awardedItem: { playerId: players[currentPlayerIndex].id, item: mysteryBoxItem },
        awardContext: 'mystery',
        phase: 'item_awarded',
        mysteryBoxItem: null,
      });
    }
  },

  // ── showQuestion ───────────────────────────────────────────────────────────
  showQuestion: () => {
    const { theme, usedQuestionIds, hintActive } = get();

    let themeQs = ALL_QUESTIONS[theme] || ALL_QUESTIONS['general'];
    let available = themeQs.filter((q) => !usedQuestionIds.includes(q.id));
    if (available.length === 0) available = themeQs;

    const question =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : themeQs[0];

    if (hintActive) {
      const wrongIndices = [0, 1, 2, 3].filter((i) => i !== question.correctAnswer);
      const removedIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
      set({
        currentQuestion: question,
        usedQuestionIds: [...usedQuestionIds, question.id],
        phase: 'question',
        hintActive: false,
        hintRemovedIndex: removedIndex,
      });
    } else {
      set({
        currentQuestion: question,
        usedQuestionIds: [...usedQuestionIds, question.id],
        phase: 'question',
        hintRemovedIndex: null,
      });
    }
  },

  // ── answerQuestion ─────────────────────────────────────────────────────────
  answerQuestion: (isCorrect) => {
    set({ hintRemovedIndex: null, freezeTimerPlayerId: null });
    const { players, currentPlayerIndex, boardTheme } = get();
    const currentBoardConfig = BOARD_THEMES[boardTheme].config;
    const newPlayers = [...players];

    const currentPlayerId = players[currentPlayerIndex]?.id;
    const pIdx = newPlayers.findIndex((p) => p.id === currentPlayerId);
    const resolvedIdx = pIdx !== -1 ? pIdx : currentPlayerIndex;
    let p = { ...newPlayers[resolvedIdx] };

    if (isCorrect) {
      p.totalCorrect += 1;
      p.correctStreak += 1;

      const ladder = currentBoardConfig.ladders.find((l) => l.bottom === p.position);
      if (ladder) p.position = ladder.top;

      if (p.inventory.some((i) => i.type === 'quiz_bonus')) {
        p.position = Math.min(100, p.position + 3);
        const inv = [...p.inventory];
        const bIdx = inv.findIndex((i) => i.type === 'quiz_bonus');
        if (bIdx !== -1) inv.splice(bIdx, 1);
        p.inventory = inv;
      }

      if (p.correctStreak >= 3) {
        const randomItem = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
        p.correctStreak = 0;
        newPlayers[resolvedIdx] = p;
        set({ players: newPlayers });
        setTimeout(() => {
          set({
            awardedItem: { playerId: p.id, item: randomItem },
            awardContext: 'strike',
            phase: 'item_awarded',
          });
        }, 1000);
        return;
      }
    } else {
      const hasShield = p.inventory.some((i) => i.type === 'shield');
      if (!hasShield) {
        p.position = p.previousPosition;
      } else {
        const inv = [...p.inventory];
        const sIdx = inv.findIndex((i) => i.type === 'shield');
        if (sIdx !== -1) inv.splice(sIdx, 1);
        p.inventory = inv;
      }
      p.totalWrong += 1;
      p.correctStreak = 0;
    }

    newPlayers[resolvedIdx] = p;
    set({ players: newPlayers });
    get().nextTurn();
  },

  // ── closeAwardedItemModal ──────────────────────────────────────────────────
  closeAwardedItemModal: () => {
    const { awardedItem, awardContext } = get();
    if (!awardedItem) return;

    get().awardItem(awardedItem.playerId, awardedItem.item);
    set({ awardedItem: null, awardContext: null });

    if (awardContext === 'mystery') {
      get().showQuestion();
    } else if (awardContext === 'strike') {
      get().nextTurn();
    }
  },

  // ── nextTurn ───────────────────────────────────────────────────────────────
  // Kembali ke versi original — tidak ada perubahan di sini.
  // Persisting ke server dilakukan oleh Effect #6 di OnlineGamePage,
  // dan Effect #5 dikontrol dengan ref di page (bukan store flag).
  nextTurn: () => {
    const { players, currentPlayerIndex, turnCount } = get();
    if (!players?.length) return;

    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let newPlayers = [...players];

    while (true) {
      const p = { ...newPlayers[nextIndex] };
      if (p.skipNextTurn) {
        p.skipNextTurn = false;
        p.usedSkillThisTurn = [];
        newPlayers[nextIndex] = p;
        nextIndex = (nextIndex + 1) % players.length;
      } else {
        break;
      }
    }

    newPlayers[nextIndex] = { ...newPlayers[nextIndex], usedSkillThisTurn: [] };

    set({
      players: newPlayers,
      currentPlayerIndex: nextIndex,
      phase: 'rolling',
      diceValue: null,
      currentQuestion: null,
      hintActive: false,
      turnCount: turnCount + 1,
      diceIsRolling: false,
      lastRollWasRemote: false,
      movementStepsRemaining: 0,
      strikeNotification: null,
      turnActionLock: false,
    });

    // Jika pemain selanjutnya adalah bot, jadwalkan agar bot otomatis melempar dadu.
    try {
      const nextPlayer = newPlayers[nextIndex];
      if (nextPlayer?.isBot) {
        setTimeout(() => {
          // Pastikan giliran masih untuk player ini dan fase rolling
          const s = get();
          if (s.currentPlayerIndex === nextIndex && s.phase === 'rolling') {
            s.rollDice();
          }
        }, 700);
      }
    } catch (err) {
      // ignore
    }
  },

  // ── useItem ────────────────────────────────────────────────────────────────
  useItem: (itemId, targetId) => {
    const { players, currentPlayerIndex, placedBombs, isItemInUse } = get();
    if (isItemInUse) return;
    set({ isItemInUse: true });

    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };

    const itemIndex = player.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      set({ isItemInUse: false });
      return;
    }
    const item = player.inventory[itemIndex];

    if (['skip_turn', 'push_back', 'swap_position'].includes(item.type)) {
      if (player.usedSkillThisTurn?.includes(item.type)) {
        set({ isItemInUse: false });
        return;
      }
    }

    const newInv = [...player.inventory];
    newInv.splice(itemIndex, 1);
    player.inventory = newInv;

    if (item.type === 'golden_dice') {
      set({ phase: 'golden_dice', isItemInUse: false });
      newPlayers[currentPlayerIndex] = players[currentPlayerIndex];
      set({ players: newPlayers });
      return;
    }

    if (item.type === 'skip_turn') {
      if (targetId !== undefined) {
        const tIdx = newPlayers.findIndex((p) => p.id === targetId);
        if (tIdx !== -1) {
          newPlayers[tIdx] = { ...newPlayers[tIdx], skipNextTurn: true };
          player.usedSkillThisTurn = [...(player.usedSkillThisTurn || []), 'skip_turn'];
        }
      } else if (players.length === 2) {
        const otherIdx = newPlayers.findIndex((p) => p.id !== player.id);
        if (otherIdx !== -1) {
          newPlayers[otherIdx] = { ...newPlayers[otherIdx], skipNextTurn: true };
          player.usedSkillThisTurn = [...(player.usedSkillThisTurn || []), 'skip_turn'];
        }
      } else {
        set({ phase: 'item_use', pendingItemId: itemId, isItemInUse: false });
        newPlayers[currentPlayerIndex] = players[currentPlayerIndex];
        set({ players: newPlayers });
        return;
      }
    } else if (item.type === 'swap_position') {
      if (targetId !== undefined) {
        const tIdx = newPlayers.findIndex((p) => p.id === targetId);
        if (tIdx !== -1) {
          const temp = player.position;
          const targetPos = newPlayers[tIdx].position;
          const playerPrev = player.position;
          const targetPrev = newPlayers[tIdx].position;
          player.position = targetPos;
          player.previousPosition = playerPrev;
          newPlayers[tIdx] = { ...newPlayers[tIdx], position: temp, previousPosition: targetPrev };
          player.usedSkillThisTurn = [...(player.usedSkillThisTurn || []), 'swap_position'];
          set({ phase: 'rolling' });
        }
      } else {
        set({ phase: 'swap_position', pendingItemId: itemId, isItemInUse: false });
        newPlayers[currentPlayerIndex] = players[currentPlayerIndex];
        set({ players: newPlayers });
        return;
      }
    } else if (item.type === 'hint_answer') {
      set({ hintActive: true });
    } else if (item.type === 'freeze_timer') {
      set({ freezeTimerPlayerId: player.id });
    } else if (item.type === 'bomb_trap') {
      set({ placedBombs: [...placedBombs, { position: player.position, placedByPlayerId: player.id }] });
    } else if (item.type === 'push_back') {
      if (targetId !== undefined) {
        const tIdx = newPlayers.findIndex((p) => p.id === targetId);
        if (tIdx !== -1) {
          newPlayers[tIdx] = { ...newPlayers[tIdx], position: newPlayers[tIdx].previousPosition };
          player.usedSkillThisTurn = [...(player.usedSkillThisTurn || []), 'push_back'];
        }
      } else if (players.length === 2) {
        const otherIdx = newPlayers.findIndex((p) => p.id !== player.id);
        if (otherIdx !== -1) {
          newPlayers[otherIdx] = { ...newPlayers[otherIdx], position: newPlayers[otherIdx].previousPosition };
          player.usedSkillThisTurn = [...(player.usedSkillThisTurn || []), 'push_back'];
        }
      } else {
        set({ phase: 'item_use', pendingItemId: itemId, isItemInUse: false });
        newPlayers[currentPlayerIndex] = players[currentPlayerIndex];
        set({ players: newPlayers });
        return;
      }
    }

    newPlayers[currentPlayerIndex] = player;
    set({ players: newPlayers, pendingItemId: null, isItemInUse: false });
  },

  // ── awardItem ──────────────────────────────────────────────────────────────
  awardItem: (playerId, item) => {
    const { players } = get();
    const newPlayers = [...players];
    const idx = newPlayers.findIndex((p) => p.id === playerId);
    if (idx !== -1 && newPlayers[idx].inventory.length < 3) {
      newPlayers[idx] = { ...newPlayers[idx], inventory: [...newPlayers[idx].inventory, item] };
      set({ players: newPlayers });
    }
  },

  setPhase: (phase) => set({ phase }),
  setTurnActionLock: (val) => set({ turnActionLock: val }),
  setItemInUse: (val) => set({ isItemInUse: val }),
  resetGame: () => set({ phase: 'setup', turnActionLock: false, isItemInUse: false }),
}));