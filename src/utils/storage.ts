import { UserCardStatus, TradeListing, TradeProposal, TrainerProfile } from '../types';
import { INITIAL_USER_COLLECTION, INITIAL_TRADE_LISTINGS, INITIAL_TRAINER_PROFILE } from '../data/mockTrades';

const STORAGE_KEYS = {
  COLLECTION: 'ptcgp_user_collection_v1',
  TRADES: 'ptcgp_trade_listings_v1',
  PROPOSALS: 'ptcgp_trade_proposals_v1',
  PROFILE: 'ptcgp_trainer_profile_v1',
};

export function loadUserCollection(): Record<string, UserCardStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTION);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse collection from localStorage:', e);
  }
  return { ...INITIAL_USER_COLLECTION };
}

export function saveUserCollection(collection: Record<string, UserCardStatus>) {
  try {
    localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
  } catch (e) {
    console.warn('Failed to save collection:', e);
  }
}

export function loadTradeListings(): TradeListing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRADES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse trades from localStorage:', e);
  }
  return [...INITIAL_TRADE_LISTINGS];
}

export function saveTradeListings(listings: TradeListing[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(listings));
  } catch (e) {
    console.warn('Failed to save trades:', e);
  }
}

export function loadTradeProposals(): TradeProposal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROPOSALS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse proposals:', e);
  }
  // Initial sample proposal from Red
  return [
    {
      id: 'prop-sample-01',
      listingId: 'trade-001',
      fromTrainerName: '赤红 (Red)',
      fromFriendCode: '8910-2345-6712-9901',
      toTrainerName: '小智 (Ash)',
      toFriendCode: '4820-1940-5829-3177',
      offerCardId: 'A1-204', // Red gives Zapdos EX
      wantCardId: 'A1-004', // Red wants Charizard EX
      status: 'pending',
      createdAt: Date.now() - 1000 * 60 * 15,
      message: '兄弟！看到你有2张多余喷火龙EX，换我的闪电鸟EX吗？随时可以上号！',
    }
  ];
}

export function saveTradeProposals(proposals: TradeProposal[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals));
  } catch (e) {
    console.warn('Failed to save proposals:', e);
  }
}

export function loadTrainerProfile(): TrainerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse profile:', e);
  }
  return { ...INITIAL_TRAINER_PROFILE };
}

export function saveTrainerProfile(profile: TrainerProfile) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save profile:', e);
  }
}
