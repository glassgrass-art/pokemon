import React, { useState, useMemo } from 'react';
import { TradeListing, UserCardStatus, PokemonCard } from '../types';
import { CARD_MAP, RARITY_INFO } from '../data/cardsData';
import { Sparkles, ArrowRightLeft, Heart, CheckCircle2, Copy, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isCardTradeable } from '../utils/tradeRules';

interface TradeMatcherProps {
  listings: TradeListing[];
  userCollection: Record<string, UserCardStatus>;
  onExecuteTrade: (giveCard: PokemonCard, getCard: PokemonCard, partnerName: string, partnerFriendCode: string) => void;
}

export const TradeMatcher: React.FC<TradeMatcherProps> = ({
  listings,
  userCollection,
  onExecuteTrade,
}) => {
  const { currentLanguage, t, getCardName, getCardImageUrl, getRarityName, getPackName } =
    useLanguage();

  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [tab, setTab] = useState<'mutual' | 'wishlist' | 'duplicate'>('mutual');

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Find all matches:
  const { mutualMatches, wishlistMatches, duplicateMatches } = useMemo(() => {
    const mutual: TradeListing[] = [];
    const wish: TradeListing[] = [];
    const dup: TradeListing[] = [];

    listings.forEach((listing) => {
      if (listing.isUserListing) return; // Skip own listings

      const offerCard = CARD_MAP.get(listing.offerCardId);
      const wantCard = CARD_MAP.get(listing.wantCardId);
      if (!offerCard || !wantCard) return;
      if (!isCardTradeable(offerCard) || !isCardTradeable(wantCard)) return;

      const userHasWhatTheyWant = (userCollection[wantCard.id]?.count || 0) > 0;
      const userHasDuplicate = (userCollection[wantCard.id]?.count || 0) >= 2 || (userCollection[wantCard.id]?.forTradeCount || 0) > 0;
      const userWantsWhatTheyOffer = !!userCollection[offerCard.id]?.inWishlist;

      // 100% Mutual Match: user wants their offer AND user has what they want!
      if (userWantsWhatTheyOffer && userHasWhatTheyWant) {
        mutual.push(listing);
      } else if (userWantsWhatTheyOffer) {
        wish.push(listing);
      } else if (userHasDuplicate) {
        dup.push(listing);
      }
    });

    return { mutualMatches: mutual, wishlistMatches: wish, duplicateMatches: dup };
  }, [listings, userCollection]);

  const activeList = tab === 'mutual' ? mutualMatches : tab === 'wishlist' ? wishlistMatches : duplicateMatches;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          {t('appTitle')} · {t('tabMatcher')}
        </div>
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          {t('tabMatcher')}
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          {t('sameRarityTradeNote')}
        </p>

        {/* Tab Pills with Counts */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setTab('mutual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'mutual'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('matchMutual')} ({mutualMatches.length})
          </button>
          <button
            onClick={() => setTab('wishlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'wishlist'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            {t('matchTheyHaveWishlist')} ({wishlistMatches.length})
          </button>
          <button
            onClick={() => setTab('duplicate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'duplicate'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('matchTheyWantMyExtra')} ({duplicateMatches.length})
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="space-y-3">
        {activeList.length === 0 ? (
          <div className="py-14 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {tab === 'mutual'
                ? t('matchMutual') + ' (0)'
                : tab === 'wishlist'
                ? t('matchTheyHaveWishlist') + ' (0)'
                : t('matchTheyWantMyExtra') + ' (0)'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t('tradeMarketDesc')}
            </p>
          </div>
        ) : (
          activeList.map((listing) => {
            const offerCard = CARD_MAP.get(listing.offerCardId);
            const wantCard = CARD_MAP.get(listing.wantCardId);
            if (!offerCard || !wantCard) return null;

            const rarity = RARITY_INFO[offerCard.rarity] || RARITY_INFO['1D'];
            const isMutual = tab === 'mutual';

            return (
              <div
                key={listing.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-lg ${
                  isMutual
                    ? 'bg-gradient-to-r from-amber-950/20 via-slate-900 to-indigo-950/20 border-amber-500/40 hover:border-amber-400'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={listing.trainerAvatar}
                      alt={listing.trainerName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200">{listing.trainerName}</span>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <span>{listing.friendCode}</span>
                        <button
                          onClick={() => handleCopy(listing.id, listing.friendCode)}
                          className="hover:text-sky-400 text-slate-500"
                          title={t('copyFriendCode')}
                        >
                          {copiedCodeId === listing.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMutual && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm">
                        ⭐ {t('matchMutualBadge')}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${rarity.bgBadge}`}>
                      {rarity.label} · {getRarityName(offerCard.rarity)}
                    </span>
                  </div>
                </div>

                {/* Match Cards Flow */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                  {/* Give Card (You give to them) */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-14 h-18 rounded-lg bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={getCardImageUrl(wantCard, 'low')}
                        alt={getCardName(wantCard)}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 text-xs">
                      <span className="text-[10px] text-rose-400 font-semibold block">{t('youGive')}</span>
                      <p className="font-bold text-slate-100 truncate">{getCardName(wantCard)}</p>
                      <span className="text-[11px] text-slate-400 truncate block">{getPackName(wantCard.pack)}</span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {t('ownedCount')}: {userCollection[wantCard.id]?.count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Swap */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">{rarity.label}</span>
                  </div>

                  {/* Receive Card (They give to you) */}
                  <div className="flex items-center gap-3 flex-1 justify-end text-right">
                    <div className="min-w-0 text-xs">
                      <span className="text-[10px] text-emerald-400 font-semibold block">{t('youReceive')}</span>
                      <p className="font-bold text-slate-100 truncate">{getCardName(offerCard)}</p>
                      <span className="text-[11px] text-slate-400 truncate block">{getPackName(offerCard.pack)}</span>
                      {userCollection[offerCard.id]?.inWishlist ? (
                        <span className="text-[10px] text-rose-400 font-medium flex items-center justify-end gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-rose-400" /> {t('inWishlist')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">{t('filterMissing')}</span>
                      )}
                    </div>
                    <div className="w-14 h-18 rounded-lg bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={getCardImageUrl(offerCard, 'low')}
                        alt={getCardName(offerCard)}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Trigger Action */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-400 italic truncate max-w-md">
                    {listing.note || t('sameRarityTradeNote')}
                  </p>

                  <button
                    onClick={() => onExecuteTrade(wantCard, offerCard, listing.trainerName, listing.friendCode)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {t('executeTrade')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
