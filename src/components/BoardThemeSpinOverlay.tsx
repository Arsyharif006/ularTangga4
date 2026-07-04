'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BOARD_THEME_LIST, type BoardThemeName, type BoardTheme } from '@/data/boardThemes';
import { BoardThemePreview } from '@/components/BoardThemePreview';

// ── Design tokens (sama dengan Main Menu & Settings) ────────────────────
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

const CARD_WIDTH = 120; // px — must match w-[120px] below
const CARD_GAP = 20; // px — must match gap-5 (1.25rem = 20px) below
const STEP = CARD_WIDTH + CARD_GAP; // distance from one card's left edge to the next
const REEL_LENGTH = 60; // how many cards to lay out in the strip
const SPIN_SECONDS = 4.2;
const HOLD_MS = 900;
const VIEWPORT_HEIGHT = 170;

/**
 * Full-screen CS:GO-case-opening-style horizontal reel. Spins through a long
 * strip of theme cards, decelerating to a stop centered exactly on
 * `resultTheme`. Calls onDone after the stop + a short hold so the caller can
 * navigate away.
 *
 * Centering math: the strip's own left edge starts flush at x=0 (no padding
 * tricks), and the viewport is measured at runtime via ref so the formula
 * works at any screen width. To put the *center* of card `targetIndex` under
 * the viewport's center marker, we translate the strip left by:
 *   (targetIndex * STEP + CARD_WIDTH / 2) - viewportWidth / 2
 * Getting this single source of truth right is what keeps the stop position
 * exactly aligned with the marker — a stray padding-left on the strip
 * (removed here) was throwing this off by half a card's width before.
 */
export const BoardThemeSpinOverlay = ({
  resultTheme,
  onDone,
}: {
  resultTheme: BoardThemeName;
  onDone: () => void;
}) => {
  const [spinning, setSpinning] = useState(true);
  const [finalX, setFinalX] = useState<number | null>(null);
  const [markerHeight, setMarkerHeight] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone; // always call the latest one, without re-triggering effects

  // Build a long strip of cards ending on resultTheme at a fixed index so we
  // can compute exactly how far to translate to land on it centered.
  const { strip, targetIndex } = useMemo(() => {
    const items: BoardTheme[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      items.push(BOARD_THEME_LIST[Math.floor(Math.random() * BOARD_THEME_LIST.length)]);
    }
    // Force a specific late index to be the actual result, so the strip
    // visually "settles" on the real outcome rather than something random.
    const landingIndex = REEL_LENGTH - 6;
    items[landingIndex] = BOARD_THEME_LIST.find(t => t.name === resultTheme) ?? items[landingIndex];
    return { strip: items, targetIndex: landingIndex };
  }, [resultTheme]);

  // Measure the actual viewport width on mount so centering is correct at
  // any screen size (mobile vs desktop), instead of assuming a fixed width.
  useEffect(() => {
    const vw = viewportRef.current?.offsetWidth ?? 0;
    const cardCenter = targetIndex * STEP + CARD_WIDTH / 2;
    setFinalX(vw / 2 - cardCenter);
  }, [targetIndex]);

  // Measure the actual rendered height of a card (preview image + label)
  // so the marker frame hugs the card exactly instead of stretching the
  // full reel viewport height.
  useEffect(() => {
    const h = firstCardRef.current?.offsetHeight;
    if (h) setMarkerHeight(h);
  }, [finalX]);

  const handleSpinComplete = () => {
    setSpinning(false);
    setTimeout(() => onDoneRef.current(), HOLD_MS);
  };

  // Safety net: even if onAnimationComplete somehow never fires (tab thrown
  // in the background, etc.), force progression so the user is never stuck
  // on this screen.
  useEffect(() => {
    const fallback = setTimeout(() => {
      setSpinning(false);
      setTimeout(() => onDoneRef.current(), HOLD_MS);
    }, SPIN_SECONDS * 1000 + 1500);
    return () => clearTimeout(fallback);
  }, []);

  const resultLabel = BOARD_THEME_LIST.find(t => t.name === resultTheme)?.label ?? '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" style={{ background: 'rgba(43,27,15,0.97)' }}>
      {/* Ambient wood texture, matches other overlays */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)` }} />

      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 font-bold uppercase tracking-[0.2em] text-xs sm:text-sm mb-6"
        style={{ color: WOOD_LIGHT }}
      >
        Mengacak Peta...
      </motion.p>

      {/* Viewport with center marker */}
      <div ref={viewportRef} className="relative z-10 w-full max-w-xl mx-6 sm:mx-0" style={{ height: VIEWPORT_HEIGHT }}>
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-[5]" style={{ background: 'linear-gradient(to right, #2B1B0F, transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-[5]" style={{ background: 'linear-gradient(to left, #2B1B0F, transparent)' }} />

          {finalX !== null && (
            <motion.div
              className="flex items-center h-full"
              style={{ gap: CARD_GAP }}
              initial={{ x: 0 }}
              animate={{ x: finalX }}
              transition={{ duration: SPIN_SECONDS, ease: [0.12, 0.85, 0.18, 1] }}
              onAnimationComplete={handleSpinComplete}
            >
              {strip.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  ref={i === 0 ? firstCardRef : undefined}
                  className="flex-shrink-0 rounded-xl p-2"
                  style={{ width: CARD_WIDTH, background: 'rgba(122,74,38,0.18)', border: `2px solid rgba(122,74,38,0.4)` }}
                >
                  <BoardThemePreview boardTheme={t.name} theme={t} />
                  <div className="text-center text-[10px] font-bold mt-1.5 leading-tight" style={{ color: WOOD_LIGHT }}>{t.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Center selection marker — height matches the card itself (not the
            full reel viewport), measured at runtime so it always tracks the
            card's real rendered height. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-xl"
          style={{
            width: CARD_WIDTH + 6,
            height: markerHeight ?? CARD_WIDTH,
            borderLeft: `2px solid ${ACCENT}`,
            borderRight: `2px solid ${ACCENT}`,
            boxShadow: `0 0 24px rgba(255,211,77,0.45)`,
          }}
        />
      </div>

      {!spinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="relative z-10 mt-8 text-center"
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: WOOD_LIGHT }}>Peta Terpilih</p>
          <p
            className="text-2xl sm:text-3xl font-black"
            style={{
              color: ACCENT,
              WebkitTextStroke: `1px ${WOOD_DARK}`,
              textShadow: `0 2px 0 ${ACCENT_DEEP}`,
            }}
          >
            {resultLabel}
          </p>
        </motion.div>
      )}
    </div>
  );
};