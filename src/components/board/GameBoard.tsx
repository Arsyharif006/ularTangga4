'use client';
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { getBoardCoordinate } from '@/lib/boardUtils';
import { BOARD_THEMES } from '@/data/boardThemes';
import { BoardConnectors } from '@/components/BoardConnectors';
import { motion } from 'framer-motion';

// ─── Ambient particle layer ──────────────────────────────────────────────
// Pure CSS-driven, deterministic per-theme particle field. No external assets.
type ParticleKind = 'sand' | 'snow' | 'leaf' | 'ember' | 'star' | 'bubble';

interface ParticleSpec {
  id: number;
  left: number; // %
  delay: number; // s
  duration: number; // s
  size: number; // px
  drift: number; // px, horizontal sway amplitude
}

function makeParticles(count: number, seed: number): ParticleSpec[] {
  // simple deterministic pseudo-random so SSR/CSR match and theme switches feel stable
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: rand() * 6,
    duration: 6 + rand() * 6,
    size: 3 + rand() * 5,
    drift: 10 + rand() * 30,
  }));
}

const AmbientParticles = ({ kind }: { kind: ParticleKind }) => {
  const particleCount = kind === 'sand' ? 16 : kind === 'star' ? 30 : 22;
  const particles = useMemo(() => makeParticles(particleCount, kind.length * 17 + 3), [kind, particleCount]);

  if (kind === 'sand') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: '-4%',
              width: p.size,
              height: p.size,
              background: 'radial-gradient(circle, #fde68a 0%, #fbbf24 60%, transparent 100%)',
              boxShadow: '0 0 6px 1px rgba(253,230,138,0.6)',
              animation: `sandRise ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes sandRise {
            0% { transform: translate(0, 0); opacity: 0; }
            10% { opacity: 0.85; }
            90% { opacity: 0.6; }
            100% { transform: translate(8px, -112%); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (kind === 'snow') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.left}%`,
              top: '-4%',
              width: p.size,
              height: p.size,
              opacity: 0.85,
              boxShadow: '0 0 4px rgba(255,255,255,0.8)',
              animation: `snowFall ${p.duration}s linear ${p.delay}s infinite`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties}
          />
        ))}
        <style>{`
          @keyframes snowFall {
            0% { transform: translate(0, 0); opacity: 0; }
            8% { opacity: 0.9; }
            50% { transform: translate(var(--drift), 56%); }
            92% { opacity: 0.7; }
            100% { transform: translate(0, 112%); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (kind === 'leaf') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: '-4%',
              width: p.size + 3,
              height: p.size + 3,
              background: p.id % 2 === 0 ? '#65a30d' : '#ca8a04',
              borderRadius: '0 60% 0 60%',
              opacity: 0.8,
              animation: `leafFall ${p.duration + 2}s linear ${p.delay}s infinite`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties}
          />
        ))}
        <style>{`
          @keyframes leafFall {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.85; }
            50% { transform: translate(var(--drift), 56%) rotate(160deg); }
            90% { opacity: 0.6; }
            100% { transform: translate(calc(var(--drift) * -0.4), 112%) rotate(320deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (kind === 'ember') {
    // Lava theme: glowing embers and ash drifting upward, flickering as they rise.
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: '-4%',
              width: p.id % 3 === 0 ? p.size * 0.5 : p.size,
              height: p.id % 3 === 0 ? p.size * 0.5 : p.size,
              background: p.id % 3 === 0
                ? 'radial-gradient(circle, #44403c 0%, #292524 70%, transparent 100%)'
                : 'radial-gradient(circle, #fef3c7 0%, #f97316 55%, transparent 100%)',
              boxShadow: p.id % 3 === 0 ? 'none' : '0 0 8px 2px rgba(249,115,22,0.7)',
              animation: `emberRise ${p.duration}s ease-in ${p.delay}s infinite`,
              '--drift': `${p.drift * 0.6}px`,
            } as React.CSSProperties}
          />
        ))}
        <style>{`
          @keyframes emberRise {
            0% { transform: translate(0, 0) scale(1); opacity: 0; }
            12% { opacity: 1; }
            55% { transform: translate(var(--drift), -58%) scale(0.8); opacity: 0.8; }
            100% { transform: translate(calc(var(--drift) * 1.6), -114%) scale(0.3); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (kind === 'star') {
    // Space theme: twinkling stars, mostly static with a subtle pulse, plus
    // a couple of slow-drifting motes for depth.
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.left}%`,
              top: `${(p.id * 37) % 100}%`,
              width: p.id % 5 === 0 ? p.size * 0.9 : p.size * 0.35,
              height: p.id % 5 === 0 ? p.size * 0.9 : p.size * 0.35,
              boxShadow: p.id % 5 === 0 ? '0 0 6px 1px rgba(255,255,255,0.9)' : '0 0 2px rgba(255,255,255,0.6)',
              animation: `starTwinkle ${p.duration * 0.6}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes starTwinkle {
            0%, 100% { opacity: 0.25; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  // bubble (ocean)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-4%',
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(94,234,212,0.3) 60%, transparent 100%)',
            border: '1px solid rgba(255,255,255,0.4)',
            animation: `bubbleRise ${p.duration}s ease-in ${p.delay}s infinite`,
            '--drift': `${p.drift * 0.5}px`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes bubbleRise {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 0.8; }
          50% { transform: translate(var(--drift), -56%); }
          90% { opacity: 0.6; }
          100% { transform: translate(calc(var(--drift) * -1), -114%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── Themed cell texture (subtle, per-theme background motif) ───────────
const CellTexture = ({ kind }: { kind: ParticleKind }) => {
  if (kind === 'sand') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
        <path d="M0 7 Q2.5 5.5 5 7 T10 7" stroke="#92400e" strokeWidth="0.4" fill="none" />
      </svg>
    );
  }
  if (kind === 'snow') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.22] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
        <path d="M5 1.5 L5 8.5 M2 3.5 L8 6.5 M8 3.5 L2 6.5" stroke="#0c4a6e" strokeWidth="0.3" />
      </svg>
    );
  }
  if (kind === 'ember') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.22] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
        <path d="M1 8 L4 4 L6 6.5 L9 2" stroke="#f97316" strokeWidth="0.4" fill="none" />
      </svg>
    );
  }
  if (kind === 'star') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.25] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
        <circle cx="2.5" cy="3" r="0.3" fill="#e9d5ff" />
        <circle cx="7" cy="6.5" r="0.25" fill="#e9d5ff" />
        <circle cx="5" cy="8.5" r="0.2" fill="#e9d5ff" />
      </svg>
    );
  }
  if (kind === 'bubble') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-[0.2] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
        <circle cx="3" cy="6" r="1" stroke="#5eead4" strokeWidth="0.3" fill="none" />
        <circle cx="7" cy="3.5" r="0.6" stroke="#5eead4" strokeWidth="0.3" fill="none" />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.2] pointer-events-none" viewBox="0 0 10 10" preserveAspectRatio="none">
      <path d="M5 1 Q7 4 5 9 Q3 4 5 1 Z" stroke="#14532d" strokeWidth="0.3" fill="none" />
    </svg>
  );
};

export const GameBoard = () => {
  const players = useGameStore(state => state.players);
  const placedBombs = useGameStore(state => state.placedBombs);
  const boardTheme = useGameStore(state => state.boardTheme);
  const currentBoardConfig = BOARD_THEMES[boardTheme].config;
  const themeConfig = BOARD_THEMES[boardTheme];
  const visual = themeConfig.visual;
  const [cells, setCells] = useState<number[]>([]);

  useEffect(() => {
    const newCells = Array.from({ length: 100 }, (_, i) => i + 1);
    setCells(newCells);
  }, []);

  useEffect(() => {
    const visiblePlayers = players.filter(p => p.position > 0);
    if (visiblePlayers.length > 0) {
      console.log('[BOARD] Visible players:', visiblePlayers.map(p => ({ id: p.id, name: p.name, pos: p.position })));
    }
  }, [players]);

  return (
    <div
      className={`relative w-full max-w-2xl aspect-square bg-gradient-to-br ${themeConfig.bgGradient} border-4 rounded-2xl overflow-hidden shadow-2xl`}
      style={{ borderColor: themeConfig.accentColor + '40' }}
    >
      {/* Ambient glow per tema */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full blur-3xl" style={{ backgroundColor: themeConfig.accentColor + '20' }} />
      </div>

      {/* Themed ambient particles (sand sparkle / falling snow / falling leaves / embers / stars / bubbles) */}
      <AmbientParticles kind={visual.particle} />

      {/* CSS Grid for the 10x10 board */}
      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 z-[2]">
        {cells.map((cellNum) => {
          const coord = getBoardCoordinate(cellNum);
          const cssRow = 10 - coord.row;
          const cssCol = coord.col + 1;

          const snakeHead = currentBoardConfig.snakes.find(s => s.head === cellNum);
          const snakeTail = currentBoardConfig.snakes.find(s => s.tail === cellNum);
          const ladderBottom = currentBoardConfig.ladders.find(l => l.bottom === cellNum);
          const ladderTop = currentBoardConfig.ladders.find(l => l.top === cellNum);

          const isMysteryBox = currentBoardConfig.mysteryBoxes.some(b => b.position === cellNum);
          const hasBomb = placedBombs.some(b => b.position === cellNum);

          return (
            <div
              key={cellNum}
              className={`border border-white/10 flex flex-col items-center justify-center text-xs font-bold text-white/30 relative overflow-hidden
                ${snakeHead ? 'bg-rose-500/10' : ''}
                ${ladderBottom ? 'bg-emerald-500/10' : ''}
                ${isMysteryBox ? 'bg-violet-500/10' : ''}
                ${hasBomb ? 'bg-amber-500/20 ring-2 ring-amber-400/50' : ''}
              `}
              style={{ gridRow: cssRow, gridColumn: cssCol }}
            >
              <CellTexture kind={visual.particle} />
              <span className="relative z-[1]">{cellNum}</span>
              {isMysteryBox && <span className="absolute text-xl opacity-70 z-[1]">{visual.boxIcon}</span>}
              {hasBomb && <span className="absolute text-2xl animate-bounce drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-[1]">💣</span>}

              {/* Down-entity indicators (snake / ice-crack / liana) */}
              {snakeHead && (
                <div className="absolute top-0 right-0 p-1 flex flex-col items-center leading-none z-[1]" title={`${visual.downEntityLabel}: turun ke ${snakeHead.tail}`}>
                  <span className="text-sm">{visual.downIcon}</span>
                  <span className="text-[9px] text-rose-300">ke {snakeHead.tail}</span>
                </div>
              )}
              {snakeTail && (
                <div className="absolute bottom-0 left-0 p-1 leading-none text-rose-300/70 text-[8px] z-[1]" title={`Ujung dari ${snakeTail.head}`}>
                  ⬇️ dari {snakeTail.head}
                </div>
              )}

              {/* Up-entity indicators (rope / ice ladder / vine root) */}
              {ladderBottom && (
                <div className="absolute bottom-0 right-0 p-1 flex flex-col items-center leading-none z-[1]" title={`${visual.upEntityLabel}: naik ke ${ladderBottom.top}`}>
                  <span className="text-[9px] text-emerald-300">ke {ladderBottom.top}</span>
                  <span className="text-sm">{visual.upIcon}</span>
                </div>
              )}
              {ladderTop && (
                <div className="absolute top-0 left-0 p-1 leading-none text-emerald-300/70 text-[8px] z-[1]" title={`Puncak dari ${ladderTop.bottom}`}>
                  ⬆️ dari {ladderTop.bottom}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.4))' }}
      >
        <BoardConnectors boardTheme={boardTheme} currentBoardConfig={currentBoardConfig} visual={visual} />
      </svg>

      {/* Players */}
      <div className="absolute inset-0 z-[4]">
        {players.map((player, playerIdx) => {
          if (player.position === 0) return null;

          const coord = getBoardCoordinate(player.position);

          const playersAtPosition = players.filter(p => p.position === player.position && p.position > 0);
          const playerCountAtPos = playersAtPosition.length;
          const indexAtPos = playersAtPosition.findIndex(p => p.id === player.id);

          let bottomPercent = coord.row * 10 + 1;
          let leftPercent = coord.col * 10 + 1;
          let width = 8;
          let height = 8;

          if (playerCountAtPos > 1) {
            const gridSize = Math.ceil(Math.sqrt(playerCountAtPos));
            const cellWidth = 8 / gridSize;
            const cellHeight = 8 / gridSize;

            const row = Math.floor(indexAtPos / gridSize);
            const col = indexAtPos % gridSize;

            bottomPercent = coord.row * 10 + 1 + row * cellHeight * 0.8;
            leftPercent = coord.col * 10 + 1 + col * cellWidth * 0.8;
            width = cellWidth * 0.9;
            height = cellHeight * 0.9;
          }

          const colors = {
            red: 'bg-rose-500 shadow-rose-500',
            blue: 'bg-blue-500 shadow-blue-500',
            green: 'bg-emerald-500 shadow-emerald-500',
            yellow: 'bg-amber-400 shadow-amber-400',
          };

          return (
            <motion.div
              key={`${player.id}-${playerIdx}`}
              animate={{ bottom: `${bottomPercent}%`, left: `${leftPercent}%` }}
              transition={{
                type: 'tween',
                duration: 0.25,
                ease: 'easeInOut',
              }}
              className={`absolute rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white flex items-center justify-center text-white font-bold ${colors[player.color]} ${
                playerCountAtPos > 1 ? 'text-xs' : 'text-sm'
              }`}
              style={{
                bottom: `${bottomPercent}%`,
                left: `${leftPercent}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              {player.id}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};