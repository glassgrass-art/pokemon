/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CrowdfundedRafflePool {
  id: string;
  badge: string;
  badgeJa: string;
  badgeEn: string;
  badgeColor: string;
  title: string;
  titleJa: string;
  titleEn: string;
  prizeItemName: string;
  prizeValueDisplay: string;
  prizeImageUrl: string;
  targetPoints: number;
  currentPoints: number;
  costPerShare: number;
  totalSharesNeeded: number;
  currentSharesSold: number;
  countdownDays: number;
  countdownHours: number;
  recentContributors: Array<{
    trainerName: string;
    flag: string;
    shares: number;
    points: number;
    timeAgo: string;
  }>;
}

export const CROWDFUNDED_POOLS: CrowdfundedRafflePool[] = [
  {
    id: 'pool-gengar-deck-box',
    badge: '👑 热门周边池 (满20注开奖)',
    badgeJa: '👑 人気サプライ池 (20口で抽選)',
    badgeEn: 'Popular Supplies Pool (20 Entries)',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    title: 'Ultra PRO 宝可梦官方授权 耿鬼高级皮革磁吸卡盒 (全球包邮寄送)',
    titleJa: 'UP Elite ゲンガー プレミアム合皮製デッキケース (公式ライセンス)',
    titleEn: 'Ultra PRO Pokémon Gengar Premium Debossed Flip Deck Box',
    prizeItemName: '耿鬼 Alcove 磁吸翻盖高级皮革卡盒',
    prizeValueDisplay: '¥3,300 JPY / $25 USD',
    prizeImageUrl: '/src/assets/images/gengar_deck_box_1790861313395.jpg',
    targetPoints: 10000,
    currentPoints: 7500,
    costPerShare: 500,
    totalSharesNeeded: 20,
    currentSharesSold: 15,
    countdownDays: 2,
    countdownHours: 14,
    recentContributors: [
      { trainerName: 'Red_Pallet', flag: '🇯🇵', shares: 2, points: 1000, timeAgo: '12分钟前' },
      { trainerName: 'Ash_Ketchum', flag: '🇺🇸', shares: 1, points: 500, timeAgo: '45分钟前' },
      { trainerName: 'Steven_Stone', flag: '🇬🇧', shares: 3, points: 1500, timeAgo: '2小时前' },
      { trainerName: 'Cynthia_Garchomp', flag: '🇩🇪', shares: 2, points: 1000, timeAgo: '4小时前' },
      { trainerName: 'Takeshi_Gym', flag: '🇯🇵', shares: 1, points: 500, timeAgo: '6小时前' },
    ],
  },
  {
    id: 'pool-booster-box-choden',
    badge: '🔥 终极原盒池 (满40注开奖)',
    badgeJa: '🔥 究極BOX池 (40口で抽選)',
    badgeEn: 'Ultimate Booster Box Pool (40 Entries)',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    title: '日版扩充包「超电突围 / 超电Breaker」正版原盒整盒 (30包入 塑封未拆)',
    titleJa: '拡張パック 超電ブレイカー BOX (30パック入 シュリンク付未開封)',
    titleEn: 'Japanese Booster Box: Super Electric Breaker (30 Packs Factory Sealed)',
    prizeItemName: '超电突围 30包原厂塑封原盒整盒',
    prizeValueDisplay: '¥6,000 JPY / $42 USD',
    prizeImageUrl: '/src/assets/images/bundle_box_1790460026615.jpg',
    targetPoints: 40000,
    currentPoints: 28000,
    costPerShare: 1000,
    totalSharesNeeded: 40,
    currentSharesSold: 28,
    countdownDays: 4,
    countdownHours: 9,
    recentContributors: [
      { trainerName: 'PikachuFan99', flag: '🇺🇸', shares: 3, points: 3000, timeAgo: '18分钟前' },
      { trainerName: 'Satoshi_Tokyo', flag: '🇯🇵', shares: 5, points: 5000, timeAgo: '1小时前' },
      { trainerName: 'Gary_Oak', flag: '🇺🇸', shares: 2, points: 2000, timeAgo: '3小时前' },
      { trainerName: 'Leon_Champion', flag: '🇬🇧', shares: 4, points: 4000, timeAgo: '5小时前' },
    ],
  },
];
