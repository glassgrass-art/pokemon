import { TradeListing, UserCardStatus, TrainerProfile } from '../types';

export const INITIAL_TRAINER_PROFILE: TrainerProfile = {
  name: '小智 (Ash Ketchum)',
  friendCode: '4820-1940-5829-3177',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  bio: 'PTCG Pocket 收藏家！专注于收集全图☆、特画SAR☆☆与沉浸卡☆☆☆，手头有多张超梦和皮卡丘EX，欢迎同阶秒换！',
  completedTrades: 12,
};

// Initial collection state for user with some owned cards, duplicates, and wishlist
export const INITIAL_USER_COLLECTION: Record<string, UserCardStatus> = {
  'A1-036': { cardId: 'A1-036', count: 3, forTradeCount: 2, inWishlist: false, updatedAt: Date.now() }, // Charizard ex (4D) - Has 3, 2 for trade
  'A1-047': { cardId: 'A1-047', count: 2, forTradeCount: 1, inWishlist: false, updatedAt: Date.now() }, // Moltres ex (4D) - Has 2, 1 for trade
  'A1-096': { cardId: 'A1-096', count: 2, forTradeCount: 1, inWishlist: false, updatedAt: Date.now() }, // Pikachu ex (4D) - Has 2, 1 for trade
  'A1-129': { cardId: 'A1-129', count: 1, forTradeCount: 0, inWishlist: false, updatedAt: Date.now() }, // Mewtwo ex (4D) - Owns 1
  'A1a-032': { cardId: 'A1a-032', count: 1, forTradeCount: 0, inWishlist: false, updatedAt: Date.now() }, // Mew ex (4D) - Owns 1
  'A2-119': { cardId: 'A2-119', count: 2, forTradeCount: 1, inWishlist: false, updatedAt: Date.now() }, // Dialga ex (4D) - Has 2, 1 for trade
  'A1-282': { cardId: 'A1-282', count: 2, forTradeCount: 0, inWishlist: false, updatedAt: Date.now() }, // Mewtwo ex (3S Immersive) - Has duplicate, but 3S cannot be traded per official rules!

  // Wishlist items (0 owned or seeking more)
  'A1-104': { cardId: 'A1-104', count: 0, forTradeCount: 0, inWishlist: true, updatedAt: Date.now() }, // Zapdos ex (4D) - Wanted!
  'A1-084': { cardId: 'A1-084', count: 0, forTradeCount: 0, inWishlist: true, updatedAt: Date.now() }, // Articuno ex (4D) - Wanted!
  'A2-049': { cardId: 'A2-049', count: 0, forTradeCount: 0, inWishlist: true, updatedAt: Date.now() }, // Palkia ex (4D) - Wanted!
  'A1-252': { cardId: 'A1-252', count: 0, forTradeCount: 0, inWishlist: true, updatedAt: Date.now() }, // Gengar ex (1S Full Art) - Wanted!
  'A1-272': { cardId: 'A1-272', count: 0, forTradeCount: 0, inWishlist: true, updatedAt: Date.now() }, // Sabrina (2S SAR) - Wanted!
};

export const INITIAL_TRADE_LISTINGS: TradeListing[] = [
  {
    id: 'trade-001',
    trainerName: '赤红 (Red)',
    trainerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
    friendCode: '8910-2345-6712-9901',
    offerCardId: 'A1-104', // Zapdos ex (4D)
    wantCardId: 'A1-036', // Charizard ex (4D)
    note: '急需喷火龙EX组火神鸟卡组！闪电鸟EX现货，加好友秒换！',
    createdAt: Date.now() - 1000 * 60 * 12, // 12 mins ago
    status: 'active',
    tags: ['秒换', '4菱同阶', '热门'],
  },
  {
    id: 'trade-002',
    trainerName: '小霞 (Misty)',
    trainerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60',
    friendCode: '3124-7890-4412-8823',
    offerCardId: 'A1-084', // Articuno ex (4D)
    wantCardId: 'A1-096', // Pikachu ex (4D)
    note: '求皮神！多出一张急冻鸟EX，水箭龟急冻鸟卡组备件，随时在线。',
    createdAt: Date.now() - 1000 * 60 * 28, // 28 mins ago
    status: 'active',
    tags: ['4菱同阶', '水系'],
  },
  {
    id: 'trade-003',
    trainerName: '竹兰 (Cynthia)',
    trainerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60',
    friendCode: '5561-9023-1124-7788',
    offerCardId: 'A2-049', // Palkia ex (4D)
    wantCardId: 'A2-119', // Dialga ex (4D)
    note: '时空激斗同阶互换，帝牙卢卡换帕路奇亚EX，神奥组卡！',
    createdAt: Date.now() - 1000 * 60 * 45, // 45 mins ago
    status: 'active',
    tags: ['A2新卡', '神奥对决'],
  },
  {
    id: 'trade-004',
    trainerName: '小茂 (Gary)',
    trainerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
    friendCode: '7721-0092-3481-5519',
    offerCardId: 'A1-271', // Brock (2S)
    wantCardId: 'A1-272', // Sabrina (2S)
    note: '二星SAR特画互换！小刚换娜姿，同阶2星特画秒换！',
    createdAt: Date.now() - 1000 * 60 * 85, // 1.5 hours ago
    status: 'active',
    tags: ['2星SAR', '训练家'],
  },
  {
    id: 'trade-005',
    trainerName: '阿渡 (Lance)',
    trainerAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60',
    friendCode: '6620-1945-8831-2041',
    offerCardId: 'A1-253', // Machamp ex (1S Full Art)
    wantCardId: 'A1-252', // Gengar ex (1S Full Art)
    note: '一星☆全图卡1对1互换！多一张怪力全图☆，求换耿鬼全图☆！',
    createdAt: Date.now() - 1000 * 60 * 110,
    status: 'active',
    tags: ['1星全图', '同阶秒换'],
  },
  {
    id: 'trade-006',
    trainerName: '大木博士 (Prof. Oak)',
    trainerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60',
    friendCode: '1092-8834-5512-4401',
    offerCardId: 'A1-003', // Venusaur (3D)
    wantCardId: 'A1-035', // Charizard (3D)
    note: '三菱◊◊◊图鉴互换，妙蛙花求换喷火龙，常青森林见！',
    createdAt: Date.now() - 1000 * 60 * 130,
    status: 'active',
    tags: ['3菱同阶', '御三家'],
  },
];
