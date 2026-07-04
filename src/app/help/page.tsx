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
      icon: '🎲',
      title: 'Memulai Permainan',
      pawn: 'red',
      children: (
        <>
          <p>
            Pada Mode Offline, pilih jumlah pemain (2–4 orang), tentukan nama dan warna bidak, lalu pilih tema
            pertanyaan serta papan permainan yang ingin digunakan. Setelah semua pengaturan selesai, tekan{' '}
            <strong style={{ color: PAWNS.red.deep }}>Mulai Game</strong>.
          </p>

          <p>
            Saat giliranmu tiba, tekan tombol{' '}
            <strong style={{ color: PAWNS.red.deep }}>Lempar Dadu</strong>.
            Bidak akan bergerak otomatis sesuai angka yang muncul pada dadu.
          </p>

          <Tip>Pergerakan bidak ditampilkan langkah demi langkah agar pemain dapat mengikuti jalur yang dilewati.</Tip>
        </>
      ),
    },

    {
      squareNumber: 2,
      icon: '🐍',
      title: 'Ular dan Tangga',
      pawn: 'green',
      children: (
        <>
          <p className="mb-2">
            Ular dan tangga merupakan elemen utama yang dapat mengubah posisi pemain secara cepat.
          </p>

          <Item
            icon="🪜"
            text="Tangga akan membawa pemain langsung ke posisi yang lebih tinggi ketika mendarat pada kotak awal tangga."
          />

          <Rule />

          <Item
            icon="🐍"
            text="Ular akan menurunkan pemain ke posisi yang lebih rendah ketika mendarat pada kepala ular."
          />

          <Tip>
            Efek ular dapat dibatalkan menggunakan item Anti Ular yang tersedia di inventaris.
          </Tip>
        </>
      ),
    },

    {
      squareNumber: 3,
      icon: '❓',
      title: 'Sistem Pertanyaan',
      pawn: 'yellow',
      children: (
        <>
          <p className="mb-2">
            Setiap pemain yang mendarat pada kotak pertanyaan harus menjawab soal dalam waktu 15 detik.
          </p>

          <Item
            icon="✅"
            text="Jawaban benar mempertahankan posisi pemain dan menambah jumlah streak jawaban benar."
          />

          <Rule />

          <Item
            icon="❌"
            text="Jawaban salah mengembalikan pemain ke posisi sebelum melempar dadu."
          />

          <Rule />

          <Item
            icon="⏱️"
            text="Waktu yang habis tanpa jawaban akan dianggap sebagai jawaban salah."
          />

          <Rule />

          <Item
            icon="🔥"
            text="Tiga jawaban benar secara beruntun akan memberikan hadiah berupa satu item acak."
          />

          <Tip>
            Memilih tema yang dikuasai dapat meningkatkan peluang mendapatkan streak dan item bonus.
          </Tip>
        </>
      ),
    },

    {
      squareNumber: 4,
      icon: '⚡',
      title: 'Item dan Inventaris',
      pawn: 'blue',
      children: (
        <>
          <p className="mb-2">
            Setiap pemain memiliki inventaris dengan kapasitas maksimal tiga item. Item dapat diperoleh dari
            Mystery Box atau hadiah streak.
          </p>

          <Item icon="🛡️" text="Shield melindungi pemain dari penalti akibat jawaban salah." />

          <Rule />

          <Item icon="🐍" text="Anti Ular membatalkan efek ular saat pemain mendarat pada kepala ular." />

          <Rule />

          <Item icon="🎲" text="Dadu Emas memungkinkan pemain menentukan sendiri angka dadu yang akan digunakan." />

          <Rule />

          <Item icon="💡" text="Hint menghilangkan satu pilihan jawaban yang salah." />

          <Rule />

          <Item icon="⏸️" text="Freeze Timer menghentikan sementara hitungan waktu menjawab." />

          <Rule />

          <Item icon="⏭️" text="Skip Turn membuat lawan kehilangan satu giliran." />

          <Rule />

          <Item icon="👈" text="Push Back mengembalikan lawan ke posisi sebelumnya." />

          <Rule />

          <Item icon="🌪️" text="Swap Position menukar posisi dengan pemain lain sesuai syarat jarak yang ditentukan." />

          <Rule />

          <Item icon="💣" text="Bomb Trap memasang jebakan yang akan memberikan penalti kepada pemain yang menginjaknya." />

          <Tip>
            Gunakan item pada waktu yang tepat untuk mendapatkan keuntungan maksimal selama permainan.
          </Tip>
        </>
      ),
    },

    {
      squareNumber: 5,
      icon: '🏆',
      title: 'Kondisi Kemenangan',
      pawn: 'red',
      children: (
        <>
          <p className="mb-2">
            Pemain pertama yang mencapai kotak{' '}
            <strong style={{ color: PAWNS.red.deep }}>100 </strong>
            akan memenangkan permainan.
          </p>

          <Item
            icon="🎯"
            text="Jika jumlah langkah melebihi kotak 100, posisi pemain akan dipantulkan kembali sesuai sisa langkah."
          />

          <Rule />

          <Item
            icon="📈"
            text="Menjaga konsistensi dalam menjawab pertanyaan dapat mempercepat perjalanan menuju garis akhir."
          />

          <Tip>
            Strategi yang baik dan penggunaan item yang tepat sering kali lebih menentukan daripada keberuntungan dadu.
          </Tip>
        </>
      ),
    },

    {
      squareNumber: 6,
      icon: '🌐',
      title: 'Mode Online',
      pawn: 'green',
      children: (
        <>
          <p className="mb-2">
            Bermain bersama teman secara real-time melalui jaringan internet.
          </p>

          <Item
            icon="🔑"
            text="Masuk menggunakan akun Google, lalu buat room atau gabung menggunakan kode room."
          />

          <Rule />

          <Item
            icon="👑"
            text="Permainan dimulai setelah seluruh pemain berada di room dan siap bermain."
          />

          <Rule />

          <Item
            icon="🔄"
            text="Semua pergerakan, giliran, dan penggunaan item akan disinkronkan secara otomatis."
          />

          <Rule />

          <Item
            icon="⚠️"
            text="Saat koneksi terputus, sistem akan mencoba menghubungkan kembali pemain secara otomatis."
          />

          <Tip>
            Gunakan koneksi internet yang stabil agar permainan berlangsung tanpa gangguan.
          </Tip>
        </>
      ),
    },

    /* ── NEW: Coin System chapter ── */
    {
      squareNumber: 7,
      icon: '💰',
      title: 'Sistem Koin',
      pawn: 'yellow',
      children: (
        <>
          <p className="mb-2">
            Koin adalah mata uang dalam game yang hanya bisa diperoleh dari{' '}
            <strong style={{ color: PAWNS.yellow.deep }}>Mode Online</strong>.
            Kumpulkan koin untuk membuka papan baru dan avatar lucu di toko!
          </p>

          <Item icon="🏆" text="Menang pertandingan online memberikan +2 koin." />

          <Rule />

          <Item icon="🥈" text="Kalah pertandingan online tetap memberikan +1 koin — jadi terus main!" />

          <Rule />

          <Tip>
            Menang atau kalah, kamu selalu dapat koin. Main lebih banyak sesi online untuk mengumpulkan koleksi lebih cepat!
          </Tip>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="mt-7 relative overflow-hidden"
            style={{
              background: 'repeating-conic-gradient(#1f1f1f 0% 25%, #f4f4f4 0% 50%) 0 0 / 16px 16px',
              border: `4px solid ${WOOD}`,
              borderRadius: 16,
              boxShadow: `5px 5px 0 ${WOOD_DARK}`,
            }}
          >
            <div className="p-5" style={{ background: 'rgba(239,223,184,0.94)' }}>
              <p className="text-xs leading-relaxed mb-4 font-bold" style={{ color: INK }}>
                <span style={{ color: PAWNS.red.deep }}>🏁 Ingat:</span> Setiap permainan berbeda. Jangan takut
                bereksperimen — strategi terbaik lahir dari pengalaman!
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3" style={{ background: PAWNS.blue.tint, border: `2px solid ${PAWNS.blue.base}`, borderRadius: 10 }}>
                  <p className="font-black text-xs mb-1" style={{ color: PAWNS.blue.deep }}>📚 Belajar Terus</p>
                  <p className="text-[11px] leading-snug" style={{ color: PAWNS.blue.deep, opacity: 0.8 }}>
                    Tiap kategori pertanyaan perluas wawasanmu.
                  </p>
                </div>
                <div className="p-3" style={{ background: PAWNS.green.tint, border: `2px solid ${PAWNS.green.base}`, borderRadius: 10 }}>
                  <p className="font-black text-xs mb-1" style={{ color: PAWNS.green.deep }}>🎮 Main Sekarang</p>
                  <p className="text-[11px] leading-snug" style={{ color: PAWNS.green.deep, opacity: 0.8 }}>
                    Kembali ke menu dan mulai petualanganmu!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}