'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

// ── Design tokens (sama dengan Main Menu & Settings) ────────────────────
const BOARD      = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK        = '#3A2814';
const ACCENT     = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full ${sizes[size]} rounded-2xl shadow-2xl overflow-hidden`}
            style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `5px 5px 0 ${WOOD_DARK}, 0 25px 50px -12px rgba(0,0,0,0.5)` }}
          >
            {/* Ambient glow, satu tema dengan halaman lain */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full blur-3xl" style={{ background: `${ACCENT}22` }} />
            </div>

            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(to right, ${WOOD}, ${ACCENT}, ${WOOD})` }}></div>

            {title && (
              <div className="relative z-10 flex justify-between items-center p-6" style={{ borderBottom: `2px solid ${WOOD}` }}>
                <h2
                  className="text-xl font-black tracking-tight"
                  style={{
                    color: ACCENT_DEEP,
                    textShadow: `0 1px 0 rgba(255,255,255,0.4)`,
                  }}
                >
                  {title}
                </h2>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: WOOD, border: `1.5px solid ${WOOD}`, background: BOARD_DARK }}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            <div className="relative z-10 p-6" style={{ color: INK }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};