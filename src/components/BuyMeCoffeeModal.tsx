import React, { useState } from 'react';
import {
  Coffee,
  Heart,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  X,
  Award,
  Flame,
  Settings,
  HelpCircle,
  CreditCard,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TrainerProfile, CoffeeSupporter } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  getCoffeeHandle,
  setCoffeeHandle,
  getCoffeeUrl,
  loadCoffeeSupporters,
  saveCoffeeSupporter,
} from '../utils/coffeeStorage';

interface BuyMeCoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerProfile: TrainerProfile;
  onUpdateTrainerProfile: (updated: TrainerProfile) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  zIndex?: number;
}

type TabType = 'tiers' | 'supporters';
type PayMode = 'redirect' | 'embed';

export const BuyMeCoffeeModal: React.FC<BuyMeCoffeeModalProps> = ({
  isOpen,
  onClose,
  trainerProfile,
  onUpdateTrainerProfile,
  showToast,
  zIndex,
}) => {
  const { t, currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('tiers');
  const [selectedCups, setSelectedCups] = useState<number>(2);
  const [copiedLink, setCopiedLink] = useState(false);
  const [supporterMessage, setSupporterMessage] = useState<string>('');
  const [supportersList, setSupportersList] = useState<CoffeeSupporter[]>([]);
  const [payMode, setPayMode] = useState<PayMode>('redirect');
  const [hasStartedPayment, setHasStartedPayment] = useState(false);

  // Creator configuration state
  const [customHandle, setCustomHandleInput] = useState(() => getCoffeeHandle());
  const [currentCoffeeUrl, setCurrentCoffeeUrl] = useState(() => getCoffeeUrl());
  const [showCreatorSettings, setShowCreatorSettings] = useState(false);
  const [showPayoutGuide, setShowPayoutGuide] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Sync any live verified Ko-fi webhooks from server
  React.useEffect(() => {
    fetch('/api/kofi/supporters')
      .then((res) => res.json())
      .then((data) => {
        if (data.supporters && data.supporters.length > 0) {
          const remoteMapped: CoffeeSupporter[] = data.supporters.map((s: any) => ({
            id: s.id,
            name: s.name,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
            cups: Math.max(1, Math.round(parseFloat(s.amount.replace('$', '')) / 3) || 1),
            amount: s.amount,
            message: s.message || '通过 Ko-fi 赞助了咖啡！☕',
            date: s.timestamp || Date.now(),
            badge: '☕ Verified Supporter',
          }));
          setSupportersList((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const newOnes = remoteMapped.filter((r) => !ids.has(r.id));
            return [...newOnes, ...prev];
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const currentAmountStr = `$${selectedCups * 3}`;

  const currentTierBadge =
    selectedCups >= 3
      ? '☕☕☕ Master Supporter'
      : selectedCups === 2
      ? '☕☕ Super Supporter'
      : '☕ Supporter';

  const checkoutUrl = `${currentCoffeeUrl}/?hidefeed=true`;
  const redirectReturnUrl = typeof window !== 'undefined' ? `${window.location.origin}/?kofi_paid=true` : '';

  const handleStartPayment = () => {
    setHasStartedPayment(true);
    try {
      localStorage.setItem(
        'ptcgp_pending_coffee_checkout',
        JSON.stringify({
          cups: selectedCups,
          amount: currentAmountStr,
          badge: currentTierBadge,
          message: supporterMessage.trim(),
          startedAt: Date.now(),
        })
      );
    } catch {}
  };

  const handleSaveHandle = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = setCoffeeHandle(customHandle);
    setCustomHandleInput(updated);
    setCurrentCoffeeUrl(getCoffeeUrl());
    showToast(t('coffeeSavedHandle') || `收款主页已更新为 ko-fi.com/${updated}`, 'success');
  };

  const handleCopySupportLink = () => {
    navigator.clipboard.writeText(currentCoffeeUrl);
    setCopiedLink(true);
    showToast(t('coffeeCopied') || 'Support link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Self-reported payment cannot grant verified account status.
  const handleConfirmAndClaimBadge=()=>{
    showToast(currentLanguage==='zh-Hant'?'请以 Ko-fi 支付收据为准；当前不提供账号勋章自动认证。':'Please check your Ko-fi receipt. Account badge verification is not available.','info');
    setHasStartedPayment(false);
  };

  return (
    <div
      style={{ zIndex: zIndex || 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="buy-me-a-coffee-dialog"
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header with warm coffee steam & golden accents */}
        <div className="relative p-5 sm:p-6 border-b border-amber-500/20 bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/25 shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-amber-400">
                  <Coffee className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 text-[10px] font-black">
                  ★
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Buy Me a Coffee</span>
                    <span className="text-sm font-bold text-amber-400">☕</span>
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {t('supportCreator') || '支持作者'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                  {t('coffeeSubtitle') ||
                    '您的每一杯咖啡，都直接支持图鉴数据更新、海外高可用撮合服务器运行！'}
                </p>
              </div>
            </div>

            <button
              id="coffee-modal-close"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('tiers')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'tiers'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{t('coffeeTiers') || '赞助档位 / Support Tiers'}</span>
            </button>

            <button
              onClick={() => setActiveTab('supporters')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'supporters'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('supporterWall') || '赞助芳名录'} ({supportersList.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {activeTab === 'tiers' && (
            <div className="space-y-5">
              {/* Step 1: Select Coffee Tier */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">1</span>
                  <span>第一步：选择咖啡杯数档位</span>
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  当前所选：{selectedCups} 杯 ({currentAmountStr})
                </span>
              </div>

              {/* Coffee Cups Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1 Cup */}
                <button
                  type="button"
                  onClick={() => setSelectedCups(1)}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedCups === 1
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/15'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">☕</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCups === 1 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'}`}>
                        $3 / 400 JPY
                      </span>
                    </div>
                    <div className="font-black text-slate-100 text-sm">
                      {t('cup1Name') || '1 Cup: Espresso'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t('cup1Desc') || '代码提神！支持作者加速新卡数据更新与BUG修复。'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                    <Check className="w-3 h-3" />
                    <span>{t('unlockSupporter') || '解锁赞助者徽章'}</span>
                  </div>
                </button>

                {/* 2 Cups - Highlighted */}
                <button
                  type="button"
                  onClick={() => setSelectedCups(2)}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedCups === 2
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Flame className="w-3 h-3 fill-current" />
                    <span>{t('popularTier') || '最受欢迎'}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">☕☕</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCups === 2 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'}`}>
                        $6 / 800 JPY
                      </span>
                    </div>
                    <div className="font-black text-slate-100 text-sm">
                      {t('cup2Name') || '2 Cups: Double Latte'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t('cup2Desc') || '强劲续航！支撑云端撮合服务器与高画质图鉴CDN。'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{t('superSupporterBadge') || '点亮超级赞助者徽章'}</span>
                  </div>
                </button>

                {/* 3 Cups */}
                <button
                  type="button"
                  onClick={() => setSelectedCups(3)}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedCups === 3
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">☕☕☕</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedCups === 3 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'}`}>
                        $9 / 1200 JPY
                      </span>
                    </div>
                    <div className="font-black text-slate-100 text-sm">
                      {t('cup3Name') || '3 Cups: Master Roast'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t('cup3Desc') || '永久点亮金色咖啡皇冠勋章，荣耀登上感谢墙前列！'}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                    <Award className="w-3 h-3 text-yellow-400" />
                    <span>{t('masterBadge') || '大师球赞助者荣誉'}</span>
                  </div>
                </button>
              </div>

              {/* Step 2: Leave Optional Wish Message */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center">2</span>
                  <span>第二步：附带许愿留言（展示在感谢墙，可选）</span>
                </label>
                <input
                  type="text"
                  value={supporterMessage}
                  onChange={(e) => setSupporterMessage(e.target.value)}
                  placeholder={
                    currentLanguage === 'ja'
                      ? '新パック全コンプ目指します！いつも便利なツールをありがとう！☕'
                      : currentLanguage === 'en'
                      ? 'Love the trading matcher! Good luck getting Crown Charizard! ☕'
                      : '祝全图鉴早日毕业！感谢卡牌交换与OCR扫描工具！☕'
                  }
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Step 3: Payment Channel Selection */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">3</span>
                    <span className="text-xs font-bold text-slate-200">第三步：选择支付方式并完成赞助</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySupportLink}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (t('copied') || '已复制') : (t('copySupportLink') || '复制主页链接')}</span>
                  </button>
                </div>

                {/* Mode Selector (Separate clear tabs: New Tab vs Embedded) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPayMode('redirect')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      payMode === 'redirect'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>新窗口前往官网（推荐）</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('embed')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      payMode === 'embed'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>在当前窗口内支付</span>
                  </button>
                </div>

                {/* Mode A: Clean New Tab Link */}
                {payMode === 'redirect' && (
                  <div className="space-y-3 pt-1">
                    <a
                      id="btn-link-kofi-clean"
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleStartPayment}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
                    >
                      <Coffee className="w-5 h-5 text-slate-950" />
                      <span>前往 Ko-fi 赞助 {selectedCups} 杯咖啡 ({currentAmountStr})</span>
                      <ExternalLink className="w-4 h-4 ml-auto opacity-80" />
                    </a>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>进入 Ko-fi 页面后，请点选【☕ x{selectedCups}】进行付款</span>
                      </div>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Ko-fi 平台出于安全防钓鱼保护，不支持由外部网址直接替用户锁定付款金额，请在页面中点一下对应的杯数即可付款。
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                        <span>支持 Visa / Mastercard / PayPal / Apple Pay</span>
                      </span>
                      <span>新标签页安全直达</span>
                    </div>
                  </div>
                )}

                {/* Mode B: Embedded Widget */}
                {payMode === 'embed' && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                      💡 <b>提示</b>：微网页中请点击对应的 <b>☕ x{selectedCups}</b> 后输入卡号或 PayPal 付款。
                    </div>
                    <div className="w-full h-[500px] rounded-2xl overflow-hidden bg-white shadow-inner border border-slate-700">
                      <iframe
                        id="kofiframe"
                        src={`https://ko-fi.com/${getCoffeeHandle()}/?hidefeed=true&widget=true&embed=true`}
                        className="w-full h-full border-none"
                        title="Ko-fi Embedded Widget"
                      />
                    </div>
                  </div>
                )}

                {/* Automatic Verification Assurance Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>感谢支持 · 请保留支付收据</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    支付结果以 Ko-fi 的收据为准。当前账号勋章不作为支付认证；公开赞助会显示在感谢墙。
                  </p>

                  {hasStartedPayment && (
                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] animate-fade-in">
                      <span className="text-slate-400">已在 Ko-fi 付款但遇网络延迟？</span>
                      <button
                        type="button"
                        id="btn-claim-coffee-badge-fallback"
                        onClick={handleConfirmAndClaimBadge}
                        className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                      >
                        查看支付确认说明 ➔
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Creator Settings & Payout Guide Section */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCreatorSettings(!showCreatorSettings)}
                    className="text-xs text-slate-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚙️ 站长收款链接设置</span>
                    {showCreatorSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPayoutGuide(!showPayoutGuide)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>全自动点亮勋章设置</span>
                  </button>
                </div>

                {/* Handle Configuration */}
                {showCreatorSettings && (
                  <form onSubmit={handleSaveHandle} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 animate-fade-in">
                    <label className="text-[11px] text-slate-300 font-medium">
                      输入您的 Ko-fi 用户名：
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                          ko-fi.com/
                        </span>
                        <input
                          type="text"
                          value={customHandle}
                          onChange={(e) => setCustomHandleInput(e.target.value)}
                          placeholder="pokepocket"
                          className="w-full pl-[85px] pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        保存
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      当前跳转目标：<span className="text-amber-400 font-mono">{currentCoffeeUrl}</span>
                    </p>
                  </form>
                )}

                {/* Automated Badge Guide Accordion */}
                {showPayoutGuide && (
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-sky-500/30 space-y-3 text-xs text-slate-300 animate-fade-in">
                    <div className="font-bold text-sky-300 flex items-center gap-1.5 text-sm">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <span>如何实现支付后 100% 全自动点亮勋章（免手动点击）</span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="font-bold text-amber-300">方法一：Ko-fi 支付后自动重定向（推荐，极简无代码）</span>
                        <p className="text-slate-400 mt-1">
                          在 Ko-fi 网页进入 <b>Settings ➔ Payment ➔ Advanced</b>，找到 <b>"Redirect URL after payment"</b>（支付后重定向网址），填入本站网址附加参数：
                        </p>
                        <div className="mt-1.5 p-2.5 bg-slate-950 rounded-xl border border-slate-700 flex items-center justify-between gap-2">
                          <span className="text-amber-300 font-mono text-[10px] break-all select-all flex-1">
                            {redirectReturnUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(redirectReturnUrl);
                              setCopiedRedirect(true);
                              showToast('重定向地址已复制！', 'success');
                              setTimeout(() => setCopiedRedirect(false), 2000);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                          >
                            {copiedRedirect ? <Check className="w-3 h-3 text-slate-950" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedRedirect ? '已复制' : '复制网址'}</span>
                          </button>
                        </div>
                        <p className="text-slate-400 mt-1">
                          用户在 Ko-fi 支付成功后，Ko-fi 会自动将用户跳回本站，本站会自动感应触发全屏礼花并秒级点亮勋章！
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="font-bold text-emerald-300">方法二：服务器 Webhook 实时监听（已内置部署）</span>
                        <p className="text-slate-400 mt-1">
                          本站后台已配置 <code>/api/kofi/webhook</code> 接收端口。在 Ko-fi 的 Webhook 设置中填入该地址，每笔真实赞助都会被服务器实时记录存入数据库。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'supporters' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-400">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>{t('hallOfFameSubtitle') || '感谢以下训练家为本站服务器与开发提供动力：'}</span>
                </span>
                <span className="font-mono text-[11px] text-amber-400">{supportersList.length} 位训练家</span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {supportersList.map((sup) => (
                  <div
                    key={sup.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start gap-3"
                  >
                    <img
                      src={sup.avatar}
                      alt={sup.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0 mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate">{sup.name}</span>
                          {sup.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              {sup.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-amber-400 shrink-0">
                          {sup.amount} ({sup.cups} ☕)
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 italic leading-relaxed">
                        "{sup.message}"
                      </p>

                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(sup.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            <span>PTCG Pocket Trader · Non-profit Community Project</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {t('close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
};
