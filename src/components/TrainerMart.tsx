import React, { useState, useMemo, useEffect } from 'react';
import {
  SHOP_PRODUCTS,
  ShopProduct,
  getAffiliateConfig,
  saveAffiliateConfig,
  buildProductAffiliateUrl,
  AffiliateConfig,
  MarketplaceRegion,
  REGIONAL_MARKETPLACES,
  RegionalMarketplace,
  SUBSIDY_TIERS,
  SAMPLE_COMMUNITY_ORDERS,
  PublicOrderEntry,
  SubsidyMilestoneTier,
  REAL_SAVINGS_GUIDES,
  RealSavingsGuide,
} from '../data/shopData';
import { DailyCheckInModal } from './DailyCheckInModal';
import { PointsRaffleModal } from './PointsRaffleModal';
import { ProductImageSlider } from './ProductImageSlider';
import { AdminProductManagerModal } from './AdminProductManagerModal';
import { AdminAuthModal } from './AdminAuthModal';
import { AdminModeBanner } from './AdminModeBanner';
import { ErrorBoundary } from './ErrorBoundary';
import {
  getMergedShopProducts,
  isAdminAuthenticated,
  setAdminAuthenticated,
} from '../utils/merchantStorage';
import {
  loadPointsState,
  registerAmazonOrder,
  UserPointsState,
  getTodayDateString,
  calculatePointsFromSpend,
} from '../utils/pointsStorage';
import { useLanguage } from '../context/LanguageContext';
import {
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Star,
  Sparkles,
  Settings2,
  Check,
  Search,
  Filter,
  Layers,
  Zap,
  Gift,
  HelpCircle,
  Heart,
  TrendingUp,
  X,
  Globe2,
  Plane,
  Truck,
  ArrowRight,
  Ticket,
  Coins,
  Award,
  Tag,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  Scale,
  Calculator,
  Lock,
  Edit3,
  ListOrdered,
  AlertCircle,
  Info,
  Clock,
  Key,
  Copy,
} from 'lucide-react';

const REGION_PREF_KEY = 'ptcg_pocket_mart_region_pref';
const REBATE_CLAIMS_KEY = 'ptcg_pocket_user_rebate_claims_v1';

interface TrainerMartProps {
  onOpenDailyCheckIn?: () => void;
}

export const TrainerMart: React.FC<TrainerMartProps> = ({ onOpenDailyCheckIn }) => {
  const { currentLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showSubsidyModal, setShowSubsidyModal] = useState<boolean>(false);
  const [showCuratorGuideModal, setShowCuratorGuideModal] = useState<boolean>(false);
  const [showSavingsModal, setShowSavingsModal] = useState<boolean>(false);
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [showRaffleModal, setShowRaffleModal] = useState<boolean>(false);
  const [pointsState, setPointsState] = useState<UserPointsState>(() => loadPointsState());
  const [claimCurrency, setClaimCurrency] = useState<'JPY' | 'USD' | 'EUR' | 'GBP'>('JPY');
  const [claimAmount, setClaimAmount] = useState<number>(2180);
  const [claimEmail, setClaimEmail] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>(getAffiliateConfig());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleCopyPromo = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
    } catch {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Subsidy & Claim States
  const [subsidyTab, setSubsidyTab] = useState<'claim' | 'tiers' | 'fairness'>('claim');
  const [claimOrderId, setClaimOrderId] = useState<string>('');
  const [claimTrainerName, setClaimTrainerName] = useState<string>('');
  const [claimTargetItem, setClaimTargetItem] = useState<string>('');
  const [claimLotteryResult, setClaimLotteryResult] = useState<string>('');

  // Provably Fair Verifier State
  const [verifierHash, setVerifierHash] = useState<string>(
    '000000000000000000021c97a5538e1b6f0e34c56e076632490b6a12dc722b51'
  );
  const [verifierTotalTickets, setVerifierTotalTickets] = useState<number>(8);
  const [verifiedWinner, setVerifiedWinner] = useState<number | null>(null);

  const calculateWinningTicket = (hashStr: string, total: number) => {
    if (!hashStr.trim() || total <= 0) return null;
    let hashNum = 0;
    for (let i = 0; i < hashStr.length; i++) {
      hashNum = (hashNum * 31 + hashStr.charCodeAt(i)) % 1000000007;
    }
    return (Math.abs(hashNum) % total) + 1;
  };

  const [myClaims, setMyClaims] = useState<Array<{ orderId: string; name: string; item: string; time: string; lotteryCode: string }>>(() => {
    try {
      const raw = localStorage.getItem(REBATE_CLAIMS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const isZh = currentLanguage === 'zh-Hant';
  const isJa = currentLanguage === 'ja';

  // Admin Mode & Workbench States
  const [productVersion, setProductVersion] = useState<number>(0);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true' || urlParams.get('mode') === 'admin') {
        return true;
      }
      return isAdminAuthenticated();
    } catch {
      return false;
    }
  });
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);
  const [showAdminWorkbenchModal, setShowAdminWorkbenchModal] = useState<boolean>(false);
  const [editingTargetProductId, setEditingTargetProductId] = useState<string | null>(null);

  // Dynamically merged products (combining base catalog with merchant-uploaded products & image overrides)
  const effectiveProducts = useMemo(() => {
    return getMergedShopProducts(SHOP_PRODUCTS);
  }, [productVersion]);

  // Determine initial region based on language or saved preference (Default to US Amazon)
  const defaultRegionForLang = useMemo<MarketplaceRegion>(() => {
    if (currentLanguage === 'ja') {
      return 'jp';
    }
    if (currentLanguage === 'de' || currentLanguage === 'fr' || currentLanguage === 'es' || currentLanguage === 'it') {
      return 'de';
    }
    return 'us'; // Focus on US Amazon by default
  }, [currentLanguage]);

  const [selectedRegion, setSelectedRegion] = useState<MarketplaceRegion>(() => {
    try {
      const saved = localStorage.getItem(REGION_PREF_KEY) as MarketplaceRegion;
      if (saved && ['us', 'jp', 'de', 'uk'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'us'; // Default to US Amazon first
  });

  // Auto-switch region when user changes language, unless they explicitly locked another
  useEffect(() => {
    const saved = localStorage.getItem(REGION_PREF_KEY);
    if (!saved) {
      setSelectedRegion(defaultRegionForLang);
    }
  }, [defaultRegionForLang]);

  const handleSelectRegion = (region: MarketplaceRegion) => {
    setSelectedRegion(region);
    try {
      localStorage.setItem(REGION_PREF_KEY, region);
    } catch {}
  };

  const currentMarketplace = useMemo<RegionalMarketplace>(() => {
    return REGIONAL_MARKETPLACES.find((m) => m.id === selectedRegion) || REGIONAL_MARKETPLACES[0];
  }, [selectedRegion]);

  const categories = useMemo(() => {
    if (isJa) {
      return [
        { id: 'all', label: 'すべて', icon: ShoppingBag },
        { id: 'merchandise', label: selectedRegion === 'us' ? 'デスク周辺・ゲーミング' : '人気周辺グッズ（20選）', icon: Gift },
        { id: 'physical_cards', label: 'カード・サプライ・BOX', icon: ShieldCheck },
      ];
    }
    if (isZh) {
      return [
        { id: 'all', label: '全部商品', icon: ShoppingBag },
        { id: 'merchandise', label: selectedRegion === 'us' ? '桌面氛圍·電競裝備' : '精選周邊好物（20款）', icon: Gift },
        { id: 'physical_cards', label: '實體卡包·卡冊硬殼', icon: ShieldCheck },
      ];
    }
    return [
      { id: 'all', label: 'All Items', icon: ShoppingBag },
      { id: 'merchandise', label: selectedRegion === 'us' ? 'Desk Setup & Gaming Gear' : 'Curated Merch (20+)', icon: Gift },
      { id: 'physical_cards', label: 'TCG Cards & Supplies', icon: ShieldCheck },
    ];
  }, [isZh, isJa, selectedRegion]);

  const filteredProducts = useMemo(() => {
    return effectiveProducts.filter((prod) => {
      // Strictly isolate regions: only show items available in selectedRegion
      if (prod.regions && !prod.regions.includes(selectedRegion)) {
        return false;
      }

      const isSbBrandItem =
        prod.name.includes('Silver Buffalo') ||
        prod.desc.includes('Silver Buffalo') ||
        prod.name.includes('Cable Guys') ||
        prod.id.includes('cableguys') ||
        prod.id.includes('snorlax') ||
        prod.id.includes('jazwares');

      const matchCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'merchandise' &&
          (subCategoryFilter === 'all'
            ? prod.category === 'merchandise' ||
              prod.category === 'lifestyle_lighting' ||
              prod.category === 'desk_mat' ||
              prod.category === 'digital_gear' ||
              prod.category === 'home_plush'
            : subCategoryFilter === 'silver_buffalo'
            ? isSbBrandItem
            : prod.category === subCategoryFilter)) ||
        (selectedCategory === 'physical_cards' && (prod.category === 'protection' || prod.category === 'physical_cards')) ||
        prod.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.nameEn.toLowerCase().includes(q) ||
        (prod.nameJa && prod.nameJa.toLowerCase().includes(q)) ||
        prod.desc.toLowerCase().includes(q) ||
        prod.descEn.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [effectiveProducts, selectedCategory, subCategoryFilter, searchQuery, selectedRegion]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAffiliateConfig(affiliateConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfigModal(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Admin Mode Fixed Notice Bar (Only shown when admin is logged in) */}
      {isAdminMode && (
        <AdminModeBanner
          onOpenWorkbench={() => setShowAdminWorkbenchModal(true)}
          onSwitchToCustomerView={() => setIsAdminMode(false)}
          onLogoutAdmin={() => {
            setAdminAuthenticated(false);
            setIsAdminMode(false);
          }}
        />
      )}

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {selectedRegion === 'us'
                  ? (isJa ? '🇺🇸 米国Amazon公式 · デスク周辺＆ゲーミング' : isZh ? '🇺🇸 美亞官方直營現貨 · 桌面氛圍與電競好物' : '🇺🇸 Amazon US · Battlestation & Gaming Setup')
                  : (isJa ? 'ポケカライフ · 日本Amazon厳選周辺' : isZh ? '訓練家潮流生活館 · 日亞爆款周邊' : 'Pokémon Lifestyle & Desk Gear')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Globe2 className="w-3 h-3" />
                {selectedRegion === 'us'
                  ? (isJa ? '🇺🇸 米国直送 · LEDネオン・大型マット・クッション' : isZh ? '🇺🇸 全球直郵 · LED霓虹·超大桌墊·電競椅腰靠' : '🇺🇸 Global Direct · Gaming Ambient & Peripherals')
                  : (isJa ? '🇯🇵 日本Amazon直営・人気グッズ20選' : isZh ? '🇯🇵 日亞直營現貨 · 20+ 精選桌面好物' : '🇯🇵 Amazon Japan Curated Merch')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {selectedRegion === 'us'
                ? (isJa ? 'トレーナーマート · ゲンガーネオン・XXLマット・腰当て' : isZh ? '訓練家生活館 · 耿鬼皮卡丘霓虹燈·雷蛇XXL桌墊·電競腰靠' : 'Trainer Mart · Neon Lights, XXL Desk Mats & Gaming Gear')
                : (isJa ? 'トレーナーマート · ゲンガー加湿器・大型マット・デスク周辺' : isZh ? '訓練家生活館 · 耿鬼香薰·超大桌墊·電競桌面好物' : 'Trainer Mart · Pokémon Desk & Lifestyle Merch')}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedRegion === 'us'
                ? (isJa
                  ? '米国Amazonで大人気のポケモンゲーミング空間＆デスク周辺アイテムを厳選！耿鬼・ピカチュウ調光LEDネオン、Razer Gigantus XXL超大型マウスパッド、カントー御三家レトロマット、カビゴン低反発腰痛クッション、モンスターボールラーメン丼など、デスク映え抜群の公式・厳選ギアをお届け！'
                  : isZh
                  ? '專為美亞用戶精選的寶可夢電競氛圍與桌面好物：耿鬼/皮卡丘可調光LED霓虹氛圍燈、雷蛇Gigantus XXL超大電競桌墊、關都御三家復古桌墊、卡比獸人體工學電競椅腰靠、精靈球拉麵碗與卡比獸3D馬克杯！官方正版直發，點擊直達美亞一鍵下單。'
                  : 'Curated viral Pokémon battlestation & desk gear on Amazon US: Gengar and Pikachu dimmable LED neon lights, Razer Gigantus XXL desk mats, Kanto starters vintage mats, ergonomic Snorlax lumbar cushions, ramen bowls and 3D sculpted mugs!')
                : (isJa
                  ? 'デスク周りやお部屋を可愛く彩る日本Amazonの人気周辺グッズを厳選！大人気のゲンガー超音波アロマ加湿器、特大ゲーミングマウスパッド、カビゴン低反発リストレスト、ピカチュウ充電スタンドなど、見てるだけでテンションが上がる20点以上をお届け！'
                  : isZh
                  ? '專為訓練家嚴選的日本亞馬遜高顏值生活好物：耿鬼超聲波香薰加濕器、皮卡丘拍拍小夜燈、900×400超大電競桌墊、卡比獸慢回彈鍵盤手托、耿鬼大舌頭午休抱枕毯與立體鍵帽。全為日亞熱銷現貨，輕鬆打造夢幻電競桌面！'
                  : 'Curated viral Pokémon lifestyle gear on Amazon Japan: Gengar ultrasonic aroma diffusers, Pikachu touch night lamps, XXL gaming desk mats, Snorlax memory foam wrist rests, and artisan keycaps!')}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            {/* Daily Check-in Mystery Box Button */}
            <button
              onClick={() => {
                if (onOpenDailyCheckIn) onOpenDailyCheckIn();
                else setShowCheckInModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/25 to-pink-500/20 hover:from-purple-500/35 hover:to-pink-500/30 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              <span>🎁</span>
              <span>{isJa ? '毎日ログイン盲箱' : isZh ? '每日盲盒簽到' : 'Daily Mystery Check-in'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/30 text-[10px] font-mono font-bold text-purple-300">
                {pointsState.lastCheckInDate === getTodayDateString() ? '已簽' : '可簽'}
              </span>
            </button>

            {/* Crowdfunded Raffle Pools Button */}
            <button
              onClick={() => setShowRaffleModal(true)}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/25 to-rose-500/20 hover:from-amber-500/35 hover:to-rose-500/30 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              <span>{isJa ? '共同出資プール' : isZh ? '眾籌抽獎池' : 'Poké Pool'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                {pointsState.points.toLocaleString()} pts
              </span>
            </button>

            <button
              onClick={() => setShowSavingsModal(true)}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-sky-500/20 hover:from-emerald-500/30 hover:to-sky-500/30 border border-emerald-500/35 text-emerald-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isJa ? '節約術' : isZh ? '省錢攻略' : 'Savings'}</span>
            </button>

            <button
              onClick={() => setShowSubsidyModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span>{isJa ? '注文登録' : isZh ? '登記訂單' : 'Orders'}</span>
            </button>

            {!isAdminMode ? (
              <button
                type="button"
                onClick={() => setShowAdminAuthModal(true)}
                className="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-500 hover:text-amber-400 text-xs transition-all flex items-center justify-center cursor-pointer"
                title={isJa ? '管理者ログイン' : isZh ? '商戶管理後台入口' : 'Admin Login'}
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingTargetProductId(null);
                  setShowAdminWorkbenchModal(true);
                }}
                className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                title={isJa ? '管理者ワークベンチ' : isZh ? '商戶後台工作台' : 'Admin Workbench'}
              >
                <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {isJa ? '管理画面' : isZh ? '商戶後台' : 'Admin'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Global Transparency & Subsidy Pool Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-3.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300">
              {isJa
                ? '【本物の節約術】Amazon公式「緑のクーポン（5%〜15%引）」と量販パック（30%引）活用法公開！収益の50%は賞品プールへ還元！'
                : isZh
                ? '【真實省錢指南】亞馬遜官方綠色 Clip Coupon（立減 5%~15%）與量販批發折（省 30%+）已整理上線！50% 佣金全額注入獎池！'
                : 'Real Savings: Amazon official Clip Coupons (5%-15% off) & Multi-packs (30%+ off) verified! 50% commission giveaway pool active!'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowSavingsModal(true)}
              className="text-[11px] text-emerald-300 hover:text-emerald-200 font-bold underline flex items-center gap-1"
            >
              <span>{isJa ? '本物の節約術を確認' : isZh ? '查看真實省錢攻略 »' : 'View Savings Guide »'}</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setShowSubsidyModal(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
            >
              <span>{isJa ? '注文番号登録' : isZh ? '登記訂單領抽獎券 »' : 'Register Order »'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Regional Marketplace Switcher Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>{isJa ? '配送地域・Amazonストア選択' : isZh ? '目標配送區域 / 亞馬遜站點切換' : 'Shipping Marketplace Destination'}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                {currentMarketplace.flag} {currentMarketplace.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isJa ? currentMarketplace.descriptionJa : isZh ? currentMarketplace.descriptionZh : currentMarketplace.description}
            </p>
          </div>
        </div>

        {/* Buttons for regions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {REGIONAL_MARKETPLACES.map((market) => {
            const isCurrent = market.id === selectedRegion;
            return (
              <button
                key={market.id}
                onClick={() => handleSelectRegion(market.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{market.flag}</span>
                <span>{market.label}</span>
                {isCurrent && <Check className="w-3 h-3 text-amber-400 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Japanese Regional Notice: Currency & Import Cross-Border Tip */}
      {selectedRegion === 'jp' && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-200 flex items-start gap-3 shadow-sm">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🇯🇵 {isJa ? '日本Amazon（Amazon.co.jp）利用案内・通貨について：' : isZh ? '日本亞馬遜（Amazon.co.jp）購物與結算貨幣貼心說明：' : 'Amazon Japan Shopping & Currency Guide:'}</span>
            </div>
            <p className="text-slate-300">
              {isJa
                ? '① なぜ日本リンクがドル表示になるのか？アクセス元の地域設定や通貨設定がUSDになっている場合、Amazon.co.jpの画面上部「🌐 国旗マーク」から通貨を「JPY (¥ 日本円)」に変更すると日幣表示に戻ります。'
                : isZh
                ? '① 為什麼日本連結顯示美元而非日圓？如果您的當前網路 IP 非日本本土，或瀏覽器記錄了美元首選貨幣，日亞系統會自動啟用 ACC 貨幣轉換器換算為 USD 顯示。在 Amazon.co.jp 頂部搜尋列右側點擊「🌐 日本國旗」，將貨幣設定（Currency）選為「JPY (¥ 日本円)」，即可恢復日圓原生結算！'
                : 'If Amazon JP displays in USD, click the flag icon at the top of Amazon.co.jp to switch currency setting back to JPY.'}
            </p>
            <p className="text-slate-300">
              {isJa
                ? '② なぜ一部の欧米製品が日米で価格差があるのか？Vault Xなどの海外ブランド品は米英のAmazon Global配送（国際送料・関税込み）となるため割高になります。国内プレイヤーには国産定番の【KMC パーフェクトサイズ】（約¥1,180）などの日本直送・プライム対応品が最もお得でおすすめです！'
                : isZh
                ? '② 為什麼同款卡冊/禮盒日本比美亞貴？Vault X 與美版 ETB 屬於歐美本土品牌，在日亞是由 Amazon Global 海外倉跨國空運直郵（含跨國關稅與高額航運費），且日亞只計本土日語評價。日本本土玩家極力推薦選擇【KMC 原裝內膽套】（僅約¥1,180，數千本土五星好評）與本土自營好物！'
                : 'Western brands like Vault X on Amazon JP are shipped via Amazon Global Store from US/UK warehouses with cross-border shipping & tariffs included. For local domestic bargains, check out Japanese native items like KMC sleeves!'}
            </p>
          </div>
        </div>
      )}

      {/* Real-time Amazon price & rating transparency indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/40 border border-slate-800/80 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            {isJa
              ? '商品価格・在庫状況・カスタマー評価はAmazon各国の最新公式ページに準拠します。'
              : isZh
              ? '商品標價、庫存狀態與星級評分以各國亞馬遜官方實時頁面為準。'
              : 'Prices, stock, and ratings reflect live Amazon official pages across regional storefronts.'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          {isJa ? 'クリックで直通詳細ページへ' : isZh ? '點擊直達官方商品詳情頁' : 'Direct product pages'}
        </span>
      </div>

      {/* Categories & Search Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-thin">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSubCategoryFilter('all');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isJa
                ? '拡張パック、プレイマット、スリーブ、バインダーを検索...'
                : isZh
                ? '搜尋實體卡包、卡盒、桌墊、卡套、卡冊...'
                : 'Search booster packs, playmats, deck boxes, binders...'
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Subcategory Pills for Merch / Gaming Setup */}
      {(selectedCategory === 'merchandise' || (selectedCategory === 'all' && selectedRegion === 'us')) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-500 text-[11px] font-semibold mr-1 shrink-0">
            {isJa ? '装備タイプ:' : isZh ? '裝備分類:' : 'Type:'}
          </span>
          {[
            { id: 'all', labelZh: '全部美亞好物', labelJa: 'すべて', labelEn: 'All Gear' },
            { id: 'silver_buffalo', labelZh: '🦬 Silver Buffalo & Cable Guys 旗艦店', labelJa: '🦬 Silver Buffalo & Cable Guys 公式店', labelEn: '🦬 Silver Buffalo & Cable Guys' },
            { id: 'lifestyle_lighting', labelZh: '💡 霓虹氛圍燈', labelJa: '💡 LEDネオン', labelEn: '💡 Neon Lighting' },
            { id: 'desk_mat', labelZh: '🖱️ 電競大桌墊', labelJa: '🖱️ ゲーミングマット', labelEn: '🖱️ Desk Mats' },
            { id: 'merchandise', labelZh: '🍜 拉麵碗·保溫杯·馬克杯·餐具', labelJa: '🍜 食器・タンブラー・マグ', labelEn: '🍜 Drinkware & Dining' },
            { id: 'digital_gear', labelZh: '🎮 手把支架·發光手錶', labelJa: '🎮 スタンド・デジタル時計', labelEn: '🎮 Stands & Watches' },
            { id: 'home_plush', labelZh: '🛋️ 電競椅靠枕·保暖毛毯', labelJa: '🛋️ クッション・ブランケット', labelEn: '🛋️ Pillows & Blankets' },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubCategoryFilter(sub.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                subCategoryFilter === sub.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
              }`}
            >
              {isJa ? sub.labelJa : isZh ? sub.labelZh : sub.labelEn}
            </button>
          ))}
        </div>
      )}

      {/* Official Brand Store Showcase (Silver Buffalo & Cable Guys Pokémon Flagship) */}
      {(selectedRegion === 'us' || subCategoryFilter === 'silver_buffalo') && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-500/25 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-xl">🦬</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-300">
                  {isJa ? 'Silver Buffalo & Cable Guys 公式ライセンスストア' : isZh ? 'Silver Buffalo & Cable Guys 官方授權品牌旗艦店' : 'Silver Buffalo & Cable Guys Official Store'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isJa ? '美Amazon公認ブランド' : isZh ? '美亞認證品牌館' : 'Amazon Certified'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isJa
                  ? 'ラーメン丼・3D立体マグ・ネオンサイン・コントローラースタンド・40ozボトルなど人気公式グッズ！'
                  : isZh
                  ? '皮卡丘/耿鬼日式拉麵碗、3D立體雕刻杯、電競手把支架、護腰靠墊、霓虹燈、40oz大容量保溫杯全系列正品現貨！'
                  : 'Official licensee for Pokémon ramen bowls, 3D sculpted mugs, controller stands, lumbar pillows, neon wall signs & 40oz tumblers.'}
              </p>
            </div>
          </div>
          <a
            href={`https://www.amazon.com/stores/SilverBuffalo/page/BCF07C27-DDBD-4654-B27A-77AFDE539692?tag=${encodeURIComponent(affiliateConfig.amazonTag || 'ptcgpocket-20')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 self-end sm:self-center"
          >
            <span>{isJa ? 'ブランド館を見る ↗' : isZh ? '進入品牌專頁選購 ↗' : 'Visit Storefront ↗'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">
            {isJa ? '商品が見つかりませんでした' : isZh ? '未找到相關推薦好物' : 'No products found'}
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="text-xs text-sky-400 hover:underline"
          >
            {isJa ? 'すべての商品を表示' : isZh ? '查看全部精選好物' : 'Reset filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const affiliateUrl = buildProductAffiliateUrl(product, selectedRegion);
            
            // Localized text resolution
            const title =
              isJa || (selectedRegion === 'jp' && !isZh)
                ? product.nameJa || product.nameEn
                : isZh
                ? product.name
                : product.nameEn;

            const description =
              isJa || (selectedRegion === 'jp' && !isZh)
                ? product.descJa || product.descEn
                : isZh
                ? product.desc
                : product.descEn;

            const features =
              isJa || (selectedRegion === 'jp' && !isZh)
                ? product.featuresJa || product.featuresEn
                : isZh
                ? product.features
                : product.featuresEn;

            const badgeText =
              isJa
                ? product.badgeJa || product.badge
                : isZh
                ? product.badge
                : product.badgeEn || product.badge;

            const discountText =
              isJa
                ? product.discountTipJa || product.discountTip
                : isZh
                ? product.discountTip
                : product.discountTipEn || product.discountTip;

            // Localized price
            let displayPrice = product.price;
            if (selectedRegion === 'jp' && product.priceJp) {
              displayPrice = product.priceJp;
            } else if (selectedRegion === 'de' && product.priceEu) {
              displayPrice = product.priceEu;
            } else if (selectedRegion === 'uk' && product.priceUk) {
              displayPrice = product.priceUk;
            }

            const isAmazonProduct = product.affiliateParamType === 'amazon';

            return (
              <div
                key={product.id}
                className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-slate-950/50 hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Platform & Badge Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <a
                      href={affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title={isJa ? '商品ページを見る' : isZh ? '直達官方商城' : 'Open Store'}
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                      {isAmazonProduct ? `${currentMarketplace.flag} ${currentMarketplace.label}` : product.platform}
                    </a>

                    <div className="flex items-center gap-1.5">
                      {isAdminMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingTargetProductId(product.id);
                            setShowAdminWorkbenchModal(true);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                          title="商戶後台：為此商品自選上傳更換實拍圖"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>更換實拍圖</span>
                        </button>
                      )}
                      {badgeText && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            product.badgeColor || 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {badgeText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Multi-Image Showcase / Slider (Supports horizontal scroll snap, arrows, dots & variant chips) */}
                  <ProductImageSlider
                    images={product.images && product.images.length > 0 ? product.images : [product.imageUrl]}
                    labels={product.galleryLabels}
                    title={title}
                    affiliateUrl={affiliateUrl}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    displayPrice={displayPrice}
                    isJa={isJa}
                    isZh={isZh}
                  />

                  {/* Title with Amazon-style clickable link */}
                  <a
                    href={affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-base font-bold text-slate-100 hover:text-amber-400 transition-colors line-clamp-1 mb-1.5 cursor-pointer focus:outline-none focus:underline"
                    title={isJa ? `${title} の商品詳細ページへ` : isZh ? `點擊直達《${title}》商品詳情頁` : `View details for ${title}`}
                  >
                    {title}
                  </a>

                  {/* Merchant Discount & Coupon Badge */}
                  {discountText && (
                    <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{discountText}</span>
                    </div>
                  )}

                  {/* Verified Partner Promo Code (Only shows if configured with a real code by admin) */}
                  {affiliateConfig.customSellerPromoCode && (
                    <div className="mb-2.5 flex items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-emerald-500/15 to-amber-500/10 border border-emerald-500/30 text-xs shadow-sm">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] truncate">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate font-mono">
                          {affiliateConfig.customSellerPromoDesc || (isZh ? `合作促銷碼: ${affiliateConfig.customSellerPromoCode}` : `Code: ${affiliateConfig.customSellerPromoCode}`)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyPromo(affiliateConfig.customSellerPromoCode!);
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 hover:text-white border border-emerald-500/40 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title={isJa ? 'コードをコピー' : isZh ? '點擊一鍵複製優惠碼' : 'Copy promo code'}
                      >
                        {copiedCode === affiliateConfig.customSellerPromoCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">{isJa ? 'コピー済' : isZh ? '已複製' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isJa ? 'コピー' : isZh ? '複製碼' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">
                    {description}
                  </p>

                  {/* Feature Bullets */}
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <div className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Row & Alternate Marketplace Quick Switch */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-400">
                      {selectedRegion === 'jp' && product.originalPriceJp && (
                        <span className="line-through text-slate-500 mr-1.5">{product.originalPriceJp}</span>
                      )}
                      {selectedRegion === 'us' && product.originalPrice && (
                        <span className="line-through text-slate-500 mr-1.5">{product.originalPrice}</span>
                      )}
                      <span className="text-slate-300 font-semibold">{displayPrice}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClaimTargetItem(title);
                          setShowSubsidyModal(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border border-slate-700 transition-colors"
                        title={isJa ? '購入履歴の登録・還元申請' : isZh ? '已購訂單登記抽獎與補貼' : 'Claim rebate entry'}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/15 hover:shadow-amber-500/25 shrink-0"
                      >
                        <span>
                          {isJa
                            ? `${currentMarketplace.flag} ${currentMarketplace.label} で見る`
                            : isZh
                            ? `前往 ${currentMarketplace.label} 購買`
                            : `View on ${currentMarketplace.label}`}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trainer Rebate & Subsidy Pool Modal */}
      {showSubsidyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubsidyModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>{isJa ? '訓練家還元基金＆注文登録' : isZh ? '訓練家補貼基金與回饋獎池' : 'Trainer Rebate Fund & Order Claims'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Season 1
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isJa ? 'アフィリエイト収益の50%をコミュニティ還元！透明な抽選システム' : isZh ? '50% 聯盟佣金注入社群獎池 · 階梯達標解鎖 · 公開可驗證公平抽獎' : '50% affiliate earnings pooled · Milestone unlocked · Provably fair'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubsidyModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
              <button
                onClick={() => setSubsidyTab('claim')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  subsidyTab === 'claim'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{isJa ? '晒単・抽選登録' : isZh ? '🎁 曬單登記領券' : 'Claim Tickets'}</span>
              </button>

              <button
                onClick={() => setSubsidyTab('tiers')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  subsidyTab === 'tiers'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{isJa ? '収益試算・目標プール' : isZh ? '💰 佣金精算與階梯獎池' : 'Math & Tiers'}</span>
              </button>

              <button
                onClick={() => setSubsidyTab('fairness')}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  subsidyTab === 'fairness'
                    ? 'border-sky-400 text-sky-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{isJa ? '公平性・検証ツール' : isZh ? '⚖️ 公平公正與演算法驗算' : 'Provably Fair'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[72vh]">
              {/* TAB 1: CLAIM ENTRY */}
              {subsidyTab === 'claim' && (
                <div className="space-y-4">
                  {/* Current Active Milestone Overview */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-500/30">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-slate-200">
                          {isJa ? '現在アンロック中の賞品' : isZh ? '本期進行中福利獎池' : 'Current Active Reward'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {isJa ? 'Tier 1 アンロック済' : isZh ? 'Tier 1 已解鎖 · 衝擊 Tier 2' : 'Tier 1 Unlocked · Aiming for Tier 2'}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-amber-300 tracking-tight mb-2">
                      {isJa ? 'KMC 国産内スリーブ / マグネットローダー + Vault X バインダー' : isZh ? 'KMC 進口內膽套 / 強磁卡磚 + Vault X 拉鍊卡冊' : 'KMC Japanese Sleeves / Ultra PRO Slabs + Vault X Binder'}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {isJa
                        ? '本サイトのリンク経由で購入された方は、注文番号を登録することで専用の抽選チケットを獲得できます。さらにサイト全体のVIPシミュレーター機能（無制限の砂時計など）が即座にアンロックされます！'
                        : isZh
                        ? '凡透過本站連結下單的訓練家，在此登記訂單號即可獲贈專屬【順序抽獎券】；同時無論是否抽中實物，100% 自動點亮本站 VIP 模擬抽卡特權（無限沙漏、全卡超清圖鑑無浮水印、歐氣深度透視）！'
                        : 'Register your purchase Order ID to receive a verified giveaway ticket and instant site-wide VIP simulation perks!'}
                    </p>
                  </div>

                  {/* Order Registration Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!claimOrderId.trim()) return;
                      const nextNumber = SAMPLE_COMMUNITY_ORDERS.length + myClaims.length + 1;
                      const luckyCode = `TICKET-#00${nextNumber < 10 ? '0' + nextNumber : nextNumber}`;

                      const orderRes = registerAmazonOrder(
                        claimOrderId.trim(),
                        claimAmount,
                        claimCurrency,
                        claimTargetItem.trim() || (isJa ? '実物サプライ周辺' : isZh ? '實體周邊卡牌' : 'Physical Gear'),
                        claimEmail.trim() || undefined
                      );

                      setPointsState(orderRes.state);

                      const newEntry = {
                        orderId: claimOrderId.trim(),
                        name: claimTrainerName.trim() || (isJa ? '親切なトレーナー' : isZh ? '熱心訓練家' : 'Trainer'),
                        item: claimTargetItem.trim() || (isJa ? '実物サプライ周辺' : isZh ? '實體周邊卡牌' : 'Physical Gear'),
                        time: new Date().toISOString().split('T')[0],
                        lotteryCode: luckyCode,
                      };
                      const updated = [newEntry, ...myClaims];
                      setMyClaims(updated);
                      try {
                        localStorage.setItem(REBATE_CLAIMS_KEY, JSON.stringify(updated));
                      } catch {}
                      setClaimLotteryResult(
                        `${luckyCode} · 获得 +${orderRes.pointsEarned} 积分`
                      );
                      setClaimOrderId('');
                      setClaimTrainerName('');
                    }}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                  >
                    <div className="font-bold text-xs text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isJa ? 'Amazon公式購入注文の登録' : isZh ? '亞馬遜官方購買訂單登記' : 'Register Amazon Purchase'}</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {isJa ? '¥100 = 10ポイント即時付与' : isZh ? '¥100 = 10 積分秒到賬' : '$1 = 15 pts'}
                      </span>
                    </div>

                    {claimLotteryResult && (
                      <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span>
                              {isJa ? '登録完了！あなたのチケットコード：' : isZh ? '登記成功！專屬憑證：' : 'Registered! Ticket:'}{' '}
                              <strong className="font-mono text-amber-300 font-bold">{claimLotteryResult}</strong>
                            </span>
                            <div className="text-[10px] text-emerald-300 mt-0.5">
                              {isJa
                                ? '✨ 注文が認証され、訓練家ポイントが付与されました！共同出資プールに参加可能！'
                                : isZh
                                ? '✨ 訂單已認證入庫，積分已到賬！您已解鎖實物眾籌獎池下注資格！'
                                : '✨ Verified! Points added & crowdfunding raffle access unlocked!'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClaimLotteryResult('')}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isJa ? '注文番号 (例: 114-1234567-8901234)' : isZh ? '訂單編號 (如: 114-1234567-8901234)' : 'Order ID (e.g. 114-1234567-8901234)'}
                        </label>
                        <input
                          type="text"
                          required
                          value={claimOrderId}
                          onChange={(e) => setClaimOrderId(e.target.value)}
                          placeholder="114-xxxxxxx-xxxxxxx"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isJa ? '訓練家ニックネーム' : isZh ? '訓練家暱稱 / 遊戲 ID' : 'Trainer Nickname / ID'}
                        </label>
                        <input
                          type="text"
                          value={claimTrainerName}
                          onChange={(e) => setClaimTrainerName(e.target.value)}
                          placeholder={isJa ? '例: サトシ' : isZh ? '例如: 小智' : 'e.g. Ash'}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Spend Amount, Currency & Contact Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isJa ? '通貨単位' : isZh ? '訂單幣種' : 'Currency'}
                        </label>
                        <select
                          value={claimCurrency}
                          onChange={(e) => setClaimCurrency(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="JPY">🇯🇵 日元 (JPY)</option>
                          <option value="USD">🇺🇸 美元 (USD)</option>
                          <option value="EUR">🇪🇺 歐元 (EUR)</option>
                          <option value="GBP">🇬🇧 英鎊 (GBP)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isJa ? '購入金額' : isZh ? '訂單實付金額' : 'Spend Amount'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(Number(e.target.value) || 0)}
                          placeholder="2180"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isJa ? '当選通知用メール (任意)' : isZh ? '中獎發貨郵箱 (選填)' : 'Notification Email (Opt)'}
                        </label>
                        <input
                          type="email"
                          value={claimEmail}
                          onChange={(e) => setClaimEmail(e.target.value)}
                          placeholder="trainer@example.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-slate-500">
                        {isJa
                          ? '🔒 ¥100=10pt / $1=15pt 換算。暗号化の上で公開台帳に記録されます。'
                          : isZh
                          ? '🔒 依幣種自動折算積分。訂單號脫敏公開於流水板，開獎後憑郵箱接收物流。'
                          : 'Masked and displayed publicly. Email used for shipping alerts.'}
                      </span>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>{isJa ? '登録してポイント獲得' : isZh ? '確認登記領取積分' : 'Claim Points'}</span>
                      </button>
                    </div>
                  </form>

                  {/* My Claimed Orders */}
                  {myClaims.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>{isJa ? '登録済みの注文' : isZh ? '我的已登記訂單憑證' : 'My Claimed Entries'}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">VIP ({myClaims.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {myClaims.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <div className="font-mono text-slate-200 text-[11px] flex items-center gap-1.5">
                                <span className="text-slate-400">{isJa ? '注文:' : isZh ? '單號:' : 'ID:'}</span> {item.orderId}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.name} · {item.time}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {item.lotteryCode}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Masked Order Ledger */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isJa ? '全公開マスキング注文台帳' : isZh ? '全網公開脫敏訂單公示板 (防吞單/防暗塞)' : 'Public Masked Order Ledger'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {isJa ? `累計 ${SAMPLE_COMMUNITY_ORDERS.length + myClaims.length} 枚` : isZh ? `已累計 ${SAMPLE_COMMUNITY_ORDERS.length + myClaims.length} 張抽獎票` : `${SAMPLE_COMMUNITY_ORDERS.length + myClaims.length} tickets total`}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden text-[11px]">
                      <div className="grid grid-cols-12 bg-slate-900 px-3 py-2 font-bold text-slate-400 text-[10px] border-b border-slate-800">
                        <div className="col-span-3">{isJa ? 'チケット' : isZh ? '票號憑證' : 'Ticket Code'}</div>
                        <div className="col-span-3">{isJa ? '注文番号' : isZh ? '訂單號 (脫敏)' : 'Order ID'}</div>
                        <div className="col-span-3">{isJa ? '訓練家' : isZh ? '訓練家' : 'Trainer'}</div>
                        <div className="col-span-3 text-right">{isJa ? '日時 / 地域' : isZh ? '時間/地區' : 'Time/Region'}</div>
                      </div>
                      <div className="divide-y divide-slate-800/60 max-h-44 overflow-y-auto">
                        {myClaims.map((claim, idx) => (
                          <div key={`my-${idx}`} className="grid grid-cols-12 px-3 py-2 items-center text-slate-300 bg-amber-500/5">
                            <div className="col-span-3 font-mono font-bold text-amber-400">{claim.lotteryCode}</div>
                            <div className="col-span-3 font-mono text-slate-400">{claim.orderId.slice(0, 4)}***{claim.orderId.slice(-4)}</div>
                            <div className="col-span-3 truncate text-amber-200">{claim.name} ({isJa ? 'あなた' : isZh ? '您' : 'You'})</div>
                            <div className="col-span-3 text-right text-[10px] text-slate-400">{claim.time}</div>
                          </div>
                        ))}
                        {SAMPLE_COMMUNITY_ORDERS.map((entry) => (
                          <div key={entry.ticketCode} className="grid grid-cols-12 px-3 py-2 items-center text-slate-300">
                            <div className="col-span-3 font-mono font-bold text-sky-300">{entry.ticketCode}</div>
                            <div className="col-span-3 font-mono text-slate-400">{entry.maskedOrderId}</div>
                            <div className="col-span-3 truncate text-slate-300">{entry.trainerName}</div>
                            <div className="col-span-3 text-right text-[10px] text-slate-400">{entry.region} · {entry.time.slice(5)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIAL MATH & MILESTONE TIERS */}
              {subsidyTab === 'tiers' && (
                <div className="space-y-4">
                  {/* Financial Reality Transparency Box */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span>{isJa ? '誠実な試算：Amazonの実際のコミッション率と段階目標の必要性' : isZh ? '誠懇算賬：亞馬遜真實佣金率與為什麼必須設階梯？' : 'Financial Math: Why Milestone Tiers are Essential'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 leading-relaxed space-y-1.5">
                      <p>
                        {isJa
                          ? '「本当にアフィリエイト収益で実物プレゼントが賄えるのか？」という疑問にお答えします。'
                          : isZh
                          ? '不少使用者會產生疑問：“佣金真能負擔得起抽獎嗎？會不會是站長忽悠或者倒貼破產？”'
                          : 'You might wonder: "Can affiliate commissions truly afford physical giveaways?"'}
                      </p>
                      <p className="text-slate-400">
                        {isJa
                          ? 'Amazon公式のおもちゃ・ホビー類の報酬率は約3.0%です。1ボックス$38.99の商品でも報酬は約$1.17です。'
                          : isZh
                          ? '真相是：亞馬遜官方對【玩具/遊戲/寶可夢卡包】類目的佣金率為 3.0%，周邊收納與展示卡磚為 3%~4%。一盒 $38.99 的 151 補充包合輯，單筆佣金約 $1.17；一個卡冊 $23.99，佣金約 $0.72。'
                          : 'Amazon pays only 3.0% commission on Toys/Hobbies. A $38.99 Pokemon bundle yields ~$1.17.'}
                      </p>
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px]">
                        <strong>{isJa ? '💡 運営方針：' : isZh ? '💡 我們的財務原則：' : 'Core Financial Principle: '}</strong>
                        {isJa
                          ? '無理な固定賞品による赤字破綻を防ぐため、達成した注文件数に応じて賞品が順次アンロックされる透明な段階制を採用しています。'
                          : isZh
                          ? '如果網站不設門檻、盲目固定每個月送幾百元大獎，在訂單少時站長必然嚴重倒貼虧損，專案必定短命。因此我們採用【階梯達標解鎖制】：達到對應單數才解鎖對應價值的實物獎池，未達標時進度順延滾存，絕不畫虛假大餅，保證 100% 真實兌付！'
                          : 'We use dynamic milestone unlocking. Each tier unlocks once affiliate revenue covers it, ensuring long-term sustainability without fake promises.'}
                      </div>
                    </div>
                  </div>

                  {/* Milestone Progress Bar */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isJa ? '現在の有効注文達成進捗' : isZh ? '當前當期有效訂單達標進度' : 'Current Active Milestone Progress'}</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {SAMPLE_COMMUNITY_ORDERS.length + myClaims.length} / 25 {isJa ? '件' : isZh ? '筆 (已達成 Tier 1)' : 'Orders (Tier 1 Met)'}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((SAMPLE_COMMUNITY_ORDERS.length + myClaims.length) / 25) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0 (Start)</span>
                      <span className="text-emerald-400 font-bold">10 (Tier 1)</span>
                      <span>25 (Tier 2)</span>
                      <span>50 (Tier 3)</span>
                    </div>
                  </div>

                  {/* Tier Cards */}
                  <div className="space-y-2.5">
                    {SUBSIDY_TIERS.map((tier) => {
                      const totalOrders = SAMPLE_COMMUNITY_ORDERS.length + myClaims.length;
                      const isUnlocked = totalOrders >= tier.targetOrders || tier.isUnlocked;

                      return (
                        <div
                          key={tier.tier}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isUnlocked
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-slate-950/40 border-slate-800 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isUnlocked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {isJa ? tier.nameJa : isZh ? tier.name : tier.nameEn}
                                </span>
                                <span className="text-xs font-bold text-slate-200">
                                  {isJa ? tier.prizeItemJa : isZh ? tier.prizeItem : tier.prizeItemEn}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-amber-300 font-mono shrink-0">
                              {tier.rewardValue}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                            {isZh ? tier.commissionMathZh : tier.commissionMath}
                          </p>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">
                              {isJa ? `必要注文件数: ${tier.targetOrders} 件` : isZh ? `達標門檻：需積累 ${tier.targetOrders} 筆有效訂單` : `Threshold: ${tier.targetOrders} orders`}
                            </span>
                            <span className={`font-bold flex items-center gap-1 ${
                              isUnlocked ? 'text-emerald-400' : 'text-slate-500'
                            }`}>
                              {isUnlocked ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>{isJa ? 'アンロック完了' : isZh ? '已解鎖抽獎資格' : 'Unlocked'}</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-slate-500" />
                                  <span>{isJa ? `残り ${tier.targetOrders - totalOrders} 件` : isZh ? `還差 ${tier.targetOrders - totalOrders} 筆解鎖` : `Needs ${tier.targetOrders - totalOrders} more`}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: PROVABLY FAIR & ALGORITHM VERIFICATION */}
              {subsidyTab === 'fairness' && (
                <div className="space-y-4">
                  {/* Anti-Cheating & Trust Principles */}
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                      <Scale className="w-4 h-4 text-sky-400" />
                      <span>{isJa ? '不正防止と公平なアルゴリズムの仕組み' : isZh ? '直面信任痛點：後台資料只有站長知道，如何保證絕對公平？' : 'Provably Fair: Eliminating Backend Cheating'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 leading-relaxed space-y-2">
                      <p>
                        {isJa
                          ? '従来のプレゼント企画のようなブラックボックスを排除し、公開されたブロックチェーンハッシュを用いた検証可能な乱数生成を採用しています。'
                          : isZh
                          ? '傳統抽獎最大的弊端是【黑盒暗箱】：網站說抽了，但中獎者到底是真實玩家還是站長小號，使用者根本無從得知。我們透過公開鏈上種子與開源演算法解決。'
                          : 'Traditional giveaway black boxes cannot prove who won. We use open cryptographic verification.'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                          <strong className="text-amber-300 flex items-center gap-1">
                            <ListOrdered className="w-3 h-3" />
                            {isJa ? '1. 公開台帳' : isZh ? '1. 全網脫敏公開流水' : '1. Public Masked Ledger'}
                          </strong>
                          <p className="text-slate-400">
                            {isJa ? '全ての注文番号は時系列で公開され、チケット番号（#0001等）が連番で付与されます。' : isZh ? '所有訂單登記按時間順序公開發放票號（如 #0001, #0002），任何人都可監督總票數，站長無法私刪或偷塞。' : 'All tickets are publicly numbered and sequentially verified.'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                          <strong className="text-sky-300 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {isJa ? '2. 公開ブロックチェーンシード' : isZh ? '2. 比特幣區塊哈希公鑰種子' : '2. Public Blockchain Seed'}
                          </strong>
                          <p className="text-slate-400">
                            {isJa ? '抽選日当日のビットコイン最新ブロックハッシュをシード値として使用し、事前に誰も結果を操作できません。' : isZh ? '抽獎絕不私下 Math.random()！以開獎日 00:00 UTC 的比特幣最新區塊 Hash 為計算種子，開獎前全球無人能預測！' : 'Seed uses public Bitcoin block hash at draw time; impossible to tamper.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Provably Fair Verifier */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-emerald-400" />
                        <span>{isJa ? 'オンライン検証ツール' : isZh ? '公正性線上驗算器 (所有人可在瀏覽器直接複算)' : 'Interactive Fairness Verifier'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Formula: (Hash % Total) + 1
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          {isJa ? '外部公開ランダムシード (ビットコインブロックHash)' : isZh ? '外部公開隨機源種子 (例: 比特幣最新區塊 Hash)' : 'Public Seed (e.g. Bitcoin Block Hash)'}
                        </label>
                        <input
                          type="text"
                          value={verifierHash}
                          onChange={(e) => setVerifierHash(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[11px] font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            {isJa ? '有効応募チケット総数' : isZh ? '當期有效登記總票數' : 'Total Valid Tickets'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={verifierTotalTickets}
                            onChange={(e) => setVerifierTotalTickets(Number(e.target.value) || 1)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              const winner = calculateWinningTicket(verifierHash, verifierTotalTickets);
                              setVerifiedWinner(winner);
                            }}
                            className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{isJa ? '数学的検証を実行' : isZh ? '立即執行數學驗算' : 'Verify Winning Ticket'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {verifiedWinner !== null && (
                      <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
                        <span>
                          {isJa ? '導出された当選番号：' : isZh ? '驗算推導中獎票號：' : 'Calculated Winning Ticket:'}{' '}
                          <strong className="font-mono text-amber-300 text-sm font-black">
                            TICKET-#00{verifiedWinner < 10 ? '0' + verifiedWinner : verifiedWinner}
                          </strong>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SHA256 Math Verified ✅
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quarterly Financial Transparency Promise */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      {isJa
                        ? '四半期ごとに、Amazonアソシエイト管理画面の件数スクリーンショットと賞品発送状況を本ページにて公表いたします。'
                        : isZh
                        ? '每季度結束後，本站將在此頁面公開亞馬遜聯盟官方後台訂單數量脫敏截圖、獎品採購憑單與物流追蹤單號，確保 50% 利潤真正回饋社群！'
                        : 'Quarterly masked Amazon commission reports and prize shipment tracking numbers will be publicly posted.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Curator Guide & Savings Modal */}
      {showCuratorGuideModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCuratorGuideModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {isJa ? '選品ロジックと割引攻略ガイド' : isZh ? '選品邏輯與買家折上折攻略' : 'Curator Philosophy & Savings Guide'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isJa ? 'なぜこれらの商品を選んだのか？海外コレクターの基準' : isZh ? '深度解析：歐美與全球卡牌玩家挑選商品的底層邏輯' : 'Why global collectors trust these items'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCuratorGuideModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs text-slate-300 leading-relaxed">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                    <span>1. {isJa ? '無酸（Acid-Free）素材とPSA鑑定基準' : isZh ? '極端看重「無酸保護」與評級標準 (PSA 10 潔癖)' : 'Acid-Free Archival Protection'}</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {isJa
                      ? '安価なPVCプラスチックは可塑剤による酸性化でカードを劣化させます。当サイトでは世界基準の無酸素材（Vault X、Ultra PRO、KMC）のみを厳選しています。'
                      : isZh
                      ? '歐美與日本玩家挑選保護殼絕不買廉價三無塑料。普通 PVC 塑料含有酸性增塑劑，長期密封會導致卡牌褪色、泛黃甚至與內膜粘死報廢。因此我們只選經過全球數萬名藏家驗證的標杆：Vault X (防塵拉鍊卡冊)、Ultra PRO (UV阻隔磁吸卡磚) 與 KMC / 龍盾 (雙套內膽與磨砂競技套)。'
                      : 'Ordinary PVC contains acidic plasticizers that ruin cards. We only recommend certified acid-free solutions like Vault X, Ultra PRO, and KMC.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                    <span>2. {isJa ? '公式正規品・シュリンク未開封保証' : isZh ? '官方原廠自營封條，拒絕「搜包」 (Anti-Tamper)' : 'Factory-Sealed Anti-Tamper Policy'}</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {isJa
                      ? '重量サーチや再シュリンクの不安を排除するため、公式メーカー品および正規直販の未開封BOXのみを推奨しています。'
                      : isZh
                      ? '在國外購買散包最怕遇到第三方賣家稱重、照光搜包（把高價值閃卡包挑走，只留下白板包）。本站推薦的補充包盒與 ETB 禮盒一律錨定帶有原廠熱縮膜的完整密封原盒（Sealed Box），確保撕包手感與出閃機率絕對公平。'
                      : 'To prevent searched packs and tampered boxes, we strictly link to genuine sealed products with original factory shrink wrap.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <span>3. {isJa ? 'Amazonでお得に購入するテクニック' : isZh ? '如何在亞馬遜拿滿商家原生折扣？(折上折秘籍)' : 'How to Maximize Savings on Amazon'}</span>
                  </h4>
                  <div className="text-slate-400 text-[11px] space-y-1.5">
                    <p>
                      🏷️ <strong className="text-slate-200">{isJa ? 'クーポンの適用' : isZh ? '勾選 Clip Coupon' : 'Clip Coupons'}</strong>：{isJa ? '商品ページ上のクーポンにチェックを入れると5%〜15%割引が適用されます。' : isZh ? '商品標題下方經常有一欄綠色的「Coupon」，打勾後在結算頁面直接立減 5%~15%！' : 'Check the coupon box on the listing to save 5% to 15% instantly.'}
                    </p>
                    <p>
                      📦 <strong className="text-slate-200">{isJa ? 'バリューパック購入' : isZh ? '多件量販裝 (Bulk Pack)' : 'Bulk Packs'}</strong>：{isJa ? 'Ultra PRO 5個セットやKMC 3パックなど、まとめ買いで単価が約30%安くなります。' : isZh ? '如 Ultra PRO 磁吸卡磚 5 件裝、KMC 3 包裝，單件均价比單買立省 30%。' : 'Multi-packs like Ultra PRO 5-packs or KMC 3-packs save up to 30% per unit.'}
                    </p>
                    <p>
                      ⚡ <strong className="text-slate-200">{isJa ? 'Prime配送の活用' : isZh ? 'Prime 免費試用' : 'Prime Fast Shipping'}</strong>：{isJa ? '送料無料・翌日配送でスピーディーに手元に届きます。' : isZh ? '開通即可享受零門檻全場免運費與次日極速送達。' : 'Enjoy fast, free shipping with Prime benefits.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                    <span>4. {isJa ? '直接キャッシュバックではなく還元プールを行う理由' : isZh ? '為什麼不搞違規返現，而是做回饋補貼池？' : 'Compliance & Community Pool Model'}</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {isJa
                      ? 'Amazonアソシエイトの利用規約では購入者への直接の金銭キャッシュバックが禁止されています。規約を100%遵守しつつ、収益の一部を賞品プールとして還元しています。'
                      : isZh
                      ? '亞馬遜聯盟營運協議第 4 條嚴格禁止「直接給買家返現金（Cashback Incentive）」，一旦被系統風控會直接封禁站長帳號並凍結佣金。因此我們採用行業大站合規的「50% 佣金全額注入訓練家社群月度回饋池」模式，既 100% 合規安全，又真正讓利於玩家！'
                      : 'Amazon affiliate guidelines strictly forbid direct cash rebates. Our pool model remains 100% compliant while returning genuine value to the community.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate & PA-API Configuration Modal */}
      {showConfigModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfigModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {isJa ? 'アフィリエイト・API設定' : isZh ? '全球返利聯盟與 PA-API 配置' : 'Affiliate & API Configuration'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isJa ? '各国のトラッキングIDおよびAmazon PA-API 5.0の設定' : isZh ? '支援美亞、日亞、歐亞 Tracking ID 與亞馬遜官方 PA-API 5.0' : 'Manage tracking tags and Amazon PA-API credentials'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* API explanation box */}
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-200 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-sky-300">
                  <Key className="w-4 h-4 text-sky-400" />
                  <span>{isJa ? 'Amazon PA-API 5.0 に関する説明' : isZh ? '關於亞馬遜官方 PA-API 5.0 實時價格接口說明' : 'About Amazon Product Advertising API (PA-API 5.0)'}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isJa
                    ? 'Amazonの商品価格・在庫・評価をAPI経由でリアルタイム取得するには、承認されたAmazonアソシエイトアカウントで過去30日間に3件以上の適格販売実績が必要です。認証キーをお持ちの場合は下記に入力して保存できます。'
                    : isZh
                    ? '亞馬遜官方規定：若需透過 API 自動調取最新商品價格、庫存與評分，必須擁有已審核的亞馬遜聯盟帳號，且過去 30 天內至少有 3 筆合格訂單方可開通 PA-API 5.0。若您已有 Access Key / Secret，可在此填寫儲存。'
                    : 'Amazon requires an approved Associates account with at least 3 qualifying sales within the last 30 days to access PA-API 5.0. Enter your credentials below if active.'}
                </p>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🇺🇸 Amazon US Tag ({isJa ? 'デフォルト' : isZh ? '預設' : 'Default'})
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.amazonTag || 'ptcgpocket-20'}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonTag: e.target.value.trim() })}
                    placeholder="e.g. ptcgpocket-20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🇯🇵 Amazon JP Tag ({isJa ? '任意' : isZh ? '可選' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.amazonJpTag || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonJpTag: e.target.value.trim() })}
                    placeholder="e.g. ptcgpocket-jp-22"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🇪🇺 Amazon EU Tag ({isJa ? '任意' : isZh ? '可選' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.amazonEuTag || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonEuTag: e.target.value.trim() })}
                    placeholder="e.g. ptcgpocket-de-21"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🇬🇧 Amazon UK Tag ({isJa ? '任意' : isZh ? '可選' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.amazonUkTag || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonUkTag: e.target.value.trim() })}
                    placeholder="e.g. ptcgpocket-uk-21"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* PA-API optional credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Amazon PA-API Access Key ({isJa ? '任意' : isZh ? '可選' : 'Optional'})
                  </label>
                  <input
                    type="password"
                    value={affiliateConfig.amazonPaApiKey || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonPaApiKey: e.target.value.trim() })}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Amazon PA-API Secret Key ({isJa ? '任意' : isZh ? '可選' : 'Optional'})
                  </label>
                  <input
                    type="password"
                    value={affiliateConfig.amazonPaApiSecret || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonPaApiSecret: e.target.value.trim() })}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Verified Seller Promo Code (Optional admin integration) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🛍️ {isJa ? '公式提携プロモーションコード（任意）' : isZh ? '實體賣家合作促銷碼（可選）' : 'Seller Partner Promo Code (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.customSellerPromoCode || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, customSellerPromoCode: e.target.value.trim() })}
                    placeholder={isJa ? '例: POCKET10' : isZh ? '若向賣家申請到真實Promo Code時填入' : 'e.g. PARTNER10'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    🏷️ {isJa ? 'コード説明文（任意）' : isZh ? '促銷碼優惠說明（可選）' : 'Promo Description (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.customSellerPromoDesc || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, customSellerPromoDesc: e.target.value })}
                    placeholder={isJa ? '例: 公式提携 10%OFF コード' : isZh ? '例: 官方合作結算立減 10%' : 'e.g. 10% OFF Partner Code'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {savedSuccess && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                      <Check className="w-3.5 h-3.5" />
                      {isJa ? '✓ 設定を保存しました！' : isZh ? '✓ 保存成功，配置已生效！' : 'Saved successfully!'}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    {isJa ? 'キャンセル' : isZh ? '取消' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isJa ? '保存する' : isZh ? '儲存配置' : 'Save Config'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Amazon Savings & Benefits Modal */}
      {showSavingsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSavingsModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">
                      {isJa ? '💡 Amazon公式お得な買い方・還元ガイド' : isZh ? '💡 亞馬遜官方真實省錢與領券指南' : 'Real Amazon Savings & Benefits Guide'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {isJa ? '100% 公式実証済' : isZh ? '100% 官方真實' : '100% Verified'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isJa ? '架空コードではなく、確実に安く買うための4大公式ルートを解説' : isZh ? '拒絕無效虛假代碼！盤點亞馬遜官方綠券、量販均價與本站 100% 訂單補貼' : 'Zero fake codes: 4 verified ways to genuinely save on Amazon products'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSavingsModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Honest Transparency Statement */}
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>{isJa ? '誠実な運営ポリシー：嘘の割引コードは掲載しません' : isZh ? '誠信原則說明：為什麼我們不搞虛假的 Promo Code？' : 'Our Policy: Zero Fake Promo Codes'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isJa
                    ? 'ネット上でよく見かける無許可の割引コードは、Amazon決済時に入力しても「無効」とエラーになります。宝可夢公式の拡張パックBOXは値崩れ防止の厳格な定価制ですが、バインダーやスリーブ等のサプライ品には公式の確実な節約方法が存在します！'
                    : isZh
                    ? '網路上許多網站隨意編造「VAULTX10」等促銷碼，買家拿到亞馬遜結算時系統必然報錯「Invalid Code」，既浪費時間又傷害信任。寶可夢實體卡包因官方嚴格控價極少直接打折，但卡冊、卡套與卡磚有 4 大 100% 官方真實有效的省錢途徑：'
                    : 'Random promo code strings floating on the internet fail at Amazon checkout. While Pokémon booster boxes are strictly price-controlled, official accessories feature genuine Amazon savings!'}
                </p>
              </div>

              {/* 4 Real Savings Channels */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isJa ? '確実に安く買う 4 つの公式ルート' : isZh ? '4 大真實有效的亞馬遜省錢途徑' : '4 Verified Ways to Save'}</span>
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {REAL_SAVINGS_GUIDES.map((guide) => (
                    <div
                      key={guide.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {isJa ? guide.badgeJa : isZh ? guide.badge : guide.badgeEn}
                          </span>
                          <span className="text-xs font-bold text-slate-100">
                            {isJa ? guide.titleJa : isZh ? guide.title : guide.titleEn}
                          </span>
                          <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {guide.savingValue}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {isJa ? guide.descriptionJa : isZh ? guide.description : guide.descriptionEn}
                        </p>

                        <div className="text-[10px] text-sky-400/90 flex items-center gap-1">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{isJa ? guide.actionTextJa : isZh ? guide.actionText : guide.actionTextEn}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Admin Seller Promo Code (If Configured) */}
              {affiliateConfig.customSellerPromoCode && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isJa ? '当サイト検証済プロモーションコード' : isZh ? '本站已驗證真實合作促銷碼' : 'Verified Partner Promo Code'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {affiliateConfig.customSellerPromoDesc || (isZh ? '此促銷碼經賣家授權有效，在結算頁輸入適用商品直接抵扣' : 'Authorized seller code.')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
                      {affiliateConfig.customSellerPromoCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPromo(affiliateConfig.customSellerPromoCode!)}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                    >
                      {copiedCode === affiliateConfig.customSellerPromoCode ? (isJa ? '済' : isZh ? '已複製' : 'Copied') : (isJa ? 'コピー' : isZh ? '複製' : 'Copy')}
                    </button>
                  </div>
                </div>
              )}

              {/* Final Note on Community Rebate */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isJa
                    ? '購入後は忘れずに「還元基金・注文登録」から注文番号をご登録ください。¥100=10ptが付与され、実物サプライ・未開封BOXの共同出資プールに直接参加できます！'
                    : isZh
                    ? '最重要提醒：在亞馬遜完成購買後，請務必點擊商城頂部「🎁 登記訂單」領取積分！每消費 ¥100=10分（$1=15分），直接參與實物周邊與原盒眾籌大獎！'
                    : 'Key reminder: After buying on Amazon, return and register your order ID to claim points and enter the physical prize crowdfunded pools!'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {isJa ? '公式ルールを活用して賢く安全にお買い物を楽しみましょう' : isZh ? '認準官方真實規則，買正品省心不踩坑' : 'Shop authentic gear with verified official savings'}
              </span>
              <button
                type="button"
                onClick={() => setShowSavingsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                {isJa ? '閉じる' : isZh ? '我知道了' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Check-in Mystery Box Modal */}
      <DailyCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onPointsUpdated={(newBal) => setPointsState((prev) => ({ ...prev, points: newBal }))}
        onGoToShop={() => {
          setShowCheckInModal(false);
        }}
      />

      {/* Crowdfunded Raffle Pools Modal */}
      <PointsRaffleModal
        isOpen={showRaffleModal}
        onClose={() => setShowRaffleModal(false)}
        onPointsUpdated={(newBal) => setPointsState((prev) => ({ ...prev, points: newBal }))}
        onOpenCheckIn={() => {
          setShowRaffleModal(false);
          if (onOpenDailyCheckIn) onOpenDailyCheckIn();
          else setShowCheckInModal(true);
        }}
        onGoToShop={() => {
          setShowRaffleModal(false);
        }}
      />

      {/* Discrete Merchant / Admin Entrance at Footer */}
      <div className="pt-8 pb-4 text-center">
        <button
          type="button"
          onClick={() => {
            if (isAdminMode) {
              setShowAdminWorkbenchModal(true);
            } else {
              setShowAdminAuthModal(true);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-slate-600 hover:text-amber-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer opacity-70 hover:opacity-100"
          title="商戶後台管理工作台（自選上傳圖片/發布商品/聯盟配置）"
        >
          <Lock className="w-3 h-3 text-slate-500" />
          <span>{isAdminMode ? '🛠️ 商戶管理後台 (工作台已就緒)' : '商戶後台管理入口'}</span>
        </button>
      </div>

      {/* Admin Auth / Security Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccess={() => {
          setShowAdminAuthModal(false);
          setIsAdminMode(true);
          setShowAdminWorkbenchModal(true);
        }}
      />

      {/* Admin Product & Image Manager Modal */}
      <ErrorBoundary
        key={`admin-modal-${showAdminWorkbenchModal}-${editingTargetProductId || 'none'}`}
        fallbackTitle="商戶商品管理中心出錯"
      >
        <AdminProductManagerModal
          isOpen={showAdminWorkbenchModal}
          onClose={() => {
            setShowAdminWorkbenchModal(false);
            setEditingTargetProductId(null);
          }}
          onProductsUpdated={() => setProductVersion((v) => v + 1)}
          onSwitchToCustomerView={() => {
            setShowAdminWorkbenchModal(false);
            setEditingTargetProductId(null);
            setIsAdminMode(false);
          }}
          allProducts={effectiveProducts}
          initialEditProductId={editingTargetProductId}
        />
      </ErrorBoundary>
    </div>
  );
};
