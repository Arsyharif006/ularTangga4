'use client';
import { useGameStore } from '@/stores/gameStore';

// ── Design tokens (sama dengan Settings & GamePage) ───────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

export const Inventory = ({ isLocalTurn = true }: { isLocalTurn?: boolean }) => {
  const { players, currentPlayerIndex, phase, useItem, isItemInUse, turnActionLock } = useGameStore();
  const player = players[currentPlayerIndex];

  if (!player) return null;

  // STRICT VALIDATION: Item can only be used if it is the local (human) player's turn
  const isCurrentPlayerHuman = !player.isBot;
  const isMyTurn = isLocalTurn && isCurrentPlayerHuman && (phase === 'rolling' || phase === 'question');

  return (
    <div
      className="mt-4 p-4 rounded-2xl"
      style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
    >
      <h3
        className="text-[10px] font-black mb-3 uppercase tracking-widest"
        style={{ color: WOOD_LIGHT }}
      >
        Inventaris ({player.inventory.length}/3)
      </h3>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => {
          const item = player.inventory[i];
          const skillAlreadyUsed = item && ['skip_turn', 'push_back', 'swap_position'].includes(item.type) &&
                                    player.usedSkillThisTurn && player.usedSkillThisTurn.includes(item.type);
                const canUse = item && item.usage === 'manual' && isMyTurn && !skillAlreadyUsed && !isItemInUse && !turnActionLock;

          return (
            <div
              key={i}
              className="w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all"
              style={{
                background: item ? ACCENT_TINT : BOARD_DARK,
                border: `2.5px solid ${item ? ACCENT_DEEP : WOOD}`,
                boxShadow: item ? `2px 2px 0 ${ACCENT_DEEP}` : `2px 2px 0 ${WOOD_DARK}`,
                borderStyle: item ? 'solid' : 'dashed',
                cursor: canUse ? 'pointer' : skillAlreadyUsed ? 'not-allowed' : 'default',
                opacity: skillAlreadyUsed ? 0.45 : 1,
              }}
              onClick={() => {
                if (canUse) {
                  useItem(item.id);
                }
              }}
              onMouseEnter={(e) => {
                if (canUse) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = ACCENT_DEEP;
                  e.currentTarget.style.boxShadow = `0 0 10px rgba(140,94,0,0.35), 2px 2px 0 ${ACCENT_DEEP}`;
                }
              }}
              onMouseLeave={(e) => {
                if (canUse) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${ACCENT_DEEP}`;
                }
              }}
              title={item ? `${item.name}\n${item.description}${skillAlreadyUsed ? '\n(Sudah dipakai kali ini)' : ''}` : 'Slot Kosong'}
            >
              {item ? (
                <>
                  <span className="text-2xl">{item.icon}</span>
                  {item.usage === 'auto' && (
                    <span className="text-[9px] uppercase mt-1 font-bold" style={{ color: ACCENT_DEEP }}>Auto</span>
                  )}
                  {skillAlreadyUsed && (
                    <span className="text-[9px] uppercase mt-1 font-bold text-rose-600">Used</span>
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold" style={{ color: WOOD_LIGHT }}>Kosong</span>
              )}
            </div>
          );
        })}
      </div>
      {player.correctStreak > 0 && (
        <div className="mt-3 text-xs font-bold" style={{ color: WOOD_LIGHT }}>
          Streak Benar: <span className="font-black text-emerald-700">{player.correctStreak}🔥</span> / 3
        </div>
      )}
    </div>
  );
};