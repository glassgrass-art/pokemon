import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyCompletedTrade,
  mergeCloudListings,
  mergeCloudProposals,
  normalizeFriendCode,
} from "../src/utils/tradeState";
import type { TradeListing, TradeProposal } from "../src/types";
const listing: TradeListing = {
  id: "l",
  ownerId: "u",
  trainerName: "A",
  trainerAvatar: "",
  friendCode: "1234567890123456",
  offerCardId: "a",
  wantCardId: "b",
  createdAt: 1,
  status: "active",
  publishState: "published",
};
const proposal: TradeProposal = {
  id: "p",
  fromUserId: "u",
  toUserId: "v",
  fromTrainerName: "A",
  toTrainerName: "B",
  fromFriendCode: "",
  toFriendCode: "",
  offerCardId: "a",
  wantCardId: "b",
  status: "completed",
  createdAt: 1,
};
test("empty cloud clears stale listings while preserving only private account drafts", () => {
  assert.deepEqual(mergeCloudListings([listing], [], "u"), []);
  assert.deepEqual(
    mergeCloudListings([{ ...listing, publishState: "failed" }], [], "v"),
    [],
  );
  assert.equal(
    mergeCloudListings([{ ...listing, publishState: "failed" }], [], "u")
      .length,
    1,
  );
});
test("cloud state overwrites existing proposal and excludes other accounts", () => {
  const local = { ...proposal, status: "pending" as const };
  assert.equal(
    mergeCloudProposals([local], [proposal], "u")[0].status,
    "completed",
  );
  assert.deepEqual(mergeCloudProposals([local], [], "x"), []);
});
test("both trade directions update inventory once, and pending trades never do", () => {
  const profile = {
    name: "A",
    avatar: "",
    friendCode: "",
    bio: "",
    completedTrades: 0,
  };
  const collection = {
    a: {
      cardId: "a",
      count: 2,
      forTradeCount: 1,
      inWishlist: false,
      updatedAt: 0,
    },
  };
  const first = applyCompletedTrade(collection, profile, proposal, "u", [])!;
  assert.equal(first.collection.a.count, 1);
  assert.equal(first.collection.b.count, 1);
  assert.equal(first.profile.completedTrades, 1);
  assert.equal(
    applyCompletedTrade(
      first.collection,
      first.profile,
      proposal,
      "u",
      first.appliedTradeIds,
    ),
    null,
  );
  assert.equal(
    applyCompletedTrade(
      collection,
      profile,
      { ...proposal, status: "accepted" },
      "u",
      [],
    ),
    null,
  );
  const reverse = applyCompletedTrade(
    { b: { ...collection.a, cardId: "b" } },
    profile,
    proposal,
    "v",
    [],
  )!;
  assert.equal(reverse.collection.b.count, 1);
  assert.equal(reverse.collection.a.count, 1);
  assert.throws(
    () => applyCompletedTrade({}, profile, proposal, "u", []),
    /数量/,
  );
});
test("friend codes have one canonical format", () =>
  assert.equal(normalizeFriendCode("1234-5678 9012-3456"), "1234567890123456"));
