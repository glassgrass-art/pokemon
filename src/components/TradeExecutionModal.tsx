import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { PokemonCard } from '../types';
import { RARITY_INFO } from '../data/cardsData';
import { ArrowRightLeft, Sparkles, CheckCircle2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TradeExecutionModalProps {
  giveCard: PokemonCard;
  getCard: PokemonCard;
  partnerName: string;
  partnerFriendCode: string;
  onConfirm: () => void;
  onClose: () => void;
  zIndex?: number;
}

export const TradeExecutionModal: React.FC<TradeExecutionModalProps> = ({
  giveCard,
  getCard,
  partnerName,
  partnerFriendCode,
  onConfirm,
  onClose,
  zIndex,
}) => {
  const { t, getCardName, getCardImageUrl, getRarityName } = useLanguage();
  const [stage, setStage] = useState<'confirming' | 'animating' | 'completed'>('confirming');
  const [copied, setCopied] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  const rarity = RARITY_INFO[giveCard.rarity] || RARITY_INFO['1D'];

  const handleExecute = () => {
    setStage('animating');
    setTimeout(() => {
      setStage('completed');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#fbbf24', '#f43f5e', '#a855f7'],
        });
      } catch (e) {
        // Safe fallback
      }
      onConfirm();
    }, 1600);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partnerFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{ zIndex: zIndex || 80 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== 'animating') onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="trade-execution-dialog"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6"
      >
        {/* Close button if in confirming stage */}
        {stage === 'confirming' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            {t('badgeTrade')} · {rarity.label} {getRarityName(giveCard.rarity)}
          </div>
          <h3 className="text-xl font-black text-slate-100">
            {stage === 'completed' ? `🎉 ${t('statusCompleted')}!` : t('executeTrade')}
          </h3>
          <p className="text-xs text-slate-400">
            {t('profile')}: <strong className="text-sky-400">{partnerName}</strong>
          </p>
        </div>

        {/* Interactive Dual Card Visual Swap Stage */}
        <div className="relative py-4 flex items-center justify-center gap-6">
          {/* Card Give */}
          <div
            className={`flex flex-col items-center transition-all duration-700 ${
              stage === 'animating' ? 'scale-90 translate-x-12 opacity-50' : 'scale-100'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-400 mb-2">{t('youGive')}</span>
            <div className="w-28 h-36 rounded-xl bg-slate-950 border border-slate-700 p-1.5 flex flex-col items-center justify-between shadow-lg">
              <div className="w-full flex justify-between text-[10px] text-slate-300">
                <span className="truncate max-w-[70px]">{getCardName(giveCard)}</span>
                <span className="text-amber-400 font-bold">{rarity.label}</span>
              </div>
              <img
                src={getCardImageUrl(giveCard, 'low')}
                alt={getCardName(giveCard)}
                referrerPolicy="no-referrer"
                className="w-16 h-16 object-contain"
              />
              <span className="text-[9px] text-slate-400 font-mono">#{giveCard.cardNumber}</span>
            </div>
          </div>

          {/* Swap icon */}
          <div className="flex flex-col items-center justify-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-amber-500 to-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/20 transition-transform ${
                stage === 'animating' ? 'rotate-180 animate-spin' : ''
              }`}
            >
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-2">{rarity.label}</span>
          </div>

          {/* Card Receive */}
          <div
            className={`flex flex-col items-center transition-all duration-700 ${
              stage === 'animating' ? 'scale-90 -translate-x-12 opacity-50' : 'scale-100'
            }`}
          >
            <span className="text-[11px] font-bold text-emerald-400 mb-2">{t('youReceive')}</span>
            <div className="w-28 h-36 rounded-xl bg-slate-950 border border-slate-700 p-1.5 flex flex-col items-center justify-between shadow-lg">
              <div className="w-full flex justify-between text-[10px] text-slate-300">
                <span className="truncate max-w-[70px]">{getCardName(getCard)}</span>
                <span className="text-amber-400 font-bold">{rarity.label}</span>
              </div>
              <img
                src={getCardImageUrl(getCard, 'low')}
                alt={getCardName(getCard)}
                referrerPolicy="no-referrer"
                className="w-16 h-16 object-contain"
              />
              <span className="text-[9px] text-slate-400 font-mono">#{getCard.cardNumber}</span>
            </div>
          </div>
        </div>

        {/* Partner Friend Code Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="text-left">
            <span className="text-slate-500 text-[11px] block">{t('friendCode')}</span>
            <span className="font-mono font-bold text-sky-400 text-sm tracking-wider">
              {partnerFriendCode}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('copyFriendCode')}</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Actions */}
        {stage === 'confirming' && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              id="confirm-execute-trade-btn"
              onClick={() => setShowConfirmAlert(true)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('executeTrade')}
            </button>
          </div>
        )}

        {stage === 'animating' && (
          <div className="py-2 text-xs font-medium text-amber-400 animate-pulse">
            ⚡ {t('statusActive')}...
          </div>
        )}

        {stage === 'completed' && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-emerald-400 font-medium">
              ✓ -1 {getCardName(giveCard)}, +1 {getCardName(getCard)}
            </p>
            <button
              id="finish-trade-modal-btn"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              {t('tabCollection')}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Alert Dialog before final execution */}
      {showConfirmAlert && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-5 text-left space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">{t('confirmTradeExecutionTitle')}</h4>
                <p className="text-[11px] text-slate-400">{t('confirmTradeExecutionDesc')}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t('deductGiveCard')}</span>
                <span className="font-bold text-rose-400">{getCardName(giveCard)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{t('receiveNewCard')}</span>
                <span className="font-bold text-emerald-400">{getCardName(getCard)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1.5 border-t border-slate-800/80">
                <span className="text-slate-400">{t('marketListingUpdate')}</span>
                <span className="text-amber-300 font-medium">{t('marketListingUpdateDesc')}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 text-[11px] space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-sky-300 font-medium">{t('partnerCodeInGameTip')}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 flex items-center gap-1 font-mono text-[10px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? t('copied') : t('copyFriendCode')}</span>
                </button>
              </div>
              <p className="font-mono text-xs font-bold text-sky-400 tracking-wider">
                {partnerFriendCode}
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {t('gameTradeReminder')}
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmAlert(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {t('backToReview')}
              </button>
              <button
                type="button"
                id="final-confirm-trade-alert-btn"
                onClick={() => {
                  setShowConfirmAlert(false);
                  handleExecute();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('confirmCompleteTrade')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
