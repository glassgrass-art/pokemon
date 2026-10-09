/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Users,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Gift,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CROWDFUNDED_POOLS, CrowdfundedRafflePool } from '../data/raffleData';
import {
  loadPointsState,
  enterRafflePool,
  UserPointsState,
} from '../utils/pointsStorage';

interface PointsRaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointsUpdated: (newBalance: number) => void;
  onOpenCheckIn: () => void;
  onGoToShop: () => void;
}

export const PointsRaffleModal: React.FC<PointsRaffleModalProps> = ({
  isOpen,
  onClose,
  onPointsUpdated,
  onOpenCheckIn,
  onGoToShop,
}) => {
  const [pointsState, setPointsState] = useState<UserPointsState>(() => loadPointsState());
  const [pools, setPools] = useState<CrowdfundedRafflePool[]>(() => CROWDFUNDED_POOLS);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('pool-gengar-deck-box');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const currentPool = pools.find((p) => p.id === selectedPoolId) || pools[0];
  const progressPercent = Math.min(
    100,
    Math.round((currentPool.currentPoints / currentPool.targetPoints) * 100)
  );

  const handleBet = (shares: number) => {
    const cost = shares * currentPool.costPerShare;
    if (pointsState.points < cost) {
      setActionMsg({
        type: 'error',
        text: `积分不足！下注 ${shares} 份需要 ${cost} 积分，您当前拥有 ${pointsState.points} 积分。可前往商城选购周边或每日签到获取积分！`,
      });
      return;
    }

    const res = enterRafflePool(currentPool.id, shares, currentPool.costPerShare);
    if (res.success) {
      setActionMsg({
        type: 'success',
        text: res.message,
      });
      setPointsState(res.state);
      onPointsUpdated(res.state.points);

      // Update pool locally
      setPools((prev) =>
        prev.map((p) => {
          if (p.id === currentPool.id) {
            return {
              ...p,
              currentPoints: p.currentPoints + cost,
              currentSharesSold: p.currentSharesSold + shares,
            };
          }
          return p;
        })
      );

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      setActionMsg({
        type: 'error',
        text: res.message,
      });
    }
  };

  const userEntriesForPool = pointsState.poolEntries.filter((e) => e.poolId === currentPool.id);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 text-slate-100 flex flex-col gap-4 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🎯
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 bg-clip-text text-transparent">
                全球训练家积分众筹奖池
              </h2>
              <p className="text-xs text-slate-400">
                全球玩家积分合力冲刺 · 满额全球随机开奖 · 未满额 100% 原路全退
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

        {/* User Balance Bar */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/80 via-slate-800/50 to-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
              🪙
            </div>
            <div>
              <div className="text-[11px] text-slate-400">当前可用训练家积分</div>
              <div className="text-lg font-black text-amber-300">
                {pointsState.points.toLocaleString()} <span className="text-xs font-normal">pts</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCheckIn();
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all"
            >
              📅 每日盲盒签到
            </button>
            <button
              onClick={() => {
                onClose();
                onGoToShop();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95"
            >
              🛒 买周边暴赚积分
            </button>
          </div>
        </div>

        {/* Pool Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          {pools.map((p) => {
            const isSelected = p.id === selectedPoolId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPoolId(p.id);
                  setActionMsg(null);
                }}
                className={`p-3 rounded-xl text-left transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-slate-850 border border-amber-500/40 shadow-lg text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}
                  >
                    {p.badge}
                  </span>
                  <span className="text-[11px] text-amber-400 font-bold">
                    {p.costPerShare} pts / 注
                  </span>
                </div>
                <div className="font-bold text-xs truncate mt-0.5">{p.prizeItemName}</div>
              </button>
            );
          })}
        </div>

        {/* Main Pool Showcase Card */}
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={currentPool.prizeImageUrl}
              alt={currentPool.prizeItemName}
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-2xl object-cover border border-slate-700/70 shadow-lg shrink-0"
            />
            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${currentPool.badgeColor}`}
                >
                  {currentPool.badge}
                </span>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  实物价值: {currentPool.prizeValueDisplay}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 leading-snug">
                {currentPool.title}
              </h3>
              <p className="text-xs text-slate-400">
                官方原装正品 · 中奖后包邮直邮全球 · 真实可靠无套路
              </p>
            </div>
          </div>

          {/* Progress Bar & Countdown */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>众筹进度: {progressPercent}%</span>
              </span>
              <span className="text-amber-300 font-bold">
                {currentPool.currentPoints.toLocaleString()} / {currentPool.targetPoints.toLocaleString()} pts
              </span>
            </div>

            {/* Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative border border-slate-750">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  本期倒计时: {currentPool.countdownDays}天 {currentPool.countdownHours}小时
                </span>
              </span>
              <span>
                已集结 {currentPool.currentSharesSold} / {currentPool.totalSharesNeeded} 注
              </span>
            </div>
          </div>

          {/* Action Message Alert */}
          {actionMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in zoom-in-95 duration-150 ${
                actionMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              }`}
            >
              {actionMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{actionMsg.text}</div>
            </div>
          )}

          {/* Betting Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => handleBet(1)}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/25 active:scale-98 transition-all"
            >
              <Ticket className="w-4 h-4" />
              <span>投 1 注 (-{currentPool.costPerShare} 积分)</span>
            </button>

            <button
              onClick={() => handleBet(2)}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 active:scale-98 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>连投 2 注 (-{currentPool.costPerShare * 2} 积分 / 胜率翻倍)</span>
            </button>
          </div>

          {/* My Tickets in this pool */}
          {userEntriesForPool.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <Ticket className="w-4 h-4" />
                <span>您在本期已持券 {userEntriesForPool.length} 张:</span>
              </span>
              <span className="font-mono text-[11px] truncate max-w-[260px]">
                {userEntriesForPool.map((e) => e.ticketCode).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Global Contributors Ticker */}
        <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-slate-750 space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>全球训练家实时入池记录</span>
            </span>
            <span className="text-[10px] text-slate-400">实时广播</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {currentPool.recentContributors.map((c, i) => (
              <div
                key={i}
                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span className="font-bold text-slate-200">{c.trainerName}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-amber-400 font-bold">+{c.shares} 注</span>
                  <span className="text-slate-400">{c.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guaranteed Safety & Conversion Footer */}
        <div className="p-3.5 rounded-2xl bg-slate-800/20 border border-slate-750 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>自负盈亏风控与退款保障体系</span>
          </div>
          <p>
            • <strong>汇率平价换算</strong>：¥100 JPY = 10积分 | $1.00 USD = 15积分 | €1.00 EUR = 16积分。全球买家无任何汇率歧视。
          </p>
          <p>
            • <strong>满额开奖与未满全退</strong>：7天周期内叠满立即触发系统公开随机摇号；若未满额，所有投入积分<strong>100% 原路返还</strong>，零损失零风险。
          </p>
          <p>
            • <strong>跳级秘诀</strong>：在日亚/美亚买任意一件周边，一单立返 <strong>200 ~ 350 积分</strong>，省去 4 个月漫长签到！
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
