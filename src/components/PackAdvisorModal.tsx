import React, { useMemo } from 'react';
import { UserCardStatus } from '../types';
import { calculatePackStats } from '../utils/packCalculator';
import { PACK_INFO } from '../data/cardsData';
import { X, Trophy, CheckCircle, Percent, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PackAdvisorModalProps {
  userCollection: Record<string, UserCardStatus>;
  onClose: () => void;
  onSelectPackFilter: (packKey: string) => void;
  zIndex?: number;
}

export const PackAdvisorModal: React.FC<PackAdvisorModalProps> = ({
  userCollection,
  onClose,
  onSelectPackFilter,
  zIndex,
}) => {
  const { t, getPackName } = useLanguage();

  const packStats = useMemo(() => {
    return calculatePackStats(userCollection);
  }, [userCollection]);

  // Sort by highest newCardExpectedRate
  const sortedPacks = useMemo(() => {
    return [...packStats].sort((a, b) => b.newCardExpectedRate - a.newCardExpectedRate);
  }, [packStats]);

  const bestPack = sortedPacks[0];

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="pack-advisor-dialog"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              🎯
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{t('tabAdvisor')}</h3>
              <p className="text-xs text-slate-400">{t('advisorSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Top Best Pack Recommendation Highlight */}
          {bestPack && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-500/15 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md">
                  <Trophy className="w-3.5 h-3.5" />
                  {t('optimalPackBadge')}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {t('expectedNewRate')} {bestPack.newCardExpectedRate}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    {getPackName(bestPack.pack)}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {t('missingCount')}: <strong className="text-amber-300 font-bold">{bestPack.missingCards}</strong> (
                    {t('completionRate')}: {bestPack.completionRate}%)
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onSelectPackFilter(bestPack.pack);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1"
                >
                  {t('inspectCard')}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Pack comparison list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-sky-400" />
              {t('tabAdvisor')} - {t('completionRate')}
            </h4>

            <div className="space-y-2.5">
              {sortedPacks.map((item, index) => {
                const info = PACK_INFO[item.pack];
                const isTop = index === 0;

                return (
                  <div
                    key={item.pack}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isTop
                        ? 'bg-slate-900 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span className="text-base">{info?.icon || '📦'}</span>
                        <span>{getPackName(item.pack)}</span>
                        {isTop && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {t('optimalPackBadge')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-slate-400">
                          {t('ownedCount')}: <strong className="text-slate-200">{item.ownedCards}/{item.totalCards}</strong>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {t('expectedNewRate')}: {item.newCardExpectedRate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>

                    {/* Rarity breakdown */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-800/40">
                      <span>{t('completionRate')}: {item.completionRate}%</span>
                      <div className="flex items-center gap-2 font-mono">
                        {item.missingByRarity['4D'] > 0 && (
                          <span className="text-yellow-400">◇◇◇◇: {item.missingByRarity['4D']}</span>
                        )}
                        {item.missingByRarity['2S'] + item.missingByRarity['3S'] + item.missingByRarity['CR'] > 0 && (
                          <span className="text-fuchsia-400">
                            ☆☆+ / 👑: {item.missingByRarity['2S'] + item.missingByRarity['3S'] + item.missingByRarity['CR']}
                          </span>
                        )}
                        {item.missingCards === 0 && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> 100%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
