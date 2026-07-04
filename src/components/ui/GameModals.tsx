'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { supabaseGameService } from '@/lib/supabase/gameService';
import { Modal } from './Modal';
import { Button } from './Button';

// ── Design tokens ────────────────────────────────────────────────────────
// Base wood/board tokens (sama dengan Main Menu & Settings)
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

// Extended palette just for the question/answer cards — warm parchment + copper,
// with sage/terracotta standing in for "correct/incorrect" instead of stock green/red.
const PARCHMENT        = '#F6ECD4';   // warm cream, slightly yellower than BOARD
const PARCHMENT_EDGE   = '#D9C397';   // soft border on parchment cards
const COPPER           = '#B5722E';   // letter badges (A/B/C/D)
const SAGE_BG          = '#E3E8D4';   // correct answer fill
const SAGE_BORDER      = '#8FA66E';
const SAGE_TEXT        = '#445A2C';
const TERRACOTTA_BG    = '#F3DCD3';   // incorrect answer fill
const TERRACOTTA_BORDER = '#C77B5E';
const TERRACOTTA_TEXT  = '#7A3420';

type GameModalsProps = {
  onAnswerQuestion?: (isCorrect: boolean) => void | Promise<void>;
};

export const GameModals = ({ onAnswerQuestion }: GameModalsProps) => {
  const { 
    phase, 
    currentQuestion, 
    mysteryBoxItem, 
    answerQuestion, 
    claimMysteryBox, 
    rollDice, 
    useItem,
    players,
    currentPlayerIndex,
    pendingItemId,
    hintRemovedIndex,
    setPhase,
    hintActive,
    freezeTimerPlayerId
  } = useGameStore();
  const { awardedItem, awardContext, closeAwardedItemModal } = useGameStore();

  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);
  
  // Visual feedback states
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  // Timer untuk jawab soal (15 detik)
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return;
    // Jangan jalankan timer/modal ini untuk bot — bot tidak perlu melihat popup soal
    if (currentPlayer?.isBot) return;

    // Only reset timer when a new question is presented (avoid resetting when freeze toggles)
    if (lastQuestionIdRef.current !== currentQuestion.id) {
      setTimeRemaining(15);
      setSelectedAnswerIdx(null);
      setShowFeedback(false);
      lastQuestionIdRef.current = currentQuestion.id;
    }
    setIsTimeUp(false);

    let autoAnswerTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        // If freeze power-up active for this player, do not decrement
        if (freezeTimerPlayerId === currentPlayer?.id) return prev;
          if (prev <= 1) {
          setIsTimeUp(true);
          if (!autoAnswerTimeout) {
            // Auto-answer sebagai salah tanpa feedback
            autoAnswerTimeout = setTimeout(() => {
              if (onAnswerQuestion) onAnswerQuestion(false);
              else answerQuestion(false);
            }, 500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (autoAnswerTimeout) clearTimeout(autoAnswerTimeout);
      // Clear remembered question when unmounting/closing
      if (lastQuestionIdRef.current === currentQuestion.id) lastQuestionIdRef.current = null;
    };
  }, [phase, currentQuestion, answerQuestion, freezeTimerPlayerId, currentPlayer?.id]);

  // Auto-proceed after feedback delay
  useEffect(() => {
    if (showFeedback) {
      const feedbackTimer = setTimeout(() => {
        if (onAnswerQuestion) onAnswerQuestion(isAnswerCorrect);
        else answerQuestion(isAnswerCorrect);
      }, 2500);
      return () => clearTimeout(feedbackTimer);
    }
  }, [showFeedback, isAnswerCorrect, answerQuestion, onAnswerQuestion]);

  // Handler untuk select jawaban
  const handleSelectAnswer = (selectedIdx: number) => {
    if (selectedAnswerIdx !== null || isTimeUp) return; // Already answered
    
    const correct = selectedIdx === currentQuestion?.correctAnswer;
    setSelectedAnswerIdx(selectedIdx);
    setIsAnswerCorrect(correct);
    setShowFeedback(true);
  };

  // Hint Logic — use persisted removed index chosen when question was shown
  let options: string[] = currentQuestion ? Array.from(currentQuestion.options) : [];
  if (currentQuestion && typeof hintRemovedIndex === 'number') {
    options = options.map((opt, idx) => idx === hintRemovedIndex ? '' : opt);
  }

  return (
    <>
      {/* QUESTION MODAL (hidden for bot players) */}
      <Modal isOpen={phase === 'question' && currentQuestion !== null && !players[currentPlayerIndex]?.isBot} title="Jawab Pertanyaan!">
        {currentQuestion && (
          <div className="space-y-6">
            {/* Timer Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: WOOD_DARK }}>
                <div
                  className={`h-full transition-all duration-300 ${
                    timeRemaining <= 5 
                      ? 'bg-rose-500 animate-pulse' 
                      : timeRemaining <= 10
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${(timeRemaining / 15) * 100}%` }}
                />
              </div>
              <p className="text-center text-sm font-semibold" style={{ color: WOOD_LIGHT }}>
                {timeRemaining} detik
              </p>
              {freezeTimerPlayerId === currentPlayer?.id && (
                <p className="text-center text-sm font-bold" style={{ color: ACCENT_DEEP }}>⏸️ Waktu dibekukan</p>
              )}
            </div>

            {/* Question card — kayu gelap dengan aksen tembaga, seperti plakat ukiran */}
            <div
              className="relative p-5 rounded-xl text-lg font-medium leading-relaxed"
              style={{
                background: `linear-gradient(155deg, ${WOOD_DARK}, #4A2A12)`,
                border: `2px solid ${COPPER}`,
                color: PARCHMENT,
                boxShadow: `0 3px 0 ${INK}, inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}
            >
              <span
                className="absolute -top-3 left-4 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                style={{ background: COPPER, color: PARCHMENT }}
              >
                Soal
              </span>
              {currentQuestion.question}
            </div>
            
            {/* Answer options — kartu parchment hangat, bukan putih polos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((opt, idx) => {
                if (!opt) {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border-2 border-dashed line-through opacity-60 flex items-center"
                      style={{ background: BOARD_DARK, borderColor: WOOD_LIGHT, color: WOOD_LIGHT }}
                    >
                      <span className="font-bold mr-3" style={{ color: WOOD_LIGHT }}>{['A','B','C','D'][idx]}.</span>
                      [Dihapus oleh Hint]
                    </div>
                  );
                }

                const isSelected = selectedAnswerIdx === idx;
                const isCorrectAnswer = idx === currentQuestion.correctAnswer;
                const disabled = selectedAnswerIdx !== null || isTimeUp;

                let bg = PARCHMENT;
                let border = PARCHMENT_EDGE;
                let textColor = INK;
                let badgeBg = COPPER;

                if (isSelected) {
                  if (isAnswerCorrect) {
                    bg = SAGE_BG; border = SAGE_BORDER; textColor = SAGE_TEXT; badgeBg = SAGE_BORDER;
                  } else {
                    bg = TERRACOTTA_BG; border = TERRACOTTA_BORDER; textColor = TERRACOTTA_TEXT; badgeBg = TERRACOTTA_BORDER;
                  }
                } else if (isCorrectAnswer && showFeedback) {
                  bg = SAGE_BG; border = SAGE_BORDER; textColor = SAGE_TEXT; badgeBg = SAGE_BORDER;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={disabled}
                    className={`py-4 px-5 rounded-xl border-2 text-left whitespace-normal transition-all font-medium flex items-start gap-3 ${
                      disabled ? 'cursor-not-allowed opacity-95' : 'cursor-pointer hover:-translate-y-0.5'
                    }`}
                    style={{ background: bg, borderColor: border, color: textColor, boxShadow: `0 2px 0 ${border}` }}
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center font-black text-sm"
                      style={{ background: badgeBg, color: PARCHMENT }}
                    >
                      {['A','B','C','D'][idx]}
                    </span>
                    <span className="pt-0.5">{opt}</span>
                    {isSelected && (
                      <span className="ml-auto text-xl">
                        {isAnswerCorrect ? '✓' : '✗'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback Messages */}
            {showFeedback && (
              <div
                className="p-4 rounded-xl text-center font-bold text-lg animate-pulse border-2"
                style={
                  isAnswerCorrect
                    ? { background: SAGE_BG, borderColor: SAGE_BORDER, color: SAGE_TEXT }
                    : { background: TERRACOTTA_BG, borderColor: TERRACOTTA_BORDER, color: TERRACOTTA_TEXT }
                }
              >
                {isAnswerCorrect ? '✓ Jawaban Benar!' : '✗ Jawaban Salah!'}
              </div>
            )}

            {hintActive && !showFeedback && (
              <p className="text-sm text-center font-bold" style={{ color: WOOD_LIGHT }}>
                💡 Hint digunakan: 1 jawaban salah dihapus!
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ITEM USE (TARGET SELECTION) MODAL — hidden for bot players (bot handles selection automatically) */}
      <Modal
        isOpen={phase === 'item_use' && !!pendingItemId && !players[currentPlayerIndex]?.isBot}
        title="Pilih Pemain Target"
        onClose={() => { 
          useGameStore.setState({ pendingItemId: null, phase: 'rolling' });
        }}
      >
        <div className="space-y-4">
          <p style={{ color: INK }}>Pilih pemain yang akan terkena efek item ini:</p>
          <div className="space-y-2">
            {players.filter(p => p.id !== currentPlayer?.id).map(target => (
              <Button
                key={target.id}
                variant="secondary"
                className="w-full py-3 flex items-center justify-between"
                onClick={async () => {
                  if (!pendingItemId) return;
                  // Apply locally
                  useItem(pendingItemId, target.id);
                  useGameStore.setState({ pendingItemId: null, phase: 'rolling' });

                  // Post event for online synchronization
                  try {
                    const onlineRoom = useOnlineGameStore.getState().room;
                    const localOnlinePlayer = useOnlineGameStore.getState().localPlayer;
                    if (onlineRoom && localOnlinePlayer) {
                      const targetIdx = target.id - 1;
                      const targetOnlineId = onlineRoom.players?.[targetIdx]?.id;
                      await supabaseGameService.postEvent(onlineRoom.roomId, String(localOnlinePlayer.id), 'item_used', { itemType: pendingItemId, targetId: String(targetOnlineId) });

                      // Persist both players' positions in DB for robustness
                      try {
                        const gsPlayers = useGameStore.getState().players;
                        // actor
                        const actorOfflineIdx = currentPlayer?.id ? currentPlayer.id - 1 : -1;
                        if (actorOfflineIdx >= 0) {
                          const actorOnlineId = onlineRoom.players?.[actorOfflineIdx]?.id;
                          const actorState = gsPlayers[actorOfflineIdx];
                          if (actorOnlineId && actorState) {
                            await supabaseGameService.updatePlayerPosition(onlineRoom.roomId, String(actorOnlineId), actorState.position, actorState.previousPosition ?? actorState.position);
                          }
                        }
                        // target
                        if (targetIdx >= 0) {
                          const tgtOnlineId = onlineRoom.players?.[targetIdx]?.id;
                          const tgtState = gsPlayers[targetIdx];
                          if (tgtOnlineId && tgtState) {
                            await supabaseGameService.updatePlayerPosition(onlineRoom.roomId, String(tgtOnlineId), tgtState.position, tgtState.previousPosition ?? tgtState.position);
                          }
                        }
                      } catch {
                        // ignore persistence errors
                      }
                    }
                  } catch {
                    // ignore
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${target.color === 'red' ? 'bg-rose-500' : target.color === 'blue' ? 'bg-blue-500' : target.color === 'green' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="font-bold">{target.name} (Pos: {target.position})</span>
                </div>
                <span className="text-sm">Pilih</span>
              </Button>
            ))}
          </div>
         
        </div>
      </Modal>

      {/* Mystery box now shows via awarded-item modal to avoid duplicate modals */}

      {/* GOLDEN DICE MODAL (hidden for bot players) */}
      <Modal 
        isOpen={phase === 'golden_dice' && !players[currentPlayerIndex]?.isBot} 
        title="🎲 Dadu Emas"
        onClose={() => setPhase('rolling')}
      >
        <div className="space-y-6 text-center">
          <p style={{ color: INK }}>Pilih angka dadu yang kamu inginkan (1-6):</p>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(num => (
              <Button key={num} variant="secondary" className="text-2xl py-6" onClick={() => rollDice(num as any)}>
                {num}
              </Button>
            ))}
          </div>
        </div>
      </Modal>

      {/* SWAP POSITION MODAL (hidden for bot players) */}
      <Modal 
        isOpen={phase === 'swap_position' && !players[currentPlayerIndex]?.isBot} 
        title="🔄 Tukar Posisi"
        onClose={() => setPhase('rolling')}
      >
        <div className="space-y-6">
          <p style={{ color: INK }}>Pilih pemain untuk bertukar posisi. Hanya pemain dalam jarak 5-7 kotak yang valid.</p>
          <div className="space-y-3">
            {players.filter(p => p.id !== currentPlayer?.id).map(target => {
              const distance = Math.abs((currentPlayer?.position || 0) - target.position);
              const isValid = distance >= 5 && distance <= 7;
              
              return (
                <Button 
                  key={target.id} 
                  variant="secondary" 
                  className={`w-full py-4 flex justify-between items-center ${isValid ? 'hover:border-emerald-400 hover:bg-emerald-500/10' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!isValid}
                  onClick={() => {
                    if (isValid) {
                       useItem('powerup_swap_position', target.id); // This will swap
                       useGameStore.setState({ pendingItemId: null });
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${target.color === 'red' ? 'bg-rose-500' : target.color === 'blue' ? 'bg-blue-500' : target.color === 'green' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className="font-bold">{target.name} (Pos: {target.position})</span>
                  </div>
                  <span className="text-sm">Jarak: {distance}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ITEM AWARDED MODAL — hanya tampilkan untuk pemain non-bot */}
      <Modal isOpen={
        phase === 'item_awarded' && awardedItem !== null && !players.find(p => p.id === awardedItem.playerId)?.isBot
      } title="Item Diperoleh">
        {awardedItem && (
          <div className="flex flex-col items-center text-center space-y-6 py-6">
            <div className="text-8xl drop-shadow-[0_0_30px_rgba(140,94,0,0.35)]">{awardedItem.item.icon}</div>
            <div>
              <h3 className="text-2xl font-black mb-1" style={{ color: ACCENT_DEEP }}>{awardedItem.item.name}</h3>
              <p style={{ color: WOOD_LIGHT }} className="max-w-md">{awardedItem.item.description}</p>
            </div>
            <div className="text-sm font-bold" style={{ color: WOOD_LIGHT }}>
              Diterima oleh: <span className="font-bold" style={{ color: INK }}>{players.find(p => p.id === awardedItem.playerId)?.name || `Player ${awardedItem.playerId}`}</span>
            </div>
            <Button size="lg" variant="primary" className="w-full mt-4" onClick={closeAwardedItemModal}>
              OK
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};