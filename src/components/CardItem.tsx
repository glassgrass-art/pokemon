import React, { useState, useEffect } from 'react';
import { PokemonCard, UserCardStatus } from '../types';
import { RARITY_INFO, ENERGY_INFO } from '../data/cardsData';
import { Heart, Plus, Minus, ArrowRightLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { RarityBadge } from './RarityBadge';

interface CardItemProps {
  card: PokemonCard;
  status?: UserCardStatus;
  onUpdateCount: (cardId: string, delta: number) => void;
  onToggleWishlist: (cardId: string) => void;
  onToggleForTrade: (cardId: string) => void;
  onInspect: (card: PokemonCard) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  status,
  onUpdateCount,
  onToggleWishlist,
  onToggleForTrade,
  onInspect,
}) => {
  const { currentLanguage, cardArtLanguage, getCardName, getCardImageUrl, getRarityName, t } =
    useLanguage();
  const [imgErrorCount, setImgErrorCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset image error count and loaded state when language switches
  useEffect(() => {
    setImgErrorCount(0);
    setIsLoaded(false);
  }, [currentLanguage, cardArtLanguage, card.id]);

  const count = status?.count || 0;
  const isOwned = count > 0;
  const inWishlist = !!status?.inWishlist;
  const forTradeCount = status?.forTradeCount || 0;

  const isRareHolo = ['3S', 'CR', '2S'].includes(card.rarity);
  const isCrown = card.rarity === 'CR';
  const isImmersive = card.rarity === '3S';

  // Only display current language name as requested
  const localizedName = getCardName(card);

  // Compute lightweight webp image url for fast rendering (10x smaller payload than high-res)
  const primaryImageUrl = getCardImageUrl(card, 'low');
  const fallbackImageUrl = `https://assets.tcgdex.net/en/tcgp/${card.expansionCode}/${card.cardNumber}/low.webp`;
  const spriteFallback = card.imageUrl || '';

  const displayImgUrl =
    imgErrorCount === 0
      ? primaryImageUrl
      : imgErrorCount === 1
      ? fallbackImageUrl
      : spriteFallback;

  return (
    <div
      id={`card-${card.id}`}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden select-none bg-slate-900/95 p-2 sm:p-2.5 ${
        isCrown
          ? 'border-amber-400/80 shadow-lg shadow-amber-500/20 hover:border-amber-300'
          : isImmersive
          ? 'border-fuchsia-500/70 shadow-lg shadow-fuchsia-500/20 hover:border-fuchsia-400'
          : isOwned
          ? 'border-slate-700/80 hover:border-slate-500 shadow-md shadow-black/30'
          : 'border-slate-800/60 opacity-60 hover:opacity-95'
      }`}
    >
      {/* Rare Foil Sheen Effect for Immersive & Crown */}
      {isRareHolo && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-amber-500/5 via-fuchsia-500/10 to-cyan-500/15 opacity-40 mix-blend-overlay group-hover:opacity-75 transition-opacity rounded-2xl" />
      )}

      {/* Top Bar: Rarity + Card Code on Left | Wishlist + Trade Buttons on Right */}
      <div className="flex items-center justify-between gap-1 mb-2 z-20">
        {/* Left: Rarity + Code */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center shrink-0" title={getRarityName(card.rarity)}>
            <RarityBadge rarity={card.rarity} size="sm" showLabel={false} />
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-semibold truncate">
            {card.expansionCode}-{card.cardNumber}
          </span>
        </div>

        {/* Right: Wishlist and Trade Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Wishlist Button */}
          <button
            id={`wishlist-btn-${card.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(card.id);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              inWishlist
                ? 'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-700 border border-slate-700/60'
            }`}
            title={inWishlist ? t('removeFromWishlist') : t('addToWishlist')}
          >
            <Heart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-rose-400' : ''}`} />
          </button>

          {/* Trade Button */}
          <button
            id={`trade-toggle-${card.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleForTrade(card.id);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              forTradeCount > 0
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'bg-slate-800/80 text-slate-400 hover:text-amber-300 hover:bg-slate-700 border border-slate-700/60'
            }`}
            title={forTradeCount > 0 ? t('statusActive') : t('forTradeCount')}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Artwork (Click to inspect) */}
      <div
        className="relative w-full aspect-[63/88] rounded-xl overflow-hidden bg-slate-950/80 flex items-center justify-center cursor-pointer group-hover:scale-[1.02] transition-transform duration-200 border border-slate-800/90 shadow-inner"
        onClick={() => onInspect(card)}
        title={t('inspectCard')}
      >
        {/* Shimmer skeleton while loading */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-800/60 animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono text-slate-500 font-semibold">{card.cardNumber}</span>
          </div>
        )}
        <img
          key={`${card.id}-${cardArtLanguage || currentLanguage}-${imgErrorCount}`}
          src={displayImgUrl}
          alt={localizedName}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setImgErrorCount((prev) => prev + 1);
          }}
          referrerPolicy="no-referrer"
          className={`h-full w-full object-contain filter drop-shadow-md transition-all duration-300 ${
            !isOwned ? 'grayscale contrast-85 brightness-90' : ''
          } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* Card Name (Current language only) */}
      <div
        className="mt-2 text-center cursor-pointer"
        onClick={() => onInspect(card)}
        title={t('inspectCard')}
      >
        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate flex items-center justify-center gap-1">
          {localizedName}
          {isCrown && <Sparkles className="w-3 h-3 text-amber-300 inline shrink-0" />}
        </h4>
      </div>

      {/* Bottom Minimalist Stepper: - [count] + */}
      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-800/70 z-20">
        <button
          id={`dec-btn-${card.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCount(card.id, -1);
          }}
          disabled={count === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/90 hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
          title={t('decreaseCount')}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span
          onClick={() => onInspect(card)}
          className={`font-mono text-xs sm:text-sm font-bold cursor-pointer select-none px-2 ${
            count > 0 ? 'text-white' : 'text-slate-500'
          }`}
          title={t('viewDetails')}
        >
          {count}
        </span>

        <button
          id={`inc-btn-${card.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onUpdateCount(card.id, 1);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white transition-colors shadow-sm shadow-sky-900/40"
          title={t('increaseCount')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
