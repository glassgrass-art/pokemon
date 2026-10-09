import React, { useState } from 'react';
import { TradeProposal, TradeListing, UserCardStatus } from '../types';
import { CARD_MAP, RARITY_INFO } from '../data/cardsData';
import { X, ArrowRightLeft, Check, Trash2, CheckCircle2, Copy, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MyTradesModalProps {
  proposals: TradeProposal[];
  listings: TradeListing[];
  userCollection: Record<string, UserCardStatus>;
  onClose: () => void;
  onAcceptProposal: (proposal: TradeProposal) => void;
  onDeclineProposal: (proposalId: string) => void;
  onDeleteListing: (listingId: string) => void;
  zIndex?: number;
}

export const MyTradesModal: React.FC<MyTradesModalProps> = ({
  proposals,
  listings,
  userCollection,
  onClose,
  onAcceptProposal,
  onDeclineProposal,
  onDeleteListing,
  zIndex,
}) => {
  const { t, getCardName, getCardImageUrl, getRarityName, getPackName } = useLanguage();
  const [activeTab, setActiveTab] = useState<'incoming' | 'my_listings' | 'completed'>('incoming');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const incomingProposals = proposals.filter((p) => p.status === 'pending');
  const completedProposals = proposals.filter((p) => p.status === 'completed');
  const userListings = listings.filter((l) => l.isUserListing);

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="my-trades-dialog"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{t('myTrades')}</h3>
              <p className="text-xs text-slate-400">{t('tradeMarketDesc')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-2.5 font-bold transition-colors relative ${
              activeTab === 'incoming' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tabTrades')} ({incomingProposals.length})
            {activeTab === 'incoming' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('my_listings')}
            className={`pb-2.5 font-bold transition-colors relative ${
              activeTab === 'my_listings' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('myListings')} ({userListings.length})
            {activeTab === 'my_listings' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2.5 font-bold transition-colors relative ${
              activeTab === 'completed' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('statusCompleted')} ({completedProposals.length})
            {activeTab === 'completed' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Tab 1: Incoming Proposals */}
          {activeTab === 'incoming' && (
            <div className="space-y-3">
              {incomingProposals.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">
                    {t('noIncomingTradesTitle')}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {t('noIncomingTradesDesc')}
                  </p>
                </div>
              ) : (
                incomingProposals.map((prop) => {
                  const offerCard = CARD_MAP.get(prop.offerCardId); // What partner gives
                  const wantCard = CARD_MAP.get(prop.wantCardId); // What partner wants from user
                  if (!offerCard || !wantCard) return null;

                  const rarity = RARITY_INFO[offerCard.rarity] || RARITY_INFO['1D'];
                  const userOwnsWantCard = (userCollection[wantCard.id]?.count || 0) > 0;
                  const isAutoMatch = prop.message && (prop.message.includes('即时匹配') || prop.message.includes('撮合') || prop.message.includes('扫描'));

                  return (
                    <div
                      key={prop.id}
                      className={`p-4 rounded-xl border space-y-3 transition-all ${
                        isAutoMatch
                          ? 'bg-gradient-to-b from-amber-950/15 via-slate-950 to-slate-950 border-amber-500/30 shadow-sm'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{prop.fromTrainerName}</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({prop.fromFriendCode})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(prop.id, prop.fromFriendCode)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                            title={t('copyFriendCode')}
                          >
                            {copiedCodeId === prop.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isAutoMatch && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> {t('autoMatchedNotice')}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rarity.bgBadge}`}>
                            {rarity.label} · {getRarityName(offerCard.rarity)}
                          </span>
                        </div>
                      </div>

                      {/* Swap cards preview */}
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                        {/* You give */}
                        <div className="flex items-center gap-2">
                          <img
                            src={getCardImageUrl(wantCard, 'low')}
                            alt={getCardName(wantCard)}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-contain"
                          />
                          <div>
                            <span className="text-[10px] text-rose-400 block font-semibold">{t('youGive')}</span>
                            <p className="font-bold text-slate-200">{getCardName(wantCard)}</p>
                            <span className="text-[10px] text-slate-400">{getPackName(wantCard.pack)}</span>
                          </div>
                        </div>

                        <ArrowRightLeft className="w-4 h-4 text-slate-500" />

                        {/* You get */}
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <span className="text-[10px] text-emerald-400 block font-semibold">{t('youReceive')}</span>
                            <p className="font-bold text-slate-200">{getCardName(offerCard)}</p>
                            <span className="text-[10px] text-slate-400">{getPackName(offerCard.pack)}</span>
                          </div>
                          <img
                            src={getCardImageUrl(offerCard, 'low')}
                            alt={getCardName(offerCard)}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-contain"
                          />
                        </div>
                      </div>

                      {prop.message && (
                        <p className="text-xs text-sky-200/80 bg-sky-950/30 border border-sky-900/30 p-2.5 rounded-lg leading-relaxed">
                          💬 {prop.message}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(prop.id, prop.fromFriendCode)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 border border-slate-800"
                        >
                          {copiedCodeId === prop.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">{t('copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t('copyFriendCode')}</span>
                            </>
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onDeclineProposal(prop.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            id={`accept-proposal-${prop.id}`}
                            onClick={() => onAcceptProposal(prop)}
                            disabled={!userOwnsWantCard}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {t('executeTrade')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: My Listings */}
          {activeTab === 'my_listings' && (
            <div className="space-y-3">
              {userListings.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {t('postTrade')}
                </div>
              ) : (
                userListings.map((listing) => {
                  const offerCard = CARD_MAP.get(listing.offerCardId);
                  const wantCard = CARD_MAP.get(listing.wantCardId);
                  if (!offerCard || !wantCard) return null;

                  return (
                    <div
                      key={listing.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={getCardImageUrl(offerCard, 'low')}
                            alt={getCardName(offerCard)}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-contain"
                          />
                          <div>
                            <span className="text-[10px] text-amber-400 block font-semibold">{t('youGive')}</span>
                            <span className="font-bold text-slate-200">{getCardName(offerCard)}</span>
                          </div>
                        </div>

                        <ArrowRightLeft className="w-4 h-4 text-slate-500" />

                        <div className="flex items-center gap-2">
                          <div>
                            <span className="text-[10px] text-sky-400 block font-semibold">{t('youReceive')}</span>
                            <span className="font-bold text-slate-200">{getCardName(wantCard)}</span>
                          </div>
                          <img
                            src={getCardImageUrl(wantCard, 'low')}
                            alt={getCardName(wantCard)}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-contain"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteListing(listing.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Completed Trades */}
          {activeTab === 'completed' && (
            <div className="space-y-3">
              {completedProposals.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {t('statusCompleted')} (0)
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      {t('retainedCodesNotice')}
                    </span>
                    <span className="text-[11px] text-emerald-400/70 font-mono">
                      {t('totalRecordsCount', { count: completedProposals.length })}
                    </span>
                  </div>

                  {completedProposals.map((prop) => {
                    const offerCard = CARD_MAP.get(prop.offerCardId);
                    const wantCard = CARD_MAP.get(prop.wantCardId);
                    const partnerFriendCode = prop.fromFriendCode || prop.toFriendCode || '';
                    const partnerName = prop.fromTrainerName || t('partnerDefaultName');

                    return (
                      <div
                        key={prop.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition-colors space-y-3 text-xs"
                      >
                        {/* Header: Partner Name and Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                              {partnerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{partnerName}</p>
                              <span className="text-[10px] text-slate-500">
                                {t('exchangeCompletedDate', { date: new Date(prop.createdAt).toLocaleDateString() })}
                              </span>
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('statusCompleted')}
                          </div>
                        </div>

                        {/* Cards Exchanged */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                          {/* You gave */}
                          <div className="flex items-center gap-2">
                            {wantCard && (
                              <img
                                src={getCardImageUrl(wantCard, 'low')}
                                alt={getCardName(wantCard)}
                                referrerPolicy="no-referrer"
                                className="w-9 h-12 object-contain"
                              />
                            )}
                            <div>
                              <span className="text-[10px] text-rose-400 block font-semibold">{t('youGive')}</span>
                              <p className="font-bold text-slate-200">
                                {wantCard ? getCardName(wantCard) : 'Card'}
                              </p>
                              {wantCard && (
                                <span className="text-[9px] text-slate-400 font-mono">#{wantCard.cardNumber}</span>
                              )}
                            </div>
                          </div>

                          <ArrowRightLeft className="w-4 h-4 text-emerald-400/60" />

                          {/* You received */}
                          <div className="flex items-center gap-2 text-right">
                            <div>
                              <span className="text-[10px] text-emerald-400 block font-semibold">{t('youReceive')}</span>
                              <p className="font-bold text-slate-200">
                                {offerCard ? getCardName(offerCard) : 'Card'}
                              </p>
                              {offerCard && (
                                <span className="text-[9px] text-slate-400 font-mono">#{offerCard.cardNumber}</span>
                              )}
                            </div>
                            {offerCard && (
                              <img
                                src={getCardImageUrl(offerCard, 'low')}
                                alt={getCardName(offerCard)}
                                referrerPolicy="no-referrer"
                                className="w-9 h-12 object-contain"
                              />
                            )}
                          </div>
                        </div>

                        {/* Partner Friend Code Box with Copy Button */}
                        {partnerFriendCode && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/30">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">{t('partnerFriendCodeLabel')}</span>
                              <span className="font-mono font-bold text-sky-400 tracking-wider">
                                {partnerFriendCode}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyCode(prop.id, partnerFriendCode)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-mono text-[11px] flex items-center gap-1 border border-slate-700/60 transition-colors"
                            >
                              {copiedCodeId === prop.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">{t('copied')}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{t('copyFriendCode')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
