import type {
  TradeListing,
  TradeProposal,
  TrainerProfile,
  UserCardStatus,
} from "../types";

export const normalizeFriendCode = (value: string) => value.replace(/\D/g, "");
export const formatFriendCode = (value: string) =>
  normalizeFriendCode(value)
    .match(/.{1,4}/g)
    ?.join("-") || "";

export function mergeCloudListings(
  local: TradeListing[],
  cloud: TradeListing[],
  userId?: string,
) {
  const ids = new Set(cloud.map((l) => l.id));
  return [
    ...local.filter(
      (l) =>
        l.ownerId === userId &&
        l.publishState !== "published" &&
        !ids.has(l.id),
    ),
    ...cloud.map((l) => ({
      ...l,
      isUserListing: !!userId && l.ownerId === userId,
      publishState: "published" as const,
    })),
  ];
}

export function mergeCloudProposals(
  local: TradeProposal[],
  cloud: TradeProposal[],
  userId: string,
) {
  const byId = new Map(
    local
      .filter((p) => p.fromUserId === userId || p.toUserId === userId)
      .map((p) => [p.id, p]),
  );
  cloud.forEach((p) => byId.set(p.id, p));
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function applyCompletedTrade(
  collection: Record<string, UserCardStatus>,
  profile: TrainerProfile,
  proposal: TradeProposal,
  userId: string,
  appliedTradeIds: string[],
) {
  if (
    proposal.status !== "completed" ||
    appliedTradeIds.includes(proposal.id) ||
    (proposal.fromUserId !== userId && proposal.toUserId !== userId)
  )
    return null;
  const sender = proposal.fromUserId === userId;
  const giveId = sender ? proposal.offerCardId : proposal.wantCardId;
  const getId = sender ? proposal.wantCardId : proposal.offerCardId;
  // Inventory is user-maintained. Do not invent a received card when the recorded inventory conflicts.
  if ((collection[giveId]?.count || 0) < 1)
    throw new Error("收藏数量与已完成交换不一致，请核对出卡数量后再刷新信箱。");
  const next = { ...collection };
  const give = next[giveId];
  next[giveId] = {
    ...give,
    count: give.count - 1,
    forTradeCount: Math.min(
      give.count - 1,
      Math.max(0, give.forTradeCount - 1),
    ),
    updatedAt: Date.now(),
  };
  const get = next[getId] || {
    cardId: getId,
    count: 0,
    forTradeCount: 0,
    inWishlist: false,
    updatedAt: 0,
  };
  next[getId] = {
    ...get,
    count: get.count + 1,
    inWishlist: false,
    updatedAt: Date.now(),
  };
  return {
    collection: next,
    profile: { ...profile, completedTrades: profile.completedTrades + 1 },
    appliedTradeIds: [...appliedTradeIds, proposal.id],
  };
}
