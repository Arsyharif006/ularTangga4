'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Crown, Dices } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import type { Player, QuestionTheme, QuestionGrade, PlayerColor } from '@/types/game';
import { BOARD_THEME_LIST, pickRandomBoardTheme, type SelectableBoardThemeName } from '@/data/boardThemes';
import { BoardThemePreview } from '@/components/BoardThemePreview';
import { BoardThemeSpinOverlay } from '@/components/BoardThemeSpinOverlay';
import PurchaseModal from '@/components/ui/PurchaseModal';

// ── Design tokens ────────────────────────────────────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

// Warna dominan tiap tema peta — untuk efek hover mengikuti peta
const BOARD_THEME_COLORS: Record<string, { border: string; bg: string; shadow: string }> = {
  classic: { border: '#d97706', bg: 'rgba(217,119,6,0.15)',   shadow: '#92400e' },
  winter:  { border: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',  shadow: '#0369a1' },
  forest:  { border: '#059669', bg: 'rgba(5,150,105,0.15)',   shadow: '#065f46' },
  lava:    { border: '#ea580c', bg: 'rgba(234,88,12,0.15)',   shadow: '#7c2d12' },
  space:   { border: '#a855f7', bg: 'rgba(168,85,247,0.15)',  shadow: '#6d28d9' },
  random:  { border: WOOD,      bg: `rgba(122,74,38,0.15)`,   shadow: WOOD_DARK },
};

const getBoardThemeColor = (name: string) =>
  BOARD_THEME_COLORS[name] ?? { border: WOOD, bg: `rgba(122,74,38,0.15)`, shadow: WOOD_DARK };

const AVAILABLE_COLORS: { color: PlayerColor; from: string; to: string; ring: string; label: string }[] = [
  { color: 'red',    from: 'from-rose-400',    to: 'to-rose-600',    ring: 'ring-rose-300',    label: 'Merah'  },
  { color: 'blue',   from: 'from-sky-400',     to: 'to-blue-600',    ring: 'ring-sky-300',     label: 'Biru'   },
  { color: 'green',  from: 'from-emerald-400', to: 'to-emerald-600', ring: 'ring-emerald-300', label: 'Hijau'  },
  { color: 'yellow', from: 'from-amber-300',   to: 'to-amber-500',   ring: 'ring-amber-200',   label: 'Kuning' },
];

const QUESTION_THEME_OPTIONS: { value: QuestionTheme; label: string }[] = [
  { value: 'sd',            label: 'SD (Pilih Mata Pelajaran)'                },
  { value: 'smp',           label: 'SMP (Pilih Mata Pelajaran)'               },
  { value: 'sma_smk',       label: 'SMA/SMK (Pilih Mata Pelajaran)'           },
  { value: 'general',       label: 'Umum'                     },
  { value: 'programming',   label: 'Pemrograman'              },
  { value: 'sistem_digital',label: 'Sistem Digital'           },
  { value: 'logika_mtk',    label: 'Logika MTK'               },
  { value: 'matematika',    label: 'Matematika'               },
  { value: 'english',       label: 'Bahasa Inggris'           },
  { value: 'history',       label: 'Sejarah'                  },
];

// Short name dictionary for long labels (kamus)
const SHORT_NAME_MAP: Record<string, string> = {
  'Bahasa Indonesia': 'B. Indo',
  'Ilmu Pengetahuan Alam': 'IPA',
  'Ilmu Pengetahuan Sosial': 'IPS',
  'Sistem Digital': 'Sist. Dig',
  'Pemrograman dan ilmu komputer': 'Pemrograman',
  'Matematika dan perhitungan': 'Matematika',
};

function shortenLabel(label: string, max = 14) {
  if (SHORT_NAME_MAP[label]) return SHORT_NAME_MAP[label];
  if (label.length <= max) return label;
  return label.slice(0, max - 1) + '…';
}

// Subject lists per grade
const SUBJECTS_BY_GRADE: Record<string, { value: QuestionTheme; label: string }[]> = {
  sd: [
    { value: 'bahasa_indonesia', label: 'Bahasa Indonesia' },
    { value: 'matematika', label: 'Matematika' },
    { value: 'ipa', label: 'IPA' },
    { value: 'ips', label: 'IPS' },
    { value: 'english', label: 'Bahasa Inggris' },
    { value: 'history', label: 'Sejarah' },
  ],
  smp: [
    { value: 'bahasa_indonesia', label: 'Bahasa Indonesia' },
    { value: 'matematika', label: 'Matematika' },
    { value: 'ipa', label: 'IPA' },
    { value: 'ips', label: 'IPS' },
    { value: 'ppkn', label: 'PPKn' },
    { value: 'english', label: 'Bahasa Inggris' },
    { value: 'history', label: 'Sejarah' },
  ],
  sma_smk: [
    { value: 'matematika', label: 'Matematika' },
    { value: 'fisika', label: 'Fisika' },
    { value: 'kimia', label: 'Kimia' },
    { value: 'programming', label: 'Pemrograman' },
    { value: 'history', label: 'Sejarah' },
    { value: 'broadcasting', label: 'Broadcasting' },
    { value: 'informatika', label: 'Informatika' },
    { value: 'tkj', label: 'TKJ' },
    { value: 'desain_grafis', label: 'Desain Grafis' },
  ],
};

// ─── Step machinery ────────────────────────────────────────────────
const STEPS = ['players-count', 'players-config', 'question-grade', 'question-subject', 'board-theme'] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  'players-count':  '1',
  'players-config': '2',
  'question-grade': '3',
  'question-subject': '4',
  'board-theme':    '5',
};

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ?  40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -40 :  40, opacity: 0 }),
};

interface GameSetupProps {
  mode?: 'offline' | 'computer';
}

export const GameSetup = ({ mode = 'offline' }: GameSetupProps) => {
  const isComputerMode = mode === 'computer';
  const router       = useRouter();
  const initGame     = useGameStore(state => state.initGame);
  const reduceMotion = useReducedMotion();

  const [stepIndex,      setStepIndex]      = useState(0);
  const [direction,      setDirection]      = useState(1);
  const [questionTheme,  setQuestionTheme]  = useState<QuestionTheme>('general');
  const [selectedGrade,  setSelectedGrade]  = useState<QuestionGrade | null>(null);
  const [boardTheme,     setBoardTheme]     = useState<SelectableBoardThemeName>('classic');
  const [playerCount,    setPlayerCount]    = useState(0);
  const [selectedColors, setSelectedColors] = useState<(PlayerColor | null)[]>([]);
  const [playerNames,    setPlayerNames]    = useState<string[]>([]);
  const playerCountOptions = [2, 3, 4];
  const [spinResult,     setSpinResult]     = useState<ReturnType<typeof pickRandomBoardTheme> | null>(null);
  const [coins,          setCoins]          = useState(0);
  const [unlockedBoards, setUnlockedBoards] = useState<string[]>([]);
  const [purchaseOpen,   setPurchaseOpen]   = useState(false);
  const [purchaseMeta,   setPurchaseMeta]   = useState<{
    title: string; description?: string; cost?: number; onConfirm?: () => void;
  } | null>(null);
  const [hoveredBoard, setHoveredBoard] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).default;
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!user) return;
        const { data: stats } = await supabase.from('user_stats').select('coins, unlocked_boards').eq('user_id', user.id).maybeSingle();
        const dbCoins    = (stats as any)?.coins          ?? 0;
        const dbUnlocked = (stats as any)?.unlocked_boards ?? ['classic', 'winter'];
        setCoins(dbCoins);
        setUnlockedBoards(dbUnlocked);
      } catch { /* ignore */ }
    })();
  }, []);

  const currentStep: Step = STEPS[stepIndex];

  const goNext = () => {
    if (currentStep === 'players-config' && !allColorsSelected) return;
    if (currentStep === 'question-grade' && !selectedGrade) return;
    if (currentStep === 'question-subject' && !(selectedGrade ? SUBJECTS_BY_GRADE[selectedGrade].some(s => s.value === questionTheme) : false)) return;
    if (stepIndex < STEPS.length - 1) { setDirection(1); setStepIndex(i => i + 1); }
  };
  const goBack = () => {
    if (stepIndex > 0) { setDirection(-1); setStepIndex(i => i - 1); }
    else               { router.push('/'); }
  };

  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count);
    const humanCount = isComputerMode ? 1 : count;
    setSelectedColors(Array(humanCount).fill(null));
    setPlayerNames(Array(humanCount).fill('').map((_, i) => `Player ${i + 1}`));
    setDirection(1);
    setStepIndex(STEPS.indexOf('players-config'));
  };

  const handleColorSelect = (playerIdx: number, color: PlayerColor) => {
    if (selectedColors.some((c, i) => c === color && i !== playerIdx)) return;
    const newColors = [...selectedColors];
    newColors[playerIdx] = color;
    setSelectedColors(newColors);
  };

  const handleNameChange = (playerIdx: number, name: string) => {
    const newNames = [...playerNames];
    newNames[playerIdx] = name;
    setPlayerNames(newNames);
  };

  const buildPlayers = (): Player[] => {
    const humans = selectedColors.map((color, i) => ({
      id: i + 1,
      name: playerNames[i] || `Player ${i + 1}`,
      color: color as PlayerColor,
      position: 1,
      previousPosition: 1,
      inventory: [],
      correctStreak: 0,
      totalCorrect: 0,
      totalWrong: 0,
      skipNextTurn: false,
      hasFinished: false,
      usedSkillThisTurn: [],
      isBot: false,
    }));

    if (!isComputerMode) return humans;

    const usedColors = new Set(humans.map((p) => p.color));
    const botColors = AVAILABLE_COLORS.map((c) => c.color).filter((color) => !usedColors.has(color));
    const botCount = Math.max(0, playerCount - humans.length);
    const bots = Array.from({ length: botCount }).map((_, idx) => ({
      id: humans.length + idx + 1,
      name: `Bot ${idx + 1}`,
      color: botColors[idx] || AVAILABLE_COLORS[idx].color,
      position: 1,
      previousPosition: 1,
      inventory: [],
      correctStreak: 0,
      totalCorrect: 0,
      totalWrong: 0,
      skipNextTurn: false,
      hasFinished: false,
      usedSkillThisTurn: [],
      isBot: true,
    }));

    return [...humans, ...bots];
  };

  const handleStartGame = async () => {
    if (selectedColors.includes(null)) return;
    if (boardTheme === 'random') {
      const freeNames = BOARD_THEME_LIST.slice(0, 2).map(t => t.name);
      const available = Array.from(new Set<string>([...freeNames, ...(unlockedBoards || [])]));
      const filtered  = available.filter(n => BOARD_THEME_LIST.some(t => t.name === n));
      setSpinResult(filtered.length === 0
        ? pickRandomBoardTheme()
        : filtered[Math.floor(Math.random() * filtered.length)] as any);
      return;
    }
    try {
      const { initializeQuestionSystem } = await import('@/lib/initQuestionSystem');
      initializeQuestionSystem().catch((err) => {
        console.error('Failed to initialize question system at game start:', err);
      });
    } catch (err) {
      console.error('Failed to import question system at game start:', err);
    }
    initGame(buildPlayers(), questionTheme, boardTheme, selectedGrade || 'smp');
    router.push(isComputerMode ? '/vs-ai/game?countdown=3' : '/offline/game?countdown=3');
  };

  const handleSpinDone = async () => {
    if (!spinResult) return;
    try {
      const { initializeQuestionSystem } = await import('@/lib/initQuestionSystem');
      initializeQuestionSystem().catch((err) => {
        console.error('Failed to initialize question system at game start:', err);
      });
    } catch (err) {
      console.error('Failed to import question system at game start:', err);
    }
    initGame(buildPlayers(), questionTheme, spinResult, selectedGrade || 'smp');
    router.push(isComputerMode ? '/vs-ai/game?countdown=3' : '/offline/game?countdown=3');
  };

  // ── Handler pemilihan/unlock peta ───────────────────────────────────
  // Urutan cek diperbaiki: peta yang SUDAH unlocked (gratis atau sudah
  // dibeli) bisa langsung dipilih TANPA perlu login. Cek sesi/login hanya
  // dilakukan ketika peta tersebut masih terkunci dan butuh dibeli —
  // karena pembelian itulah yang memang butuh akun untuk menyimpan koin
  // & status unlock ke server.
  const handleBoardThemeClick = async (name: string, isUnlocked: boolean, label: string) => {
    // Peta gratis / sudah dimiliki — boleh dipilih siapa saja, login atau tidak.
    if (isUnlocked) {
      setBoardTheme(name as any);
      return;
    }

    // Dari sini berarti peta masih terkunci dan perlu dibeli — baru di titik
    // ini kita butuh akun, karena pembelian harus tersimpan ke user_stats.
    try {
      const supabase = (await import('@/lib/supabase/client')).default;
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user) {
        setPurchaseMeta({
          title: 'Perlu Masuk',
          description: 'Silakan masuk untuk membuka peta ini. Peta gratis tetap bisa dimainkan tanpa masuk.',
          onConfirm: () => setPurchaseOpen(false),
        });
        setPurchaseOpen(true);
        return;
      }

      const cost = 5;
      if ((coins ?? 0) < cost) {
        setPurchaseMeta({
          title: 'Koin Tidak Cukup',
          description: 'Koin tidak cukup untuk membuka peta ini.',
          onConfirm: () => setPurchaseOpen(false),
        });
        setPurchaseOpen(true);
        return;
      }

      setPurchaseMeta({
        title: `Buka peta ${label}`,
        description: `Konfirmasi pembelian peta ${label} seharga ${cost} koin?`,
        cost,
        onConfirm: async () => {
          try {
            const newCoins    = (coins ?? 0) - cost;
            const newUnlocked = Array.from(new Set([...(unlockedBoards || []), name]));
            await supabase.from('user_stats').upsert({ user_id: user.id, coins: newCoins, unlocked_boards: newUnlocked, email: user.email || null }).select();
            setCoins(newCoins);
            setUnlockedBoards(newUnlocked);
            setBoardTheme(name as any);
          } catch (err) {
            console.error('Failed unlocking board', err);
          }
          setPurchaseOpen(false);
        },
      });
      setPurchaseOpen(true);
    } catch (err) {
      console.error('Failed unlocking board', err);
    }
  };

  const allColorsSelected = selectedColors.every(c => c !== null);
  const selectedCount     = selectedColors.filter(c => c !== null).length;
  const isSubjectSelected = selectedGrade ? SUBJECTS_BY_GRADE[selectedGrade].some(s => s.value === questionTheme) : false;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>

      {/* Ambient glow — warm wood tones */}
      <div className="pointer-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,211,77,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(122,74,38,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition flex-shrink-0"
            style={{
              background:  `rgba(122,74,38,0.18)`,
              border:      `1px solid rgba(122,74,38,0.35)`,
              color:        ACCENT,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{
                color:            ACCENT,
                WebkitTextStroke: `1.5px ${WOOD_DARK}`,
                textShadow:       `0 3px 0 ${ACCENT_DEEP}, 0 6px 14px rgba(0,0,0,0.45)`,
              }}
            >
                {isComputerMode ? 'SETUP VS KOMPUTER' : 'SETUP PERMAINAN'}
            </h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-start gap-2 px-2 flex-nowrap overflow-hidden">
            {STEPS.map((s, idx) => {
              const active = idx === stepIndex;
              const done = idx < stepIndex;
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (idx <= stepIndex) {
                      setDirection(idx > stepIndex ? 1 : -1);
                      setStepIndex(idx);
                    }
                  }}
                  className={`py-3 px-4 rounded-2xl font-bold text-base uppercase transition-all transform hover:scale-105 select-none`}
                  onMouseEnter={e => { if (!active) (e.currentTarget.style.background = ACCENT_TINT); }}
                  onMouseLeave={e => { if (!active) (e.currentTarget.style.background = BOARD); }}
                  style={{
                    background: active ? ACCENT : BOARD,
                    color: active ? WOOD_DARK : INK,
                    border: `3px solid ${active ? ACCENT_DEEP : WOOD}`,
                    boxShadow: active ? `3px 3px 0 ${ACCENT_DEEP}` : `3px 3px 0 ${WOOD_DARK}`,
                    flex: '1 1 22%',
                    minWidth: 0,
                  }}
                >
                  <div className="text-sm font-semibold truncate text-center w-full" title={STEP_LABELS[s]} style={{ lineHeight: '1' }}>{shortenLabel(STEP_LABELS[s])}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >

              {/* ── Step 1: Jumlah Pemain ── */}
              {currentStep === 'players-count' && (
                <div className="max-w-xl mx-auto w-full">
                  <p
                    className="text-center font-semibold mb-6 uppercase tracking-wider text-sm"
                    style={{ color: WOOD_LIGHT }}
                  >
                    Pilih Jumlah Pemain
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {playerCountOptions.map(num => (
                      <button
                        key={num}
                        onClick={() => handlePlayerCountSelect(num)}
                        className="py-4 px-2 rounded-2xl font-bold text-lg uppercase transition-all transform hover:scale-105"
                        style={{
                          background: BOARD,
                          border:     `3px solid ${WOOD}`,
                          color:       INK,
                          boxShadow:  `3px 3px 0 ${WOOD_DARK}`,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background  = ACCENT_TINT;
                          e.currentTarget.style.borderColor = ACCENT_DEEP;
                          e.currentTarget.style.color       = ACCENT_DEEP;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background  = BOARD;
                          e.currentTarget.style.borderColor = WOOD;
                          e.currentTarget.style.color       = INK;
                        }}
                      >
                        {num}P
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Warna & Nama Pemain ── */}
              {currentStep === 'players-config' && playerCount > 0 && (
                <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wide" style={{ color: BOARD }}>
                      Pilih Warna dan Nama
                    </h2>
                    <span className="font-bold text-base" style={{ color: ACCENT }}>
                      {selectedCount}/{isComputerMode ? 1 : playerCount}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {Array.from({ length: isComputerMode ? 1 : playerCount }).map((_, idx) => {
                      const isSelected = selectedColors[idx] !== null;
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl p-4 transition-all"
                          style={{
                            background: isSelected ? `rgba(251,234,203,0.15)` : `rgba(239,223,184,0.10)`,
                            border:     `2px solid ${isSelected ? ACCENT : `rgba(122,74,38,0.30)`}`,
                            boxShadow:  isSelected ? `0 0 0 3px rgba(255,211,77,0.12)` : 'none',
                          }}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-3">
                              {/* Status Circle */}
                              <div
                                className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                style={{
                                  background:  `rgba(122,74,38,0.12)`,
                                  borderColor: `rgba(122,74,38,0.35)`,
                                }}
                              >
                                {isSelected && (
                                  <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                                )}
                              </div>

                              {/* Color Selector */}
                              <div className="flex gap-3 flex-shrink-0">
                                {AVAILABLE_COLORS.map(({ color, from, to, ring, label }) => {
                                  const takenByOther   = selectedColors.some((c, i) => c === color && i !== idx);
                                  const isThisSelected = selectedColors[idx] === color;
                                  return (
                                    <motion.button
                                      key={color}
                                      whileHover={!takenByOther ? { scale: 1.1, y: -2 } : undefined}
                                      whileTap={!takenByOther   ? { scale: 0.9 }         : undefined}
                                      onClick={() => handleColorSelect(idx, color)}
                                      disabled={takenByOther}
                                      title={label}
                                      className={`relative flex flex-col items-center gap-1 focus-visible:outline-none ${takenByOther ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                      <motion.span
                                        animate={isThisSelected && !reduceMotion ? { y: [0, -4, 0] } : { y: 0 }}
                                        transition={{ duration: 0.45 }}
                                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${from} ${to} shadow-[inset_0_2px_2px_rgba(255,255,255,0.45),0_4px_10px_rgba(0,0,0,0.35)] flex items-center justify-center ${isThisSelected ? `ring-[3px] ${ring} ring-offset-2 ring-offset-[#2B1B0F]` : ''}`}
                                      >
                                        {isThisSelected && <Crown className="w-3.5 h-3.5 text-white drop-shadow" />}
                                      </motion.span>
                                      <span
                                        className="hidden sm:block text-[9px] font-bold uppercase tracking-wide"
                                        style={{ color: isThisSelected ? BOARD : WOOD_LIGHT }}
                                      >
                                        {label}
                                      </span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Name Input */}
                            <input
                              type="text"
                              value={playerNames[idx] || ''}
                              onChange={(e) => handleNameChange(idx, e.target.value)}
                              placeholder={`Player ${idx + 1}`}
                              className="w-full sm:flex-1 rounded-xl px-4 py-2.5 font-semibold focus:outline-none transition-all"
                              style={{
                                background:  BOARD_DARK,
                                border:      `2px solid rgba(122,74,38,0.35)`,
                                color:        INK,
                                caretColor:   ACCENT,
                              }}
                              onFocus={e => {
                                e.currentTarget.style.borderColor = ACCENT;
                                e.currentTarget.style.boxShadow  = `0 0 0 2px rgba(255,211,77,0.15)`;
                              }}
                              onBlur={e => {
                                e.currentTarget.style.borderColor = `rgba(122,74,38,0.35)`;
                                e.currentTarget.style.boxShadow  = 'none';
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step: Pilih Tingkat (grade) ── */}
              {currentStep === 'question-grade' && (
                <div className="max-w-xl mx-auto w-full">
                  <p
                    className="text-center font-semibold mb-6 uppercase tracking-wider text-sm"
                    style={{ color: WOOD_LIGHT }}
                  >
                    Pilih Tingkat Sekolah
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['sd','smp','sma_smk'].map(g => {
                      const label = QUESTION_THEME_OPTIONS.find(q => q.value === g)?.label || g;
                      const active = selectedGrade === (g as QuestionGrade);
                      return (
                        <button key={g} onClick={() => { setSelectedGrade(g as QuestionGrade); setDirection(1); setStepIndex(i => STEPS.indexOf('question-subject')); }}
                          className="py-4 px-3 rounded-2xl font-bold transition-all transform hover:scale-[1.02]"
                          style={{ background: active ? ACCENT_TINT : BOARD, border: `3px solid ${active ? ACCENT_DEEP : WOOD}`, color: active ? ACCENT_DEEP : INK, boxShadow: active ? `3px 3px 0 ${ACCENT_DEEP}` : `3px 3px 0 ${WOOD_DARK}` }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step: Pilih Mata Pelajaran sesuai grade ── */}
              {currentStep === 'question-subject' && (
                <div className="max-w-xl mx-auto w-full">
                  <p className="text-center font-semibold mb-6 uppercase tracking-wider text-sm" style={{ color: WOOD_LIGHT }}>
                    Pilih Mata Pelajaran ({selectedGrade})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(selectedGrade ? SUBJECTS_BY_GRADE[selectedGrade] : []).map(opt => {
                      const active = questionTheme === opt.value;
                      return (
                        <button key={opt.value} onClick={() => { setQuestionTheme(opt.value); }}
                          className="py-4 px-3 rounded-2xl font-bold transition-all transform hover:scale-[1.02]"
                          style={{ background: active ? ACCENT_TINT : BOARD, border: `3px solid ${active ? ACCENT_DEEP : WOOD}`, color: active ? ACCENT_DEEP : INK, boxShadow: active ? `3px 3px 0 ${ACCENT_DEEP}` : `3px 3px 0 ${WOOD_DARK}` }}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

       {/* ── Step 4: Tema Papan (final step) ── */}
              {currentStep === 'board-theme' && (
                <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                  <p
                    className="text-center font-semibold mb-6 uppercase tracking-wider text-sm"
                    style={{ color: WOOD_LIGHT }}
                  >
                    Pilih Peta Papan
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">

                    {BOARD_THEME_LIST.map((boardThemeOption, idx) => {
                      const name       = boardThemeOption.name;
                      const active     = boardTheme === name;
                      const isFree     = idx < 2;
                      const isUnlocked = isFree || unlockedBoards.includes(name);
                      const themeColor = getBoardThemeColor(name);
                      const isHovered  = hoveredBoard === name;

                      return (
                        <button
                          key={name}
                          onMouseEnter={() => setHoveredBoard(name)}
                          onMouseLeave={() => setHoveredBoard(null)}
                          onClick={() => handleBoardThemeClick(name, isUnlocked, boardThemeOption.label)}
                          className="p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all transform hover:scale-[1.02]"
                          style={{
                            background: '#ffffff',
                            border:     `3px solid ${active || isHovered ? themeColor.border : 'rgba(0,0,0,0.10)'}`,
                            boxShadow:  active
                              ? `0 0 0 3px ${themeColor.border}55, 4px 4px 0 ${themeColor.shadow}`
                              : isHovered
                                ? `0 0 0 2px ${themeColor.border}33, 3px 3px 0 ${themeColor.shadow}55`
                                : `2px 2px 0 rgba(0,0,0,0.08)`,
                          }}
                        >
                          <div className="mb-1.5 sm:mb-3">
                            <BoardThemePreview boardTheme={name} theme={boardThemeOption} />
                          </div>
                          <div className="text-center">
                            <div
                              className="font-bold text-[11px] sm:text-lg leading-tight mb-0.5 sm:mb-2"
                              style={{ color: active || isHovered ? themeColor.border : INK }}
                            >
                              {boardThemeOption.label}
                            </div>
                            <div className="hidden sm:block text-xs" style={{ color: WOOD_LIGHT }}>
                              {boardThemeOption.description}
                            </div>
                            {!isUnlocked && (
                              <div className="mt-1 text-[12px] font-bold" style={{ color: themeColor.border }}>
                                🔒 5 koin
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {/* Dice / Random card */}
                    {(() => {
                      const active    = boardTheme === 'random';
                      const isHovered = hoveredBoard === 'random';
                      // warna netral untuk random
                      const randomColor = { border: WOOD, shadow: WOOD_DARK };
                      return (
                        <button
                          onMouseEnter={() => setHoveredBoard('random')}
                          onMouseLeave={() => setHoveredBoard(null)}
                          onClick={() => setBoardTheme('random')}
                          className="p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all transform hover:scale-[1.02]"
                          style={{
                            background: '#ffffff',
                            border:     `3px solid ${active || isHovered ? randomColor.border : 'rgba(0,0,0,0.10)'}`,
                            boxShadow:  active
                              ? `0 0 0 3px ${randomColor.border}55, 4px 4px 0 ${randomColor.shadow}`
                              : isHovered
                                ? `0 0 0 2px ${randomColor.border}33, 3px 3px 0 ${randomColor.shadow}55`
                                : `2px 2px 0 rgba(0,0,0,0.08)`,
                          }}
                        >
                          <div
                            className="mb-1.5 sm:mb-3 w-full aspect-square rounded-xl overflow-hidden border flex items-center justify-center"
                            style={{
                              background:  '#f5f0e8',
                              borderColor: active || isHovered ? WOOD : 'rgba(0,0,0,0.08)',
                            }}
                          >
                            <motion.div
                              animate={{ rotate: [0, -8, 8, -8, 0] }}
                              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                            >
                              <Dices
                                className="w-7 h-7 sm:w-12 sm:h-12"
                                strokeWidth={1.8}
                                style={{ color: active || isHovered ? WOOD : WOOD_LIGHT }}
                              />
                            </motion.div>
                          </div>
                          <div className="text-center">
                            <div
                              className="font-bold text-[11px] sm:text-lg leading-tight mb-0.5 sm:mb-2"
                              style={{ color: active || isHovered ? WOOD : INK }}
                            >
                              Acak
                            </div>
                            <div className="hidden sm:block text-xs" style={{ color: WOOD_LIGHT }}>
                              Peta dipilih secara acak saat mulai
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                  </div>

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="max-w-2xl mx-auto w-full flex gap-3 pt-6">
          <button
            onClick={goBack}
            className="px-6 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all flex items-center gap-2"
            style={{
              background:  BOARD,
              border:      `3px solid ${WOOD}`,
              color:        INK,
              boxShadow:   `3px 3px 0 ${WOOD_DARK}`,
            }}
          >
            Kembali
          </button>
          <button
            onClick={currentStep === 'board-theme' ? handleStartGame : goNext}
            disabled={
              (currentStep === 'players-count' && !playerCount) ||
              (currentStep === 'players-config' && !allColorsSelected) ||
              (currentStep === 'question-grade' && !selectedGrade) ||
              (currentStep === 'question-subject' && !isSubjectSelected)
            }
            className="flex-1 py-3.5 px-6 rounded-2xl font-extrabold uppercase tracking-wider text-base transition-all transform flex items-center justify-center gap-2"
            style={
              (currentStep === 'players-count' && !playerCount) ||
              (currentStep === 'players-config' && !allColorsSelected) ||
              (currentStep === 'question-grade' && !selectedGrade) ||
              (currentStep === 'question-subject' && !isSubjectSelected)
                ? {
                    background: BOARD_DARK,
                    color:       WOOD_LIGHT,
                    cursor:      'not-allowed',
                    border:      `3px solid ${WOOD}`,
                    boxShadow:   `3px 3px 0 ${WOOD_DARK}`,
                  }
                : {
                    background: `linear-gradient(135deg, ${ACCENT}, #e8b820)`,
                    color:       INK,
                    boxShadow:   `0 4px 20px rgba(255,211,77,0.30), 0 2px 0 ${ACCENT_DEEP}`,
                    border:      'none',
                  }
            }
          >
            {currentStep === 'board-theme' ? 'Mulai Game' : 'Lanjut'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {spinResult && <BoardThemeSpinOverlay resultTheme={spinResult} onDone={handleSpinDone} />}

      {purchaseMeta && (
        <PurchaseModal
          isOpen={purchaseOpen}
          title={purchaseMeta.title}
          description={purchaseMeta.description}
          cost={purchaseMeta.cost}
          onCancel={() => setPurchaseOpen(false)}
          onConfirm={() => { purchaseMeta.onConfirm && purchaseMeta.onConfirm(); }}
          confirmLabel={purchaseMeta.cost ? 'Beli' : 'OK'}
        />
      )}
    </div>
  );
};

export default GameSetup;