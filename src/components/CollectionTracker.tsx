import React, { useState, useMemo } from 'react';
import { PokemonCard, UserCardStatus, PackExpansion, Rarity, EnergyType, TrainerCategory, TrainerProfile } from '../types';
import {
  CARDS_DATABASE,
  PACK_INFO,
  RARITY_INFO,
  POKEMON_ENERGY_TYPES,
  ENERGY_INFO,
  ENERGY_ICONS,
  TRAINER_CATEGORY_INFO,
} from '../data/cardsData';
import { CardItem } from './CardItem';
import { RarityBadge } from './RarityBadge';
import { PackExpansionLogo } from './PackExpansionLogo';
import {
  Search,
  Heart,
  ArrowRightLeft,
  Layers,
  RefreshCw,
  Trophy,
  LayoutGrid,
  ChevronsUpDown,
  ChevronsDownUp,
  FolderTree,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  X,
  Cloud,
  Sparkles,
  Share2,
  Crown,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CollectionRatingModal } from './CollectionRatingModal';
import { calculateCollectionRating } from '../utils/collectionRating';

interface CollectionTrackerProps {
  userCollection: Record<string, UserCardStatus>;
  onUpdateCount: (cardId: string, delta: number) => void;
  onToggleWishlist: (cardId: string) => void;
  onToggleForTrade: (cardId: string) => void;
  onInspectCard: (card: PokemonCard) => void;
  onExportImport?: () => void;
  onOpenScanner?: () => void;
  onOpenCloudSync?: () => void;
  onResetDemo: () => void;
  initialPackFilter?: string;
  trainerProfile?: TrainerProfile;
  onOpenRating?: () => void;
}

export const CollectionTracker: React.FC<CollectionTrackerProps> = ({
  userCollection,
  onUpdateCount,
  onToggleWishlist,
  onToggleForTrade,
  onInspectCard,
  onExportImport,
  onOpenScanner,
  onOpenCloudSync,
  onResetDemo,
  initialPackFilter,
  trainerProfile,
  onOpenRating,
}) => {
  const {
    currentLanguage,
    t,
    getCardName,
    getPackName,
    getRarityName,
    getEnergyName,
    getTrainerCategoryName,
  } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('ALL');
  const [selectedTrainerCategory, setSelectedTrainerCategory] = useState<string>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'missing' | 'duplicate' | 'wishlist'>('all');
  const [viewMode, setViewMode] = useState<'branch' | 'grid'>('branch');
  const [expandedPacks, setExpandedPacks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (initialPackFilter && initialPackFilter !== 'ALL') {
      initial[initialPackFilter] = true;
    } else {
      initial['A1'] = true;
    }
    return initial;
  });

  // Calculate card counts per pack
  const packCardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CARDS_DATABASE.forEach((c) => {
      counts[c.pack] = (counts[c.pack] || 0) + 1;
    });
    return counts;
  }, []);

  const displayedPacks = useMemo(() => {
    return Object.keys(PACK_INFO) as PackExpansion[];
  }, []);

  // Toggle individual pack branch open/close
  const togglePackExpanded = (packKey: string) => {
    setExpandedPacks((prev) => ({
      ...prev,
      [packKey]: !prev[packKey],
    }));
  };

  // Expand all displayed packs
  const expandAllPacks = () => {
    const next: Record<string, boolean> = {};
    displayedPacks.forEach((pk) => {
      next[pk] = true;
    });
    setExpandedPacks(next);
  };

  // Collapse all displayed packs
  const collapseAllPacks = () => {
    setExpandedPacks({});
  };

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCards = CARDS_DATABASE.length;
    let ownedCount = 0;
    let duplicateCount = 0;
    let wishlistCount = 0;

    CARDS_DATABASE.forEach((card) => {
      const status = userCollection[card.id];
      if (status && status.count > 0) {
        ownedCount++;
        if (status.count >= 2 || status.forTradeCount > 0) {
          duplicateCount++;
        }
      }
      if (status && status.inWishlist) {
        wishlistCount++;
      }
    });

    const completionRate = totalCards > 0 ? Math.round((ownedCount / totalCards) * 1000) / 10 : 0;

    return {
      totalCards,
      ownedCount,
      missingCount: totalCards - ownedCount,
      duplicateCount,
      wishlistCount,
      completionRate,
    };
  }, [userCollection]);

  // Rating State and Calculation
  const [internalShowRatingModal, setInternalShowRatingModal] = useState(false);

  const fallbackProfile: TrainerProfile = trainerProfile || {
    name: '训练家',
    friendCode: '0000-0000-0000-0000',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    bio: '',
    completedTrades: 0,
  };

  const rating = useMemo(() => {
    return calculateCollectionRating(userCollection, currentLanguage);
  }, [userCollection, currentLanguage]);

  const handleOpenRating = () => {
    if (onOpenRating) {
      onOpenRating();
    } else {
      setInternalShowRatingModal(true);
    }
  };

  // Per-pack statistics (Total cards, owned count, percentage completion)
  const packStats = useMemo(() => {
    const map: Record<string, { total: number; owned: number; percent: number }> = {};
    (Object.keys(PACK_INFO) as PackExpansion[]).forEach((pk) => {
      const packCards = CARDS_DATABASE.filter((c) => c.pack === pk);
      const total = packCards.length;
      let owned = 0;
      packCards.forEach((c) => {
        if (userCollection[c.id]?.count > 0) {
          owned++;
        }
      });
      const percent = total > 0 ? Math.round((owned / total) * 1000) / 10 : 0;
      map[pk] = { total, owned, percent };
    });
    return map;
  }, [userCollection]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return CARDS_DATABASE.filter((card) => {
      // 1. Rarity filter
      if (selectedRarity !== 'ALL' && card.rarity !== selectedRarity) {
        return false;
      }

      // 2. Ownership filter
      const userStatus = userCollection[card.id];
      const count = userStatus?.count || 0;
      const isWishlist = !!userStatus?.inWishlist;

      if (ownershipFilter === 'owned' && count === 0) return false;
      if (ownershipFilter === 'missing' && count > 0) return false;
      if (ownershipFilter === 'duplicate' && count < 2 && (!userStatus || userStatus.forTradeCount <= 0)) return false;
      if (ownershipFilter === 'wishlist' && !isWishlist) return false;

      // 3. Pokémon Energy filter (excludes trainers)
      if (selectedEnergy !== 'ALL') {
        if (card.supertype === 'Trainer' || card.type === 'trainer' || card.type !== selectedEnergy) {
          return false;
        }
      }

      // 4. Trainer category filter (trainer cards only)
      if (selectedTrainerCategory !== 'ALL') {
        if (card.supertype !== 'Trainer' && card.type !== 'trainer') {
          return false;
        }
        if (card.trainerCategory !== selectedTrainerCategory) {
          return false;
        }
      }

      // 5. Search query - supports multi-lingual names & attacks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const currentName = getCardName(card).toLowerCase();
        const matchesCurrentName = currentName.includes(q);
        const matchesNameCn = card.nameCn?.toLowerCase().includes(q);
        const matchesNameEn = card.nameEn?.toLowerCase().includes(q);
        const matchesCardNumber = card.cardNumber?.includes(q);
        const matchesId = card.id?.toLowerCase().includes(q);
        const matchesAttack = card.attacks?.some((a) => a.name.toLowerCase().includes(q));

        return (
          matchesCurrentName ||
          matchesNameCn ||
          matchesNameEn ||
          matchesCardNumber ||
          matchesId ||
          matchesAttack
        );
      }

      return true;
    });
  }, [
    userCollection,
    selectedRarity,
    selectedEnergy,
    selectedTrainerCategory,
    ownershipFilter,
    searchQuery,
    currentLanguage,
    getCardName,
  ]);

  const isFilteringActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedRarity !== 'ALL' ||
      selectedEnergy !== 'ALL' ||
      selectedTrainerCategory !== 'ALL' ||
      ownershipFilter !== 'all'
    );
  }, [searchQuery, selectedRarity, selectedEnergy, selectedTrainerCategory, ownershipFilter]);

  // Group filtered cards by pack expansion
  const cardsByPack = useMemo(() => {
    const map: Record<string, PokemonCard[]> = {};
    displayedPacks.forEach((pk) => {
      map[pk] = [];
    });
    filteredCards.forEach((card) => {
      if (map[card.pack]) {
        map[card.pack].push(card);
      }
    });
    return map;
  }, [displayedPacks, filteredCards]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner & Stats Overview */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t('appTitle')} · {t('tabCollection')}</span>
            </div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2 whitespace-nowrap">
              <span>{t('tabCollection')}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('collectionDesc')}
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenCloudSync && (
              <button
                id="btn-cloud-sync"
                onClick={onOpenCloudSync}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                title={t('cloudSync')}
              >
                <Cloud className="w-3.5 h-3.5 text-sky-200" />
                <span>{t('cloudSync')}</span>
              </button>
            )}

            <button
              id="btn-open-collection-rating"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenRating();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              title={t('passport')}
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>
                {t('passport')}: {rating.collectorIndex}/100 · {rating.tierLabel}
              </span>
            </button>

            <button
              onClick={onResetDemo}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              title="Reset Demo Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Stats Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Total Completion */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">{t('completionRate')}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-sky-400">
                {stats.completionRate}%
              </span>
              <span className="text-xs text-slate-500">
                ({stats.ownedCount}/{stats.totalCards})
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Missing Cards */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">{t('filterMissing')}</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-amber-400">
                {stats.missingCount}
              </span>
              <span className="text-xs text-slate-500">/ {stats.totalCards}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{t('optimalPackBadge')}</span>
          </div>

          {/* Duplicates for Trade */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
              {t('duplicatesForTrade')}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {stats.duplicateCount}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1">{t('matchMutualBadge')}</span>
          </div>

          {/* Wishlist */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
              {t('inWishlist')}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-rose-400">
                {stats.wishlistCount}
              </span>
            </div>
            <span className="text-[10px] text-rose-400/80 mt-1">{t('onlyMyWishlist')}</span>
          </div>
        </div>

        {/* Collection Passport & Rating Showcase Banner */}
        <div
          id="collection-rating-banner"
          onClick={handleOpenRating}
          className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-950 border border-amber-500/30 hover:border-amber-400/60 shadow-lg cursor-pointer transition-all hover:scale-[1.006] group flex flex-col sm:flex-row items-center justify-between gap-3.5 mt-3"
        >
          <div className="flex items-center gap-3.5 text-center sm:text-left w-full sm:w-auto">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rating.tierBadgeColor} p-1 flex flex-col items-center justify-center text-slate-950 font-black shadow-md shrink-0`}
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span className="text-xs font-black leading-none uppercase">{rating.tierKey}</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="text-sm font-black text-amber-300">
                  {t('collectorIndex')}: {rating.collectorIndex}/100
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  {rating.tierLabel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('completionRateShort')}: <strong className="text-amber-400 font-mono">{rating.completionPercent}%</strong> ({rating.totalUniqueOwned}/{rating.totalCardsInDb})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {rating.tierDescription} {t('passportBannerCta')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-rating-showcase"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRating();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-transform group-hover:scale-105 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t('passportButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Image-Centric Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3.5">
        {/* Row 1: Search Input & Reset Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              id="search-cards-input"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                title="清除搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isFilteringActive && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedRarity('ALL');
                setSelectedEnergy('ALL');
                setSelectedTrainerCategory('ALL');
                setOwnershipFilter('all');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 border border-slate-700/80"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('resetFilters')}</span>
            </button>
          )}
        </div>

        {/* Row 2: 收集状态 (已拥有 / 未拥有) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 text-xs font-semibold shrink-0 min-w-[56px]">
            {t('ownership')}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setOwnershipFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                ownershipFilter === 'all'
                  ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {t('allStatus')} ({CARDS_DATABASE.length})
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('owned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                ownershipFilter === 'owned'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('statusOwned')}</span>
              <span className="text-[11px] font-mono opacity-80">({stats.ownedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('missing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                ownershipFilter === 'missing'
                  ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-950/50'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('statusMissing')}</span>
              <span className="text-[11px] font-mono opacity-80">({stats.missingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('duplicate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                ownershipFilter === 'duplicate'
                  ? 'bg-teal-600 text-white font-bold shadow-sm shadow-teal-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3 text-teal-400" />
              <span>{t('filterDuplicates')}</span>
              <span className="text-[11px] font-mono opacity-80">({stats.duplicateCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnershipFilter('wishlist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                ownershipFilter === 'wishlist'
                  ? 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
              <span>{t('filterWishlist')}</span>
              <span className="text-[11px] font-mono opacity-80">({stats.wishlistCount})</span>
            </button>
          </div>
        </div>

        {/* Row 3: 宝可梦 (全部属性改名宝可梦，并把训练家移除，尽量用图片/图标) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 text-xs font-semibold shrink-0 min-w-[56px] flex items-center gap-1">
            <span>{t('pokemonLabel')}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedEnergy('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedEnergy === 'ALL'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {t('allTypes')}
            </button>
            {POKEMON_ENERGY_TYPES.map((eKey) => {
              const e = ENERGY_INFO[eKey];
              const isSelected = selectedEnergy === eKey;
              const icon = ENERGY_ICONS[eKey];
              return (
                <button
                  key={eKey}
                  type="button"
                  onClick={() => {
                    setSelectedEnergy(isSelected ? 'ALL' : eKey);
                    if (!isSelected) {
                      setSelectedTrainerCategory('ALL');
                    }
                  }}
                  title={getEnergyName(eKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? `${e.bg} ${e.color} font-bold border-sky-400 ring-1 ring-sky-400/40 shadow-sm`
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-sm leading-none">{icon}</span>
                  <span>{getEnergyName(eKey).replace(/属性|タイプ|Type/g, '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: 训练家卡 (包含支持者/训练家、物品、宝可梦道具/装备、竞技场/场地，以官方名称为主) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 text-xs font-semibold shrink-0 min-w-[56px] flex items-center gap-1">
            <span>{t('trainersLabel')}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTrainerCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTrainerCategory === 'ALL'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {t('allCardsFilter')}
            </button>

            {(['supporter', 'item', 'tool', 'stadium'] as TrainerCategory[]).map((catKey) => {
              const cat = TRAINER_CATEGORY_INFO[catKey];
              const isSelected = selectedTrainerCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    setSelectedTrainerCategory(isSelected ? 'ALL' : catKey);
                    if (!isSelected) {
                      setSelectedEnergy('ALL');
                    }
                  }}
                  title={getTrainerCategoryName(catKey)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? `${cat.bgBadge} ring-1 ring-sky-400/40 shadow-sm font-bold`
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  <span>{getTrainerCategoryName(catKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 5: 稀有度 (图片为主，增加一彩星以及二彩星) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 text-xs font-semibold shrink-0 min-w-[56px]">
            {t('rarityLabel')}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedRarity('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedRarity === 'ALL'
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {t('allRarities')}
            </button>

            {(['1D', '2D', '3D', '4D', '1S', '2S', '3S', '1RS', '2RS', 'CR'] as Rarity[]).map((rKey) => {
              const isSelected = selectedRarity === rKey;
              const r = RARITY_INFO[rKey];
              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => setSelectedRarity(isSelected ? 'ALL' : rKey)}
                  title={getRarityName(rKey)}
                  className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-center min-h-[32px] ${
                    isSelected
                      ? `${r.bgBadge} ring-2 ring-sky-400 shadow-md shadow-sky-950/50`
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <RarityBadge rarity={rKey} size="md" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards View Header & Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              {t('showingCards', { count: filteredCards.length })}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">
              {displayedPacks.length} 个卡包分类
            </span>
          </div>

          {/* View controls & Batch Expand/Collapse */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {viewMode === 'branch' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={expandAllPacks}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors font-medium"
                  title="展开所有卡包分支"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>全部展开</span>
                </button>
                <div className="w-px h-3 bg-slate-800" />
                <button
                  type="button"
                  onClick={collapseAllPacks}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors font-medium"
                  title="折叠所有卡包分支"
                >
                  <ChevronsDownUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>全部折叠</span>
                </button>
              </div>
            )}

            {/* View Mode Switch */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('branch')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  viewMode === 'branch'
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="折叠分支视图 (按卡包分类折叠)"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>折叠分支</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="平铺网格视图"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>平铺全网格</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Search className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">{t('showingCards', { count: 0 })}</p>
            <p className="text-xs text-slate-500">没有找到符合当前筛选条件的卡牌，请尝试清除搜索词或重置筛选</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRarity('ALL');
                setSelectedEnergy('ALL');
                setSelectedTrainerCategory('ALL');
                setOwnershipFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              {t('resetFilters')}
            </button>
          </div>
        ) : viewMode === 'branch' ? (
          /* ========================================================================= */
          /* Collapsible Pack Branches (折叠分支系统，完美契合用户需求与原图交互)        */
          /* ========================================================================= */
          <div className="space-y-3">
            {displayedPacks.map((packKey) => {
              const pack = PACK_INFO[packKey];
              const packCards = cardsByPack[packKey] || [];
              const pStats = packStats[packKey] || { total: 0, owned: 0, percent: 0 };
              const isExpanded = !!expandedPacks[packKey];
              const hasZeroMatches = isFilteringActive && packCards.length === 0;

              return (
                <div
                  key={packKey}
                  id={`pack-branch-${packKey}`}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-slate-700/90 bg-slate-900/90 shadow-lg shadow-black/40'
                      : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/50 hover:border-slate-700/60'
                  } ${hasZeroMatches ? 'opacity-50' : ''}`}
                >
                  {/* Branch Header Bar */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => togglePackExpanded(packKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePackExpanded(packKey);
                      }
                    }}
                    className={`w-full p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none transition-colors border-b ${
                      isExpanded
                        ? 'bg-slate-800/60 border-slate-700/70 text-white'
                        : 'bg-transparent border-transparent text-slate-300'
                    }`}
                  >
                    {/* Left: Official Pack Expansion Logo + Code Badge + Pack Name + Card Counts */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="shrink-0 flex items-center justify-center p-1.5 rounded-xl bg-slate-950/70 border border-slate-800/90 shadow-sm min-w-[56px]">
                        <PackExpansionLogo
                          packKey={packKey}
                          lang={currentLanguage}
                          className="h-8 sm:h-10 w-auto max-w-[120px] sm:max-w-[160px] object-contain drop-shadow"
                          altText={packKey}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black font-mono bg-slate-950 border border-slate-700 text-sky-300">
                            {packKey}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                            {getPackName(packKey)}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>
                            共 <strong className="text-slate-300 font-mono">{pStats.total}</strong> 张卡牌
                          </span>
                          {isFilteringActive && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[11px] font-mono ${
                                packCards.length > 0
                                  ? 'bg-sky-500/20 text-sky-300 font-semibold'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {packCards.length > 0 ? `匹配 ${packCards.length} 张` : '无匹配'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Completion Progress & Expand/Collapse Chevron */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-2">
                      {/* Progress bar and counter */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 text-[11px] hidden sm:inline">{t('filterOwned')}:</span>
                          <span className="font-semibold text-slate-200 font-mono">
                            {pStats.owned}/{pStats.total}
                          </span>
                          <span className="font-mono text-sky-400 font-bold text-xs sm:text-sm">
                            ({pStats.percent}%)
                          </span>
                        </div>
                        <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${pStats.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Chevron toggle icon */}
                      <div
                        className={`w-8 h-8 rounded-xl bg-slate-900 border flex items-center justify-center transition-transform duration-200 ${
                          isExpanded
                            ? 'rotate-180 text-sky-400 border-sky-500/40 bg-sky-500/10'
                            : 'text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Cards Grid */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-5 bg-slate-950/40 space-y-3 animate-fade-in">
                      {packCards.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50">
                          当前筛选条件下此卡包无匹配卡牌
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
                          {packCards.map((card) => (
                            <CardItem
                              key={card.id}
                              card={card}
                              status={userCollection[card.id]}
                              onUpdateCount={onUpdateCount}
                              onToggleWishlist={onToggleWishlist}
                              onToggleForTrade={onToggleForTrade}
                              onInspect={onInspectCard}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Grid Mode */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                status={userCollection[card.id]}
                onUpdateCount={onUpdateCount}
                onToggleWishlist={onToggleWishlist}
                onToggleForTrade={onToggleForTrade}
                onInspect={onInspectCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Collection Rating Modal (Fallback if not handled by parent) */}
      {internalShowRatingModal && !onOpenRating && (
        <CollectionRatingModal
          userCollection={userCollection}
          trainerProfile={fallbackProfile}
          onClose={() => setInternalShowRatingModal(false)}
          onInspectCard={onInspectCard}
        />
      )}
    </div>
  );
};
