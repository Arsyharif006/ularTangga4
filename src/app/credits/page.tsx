'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, Gamepad2, Heart, Sparkles, Trophy, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const BOARD = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD = '#7A4A26';
const WOOD_DARK = '#5C3417';
const INK = '#3A2814';
const ACCENT = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

const creditsSections = [
  {
    title: 'Game Project',
    icon: <Sparkles className="h-4 w-4" />,
    lines: ['Ular Tangga Digital', 'Versi edukatif yang penuh tantangan dan nostalgia.'],
  },
  {
    title: 'Developer',
    icon: <Gamepad2 className="h-4 w-4" />,
    lines: ['Nama Developer Dummy', 'Konsep, UI/UX, gameplay, dan fitur progresif.'],
  },
  {
    title: 'Dukungan',
    icon: <Users className="h-4 w-4" />,
    lines: ['Tim Pengembang & Penguji', 'Feedback, balancing, dan testing gameplay.'],
  },
  {
    title: 'Institusi',
    icon: <Trophy className="h-4 w-4" />,
    lines: ['Universitas Indraprasta PGRI', 'Dukungan institusi dan semangat akademik.'],
  },
  {
    title: 'Special Thanks',
    icon: <Heart className="h-5 w-5" style={{ color: '#dc2626' }} />,
    lines: ['Terima kasih untuk semua teman, rekan, dan pengguna.', 'Semoga aplikasi ini bermanfaat dan menyenangkan.'],
  },
];

export default function CreditsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #2B1B0F 0%, #4A2A14 100%)' }}>
      <div className="relative overflow-hidden px-4 pb-10 pt-4">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, #FFD34D 0%, transparent 35%)' }} />

        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border-4" style={{ background: BOARD, borderColor: WOOD, boxShadow: `8px 8px 0 ${WOOD_DARK}` }}>
          <div className="flex items-center justify-between px-4 py-4" style={{ background: WOOD_DARK, borderBottom: `4px solid ${WOOD}` }}>
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 text-white"
              style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Credits</p>
              <h1 className="text-xl font-black tracking-tight" style={{ color: ACCENT, textShadow: `0 2px 0 ${WOOD}` }}>KREDIT & TERIMA KASIH</h1>
            </div>
            <div className="h-10 w-10" />
          </div>

          <div className="p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] border-4 p-5 sm:p-6"
              style={{ background: 'linear-gradient(135deg, #FFF7E8 0%, #F7D9A0 100%)', borderColor: WOOD }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex items-center gap-3 rounded-full px-4 py-2" style={{ background: ACCENT, color: WOOD_DARK }}>
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-[0.25em]">Game Project</span>
                </div>
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4" style={{ background: BOARD_DARK, borderColor: WOOD }}>
                  <Image src="/image/ular-tangga-logo.svg" alt="Logo Ular Tangga" width={90} height={90} />
                </div>
                <h2 className="text-2xl font-black" style={{ color: INK }}>Ular Tangga Digital</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: WOOD_DARK }}>
                  Sebuah permainan edukatif yang menggabungkan nostalgia ular tangga dengan tantangan soal, mode offline, online, dan fitur redeem.
                </p>
              </div>
            </motion.div>

            <div className="mt-5 rounded-[24px] border-4 p-3 sm:p-4" style={{ background: '#2f1d10', borderColor: WOOD }}>
              <div className="relative h-[62vh] overflow-hidden rounded-[18px] border-2" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'linear-gradient(180deg, rgba(255,247,232,0.08) 0%, rgba(15,12,10,0.95) 100%)' }}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#2f1d10] to-transparent z-10" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2f1d10] to-transparent z-10" />
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: ['0%', '-68%'] }}
                  transition={{ duration: 24, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
                  className="absolute inset-x-0 top-0 flex flex-col items-center px-3 py-6 text-center"
                >
                  <div className="mb-8 flex flex-col items-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4" style={{ background: BOARD, borderColor: WOOD }}>
                      <Image src="/image/ular-tangga-logo.svg" alt="Logo Ular Tangga" width={70} height={70} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: ACCENT }}>Now Showing</p>
                    <h3 className="mt-2 text-xl font-black" style={{ color: '#fff7e8' }}>Ular Tangga Edukatif</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: '#e7d7b4' }}>
                      Sebuah perjalanan penuh soal, strategi, dan keseruan dalam satu papan permainan.
                    </p>
                  </div>

                  {creditsSections.map((section, index) => (
                    <div key={section.title} className="mb-8 w-full max-w-md">
                      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
                        {section.icon}
                        <span>{section.title}</span>
                      </div>
                      <div className="space-y-2 rounded-[18px] border-2 p-4" style={{ background: 'rgba(255,247,232,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}>
                        {section.lines.map((line) => (
                          <p key={line} className="text-sm leading-relaxed" style={{ color: '#f7ebd0' }}>
                            {line}
                          </p>
                        ))}
                      </div>
                      {index === creditsSections.length - 1 && (
                        <div className="mt-6 rounded-[18px] border-2 p-4" style={{ background: 'rgba(255, 211, 77, 0.12)', borderColor: 'rgba(255, 211, 77, 0.35)' }}>
                          <p className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>Terima kasih</p>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#f7ebd0' }}>Semoga setiap langkah di papan membawa pengalaman belajar yang menyenangkan.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
