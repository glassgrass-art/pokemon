import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS_DATABASE } from "../src/data/cardsData";
import { getCardNameIndex } from "../src/utils/cardNameMatcher";
import {
  calculateDctSimilarity,
  getPrecomputedCardHashes,
} from "../src/utils/perceptualHash";
import {
  applyScanResultsToCollection,
  type ScannedCardSlot,
} from "../src/utils/dexScanner";
import { matchCardAgainstFullDex } from "../src/scanCardMatcher";

test("scanner does not guess silhouette identity or invent a score for an unavailable set", () => {
  const matcher = getCardNameIndex();
  const query = new Uint32Array(6);
  assert.equal(
    matcher.matchTwoStepSlot(query, { isOwned: false, expectedIndex: 20 }).card,
    null,
  );
  const missing = matcher.matchTwoStepSlot(query, {
    targetPack: "nonexistent",
  });
  assert.equal(missing.card, null);
  assert.equal(missing.confidencePct, 0);
  const hash = getPrecomputedCardHashes()[0];
  const ambiguous = matcher.matchTwoStepSlot(hash.hashBuf);
  assert.equal(ambiguous.margin, 0);
  assert.ok(ambiguous.candidates!.length > 1);
  const inverse = new Uint32Array([...hash.hashBuf].map((n) => ~n));
  const match = matcher.matchTwoStepSlot(inverse, {
    recognizedName: hash.card.nameEn,
    targetPack: hash.card.pack,
  });
  assert.ok(match.card);
  const selected = getPrecomputedCardHashes().find(
    (h) => h.cardId === match.card!.id,
  )!;
  assert.equal(
    match.confidencePct,
    Math.round(
      calculateDctSimilarity(inverse, selected.hashBuf).similarity * 100,
    ),
  );
});

test("AI matching rejects ambiguous variants and honors exact card number and set", () => {
  const variants = [
    { id: "a", nameEn: "Pikachu", pack: "A1", cardNumber: "001", rarity: "1D" },
    { id: "b", nameEn: "Pikachu", pack: "A1", cardNumber: "002", rarity: "1D" },
  ];
  assert.equal(matchCardAgainstFullDex({ nameEn: "Pikachu" }, variants), null);
  assert.equal(
    matchCardAgainstFullDex(
      { nameEn: "Pikachu", packCode: "A1", cardNumber: "002" },
      variants,
    )?.id,
    "b",
  );
  assert.equal(
    matchCardAgainstFullDex(
      { nameEn: "Pikachu", packCode: "A2", cardNumber: "002" },
      variants,
    ),
    null,
  );
  assert.equal(matchCardAgainstFullDex({}, variants), null);
});

test("partial screenshots preserve unseen inventory and clamp trade quantities on replacement", () => {
  const card = CARDS_DATABASE.find((c) => c.pack === "A1")!;
  const unseen = CARDS_DATABASE.find(
    (c) => c.pack === "A1" && c.id !== card.id,
  )!;
  const collection = {
    [card.id]: {
      cardId: card.id,
      count: 9,
      forTradeCount: 8,
      inWishlist: false,
      updatedAt: 1,
    },
    [unseen.id]: {
      cardId: unseen.id,
      count: 6,
      forTradeCount: 2,
      inWishlist: true,
      updatedAt: 1,
    },
  };
  const slot: ScannedCardSlot = {
    id: "slot-0",
    card,
    owned: true,
    count: 2,
    confidence: 0.6,
    box: { x: 0, y: 0, width: 1, height: 1 },
  };
  const replaced = applyScanResultsToCollection(
    collection,
    [slot],
    "overwrite_pack",
    "A1",
  );
  assert.equal(replaced[card.id].count, 2);
  assert.equal(replaced[card.id].forTradeCount, 2);
  assert.deepEqual(replaced[unseen.id], collection[unseen.id]);
  assert.equal(collection[card.id].count, 9);
  const merged = applyScanResultsToCollection(
    collection,
    [slot, slot],
    "merge",
  );
  assert.equal(merged[card.id].count, 9);
  assert.deepEqual(
    applyScanResultsToCollection(
      collection,
      [{ ...slot, includeInImport: false }],
      "overwrite_pack",
      "A1",
    ),
    collection,
  );
  assert.deepEqual(
    applyScanResultsToCollection(collection, [], "overwrite_pack", "A1"),
    collection,
  );
});
