'use client';

import { motion, useInView } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

/* ──────────────────────────────────────────────────────────
   DESIGN TOKENS
   Board: cream cardboard, wood-brown frame, 4 classic pawn
   colors (red / blue / yellow / green). Squares, not cards.
   ────────────────────────────────────────────────────────── */
const BOARD = '#EFDFB8';        // cream cardboard
const BOARD_DARK = '#E2CC95';   // alt square shade
const WOOD = '#7A4A26';         // frame / rule lines
const WOOD_DARK = '#5C3417';
const INK = '#3A2814';          // primary text on cream

const PAWNS = {
  red: { base: '#D62828', deep: '#8C1A1A', tint: '#F7D9D9' },
  blue: { base: '#1D5FB8', deep: '#123B73', tint: '#D9E6F7' },
  yellow: { base: '#E8A400', deep: '#8C5E00', tint: '#FBEACB' },
  green: { base: '#2F8F4E', deep: '#1B5C30', tint: '#DCEFE0' },
} as const;

/* ─── die face icon, drawn from pips so it reads instantly as a real die ─── */
function DieFace({ value, size = 22, color = WOOD }: { value: number; size?: number; color?: string }) {
  const layouts: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={4} y={4} width={92} height={92} rx={16} fill="white" stroke={color} strokeWidth={6} />
      {layouts[value].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={9} fill={color} />
      ))}
    </svg>
  );
}

/* ─── board hero: a genuine corner of a snakes & ladders grid ─── */
function BoardHero() {
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full" role="img" aria-label="Papan ular tangga">
      {Array.from({ length: 36 }).map((_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const light = (col + row) % 2 === 0;
        return (
          <rect
            key={i}
            x={col * 23 + 1}
            y={row * 23 + 1}
            width={21}
            height={21}
            fill={light ? BOARD : BOARD_DARK}
            stroke={WOOD}
            strokeWidth={1}
            strokeOpacity={0.35}
          />
        );
      })}
      {/* snake */}
      <path
        d="M105 18 Q120 35 100 50 Q75 68 95 90 Q115 105 100 125"
        stroke={PAWNS.green.base}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={100} cy={125} r={8} fill={PAWNS.green.base} />
      <circle cx={97} cy={123} r={1.6} fill="white" />
      <circle cx={103} cy={123} r={1.6} fill="white" />
      {/* ladder */}
      <line x1={20} y1={128} x2={42} y2={20} stroke={PAWNS.yellow.deep} strokeWidth={4} strokeLinecap="round" />
      <line x1={34} y1={128} x2={56} y2={20} stroke={PAWNS.yellow.deep} strokeWidth={4} strokeLinecap="round" />
      {[0.15, 0.35, 0.55, 0.75, 0.92].map((t, i) => (
        <line
          key={i}
          x1={20 + t * (42 - 20)}
          y1={128 + t * (20 - 128)}
          x2={34 + t * (56 - 34)}
          y2={128 + t * (20 - 128)}
          stroke={PAWNS.yellow.deep}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      {/* pawns sitting on squares */}
      <circle cx={68} cy={80} r={7} fill={PAWNS.red.base} stroke={PAWNS.red.deep} strokeWidth={1.5} />
      <circle cx={30} cy={57} r={7} fill={PAWNS.blue.base} stroke={PAWNS.blue.deep} strokeWidth={1.5} />
    </svg>
  );
}

/* ─── numbered board square that opens into a chapter ─── */
interface ChapterProps {
  squareNumber: number;
  icon: string;
  title: string;
  pawn: keyof typeof PAWNS;
  children: React.ReactNode;
  flip: boolean;
}

function Chapter({ squareNumber, icon, title, pawn, children, flip }: ChapterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const c = PAWNS[pawn];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: flip ? 24 : -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      style={{
        background: BOARD,
        border: `3px solid ${WOOD}`,
        borderRadius: 14,
        boxShadow: `4px 4px 0 ${WOOD_DARK}`,
      }}
    >
      {/* square number badge, top-left corner like a board tile */}
      <div
        className="absolute -top-4 -left-3 w-10 h-10 flex items-center justify-center font-black text-base"
        style={{
          background: c.base,
          color: 'white',
          border: `3px solid ${WOOD}`,
          borderRadius: 10,
          transform: 'rotate(-6deg)',
        }}
      >
        {squareNumber}
      </div>

      <div className="flex items-center gap-3 px-5 pt-5 pb-3 pl-7">
        <div
          className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: c.tint, border: `2px solid ${c.base}`, borderRadius: 10 }}
        >
          {icon}
        </div>
        <h3 className="text-lg font-black leading-tight" style={{ color: INK }}>
          {title}
        </h3>
      </div>

      <div className="px-5 pb-5 pl-7 text-sm leading-relaxed" style={{ color: INK }}>
        {children}
      </div>
    </motion.div>
  );
}

/* ─── tip ribbon, styled like a board game rules card ─── */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 flex gap-2 p-3"
      style={{ background: PAWNS.yellow.tint, border: `2px dashed ${PAWNS.yellow.deep}`, borderRadius: 10 }}
    >
      <span className="text-base flex-shrink-0">📌</span>
      <p className="text-xs leading-relaxed font-bold" style={{ color: PAWNS.yellow.deep }}>
        {children}
      </p>
    </div>
  );
}

function Item({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-base flex-shrink-0 leading-snug">{icon}</span>
      <span className="text-sm leading-snug" style={{ color: INK, opacity: 0.85 }}>
        {text}
      </span>
    </div>
  );
}

function Rule() {
  return <div className="my-1 h-px" style={{ background: WOOD, opacity: 0.2 }} />;
}

/* ─── main page ─── */
export default function HelpPage() {
  const router = useRouter();

  const chapters: Omit<ChapterProps, 'flip'>[] = [
    {
      squareNumber: 1,
      icon: '🤖',
      title: 'Mode VS AI',
      pawn: 'red',
      children: (
        <>
          <p>
            Pilih mode <strong style={{ color: PAWNS.red.deep }}>VS AI</strong> jika ingin bermain solo namun tetap terasa seru.
            Kamu bisa memilih jumlah pemain, tema pertanyaan, dan papan yang ingin dipakai sebelum mulai.
          </p>

          <Item icon="🧠" text="AI akan menjadi lawan atau partner tambahan sesuai mode yang kamu pilih." />

          <Rule />

          <Item icon="🎮" text="Mode ini cocok untuk latihan sebelum bermain bareng teman atau orang lain." />

          <Tip>Mode VS AI sangat pas untuk berlatih strategi dan memahami alur permainan tanpa perlu menunggu lawan.</Tip>
        </>
      ),
    },

    {
      squareNumber: 2,
      icon: '🧩',
      title: 'Offline Bareng Teman',
      pawn: 'green',
      children: (
        <>
          <p className="mb-2">
            Mode offline cocok untuk bermain bersama teman di satu perangkat. Kamu bisa mengatur nama, warna bidak,
            dan tema pertanyaan sebelum memulai.
          </p>

          <Item icon="👥" text="Pilih 2–4 pemain agar permainan terasa lebih hidup dan seru." />

          <Rule />

          <Item icon="🎲" text="Setiap giliran, tekan tombol lempar dadu dan lanjutkan tantangan sampai ada pemenang." />

          <Tip>Mode ini paling cocok saat ingin main santai di rumah atau saat tidak ada koneksi internet.</Tip>
        </>
      ),
    },

    {
      squareNumber: 3,
      icon: '🌐',
      title: 'Online Bareng Teman / Orang Lain',
      pawn: 'yellow',
      children: (
        <>
          <p className="mb-2">
            Untuk bermain secara real-time, masuk dengan akun Google lalu buat room atau bergabung lewat kode room.
          </p>

          <Item icon="🔑" text="Buat room baru atau gunakan kode room untuk join ke sesi yang sudah dibuat." />

          <Rule />

          <Item icon="👑" text="Permainan dimulai setelah semua pemain siap dan room sudah lengkap." />

          <Rule />

          <Item icon="🔄" text="Giliran, posisi, dan item akan tersinkronisasi otomatis antar pemain." />

          <Tip>Gunakan koneksi internet yang stabil agar permainan tetap lancar saat bermain online.</Tip>
        </>
      ),
    },

    {
      squareNumber: 4,
      icon: '🎁',
      title: 'Kode Redeem',
      pawn: 'blue',
      children: (
        <>
          <p className="mb-2">
            Kode redeem bisa ditukar dari halaman akun untuk mendapatkan hadiah langsung ke akunmu.
          </p>

          <Tip>Setiap kode hanya bisa dipakai sekali per akun, jadi pakai dengan bijak.</Tip>
        </>
      ),
    },

    {
      squareNumber: 5,
      icon: '🧠',
      title: 'Sistem Pertanyaan dan Item',
      pawn: 'red',
      children: (
        <>
          <p className="mb-2">
            Saat pemain mendarat di kotak pertanyaan, mereka harus menjawab soal dalam waktu terbatas.
          </p>

          <Item icon="✅" text="Jawaban benar menjaga posisi dan bisa memicu streak yang lebih panjang." />

          <Rule />

          <Item icon="🛡️" text="Item seperti shield, hint, dan freeze timer bisa membantu saat situasi sulit." />

          <Rule />

          <Item icon="🔥" text="Streak yang bagus bisa membuka hadiah dan membuat permainan lebih menegangkan." />

          <Tip>Pilih tema pertanyaan yang paling kamu kuasai agar peluang menang lebih besar.</Tip>
        </>
      ),
    },

    {
      squareNumber: 6,
      icon: '🏆',
      title: 'Koin, Peta, dan Avatar',
      pawn: 'green',
      children: (
        <>
          <p className="mb-2">
            Koin bisa kamu gunakan untuk membuka peta baru dan avatar tambahan. Progress ini tersimpan ke akunmu jika kamu login.
          </p>

          <Item icon="🪙" text="Koin bisa didapat dari sesi online dan dipakai untuk berbagai unlock." />

          <Rule />

          <Item icon="🗺️" text="Peta baru membuka suasana permainan yang berbeda-beda." />

          <Rule />

          <Item icon="👤" text="Avatar limited bisa dibuka lewat kode redeem dan dipakai di profil." />

          <Tip>Jangan lupa cek halaman profil dan akun untuk melihat koleksi yang sudah kamu miliki.</Tip>
        </>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>
      {/* wood-grain ambient backdrop, like the underside of a board game box */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      {/* ── sticky header, like a box-top banner ── */}
      <div
        className="relative z-20 sticky top-0 px-4 pt-safe-top"
        style={{ background: WOOD_DARK, borderBottom: `4px solid ${WOOD}` }}
      >
        <div className="flex items-center justify-between py-3">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-white active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', borderRadius: 10 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-black tracking-wider"
            style={{ color: '#FFD34D', WebkitTextStroke: '0.8px #5C3417', textShadow: '0 2px 0 #5C3417' }}
          >
            PANDUAN BERMAIN
          </motion.h1>

          <div
            className="w-9 h-9 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', borderRadius: 10 }}
          >
            <span className="text-white text-xs font-black">{chapters.length}</span>
          </div>
        </div>
      </div>

      {/* ── scrollable content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="px-4 pb-16 max-w-lg mx-auto">
          {/* ── hero: box-top art ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-5 mb-8 relative overflow-hidden"
            style={{
              background: BOARD,
              border: `4px solid ${WOOD}`,
              borderRadius: 18,
              boxShadow: `6px 6px 0 ${WOOD_DARK}`,
            }}
          >
            <div className="relative flex items-center gap-4 px-5 py-5">
              <motion.div
                className="w-24 h-24 flex-shrink-0"
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <BoardHero />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: PAWNS.red.deep }}>
                  Selamat Datang
                </p>
                <h2 className="text-2xl font-black leading-tight mb-1.5" style={{ color: INK }}>
                  Siap Main? 🎉
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: INK, opacity: 0.7 }}>
                  {chapters.length} kotak panduan — lempar dadu dan jalan dari dasar sampai strategi pro.
                </p>

                {/* a literal row of dice faces 1→7, one per chapter */}
                <div className="flex gap-1.5 mt-3">
                  {chapters.map((_, i) => (
                    <DieFace key={i} value={Math.min(i + 1, 6)} size={18} color={WOOD} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── chapter squares ── */}
          <div className="flex flex-col gap-5 relative">
            {chapters.map((ch, i) => (
              <div key={ch.squareNumber} className="flex" style={{ justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                <div className="w-[88%]">
                  <Chapter {...ch} flip={i % 2 === 1} />
                </div>
              </div>
            ))}
          </div>

          {/* ── footer: finish square ── */}
       
        </div>
      </div>
    </div>
  );
}