import React, { useState, useEffect } from 'react';
import { PokemonCard, UserCardStatus } from '../types';
import { RARITY_INFO, ENERGY_INFO } from '../data/cardsData';
import { X, Heart, Plus, Minus, ArrowRightLeft, Sparkles, Swords, ExternalLink, Lock, AlertTriangle, Trophy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isCardTradeable, getTradeRestrictionReason } from '../utils/tradeRules';
import { RarityBadge } from './RarityBadge';
import { PackExpansionLogo } from './PackExpansionLogo';

interface CardDetailModalProps {
  card: PokemonCard | null;
  status?: UserCardStatus;
  onClose: () => void;
  onUpdateCount: (cardId: string, delta: number) => void;
  onToggleWishlist: (cardId: string) => void;
  onToggleForTrade: (cardId: string) => void;
  onFindTrades: (cardId: string) => void;
  onCreateListingWithCard: (cardId: string) => void;
  zIndex?: number;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  status,
  onClose,
  onUpdateCount,
  onToggleWishlist,
  onToggleForTrade,
  onFindTrades,
  onCreateListingWithCard,
  zIndex,
}) => {
  const { currentLanguage, cardArtLanguage, t, getCardName, getCardImageUrl, getPackName, getRarityName, getEnergyName } =
    useLanguage();
  const [imgErrorCount, setImgErrorCount] = useState(0);

  useEffect(() => {
    setImgErrorCount(0);
  }, [currentLanguage, cardArtLanguage, card?.id]);

  if (!card) return null;

  const count = status?.count || 0;
  const inWishlist = !!status?.inWishlist;
  const forTradeCount = status?.forTradeCount || 0;
  const tradeable = isCardTradeable(card);
  const restrictionReason = !tradeable ? getTradeRestrictionReason(card, currentLanguage) : null;
  const rarity = RARITY_INFO[card.rarity] || RARITY_INFO['1D'];
  const energy = ENERGY_INFO[card.type] || ENERGY_INFO['colorless'];

  const isRareHolo = ['3S', 'CR', '2S'].includes(card.rarity);

  const localizedName = getCardName(card);
  const secondaryName =
    currentLanguage === 'en'
      ? card.names?.['ja'] || card.nameCn
      : card.nameEn || card.names?.['en'];

  // Image source with fallback
  const primaryImageUrl = getCardImageUrl(card, 'high');
  const fallbackImageUrl = `https://assets.tcgdex.net/en/tcgp/${card.expansionCode}/${card.cardNumber}/high.webp`;
  const spriteFallback = card.imageUrl || '';

  const displayImgUrl =
    imgErrorCount === 0
      ? primaryImageUrl
      : imgErrorCount === 1
      ? fallbackImageUrl
      : spriteFallback;

  return (
    <div
      style={{ zIndex: zIndex || 75 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="card-detail-dialog"
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <RarityBadge rarity={card.rarity} size="md" />
            <span className="text-xs text-slate-400 font-mono">
              {card.expansionCode} · #{card.cardNumber}/{card.totalInSet}
            </span>
          </div>

          <button
            id="close-detail-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Card Presentation */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* Big Card Visual */}
            <div
              className={`relative w-48 aspect-[3/4] shrink-0 rounded-2xl p-2 bg-slate-950 border flex flex-col items-center justify-between ${
                card.rarity === 'CR'
                  ? 'border-amber-400 shadow-xl shadow-amber-500/20'
                  : card.rarity === '3S'
                  ? 'border-fuchsia-500 shadow-xl shadow-fuchsia-500/20'
                  : 'border-slate-700 shadow-lg'
              }`}
            >
              {isRareHolo && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-cyan-500/20 rounded-2xl" />
              )}

              {/* Card top in frame */}
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-200">
                <span className="truncate max-w-[110px]">{localizedName}</span>
                {card.hp && <span className="font-mono text-amber-400">{t('hp')} {card.hp}</span>}
              </div>

              {/* Artwork */}
              <div className="w-full aspect-[4/3] flex items-center justify-center overflow-hidden my-1">
                <img
                  key={`${card.id}-${cardArtLanguage || currentLanguage}-${imgErrorCount}`}
                  src={displayImgUrl}
                  alt={localizedName}
                  onError={() => setImgErrorCount((prev) => prev + 1)}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain filter drop-shadow-lg"
                />
              </div>

              {/* Card bottom info */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span className="truncate max-w-[120px]">{getPackName(card.pack)}</span>
                <RarityBadge rarity={card.rarity} size="sm" showLabel={false} />
              </div>
            </div>

            {/* Info details */}
            <div className="flex-1 w-full space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-100 flex items-center gap-1.5">
                    {localizedName}
                    {card.isEx && (
                      <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-black tracking-wider">
                        EX
                      </span>
                    )}
                  </h3>
                  {card.rarity === 'CR' && <Sparkles className="w-4 h-4 text-amber-300" />}
                </div>
                {secondaryName && (
                  <p className="text-sm text-slate-400 font-mono">{secondaryName}</p>
                )}
              </div>

              {/* Tags grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px]">{t('boosterPack')}</span>
                    <span className="font-medium text-slate-200 truncate block">{getPackName(card.pack)}</span>
                  </div>
                  <PackExpansionLogo packKey={card.pack} lang={currentLanguage} className="h-6 w-auto max-w-[70px] object-contain shrink-0" />
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-slate-400 block text-[11px]">{t('allTypes')}</span>
                  <span className={`font-medium ${energy.color}`}>{getEnergyName(card.type)}</span>
                </div>
                {card.stage && (
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px]">{t('stage')}</span>
                    <span className="font-medium text-slate-200">{card.stage}</span>
                  </div>
                )}
                {card.retreat !== undefined && (
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px]">{t('retreat')}</span>
                    <span className="font-medium text-slate-200">{card.retreat}</span>
                  </div>
                )}
              </div>

              {/* Collection Rating Point Value */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{t('collectionRatingWeight')}</span>
                </div>
                <span className="font-mono font-black text-amber-400">
                  +{card.rarity === 'CR' ? '1,000' : card.rarity === '3S' ? '500' : card.rarity === '2S' ? '250' : card.rarity === '1S' ? '100' : card.rarity === '4D' ? '80' : card.rarity === '3D' ? '40' : card.rarity === '2D' ? '20' : '10'} {t('pointsUnit')}
                </span>
              </div>

              {/* Attacks / Abilities */}
              {card.attacks && card.attacks.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    {t('attacks')}
                  </span>
                  {card.attacks.map((atk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span>{atk.name}</span>
                        {atk.damage && (
                          <span className="text-amber-400 font-mono text-sm">{atk.damage} {t('damage')}</span>
                        )}
                      </div>
                      {atk.effect && <p className="text-slate-400 text-[11px] leading-relaxed">{atk.effect}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Official Rule Restriction Notice for Promo & 3S cards */}
          {!tradeable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">{restrictionReason?.title}</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                  {restrictionReason?.description}
                </p>
              </div>
            </div>
          )}

          {/* Collection Status & Operations */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">{t('ownedCount')}</span>
                <p className="text-xs text-slate-500">
                  {count === 0
                    ? t('filterMissing')
                    : `${t('ownedCount')}: ${count} ${
                        tradeable && count > 1 ? `(${t('forTradeCount')}: ${count - 1})` : ''
                      }`}
                </p>
              </div>

              {/* Increment / Decrement */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateCount(card.id, -1)}
                  disabled={count === 0}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-mono font-bold text-base text-sky-400">
                  {count}
                </span>
                <button
                  onClick={() => onUpdateCount(card.id, 1)}
                  className="w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
              {/* Wishlist toggle */}
              <button
                id="modal-toggle-wishlist"
                onClick={() => onToggleWishlist(card.id)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  inWishlist
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-rose-400 text-rose-400' : ''}`} />
                {inWishlist ? t('removeFromWishlist') : t('addToWishlist')}
              </button>

              {/* For trade toggle */}
              {tradeable ? (
                <button
                  id="modal-toggle-fortrade"
                  onClick={() => onToggleForTrade(card.id)}
                  disabled={count === 0}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 ${
                    forTradeCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {forTradeCount > 0 ? `${t('forTradeCount')} (x${forTradeCount})` : t('forTradeCount')}
                </button>
              ) : (
                <div
                  className="py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-slate-900 text-slate-500 border border-slate-800 select-none cursor-not-allowed"
                  title={restrictionReason?.description}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  {t('officialTradeForbidden')}
                </div>
              )}
            </div>
          </div>

          {/* Trade Market Action Shortcuts */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              id="modal-find-trades-btn"
              onClick={() => {
                onClose();
                onFindTrades(card.id);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              {t('tabMarket')}
            </button>

            {tradeable && count >= 1 && (
              <button
                id="modal-create-listing-btn"
                onClick={() => {
                  onClose();
                  onCreateListingWithCard(card.id);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {t('postTrade')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
