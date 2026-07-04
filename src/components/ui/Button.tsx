'use client';
import { motion, HTMLMotionProps } from 'framer-motion';

// ── Design tokens (sama dengan Main Menu, Settings & Modal) ───────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className = '', children, style, ...props }: ButtonProps) => {
  const baseStyle = "rounded-xl font-bold transition-colors";

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`,
      color: WOOD_DARK,
      border: `2px solid ${WOOD_DARK}`,
      boxShadow: `0 4px 0 ${ACCENT_DEEP}, 3px 3px 0 ${WOOD_DARK}`,
    },
    secondary: {
      background: BOARD_DARK,
      color: INK,
      border: `2px solid ${WOOD}`,
      boxShadow: `2px 2px 0 ${WOOD_DARK}`,
    },
    danger: {
      background: '#F3DCD3',
      color: '#7A3420',
      border: '2px solid #C77B5E',
      boxShadow: '2px 2px 0 #9F4E33',
    },
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: `0 0 15px ${ACCENT}80` }}
      whileTap={{ scale: 0.95 }}
      className={`${baseStyle} ${sizes[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </motion.button>
  );
};