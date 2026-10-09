import React, { useState, useMemo, useEffect } from 'react';
import { UserCardStatus, TrainerProfile, TradeListing, Rarity, PackExpansion, PokemonCard } from '../types';
import { CARDS_DATABASE, RARITY_INFO, PACK_INFO } from '../data/cardsData';
import {
  X,
  ArrowRightLeft,
  AlertCircle,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Layers,
  Heart,
  Plus,
  Trash2,
  Globe2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isCardTradeable } from '../utils/tradeRules';
import { RarityBadge } from './RarityBadge';
import { PackExpansionLogo } from './PackExpansionLogo';

interface CreateTradeModalProps {
  initialOfferCardId?: string;
  initialOfferCardIds?: string[];
  initialWantCardIds?: string[];
  initialRarity?: Rarity;
  userCollection: Record<string, UserCardStatus>;
  trainerProfile: TrainerProfile;
  onClose: () => void;
  onSubmit: (listing: TradeListing) => void;
  zIndex?: number;
}

// Tradeable rarities in PTCG Pocket (including Crown Rare)
const TRADEABLE_RARITIES: Rarity[] = ['1D', '2D', '3D', '4D', '1S', '2S', '1RS', '2RS', 'CR'];

export const CreateTradeModal: React.FC<CreateTradeModalProps> = ({
  initialOfferCardId,
  initialOfferCardIds,
  initialWantCardIds,
  initialRarity,
  userCollection,
  trainerProfile,
  onClose,
  onSubmit,
  zIndex,
}) => {
  const { currentLanguage, t, getCardName, getCardImageUrl, getRarityName, getPackName } =
    useLanguage();

  // Find initial card if provided
  const initialCard = useMemo(() => {
    if (!initialOfferCardId) return null;
    const c = CARDS_DATABASE.find((card) => card.id === initialOfferCardId);
    return c && isCardTradeable(c) ? c : null;
  }, [initialOfferCardId]);

  // Step 1: 锁死稀有度 (Locked Rarity Tier)
  const [selectedRarity, setSelectedRarity] = useState<Rarity>(() => {
    if (initialRarity) return initialRarity;
    if (initialCard) return initialCard.rarity;
    return '4D';
  });

  // Active picking tab: 'want' (想要的卡牌) vs 'offer' (可交换的卡牌)
  const [activeTab, setActiveTab] = useState<'want' | 'offer'>('want');

  // Multi-select state: array of card IDs for each side
  const [wantCardIds, setWantCardIds] = useState<string[]>(initialWantCardIds || []);
  const [offerCardIds, setOfferCardIds] = useState<string[]>(() => {
    if (initialOfferCardIds && initialOfferCardIds.length > 0) return initialOfferCardIds;
    return initialCard ? [initialCard.id] : [];
  });

  // Friend code input - strictly 16 digits formatted as 0000-0000-0000-0000
  const [friendCode, setFriendCode] = useState<string>(() => {
    let rawCode = (trainerProfile.friendCode || '').replace(/\D/g, '');
    if (!rawCode) {
      try {
        const stored = localStorage.getItem('ptcg_trainer_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          rawCode = (parsed.friendCode || '').replace(/\D/g, '');
        }
      } catch (e) {
        // ignore
      }
    }
    const raw = rawCode.slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.slice(i, i + 4));
    }
    return parts.join('-');
  });
  const [trainerName, setTrainerName] = useState<string>(() => {
    if (trainerProfile.name && trainerProfile.name !== 'Trainer') return trainerProfile.name;
    try {
      const stored = localStorage.getItem('ptcg_trainer_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) return parsed.name;
      }
    } catch (e) {
      // ignore
    }
    return trainerProfile.name || 'Trainer';
  });
  const [note, setNote] = useState<string>('');

  // Search query for cards
  const [searchQuery, setSearchQuery] = useState('');
  // Filter only owned cards on offer tab
  const [onlyShowOwnedOffers, setOnlyShowOwnedOffers] = useState(false);

  // Expanded state for pack branches
  const [expandedPacks, setExpandedPacks] = useState<Record<string, boolean>>({});

  // When rarity changes: clear selections of other rarities and expand first available pack
  const handleSelectRarity = (rarity: Rarity) => {
    if (rarity === selectedRarity) return;
    setSelectedRarity(rarity);
    setWantCardIds([]);
    setOfferCardIds([]);
    setExpandedPacks({});
  };

  // Foolproof Friend Code formatting (Numbers only)
  const handleFriendCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    setFriendCode(parts.join('-'));
  };

  const rawDigits = friendCode.replace(/\D/g, '');
  const isFriendCodeComplete = rawDigits.length === 16;

  // All cards matching the selected locked rarity (strictly tradeable only)
  const cardsOfSelectedRarity = useMemo(() => {
    return CARDS_DATABASE.filter((card) => {
      // Must match locked rarity strictly
      if (card.rarity !== selectedRarity) return false;
      // Must be tradeable (Promo-A and 3S excluded)
      if (!isCardTradeable(card)) return false;

      // Filter by search query if present
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const curName = getCardName(card).toLowerCase();
        const cnName = card.nameCn?.toLowerCase() || '';
        const enName = card.nameEn?.toLowerCase() || '';
        const num = card.cardNumber?.toLowerCase() || '';
        if (!curName.includes(q) && !cnName.includes(q) && !enName.includes(q) && !num.includes(q)) {
          return false;
        }
      }

      // If in offer mode and user wants to only see owned cards
      if (activeTab === 'offer' && onlyShowOwnedOffers) {
        const status = userCollection[card.id];
        if (!status || status.count <= 0) return false;
      }

      return true;
    });
  }, [selectedRarity, searchQuery, activeTab, onlyShowOwnedOffers, userCollection, currentLanguage]);

  // Group cards by pack expansion
  const packGroups = useMemo(() => {
    const groups: { packKey: PackExpansion; cards: PokemonCard[] }[] = [];
    const allPackKeys = Object.keys(PACK_INFO) as PackExpansion[];

    allPackKeys.forEach((pk) => {
      const cardsInPack = cardsOfSelectedRarity.filter((c) => c.pack === pk);
      if (cardsInPack.length > 0) {
        groups.push({ packKey: pk, cards: cardsInPack });
      }
    });

    return groups;
  }, [cardsOfSelectedRarity]);

  // Default: expand all packs when rarity changes or first loaded
  useEffect(() => {
    if (packGroups.length > 0 && Object.keys(expandedPacks).length === 0) {
      const initial: Record<string, boolean> = {};
      packGroups.forEach((g) => {
        initial[g.packKey] = true;
      });
      setExpandedPacks(initial);
    }
  }, [packGroups]);

  // Toggle pack expansion
  const togglePack = (packKey: string) => {
    setExpandedPacks((prev) => ({
      ...prev,
      [packKey]: !prev[packKey],
    }));
  };

  // Expand / collapse all
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    packGroups.forEach((g) => (next[g.packKey] = true));
    setExpandedPacks(next);
  };

  const collapseAll = () => {
    setExpandedPacks({});
  };

  // Toggle card selection in the current tab
  const toggleCardSelection = (cardId: string) => {
    if (activeTab === 'want') {
      setWantCardIds((prev) =>
        prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
      );
    } else {
      setOfferCardIds((prev) =>
        prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
      );
    }
  };

  // Quick remove from chips
  const removeCard = (cardId: string, type: 'want' | 'offer') => {
    if (type === 'want') {
      setWantCardIds((prev) => prev.filter((id) => id !== cardId));
    } else {
      setOfferCardIds((prev) => prev.filter((id) => id !== cardId));
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wantCardIds.length === 0 || offerCardIds.length === 0 || !friendCode.trim()) {
      return;
    }

    const rarityMeta = RARITY_INFO[selectedRarity];

    const newListing: TradeListing = {
      id: `trade-user-${Date.now()}`,
      trainerName: trainerName.trim() || trainerProfile.name || 'Trainer',
      trainerAvatar: trainerProfile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      friendCode: friendCode.trim(),
      offerCardId: offerCardIds[0],
      wantCardId: wantCardIds[0],
      offerCardIds,
      wantCardIds,
      rarity: selectedRarity,
      note: note.trim() || `求: ${wantCardIds.length} 张任选 · 出: ${offerCardIds.length} 张任选`,
      createdAt: Date.now(),
      status: 'active',
      isUserListing: true,
      tags: [
        rarityMeta ? `${rarityMeta.label} ${getRarityName(selectedRarity)}` : 'Trade',
        `${wantCardIds.length}想要`,
        `${offerCardIds.length}可出`,
      ],
    };

    // Save friend code to trainer profile in localStorage
    try {
      const stored = localStorage.getItem('ptcg_trainer_profile');
      const profile = stored ? JSON.parse(stored) : {};
      profile.friendCode = friendCode.trim();
      profile.name = trainerName.trim() || profile.name;
      localStorage.setItem('ptcg_trainer_profile', JSON.stringify(profile));
    } catch (err) {
      // Safe fallback
    }

    onSubmit(newListing);
    onClose();
  };

  const selectedRarityInfo = RARITY_INFO[selectedRarity];

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="create-trade-dialog"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                {t('postTrade')}
                <span className="text-[11px] font-normal text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {t('equalTradeTag')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Globe2 className="w-3 h-3 text-emerald-400" />
                  {t('cloudSharedTag')}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('createTradeSubtitle')}
              </p>
            </div>
          </div>

          <button
            id="close-create-trade"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-trade-form" onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: 好友代码与发布信息（置顶显示） */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  {t('step1FriendCodeTitle')}
                </span>
              </div>
              <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                {t('step1PinnedTip')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Friend Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    {t('myFriendCodeLabel')} <span className="text-amber-400">*</span> {t('digitsOnlyNote')}
                  </label>
                  <span className="text-[11px] text-sky-400 font-mono">{t('digitsCountNote')}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  id="trade-friend-code-input"
                  value={friendCode}
                  onChange={(e) => handleFriendCodeChange(e.target.value)}
                  placeholder="0000-0000-0000-0000"
                  maxLength={19}
                  required
                  className={`w-full bg-slate-900 border rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none transition-colors ${
                    isFriendCodeComplete
                      ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/20'
                      : rawDigits.length > 0
                      ? 'border-amber-500/60 text-amber-300 bg-amber-950/20'
                      : 'border-slate-700 text-sky-300 focus:border-amber-400'
                  }`}
                />
                {/* Foolproof Status feedback */}
                {isFriendCodeComplete ? (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {t('friendCodeValid')}
                  </p>
                ) : rawDigits.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    {t('friendCodeInputPrompt')}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('friendCodeRemaining', { count: 16 - rawDigits.length, current: rawDigits.length })}
                  </p>
                )}
              </div>

              {/* Trainer Nickname */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{t('trainerNicknameLabel')}</label>
                <input
                  type="text"
                  id="trade-trainer-name-input"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder={t('trainerNicknamePlaceholder')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Trade Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{t('tradeNoteOptional')}</label>
              <input
                type="text"
                id="trade-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('tradeNoteInputPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Step 2: 稀有度选择（锁死稀有度） */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  {t('step2RarityTitle')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{t('lockedRarity')}</span>
                <div className="px-2 py-1 rounded-lg bg-slate-900 border border-amber-500/30">
                  <RarityBadge rarity={selectedRarity} size="sm" showLabel={false} />
                </div>
              </div>
            </div>

            {/* Rarity Selector (Official Images Only) */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {TRADEABLE_RARITIES.map((rarityKey) => {
                const isSelected = selectedRarity === rarityKey;
                return (
                  <button
                    key={rarityKey}
                    type="button"
                    onClick={() => handleSelectRarity(rarityKey)}
                    className={`h-11 px-2 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 shadow-md shadow-amber-500/20 scale-[1.03]'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                    title={getRarityName(rarityKey)}
                  >
                    <RarityBadge rarity={rarityKey} size="md" showLabel={false} />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                <Lock className="w-3 h-3 text-rose-400" />
                {t('officialPromoBannedNotice')}
              </span>
            </div>
          </div>

          {/* Step 3: 切换选择想要卡牌 vs 可提供卡牌 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  3
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  {t('step3SelectCardsTitle')}
                </span>
              </div>
            </div>

            {/* Tabs for Want vs Offer */}
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('want')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'want'
                    ? 'bg-gradient-to-r from-rose-500/25 to-pink-500/25 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Heart className={`w-4 h-4 ${activeTab === 'want' ? 'fill-rose-400' : ''}`} />
                <span>{t('myWantedCards')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 font-black">
                  {wantCardIds.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('offer')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'offer'
                    ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{t('myOfferedCards')}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 font-black">
                  {offerCardIds.length}
                </span>
              </button>
            </div>

            {/* Selected Cards Chips Tray */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {activeTab === 'want' ? t('wantedCardsList') : t('offeredCardsList')}{t('multiSelectSupport')}
                </span>
                {(activeTab === 'want' ? wantCardIds.length : offerCardIds.length) > 0 && (
                  <button
                    type="button"
                    onClick={() => (activeTab === 'want' ? setWantCardIds([]) : setOfferCardIds([]))}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> {t('clearList')}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap min-h-[44px]">
                {(activeTab === 'want' ? wantCardIds : offerCardIds).length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">
                    {activeTab === 'want'
                      ? t('noWantSelectedTip')
                      : t('noOfferSelectedTip')}
                  </p>
                ) : (
                  (activeTab === 'want' ? wantCardIds : offerCardIds).map((cId) => {
                    const c = CARDS_DATABASE.find((item) => item.id === cId);
                    if (!c) return null;
                    const userOwns = userCollection[c.id]?.count || 0;
                    return (
                      <div
                        key={c.id}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium animate-fade-in ${
                          activeTab === 'want'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        <div className="w-6 h-8 rounded bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 border border-slate-800">
                          <img
                            src={getCardImageUrl(c, 'low')}
                            alt={getCardName(c)}
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="leading-tight">
                          <span className="font-bold block truncate max-w-[130px]">{getCardName(c)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.expansionCode}-{c.cardNumber} {userOwns > 0 ? `· ${t('ownsCount', { count: userOwns })}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCard(c.id, activeTab)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Filter and Accordion Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={t('searchCardPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'offer' && (
                  <button
                    type="button"
                    onClick={() => setOnlyShowOwnedOffers((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      onlyShowOwnedOffers
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('onlyShowOwned')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  {t('expandAll')}
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:text-white"
                >
                  {t('collapseAll')}
                </button>
              </div>
            </div>

            {/* Pack Branches - Collapsible Accordion (按卡包分类) */}
            <div className="space-y-3">
              {packGroups.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 text-xs text-slate-500">
                  {t('noCardsMatchingRarity')}
                </div>
              ) : (
                packGroups.map(({ packKey, cards }) => {
                  const isExpanded = !!expandedPacks[packKey];
                  const packMeta = PACK_INFO[packKey];

                  // Count how many cards in this pack are selected in current active tab
                  const selectedInThisPack = cards.filter((c) =>
                    activeTab === 'want' ? wantCardIds.includes(c.id) : offerCardIds.includes(c.id)
                  ).length;

                  return (
                    <div
                      key={packKey}
                      className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden transition-all shadow-sm"
                    >
                      {/* Pack Expansion Header (Click to expand/collapse) */}
                      <div
                        onClick={() => togglePack(packKey)}
                        className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PackExpansionLogo
                            packKey={packKey}
                            lang={currentLanguage}
                            className="h-6 sm:h-7 w-auto max-w-[100px] object-contain shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-200 block truncate">
                              {packKey} · {getPackName(packKey)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {t('totalTierCards', { count: cards.length })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {selectedInThisPack > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                activeTab === 'want'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {t('selectedCardsCount', { count: selectedInThisPack })}
                            </span>
                          )}
                          <div className="p-1 rounded-lg text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Cards Grid inside Pack */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 bg-slate-950/40 border-t border-slate-800/60 animate-fade-in">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {cards.map((card) => {
                              const isSelected =
                                activeTab === 'want'
                                  ? wantCardIds.includes(card.id)
                                  : offerCardIds.includes(card.id);

                              const status = userCollection[card.id];
                              const ownedCount = status?.count || 0;
                              const localizedName = getCardName(card);

                              return (
                                <div
                                  key={card.id}
                                  onClick={() => toggleCardSelection(card.id)}
                                  className={`relative group rounded-2xl border p-2 flex flex-col justify-between cursor-pointer transition-all duration-150 select-none ${
                                    isSelected
                                      ? activeTab === 'want'
                                        ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20 scale-[1.02]'
                                        : 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                  }`}
                                >
                                  {/* Selection Checkmark Indicator */}
                                  {isSelected && (
                                    <div
                                      className={`absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center text-slate-950 font-black text-xs ${
                                        activeTab === 'want' ? 'bg-rose-400' : 'bg-emerald-400'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  )}

                                  {/* Top row: Card Code */}
                                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                    <span>
                                      {card.expansionCode}-{card.cardNumber}
                                    </span>
                                    {ownedCount > 0 && (
                                      <span className="text-emerald-400 font-bold">
                                        {t('ownsCount', { count: ownedCount })}
                                      </span>
                                    )}
                                  </div>

                                  {/* Card Artwork */}
                                  <div className="w-full aspect-[63/88] rounded-xl overflow-hidden bg-slate-950/80 flex items-center justify-center border border-slate-800/80 p-0.5">
                                    <img
                                      src={getCardImageUrl(card, 'low')}
                                      alt={localizedName}
                                      loading="lazy"
                                      decoding="async"
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-contain"
                                      onError={(e) => {
                                        const t = e.currentTarget;
                                        const code = card.expansionCode || 'A1';
                                        const num = String(card.cardNumber || card.localId || '001').padStart(3, '0');
                                        const fallbackEn = `https://assets.tcgdex.net/en/tcgp/${code}/${num}/low.webp`;
                                        const limitlessFallback = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`;
                                        if (t.src !== fallbackEn && !t.src.includes(limitlessFallback)) {
                                          t.src = fallbackEn;
                                        } else if (t.src !== limitlessFallback) {
                                          t.src = limitlessFallback;
                                        } else if (card.imageUrl && t.src !== card.imageUrl) {
                                          t.src = card.imageUrl;
                                        }
                                      }}
                                    />
                                  </div>

                                  {/* Card Name */}
                                  <div className="mt-1.5 text-center">
                                    <p className="text-xs font-bold text-slate-200 truncate">
                                      {localizedName}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Sticky Bottom Actions Bar (Always visible regardless of card pack scrolling) */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md shrink-0 shadow-2xl z-30">
          <div className="text-xs text-slate-400">
            {t('selectedCardsCount', { count: '' }).replace('{count}', '').trim()}: <span className="text-rose-400 font-bold">{t('selectedSummaryWant', { count: wantCardIds.length })}</span> /{' '}
            <span className="text-emerald-400 font-bold">{t('selectedSummaryOffer', { count: offerCardIds.length })}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="create-trade-form"
              id="submit-trade-listing-btn"
              disabled={wantCardIds.length === 0 || offerCardIds.length === 0 || !isFriendCodeComplete}
              title={
                !isFriendCodeComplete
                  ? t('fillFriendCodeFirst')
                  : wantCardIds.length === 0
                  ? t('selectAtLeastOneWant')
                  : offerCardIds.length === 0
                  ? t('selectAtLeastOneOffer')
                  : t('submitListingBtn')
              }
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {t('submitListingBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
