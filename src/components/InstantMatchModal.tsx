import React, { useState } from 'react';
import { TradeListing, PokemonCard } from '../types';
import { CARD_MAP } from '../data/cardsData';
import { X, Sparkles, Check, Copy, ArrowRightLeft, UserCheck, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { RarityBadge } from './RarityBadge';

export interface MatchedListingInfo {
  listing: TradeListing;
  matchType: 'perfect' | 'offer_match'; // 'perfect': dual mutual match, 'offer_match': offers what user wants
  userWillGet: PokemonCard[];
  userWillGive: PokemonCard[];
}

interface InstantMatchModalProps {
  matches: MatchedListingInfo[];
  onClose: () => void;
  onInitiateTrade: (listing: TradeListing) => void;
  zIndex?: number;
}

export const InstantMatchModal: React.FC<InstantMatchModalProps> = ({
  matches,
  onClose,
  onInitiateTrade,
  zIndex,
}) => {
  const { currentLanguage, t, getCardName, getCardImageUrl, getRarityName, getPackName } =
    useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="instant-match-dialog"
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Glowing Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-rose-400 to-amber-500" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/30 to-rose-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-100">
                  {t('instantMatchSuccess')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t('foundMatchingListings', { count: matches.length })}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('instantMatchSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matches List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {matches.map(({ listing, matchType, userWillGet, userWillGive }, idx) => {
            const isPerfect = matchType === 'perfect';
            const listingRarity = listing.rarity || userWillGet[0]?.rarity || '1D';

            return (
              <div
                key={listing.id || idx}
                className={`p-4 rounded-2xl border transition-all ${
                  isPerfect
                    ? 'bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                {/* Match Banner */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={listing.trainerAvatar}
                      alt={listing.trainerName}
                      className="w-8 h-8 rounded-full border border-slate-700 object-cover bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {listing.trainerName}
                        </span>
                        {isPerfect ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> {t('dualMutualMatch')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            {t('offersWhatYouNeed')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <span>{t('codeLabel')} {listing.friendCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(listing.id, listing.friendCode)}
                          className="hover:text-sky-300 text-slate-500 p-0.5"
                          title={t('copyFriendCode')}
                        >
                          {copiedId === listing.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Official Rarity badge only */}
                  <div className="p-1 rounded-lg bg-slate-900 border border-slate-800">
                    <RarityBadge rarity={listingRarity} size="sm" showLabel={false} />
                  </div>
                </div>

                {/* Cards matched visual */}
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  {/* Left: You will get */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-rose-400" /> {t('youWillGet')}
                    </span>
                    <div className="flex items-center gap-2">
                      {userWillGet.slice(0, 2).map((card) => (
                        <div key={card.id} className="text-center w-14">
                          <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-slate-900 border border-rose-500/40 p-0.5">
                            <img
                              src={getCardImageUrl(card, 'low')}
                              alt={getCardName(card)}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">
                            {getCardName(card)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Middle Arrow */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 font-bold">1:1</span>
                  </div>

                  {/* Right: You will give */}
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                      {t('youCanProvide')} <Check className="w-2.5 h-2.5" />
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      {userWillGive.slice(0, 2).map((card) => (
                        <div key={card.id} className="text-center w-14">
                          <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-slate-900 border border-emerald-500/40 p-0.5">
                            <img
                              src={getCardImageUrl(card, 'low')}
                              alt={getCardName(card)}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">
                            {getCardName(card)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2">
                  {listing.note ? (
                    <p className="text-[11px] text-slate-400 italic truncate flex-1">
                      &ldquo;{listing.note}&rdquo;
                    </p>
                  ) : (
                    <span className="text-[11px] text-slate-500">{t('fastAcceptNote')}</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(listing.id, listing.friendCode)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedId === listing.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          {t('copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {t('copyFriendCode')}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onInitiateTrade(listing);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {t('instantTradeCta')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {t('listingPublishedLobbyNote')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            {t('goToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
};
