import React, { useState, useRef, useEffect } from 'react';
import { TrainerProfile, TradeProposal } from '../types';
import {
  Sparkles,
  ArrowRightLeft,
  Layers,
  Trophy,
  Copy,
  Check,
  Inbox,
  Languages,
  ChevronDown,
  Cloud,
  Camera,
  Coffee,
  ShoppingBag,
  Gift,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../utils/i18n';
import { getTodayDateString, loadPointsState } from '../utils/pointsStorage';

interface NavbarProps {
  activeTab: 'collection' | 'market' | 'mart';
  setActiveTab: (tab: 'collection' | 'market' | 'mart') => void;
  trainerProfile: TrainerProfile;
  proposals: TradeProposal[];
  onOpenMyTrades: () => void;
  onOpenProfile: () => void;
  onOpenCloudSync?: () => void;
  onOpenScanner?: () => void;
  onOpenRating?: () => void;
  onOpenCoffee?: () => void;
  onOpenDailyCheckIn?: () => void;
  smartMatchCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  trainerProfile,
  proposals,
  onOpenMyTrades,
  onOpenProfile,
  onOpenCloudSync,
  onOpenRating,
  onOpenCoffee,
  onOpenDailyCheckIn,
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const today = getTodayDateString();
  const pointsState = loadPointsState();
  const alreadyCheckedIn = pointsState.lastCheckInDate === today;

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const pendingProposalsCount = proposals.filter((p) => p.status === 'pending').length;

  const handleCopyFriendCode = () => {
    navigator.clipboard.writeText(trainerProfile.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-1 sm:gap-2 lg:gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('collection')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
        >
          {/* Pokeball styled icon */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-md shadow-rose-600/30 overflow-hidden border border-rose-400/40 shrink-0">
            <div className="absolute top-0 inset-x-0 h-1/2 bg-red-600" />
            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-white" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-slate-900" />
            <div className="relative w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center z-10">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">
              {t('appTitle')}
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest hidden sm:inline-block">
              {t('badgeTrade')}
            </span>
          </div>
        </div>

        {/* Main Navigation Tabs: 3 Fixed Core Views (Never shifts, fits all languages) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80 shrink-0">
          <button
            id="nav-tab-collection"
            type="button"
            onClick={() => setActiveTab('collection')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'collection'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('tabCollection')}</span>
          </button>

          <button
            id="nav-tab-market"
            type="button"
            onClick={() => setActiveTab('market')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'market'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('tabMarket')}</span>
          </button>

          <button
            id="nav-tab-mart"
            type="button"
            onClick={() => setActiveTab('mart')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'mart'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{t('tabMart')}</span>
          </button>
        </nav>

        {/* Right Tools: Daily Check-In & Language Selector & Cloud Sync & Coffee & My Trades & Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
          {/* Daily Check-in Mystery Box Quick Action */}
          {onOpenDailyCheckIn && (
            <button
              id="nav-btn-daily-checkin"
              type="button"
              onClick={onOpenDailyCheckIn}
              className="relative flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold text-amber-300 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
              title={t('dailyCheckIn')}
            >
              <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t('dailyCheckIn')}</span>
              {!alreadyCheckedIn && (
                <span className="flex h-2 w-2 relative -ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </button>
          )}

          {/* Collector Passport (收藏护照) */}
          {onOpenRating && (
            <button
              id="nav-btn-rating"
              type="button"
              onClick={onOpenRating}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
              title={t('passport')}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t('passport')}</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              id="nav-language-picker"
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors shrink-0 cursor-pointer"
              title={t('languageSelect')}
            >
              <span className="text-sm leading-none">{currentLangObj.flag}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 py-1.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 animate-fade-in backdrop-blur-xl">
                {/* UI Language Section */}
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-sky-400" />
                    {t('languageSelect')}
                  </span>
                  <span className="text-[9px] text-sky-400 font-mono">UI</span>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-sky-500/15 text-sky-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cloud Sync Button */}
          {onOpenCloudSync && (
            <button
              id="nav-cloud-sync-btn"
              type="button"
              onClick={onOpenCloudSync}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-sky-300 transition-colors shrink-0 cursor-pointer"
              title={t('cloudSync')}
            >
              <Cloud className="w-4 h-4" />
            </button>
          )}

          {/* Buy Me a Coffee Button */}
          {onOpenCoffee && (
            <button
              id="nav-coffee-btn"
              type="button"
              onClick={onOpenCoffee}
              className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all shrink-0 cursor-pointer"
              title={t('buyCoffee') || 'Buy Me a Coffee'}
            >
              <Coffee className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* My Trades / Proposals Notification Button */}
          <button
            id="nav-my-trades-btn"
            type="button"
            onClick={onOpenMyTrades}
            className="relative p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={t('myTrades')}
          >
            <Inbox className="w-4 h-4" />
            {pendingProposalsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingProposalsCount}
              </span>
            )}
          </button>

          {/* Trainer Profile Avatar Button */}
          <button
            id="nav-profile-btn"
            type="button"
            onClick={onOpenProfile}
            className="p-0.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0 cursor-pointer"
            title={t('profile')}
          >
            <img
              src={trainerProfile.avatar}
              alt={trainerProfile.name}
              className="w-7 h-7 rounded-lg object-cover bg-slate-800"
            />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - Exactly 5 fixed tabs, perfectly spaced without scrolling */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-1 py-1 grid grid-cols-5 items-center">
        <button
          type="button"
          onClick={() => setActiveTab('collection')}
          className={`flex flex-col items-center py-1 px-0.5 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'collection' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate max-w-full">{t('tabCollection')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center py-1 px-0.5 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'market' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate max-w-full">{t('tabMarket')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mart')}
          className={`flex flex-col items-center py-1 px-0.5 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer ${
            activeTab === 'mart' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate max-w-full">{t('tabMart')}</span>
        </button>

        {onOpenRating && (
          <button
            type="button"
            onClick={onOpenRating}
            className="flex flex-col items-center py-1 px-0.5 text-[10px] sm:text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="truncate max-w-full">{t('passport')}</span>
          </button>
        )}

        {onOpenDailyCheckIn && (
          <button
            type="button"
            onClick={onOpenDailyCheckIn}
            className="relative flex flex-col items-center py-1 px-0.5 text-[10px] sm:text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            <Gift className="w-4 h-4 mb-0.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-full">{t('dailyCheckIn')}</span>
            {!alreadyCheckedIn && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-2 sm:right-3 animate-pulse ring-2 ring-slate-950" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};
