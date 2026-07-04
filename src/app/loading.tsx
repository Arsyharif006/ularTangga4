'use client';

import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#5C3417] flex items-center justify-center">
      <motion.div
        className="text-5xl"
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        role="status"
        aria-label="Loading"
      >
        🎲
      </motion.div>
    </div>
  );
}
