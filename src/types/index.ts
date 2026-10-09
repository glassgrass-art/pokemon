export type Rarity = '1D' | '2D' | '3D' | '4D' | '1S' | '2S' | '3S' | '1RS' | '2RS' | 'CR';

export type TrainerCategory = 'supporter' | 'item' | 'tool' | 'stadium';

export type PackExpansion =
  | 'A1'
  | 'A1a'
  | 'A2'
  | 'A2a'
  | 'A2b'
  | 'A3'
  | 'A3a'
  | 'A3b'
  | 'A4'
  | 'A4a'
  | 'A4b'
  | 'B1'
  | 'B1a'
  | 'B2'
  | 'B2a'
  | 'B3'
  | 'B3a'
  | 'B4'
  | 'B4a'
  | 'PROMO-A'
  | 'PROMO-B';

export type SupportedLanguage =
  | 'zh-Hant'
  | 'en'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'it'
  | 'pt';

export type EnergyType =
  | 'grass'
  | 'fire'
  | 'water'
  | 'lightning'
  | 'psychic'
  | 'fighting'
  | 'darkness'
  | 'metal'
  | 'colorless'
  | 'trainer';

export interface CardAttack {
  name: string;
  damage?: string | number;
  cost?: string[];
  effect?: string;
}

export interface PokemonCard {
  id: string;
  localId?: string;
  nameCn: string;
  nameEn: string;
  names?: Record<string, string>;
  pack: PackExpansion;
  packName?: string;
  expansionCode: string;
  cardNumber: string;
  totalInSet: number;
  rarity: Rarity;
  type: EnergyType;
  hp?: number;
  stage?: string;
  attacks?: CardAttack[];
  retreat?: number;
  weakness?: string;
  imageUrl?: string;
  image?: string;
  imageJa?: string;
  isEx?: boolean;
  illustrator?: string;
  supertype?: 'Pokémon' | 'Trainer';
  trainerCategory?: TrainerCategory;
}

export interface UserCardStatus {
  cardId: string;
  count: number; // 0: 未拥有, 1: 拥有1张, 2+: 拥有多张
  forTradeCount: number; // 标记可用于交换的数量
  inWishlist: boolean; // 是否加入心愿单
  updatedAt: number;
}

export interface TradeListing {
  id: string;
  trainerName: string;
  trainerAvatar: string;
  friendCode: string;
  offerCardId: string;
  wantCardId: string;
  offerCardIds?: string[];
  wantCardIds?: string[];
  rarity?: Rarity;
  note?: string;
  createdAt: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  isUserListing?: boolean;
  tags?: string[];
}

export interface TradeProposal {
  id: string;
  listingId?: string;
  fromTrainerName: string;
  fromTrainerAvatar?: string;
  fromFriendCode: string;
  toTrainerName: string;
  toFriendCode: string;
  offerCardId: string;
  wantCardId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: number;
  message?: string;
}

export interface TrainerProfile {
  name: string;
  friendCode: string;
  avatar: string;
  bio: string;
  completedTrades: number;
  isSupporter?: boolean;
  supporterBadge?: string;
  supporterCups?: number;
  supporterSince?: number;
}

export interface CoffeeSupporter {
  id: string;
  name: string;
  avatar: string;
  cups: number;
  amount: string;
  message: string;
  date: number;
  badge?: string;
}

export interface TradeMatchResult {
  trainerName: string;
  trainerAvatar: string;
  friendCode: string;
  theyGiveCardId: string; // The card you want and they have
  theyWantCardId: string; // The card they want and you have duplicate of
  matchType: 'mutual' | 'they_have_your_wish' | 'they_want_your_dup';
  rarity: Rarity;
  listingId?: string;
}

export interface PackStats {
  pack: PackExpansion;
  packName: string;
  totalCards: number;
  ownedCards: number;
  missingCards: number;
  completionRate: number;
  newCardExpectedRate: number; // 概率权重估算
  missingByRarity: Record<Rarity, number>;
}
