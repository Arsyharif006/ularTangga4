'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  User,
  Mail,
  Volume2,
  Palette,
  LogOut,
  Check,
  Music,
  Zap,
  Globe,
  Gift,
  Sparkles,
  X,
} from 'lucide-react';
import supabase from '@/lib/supabase/client';
import { useAudio } from '@/lib/audio/AudioProvider';
import { useSettingsStore } from '@/stores/settingsStore';
import PurchaseModal from '@/components/ui/PurchaseModal';
import packageJson from '../../../package.json';

// ── Design tokens (sama dengan Main Menu) ───────────────────
const BOARD      = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK        = '#3A2814';
const ACCENT     = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

const LABEL_STYLE = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: WOOD_LIGHT, fontWeight: 600 };
const SECTION_TITLE_STYLE = { fontSize: '12px', fontWeight: 700, color: WOOD, textTransform: 'uppercase', letterSpacing: '0.18em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' };

const ANIMAL_EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐢','🐍','🐴','🐝','🐙','🦀','🐬'];
const LIMITED_AVATAR_EMOJIS = ['🦄','🦋','🌟','👑'];
const DEFAULT_UNLOCKED_AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊'];
const DEFAULT_UNLOCKED_BOARDS = ['classic','winter'];

const TRACKS = [
  { id: 0, name: 'Battle March',   artist: 'Epic Adventure', emoji: '⚔️', genre: 'Action',   dur: '2:15' },
  { id: 1, name: 'Snake & Ladder', artist: 'Playful Beats',  emoji: '🎲', genre: 'Cheerful', dur: '1:58' },
];

const CREDIT_SECTIONS = [
  { title: 'Pembuat', lines: ['Penyusun', 'Muhammad Arya Ramadhan', 'Designer', 'Muhammad Arya Ramadhan, Muhammad Dhaffa', 'Programmer', 'Muhammad Arya Ramadhan', 'Analisis Sistem', 'Muhammad Arya Ramadhan, Muhammad Alif Raihandi, Muhammad Dhaffa'] },
  { title: 'Tim', lines: [' Kelompok 4', 'Anggota Tim', 'Muhammad Arya Ramadhan, Muhammad Alif Raihandi, Muhammad Dhaffa','Rafifah Luthfiyah Putri, Agnia Zahrah Wibowo','Andhika Putra, Aidil', 'Peran dan kontribusi setiap anggota'] },
  { title: 'Dukungan', lines: ['Dosen : Ahmad Fauzi M.Kom. ', 'Feedback dan balancing.'] },
  { title: 'Institusi', lines: ['Universitas Indraprasta PGRI', 'Dukungan institusi dan semangat akademik.'] },
  { title: 'Ucapan', lines: ['Terima kasih untuk semua teman, rekan, dan pengguna.', 'Semoga aplikasi ini bermanfaat dan menyenangkan.'] },
];

// ── Equaliser bars ───────────────────────────────────────────
const EqBars = ({ playing }: { playing: boolean }) => (
  <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
    {[
      { h: 10, dur: 0.5,  delay: '0s'    },
      { h: 14, dur: 0.7,  delay: '0.1s'  },
      { h: 8,  dur: 0.4,  delay: '0.2s'  },
      { h: 12, dur: 0.6,  delay: '0.05s' },
    ].map((b, i) => (
      <div
        key={i}
        className="w-[3px] rounded-sm"
        style={{
          height: playing ? b.h : 3,
          background: ACCENT_DEEP,
          transition: `height ${b.dur}s ease-in-out ${b.delay}`,
        }}
      />
    ))}
  </div>
);

// ── Volume slider ────────────────────────────────────────────
const VolumeSlider = ({
  label, icon, value, onChange, fillColor, thumbColor,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  fillColor: string;
  thumbColor: string;
}) => (
  <div>
    <div className="flex items-center gap-2.5 mb-2">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 border-2"
        style={{ background: BOARD_DARK, borderColor: WOOD }}
      >
        {icon}
      </div>
      <span className="flex-1 text-[12px] font-black" style={{ color: INK }}>
        {label}
      </span>
      <span className="text-[13px] font-black tabular-nums" style={{ color: ACCENT_DEEP }}>{value}%</span>
    </div>
    <div className="relative h-[6px] rounded-full border" style={{ background: BOARD_DARK, borderColor: WOOD }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
        style={{ width: `${value}%`, background: fillColor }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-[3px] pointer-events-none"
        style={{
          left: `calc(${value}% - 8px)`,
          borderColor: thumbColor,
          boxShadow: `0 0 0 3px ${thumbColor}33`,
        }}
      />
      <input
        type="range" min={0} max={100} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        aria-label={label}
      />
    </div>
  </div>
);

export const Settings = () => {
  const router = useRouter();
  const audio = useAudio();
  const settings = useSettingsStore();

  const [username, setUsername]               = useState('Guest');
  const [activeAvatar, setActiveAvatar]       = useState('🐶');
  const [coins, setCoins]                     = useState(0);
  const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>([]);
  const [unlockedBoards, setUnlockedBoards]   = useState<string[]>([]);
  const [purchaseOpen, setPurchaseOpen]       = useState(false);
  const [purchaseMeta, setPurchaseMeta]       = useState<{
    title: string;
    description?: string;
    cost?: number;
    onConfirm?: () => void;
  } | null>(null);
  const [soundEnabled, setSoundEnabled]       = useState(true);
  const [musicVol, setMusicVol]               = useState(Math.round((settings.volume ?? 0.7) * 100));
  const [fxVol, setFxVol]                     = useState(100);
  const [language, setLanguage]               = useState('Indonesia');
  const [googleEmail, setGoogleEmail]         = useState('');
  const [accountName, setAccountName]         = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab]             = useState('profile');
  const [showNameModal, setShowNameModal]     = useState(false);
  const [inputName, setInputName]             = useState(username);
  const [redeemCode, setRedeemCode]           = useState('');
  const [redeemBusy, setRedeemBusy]           = useState(false);
  const [redeemMessage, setRedeemMessage]     = useState('');
  const [rewardModal, setRewardModal]         = useState<{ title: string; description: string; icon: string } | null>(null);
  const [showCreditsOverlay, setShowCreditsOverlay] = useState(false);

  const [activeTrackId, setActiveTrackId] = useState(settings.track ?? 0);
  const [isPlaying, setIsPlaying]         = useState(false);

  useEffect(() => {
    setMusicVol(Math.round((settings.volume ?? 0.7) * 100));
  }, [settings.volume]);

  useEffect(() => {
    if (audio?.current != null) setActiveTrackId(audio.current);
    setIsPlaying(!!audio?.isPlaying);
  }, [audio?.current, audio?.isPlaying]);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const parseDurStr = (str: string) => {
    const parts = str.split(':').map((p) => Number(p));
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(str) || 0;
  };

  const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  };

  const saveAvatarSelection = async (avatar: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) return false;

      await supabase.from('user_stats').upsert({
        user_id: user.id,
        avatar,
        email: user.email || null,
      }).select();

      setActiveAvatar(avatar);
      return true;
    } catch (err) {
      console.error('Failed to save avatar selection', err);
      return false;
    }
  };

  const handleSaveName = () => {
    (async () => {
      if (inputName.trim()) {
        setUsername(inputName.trim());
        try {
          const { data } = await supabase.auth.getSession();
          const user = data?.session?.user;
          if (user) {
            await supabase.from('user_stats').upsert({
              user_id: user.id, username: inputName.trim(),
              name: inputName.trim(), email: user.email || null,
            }).select();
            setAccountName(inputName.trim());
          }
        } catch (err) {
          console.error('Failed to persist account name', err);
        }
      }
      setShowNameModal(false);
    })();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!mounted) return;
        if (user) {
          setIsAuthenticated(true);
          setGoogleEmail(user.email || '');
          try {
            const { data: stats } = await supabase
              .from('user_stats').select('username, avatar, name, coins, unlocked_avatars, unlocked_boards').eq('user_id', user.id).maybeSingle();
            const dbUsername        = (stats as any)?.username;
            const dbName            = (stats as any)?.name;
            const dbAvatar          = (stats as any)?.avatar;
            const dbCoins           = (stats as any)?.coins ?? 0;
            const dbUnlockedAvatars = normalizeStringArray((stats as any)?.unlocked_avatars).length > 0
              ? normalizeStringArray((stats as any)?.unlocked_avatars)
              : DEFAULT_UNLOCKED_AVATARS;
            const dbUnlockedBoards  = normalizeStringArray((stats as any)?.unlocked_boards).length > 0
              ? normalizeStringArray((stats as any)?.unlocked_boards)
              : DEFAULT_UNLOCKED_BOARDS;
            const fallback          = (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || '';
            const finalName         = dbUsername || dbName || fallback;
            setAccountName(finalName);
            setUsername(finalName);
            setInputName(finalName);
            setActiveAvatar(dbAvatar || '🐶');
            setCoins(dbCoins);
            setUnlockedAvatars(dbUnlockedAvatars);
            setUnlockedBoards(dbUnlockedBoards);
          } catch {
            const fallback = (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || '';
            setAccountName(fallback); setUsername(fallback); setInputName(fallback); setActiveAvatar('🐶');
          }
        } else {
          setIsAuthenticated(false); setGoogleEmail(''); setAccountName('');
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profil',  Icon: User    },
    { id: 'sound',   label: 'Suara',   Icon: Volume2 },
    { id: 'account', label: 'Akun',    Icon: Mail    },
  ];

  const handleRedeemCode = async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) {
      setRedeemMessage('Masukkan kode redeem terlebih dahulu.');
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        setRedeemMessage('Silakan masuk dengan Google sebelum menukar kode.');
        return;
      }

      setRedeemBusy(true);
      setRedeemMessage('');

      const { data: codeRow, error: codeError } = await supabase
        .from('redeem_codes')
        .select('code, reward_type, reward_value, reward_meta, description, active')
        .eq('code', code)
        .maybeSingle();

      if (codeError || !codeRow || codeRow.active === false) {
        setRedeemMessage('Kode tidak valid atau sudah tidak aktif.');
        return;
      }

      const rewardType = String(codeRow.reward_type || 'coins');
      const rewardValue = Number(codeRow.reward_value ?? 0);
      const rewardMeta = normalizeStringArray(codeRow.reward_meta);
      const rewardDescription = String(codeRow.description || 'Hadiah berhasil diklaim.');

      const { data: existingRedemption } = await supabase
        .from('redeem_redemptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('code', code)
        .maybeSingle();

      if (existingRedemption) {
        setRedeemMessage('Kode ini sudah pernah kamu tukarkan sebelumnya.');
        return;
      }

      const { data: stats } = await supabase
        .from('user_stats')
        .select('coins, unlocked_avatars, unlocked_boards')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentCoins = Number((stats as any)?.coins ?? 0);
      const currentUnlockedAvatars = normalizeStringArray((stats as any)?.unlocked_avatars).length > 0
        ? normalizeStringArray((stats as any)?.unlocked_avatars)
        : DEFAULT_UNLOCKED_AVATARS;
      const currentUnlockedBoards = normalizeStringArray((stats as any)?.unlocked_boards).length > 0
        ? normalizeStringArray((stats as any)?.unlocked_boards)
        : DEFAULT_UNLOCKED_BOARDS;

      let nextCoins = currentCoins;
      let nextUnlockedAvatars = [...currentUnlockedAvatars];
      let nextUnlockedBoards = [...currentUnlockedBoards];
      let nextAvatar = activeAvatar;
      let popupTitle = 'Kode berhasil ditukar';
      let popupDescription = rewardDescription;
      let popupIcon = '🎁';

      if (rewardType === 'coins') {
        nextCoins = currentCoins + rewardValue;
        popupTitle = 'Koin gratis diterima';
        popupDescription = `Kamu menerima ${rewardValue} koin gratis.`;
        popupIcon = '🪙';
      } else if (rewardType === 'boards') {
        const boardRewards = rewardMeta.length > 0 ? rewardMeta : ['classic','winter','forest','lava','space'];
        nextUnlockedBoards = Array.from(new Set([...currentUnlockedBoards, ...boardRewards]));
        popupTitle = 'Semua peta terbuka';
        popupDescription = 'Peta baru sudah bisa kamu pilih sekarang.';
        popupIcon = '🗺️';
      } else if (rewardType === 'avatars') {
        const avatarRewards = rewardMeta.length > 0 ? rewardMeta : LIMITED_AVATAR_EMOJIS;
        nextUnlockedAvatars = Array.from(new Set([...currentUnlockedAvatars, ...avatarRewards]));
        nextAvatar = avatarRewards[0] || nextAvatar;
        popupTitle = 'Avatar limited terbuka';
        popupDescription = 'Avatar limited baru sudah siap dipakai.';
        popupIcon = '✨';
      }

      await supabase.from('user_stats').upsert({
        user_id: user.id,
        email: user.email || null,
        avatar: nextAvatar,
        coins: nextCoins,
        unlocked_avatars: nextUnlockedAvatars,
        unlocked_boards: nextUnlockedBoards,
      }).select();

      await supabase.from('redeem_redemptions').insert({
        user_id: user.id,
        code,
        reward_type: rewardType,
        reward_value: rewardValue,
        reward_meta: rewardMeta,
      });

      setCoins(nextCoins);
      setUnlockedAvatars(nextUnlockedAvatars);
      setUnlockedBoards(nextUnlockedBoards);
      setActiveAvatar(nextAvatar);
      setRedeemCode('');
      setRedeemMessage('Kode berhasil ditukar!');
      setRewardModal({ title: popupTitle, description: popupDescription, icon: popupIcon });
    } catch (err) {
      console.error('Failed to redeem code', err);
      setRedeemMessage('Gagal menukar kode. Coba lagi sebentar.');
    } finally {
      setRedeemBusy(false);
    }
  };

  const handlePlayTrack = (id: number) => {
    setActiveTrackId(id);
    setIsPlaying(true);
    try { audio.play(id); } catch {}
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      try { audio.stop(); } catch {}
    } else {
      setIsPlaying(true);
      try { audio.play(activeTrackId); } catch {}
    }
  };

  const handlePrev = () => {
    const next = (activeTrackId - 1 + TRACKS.length) % TRACKS.length;
    handlePlayTrack(next);
  };

  const handleNext = () => {
    const next = (activeTrackId + 1) % TRACKS.length;
    handlePlayTrack(next);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>

      {/* Wood-grain ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4"
        style={{ background: WOOD_DARK, borderBottom: `4px solid ${WOOD}` }}
      >
        <motion.button
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', color: BOARD }}
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-xl font-black tracking-tight"
          style={{
            color: ACCENT,
            WebkitTextStroke: `1px ${WOOD_DARK}`,
            textShadow: `0 2px 0 ${WOOD}, 0 6px 16px rgba(0,0,0,0.5)`,
          }}
        >
          PENGATURAN
        </motion.h1>
        <div className="w-9" />
      </div>

      {/* Tab bar */}
      <div className="relative z-10 px-5 pb-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map(({ id, label, Icon }, i) => {
            const active = activeTab === id;
            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => setActiveTab(id)}
                className="py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all"
                style={{
                  background:   active ? ACCENT_TINT : BOARD,
                  border:       `3px solid ${active ? ACCENT_DEEP : WOOD}`,
                  boxShadow:    `3px 3px 0 ${active ? ACCENT_DEEP : WOOD_DARK}`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: active ? ACCENT_DEEP : WOOD }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: active ? ACCENT_DEEP : INK }}
                >
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-10">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >

          {/* ══ PROFILE TAB ══════════════════════════════════ */}
          {activeTab === 'profile' && (
            <>
              <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
                <p style={SECTION_TITLE_STYLE}><User className="w-3.5 h-3.5" /> Nama Profil</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-base" style={{ color: INK }}>{username}</p>
                    <p style={{ ...LABEL_STYLE, marginTop: '4px' }}>Nama yang tampil di papan peringkat</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await supabase.auth.getSession();
                        const user = data?.session?.user;
                        if (!user) {
                          setPurchaseMeta({
                            title: 'Perlu Masuk',
                            description: 'Silakan masuk dengan Google untuk mengubah nama.',
                            onConfirm: () => { setPurchaseOpen(false); router.push('/online/login'); },
                          });
                          setPurchaseOpen(true);
                          return;
                        }
                      } catch (err) { /* ignore */ }
                      setInputName(username); setShowNameModal(true);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
                    style={{ background: WOOD, color: BOARD, border: `2px solid ${WOOD_DARK}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                  >
                    Ubah
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl flex items-center gap-5" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: BOARD_DARK, border: `3px solid ${WOOD}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                >
                  {activeAvatar || '🎮'}
                </div>
                <div>
                  <p className="font-bold" style={{ color: INK }}>{username}</p>
                  <p style={{ ...LABEL_STYLE, marginTop: '4px' }}>Avatar: {activeAvatar}</p>
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: WOOD_LIGHT }}>Pilih avatar hewan di bawah</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl flex items-center justify-between" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
                <div>
                  <p className="font-black text-lg" style={{ color: ACCENT_DEEP }}>🪙 {coins}</p>
                  <p style={{ ...LABEL_STYLE, marginTop: '4px' }}>Saldo Anda</p>
                </div>
                <div>
                  <p className="font-bold" style={{ color: WOOD }}>Koin</p>
                  <p style={{ ...LABEL_STYLE, marginTop: '4px' }}>Tukarkan Koin dengan Avatar dan Peta menarik!</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
                <p style={SECTION_TITLE_STYLE}><Palette className="w-3.5 h-3.5" /> Avatar Hewan</p>
                <div className="grid grid-cols-6 gap-2.5 text-2xl">
                  {ANIMAL_EMOJIS.map((a, i) => {
                    const free = i < 6;
                    const isUnlocked = free || unlockedAvatars.includes(a);
                    const isActive = activeAvatar === a;
                    return (
                      <button
                        key={i}
                        onClick={async () => {
                          try {
                            const { data } = await supabase.auth.getSession();
                            const user = data?.session?.user;
                            if (!user) {
                              setPurchaseMeta({
                                title: 'Perlu Masuk',
                                description: 'Silakan masuk untuk memilih atau membuka avatar.',
                                onConfirm: () => setPurchaseOpen(false),
                              });
                              setPurchaseOpen(true);
                              return;
                            }
                            if (isUnlocked) {
                              await saveAvatarSelection(a);
                              return;
                            }
                            const cost = 1;
                            if ((coins ?? 0) < cost) {
                              setPurchaseMeta({
                                title: 'Koin Tidak Cukup',
                                description: 'Koin tidak cukup untuk membuka avatar ini. Menangkan permainan online untuk mendapatkan koin.',
                                onConfirm: () => setPurchaseOpen(false),
                              });
                              setPurchaseOpen(true);
                              return;
                            }
                            setPurchaseMeta({
                              title: `Buka avatar ${a}`,
                              description: `Konfirmasi pembelian avatar ${a} seharga ${cost} koin?`,
                              cost,
                              onConfirm: async () => {
                                try {
                                  const newCoins = (coins ?? 0) - cost;
                                  const newUnlocked = Array.from(new Set([...(unlockedAvatars || []), a]));
                                  await supabase.from('user_stats').upsert({ user_id: user.id, avatar: a, coins: newCoins, unlocked_avatars: newUnlocked, email: user.email || null }).select();
                                  setCoins(newCoins);
                                  setUnlockedAvatars(newUnlocked);
                                  setActiveAvatar(a);
                                } catch (err) { console.error('Failed to purchase avatar', err); }
                                setPurchaseOpen(false);
                              },
                            });
                            setPurchaseOpen(true);
                          } catch (err) { console.error('Failed to save/unlock avatar', err); }
                        }}
                        className="relative aspect-square rounded-xl transition-all flex items-center justify-center text-3xl"
                        style={{
                          background: isActive ? ACCENT_TINT : BOARD_DARK,
                          border: `2.5px solid ${isActive ? ACCENT_DEEP : WOOD}`,
                          boxShadow: `2px 2px 0 ${isActive ? ACCENT_DEEP : WOOD_DARK}`,
                        }}
                        title={a}
                      >
                        {a}
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                            <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                          </div>
                        )}
                        {!isUnlocked && (
                          <div className="absolute right-1 bottom-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                            🔒 1
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <p style={SECTION_TITLE_STYLE}><Sparkles className="w-3.5 h-3.5" /> Avatar Limited</p>
                  <div className="grid grid-cols-4 gap-2.5 text-2xl">
                    {LIMITED_AVATAR_EMOJIS.map((a) => {
                      const isUnlocked = unlockedAvatars.includes(a);
                      const isActive = activeAvatar === a;
                      return (
                        <button
                          key={a}
                          onClick={async () => {
                            if (isUnlocked) {
                              await saveAvatarSelection(a);
                              return;
                            }
                            setActiveTab('account');
                            setRedeemMessage('Avatar limited ini bisa dibuka lewat kode redeem di tab Akun.');
                          }}
                          className="relative aspect-square rounded-xl transition-all flex items-center justify-center text-3xl"
                          style={{
                            background: isActive ? ACCENT_TINT : BOARD_DARK,
                            border: `2.5px solid ${isActive ? ACCENT_DEEP : WOOD}`,
                            boxShadow: `2px 2px 0 ${isActive ? ACCENT_DEEP : WOOD_DARK}`,
                          }}
                          title={a}
                        >
                          {a}
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                              <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                            </div>
                          )}
                          {!isUnlocked && (
                            <div className="absolute right-1 bottom-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                              🔒
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] mt-2 font-semibold" style={{ color: WOOD_LIGHT }}>
                    Buka avatar ini lewat kode redeem di tab Akun.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ══ SOUND TAB ════════════════════════════════════ */}
          {activeTab === 'sound' && <>

            {/* Toggle suara */}
            <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{...SECTION_TITLE_STYLE, marginBottom: '4px'}}>
                    <Volume2 className="w-3.5 h-3.5" /> Suara Umum
                  </p>
                  <p style={LABEL_STYLE}>{soundEnabled ? 'Aktif' : 'Nonaktif'}</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(s => !s)}
                  className="relative w-12 h-6 rounded-full border-2 transition-all duration-300"
                  style={{
                    background:  soundEnabled ? '#22c55e' : BOARD_DARK,
                    borderColor: soundEnabled ? 'rgba(34,197,94,0.6)' : WOOD,
                  }}
                  aria-label="Toggle suara"
                >
                  <div
                    className="absolute top-[3px] w-5 h-5 rounded-full shadow transition-all duration-300"
                    style={{ background: BOARD, left: soundEnabled ? 'calc(100% - 23px)' : '3px' }}
                  />
                </button>
              </div>
            </div>

            {/* Now Playing */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <div className="h-[4px]" style={{ background: `linear-gradient(90deg,${WOOD},${ACCENT},${WOOD})` }} />
              <div className="p-5 space-y-4" style={{ background: BOARD }}>

                <div className="flex items-center justify-between">
                  <p style={{...SECTION_TITLE_STYLE, marginBottom: '0'}}>
                    <Music className="w-3.5 h-3.5" /> Sedang Diputar
                  </p>
                  {isPlaying && (
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT_DEEP }}>
                      LIVE
                    </span>
                  )}
                </div>

                {/* Track info */}
                <div className="flex items-center gap-3">
                  <motion.div
                    key={activeTrackId}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[26px] shrink-0"
                    style={{
                      background: BOARD_DARK,
                      border: `2.5px solid ${WOOD}`,
                      boxShadow: `2px 2px 0 ${WOOD_DARK}`,
                    }}
                  >
                    {TRACKS[activeTrackId].emoji}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <motion.p
                      key={`title-${activeTrackId}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[15px] font-black truncate"
                      style={{ color: INK }}
                    >
                      {TRACKS[activeTrackId].name}
                    </motion.p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: WOOD_LIGHT }}>
                      {TRACKS[activeTrackId].artist} · {TRACKS[activeTrackId].genre}
                    </p>
                  </div>
                  <EqBars playing={isPlaying} />
                </div>

                {/* Progress */}
                <div>
                  <div className="h-[5px] rounded-full border" style={{ background: BOARD_DARK, borderColor: WOOD }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: (() => {
                          const elapsed = audio?.currentTime ?? 0;
                          const total = audio?.duration ?? parseDurStr(TRACKS[activeTrackId].dur);
                          if (total > 0) return `${Math.min(100, Math.round((elapsed / total) * 100))}%`;
                          return isPlaying ? '45%' : '0%';
                        })(),
                        background: `linear-gradient(90deg,${WOOD},${ACCENT_DEEP})`,
                        transition: 'width 0.25s linear',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] font-bold" style={{ color: WOOD_LIGHT }}>
                      {formatTime(audio?.currentTime ?? 0)}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: WOOD_LIGHT }}>
                      {formatTime(audio?.duration ?? parseDurStr(TRACKS[activeTrackId].dur))}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handlePrev}
                    className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition"
                    style={{ background: BOARD_DARK, border: `2.5px solid ${WOOD}`, color: WOOD, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                    aria-label="Track sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.06 }}
                    onClick={handleTogglePlay}
                    className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
                    style={{ background: ACCENT, border: `2.5px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill={WOOD_DARK}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill={WOOD_DARK}><polygon points="5,3 19,12 5,21"/></svg>
                    }
                  </motion.button>

                  <button
                    onClick={handleNext}
                    className="w-[38px] h-[38px] rounded-full flex items-center justify-center transition"
                    style={{ background: BOARD_DARK, border: `2.5px solid ${WOOD}`, color: WOOD, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                    aria-label="Track berikutnya"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                {/* Volume sliders */}
                <div className="space-y-4 pt-3" style={{ borderTop: `2px solid ${WOOD}` }}>
                  <VolumeSlider
                    label="Volume Musik"
                    icon={<Music className="w-3.5 h-3.5" style={{ color: WOOD }} />}
                    value={musicVol}
                    onChange={(v) => { setMusicVol(v); try { settings.setVolume(v / 100); } catch {} try { audio.setVolume(v / 100); } catch {} }}
                    fillColor={WOOD}
                    thumbColor={WOOD}
                  />
                  <VolumeSlider
                    label="Efek Suara"
                    icon={<Zap className="w-3.5 h-3.5" style={{ color: ACCENT_DEEP }} />}
                    value={fxVol}
                    onChange={(v) => setFxVol(v)}
                    fillColor={ACCENT_DEEP}
                    thumbColor={ACCENT_DEEP}
                  />
                </div>
              </div>
            </div>

            {/* Track list */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <div className="h-[4px]" style={{ background: `linear-gradient(90deg,${WOOD},${ACCENT},${WOOD})` }} />
              <div className="p-5" style={{ background: BOARD }}>
                <p style={SECTION_TITLE_STYLE}><Music className="w-3.5 h-3.5" /> Pilih Lagu</p>
                <div className="space-y-2">
                  {TRACKS.map((track, idx) => {
                    const active = track.id === activeTrackId;
                    return (
                      <motion.button
                        key={track.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        onClick={() => handlePlayTrack(track.id)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] transition-all text-left"
                        style={{
                          background:  active ? ACCENT_TINT : BOARD_DARK,
                          border:      `2.5px solid ${active ? ACCENT_DEEP : WOOD}`,
                          boxShadow:   `2px 2px 0 ${active ? ACCENT_DEEP : WOOD_DARK}`,
                        }}
                      >
                        <span
                          className="w-[22px] text-center text-[11px] font-black shrink-0"
                          style={{ color: active ? ACCENT_DEEP : WOOD_LIGHT }}
                        >
                          {String(track.id + 1).padStart(2, '0')}
                        </span>

                        <div
                          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] shrink-0"
                          style={{
                            background: active ? ACCENT_TINT : BOARD,
                            border:     `2px solid ${active ? ACCENT_DEEP : WOOD}`,
                          }}
                        >
                          {track.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-black truncate"
                            style={{ color: active ? ACCENT_DEEP : INK }}
                          >
                            {track.name}
                          </p>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: WOOD_LIGHT }}>
                            {track.artist} · {track.genre}
                          </p>
                        </div>

                        <span
                          className="text-[11px] font-bold shrink-0"
                          style={{ color: active ? ACCENT_DEEP : WOOD_LIGHT }}
                        >
                          {active && audio?.duration ? formatTime(audio.duration) : track.dur}
                        </span>

                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{ background: active ? ACCENT : BOARD, border: `2px solid ${active ? ACCENT_DEEP : WOOD}` }}
                        >
                          {active && isPlaying
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill={active ? WOOD_DARK : WOOD_LIGHT}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill={active ? WOOD_DARK : WOOD_LIGHT}><polygon points="5,3 19,12 5,21"/></svg>
                          }
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bahasa */}
            <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <p style={SECTION_TITLE_STYLE}><Globe className="w-3.5 h-3.5" /> Bahasa</p>
              <div className="grid grid-cols-2 gap-2.5">
                {['Indonesia', 'English'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className="py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    style={
                      language === lang
                        ? { background: ACCENT_TINT, border: `2.5px solid ${ACCENT_DEEP}`, color: ACCENT_DEEP, boxShadow: `2px 2px 0 ${ACCENT_DEEP}` }
                        : { background: BOARD_DARK,   border: `2.5px solid ${WOOD}`,        color: INK,          boxShadow: `2px 2px 0 ${WOOD_DARK}` }
                    }
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {/* ══ ACCOUNT TAB ══════════════════════════════════ */}
          {activeTab === 'account' && <>

            <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <p style={SECTION_TITLE_STYLE}><Gift className="w-3.5 h-3.5" /> Kode Redeem</p>
              <p className="text-sm font-semibold" style={{ color: WOOD_LIGHT }}>
                Tukar kode khusus untuk menerima hadiah langsung ke akunmu.
              </p>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Masukkan kode"
                  className="w-full px-3 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemCode()}
                />
                <button
                  onClick={handleRedeemCode}
                  disabled={redeemBusy}
                  className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                  style={{
                    background: redeemBusy ? BOARD_DARK : ACCENT,
                    color: WOOD_DARK,
                    border: `2px solid ${WOOD_DARK}`,
                    boxShadow: `2px 2px 0 ${WOOD_DARK}`,
                    opacity: redeemBusy ? 0.8 : 1,
                  }}
                >
                  {redeemBusy ? 'Memproses...' : 'Tukar Kode'}
                </button>
              </div>
              {redeemMessage && (
                <p className="mt-3 text-sm font-semibold" style={{ color: redeemMessage.includes('berhasil') || redeemMessage.includes('ditukar') ? ACCENT_DEEP : WOOD_LIGHT }}>
                  {redeemMessage}
                </p>
              )}
        
            </div>

            <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <p style={SECTION_TITLE_STYLE}><Mail className="w-3.5 h-3.5" /> Akun Google</p>
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold" style={{ color: WOOD_LIGHT }}>
                    Belum terhubung. Masuk dengan Google untuk menyimpan progress dan sinkronisasi antar perangkat.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push('/online/login')}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                      style={{ background: WOOD, color: BOARD, border: `2px solid ${WOOD_DARK}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                    >
                      Masuk dengan Google
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-2.5 p-3 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(34,197,94,0.2)' }}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Terhubung</p>
                      <p className="text-[11px] mt-0.5" style={{ color: WOOD_LIGHT }}>{accountName || googleEmail}</p>
                      <p className="text-xs mt-1" style={{ color: WOOD_LIGHT }}>{googleEmail}</p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!accountName) return;
                      setUsername(accountName); setInputName(accountName);
                      try {
                        const { data } = await supabase.auth.getSession();
                        const user = data?.session?.user;
                        if (user) {
                          await supabase.from('user_stats').upsert({
                            user_id: user.id, email: user.email || null,
                            username: accountName, name: accountName,
                          }).select();
                        }
                      } catch (err) { console.error('Failed to upsert user_stats name', err); }
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    style={{ background: WOOD, color: BOARD, border: `2px solid ${WOOD_DARK}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
                  >
                    Sinkronkan Nama
                  </button>
                  <p className="text-xs font-semibold" style={{ color: WOOD_LIGHT }}>
                    Untuk keamanan, tautan akun tidak dapat diputus melalui aplikasi. Kelola koneksi dari Google Account Anda.
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <p style={SECTION_TITLE_STYLE}><LogOut className="w-3.5 h-3.5" /> Sesi</p>
              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="uppercase text-xs tracking-wide" style={{ color: WOOD_LIGHT }}>Status</span>
                  <span className={`font-bold text-xs ${isAuthenticated ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ● {isAuthenticated ? 'Login' : 'Tidak Terhubung'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase text-xs tracking-wide" style={{ color: WOOD_LIGHT }}>Perangkat</span>
                  <span className="text-xs font-semibold" style={{ color: INK }}>Browser</span>
                </div>
              </div>
              <button
                onClick={async () => { try { await supabase.auth.signOut(); router.push('/'); } catch {} }}
                disabled={!isAuthenticated}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                style={
                  isAuthenticated
                    ? { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '2px solid rgba(239,68,68,0.4)' }
                    : { background: BOARD_DARK, color: WOOD_LIGHT, border: `2px solid ${WOOD}`, cursor: 'not-allowed' }
                }
              >
                Keluar dari Akun
              </button>
            </div>

            <div className="flex items-center justify-between px-2 pt-3 text-[11px] font-semibold" style={{ color: WOOD_LIGHT }}>
              <button
                onClick={() => setShowCreditsOverlay(true)}
                className="font-black uppercase tracking-[0.18em] underline-offset-2 transition-all hover:underline"
                style={{ color: ACCENT_DEEP }}
              >
                Kredit
              </button>
              <span className="font-black" style={{ color: ACCENT_DEEP }}>v{packageJson.version}</span>
            </div>
          </>}

        </motion.div>
      </div>

      <AnimatePresence>
        {showCreditsOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] overflow-hidden bg-black/90 backdrop-blur-sm"
            onClick={() => setShowCreditsOverlay(false)}
          >
            <button
              onClick={() => setShowCreditsOverlay(false)}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 text-white"
              style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ y: '8%' }}
              animate={{ y: '-70%' }}
              transition={{ duration: 20, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
              className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pb-24 pt-16 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2" style={{ background: BOARD_DARK, borderColor: WOOD }}>
                    <Image src="/image/Snake.png" alt="Logo game" width={64} height={64} className="object-contain" />
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2" style={{ background: BOARD_DARK, borderColor: WOOD }}>
                    <Image src="/image/Univ.png" alt="Logo universitas" width={64} height={64} className="object-contain" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: ACCENT }}>Credits</p>
                <h3 className="mt-2 text-2xl font-black text-white">SNAKE PAWNS</h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#f4e8c8]">
                  Sebuah permainan edukatif yang menggabungkan nostalgia ular tangga dengan tantangan soal, mode offline, online, dan versus komputer.
                </p>
              </div>

              {CREDIT_SECTIONS.map((section, sectionIndex) => (
                <div key={`${section.title}-${sectionIndex}`} className="mb-4 w-full max-w-2xl text-center">
                  <h4 className="mb-2 text-sm font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>{section.title}</h4>
                  {section.lines.map((line, lineIndex) => (
                    <p key={`${section.title}-${lineIndex}-${line}`} className="text-sm leading-relaxed text-[#f7ebd0]">
                      {line}
                    </p>
                  ))}
                </div>
              ))}

              <div className="mt-4 w-full max-w-2xl text-center">
                <p className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: ACCENT }}>Terima kasih</p>
                <p className="mt-2 text-sm leading-relaxed text-[#f7ebd0]">Semoga setiap langkah di papan membawa pengalaman belajar yang menyenangkan.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name Modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4"
            onClick={() => setShowNameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="p-7 max-w-sm w-full"
              style={{ background: BOARD, border: `4px solid ${WOOD}`, borderRadius: 18, boxShadow: `6px 6px 0 ${WOOD_DARK}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-black text-lg mb-1 tracking-tight" style={{ color: INK }}>Ubah Nama</h2>
              <p style={{...LABEL_STYLE, marginBottom: '20px'}}>Nama tampil di papan peringkat</p>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Nama pemain..."
                maxLength={15}
                className="w-full px-4 py-3 rounded-xl font-semibold mb-5 focus:outline-none text-sm"
                style={{
                  background: BOARD_DARK,
                  border: `2.5px solid ${WOOD}`,
                  color: INK,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <div className="flex gap-2.5">
                <button
                  onClick={handleSaveName}
                  className="flex-1 py-3 font-extrabold rounded-xl text-sm uppercase tracking-wider transition"
                  style={{ background: WOOD, color: BOARD, border: `2px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
                >
                  Simpan
                </button>
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-3 font-bold rounded-xl text-sm uppercase tracking-wider transition"
                  style={{ background: BOARD_DARK, color: INK, border: `2px solid ${WOOD}` }}
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {purchaseMeta && (
        <PurchaseModal
          isOpen={purchaseOpen}
          title={purchaseMeta.title}
          description={purchaseMeta.description}
          cost={purchaseMeta.cost}
          onCancel={() => setPurchaseOpen(false)}
          onConfirm={() => { purchaseMeta.onConfirm && purchaseMeta.onConfirm(); }}
          confirmLabel={purchaseMeta.cost ? 'Beli' : 'OK'}
        />
      )}

      {rewardModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 " onClick={() => setRewardModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6" style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `5px 5px 0 ${WOOD_DARK}` }}>
            <div className="text-4xl mb-3">{rewardModal.icon}</div>
            <h3 className="text-lg font-black" style={{ color: ACCENT_DEEP }}>{rewardModal.title}</h3>
            <p className="mt-2 text-sm font-semibold" style={{ color: WOOD_LIGHT }}>{rewardModal.description}</p>
            <button
              onClick={() => setRewardModal(null)}
              className="mt-5 w-full py-2.5 rounded-xl font-black text-sm uppercase tracking-wider"
              style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}
            >
              Oke
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;