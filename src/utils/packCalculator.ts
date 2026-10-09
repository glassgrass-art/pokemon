import { CARDS_DATABASE, PACK_INFO } from '../data/cardsData';
import { PackExpansion, PackStats, Rarity, UserCardStatus } from '../types';

export function calculatePackStats(userCollection: Record<string, UserCardStatus>): PackStats[] {
  // Only evaluate packs that actually have cards in database
  const activePacks = Array.from(new Set(CARDS_DATABASE.map((c) => c.pack))) as PackExpansion[];

  const rarityWeights: Record<Rarity, number> = {
    '1D': 0.65, // common slots
    '2D': 0.40,
    '3D': 0.15,
    '4D': 0.08,
    '1S': 0.04,
    '2S': 0.02,
    '3S': 0.008,
    '1RS': 0.015,
    '2RS': 0.005,
    'CR': 0.002,
  };

  return activePacks.map((packKey) => {
    const packCards = CARDS_DATABASE.filter((c) => c.pack === packKey);
    const totalCards = packCards.length;

    let ownedCards = 0;
    let missingCards = 0;
    let expectedWeightSum = 0;

    const missingByRarity: Record<Rarity, number> = {
      '1D': 0,
      '2D': 0,
      '3D': 0,
      '4D': 0,
      '1S': 0,
      '2S': 0,
      '3S': 0,
      '1RS': 0,
      '2RS': 0,
      'CR': 0,
    };

    packCards.forEach((card) => {
      const status = userCollection[card.id];
      const isOwned = status && status.count > 0;
      if (isOwned) {
        ownedCards++;
      } else {
        missingCards++;
        missingByRarity[card.rarity] = (missingByRarity[card.rarity] || 0) + 1;
        const weight = rarityWeights[card.rarity] || 0.1;
        // If in wishlist, boost incentive
        const wishlistBonus = status?.inWishlist ? 1.5 : 1.0;
        expectedWeightSum += weight * wishlistBonus;
      }
    });

    const completionRate = totalCards > 0 ? (ownedCards / totalCards) * 100 : 0;
    // Normalize newCardExpectedRate to a realistic percentage
    const maxPossibleWeight = packCards.reduce((acc, c) => acc + (rarityWeights[c.rarity] || 0.1), 0);
    const newCardExpectedRate = maxPossibleWeight > 0 ? Math.min(99.9, Math.max(5.0, (expectedWeightSum / maxPossibleWeight) * 100)) : 0;

    const packMeta = PACK_INFO[packKey];

    return {
      pack: packKey,
      packName: packMeta ? packMeta.nameCn : packKey,
      totalCards,
      ownedCards,
      missingCards,
      completionRate: Math.round(completionRate * 10) / 10,
      newCardExpectedRate: Math.round(newCardExpectedRate * 10) / 10,
      missingByRarity,
    };
  });
}
