import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROFILE,
  getAppliedTradeIds,
  getStorageKey,
  loadUserCollection,
  saveSnapshot,
  setStorageOwner,
} from "../src/utils/storage";
test("account snapshots and trade receipts remain isolated, including in-flight reads of the previous account", () => {
  const values = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  } as unknown as Storage;
  setStorageOwner("alice");
  saveSnapshot({
    collection: {
      a: {
        cardId: "a",
        count: 2,
        forTradeCount: 1,
        inWishlist: false,
        updatedAt: 0,
      },
    },
    profile: { ...EMPTY_PROFILE },
    appliedTradeIds: ["completed"],
  });
  setStorageOwner("bob");
  assert.deepEqual(loadUserCollection(), {});
  assert.deepEqual(getAppliedTradeIds(), []);
  assert.deepEqual(getAppliedTradeIds("alice"), ["completed"]);
  setStorageOwner("alice");
  assert.equal(loadUserCollection().a.count, 2);
  values.set(getStorageKey("snapshot"), "invalid json");
  assert.deepEqual(loadUserCollection(), {});
  assert.equal(
    values.get(getStorageKey("snapshot") + "_recovery"),
    "invalid json",
  );
  setStorageOwner();
});
