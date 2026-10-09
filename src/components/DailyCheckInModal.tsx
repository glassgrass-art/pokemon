/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  loadPointsState,
  performDailyCheckIn,
  claimDailyDoubleShare,
  buyRepairCard,
  useRepairCard,
  getTodayDateString,
  getDaysInCurrentMonth,
  UserPointsState,
  CheckInResult,
} from '../utils/pointsStorage';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointsUpdated: (newBalance: number) => void;
  onGoToShop?: () => void;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onPointsUpdated,
}) => {
  const [pointsState, setPointsState] = useState<UserPointsState>(() => loadPointsState());
  const [isOpening, setIsOpening] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedShare, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPointsState(loadPointsState());
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = getTodayDateString();
  const alreadyCheckedIn = pointsState.lastCheckInDate === today;
  const alreadyDoubled = pointsState.lastDoubledDate === today;
  const currentStreak = pointsState.currentStreak;
  const dayInWeeklyCycle = ((currentStreak - 1) % 7) + 1; // 1 to 7

  const handleCheckInClick = () => {
    if (alreadyCheckedIn || isOpening) return;
    setIsOpening(true);

    setTimeout(() => {
      const res = performDailyCheckIn();
      setLastResult(res);
      const newState = loadPointsState();
      setPointsState(newState);
      onPointsUpdated(res.newBalance);
      setIsOpening(false);

      if (res.isCrit || res.isSeventhDayCrit || res.isMonthlyBonus) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981'],
        });
      }
    }, 600);
  };

  const executeShareDoubling = () => {
    const res = claimDailyDoubleShare();
    setFeedbackMsg(res.message);
    const newState = loadPointsState();
    setPointsState(newState);
    onPointsUpdated(res.newBalance);

    if (res.success) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899'],
      });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const getShareText = () => {
    const pts = pointsState.todayBasePoints || lastResult?.pointsAdded || 2;
    return `⚡【PTCG Pocket 训练家今日打卡】我今天在宝可梦图鉴站开启盲盒抽中 +${pts} 积分！连续打卡第 ${currentStreak} 天，正向日版卡包原盒发起众筹冲击！点击加入全球开盒：${window.location.origin}`;
  };

  const handleShareCopy = () => {
    navigator.clipboard.writeText(getShareText());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    executeShareDoubling();
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    executeShareDoubling();
  };

  const handleShareDiscord = () => {
    navigator.clipboard.writeText(getShareText());
    setFeedbackMsg('📋 已复制 Discord 战报格式到剪贴板！正在激活翻倍欧气...');
    executeShareDoubling();
  };

  const handleBuyRepairCard = () => {
    const res = buyRepairCard();
    setFeedbackMsg(res.message);
    setPointsState(loadPointsState());
    onPointsUpdated(res.balance);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleRepairYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    const res = useRepairCard(yesterday);
    setFeedbackMsg(res.message);
    setPointsState(res.state);
    onPointsUpdated(res.state.points);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const daysInMonth = getDaysInCurrentMonth();
  const currentMonthCheckInsCount = pointsState.monthlyCheckIns.length;
  const daysUntilMonthlyReward = Math.max(0, daysInMonth - currentMonthCheckInsCount);
  const potentialDoublePts = pointsState.todayBasePoints || lastResult?.pointsAdded || 2;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 flex flex-col gap-4 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🎁
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-300 via-purple-300 to-sky-300 bg-clip-text text-transparent">
                训练家每日盲盒打卡
              </h2>
              <p className="text-xs text-slate-400">
                连签 7 天必暴击 · 攒满 500 分兑换众筹实物抽奖券
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Points & Streak Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              🪙
            </div>
            <div>
              <div className="text-[10px] text-slate-400">当前总积分</div>
              <div className="text-base sm:text-lg font-black text-amber-300">
                {pointsState.points.toLocaleString()} <span className="text-xs font-normal">pts</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
              <Flame className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400">连续签到</div>
              <div className="text-base sm:text-lg font-black text-rose-300">
                {currentStreak} <span className="text-xs font-normal">天</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400">补签卡存量</div>
              <div className="text-base sm:text-lg font-black text-purple-300">
                {pointsState.repairCardsCount} <span className="text-xs font-normal">张</span>
              </div>
            </div>
          </div>
        </div>

        {/* Big Mystery Box Interactive Area */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-750 p-5 text-center flex flex-col items-center gap-3.5">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Blind Box Ball Visual */}
          <div
            onClick={handleCheckInClick}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl transition-all duration-300 select-none shadow-xl cursor-pointer ${
              alreadyCheckedIn
                ? 'bg-slate-800 border-2 border-slate-700 opacity-80 cursor-default'
                : isOpening
                ? 'animate-bounce scale-110 bg-amber-500/30 border-2 border-amber-400'
                : 'hover:scale-105 active:scale-95 bg-gradient-to-tr from-amber-500/30 via-purple-500/20 to-sky-500/30 border-2 border-amber-400/80 shadow-amber-500/20 animate-pulse'
            }`}
          >
            {alreadyCheckedIn ? '✅' : isOpening ? '⚡' : '🔮'}
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-1">
              {alreadyCheckedIn
                ? '今日打卡已完成，明天不见不散！'
                : '点击神秘精灵球，开启今日随机积分盲盒'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              每日随机掉落 <span className="text-amber-400 font-bold">+1 ~ +5 积分</span>
              ，连续签到至第 7 天必出 <span className="text-purple-400 font-bold">+8 暴击大师球</span>！
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCheckInClick}
            disabled={alreadyCheckedIn || isOpening}
            className={`px-8 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
              alreadyCheckedIn
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:shadow-amber-500/30 active:scale-98'
            }`}
          >
            {alreadyCheckedIn ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>今日已签到</span>
              </>
            ) : isOpening ? (
              <span>盲盒开启中...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>即刻开启今日盲盒</span>
              </>
            )}
          </button>

          {/* Result Alert */}
          {lastResult && (
            <div
              className={`w-full p-2.5 rounded-xl border text-xs text-left animate-in zoom-in-95 duration-200 ${
                lastResult.isSeventhDayCrit
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                  : lastResult.isCrit
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {lastResult.message}
            </div>
          )}
        </div>

        {/* Scheme A: 社群分享欧气手气翻倍 (无广告·真裂变) */}
        {alreadyCheckedIn && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/40 flex flex-col gap-2.5">
            {alreadyDoubled ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      今日盲盒欧气已成功翻倍！
                    </div>
                    <div className="text-[11px] text-slate-400">
                      额外翻倍奖励 (+{potentialDoublePts} pts) 已入账，明天继续保持！
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                  2X 欧气达成
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-bold text-amber-200">
                      欧气手气翻倍：分享战报立享今日积分翻倍！
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-400/40 text-amber-300 font-black text-[10px] animate-pulse">
                    +{potentialDoublePts} 待领
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  拒绝恶心垃圾广告！分享今日打卡战报至社群或复制战报口令，今日盲盒积分即刻翻倍：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <button
                    onClick={handleShareCopy}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">已复制并翻倍</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>一键复制战报口令</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShareTwitter}
                    className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>分享至 X (Twitter)</span>
                  </button>
                  <button
                    onClick={handleShareDiscord}
                    className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>分享至 Discord/微信</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 7-Day Weekly Habit Loop (Guaranteed 7th Day Crit) */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>7天连续打卡循环（第7天必出金色大师球暴击）</span>
            </span>
            <span className="text-[11px] text-amber-400/90 font-medium">
              第 {dayInWeeklyCycle}/7 天
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
              const isPassed = dayInWeeklyCycle >= dayNum && currentStreak > 0;
              const isSeventh = dayNum === 7;

              return (
                <div
                  key={dayNum}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    isSeventh
                      ? isPassed
                        ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20'
                        : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                      : isPassed
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/50 border-slate-700/40 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-semibold">D{dayNum}</span>
                  <span className="text-sm">
                    {isSeventh ? '👑' : isPassed ? '✓' : '⚪'}
                  </span>
                  <span
                    className={`text-[9px] font-bold ${
                      isSeventh ? 'text-purple-300' : isPassed ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {isSeventh ? '+8暴击' : isPassed ? '已领' : '待领'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Streak & Repair Card Section */}
        <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-slate-750 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 text-lg shrink-0">
              📅
            </div>
            <div>
              <div className="font-bold text-slate-200">
                月度全勤大奖：额外 +35 积分
              </div>
              <div className="text-slate-400 text-[11px]">
                本月已签到 {currentMonthCheckInsCount}/{daysInMonth} 天 · 距全勤还差 {daysUntilMonthlyReward} 天
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRepairYesterday}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
              title="消耗 1 张补签卡补签昨日"
            >
              使用补签卡
            </button>
            <button
              onClick={handleBuyRepairCard}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold transition-colors"
            >
              15分兑换补签卡
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs">
            {feedbackMsg}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
