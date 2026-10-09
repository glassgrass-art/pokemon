/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  applyCompletedTrade,
  mergeCloudListings,
  mergeCloudProposals,
  normalizeFriendCode,
} from "./utils/tradeState";
import { getAppliedTradeIds, saveSnapshot } from "./utils/storage";
import {
  PokemonCard,
  UserCardStatus,
  TradeListing,
  TradeProposal,
  TrainerProfile,
  Rarity,
} from "./types";
import { CARD_MAP } from "./data/cardsData";
import {
  loadUserCollection,
  saveUserCollection,
  loadTradeListings,
  saveTradeListings,
  loadTradeProposals,
  saveTradeProposals,
  loadTrainerProfile,
  saveTrainerProfile,
} from "./utils/storage";
import { Navbar } from "./components/Navbar";
import { CollectionTracker } from "./components/CollectionTracker";
import { TradeMarket } from "./components/TradeMarket";
import { CardDetailModal } from "./components/CardDetailModal";
import { CreateTradeModal } from "./components/CreateTradeModal";
import { TradeExecutionModal } from "./components/TradeExecutionModal";
import { MyTradesModal } from "./components/MyTradesModal";
import { TrainerProfileModal } from "./components/TrainerProfileModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
const DexScannerModal = lazy(() =>
  import("./components/DexScannerModal").then((m) => ({
    default: m.DexScannerModal,
  })),
);
const CollectionRatingModal = lazy(() =>
  import("./components/CollectionRatingModal").then((m) => ({
    default: m.CollectionRatingModal,
  })),
);
const BuyMeCoffeeModal = lazy(() =>
  import("./components/BuyMeCoffeeModal").then((m) => ({
    default: m.BuyMeCoffeeModal,
  })),
);
const DailyCheckInModal = lazy(() =>
  import("./components/DailyCheckInModal").then((m) => ({
    default: m.DailyCheckInModal,
  })),
);
const TrainerMart = lazy(() =>
  import("./components/TrainerMart").then((m) => ({ default: m.TrainerMart })),
);
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  InstantMatchModal,
  MatchedListingInfo,
} from "./components/InstantMatchModal";
import { CheckCircle2, AlertCircle, Info, Coffee } from "lucide-react";
import { useLanguage } from "./context/LanguageContext";
import { isCardTradeable, getTradeRestrictionReason } from "./utils/tradeRules";
import {
  getAutoSyncEnabled,
  backupToCloud,
  fetchCloudTradeListings,
  publishCloudTradeListing,
  sendCloudTradeProposal,
  fetchCloudTradeProposals,
  respondCloudTrade,
  registerTrainer,
  supabase,
  removeCloudTradeListing,
} from "./utils/supabase";

export default function App({
  user,
  onSignIn,
}: {
  user: User | null;
  onSignIn: () => void;
}) {
  const { t, getCardName, currentLanguage } = useLanguage();
  const zh = currentLanguage === "zh-Hant";
  const mounted = useRef(true);
  const syncing = useRef(false);
  const operationBusy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Navigation
  const [activeTab, setActiveTab] = useState<"collection" | "market" | "mart">(
    "market",
  );
  const [marketCardFilter, setMarketCardFilter] = useState<
    string | undefined
  >();
  const [scanUndo, setScanUndo] = useState<Record<
    string,
    UserCardStatus
  > | null>(null);

  // Core App State
  const [userCollection, setUserCollection] = useState<
    Record<string, UserCardStatus>
  >(() => loadUserCollection());
  const [listings, setListings] = useState<TradeListing[]>(() =>
    loadTradeListings(),
  );
  const [isCloudTradeSyncing, setIsCloudTradeSyncing] = useState(false);
  const [hasCloudTradeTable, setHasCloudTradeTable] = useState(true);
  const [proposals, setProposals] = useState<TradeProposal[]>(() =>
    loadTradeProposals(),
  );
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile>(() =>
    loadTrainerProfile(),
  );
  const stateRef = useRef({ userCollection, trainerProfile });
  stateRef.current = { userCollection, trainerProfile };

  // Modals & Inspection
  const [inspectedCard, setInspectedCard] = useState<PokemonCard | null>(null);
  const [showCreateTradeModal, setShowCreateTradeModal] = useState(false);
  const [createTradeOfferCardId, setCreateTradeOfferCardId] = useState<
    string | undefined
  >(undefined);
  const [tradePrefillConfig, setTradePrefillConfig] = useState<{
    rarity?: Rarity;
    offerCardIds?: string[];
    wantCardIds?: string[];
  } | null>(null);
  const [instantMatches, setInstantMatches] = useState<
    MatchedListingInfo[] | null
  >(null);
  const [showMyTradesModal, setShowMyTradesModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDailyCheckInModal, setShowDailyCheckInModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [packFilterForCollection, setPackFilterForCollection] = useState<
    string | undefined
  >(undefined);

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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "info" | "error" = "success",
  ) => {
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
    [modalStack],
  );

  useEffect(() => {
    if (inspectedCard) pushModal("cardDetail");
    else popModal("cardDetail");
  }, [inspectedCard, pushModal, popModal]);

  useEffect(() => {
    if (showRatingModal) pushModal("rating");
    else popModal("rating");
  }, [showRatingModal, pushModal, popModal]);

  useEffect(() => {
    if (showScannerModal) pushModal("scanner");
    else popModal("scanner");
  }, [showScannerModal, pushModal, popModal]);

  useEffect(() => {
    if (showProfileModal) pushModal("profile");
    else popModal("profile");
  }, [showProfileModal, pushModal, popModal]);

  useEffect(() => {
    if (showCoffeeModal) pushModal("coffee");
    else popModal("coffee");
  }, [showCoffeeModal, pushModal, popModal]);

  useEffect(() => {
    if (showCreateTradeModal) pushModal("createTrade");
    else popModal("createTrade");
  }, [showCreateTradeModal, pushModal, popModal]);

  useEffect(() => {
    if (showMyTradesModal) pushModal("myTrades");
    else popModal("myTrades");
  }, [showMyTradesModal, pushModal, popModal]);

  useEffect(() => {
    if (instantMatches && instantMatches.length > 0)
      pushModal("instantMatches");
    else popModal("instantMatches");
  }, [instantMatches, pushModal, popModal]);

  useEffect(() => {
    if (showCloudSyncModal) pushModal("cloudSync");
    else popModal("cloudSync");
  }, [showCloudSyncModal, pushModal, popModal]);

  useEffect(() => {
    if (tradeExecutionData) pushModal("tradeExecution");
    else popModal("tradeExecution");
  }, [tradeExecutionData, pushModal, popModal]);

  // Persist state on changes
  useEffect(() => {
    saveUserCollection(userCollection);
  }, [userCollection]);

  // A checkout return URL is not proof of payment. Supporter status is only informational.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("kofi_paid") || params.has("payment_success")) {
      showToast(
        zh
          ? "感谢支持！请以支付平台的收据为准。"
          : "Thank you! Please check your payment provider receipt.",
        "info",
      );
      params.delete("kofi_paid");
      params.delete("payment_success");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname +
          (query ? "?" + query : "") +
          window.location.hash,
      );
    }
  }, []);

  // Persist account-scoped state. Backup version checks prevent stale devices from overwriting newer progress.
  useEffect(() => {
    saveTradeListings(listings);
  }, [listings]);
  useEffect(() => {
    saveTradeProposals(proposals);
  }, [proposals]);
  useEffect(() => {
    saveTrainerProfile(trainerProfile);
  }, [trainerProfile]);
  useEffect(() => {
    if (!user || !getAutoSyncEnabled()) return;
    const timer = setTimeout(async () => {
      const result = await backupToCloud({ trainerProfile, userCollection });
      if (mounted.current && !result.success)
        showToast(result.message || "自动备份失败，请手动重试。", "error");
    }, 2500);
    return () => clearTimeout(timer);
  }, [user, userCollection, trainerProfile]);

  const refreshCloudListings = async (showNotification = false) => {
    if (syncing.current) return;
    syncing.current = true;
    setIsCloudTradeSyncing(true);
    try {
      const [listingResult, proposalResult] = await Promise.all([
        fetchCloudTradeListings(),
        user
          ? fetchCloudTradeProposals()
          : Promise.resolve({
              success: true,
              proposals: [],
              message: undefined,
            }),
      ]);
      if (!mounted.current) return;
      if (listingResult.success) {
        setHasCloudTradeTable(true);
        setListings((local) =>
          mergeCloudListings(local, listingResult.listings || [], user?.id),
        );
      } else {
        setHasCloudTradeTable(false);
        if (showNotification)
          showToast(listingResult.message || "刷新失败，请重试。", "error");
      }
      if (proposalResult.success && user) {
        const cloud = proposalResult.proposals || [];
        setProposals((local) => mergeCloudProposals(local, cloud, user.id));
        // Commit inventory and receipts together before updating React. Repeated refreshes are idempotent.
        let collection = stateRef.current.userCollection,
          profile = stateRef.current.trainerProfile;
        let applied = getAppliedTradeIds(),
          changed = false;
        for (const proposal of [...cloud].sort(
          (a, b) => a.createdAt - b.createdAt,
        )) {
          try {
            const next = applyCompletedTrade(
              collection,
              profile,
              proposal,
              user.id,
              applied,
            );
            if (next) {
              collection = next.collection;
              profile = next.profile;
              applied = next.appliedTradeIds;
              changed = true;
            }
          } catch (error) {
            showToast(
              error instanceof Error ? error.message : "请核对收藏数量。",
              "error",
            );
          }
        }
        if (changed) {
          setScanUndo(null);
          saveSnapshot({ collection, profile, appliedTradeIds: applied });
          stateRef.current = {
            userCollection: collection,
            trainerProfile: profile,
          };
          setUserCollection(collection);
          setTrainerProfile(profile);
        }
      } else if (!proposalResult.success && showNotification)
        showToast(proposalResult.message || "信箱刷新失败。", "error");
      if (showNotification && listingResult.success && proposalResult.success)
        showToast(
          zh ? "交换信息已更新。" : "Trade information updated.",
          "success",
        );
    } catch {
      if (mounted.current && showNotification)
        showToast(
          zh ? "刷新失败，请重试。" : "Refresh failed. Please retry.",
          "error",
        );
    } finally {
      syncing.current = false;
      if (mounted.current) setIsCloudTradeSyncing(false);
    }
  };
  useEffect(() => {
    void refreshCloudListings(false);
    const onFocus = () => {
      void refreshCloudListings(false);
    };
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refreshCloudListings(false);
    }, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [user?.id]);

  // Card Count updater
  const handleUpdateCount = (cardId: string, delta: number) => {
    setScanUndo(null);
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
        showToast(`${getCardName(card)}: ${newCount}`, "success");
      }

      return {
        ...prev,
        [cardId]: updated,
      };
    });
  };

  // Toggle Wishlist
  const handleToggleWishlist = (cardId: string) => {
    setScanUndo(null);
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
      const name = card ? getCardName(card) : "Card";

      showToast(
        newWish ? `❤️ ${name} +` : `${name} -`,
        newWish ? "success" : "info",
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
    setScanUndo(null);
    const card = CARD_MAP.get(cardId);
    if (card && !isCardTradeable(card)) {
      const reason = getTradeRestrictionReason(card);
      showToast(
        `🔒 ${reason?.title || "官方禁止交换"}: ${reason?.description || "此卡牌不可交换"}`,
        "error",
      );
      return;
    }

    setUserCollection((prev) => {
      const current = prev[cardId];
      if (!current || current.count <= 0) return prev;

      const isForTrade = current.forTradeCount > 0;
      const newForTrade = isForTrade ? 0 : Math.max(1, current.count - 1);

      const card = CARD_MAP.get(cardId);
      const name = card ? getCardName(card) : "Card";
      showToast(
        newForTrade > 0 ? `🔄 ${name} (x${newForTrade})` : `${name}`,
        "info",
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

  // Publication waits for cloud confirmation; failures remain private and can be retried from My Trades.
  const handleCreateListing = async (
    newListing: TradeListing,
  ): Promise<boolean> => {
    if (!user) {
      onSignIn();
      return false;
    }
    const updatedProfile = {
      ...trainerProfile,
      name: newListing.trainerName,
      friendCode: normalizeFriendCode(newListing.friendCode),
    };
    try {
      await registerTrainer(updatedProfile);
    } catch (error) {
      showToast(
        (error as { message?: string }).message || "保存好友码失败。",
        "error",
      );
      return false;
    }
    if (!mounted.current) return false;
    setTrainerProfile(updatedProfile);
    saveTrainerProfile(updatedProfile);
    const publishing = {
      ...newListing,
      ownerId: user.id,
      publishState: "publishing" as const,
      isUserListing: true,
    };
    setListings((prev) => [
      publishing,
      ...prev.filter((l) => l.id !== publishing.id),
    ]);
    const result = await publishCloudTradeListing(publishing);
    if (!mounted.current) return false;
    setListings((prev) =>
      prev.map((l) =>
        l.id === publishing.id
          ? { ...l, publishState: result.success ? "published" : "failed" }
          : l,
      ),
    );
    if (!result.success) {
      showToast(result.message || "发布失败，请在我的挂单中重试。", "error");
      return false;
    }
    showToast(
      zh ? "挂单已发布，有效期7天。" : "Listing published for 7 days.",
      "success",
    );
    const cloud = await fetchCloudTradeListings();
    if (mounted.current && cloud.success) {
      setListings((local) =>
        mergeCloudListings(local, cloud.listings || [], user.id),
      );
      const offerIds = new Set(publishing.offerCardIds),
        wantIds = new Set(publishing.wantCardIds);
      const matches: MatchedListingInfo[] = (cloud.listings || [])
        .filter((l) => l.ownerId !== user.id)
        .flatMap((l) => {
          const gets = (l.offerCardIds || [])
            .filter((id) => wantIds.has(id))
            .map((id) => CARD_MAP.get(id))
            .filter(Boolean) as PokemonCard[];
          const gives = (l.wantCardIds || [])
            .filter((id) => offerIds.has(id))
            .map((id) => CARD_MAP.get(id))
            .filter(Boolean) as PokemonCard[];
          return gets.length && gives.length
            ? [
                {
                  listing: l,
                  matchType: "perfect" as const,
                  userWillGet: gets,
                  userWillGive: gives,
                },
              ]
            : [];
        });
      if (matches.length) setInstantMatches(matches);
    }
    return true;
  };
  const handleRequestTradeFromListing = async (listing: TradeListing) => {
    if (!user) {
      onSignIn();
      return;
    }
    if (listing.ownerId === user.id || listing.publishState !== "published")
      return;
    const offers = (listing.offerCardIds || [listing.offerCardId])
      .map((id) => CARD_MAP.get(id))
      .filter(Boolean) as PokemonCard[];
    const wants = (listing.wantCardIds || [listing.wantCardId])
      .map((id) => CARD_MAP.get(id))
      .filter(Boolean) as PokemonCard[];
    const give =
      wants.find((c) => (userCollection[c.id]?.forTradeCount || 0) > 0) ||
      wants.find((c) => (userCollection[c.id]?.count || 0) > 1);
    const get =
      offers.find((c) => userCollection[c.id]?.inWishlist) ||
      offers.find((c) => !userCollection[c.id]?.count) ||
      offers[0];
    if (!give || !get) {
      showToast(
        zh
          ? "请先记录可出的卡牌，或在图鉴中标记愿意交换的卡。"
          : "Record a duplicate or mark a card for trade first.",
        "info",
      );
      return;
    }
    setTradeExecutionData({
      giveCard: give,
      getCard: get,
      partnerName: listing.trainerName,
      partnerFriendCode: listing.friendCode,
      listingId: listing.id,
    });
  };
  const handleConfirmTradeExecution = async (options: {
    hasFlair: boolean;
    hasGoldFrame: boolean;
  }): Promise<boolean> => {
    if (!user || !tradeExecutionData || operationBusy.current) return false;
    operationBusy.current = true;
    try {
      const { giveCard, getCard, proposalId, listingId } = tradeExecutionData;
      if ((stateRef.current.userCollection[giveCard.id]?.count || 0) < 1)
        throw new Error("出卡数量不足，请核对收藏。");
      let result;
      if (proposalId) result = await respondCloudTrade(proposalId, "confirm");
      else {
        await registerTrainer(stateRef.current.trainerProfile);
        const proposal: TradeProposal = {
          id: crypto.randomUUID(),
          listingId,
          fromUserId: user.id,
          fromTrainerName: trainerProfile.name,
          fromFriendCode: normalizeFriendCode(trainerProfile.friendCode),
          toTrainerName: tradeExecutionData.partnerName,
          toFriendCode: tradeExecutionData.partnerFriendCode,
          offerCardId: giveCard.id,
          wantCardId: getCard.id,
          status: "pending",
          createdAt: Date.now(),
          ...options,
        };
        result = await sendCloudTradeProposal(proposal);
      }
      if (!result.success)
        throw new Error(result.message || "操作失败，请重试。");
      if (!mounted.current) return false;
      await refreshCloudListings(false);
      showToast(
        proposalId
          ? zh
            ? "已记录你的完成确认，双方确认后更新收藏。"
            : "Your confirmation is saved. Collection updates after both confirm."
          : zh
            ? "交换意向已送达，等待对方接受。"
            : "Offer delivered. Waiting for acceptance.",
        "success",
      );
      return true;
    } catch (error) {
      if (mounted.current)
        showToast(
          (error as { message?: string }).message || "操作失败，请重试。",
          "error",
        );
      return false;
    } finally {
      operationBusy.current = false;
    }
  };
  const handleAcceptProposal = async (proposal: TradeProposal) => {
    if (!user || operationBusy.current) return;
    const sender = proposal.fromUserId === user.id;
    if (proposal.status === "pending") {
      if (sender) return;
      operationBusy.current = true;
      const result = await respondCloudTrade(proposal.id, "accept");
      operationBusy.current = false;
      if (!mounted.current) return;
      if (!result.success) {
        showToast(result.message || "接受失败，请重试。", "error");
        return;
      }
      await refreshCloudListings(false);
      showToast(
        zh
          ? "已接受，请先在游戏内完成交换，再确认。"
          : "Accepted. Complete the trade in-game before confirming.",
        "info",
      );
      return;
    }
    const give = CARD_MAP.get(
        sender ? proposal.offerCardId : proposal.wantCardId,
      ),
      get = CARD_MAP.get(sender ? proposal.wantCardId : proposal.offerCardId);
    if (give && get)
      setTradeExecutionData({
        giveCard: give,
        getCard: get,
        partnerName: sender ? proposal.toTrainerName : proposal.fromTrainerName,
        partnerFriendCode: sender
          ? proposal.toFriendCode
          : proposal.fromFriendCode,
        proposalId: proposal.id,
        listingId: proposal.listingId,
      });
  };
  const handleDeclineProposal = async (proposalId: string) => {
    const result = await respondCloudTrade(proposalId, "decline");
    if (!mounted.current) return;
    if (!result.success) {
      showToast(result.message || "撤销失败，请重试。", "error");
      return;
    }
    await refreshCloudListings(false);
  };
  const handleDeleteListing = async (listingId: string) => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing || listing.ownerId !== user?.id) return;
    if (listing.publishState === "published") {
      const result = await removeCloudTradeListing(listingId);
      if (!mounted.current) return;
      if (!result.success) {
        showToast(result.message || "撤销失败，请重试。", "error");
        return;
      }
    }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    showToast(zh ? "挂单已撤销。" : "Listing cancelled.", "info");
  };

  // Smart Match count for badge in navbar
  const smartMatchCount = useMemo(() => {
    let count = 0;
    listings.forEach((listing) => {
      if (listing.isUserListing) return;
      const userHasWhatTheyWant =
        (userCollection[listing.wantCardId]?.count || 0) > 0;
      const userWantsWhatTheyOffer =
        !!userCollection[listing.offerCardId]?.inWishlist;
      if (userHasWhatTheyWant && userWantsWhatTheyOffer) {
        count++;
      }
    });
    return count;
  }, [listings, userCollection]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      <Suspense
        fallback={
          <div
            role="status"
            className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/80 text-slate-200"
          >
            {zh ? "正在加载…" : "Loading…"}
          </div>
        }
      >
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          trainerProfile={trainerProfile}
          proposals={proposals}
          onOpenMyTrades={() => setShowMyTradesModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
        />

        <div className="max-w-7xl w-full mx-auto px-4 pt-3 flex flex-wrap justify-between gap-3 text-xs text-slate-400">
          <span>
            {zh
              ? "寻找交换伙伴；卡牌交换需在游戏内完成。"
              : "Find a partner here; complete card trades in the game."}
          </span>
          {user ? (
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) showToast(error.message, "error");
              }}
              className="text-sky-300"
            >
              {user.email} · {zh ? "退出账号" : "Sign out"}
            </button>
          ) : (
            <button onClick={onSignIn} className="text-sky-300">
              {zh
                ? "登录发布挂单／接收消息"
                : "Sign in to publish & receive offers"}
            </button>
          )}
        </div>

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "market" &&
            Object.keys(userCollection).length === 0 && (
              <div className="flex flex-wrap justify-between gap-3 p-4 mb-4 bg-sky-950/30 rounded-xl text-sm">
                <span>
                  {zh
                    ? "先记录你能出的卡和想要的卡，即可找到双向匹配。"
                    : "Record cards you can offer and cards you want to find mutual matches."}
                </span>
                <button
                  onClick={() => setActiveTab("collection")}
                  className="text-sky-300"
                >
                  {zh ? "记录卡牌" : "Record cards"}
                </button>
              </div>
            )}
          {scanUndo && (
            <div className="flex justify-between p-3 mb-3 bg-sky-950/40 text-sm rounded-xl">
              <span>
                {zh
                  ? "截图导入已应用，可撤销最近一次导入。"
                  : "Screenshot import applied. You can undo the last import."}
              </span>
              <button
                onClick={() => {
                  setUserCollection(scanUndo);
                  setScanUndo(null);
                }}
                className="text-sky-300"
              >
                {zh ? "撤销导入" : "Undo import"}
              </button>
            </div>
          )}
          {activeTab === "collection" && (
            <CollectionTracker
              userCollection={userCollection}
              onUpdateCount={handleUpdateCount}
              onToggleWishlist={handleToggleWishlist}
              onToggleForTrade={handleToggleForTrade}
              onInspectCard={(card) => setInspectedCard(card)}
              onOpenScanner={() => setShowScannerModal(true)}
              onOpenRating={() => setShowRatingModal(true)}
              onOpenCloudSync={() => setShowCloudSyncModal(true)}
              trainerProfile={trainerProfile}
              initialPackFilter={packFilterForCollection}
            />
          )}

          {activeTab === "market" && (
            <TradeMarket
              cardFilter={marketCardFilter}
              onClearCardFilter={() => setMarketCardFilter(undefined)}
              listings={listings}
              userCollection={userCollection}
              onOpenCreateModal={() => {
                if (!user) {
                  onSignIn();
                  return;
                }
                setCreateTradeOfferCardId(undefined);
                setTradePrefillConfig(null);
                setShowCreateTradeModal(true);
              }}
              onAdoptRecommendation={(rarity, offerCardIds, wantCardIds) => {
                if (!user) {
                  onSignIn();
                  return;
                }
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

          {activeTab === "mart" && (
            <ErrorBoundary fallbackTitle="訓練家生活館加載異常">
              <TrainerMart
                onOpenDailyCheckIn={() => setShowDailyCheckInModal(true)}
              />
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
                onClick={() => setActiveTab("mart")}
                className="text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer"
              >
                {t("tabMart") || "補給商城"}
              </button>

              <button
                id="footer-coffee-btn"
                type="button"
                onClick={() => setShowCoffeeModal(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>{t("buyCoffee") || "请作者喝杯咖啡 ☕"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRatingModal(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {t("passport")}
              </button>

              <button
                type="button"
                onClick={() => setShowCloudSyncModal(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {t("cloudSync")}
              </button>
            </div>
          </div>
        </footer>

        {/* Create Trade Modal */}
        {showCreateTradeModal && (
          <CreateTradeModal
            zIndex={getModalZIndex("createTrade", 50)}
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
            zIndex={getModalZIndex("instantMatches", 50)}
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
            userId={user?.id}
            onRetryListing={handleCreateListing}
            zIndex={getModalZIndex("myTrades", 50)}
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
            zIndex={getModalZIndex("scanner", 50)}
            userCollection={userCollection}
            onClose={() => setShowScannerModal(false)}
            onImport={(imported) => {
              setScanUndo(userCollection);
              setUserCollection(imported);
            }}
            showToast={showToast}
            onInspectCard={(card) => setInspectedCard(card)}
          />
        )}

        {/* Collection Rating & Viral Showcase Modal */}
        {showRatingModal && (
          <CollectionRatingModal
            zIndex={getModalZIndex("rating", 50)}
            userCollection={userCollection}
            trainerProfile={trainerProfile}
            onClose={() => setShowRatingModal(false)}
            onInspectCard={(card) => setInspectedCard(card)}
          />
        )}

        {/* Trainer Profile Modal */}
        {showProfileModal && (
          <TrainerProfileModal
            zIndex={getModalZIndex("profile", 50)}
            profile={trainerProfile}
            onClose={() => setShowProfileModal(false)}
            onOpenCoffee={() => setShowCoffeeModal(true)}
            onSave={async (updated) => {
              try {
                if (user && updated.friendCode) await registerTrainer(updated);
                if (!mounted.current) return false;
                saveTrainerProfile(updated);
                setTrainerProfile(updated);
                showToast(t("save"), "success");
                return true;
              } catch (error) {
                showToast(
                  (error as { message?: string }).message ||
                    "保存失败，请重试。",
                  "error",
                );
                return false;
              }
            }}
          />
        )}

        {/* Buy Me a Coffee Modal */}
        {showCoffeeModal && (
          <BuyMeCoffeeModal
            zIndex={getModalZIndex("coffee", 70)}
            isOpen={showCoffeeModal}
            onClose={() => setShowCoffeeModal(false)}
            trainerProfile={trainerProfile}
            onUpdateTrainerProfile={(updated) => {
              setTrainerProfile(updated);
              saveTrainerProfile(updated);
            }}
            showToast={showToast}
          />
        )}

        {/* Cloud Sync Modal (方案A: 16位好友代码 + 6位引继码 Supabase 云端同步) */}
        {showCloudSyncModal && (
          <CloudSyncModal
            signedIn={!!user}
            onSignIn={onSignIn}
            zIndex={getModalZIndex("cloudSync", 50)}
            isOpen={showCloudSyncModal}
            onClose={() => setShowCloudSyncModal(false)}
            trainerProfile={trainerProfile}
            userCollection={userCollection}
            onSyncSuccess={(newProfile, newCollection) => {
              setScanUndo(null);
              setTrainerProfile(newProfile);
              setUserCollection(newCollection);
            }}
            showToast={showToast}
          />
        )}

        {/* Card Detail Modal - Inspector modal that floats on top of any view or open modal */}
        {inspectedCard && (
          <CardDetailModal
            zIndex={getModalZIndex("cardDetail", 75)}
            card={inspectedCard}
            status={userCollection[inspectedCard.id]}
            onClose={() => setInspectedCard(null)}
            onUpdateCount={handleUpdateCount}
            onToggleWishlist={handleToggleWishlist}
            onToggleForTrade={handleToggleForTrade}
            onFindTrades={(cardId) => {
              setMarketCardFilter(cardId);
              setInspectedCard(null);
              setActiveTab("market");
            }}
            onCreateListingWithCard={(cardId) => {
              if (!user) {
                onSignIn();
                return;
              }
              setCreateTradeOfferCardId(cardId);
              setTradePrefillConfig(null);
              setShowCreateTradeModal(true);
            }}
          />
        )}

        {/* Trade Execution Modal (Animated Card Swap) - Placed at end with highest stacking order */}
        {tradeExecutionData && (
          <TradeExecutionModal
            giveOptions={
              tradeExecutionData.proposalId
                ? undefined
                : ((
                    listings.find((l) => l.id === tradeExecutionData.listingId)
                      ?.wantCardIds || []
                  )
                    .map((id) => CARD_MAP.get(id))
                    .filter(
                      (c) => c && (userCollection[c.id]?.count || 0) > 0,
                    ) as PokemonCard[])
            }
            getOptions={
              tradeExecutionData.proposalId
                ? undefined
                : ((
                    listings.find((l) => l.id === tradeExecutionData.listingId)
                      ?.offerCardIds || []
                  )
                    .map((id) => CARD_MAP.get(id))
                    .filter(Boolean) as PokemonCard[])
            }
            onSelectCards={(giveId, getId) =>
              setTradeExecutionData((prev) =>
                prev
                  ? {
                      ...prev,
                      giveCard: CARD_MAP.get(giveId)!,
                      getCard: CARD_MAP.get(getId)!,
                    }
                  : null,
              )
            }
            mode={tradeExecutionData.proposalId ? "confirm" : "request"}
            zIndex={getModalZIndex("tradeExecution", 85)}
            giveCard={tradeExecutionData.giveCard}
            getCard={tradeExecutionData.getCard}
            partnerName={tradeExecutionData.partnerName}
            partnerFriendCode={tradeExecutionData.partnerFriendCode}
            onConfirm={handleConfirmTradeExecution}
            onClose={() => setTradeExecutionData(null)}
          />
        )}

        {/* Daily Check-in Mystery Box Modal */}
        {showDailyCheckInModal && (
          <DailyCheckInModal
            isOpen={showDailyCheckInModal}
            onClose={() => setShowDailyCheckInModal(false)}
            onPointsUpdated={() => {}}
            onGoToShop={() => {
              setShowDailyCheckInModal(false);
              setActiveTab("mart");
            }}
          />
        )}

        {/* Toast Notification - Floating above all dialogs */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[250] flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-xs font-semibold text-slate-100 animate-fade-in pointer-events-auto">
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            {toast.type === "info" && <Info className="w-4 h-4 text-sky-400" />}
            <span>{toast.message}</span>
          </div>
        )}
      </Suspense>
    </div>
  );
}
