import React, { useState, useMemo } from 'react';
import { TradeListing, UserCardStatus, Rarity, PokemonCard } from '../types';
import { CARD_MAP, RARITY_INFO, CARDS_DATABASE } from '../data/cardsData';
import {
  ArrowRightLeft,
  Search,
  Plus,
  Copy,
  Check,
  MessageSquare,
  Clock,
  Heart,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Globe2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isCardTradeable } from '../utils/tradeRules';
import { RarityBadge } from './RarityBadge';

interface TradeMarketProps {
  listings: TradeListing[];
  userCollection: Record<string, UserCardStatus>;
  onOpenCreateModal: () => void;
  onRequestTrade: (listing: TradeListing) => void;
  onAdoptRecommendation?: (rarity: Rarity, offerCardIds: string[], wantCardIds: string[]) => void;
  onRefreshCloud?: () => void;
  isCloudSyncing?: boolean;
  hasCloudTradeTable?: boolean;
  onOpenCloudSync?: () => void;
}

const MARKET_RARITIES: Rarity[] = ['1D', '2D', '3D', '4D', '1S', '2S', '1RS', '2RS', 'CR'];

export const TradeMarket: React.FC<TradeMarketProps> = ({
  listings,
  userCollection,
  onOpenCreateModal,
  onRequestTrade,
  onAdoptRecommendation,
  onRefreshCloud,
  isCloudSyncing = false,
  hasCloudTradeTable = true,
  onOpenCloudSync,
}) => {
  const { currentLanguage, t, getCardName, getCardImageUrl, getRarityName, getPackName } =
    useLanguage();

  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'all' | 'can_trade' | 'my_wishlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // 智能推荐逻辑：把顾客图鉴中拥有 >= 2 张（多余）与 0 张（缺少/心愿单）的同阶卡牌配对
  const smartRecommendations = useMemo(() => {
    const list: {
      rarity: Rarity;
      duplicateCards: PokemonCard[];
      missingCards: PokemonCard[];
    }[] = [];

    for (const r of MARKET_RARITIES) {
      const cardsInRarity = CARDS_DATABASE.filter(
        (c) => c.rarity === r && isCardTradeable(c)
      );

      const duplicateCards = cardsInRarity.filter((c) => {
        const status = userCollection[c.id];
        return (status?.count || 0) >= 2 || (status?.forTradeCount || 0) > 0;
      });

      const missingCards = cardsInRarity.filter((c) => {
        const status = userCollection[c.id];
        return (status?.count || 0) === 0 || !!status?.inWishlist;
      });

      if (duplicateCards.length > 0 && missingCards.length > 0) {
        list.push({
          rarity: r,
          duplicateCards,
          missingCards,
        });
      }
    }
    return list;
  }, [userCollection]);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Helper to extract offer & want cards from listing
  const getListingCards = (item: TradeListing) => {
    const offerCards =
      item.offerCardIds && item.offerCardIds.length > 0
        ? (item.offerCardIds.map((id) => CARD_MAP.get(id)).filter(Boolean) as PokemonCard[])
        : ([CARD_MAP.get(item.offerCardId)].filter(Boolean) as PokemonCard[]);

    const wantCards =
      item.wantCardIds && item.wantCardIds.length > 0
        ? (item.wantCardIds.map((id) => CARD_MAP.get(id)).filter(Boolean) as PokemonCard[])
        : ([CARD_MAP.get(item.wantCardId)].filter(Boolean) as PokemonCard[]);

    const listingRarity = item.rarity || offerCards[0]?.rarity || '1D';

    return { offerCards, wantCards, listingRarity };
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const { offerCards, wantCards, listingRarity } = getListingCards(item);
      if (offerCards.length === 0 || wantCards.length === 0) return false;

      // Rarity filter
      if (selectedRarity !== 'ALL' && listingRarity !== selectedRarity) {
        return false;
      }

      // User collection filters
      const userCanGive = wantCards.some((c) => (userCollection[c.id]?.count || 0) > 0);
      const isInMyWishlist = offerCards.some((c) => !!userCollection[c.id]?.inWishlist);

      if (filterType === 'can_trade' && !userCanGive) return false;
      if (filterType === 'my_wishlist' && !isInMyWishlist) return false;

      // Search query - supports multi-lingual names & friend code
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTrainer = item.trainerName.toLowerCase().includes(q);
        const matchesFriendCode = item.friendCode.includes(q);
        const matchesOffer = offerCards.some(
          (c) =>
            getCardName(c).toLowerCase().includes(q) ||
            c.nameCn?.toLowerCase().includes(q) ||
            c.nameEn?.toLowerCase().includes(q) ||
            c.cardNumber?.toLowerCase().includes(q)
        );
        const matchesWant = wantCards.some(
          (c) =>
            getCardName(c).toLowerCase().includes(q) ||
            c.nameCn?.toLowerCase().includes(q) ||
            c.nameEn?.toLowerCase().includes(q) ||
            c.cardNumber?.toLowerCase().includes(q)
        );

        return matchesTrainer || matchesFriendCode || matchesOffer || matchesWant;
      }

      return true;
    });
  }, [listings, selectedRarity, filterType, searchQuery, userCollection, currentLanguage]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('appTitle')} · {t('tabMarket')}
          </div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            {t('tabMarket')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('tradeMarketSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshCloud && (
            <button
              id="refresh-cloud-trades-btn"
              onClick={onRefreshCloud}
              disabled={isCloudSyncing}
              title={t('refreshCloudTrades')}
              className="px-3.5 py-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('refreshCloudTrades')}</span>
            </button>
          )}

          <button
            id="post-trade-btn"
            onClick={onOpenCreateModal}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('postTrade')}
          </button>
        </div>
      </div>

      {/* Cloud Status Notice if table not created yet */}
      {!hasCloudTradeTable && onOpenCloudSync && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              已接入 Supabase！首次启用全网卡牌交换挂单，请在云端同步中运行最新 SQL 一键开启 <b>trade_listings</b> 公共池。
            </span>
          </div>
          <button
            onClick={onOpenCloudSync}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 transition-colors"
          >
            去开启卡牌交换
          </button>
        </div>
      )}

      {/* Smart Trade Recommendations (基于顾客图鉴多余卡与缺少卡) */}
      {smartRecommendations.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-sky-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span>{t('smartRecommendationsTitle')}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {t('schemesCount').replace('{count}', String(smartRecommendations.length))}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {t('smartRecommendationsSubtitle')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800/80 transition-colors"
            >
              {showRecommendations ? t('collapse') : t('expand')}
            </button>
          </div>

          {showRecommendations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {smartRecommendations.map((rec) => {
                const offerCard = rec.duplicateCards[0];
                const wantCard = rec.missingCards[0];
                if (!offerCard || !wantCard) return null;

                return (
                  <div
                    key={rec.rarity}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 hover:border-amber-500/40 transition-colors"
                  >
                    {/* Left: Offer card preview */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 aspect-[63/88] rounded-md overflow-hidden bg-slate-900 border border-emerald-500/40 shrink-0 p-0.5">
                        <img
                          src={getCardImageUrl(offerCard, 'low')}
                          alt={getCardName(offerCard)}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const t = e.currentTarget;
                            const code = offerCard.expansionCode || 'A1';
                            const num = String(offerCard.cardNumber || offerCard.localId || '001').padStart(3, '0');
                            const fallbackEn = `https://assets.tcgdex.net/en/tcgp/${code}/${num}/low.webp`;
                            const limitless = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`;
                            if (t.src !== fallbackEn && !t.src.includes(limitless)) {
                              t.src = fallbackEn;
                            } else if (t.src !== limitless) {
                              t.src = limitless;
                            } else if (offerCard.imageUrl && t.src !== offerCard.imageUrl) {
                              t.src = offerCard.imageUrl;
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> {t('iHaveDuplicates').replace('{count}', String(userCollection[offerCard.id]?.count || 2))}
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {getCardName(offerCard)}
                        </p>
                        {rec.duplicateCards.length > 1 && (
                          <span className="text-[9px] text-slate-400">
                            {t('duplicateAlternatives').replace('{count}', String(rec.duplicateCards.length))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: official Rarity badge + 1:1 arrow */}
                    <div className="flex flex-col items-center shrink-0 px-1">
                      <div className="p-0.5 rounded bg-slate-900 border border-slate-800">
                        <RarityBadge rarity={rec.rarity} size="xs" showLabel={false} />
                      </div>
                      <ArrowRightLeft className="w-3 h-3 text-amber-400 my-0.5" />
                      <span className="text-[9px] font-mono text-slate-500 font-bold">1:1</span>
                    </div>

                    {/* Right: Want card preview */}
                    <div className="flex items-center gap-2 min-w-0 text-right">
                      <div className="min-w-0">
                        <div className="text-[9px] text-rose-400 font-bold flex items-center justify-end gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-rose-400" /> {t('notInDex')}
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {getCardName(wantCard)}
                        </p>
                        {rec.missingCards.length > 1 && (
                          <span className="text-[9px] text-slate-400">
                            {t('missingInTier').replace('{count}', String(rec.missingCards.length))}
                          </span>
                        )}
                      </div>
                      <div className="w-10 aspect-[63/88] rounded-md overflow-hidden bg-slate-900 border border-rose-500/40 shrink-0 p-0.5">
                        <img
                          src={getCardImageUrl(wantCard, 'low')}
                          alt={getCardName(wantCard)}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const t = e.currentTarget;
                            const code = wantCard.expansionCode || 'A1';
                            const num = String(wantCard.cardNumber || wantCard.localId || '001').padStart(3, '0');
                            const fallbackEn = `https://assets.tcgdex.net/en/tcgp/${code}/${num}/low.webp`;
                            const limitless = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`;
                            if (t.src !== fallbackEn && !t.src.includes(limitless)) {
                              t.src = fallbackEn;
                            } else if (t.src !== limitless) {
                              t.src = limitless;
                            } else if (wantCard.imageUrl && t.src !== wantCard.imageUrl) {
                              t.src = wantCard.imageUrl;
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Adopt Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onAdoptRecommendation) {
                          onAdoptRecommendation(
                            rec.rarity,
                            rec.duplicateCards.slice(0, 3).map((c) => c.id),
                            rec.missingCards.slice(0, 3).map((c) => c.id)
                          );
                        } else {
                          onOpenCreateModal();
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold shrink-0 transition-all flex items-center gap-1 border border-amber-500/30"
                      title={t('adopt')}
                    >
                      <span>{t('adopt')}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Smart Toggles: All vs Can Trade vs In My Wishlist */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-sky-500/20 text-sky-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('allListings')} ({listings.length})
            </button>
            <button
              onClick={() => setFilterType('can_trade')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                filterType === 'can_trade'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('iHaveWhatTheyWant')}
            </button>
            <button
              onClick={() => setFilterType('my_wishlist')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                filterType === 'my_wishlist'
                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              {t('onlyMyWishlist')}
            </button>
          </div>
        </div>

        {/* Rarity filter pills with official images */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 text-[11px] shrink-0 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            {t('rarityLabel')}
          </span>
          <button
            onClick={() => setSelectedRarity('ALL')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
              selectedRarity === 'ALL'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('allRarities')}
          </button>
          {MARKET_RARITIES.map((rKey) => {
            const r = RARITY_INFO[rKey];
            const isSelected = selectedRarity === rKey;
            return (
              <button
                key={rKey}
                onClick={() => setSelectedRarity(rKey)}
                title={getRarityName(rKey)}
                className={`px-3 py-1.5 rounded-lg shrink-0 border flex items-center justify-center transition-all ${
                  isSelected
                    ? `${r.bgBadge} ring-2 ring-amber-400`
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <RarityBadge rarity={rKey} size="sm" showLabel={false} />
              </button>
            );
          })}
          <span
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-300/80 border border-rose-500/20 shrink-0 select-none"
            title={t('officialTradeBanned')}
          >
            <Lock className="w-3 h-3 text-rose-400" />
            {t('officialTradeBanned')}
          </span>
        </div>
      </div>

      {/* Trade Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredListings.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">{t('showingCards', { count: 0 })}</p>
            <p className="text-xs text-slate-500">{t('noListingsFound')}</p>
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              {t('postTrade')}
            </button>
          </div>
        ) : (
          filteredListings.map((listing) => {
            const { offerCards, wantCards, listingRarity } = getListingCards(listing);
            const rInfo = RARITY_INFO[listingRarity] || RARITY_INFO['1D'];

            // User matches
            const userCanOfferAny = wantCards.some((c) => (userCollection[c.id]?.count || 0) > 0);
            const inUserWishlistAny = offerCards.some((c) => !!userCollection[c.id]?.inWishlist);

            return (
              <div
                key={listing.id}
                id={`listing-${listing.id}`}
                className={`relative p-4 rounded-2xl bg-slate-900 border transition-all hover:border-slate-700 space-y-3.5 shadow-lg flex flex-col justify-between ${
                  listing.isUserListing
                    ? 'border-amber-500/40 bg-gradient-to-b from-slate-900 to-amber-950/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Header: Trainer & Friend Code & Rarity */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={listing.trainerAvatar}
                      alt={listing.trainerName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {listing.trainerName}
                        </span>
                        {listing.isUserListing ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {t('myTrades')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            {t('onlineLiveTag')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <span className="truncate">{listing.friendCode}</span>
                        <button
                          onClick={() => handleCopy(listing.id, listing.friendCode)}
                          className="p-1 hover:text-sky-400 text-slate-500 transition-colors shrink-0"
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

                  {/* Rarity & Time Tag - Official Image Only */}
                  <div className="text-right space-y-0.5 shrink-0">
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 shadow-sm">
                      <RarityBadge rarity={listingRarity} size="sm" showLabel={false} />
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {Math.max(1, Math.round((Date.now() - listing.createdAt) / (1000 * 60)))}m
                    </span>
                  </div>
                </div>

                {/* Cards Visual Exchange Layout */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                    {/* Left: Offering Cards */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> {t('offering')}
                          {offerCards.length > 1 && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">
                              {t('chooseAny').replace('{count}', String(offerCards.length))}
                            </span>
                          )}
                        </span>
                        {inUserWishlistAny && (
                          <span className="text-[9px] text-rose-400 flex items-center gap-0.5 font-medium">
                            <Heart className="w-2.5 h-2.5 fill-rose-400" /> {t('wishlistHit')}
                          </span>
                        )}
                      </div>

                      {/* Offered cards gallery */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                        {offerCards.map((card) => {
                          const isWish = !!userCollection[card.id]?.inWishlist;
                          return (
                            <div
                              key={card.id}
                              className="group relative flex-shrink-0 w-12 sm:w-14 text-center"
                              title={`${getCardName(card)} (${getPackName(card.pack)})`}
                            >
                              <div className={`w-full aspect-[63/88] rounded-lg bg-slate-900 border p-0.5 overflow-hidden flex items-center justify-center ${
                                isWish ? 'border-rose-500 ring-1 ring-rose-500/40' : 'border-slate-700'
                              }`}>
                                <img
                                  src={getCardImageUrl(card, 'low')}
                                  alt={getCardName(card)}
                                  referrerPolicy="no-referrer"
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => {
                                    const t = e.currentTarget;
                                    const code = card.expansionCode || 'A1';
                                    const num = String(card.cardNumber || card.localId || '001').padStart(3, '0');
                                    const fallbackEn = `https://assets.tcgdex.net/en/tcgp/${code}/${num}/low.webp`;
                                    const limitless = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`;
                                    if (t.src !== fallbackEn && !t.src.includes(limitless)) {
                                      t.src = fallbackEn;
                                    } else if (t.src !== limitless) {
                                      t.src = limitless;
                                    } else if (card.imageUrl && t.src !== card.imageUrl) {
                                      t.src = card.imageUrl;
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">
                                {getCardName(card)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Swap Indicator */}
                    <div className="shrink-0 flex flex-col items-center px-1">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 font-bold">1:1</span>
                    </div>

                    {/* Right: Seeking Cards */}
                    <div className="space-y-1.5 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-1 flex-row-reverse">
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {t('seeking')}
                          {wantCards.length > 1 && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">
                              {t('pickOneOf').replace('{count}', String(wantCards.length))}
                            </span>
                          )}
                        </span>
                        {userCanOfferAny ? (
                          <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 font-medium">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {t('canFulfill')}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">{t('filterMissing')}</span>
                        )}
                      </div>

                      {/* Wanted cards gallery */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar justify-end">
                        {wantCards.map((card) => {
                          const userCount = userCollection[card.id]?.count || 0;
                          return (
                            <div
                              key={card.id}
                              className="group relative flex-shrink-0 w-12 sm:w-14 text-center"
                              title={`${getCardName(card)} (${getPackName(card.pack)}) - ${t('statusOwned')}: ${userCount}`}
                            >
                              <div className={`w-full aspect-[63/88] rounded-lg bg-slate-900 border p-0.5 overflow-hidden flex items-center justify-center ${
                                userCount > 0 ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-slate-700'
                              }`}>
                                <img
                                  src={getCardImageUrl(card, 'low')}
                                  alt={getCardName(card)}
                                  referrerPolicy="no-referrer"
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => {
                                    const t = e.currentTarget;
                                    const code = card.expansionCode || 'A1';
                                    const num = String(card.cardNumber || card.localId || '001').padStart(3, '0');
                                    const fallbackEn = `https://assets.tcgdex.net/en/tcgp/${code}/${num}/low.webp`;
                                    const limitless = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`;
                                    if (t.src !== fallbackEn && !t.src.includes(limitless)) {
                                      t.src = fallbackEn;
                                    } else if (t.src !== limitless) {
                                      t.src = limitless;
                                    } else if (card.imageUrl && t.src !== card.imageUrl) {
                                      t.src = card.imageUrl;
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">
                                {getCardName(card)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note message */}
                {listing.note && (
                  <div className="text-xs text-slate-400 flex items-start gap-1.5 italic bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                    <span className="truncate">{listing.note}</span>
                  </div>
                )}

                {/* Bottom Action */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {listing.tags?.map((tg, idx) => {
                      const wantMatch = tg.match(/^(\d+)想要$/);
                      const offerMatch = tg.match(/^(\d+)可出$/);
                      const displayTag = wantMatch
                        ? t('wantsTag').replace('{count}', wantMatch[1])
                        : offerMatch
                        ? t('offersTag').replace('{count}', offerMatch[1])
                        : tg;
                      return (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-mono"
                        >
                          #{displayTag}
                        </span>
                      );
                    })}
                  </div>

                  {!listing.isUserListing && (
                    <button
                      onClick={() => onRequestTrade(listing)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                        userCanOfferAny
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {userCanOfferAny ? t('initiateTrade') : t('copyFriendCode')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
