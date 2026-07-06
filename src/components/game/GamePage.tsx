'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { BOARD_THEMES } from '@/data/boardThemes';
import { GameBoard } from '@/components/board/GameBoard';
import { Inventory } from '@/components/ui/Inventory';
import { GameModals } from '@/components/ui/GameModals';
import Countdown from '@/components/ui/Countdown';
import { Menu, Home, RotateCcw, Volume2, VolumeX, Dices } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Design tokens (sama dengan Settings) ───────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

const COLOR_MAP: Record<string, string> = {
  red: 'bg-rose-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
};

const COLOR_GLOW: Record<string, string> = {
  red: 'shadow-[0_0_12px_rgba(244,63,94,0.5)]',
  blue: 'shadow-[0_0_12px_rgba(59,130,246,0.5)]',
  green: 'shadow-[0_0_12px_rgba(52,211,153,0.5)]',
  yellow: 'shadow-[0_0_12px_rgba(251,191,36,0.5)]',
};

export default function GamePage() {
  const router = useRouter();
  const {
    players, phase, currentPlayerIndex, diceValue, turnCount, movementStepsRemaining,
    rollDice, movePlayerStep, answerQuestion, closeAwardedItemModal, useItem, winnerId, boardTheme,
    pendingItemId, awardedItem, currentQuestion, showQuestion,
  } = useGameStore();

  const activeTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;

  const [showMenu, setShowMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [notifQueue, setNotifQueue] = useState<Array<{ id: string; text: string; kind?: 'success' | 'error' | 'info'; key?: string }>>([]);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botActionInFlightRef = useRef(false);

  useEffect(() => {
    if (players.length === 0) {
      router.push('/offline');
    }
  }, [players, router]);

  // Show a start countdown when the offline game is first initialized
  useEffect(() => {
    if (players.length > 0 && turnCount === 1) {
      setShowCountdown(true);
    }
  }, [players.length, turnCount]);

  const currentPlayer = players[currentPlayerIndex];

  const pushNotification = (text: string, kind: 'success' | 'error' | 'info' = 'info', key?: string) => {
    const notificationKey = key ?? `${kind}:${text}`;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setNotifQueue((q) => {
      if (q.some((item) => item.key === notificationKey)) {
        return q;
      }

      return [...q, { id, text, kind, key: notificationKey }];
    });

    return id;
  };

  useEffect(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }

    if (!currentPlayer?.isBot) {
      botActionInFlightRef.current = false;
      return;
    }

    if (botActionInFlightRef.current) {
      return;
    }

    const schedule = (callback: () => void, delay: number) => {
      botTimerRef.current = setTimeout(callback, delay);
    };

    if (phase === 'rolling') {
      schedule(() => {
        botActionInFlightRef.current = true;

        const manualItems = currentPlayer.inventory.filter((item) =>
          item.usage === 'manual' && ['golden_dice', 'skip_turn', 'push_back', 'swap_position', 'bomb_trap'].includes(item.type)
        );

        if (manualItems.length > 0) {
          const itemToUse = manualItems[Math.floor(Math.random() * manualItems.length)];
          const targetCandidates = players.filter((p) => p.id !== currentPlayer.id && !p.hasFinished);
          const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];

          if (itemToUse.type === 'golden_dice') {
            useItem(itemToUse.id);
          } else if (itemToUse.type === 'bomb_trap') {
            useItem(itemToUse.id);
          } else if (target) {
            useItem(itemToUse.id, target.id);
          } else {
            useItem(itemToUse.id);
          }
          botActionInFlightRef.current = false;
          return;
        }

        const hasGoldenDice = currentPlayer.inventory.some((item) => item.id === 'powerup_golden_dice');
        if (hasGoldenDice && Math.random() < 0.6) {
          useItem('powerup_golden_dice');
        } else {
          rollDice();
        }
        botActionInFlightRef.current = false;
      }, 900);
      return;
    }

    if (phase === 'golden_dice') {
      schedule(() => {
        botActionInFlightRef.current = true;
        const choice = Math.random() < 0.75 ? 6 : 4;
        rollDice(choice as any);
        botActionInFlightRef.current = false;
      }, 900);
      return;
    }

    if (phase === 'question') {
      schedule(async () => {
        botActionInFlightRef.current = true;

        const manualQuestionItems = currentPlayer.inventory.filter((item) =>
          item.usage === 'manual' && ['hint_answer', 'freeze_timer'].includes(item.type)
        );

        if (manualQuestionItems.length > 0 && Math.random() < 0.5) {
          const itemToUse = manualQuestionItems[Math.floor(Math.random() * manualQuestionItems.length)];
          useItem(itemToUse.id);
          setTimeout(() => {
            const correct = Math.random() < 0.6;
            const resultText = `${currentPlayer?.name} ${correct ? 'berhasil menjawab soal' : 'tidak berhasil menjawab soal'}`;
            pushNotification(resultText, correct ? 'success' : 'error', `bot-answer-${currentPlayer?.id}-${turnCount}-${phase}`);
            answerQuestion(correct);
            botActionInFlightRef.current = false;
          }, 600);
          return;
        }

        if (!currentQuestion) {
          const correct = Math.random() < 0.6;
          const resultText = `${currentPlayer?.name} ${correct ? 'berhasil menjawab soal' : 'tidak berhasil menjawab soal'}`;
          const thinkingKey = `bot-think-${currentPlayer?.id}-${turnCount}-${phase}`;
          const thinkingId = pushNotification(`${currentPlayer?.name} sedang berpikir...`, 'info', thinkingKey);

          setTimeout(() => {
            setNotifQueue((q) => q.filter((t) => t.id !== thinkingId));
            pushNotification(resultText, correct ? 'success' : 'error', `bot-answer-${currentPlayer?.id}-${turnCount}-${phase}`);

            setTimeout(() => {
              answerQuestion(correct);
              botActionInFlightRef.current = false;
            }, 700);
          }, 900);
          return;
        }

        const correct = Math.random() < 0.6;
        const resultText = `${currentPlayer?.name} ${correct ? 'berhasil menjawab soal' : 'tidak berhasil menjawab soal'}`;

        const thinkingKey = `bot-think-${currentPlayer?.id}-${turnCount}-${phase}`;
        const thinkingId = pushNotification(`${currentPlayer?.name} sedang berpikir...`, 'info', thinkingKey);

        setTimeout(() => {
          setNotifQueue((q) => q.filter((t) => t.id !== thinkingId));
          pushNotification(resultText, correct ? 'success' : 'error', `bot-answer-${currentPlayer?.id}-${turnCount}-${phase}`);

          setTimeout(() => {
            answerQuestion(correct);
            botActionInFlightRef.current = false;
          }, 700);
        }, 900);
      }, 1200);
      return;
    }

    if ((phase === 'item_use' || phase === 'swap_position') && pendingItemId) {
      schedule(() => {
        botActionInFlightRef.current = true;
        const targetCandidates = players.filter((p) => p.id !== currentPlayer.id && !p.hasFinished);
        if (targetCandidates.length === 0) {
          botActionInFlightRef.current = false;
          return;
        }
        const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
        useItem(pendingItemId, target.id);
        botActionInFlightRef.current = false;
      }, 900);
    }
  }, [currentPlayer, currentPlayerIndex, phase, turnCount, rollDice, useItem, answerQuestion, pendingItemId, players, currentQuestion, showQuestion]);

  // Show toast when bot gets awarded item
  useEffect(() => {
    if (phase === 'item_awarded' && currentPlayer?.isBot && awardedItem) {
      const text = `${currentPlayer.name} mendapatkan ${awardedItem.item?.name || 'item'}`;
      pushNotification(text, 'success', `bot-award-${currentPlayer.id}-${awardedItem.item?.id || 'item'}-${turnCount}`);
    }
  }, [phase, currentPlayerIndex, awardedItem, turnCount]);

  const removeNotif = (id: string) => setNotifQueue((q) => q.filter((t) => t.id !== id));

  const NotificationToasts = () => (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col items-end gap-2">
      {notifQueue.map((t, i) => (
        <motion.div
          key={t.id + '-' + i}
          initial={{ y: -20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, delay: i * 0.04 }}
          className="font-bold px-5 py-2 rounded-2xl shadow-lg max-w-md w-full mx-4"
          style={{
              background: t.kind === 'success' ? 'rgba(72,187,120,0.95)' : t.kind === 'info' ? 'rgba(99,102,241,0.95)' : 'rgba(239,68,68,0.95)',
              color: '#FFFFFF',
              border: `2px solid ${WOOD_DARK}`,
            }}
          onAnimationComplete={() => {
            setTimeout(() => removeNotif(t.id), 1600 + i * 80);
          }}
        >
          {t.text}
        </motion.div>
      ))}
    </div>
  );

  // Auto-close item awarded modal for bots
  useEffect(() => {
    if (phase === 'item_awarded') {
      // If the awarded item belongs to a bot, close the modal immediately (we show only toast)
      if (awardedItem && players.find(p => p.id === awardedItem.playerId)?.isBot) {
        const timer = setTimeout(() => {
          closeAwardedItemModal();
        }, 600);
        return () => clearTimeout(timer);
      }
      // Also handle case where current player is bot and modal might be open
      if (currentPlayer?.isBot) {
        const timer = setTimeout(() => {
          closeAwardedItemModal();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentPlayerIndex, closeAwardedItemModal]);

  const handleRoll = () => {
    if (showCountdown || currentPlayer?.isBot) return;
    setRolling(true);
    rollDice();
    setTimeout(() => setRolling(false), 600);
  };

  // Ensure countdown overlay is closed when the game finishes
  useEffect(() => {
    if (phase === 'finished') setShowCountdown(false);
  }, [phase]);

  useEffect(() => {
    if (phase === 'moving' && movementStepsRemaining > 0) {
      const timer = setTimeout(() => movePlayerStep(), 450);
      return () => clearTimeout(timer);
    }
  }, [phase, movementStepsRemaining, movePlayerStep]);

  if (players.length === 0) return null;
  const winner = players.find((p) => p.id === winnerId) || players[currentPlayerIndex];

  const rollActive = (phase === 'rolling' || phase === 'golden_dice') && !currentPlayer?.isBot;

  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden bg-gradient-to-br ${activeTheme.bgGradient}`}
    >
      <NotificationToasts />
      {/* Wood-grain ambient backdrop, tinted to overlay the theme gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'rgba(20,12,5,0.35)' }} />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, #000 0px, #000 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      {/* Header */}
      <div
        className="relative z-10 flex justify-between items-center px-5 pt-6 pb-4"
        style={{ background: WOOD_DARK, borderBottom: `4px solid ${activeTheme.accentColor}` }}
      >
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              color: ACCENT,
              WebkitTextStroke: `1px ${WOOD_DARK}`,
              textShadow: `0 2px 0 ${WOOD}, 0 6px 16px rgba(0,0,0,0.5)`,
            }}
          >
            ULAR TANGGA
          </h1>
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            Putaran {turnCount}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenu(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', color: BOARD }}
        >
          <Menu className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-3 px-3 pt-4 pb-4 min-h-0">

        {/* Left sidebar — Desktop players */}
        <div className="hidden md:flex md:w-44 flex-shrink-0 flex-col gap-2">
          <p
            className="text-[10px] uppercase tracking-widest font-black mb-1 px-1"
            style={{ color: WOOD_LIGHT }}
          >
            Pemain
          </p>
          {players.map((p, idx) => (
            <motion.div
              key={p.id}
              animate={idx === currentPlayerIndex ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-2xl p-3 transition-all"
              style={{
                background: idx === currentPlayerIndex ? ACCENT_TINT : BOARD,
                border: `3px solid ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD}`,
                boxShadow: `3px 3px 0 ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD_DARK}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${COLOR_MAP[p.color] || 'bg-gray-500'} ${idx === currentPlayerIndex ? COLOR_GLOW[p.color] || '' : ''}`} />
                <p className="text-xs font-black truncate" style={{ color: INK }}>{p.name}</p>
              </div>
              {p.isBot && p.inventory && p.inventory.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {p.inventory.slice(0,3).map((it, i) => (
                    <div key={i} className="text-sm" title={it.name}>
                      {it.icon}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <p className="text-[10px]" style={{ color: WOOD_LIGHT }}>
                  Pos: <span className="font-bold" style={{ color: INK }}>{p.position}</span>
                </p>
                <p className="text-[10px] font-bold text-emerald-700">✓{p.totalCorrect}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Center: board */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Mobile player tabs */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all"
                style={{
                  background: idx === currentPlayerIndex ? ACCENT_TINT : BOARD,
                  border: `2px solid ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD}`,
                  boxShadow: `2px 2px 0 ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD_DARK}`,
                }}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP[p.color] || 'bg-gray-500'}`} />
                <span className="text-[11px] font-bold" style={{ color: INK }}>{p.name}</span>
                {idx === currentPlayerIndex && (
                  <span className="text-[10px]" style={{ color: activeTheme.accentColor }}>▲</span>
                )}
                {p.isBot && p.inventory && p.inventory.length > 0 && (
                  <div className="ml-2 flex items-center gap-1">
                    {p.inventory.slice(0,2).map((it, i) => (
                      <div key={i} className="text-sm" title={it.name}>{it.icon}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Board */}
          <div className="flex items-center justify-center">
            <div
              className="w-full max-w-sm md:max-w-2xl aspect-square rounded-3xl overflow-hidden"
              style={{ boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 3px ${activeTheme.accentColor}` }}
            >
              <GameBoard />
            </div>
          </div>

          {/* Mobile dice + inventory */}
          <div className="md:hidden space-y-3">
            <Inventory />

            <div
              className="rounded-2xl p-4"
              style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${COLOR_MAP[currentPlayer?.color] || 'bg-gray-500'}`} />
                <p className="font-black text-base" style={{ color: INK }}>{currentPlayer?.name}</p>
                <span
                  className="text-xs font-bold ml-auto uppercase tracking-wider"
                  style={{ color: WOOD_LIGHT }}
                >
                  {currentPlayer?.isBot ? 'Giliran Bot' : 'Giliranmu'}
                </span>
              </div>

              {/* Dice display */}
              <div
                className="h-20 flex items-center justify-center rounded-2xl mb-3"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}` }}
              >
                {phase === 'dice_rolling' || rolling ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                  >
                    <Dices className="w-10 h-10" style={{ color: activeTheme.accentColor }} />
                  </motion.div>
                ) : diceValue ? (
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-5xl font-black"
                    style={{ color: activeTheme.accentColor }}
                  >
                    {diceValue}
                  </motion.span>
                ) : (
                  <p className="text-sm font-bold" style={{ color: WOOD_LIGHT }}>Lempar Dadu</p>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRoll}
                disabled={!rollActive || showCountdown || currentPlayer?.isBot}
                className="w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-base transition-all relative overflow-hidden"
                style={
                  rollActive
                    ? {
                        background: activeTheme.accentColor,
                        border: `2px solid ${WOOD_DARK}`,
                        boxShadow: `0 4px 0 ${WOOD_DARK}, 3px 3px 0 ${WOOD_DARK}`,
                        color: '#FFFFFF',
                      }
                    : {
                        background: BOARD_DARK,
                        border: `2px solid ${WOOD}`,
                        color: WOOD_LIGHT,
                        cursor: 'not-allowed',
                      }
                }
              >
                <span className="flex items-center justify-center gap-2">
                  Lempar
                </span>
                {rollActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right sidebar — Desktop */}
        <div className="hidden md:flex md:w-52 flex-shrink-0 flex-col gap-3">
          <div
            className="rounded-2xl p-4"
            style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-black mb-2"
              style={{ color: WOOD_LIGHT }}
            >
              Giliran
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${COLOR_MAP[currentPlayer?.color] || 'bg-gray-500'} ${COLOR_GLOW[currentPlayer?.color] || ''}`} />
              <p className="font-black text-lg" style={{ color: INK }}>{currentPlayer?.name}</p>
            </div>

            <div
              className="h-24 flex items-center justify-center rounded-2xl mb-4"
              style={{ background: BOARD_DARK, border: `2px solid ${WOOD}` }}
            >
              {phase === 'dice_rolling' || rolling ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}>
                  <Dices className="w-12 h-12" style={{ color: activeTheme.accentColor }} />
                </motion.div>
              ) : diceValue ? (
                <motion.span
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-6xl font-black"
                  style={{ color: activeTheme.accentColor }}
                >
                  {diceValue}
                </motion.span>
              ) : (
                <p className="text-sm font-bold text-center px-3" style={{ color: WOOD_LIGHT }}>Lempar Dadu</p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRoll}
              disabled={!rollActive || showCountdown || currentPlayer?.isBot}
              className="w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm relative overflow-hidden"
              style={
                rollActive
                  ? {
                      background: activeTheme.accentColor,
                      border: `2px solid ${WOOD_DARK}`,
                      boxShadow: `0 4px 0 ${WOOD_DARK}, 3px 3px 0 ${WOOD_DARK}`,
                      color: '#FFFFFF',
                    }
                  : {
                      background: BOARD_DARK,
                      border: `2px solid ${WOOD}`,
                      color: WOOD_LIGHT,
                      cursor: 'not-allowed',
                    }
              }
            >
              <span className="flex items-center justify-center gap-2">
                Lempar
              </span>
              {rollActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              )}
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Inventory />
          </div>
        </div>
      </div>

      {showCountdown && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <Countdown seconds={3} onComplete={() => setShowCountdown(false)} />
        </div>
      )}

      {/* Game End Modal */}
      {phase === 'finished' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ y: 80, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{ background: BOARD, border: `4px solid ${WOOD}`, boxShadow: `6px 6px 0 ${WOOD_DARK}` }}
          >
            <div className="text-5xl mb-4">🏆</div>
            <h2
              className="text-3xl font-black mb-3"
              style={{ color: ACCENT_DEEP, textShadow: `0 2px 0 ${ACCENT}` }}
            >
              SELESAI!
            </h2>
            <p className="font-bold mb-6" style={{ color: INK }}>
              Pemenang: <span className="font-black text-emerald-700">{winner?.name}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/offline')}
                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm"
                style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${ACCENT_DEEP}` }}
              >
                Main Lagi
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm"
                style={{ background: BOARD_DARK, color: INK, border: `2px solid ${WOOD}` }}
              >
                Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Settings Menu Modal */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowMenu(false)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: BOARD, border: `4px solid ${WOOD}`, boxShadow: `6px 6px 0 ${WOOD_DARK}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-2xl font-black mb-6 uppercase tracking-wider text-center"
              style={{ color: ACCENT_DEEP }}
            >
              Menu
            </h2>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-full py-3 px-4 rounded-2xl font-bold uppercase tracking-wider flex items-center justify-between text-sm"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
              >
                <span className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-600" />
                  )}
                  Suara
                </span>
                <span className={`text-xs font-black ${soundEnabled ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {soundEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => { setShowMenu(false); router.push('/offline'); }}
                className="w-full py-3 px-4 rounded-2xl font-bold uppercase tracking-wider flex items-center gap-3 text-sm"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
              >
                <RotateCcw className="w-4 h-4" style={{ color: WOOD }} />
                Restart
              </button>

              <button
                onClick={() => { setShowMenu(false); router.push('/'); }}
                className="w-full py-3 px-4 rounded-2xl font-bold uppercase tracking-wider flex items-center gap-3 text-sm"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
              >
                <Home className="w-4 h-4" style={{ color: WOOD }} />
                Menu Utama
              </button>
            </div>

            <button
              onClick={() => setShowMenu(false)}
              className="w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm"
              style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${ACCENT_DEEP}` }}
            >
              Lanjutkan
            </button>
          </motion.div>
        </motion.div>
      )}

      <GameModals />
    </div>
  );
}