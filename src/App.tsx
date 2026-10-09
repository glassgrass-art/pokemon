/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PokemonCard,
  UserCardStatus,
  TradeListing,
  TradeProposal,
  TrainerProfile,
  Rarity,
  CoffeeSupporter,
} from './types';
import { CARD_MAP } from './data/cardsData';
import {
  loadUserCollection,
  saveUserCollection,
  loadTradeListings,
  saveTradeListings,
  loadTradeProposals,
  saveTradeProposals,
  loadTrainerProfile,
  saveTrainerProfile,
} from './utils/storage';
import { INITIAL_USER_COLLECTION, INITIAL_TRADE_LISTINGS, INITIAL_TRAINER_PROFILE } from './data/mockTrades';
import { Navbar } from './components/Navbar';
import { CollectionTracker } from './components/CollectionTracker';
import { TradeMarket } from './components/TradeMarket';
import { CardDetailModal } from './components/CardDetailModal';
import { CreateTradeModal } from './components/CreateTradeModal';
import { TradeExecutionModal } from './components/TradeExecutionModal';
import { MyTradesModal } from './components/MyTradesModal';
import { TrainerProfileModal } from './components/TrainerProfileModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DexScannerModal } from './components/DexScannerModal';
import { CollectionRatingModal } from './components/CollectionRatingModal';
import { BuyMeCoffeeModal } from './components/BuyMeCoffeeModal';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { TrainerMart } from './components/TrainerMart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { saveCoffeeSupporter } from './utils/coffeeStorage';
import { InstantMatchModal, MatchedListingInfo } from './components/InstantMatchModal';
import { CheckCircle2, AlertCircle, Info, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from './context/LanguageContext';
import { isCardTradeable, getTradeRestrictionReason } from './utils/tradeRules';
import {
  getAutoSyncEnabled,
  getOrCreateSyncKey,
  backupToCloud,
  fetchCloudTradeListings,
  publishCloudTradeListing,
  sendCloudTradeProposal,
  fetchCloudTradeProposals,
  updateCloudTradeProposalStatus,
  removeCloudTradeListing,
} from './utils/supabase';

export default function App() {
  const { t, getCardName } = useLanguage();

  // Navigation
  const [activeTab, setActiveTab] = useState<'collection' | 'market' | 'mart'>('collection');

  // Core App State
  const [userCollection, setUserCollection] = useState<Record<string, UserCardStatus>>(() => loadUserCollection());
  const [listings, setListings] = useState<TradeListing[]>(() => loadTradeListings());
  const [isCloudTradeSyncing, setIsCloudTradeSyncing] = useState(false);
  const [hasCloudTradeTable, setHasCloudTradeTable] = useState(true);
  const [proposals, setProposals] = useState<TradeProposal[]>(() => loadTradeProposals());
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile>(() => loadTrainerProfile());

  // Modals & Inspection
  const [inspectedCard, setInspectedCard] = useState<PokemonCard | null>(null);
  const [showCreateTradeModal, setShowCreateTradeModal] = useState(false);
  const [createTradeOfferCardId, setCreateTradeOfferCardId] = useState<string | undefined>(undefined);
  const [tradePrefillConfig, setTradePrefillConfig] = useState<{
    rarity?: Rarity;
    offerCardIds?: string[];
    wantCardIds?: string[];
  } | null>(null);
  const [instantMatches, setInstantMatches] = useState<MatchedListingInfo[] | null>(null);
  const [showMyTradesModal, setShowMyTradesModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDailyCheckInModal, setShowDailyCheckInModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [packFilterForCollection, setPackFilterForCollection] = useState<string | undefined>(undefined);

  // Trade Execution Modal (Card swap animation)
  const [tradeExecutionData, setTradeExecutionData] = useState<{
    giveCard: PokemonCard;
    getCard: PokemonCard;
    partnerName: string;
    partnerFriendCode: string;
    proposalId?: string;
    listingId?: string;
  } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Active modal stacking manager - ensures latest requested dialog is always displayed on the top layer
  const [modalStack, setModalStack] = useState<string[]>([]);

  const pushModal = useCallback((id: string) => {
    setModalStack((prev) => [...prev.filter((m) => m !== id), id]);
  }, []);

  const popModal = useCallback((id: string) => {
    setModalStack((prev) => prev.filter((m) => m !== id));
  }, []);

  const getModalZIndex = useCallback(
    (id: string, defaultZ: number = 50) => {
      const idx = modalStack.indexOf(id);
      if (idx === -1) return defaultZ;
      return 50 + (idx + 1) * 10;
    },
    [modalStack]
  );

  useEffect(() => {
    if (inspectedCard) pushModal('cardDetail');
    else popModal('cardDetail');
  }, [inspectedCard, pushModal, popModal]);

  useEffect(() => {
    if (showRatingModal) pushModal('rating');
    else popModal('rating');
  }, [showRatingModal, pushModal, popModal]);

  useEffect(() => {
    if (showScannerModal) pushModal('scanner');
    else popModal('scanner');
  }, [showScannerModal, pushModal, popModal]);

  useEffect(() => {
    if (showProfileModal) pushModal('profile');
    else popModal('profile');
  }, [showProfileModal, pushModal, popModal]);

  useEffect(() => {
    if (showCoffeeModal) pushModal('coffee');
    else popModal('coffee');
  }, [showCoffeeModal, pushModal, popModal]);

  useEffect(() => {
    if (showCreateTradeModal) pushModal('createTrade');
    else popModal('createTrade');
  }, [showCreateTradeModal, pushModal, popModal]);

  useEffect(() => {
    if (showMyTradesModal) pushModal('myTrades');
    else popModal('myTrades');
  }, [showMyTradesModal, pushModal, popModal]);

  useEffect(() => {
    if (instantMatches && instantMatches.length > 0) pushModal('instantMatches');
    else popModal('instantMatches');
  }, [instantMatches, pushModal, popModal]);

  useEffect(() => {
    if (showCloudSyncModal) pushModal('cloudSync');
    else popModal('cloudSync');
  }, [showCloudSyncModal, pushModal, popModal]);

  useEffect(() => {
    if (tradeExecutionData) pushModal('tradeExecution');
    else popModal('tradeExecution');
  }, [tradeExecutionData, pushModal, popModal]);

  // Persist state on changes
  useEffect(() => {
    saveUserCollection(userCollection);
  }, [userCollection]);

  // Automatic Ko-fi post-payment detection from return URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('kofi_paid') === 'true' || params.get('payment_success') === 'true') {
        confetti({
          particleCount: 120,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#ea580c', '#38bdf8', '#ef4444'],
        });

        let cups = 2;
        let amount = '$6';
        let badge = '☕☕ Super Supporter';
        let message = '感谢维护 PTCG Pocket 交换与图鉴神器！持续支持！☕';

        try {
          const pendingRaw = localStorage.getItem('ptcgp_pending_coffee_checkout');
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            if (pending.cups) cups = pending.cups;
            if (pending.amount) amount = pending.amount;
            if (pending.badge) badge = pending.badge;
            if (pending.message) message = pending.message;
            localStorage.removeItem('ptcgp_pending_coffee_checkout');
          }
        } catch {}

        // Verify actual payment amount from server webhook if available
        fetch(`/api/kofi/check-badge?name=${encodeURIComponent(trainerProfile.name || '')}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.verified) {
              cups = data.cups;
              amount = data.amount;
              badge = data.badge;
            }
          })
          .catch(() => {})
          .finally(() => {
            // Add to Hall of Fame
            const newSupporter: CoffeeSupporter = {
              id: `sup-${Date.now()}`,
              name: trainerProfile.name || 'Trainer',
              avatar: trainerProfile.avatar,
              cups,
              amount,
              message,
              date: Date.now(),
              badge,
            };
            saveCoffeeSupporter(newSupporter);

            setTrainerProfile((prev) => {
              const updated: TrainerProfile = {
                ...prev,
                isSupporter: true,
                supporterBadge: badge,
                supporterCups: (prev.supporterCups || 0) + cups,
                supporterSince: prev.supporterSince || Date.now(),
              };
              saveTrainerProfile(updated);
              return updated;
            });

            showToast(`🎉 赞助成功！已自动为你点亮【${badge}】专属金色勋章！`, 'success');
          });
        // Clean URL query parameter cleanly without reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}
  }, []);

  // Debounced auto-sync to Supabase when enabled
  useEffect(() => {
    if (!getAutoSyncEnabled()) return;
    const cleanCode = trainerProfile.friendCode.replace(/\D/g, '');
    if (cleanCode.length !== 16) return;

    const timer = setTimeout(() => {
      const syncKey = getOrCreateSyncKey();
      backupToCloud(trainerProfile.friendCode, syncKey, {
        trainerProfile,
        userCollection,
      }).catch((err) => {
        console.warn('Auto-sync silent notification:', err);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [userCollection, trainerProfile]);

  useEffect(() => {
    saveTradeListings(listings);
  }, [listings]);

  // Load and sync real-time public listings and proposals from Supabase cloud
  const refreshCloudListings = async (showNotification = false) => {
    setIsCloudTradeSyncing(true);
    try {
      const [listingsRes, proposalsRes] = await Promise.allSettled([
        fetchCloudTradeListings(),
        fetchCloudTradeProposals(trainerProfile.friendCode),
      ]);

      if (listingsRes.status === 'fulfilled') {
        const res = listingsRes.value;
        if (res.success && res.listings && res.listings.length > 0) {
          setHasCloudTradeTable(true);
          // Merge cloud listings with local user's listings
          setListings((localListings) => {
            const userOnly = localListings.filter((l) => l.isUserListing);
            const cloudIds = new Set(res.listings!.map((l) => l.id));
            const uniqueUserListings = userOnly.filter((l) => !cloudIds.has(l.id));
            return [...uniqueUserListings, ...res.listings!];
          });
          if (showNotification) {
            showToast(`已从云端同步 ${res.listings.length} 条全网真实交易挂单`, 'success');
          }
        } else if (res.isTableMissing) {
          setHasCloudTradeTable(false);
        }
      }

      if (proposalsRes.status === 'fulfilled') {
        const pRes = proposalsRes.value;
        if (pRes.success && pRes.proposals && pRes.proposals.length > 0) {
          setProposals((localProps) => {
            const localIds = new Set(localProps.map((p) => p.id));
            const newIncoming = pRes.proposals!.filter((p) => !localIds.has(p.id));
            return [...newIncoming, ...localProps];
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load cloud listings or proposals:', err);
    } finally {
      setIsCloudTradeSyncing(false);
    }
  };

  useEffect(() => {
    refreshCloudListings(false);
  }, []);

  useEffect(() => {
    saveTradeProposals(proposals);
  }, [proposals]);

  useEffect(() => {
    saveTrainerProfile(trainerProfile);
  }, [trainerProfile]);

  // Card Count updater
  const handleUpdateCount = (cardId: string, delta: number) => {
    setUserCollection((prev) => {
      const current = prev[cardId] || {
        cardId,
        count: 0,
        forTradeCount: 0,
        inWishlist: false,
        updatedAt: Date.now(),
      };
      const newCount = Math.max(0, current.count + delta);
      const forTrade = Math.min(newCount, current.forTradeCount);

      const updated = {
        ...current,
        count: newCount,
        forTradeCount: forTrade,
        updatedAt: Date.now(),
      };

      const card = CARD_MAP.get(cardId);
      if (card && delta > 0) {
        showToast(`${getCardName(card)}: ${newCount}`, 'success');
      }

      return {
        ...prev,
        [cardId]: updated,
      };
    });
  };

  // Toggle Wishlist
  const handleToggleWishlist = (cardId: string) => {
    setUserCollection((prev) => {
      const current = prev[cardId] || {
        cardId,
        count: 0,
        forTradeCount: 0,
        inWishlist: false,
        updatedAt: Date.now(),
      };
      const newWish = !current.inWishlist;
      const card = CARD_MAP.get(cardId);
      const name = card ? getCardName(card) : 'Card';

      showToast(
        newWish ? `❤️ ${name} +` : `${name} -`,
        newWish ? 'success' : 'info'
      );

      return {
        ...prev,
        [cardId]: {
          ...current,
          inWishlist: newWish,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // Toggle For Trade
  const handleToggleForTrade = (cardId: string) => {
    const card = CARD_MAP.get(cardId);
    if (card && !isCardTradeable(card)) {
      const reason = getTradeRestrictionReason(card);
      showToast(`🔒 ${reason?.title || '官方禁止交换'}: ${reason?.description || '此卡牌不可交换'}`, 'error');
      return;
    }

    setUserCollection((prev) => {
      const current = prev[cardId];
      if (!current || current.count <= 0) return prev;

      const isForTrade = current.forTradeCount > 0;
      const newForTrade = isForTrade ? 0 : Math.max(1, current.count - 1);

      const card = CARD_MAP.get(cardId);
      const name = card ? getCardName(card) : 'Card';
      showToast(
        newForTrade > 0 ? `🔄 ${name} (x${newForTrade})` : `${name}`,
        'info'
      );

      return {
        ...prev,
        [cardId]: {
          ...current,
          forTradeCount: newForTrade,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // Create Listing with instant database scan & push to both parties
  const handleCreateListing = async (newListing: TradeListing) => {
    // 1. 本地先行记录当前用户挂单
    setListings((prev) => [newListing, ...prev]);

    // 2. 同时将该挂单发布至 Supabase 云端公共池
    publishCloudTradeListing(newListing).then((res) => {
      if (res.success) {
        showToast('✓ 挂单已成功发布至卡牌交换所！', 'success');
      } else if (res.isTableMissing) {
        console.info('Cloud listings table not yet created on Supabase.');
      }
    });

    // 3. 挂单提交时立即扫描一次数据库 (从 Supabase 实时拉取最新交换大厅挂单并与本地数据合并)
    let candidateListings: TradeListing[] = listings;
    try {
      const cloudRes = await fetchCloudTradeListings();
      if (cloudRes.success && cloudRes.listings && cloudRes.listings.length > 0) {
        setHasCloudTradeTable(true);
        const cloudIds = new Set(cloudRes.listings.map((l) => l.id));
        const userOnly = listings.filter((l) => l.isUserListing && !cloudIds.has(l.id));
        candidateListings = [newListing, ...userOnly, ...cloudRes.listings];
        setListings(candidateListings);
      }
    } catch (scanErr) {
      console.warn('Scan database error, falling back to current listings:', scanErr);
    }

    // 4. 提取当前提交挂单的需求与出卡
    const userWantIds = new Set(
      newListing.wantCardIds && newListing.wantCardIds.length > 0
        ? newListing.wantCardIds
        : [newListing.wantCardId]
    );
    const userOfferIds = new Set(
      newListing.offerCardIds && newListing.offerCardIds.length > 0
        ? newListing.offerCardIds
        : [newListing.offerCardId]
    );

    const matches: MatchedListingInfo[] = [];
    const newProposalsToSend: TradeProposal[] = [];
    const userProposalsToAdd: TradeProposal[] = [];

    for (const item of candidateListings) {
      // 排除自己发布的挂单
      if (item.id === newListing.id) continue;
      if (item.isUserListing || item.friendCode === newListing.friendCode) continue;
      if (item.status && item.status !== 'active') continue;

      const itemOfferIds =
        item.offerCardIds && item.offerCardIds.length > 0
          ? item.offerCardIds
          : [item.offerCardId];
      const itemWantIds =
        item.wantCardIds && item.wantCardIds.length > 0
          ? item.wantCardIds
          : [item.wantCardId];

      // 对方可出 (你想要的卡牌)
      const userGets = itemOfferIds
        .filter((id) => userWantIds.has(id))
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean) as PokemonCard[];

      // 你可提供 (对方想要的卡牌)
      const userGives = itemWantIds
        .filter((id) => userOfferIds.has(id))
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean) as PokemonCard[];

      if (userGets.length > 0 && userGives.length > 0) {
        // 双向完美互换匹配
        matches.push({
          listing: item,
          matchType: 'perfect',
          userWillGet: userGets,
          userWillGive: userGives,
        });

        const cardUserGets = userGets[0];
        const cardUserGives = userGives[0];
        const cardUserGetsName = getCardName(cardUserGets);
        const cardUserGivesName = getCardName(cardUserGives);

        // 立即给双方发送消息与提案通知：
        // 1. 给当前提交挂单的用户 (一方) 发送信件
        const propForUser: TradeProposal = {
          id: `prop-${Date.now()}-${item.id}-user`,
          listingId: newListing.id,
          fromTrainerName: item.trainerName,
          fromFriendCode: item.friendCode,
          toTrainerName: trainerProfile.name,
          toFriendCode: trainerProfile.friendCode,
          offerCardId: cardUserGets.id,
          wantCardId: cardUserGives.id,
          status: 'pending',
          createdAt: Date.now(),
          message: `【即时匹配通知】您提交的挂单与训练家【${item.trainerName}】的需求完美双向匹配！您可出【${cardUserGivesName}】换对方的【${cardUserGetsName}】。`,
        };

        // 2. 给对方挂单发布者 (另一方) 发送信件
        const propForPartner: TradeProposal = {
          id: `prop-${Date.now()}-${item.id}-partner`,
          listingId: item.id,
          fromTrainerName: trainerProfile.name,
          fromFriendCode: trainerProfile.friendCode,
          toTrainerName: item.trainerName,
          toFriendCode: item.friendCode,
          offerCardId: cardUserGives.id,
          wantCardId: cardUserGets.id,
          status: 'pending',
          createdAt: Date.now(),
          message: `【即时匹配通知】训练家【${trainerProfile.name}】刚提交的挂单与您的交换需求完全吻合！对方可出【${cardUserGivesName}】换您的【${cardUserGetsName}】。`,
        };

        newProposalsToSend.push(propForUser, propForPartner);
        userProposalsToAdd.push(propForUser);
      } else if (userGets.length > 0) {
        const fallbackGive = itemWantIds
          .map((id) => CARD_MAP.get(id))
          .filter(Boolean) as PokemonCard[];
        matches.push({
          listing: item,
          matchType: 'offer_match',
          userWillGet: userGets,
          userWillGive: fallbackGive.length > 0 ? fallbackGive : userGets,
        });
      }
    }

    // 5. 如果有匹配上的双向挂单，立刻给双方发送消息 (写入 Supabase 数据库，并同步至本地信箱)
    if (newProposalsToSend.length > 0) {
      for (const p of newProposalsToSend) {
        sendCloudTradeProposal(p).catch((err) => {
          console.warn('Failed to send cloud proposal notification:', err);
        });
      }
      // 将当前用户的消息加入本地信箱，让导航栏信箱小红点立即+1
      setProposals((prev) => [...userProposalsToAdd, ...prev]);
    }

    // 6. 弹出即时匹配窗口与提示
    if (matches.length > 0) {
      setInstantMatches(matches);
      showToast(`🎯 立即扫描数据库成功！匹配到 ${matches.length} 个契合挂单，已向双方信箱发送意向通知！`, 'success');
    } else {
      showToast(`✓ 交换挂单已成功发布至卡牌交换所，正在后台持续监控匹配！`, 'success');
    }
  };

  // Request trade from a listing in market
  const handleRequestTradeFromListing = (listing: TradeListing) => {
    const offerCards = (listing.offerCardIds && listing.offerCardIds.length > 0)
      ? (listing.offerCardIds.map((id) => CARD_MAP.get(id)).filter(Boolean) as PokemonCard[])
      : ([CARD_MAP.get(listing.offerCardId)].filter(Boolean) as PokemonCard[]);

    const wantCards = (listing.wantCardIds && listing.wantCardIds.length > 0)
      ? (listing.wantCardIds.map((id) => CARD_MAP.get(id)).filter(Boolean) as PokemonCard[])
      : ([CARD_MAP.get(listing.wantCardId)].filter(Boolean) as PokemonCard[]);

    if (offerCards.length === 0 || wantCards.length === 0) return;

    // Pick card user owns to give (prioritize duplicates count >= 2)
    const userOfferCard =
      wantCards.find((c) => (userCollection[c.id]?.count || 0) >= 2) ||
      wantCards.find((c) => (userCollection[c.id]?.count || 0) > 0);

    // Pick card user wants to receive (prioritize wishlist, then unowned)
    const userGetCard =
      offerCards.find((c) => userCollection[c.id]?.inWishlist) ||
      offerCards.find((c) => (userCollection[c.id]?.count || 0) === 0) ||
      offerCards[0];

    if (userOfferCard && userGetCard) {
      setTradeExecutionData({
        giveCard: userOfferCard,
        getCard: userGetCard,
        partnerName: listing.trainerName,
        partnerFriendCode: listing.friendCode,
        listingId: listing.id,
      });
    } else {
      navigator.clipboard.writeText(listing.friendCode);
      showToast(`${listing.trainerName}: ${listing.friendCode} (已复制好友代码)`, 'info');
    }
  };

  // Execute trade trigger
  const handleTriggerExecuteTrade = (
    giveCard: PokemonCard,
    getCard: PokemonCard,
    partnerName: string,
    partnerFriendCode: string,
    proposalId?: string,
    listingId?: string
  ) => {
    setTradeExecutionData({
      giveCard,
      getCard,
      partnerName,
      partnerFriendCode,
      proposalId,
      listingId,
    });
  };

  // Confirm and finalize trade: update collection and delete both parties' market listings
  const handleConfirmTradeExecution = () => {
    if (!tradeExecutionData) return;
    const { giveCard, getCard, partnerName, partnerFriendCode, proposalId, listingId } = tradeExecutionData;

    setUserCollection((prev) => {
      const next = { ...prev };

      // Decrement giveCard
      const giveStatus = next[giveCard.id];
      if (giveStatus) {
        const nextCount = Math.max(0, giveStatus.count - 1);
        next[giveCard.id] = {
          ...giveStatus,
          count: nextCount,
          forTradeCount: Math.min(nextCount, Math.max(0, giveStatus.forTradeCount - 1)),
          updatedAt: Date.now(),
        };
      }

      // Increment getCard
      const getStatus = next[getCard.id] || {
        cardId: getCard.id,
        count: 0,
        forTradeCount: 0,
        inWishlist: false,
        updatedAt: Date.now(),
      };
      next[getCard.id] = {
        ...getStatus,
        count: getStatus.count + 1,
        inWishlist: false,
        updatedAt: Date.now(),
      };

      return next;
    });

    // Update trainer profile completedTrades
    setTrainerProfile((prev) => ({
      ...prev,
      completedTrades: prev.completedTrades + 1,
    }));

    // 1. Delete matching market listings for BOTH sides (partner and user) from the lobby
    const removedListingIds: string[] = [];

    setListings((prev) => {
      const remaining: TradeListing[] = [];
      for (const l of prev) {
        // Direct ID match
        const isTargetListing = listingId && l.id === listingId;

        // Partner's listing offering getCard and wanting giveCard
        const isPartnerListing =
          (l.friendCode === partnerFriendCode || l.trainerName === partnerName) &&
          ((l.offerCardIds && l.offerCardIds.includes(getCard.id)) || l.offerCardId === getCard.id) &&
          ((l.wantCardIds && l.wantCardIds.includes(giveCard.id)) || l.wantCardId === giveCard.id);

        // User's listing offering giveCard and wanting getCard
        const isUserMatchingListing =
          (l.isUserListing || l.friendCode === trainerProfile.friendCode) &&
          ((l.offerCardIds && l.offerCardIds.includes(giveCard.id)) || l.offerCardId === giveCard.id) &&
          ((l.wantCardIds && l.wantCardIds.includes(getCard.id)) || l.wantCardId === getCard.id);

        if (isTargetListing || isPartnerListing || isUserMatchingListing) {
          removedListingIds.push(l.id);
        } else {
          remaining.push(l);
        }
      }
      return remaining;
    });

    // Remove them from Supabase cloud database as well
    for (const id of removedListingIds) {
      removeCloudTradeListing(id).catch(() => {});
    }

    // 2. Preserve partner friend code and cards in proposals (My Trades -> 交换完成)
    if (proposalId) {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                status: 'completed',
                fromFriendCode: p.fromFriendCode || partnerFriendCode,
              }
            : p
        )
      );
      updateCloudTradeProposalStatus(proposalId, 'completed').catch(() => {});
    } else {
      // Add as a completed proposal record so it persists in My Trades -> 交换完成
      const completedRecord: TradeProposal = {
        id: `completed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromTrainerName: partnerName,
        fromFriendCode: partnerFriendCode,
        fromTrainerAvatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        toTrainerName: trainerProfile.name,
        toFriendCode: trainerProfile.friendCode,
        offerCardId: getCard.id, // Card received by user
        wantCardId: giveCard.id, // Card given by user
        status: 'completed',
        createdAt: Date.now(),
        message: '交换已圆满完成，双方交换挂单已自动下架。',
      };
      setProposals((prev) => [completedRecord, ...prev]);
      sendCloudTradeProposal(completedRecord).catch(() => {});
    }

    showToast(`✓ +1 ${getCardName(getCard)} (双方交换挂单已自动下架)`, 'success');
  };

  // Accept incoming proposal
  const handleAcceptProposal = (proposal: TradeProposal) => {
    const offerCard = CARD_MAP.get(proposal.offerCardId);
    const wantCard = CARD_MAP.get(proposal.wantCardId);
    if (!offerCard || !wantCard) return;

    handleTriggerExecuteTrade(
      wantCard,
      offerCard,
      proposal.fromTrainerName,
      proposal.fromFriendCode,
      proposal.id,
      proposal.listingId
    );
  };

  // Decline proposal
  const handleDeclineProposal = (proposalId: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: 'declined' } : p))
    );
    updateCloudTradeProposalStatus(proposalId, 'declined').catch(() => {});
    showToast(t('cancel'), 'info');
  };

  // Delete user listing
  const handleDeleteListing = (listingId: string) => {
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    showToast(t('delete'), 'info');
  };

  // Reset to initial demo data
  const handleResetDemo = () => {
    setUserCollection({ ...INITIAL_USER_COLLECTION });
    setListings([...INITIAL_TRADE_LISTINGS]);
    setTrainerProfile({ ...INITIAL_TRAINER_PROFILE });
    showToast(t('filterAll'), 'info');
  };

  // Smart Match count for badge in navbar
  const smartMatchCount = useMemo(() => {
    let count = 0;
    listings.forEach((listing) => {
      if (listing.isUserListing) return;
      const userHasWhatTheyWant = (userCollection[listing.wantCardId]?.count || 0) > 0;
      const userWantsWhatTheyOffer = !!userCollection[listing.offerCardId]?.inWishlist;
      if (userHasWhatTheyWant && userWantsWhatTheyOffer) {
        count++;
      }
    });
    return count;
  }, [listings, userCollection]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        trainerProfile={trainerProfile}
        proposals={proposals}
        onOpenMyTrades={() => setShowMyTradesModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
        onOpenDailyCheckIn={() => setShowDailyCheckInModal(true)}
        onOpenRating={() => setShowRatingModal(true)}
        onOpenCoffee={() => setShowCoffeeModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'collection' && (
          <CollectionTracker
            userCollection={userCollection}
            onUpdateCount={handleUpdateCount}
            onToggleWishlist={handleToggleWishlist}
            onToggleForTrade={handleToggleForTrade}
            onInspectCard={(card) => setInspectedCard(card)}
            onOpenScanner={() => setShowScannerModal(true)}
            onOpenRating={() => setShowRatingModal(true)}
            onOpenCloudSync={() => setShowCloudSyncModal(true)}
            onResetDemo={handleResetDemo}
            trainerProfile={trainerProfile}
            initialPackFilter={packFilterForCollection}
          />
        )}

        {activeTab === 'market' && (
          <TradeMarket
            listings={listings}
            userCollection={userCollection}
            onOpenCreateModal={() => {
              setCreateTradeOfferCardId(undefined);
              setTradePrefillConfig(null);
              setShowCreateTradeModal(true);
            }}
            onAdoptRecommendation={(rarity, offerCardIds, wantCardIds) => {
              setCreateTradeOfferCardId(undefined);
              setTradePrefillConfig({ rarity, offerCardIds, wantCardIds });
              setShowCreateTradeModal(true);
            }}
            onRequestTrade={handleRequestTradeFromListing}
            onRefreshCloud={() => refreshCloudListings(true)}
            isCloudSyncing={isCloudTradeSyncing}
            hasCloudTradeTable={hasCloudTradeTable}
            onOpenCloudSync={() => setShowCloudSyncModal(true)}
          />
        )}

        {activeTab === 'mart' && (
          <ErrorBoundary fallbackTitle="訓練家生活館加載異常">
            <TrainerMart onOpenDailyCheckIn={() => setShowDailyCheckInModal(true)} />
          </ErrorBoundary>
        )}
      </main>

      {/* Global Community Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PTCG Pocket Trader & Dex · Community Driven</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              id="footer-mart-btn"
              type="button"
              onClick={() => setActiveTab('mart')}
              className="text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer"
            >
              {t('tabMart') || '補給商城'}
            </button>

            <button
              id="footer-coffee-btn"
              type="button"
              onClick={() => setShowCoffeeModal(true)}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{t('buyCoffee') || '请作者喝杯咖啡 ☕'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRatingModal(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t('passport')}
            </button>

            <button
              type="button"
              onClick={() => setShowCloudSyncModal(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t('cloudSync')}
            </button>
          </div>
        </div>
      </footer>

      {/* Create Trade Modal */}
      {showCreateTradeModal && (
        <CreateTradeModal
          zIndex={getModalZIndex('createTrade', 50)}
          initialOfferCardId={createTradeOfferCardId}
          initialOfferCardIds={tradePrefillConfig?.offerCardIds}
          initialWantCardIds={tradePrefillConfig?.wantCardIds}
          initialRarity={tradePrefillConfig?.rarity}
          userCollection={userCollection}
          trainerProfile={trainerProfile}
          onClose={() => {
            setShowCreateTradeModal(false);
            setCreateTradeOfferCardId(undefined);
            setTradePrefillConfig(null);
          }}
          onSubmit={handleCreateListing}
        />
      )}

      {/* Instant Match Push Modal */}
      {instantMatches && instantMatches.length > 0 && (
        <InstantMatchModal
          zIndex={getModalZIndex('instantMatches', 50)}
          matches={instantMatches}
          onClose={() => setInstantMatches(null)}
          onInitiateTrade={(matchedListing) => {
            setInstantMatches(null);
            handleRequestTradeFromListing(matchedListing);
          }}
        />
      )}

      {/* My Trades Modal */}
      {showMyTradesModal && (
        <MyTradesModal
          zIndex={getModalZIndex('myTrades', 50)}
          proposals={proposals}
          listings={listings}
          userCollection={userCollection}
          onClose={() => setShowMyTradesModal(false)}
          onAcceptProposal={handleAcceptProposal}
          onDeclineProposal={handleDeclineProposal}
          onDeleteListing={handleDeleteListing}
        />
      )}

      {/* Screenshot Dex Scanner & Backup Modal */}
      {showScannerModal && (
        <DexScannerModal
          zIndex={getModalZIndex('scanner', 50)}
          userCollection={userCollection}
          onClose={() => setShowScannerModal(false)}
          onImport={(imported) => {
            setUserCollection(imported);
          }}
          showToast={showToast}
          onInspectCard={(card) => setInspectedCard(card)}
        />
      )}

      {/* Collection Rating & Viral Showcase Modal */}
      {showRatingModal && (
        <CollectionRatingModal
          zIndex={getModalZIndex('rating', 50)}
          userCollection={userCollection}
          trainerProfile={trainerProfile}
          onClose={() => setShowRatingModal(false)}
          onInspectCard={(card) => setInspectedCard(card)}
        />
      )}

      {/* Trainer Profile Modal */}
      {showProfileModal && (
        <TrainerProfileModal
          zIndex={getModalZIndex('profile', 50)}
          profile={trainerProfile}
          onClose={() => setShowProfileModal(false)}
          onOpenCoffee={() => setShowCoffeeModal(true)}
          onSave={(updated) => {
            setTrainerProfile(updated);
            showToast(t('save'), 'success');
          }}
        />
      )}

      {/* Buy Me a Coffee Modal */}
      <BuyMeCoffeeModal
        zIndex={getModalZIndex('coffee', 70)}
        isOpen={showCoffeeModal}
        onClose={() => setShowCoffeeModal(false)}
        trainerProfile={trainerProfile}
        onUpdateTrainerProfile={(updated) => {
          setTrainerProfile(updated);
          saveTrainerProfile(updated);
        }}
        showToast={showToast}
      />

      {/* Cloud Sync Modal (方案A: 16位好友代码 + 6位引继码 Supabase 云端同步) */}
      {showCloudSyncModal && (
        <CloudSyncModal
          zIndex={getModalZIndex('cloudSync', 50)}
          isOpen={showCloudSyncModal}
          onClose={() => setShowCloudSyncModal(false)}
          trainerProfile={trainerProfile}
          userCollection={userCollection}
          onSyncSuccess={(newProfile, newCollection) => {
            setTrainerProfile(newProfile);
            setUserCollection(newCollection);
          }}
          showToast={showToast}
        />
      )}

      {/* Card Detail Modal - Inspector modal that floats on top of any view or open modal */}
      {inspectedCard && (
        <CardDetailModal
          zIndex={getModalZIndex('cardDetail', 75)}
          card={inspectedCard}
          status={userCollection[inspectedCard.id]}
          onClose={() => setInspectedCard(null)}
          onUpdateCount={handleUpdateCount}
          onToggleWishlist={handleToggleWishlist}
          onToggleForTrade={handleToggleForTrade}
          onFindTrades={(cardId) => {
            setActiveTab('market');
          }}
          onCreateListingWithCard={(cardId) => {
            setCreateTradeOfferCardId(cardId);
            setTradePrefillConfig(null);
            setShowCreateTradeModal(true);
          }}
        />
      )}

      {/* Trade Execution Modal (Animated Card Swap) - Placed at end with highest stacking order */}
      {tradeExecutionData && (
        <TradeExecutionModal
          zIndex={getModalZIndex('tradeExecution', 85)}
          giveCard={tradeExecutionData.giveCard}
          getCard={tradeExecutionData.getCard}
          partnerName={tradeExecutionData.partnerName}
          partnerFriendCode={tradeExecutionData.partnerFriendCode}
          onConfirm={handleConfirmTradeExecution}
          onClose={() => setTradeExecutionData(null)}
        />
      )}

      {/* Daily Check-in Mystery Box Modal */}
      <DailyCheckInModal
        isOpen={showDailyCheckInModal}
        onClose={() => setShowDailyCheckInModal(false)}
        onPointsUpdated={() => {}}
        onGoToShop={() => {
          setShowDailyCheckInModal(false);
          setActiveTab('mart');
        }}
      />

      {/* Toast Notification - Floating above all dialogs */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs font-semibold text-slate-100 animate-fade-in pointer-events-auto">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
