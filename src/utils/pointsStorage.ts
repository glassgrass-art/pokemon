/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CheckInResult {
  success: boolean;
  pointsAdded: number;
  ballType: 'poke' | 'great' | 'ultra' | 'master';
  isCrit: boolean;
  isSeventhDayCrit: boolean;
  isMonthlyBonus: boolean;
  newStreak: number;
  newBalance: number;
  message: string;
}

export interface UserOrderClaim {
  orderId: string;
  amount: number;
  currency: 'JPY' | 'USD' | 'EUR' | 'GBP';
  pointsEarned: number;
  item: string;
  date: string;
  contactEmail?: string;
  status: 'verified';
}

export interface PoolTicketEntry {
  poolId: string;
  ticketCode: string;
  shares: number;
  pointsSpent: number;
  timestamp: number;
  date: string;
}

export interface UserPointsState {
  points: number;
  lifetimeEarned: number;
  lastCheckInDate: string | null; // 'YYYY-MM-DD'
  lastDoubledDate?: string | null; // 'YYYY-MM-DD' - date when social share bonus was claimed
  todayBasePoints?: number; // base points earned from today's blind box
  currentStreak: number;
  maxStreak: number;
  monthlyCheckIns: string[]; // List of 'YYYY-MM-DD'
  repairCardsCount: number;
  monthlyRepairsUsed: number;
  hasActivatedOrder: boolean;
  claimsHistory: UserOrderClaim[];
  poolEntries: PoolTicketEntry[];
}

const POINTS_STORAGE_KEY = 'ptcgp_trainer_points_state_v1';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthPrefix(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getDaysInCurrentMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const DEFAULT_STATE: UserPointsState = {
  points: 120, // Initial starter bonus for engaging UX
  lifetimeEarned: 120,
  lastCheckInDate: null,
  currentStreak: 0,
  maxStreak: 0,
  monthlyCheckIns: [],
  repairCardsCount: 1, // 1 free starter streak repair card
  monthlyRepairsUsed: 0,
  hasActivatedOrder: false,
  claimsHistory: [],
  poolEntries: [],
};

export function loadPointsState(): UserPointsState {
  try {
    const raw = localStorage.getItem(POINTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up monthly checkins if month changed
      const currentPrefix = getCurrentMonthPrefix();
      if (parsed.monthlyCheckIns && parsed.monthlyCheckIns.length > 0) {
        const firstEntry = parsed.monthlyCheckIns[0];
        if (!firstEntry.startsWith(currentPrefix)) {
          parsed.monthlyCheckIns = [];
          parsed.monthlyRepairsUsed = 0;
        }
      }
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load points state:', e);
  }
  return { ...DEFAULT_STATE };
}

export function savePointsState(state: UserPointsState) {
  try {
    localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save points state:', e);
  }
}

/**
 * Perform daily checkin with:
 * - Day 7 guaranteed Crit (Master Ball, +8 points)
 * - Days 1-6 randomized (1~5 pts: 30% 1pt, 40% 2pt, 20% 3pt, 10% 5pt Master Ball)
 * - Day 30 monthly full streak bonus (+35 pts)
 */
export function performDailyCheckIn(): CheckInResult {
  const state = loadPointsState();
  const today = getTodayDateString();

  if (state.lastCheckInDate === today) {
    return {
      success: false,
      pointsAdded: 0,
      ballType: 'poke',
      isCrit: false,
      isSeventhDayCrit: false,
      isMonthlyBonus: false,
      newStreak: state.currentStreak,
      newBalance: state.points,
      message: '今日已完成签到，请明天再来继续开启宝可梦盲盒！',
    };
  }

  // Calculate streak
  let newStreak = 1;
  if (state.lastCheckInDate) {
    const lastDate = new Date(state.lastCheckInDate);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = state.currentStreak + 1;
    } else {
      // Streak broken unless repaired
      newStreak = 1;
    }
  }

  const isSeventhDay = newStreak % 7 === 0;
  let pointsEarned = 1;
  let ballType: 'poke' | 'great' | 'ultra' | 'master' = 'poke';
  let isCrit = false;

  if (isSeventhDay) {
    // 7th day guaranteed critical bonus!
    pointsEarned = 8;
    ballType = 'master';
    isCrit = true;
  } else {
    // Random probability distribution
    const rand = Math.random();
    if (rand < 0.3) {
      pointsEarned = 1;
      ballType = 'poke';
    } else if (rand < 0.7) {
      pointsEarned = 2;
      ballType = 'great';
    } else if (rand < 0.9) {
      pointsEarned = 3;
      ballType = 'ultra';
    } else {
      pointsEarned = 5;
      ballType = 'master';
      isCrit = true;
    }
  }

  // Check if monthly full streak is achieved
  const daysInMonth = getDaysInCurrentMonth();
  const currentMonthPrefix = getCurrentMonthPrefix();
  const updatedMonthlyCheckIns = [
    ...state.monthlyCheckIns.filter((d) => d.startsWith(currentMonthPrefix) && d !== today),
    today,
  ];

  let isMonthlyBonus = false;
  if (updatedMonthlyCheckIns.length === daysInMonth) {
    // Full month bonus!
    pointsEarned += 35;
    isMonthlyBonus = true;
  }

  state.points += pointsEarned;
  state.lifetimeEarned += pointsEarned;
  state.lastCheckInDate = today;
  state.todayBasePoints = pointsEarned;
  state.lastDoubledDate = null; // Reset doubled status for the new day
  state.currentStreak = newStreak;
  state.maxStreak = Math.max(state.maxStreak, newStreak);
  state.monthlyCheckIns = updatedMonthlyCheckIns;

  savePointsState(state);

  return {
    success: true,
    pointsAdded: pointsEarned,
    ballType,
    isCrit,
    isSeventhDayCrit: isSeventhDay,
    isMonthlyBonus,
    newStreak,
    newBalance: state.points,
    message: isSeventhDay
      ? '🎉 连续第 7 天里程碑达成！触发大师球金色必暴击：+8 积分！'
      : isCrit
      ? '✨ 欧气爆发！开出金色大师球幸运暴击：+5 积分！'
      : `打卡成功，获得 +${pointsEarned} 积分！连续第 ${newStreak} 天！`,
  };
}

/**
 * Claim daily double bonus by sharing luck to social media (Twitter, Discord, etc.)
 * Scheme A: 100% free community viral loop without any video ads
 */
export function claimDailyDoubleShare(): {
  success: boolean;
  bonusAdded: number;
  newBalance: number;
  message: string;
} {
  const state = loadPointsState();
  const today = getTodayDateString();

  if (state.lastCheckInDate !== today) {
    return {
      success: false,
      bonusAdded: 0,
      newBalance: state.points,
      message: '今日尚未开启盲盒打卡，请先开启盲盒领取基础积分！',
    };
  }

  if (state.lastDoubledDate === today) {
    return {
      success: false,
      bonusAdded: 0,
      newBalance: state.points,
      message: '今日盲盒欧气已完成翻倍，明天打卡再接再厉！',
    };
  }

  // Double the base points earned today (fallback to at least 2 points)
  const bonus = Math.max(1, state.todayBasePoints || 2);
  state.points += bonus;
  state.lifetimeEarned += bonus;
  state.lastDoubledDate = today;

  savePointsState(state);

  return {
    success: true,
    bonusAdded: bonus,
    newBalance: state.points,
    message: `🎉 社群分享成功！今日盲盒手气已成功翻倍（额外奖励 +${bonus} 积分）！`,
  };
}

/**
 * Buy Streak Repair Card with points (costs 15 points)
 */
export function buyRepairCard(): { success: boolean; message: string; balance: number; cards: number } {
  const state = loadPointsState();
  const COST = 15;

  if (state.points < COST) {
    return {
      success: false,
      message: `积分不足！兑换补签卡需要 ${COST} 积分，您当前拥有 ${state.points} 积分。`,
      balance: state.points,
      cards: state.repairCardsCount,
    };
  }

  if (state.monthlyRepairsUsed >= 2) {
    return {
      success: false,
      message: '本月补签卡兑换额度已达上限（每月限用2张），保持每日打卡更有意义哦！',
      balance: state.points,
      cards: state.repairCardsCount,
    };
  }

  state.points -= COST;
  state.repairCardsCount += 1;
  savePointsState(state);

  return {
    success: true,
    message: `成功消耗 ${COST} 积分兑换 1 张训练家补签卡！`,
    balance: state.points,
    cards: state.repairCardsCount,
  };
}

/**
 * Use a Streak Repair Card to fill a missed day
 */
export function useRepairCard(missedDate: string): { success: boolean; message: string; state: UserPointsState } {
  const state = loadPointsState();

  if (state.repairCardsCount <= 0) {
    return {
      success: false,
      message: '您当前没有可用的补签卡，请先消耗 15 积分兑换！',
      state,
    };
  }

  if (state.monthlyRepairsUsed >= 2) {
    return {
      success: false,
      message: '每月最多仅可使用 2 次补签卡！',
      state,
    };
  }

  if (state.monthlyCheckIns.includes(missedDate)) {
    return {
      success: false,
      message: '该日期已经打卡，无需重复补签！',
      state,
    };
  }

  state.repairCardsCount -= 1;
  state.monthlyRepairsUsed += 1;
  state.monthlyCheckIns.push(missedDate);
  state.currentStreak += 1;
  savePointsState(state);

  return {
    success: true,
    message: `补签成功！已修复 ${missedDate} 的打卡记录，连续签到进度已恢复！`,
    state,
  };
}

/**
 * Convert real Amazon spend to Trainer Points:
 * - JPY: 100 JPY = 10 Points (0.1x, e.g. ¥3,480 = 348 pts)
 * - USD: 1.00 USD = 15 Points (15x, e.g. $24.74 = 371 pts)
 * - EUR: 1.00 EUR = 16 Points (16x, e.g. €20.00 = 320 pts)
 * - GBP: 1.00 GBP = 19 Points (19x, e.g. £15.00 = 285 pts)
 */
export function calculatePointsFromSpend(amount: number, currency: 'JPY' | 'USD' | 'EUR' | 'GBP'): number {
  if (currency === 'JPY') {
    return Math.floor(amount * 0.1);
  }
  if (currency === 'USD') {
    return Math.floor(amount * 15);
  }
  if (currency === 'EUR') {
    return Math.floor(amount * 16);
  }
  if (currency === 'GBP') {
    return Math.floor(amount * 19);
  }
  return Math.floor(amount * 15);
}

/**
 * Submit verified Amazon order to earn points immediately
 */
export function registerAmazonOrder(
  orderId: string,
  amount: number,
  currency: 'JPY' | 'USD' | 'EUR' | 'GBP',
  itemName: string,
  contactEmail?: string
): { success: boolean; pointsEarned: number; message: string; state: UserPointsState } {
  const state = loadPointsState();

  const cleanOrderId = orderId.trim();
  if (cleanOrderId.length < 8) {
    return {
      success: false,
      pointsEarned: 0,
      message: '请输入有效的亚马逊订单号（如 249-1234567-8901234）！',
      state,
    };
  }

  // Prevent duplicate entry
  const exists = state.claimsHistory.some((c) => c.orderId === cleanOrderId);
  if (exists) {
    return {
      success: false,
      pointsEarned: 0,
      message: '该订单号已登记并领取过积分，不可重复提交！',
      state,
    };
  }

  const earned = calculatePointsFromSpend(amount, currency);

  state.points += earned;
  state.lifetimeEarned += earned;
  state.hasActivatedOrder = true;
  state.claimsHistory.unshift({
    orderId: cleanOrderId,
    amount,
    currency,
    pointsEarned: earned,
    item: itemName,
    date: getTodayDateString(),
    contactEmail,
    status: 'verified',
  });

  savePointsState(state);

  return {
    success: true,
    pointsEarned: earned,
    message: `🎉 订单登记成功！已为您到账 +${earned} 训练家积分！您已直接解锁众筹奖池参与特权！`,
    state,
  };
}

/**
 * Enter a Crowdfunded Raffle Pool
 */
export function enterRafflePool(
  poolId: string,
  shares: number,
  costPerShare: number
): { success: boolean; tickets: string[]; message: string; state: UserPointsState } {
  const state = loadPointsState();
  const totalCost = shares * costPerShare;

  if (state.points < totalCost) {
    return {
      success: false,
      tickets: [],
      message: `积分不足！投 ${shares} 注需要 ${totalCost} 积分，您当前拥有 ${state.points} 积分。可前往商城购买周边快速补充积分！`,
      state,
    };
  }

  state.points -= totalCost;

  const generatedTickets: string[] = [];
  const timestamp = Date.now();
  for (let i = 0; i < shares; i++) {
    const randomHex = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    const ticketCode = `TICKET-${randomHex}`;
    generatedTickets.push(ticketCode);
    state.poolEntries.push({
      poolId,
      ticketCode,
      shares: 1,
      pointsSpent: costPerShare,
      timestamp,
      date: getTodayDateString(),
    });
  }

  savePointsState(state);

  return {
    success: true,
    tickets: generatedTickets,
    message: `🎉 成功投入 ${shares} 注（消耗 ${totalCost} 积分）！获得抽奖码：${generatedTickets.join(', ')}。满额后系统将自动随机摇号开奖！`,
    state,
  };
}
