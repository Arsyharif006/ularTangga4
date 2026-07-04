'use client';
import { motion } from 'framer-motion';

// ── Design tokens (sama dengan Main Menu & Settings) ────────────────────
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';

export const Card = ({ children, className = '', hoverable = false }: { children: React.ReactNode, className?: string, hoverable?: boolean }) => {
  return (
    <motion.div 
      whileHover={hoverable ? { y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" } : {}}
      className={`backdrop-blur-xl rounded-2xl p-6 shadow-xl ${className}`}
      style={{ background: `${WOOD_DARK}cc`, border: `2px solid ${WOOD_LIGHT}` }}
    >
      {children}
    </motion.div>
  );
};