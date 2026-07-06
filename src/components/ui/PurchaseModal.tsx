'use client';

import { Modal } from './Modal';
import { X } from 'lucide-react';

// Design tokens (sama dengan Settings)
const BOARD      = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK        = '#3A2814';
const ACCENT     = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

interface Props {
  isOpen: boolean;
  title?: string;
  description?: string;
  cost?: number;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export const PurchaseModal = ({ isOpen, title, description, cost, onCancel, onConfirm, confirmLabel = 'Beli' }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm font-semibold" style={{ color: WOOD_LIGHT }}>{description}</p>
        {typeof cost === 'number' && (
          <div className="flex items-center gap-2">
            <div className="text-2xl">🪙</div>
            <div>
              <div className="font-black text-lg" style={{ color: ACCENT_DEEP }}>{cost}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: WOOD_LIGHT }}>Biaya</div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl font-bold" style={{ background: BOARD_DARK, color: INK, border: `2px solid ${WOOD}` }}>Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl font-black" style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseModal;
