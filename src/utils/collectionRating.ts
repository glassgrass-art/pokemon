import { PokemonCard, UserCardStatus, Rarity, PackExpansion } from '../types';
import { CARDS_DATABASE, PACK_INFO } from '../data/cardsData';

// Priority order for displaying representative chase cards
export const RARITY_SHOWCASE_PRIORITY: Record<Rarity, number> = {
  CR: 10000,
  '3S': 9000,
  '2RS': 8000,
  '2S': 7000,
  '1RS': 6000,
  '1S': 5000,
  '4D': 4000,
  '3D': 300,
  '2D': 200,
  '1D': 100,
};

// Official In-Game Pack Point crafting costs in Pokémon TCG Pocket
export const OFFICIAL_PACK_POINTS: Record<Rarity, number> = {
  '1D': 35,
  '2D': 70,
  '3D': 150,
  '4D': 500,
  '1S': 400,
  '2S': 1250,
  '3S': 1500,
  '1RS': 400,
  '2RS': 1250,
  'CR': 2500,
};

export interface PackProgressSummary {
  packCode: PackExpansion;
  name: string;
  owned: number;
  total: number;
  percent: number;
}

export interface LuckRarityTier {
  id: string;
  tierRank: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';
  label: string;
  rarityBadge: string;
  rarities: Rarity[];
  officialDropRatePerPack: number; // e.g. 0.20% per pack
  officialDropRatePerCard: number; // e.g. 0.04% per card (5 cards/pack)
  luckWeightPerCard: number; // proportional to 1 / probability
  actualCopiesCount: number; // actual total copies user owns
  expectedCopiesCount: number; // theoretical expected copies based on packs opened
  luckContribution: number; // actualCopiesCount * luckWeightPerCard
}

export interface LuckMetric {
  score: number; // 0.0 ~ 100.0 score (50 = baseline average probability, 80+ = super lucky, 90+ = god-tier)
  ratio: number; // actualLuck / expectedLuck (1.0 = exactly matches official odds)
  tier: 'SSS' | 'SS' | 'S' | 'A' | 'B';
  title: string;
  color: string;
  textColor: string;
  bg: string;
  border: string;
  estimatedPacks: number;
  totalHighTierCopies: number;
  totalCardsCount: number;
  actualLuckPoints: number;
  expectedLuckPoints: number;
  tiers: LuckRarityTier[];
}

export interface CollectionRatingResult {
  collectorIndex: number; // 0.0 ~ 100.0
  tierKey: 'master' | 'elite' | 'veteran' | 'active' | 'apprentice' | 'novice';
  tierLabel: string;
  tierBadgeColor: string;
  tierDescription: string;
  completionPercent: number; // e.g. 74.5%
  totalUniqueOwned: number;
  totalCardsInDb: number;
  totalCardsCount: number; // includes duplicates
  totalPackPoints: number; // official in-game point equivalent
  rarityCounts: Record<Rarity, number>; // unique cards count by rarity
  totalRarityCounts: Record<Rarity, number>; // all copies owned count by rarity
  luckMetric: LuckMetric;
  packProgress: PackProgressSummary[];
  topCards: PokemonCard[];
}

export const TIER_LOCALIZATION: Record<
  string,
  Record<CollectionRatingResult['tierKey'], { label: string; desc: string }>
> = {
  en: {
    master: { label: 'Master Collector', desc: 'Outstanding completion across expansions with premier chase cards.' },
    elite: { label: 'Elite Collector', desc: 'Impressive collection progress and high-value secret rare cards.' },
    veteran: { label: 'Veteran Collector', desc: 'Solid collection depth with balanced deck-building staples.' },
    active: { label: 'Active Trainer', desc: 'Consistent progress with steady daily pack openings.' },
    apprentice: { label: 'Apprentice Trainer', desc: 'Growing collection foundation with early favorite cards.' },
    novice: { label: 'Novice Trainer', desc: 'Journey just beginning! Open free packs daily to expand.' },
  },
  'zh-Hant': {
    master: { label: '大師級收藏家', desc: '圖鑑深度極高，坐擁多張皇冠神卡與全圖鑑核心。' },
    elite: { label: '精英級收藏家', desc: '擁有極高的收集率與大量高稀有度特畫、沉浸卡。' },
    veteran: { label: '資深級收藏家', desc: '主力圖鑑全面，實戰核心與常用寶可夢一應俱全。' },
    active: { label: '活躍訓練家', desc: '圖鑑正在穩步突破，每日堅持開包積攢實力。' },
    apprentice: { label: '見習訓練家', desc: '起步階段收穫喜人，卡庫基礎正在快速成型。' },
    novice: { label: '初級訓練家', desc: '探險剛剛啟程，每日領取免費卡包加速成長！' },
  },
  ja: {
    master: { label: 'マスター コレクター', desc: '圧巻の収集率と至高のクラウン・イマーシブカードを所持。' },
    elite: { label: 'エリート コレクター', desc: '高い完成度と豊富な高レアリティカードを誇る熟練者。' },
    veteran: { label: 'ベテラン コレクター', desc: '主要カードが揃ったバランスの良い頼もしいコレクション。' },
    active: { label: 'アクティブ トレーナー', desc: '日々の開封で着実に図鑑を進める精力的なプレイヤー。' },
    apprentice: { label: '見習い トレーナー', desc: 'コレクションの基礎が順調に集まりつつある段階。' },
    novice: { label: 'ノービス トレーナー', desc: '冒険が始まったばかり！毎日無料パックを開けて強化しよう。' },
  },
  es: {
    master: { label: 'Coleccionista Maestro', desc: 'Completitud excepcional con cartas raras de la más alta gama.' },
    elite: { label: 'Coleccionista Élite', desc: 'Progreso impresionante con valiosas cartas secretas y de arte alternativo.' },
    veteran: { label: 'Coleccionista Veterano', desc: 'Colección sólida con cartas clave para combates y colección.' },
    active: { label: 'Entrenador Activo', desc: 'Progreso constante con aperturas diarias continuas.' },
    apprentice: { label: 'Aprendiz', desc: 'Buena base en crecimiento con favoritos iniciales.' },
    novice: { label: 'Novato', desc: '¡Tu viaje apenas comienza! Abre sobres diarios para expandirte.' },
  },
  fr: {
    master: { label: 'Collectionneur Maître', desc: 'Complétion exceptionnelle avec les cartes les plus rares du jeu.' },
    elite: { label: 'Collectionneur Élite', desc: 'Progression impressionnante et nombreuses cartes d’art alternatives.' },
    veteran: { label: 'Collectionneur Vétéran', desc: 'Excellente profondeur de collection avec les cartes clés de combat.' },
    active: { label: 'Dresseur Actif', desc: 'Progression régulière grâce aux ouvertures quotidiennes.' },
    apprentice: { label: 'Apprenti', desc: 'Une collection prometteuse qui s’agrandit chaque jour.' },
    novice: { label: 'Novice', desc: 'L’aventure ne fait que commencer ! Ouvrez vos boosters quotidiens.' },
  },
  de: {
    master: { label: 'Meister-Sammler', desc: 'Außergewöhnliche Vollständigkeit mit den seltensten Karten des Spiels.' },
    elite: { label: 'Elite-Sammler', desc: 'Beeindruckender Fortschritt mit wertvollen Secret Rares und Sonderkarten.' },
    veteran: { label: 'Veteran-Sammler', desc: 'Solide Sammlung mit wichtigen Karten für Decks und Sammlung.' },
    active: { label: 'Aktiver Trainer', desc: 'Stetiger Fortschritt durch tägliche Booster-Öffnungen.' },
    apprentice: { label: 'Lehrling', desc: 'Gute Basis im Aufbau mit ersten Lieblingskarten.' },
    novice: { label: 'Neuling', desc: 'Deine Reise beginnt gerade! Öffne tägliche Booster zum Ausbau.' },
  },
  it: {
    master: { label: 'Collezionista Maestro', desc: 'Completezza straordinaria con le carte più rare ed esclusive.' },
    elite: { label: 'Collezionista d’Élite', desc: 'Progresso eccezionale con rare segrete e carte speciali.' },
    veteran: { label: 'Collezionista Veterano', desc: 'Ottima profondità con carte essenziali da gioco e collezione.' },
    active: { label: 'Allenatore Attivo', desc: 'Progresso costante grazie alle bustine giornaliere.' },
    apprentice: { label: 'Apprendista', desc: 'Una buona base in crescita con le prime carte preferite.' },
    novice: { label: 'Novizio', desc: 'L’avventura è appena iniziata! Apri le bustine giornaliere.' },
  },
  pt: {
    master: { label: 'Colecionador Mestre', desc: 'Completude excepcional com as cartas mais raras do jogo.' },
    elite: { label: 'Colecionador Elite', desc: 'Progresso impressionante com cartas secretas e ilustrações raras.' },
    veteran: { label: 'Colecionador Veterano', desc: 'Excelente variedade com cartas essenciais para batalha e coleção.' },
    active: { label: 'Treinador Ativo', desc: 'Progresso consistente com aberturas diárias de pacotes.' },
    apprentice: { label: 'Aprendiz', desc: 'Boa base em crescimento com as primeiras cartas favoritas.' },
    novice: { label: 'Novato', desc: 'Sua jornada está apenas começando! Abra pacotes diários.' },
  },
  ko: {
    master: { label: '마스터 컬렉터', desc: '압도적인 도감 완성도와 최고 희귀도의 크라운 카드를 보유.' },
    elite: { label: '엘리트 컬렉터', desc: '높은 완성도와 다수의 스페셜 일러스트 레어(SAR) 보유.' },
    veteran: { label: '베테랑 컬렉터', desc: '실전 핵심과 주요 포켓몬이 두루 갖춰진 균형 잡힌 도감.' },
    active: { label: '액티브 트레이너', desc: '매일 팩을 개봉하며 꾸준히 성장하고 있는 트레이너.' },
    apprentice: { label: '견습 트레이너', desc: '기초 카드를 모으며 도감을 확장해 나가는 단계.' },
    novice: { label: '비기너 트레이너', desc: '이제 막 여정이 시작되었습니다! 매일 무료 팩을 개봉해 보세요.' },
  },
};

/**
 * Official Pokémon TCG Pocket Pull Rate Specifications (5 cards per booster pack)
 * Slot 4 and Slot 5 aggregated probabilities for high-tier card categories:
 * - Crown Rare (CR): 0.20% / pack (0.04% / card) => 1 in 2500 cards
 * - Immersive (3S): 1.11% / pack (0.222% / card) => 1 in 450 cards
 * - SAR / Special Art / Rainbow (2S + 2RS): 2.50% / pack (0.50% / card) => 1 in 200 cards
 * - Pokémon EX (4D): 8.33% / pack (1.666% / card) => 1 in 60 cards
 * - Art Rare AR (1S + 1RS): 12.86% / pack (2.572% / card) => 1 in 39 cards
 */
export const OFFICIAL_LUCK_TIERS_CONFIG: Array<{
  id: string;
  tierRank: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';
  labelKey: string;
  rarityBadge: string;
  rarities: Rarity[];
  officialDropRatePerPack: number;
  officialDropRatePerCard: number;
  luckWeightPerCard: number;
}> = [
  {
    id: 'cr',
    tierRank: 'T0',
    labelKey: 'crown',
    rarityBadge: '👑 皇冠 (CR)',
    rarities: ['CR'],
    officialDropRatePerPack: 0.20,
    officialDropRatePerCard: 0.0004,
    luckWeightPerCard: 2500,
  },
  {
    id: '3s',
    tierRank: 'T1',
    labelKey: 'immersive',
    rarityBadge: '⭐⭐⭐ 3黃星 · 沉浸卡',
    rarities: ['3S'],
    officialDropRatePerPack: 1.11,
    officialDropRatePerCard: 0.00222,
    luckWeightPerCard: 450,
  },
  {
    id: '2rs',
    tierRank: 'T2',
    labelKey: 'shinySar',
    rarityBadge: '🌈⭐⭐ 2彩星 · 閃色特畫',
    rarities: ['2RS'],
    officialDropRatePerPack: 0.50,
    officialDropRatePerCard: 0.0010,
    luckWeightPerCard: 350,
  },
  {
    id: '2s',
    tierRank: 'T3',
    labelKey: 'sar',
    rarityBadge: '⭐⭐ 2黃星 · 全圖特畫',
    rarities: ['2S'],
    officialDropRatePerPack: 2.00,
    officialDropRatePerCard: 0.0040,
    luckWeightPerCard: 180,
  },
  {
    id: '1rs',
    tierRank: 'T4',
    labelKey: 'shinyAr',
    rarityBadge: '🌈⭐ 1彩星 · 閃色實景',
    rarities: ['1RS'],
    officialDropRatePerPack: 2.50,
    officialDropRatePerCard: 0.0050,
    luckWeightPerCard: 100,
  },
  {
    id: '1s',
    tierRank: 'T5',
    labelKey: 'ar',
    rarityBadge: '⭐ 1黃星 · 實景特畫',
    rarities: ['1S'],
    officialDropRatePerPack: 10.36,
    officialDropRatePerCard: 0.02072,
    luckWeightPerCard: 35,
  },
  {
    id: '4d',
    tierRank: 'T6',
    labelKey: 'ex',
    rarityBadge: '◇◇◇◇ 4菱形 · 寶可夢 EX',
    rarities: ['4D'],
    officialDropRatePerPack: 8.33,
    officialDropRatePerCard: 0.01666,
    luckWeightPerCard: 60,
  },
];

/**
 * Calculate the collection rating and probability-grounded Luck Metric
 */
export function calculateCollectionRating(
  userCollection: Record<string, UserCardStatus>,
  lang = 'en'
): CollectionRatingResult {
  const totalCardsInDb = CARDS_DATABASE.length;
  let uniqueOwned = 0;
  let totalCardsCount = 0;
  let totalPackPoints = 0;

  // Unique count
  const rarityCounts: Record<Rarity, number> = {
    '1D': 0, '2D': 0, '3D': 0, '4D': 0,
    '1S': 0, '2S': 0, '3S': 0, '1RS': 0,
    '2RS': 0, 'CR': 0,
  };

  // Total copies count (including duplicates)
  const totalRarityCounts: Record<Rarity, number> = {
    '1D': 0, '2D': 0, '3D': 0, '4D': 0,
    '1S': 0, '2S': 0, '3S': 0, '1RS': 0,
    '2RS': 0, 'CR': 0,
  };

  const packStats: Record<string, { owned: number; total: number }> = {};
  const ownedCardsList: { card: PokemonCard; value: number }[] = [];

  CARDS_DATABASE.forEach((card) => {
    // Track pack totals
    if (!packStats[card.pack]) {
      packStats[card.pack] = { owned: 0, total: 0 };
    }
    packStats[card.pack].total++;

    const status = userCollection[card.id];
    if (status && status.count > 0) {
      uniqueOwned++;
      totalCardsCount += status.count;
      packStats[card.pack].owned++;
      rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
      totalRarityCounts[card.rarity] = (totalRarityCounts[card.rarity] || 0) + status.count;

      const singlePoint = OFFICIAL_PACK_POINTS[card.rarity] || 35;
      // Total points: first copy plus duplicate copies value
      totalPackPoints += singlePoint + (status.count - 1) * Math.round(singlePoint * 0.5);

      ownedCardsList.push({ card, value: singlePoint });
    }
  });

  // Calculate completion %
  const completionPercent = totalCardsInDb > 0 ? (uniqueOwned / totalCardsInDb) * 100 : 0;

  // Calculate balanced Collector Index (0 ~ 100)
  const completionScore = (completionPercent / 100) * 50;
  const rareWeight =
    rarityCounts['CR'] * 6 +
    rarityCounts['3S'] * 4 +
    (rarityCounts['2S'] + rarityCounts['2RS']) * 2 +
    (rarityCounts['1S'] + rarityCounts['1RS']) * 0.8 +
    rarityCounts['4D'] * 0.5;
  const rareScore = Math.min(35, rareWeight);

  let setsWithProgress = 0;
  const packKeys = Object.keys(packStats);
  packKeys.forEach((k) => {
    const s = packStats[k];
    if (s.total > 0 && s.owned / s.total >= 0.5) {
      setsWithProgress++;
    }
  });
  const breadthScore = packKeys.length > 0 ? (setsWithProgress / packKeys.length) * 15 : 0;

  const rawCollectorIndex = Math.min(100, completionScore + rareScore + breadthScore);
  const collectorIndex = Math.round(rawCollectorIndex * 10) / 10;

  // Determine Collector Tier
  let tierKey: CollectionRatingResult['tierKey'] = 'novice';
  let tierBadgeColor = 'from-slate-500 to-slate-600';

  if (collectorIndex >= 90.0) {
    tierKey = 'master';
    tierBadgeColor = 'from-amber-400 via-amber-500 to-yellow-600 text-slate-950 border-amber-400/60';
  } else if (collectorIndex >= 75.0) {
    tierKey = 'elite';
    tierBadgeColor = 'from-purple-500 to-indigo-600 text-white border-purple-400/60';
  } else if (collectorIndex >= 55.0) {
    tierKey = 'veteran';
    tierBadgeColor = 'from-sky-500 to-blue-600 text-white border-sky-400/60';
  } else if (collectorIndex >= 35.0) {
    tierKey = 'active';
    tierBadgeColor = 'from-emerald-500 to-teal-600 text-white border-emerald-400/60';
  } else if (collectorIndex >= 15.0) {
    tierKey = 'apprentice';
    tierBadgeColor = 'from-cyan-600 to-slate-700 text-white border-cyan-500/40';
  } else {
    tierKey = 'novice';
    tierBadgeColor = 'from-slate-600 to-slate-700 text-slate-200 border-slate-600';
  }

  const currentLoc = TIER_LOCALIZATION[lang] || TIER_LOCALIZATION['en'];
  const tierInfo = currentLoc[tierKey] || TIER_LOCALIZATION['en'][tierKey];

  // Top chase cards prioritizing the 7 high-tier rarities (CR > 3S > 2RS > 2S > 1RS > 1S > 4D)
  ownedCardsList.sort((a, b) => {
    const priorityA = RARITY_SHOWCASE_PRIORITY[a.card.rarity] || 0;
    const priorityB = RARITY_SHOWCASE_PRIORITY[b.card.rarity] || 0;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    return b.value - a.value;
  });
  const topCards = ownedCardsList.slice(0, 6).map((item) => item.card);

  // Pack progress list
  const packProgress: PackProgressSummary[] = Object.entries(packStats).map(([code, stat]) => {
    const packCode = code as PackExpansion;
    const name = PACK_INFO[packCode]?.nameEn || packCode;
    return {
      packCode,
      name,
      owned: stat.owned,
      total: stat.total,
      percent: stat.total > 0 ? Math.round((stat.owned / stat.total) * 100) : 0,
    };
  });

  // ==========================================
  // Probability-Grounded Luck Metric System
  // ==========================================
  const effectiveCardsCount = Math.max(1, totalCardsCount);
  const estimatedPacks = Math.max(1, Math.round(effectiveCardsCount / 5));

  let actualLuckPoints = 0;
  let expectedLuckPoints = 0;
  let totalHighTierCopies = 0;

  const luckTiers: LuckRarityTier[] = OFFICIAL_LUCK_TIERS_CONFIG.map((cfg) => {
    const actualCopiesCount = cfg.rarities.reduce(
      (sum, r) => sum + (totalRarityCounts[r] || 0),
      0
    );
    totalHighTierCopies += actualCopiesCount;

    // Expected copies based on official per-card probability
    const expectedCopiesCount = effectiveCardsCount * cfg.officialDropRatePerCard;
    const luckContribution = actualCopiesCount * cfg.luckWeightPerCard;
    const expectedTierPoints = expectedCopiesCount * cfg.luckWeightPerCard;

    actualLuckPoints += luckContribution;
    expectedLuckPoints += expectedTierPoints;

    return {
      id: cfg.id,
      tierRank: cfg.tierRank,
      label: cfg.labelKey,
      rarityBadge: cfg.rarityBadge,
      rarities: cfg.rarities,
      officialDropRatePerPack: cfg.officialDropRatePerPack,
      officialDropRatePerCard: cfg.officialDropRatePerCard,
      luckWeightPerCard: cfg.luckWeightPerCard,
      actualCopiesCount,
      expectedCopiesCount: Math.round(expectedCopiesCount * 100) / 100,
      luckContribution,
    };
  });

  // Minimum baseline stabilizer for fair representation on small collections
  const normalizedExpected = Math.max(10, expectedLuckPoints);
  const luckRatio = actualLuckPoints / normalizedExpected;

  /**
   * Score curve:
   * - Baseline (R = 1.0, exactly matches official probability): Score = 50.0 pts (期望值基准)
   * - Exceeding expectation (R > 1.0):
   *   Reaches 50+ to 79+ pts for above-average pulls,
   *   and breaks 80+ pts when exceeding probability by ~85%+ (R >= 1.85, 锦鲤欧皇)!
   *   Breaks 90+ pts for god-tier luck (R >= 3.5, 绝世欧皇)!
   * - Below expectation (R < 1.0): 15 ~ 49 pts (厚积薄发 / 蓄力中)
   */
  let luckScore = 50;
  if (luckRatio <= 1.0) {
    // 15 ~ 50 points
    luckScore = 15 + 35 * Math.pow(Math.max(0, luckRatio), 0.85);
  } else {
    // 50 ~ 99 points
    const delta = luckRatio - 1.0;
    const powerDelta = Math.pow(delta, 0.82);
    luckScore = 50 + 49 * (powerDelta / (0.55 + powerDelta));
  }
  luckScore = Math.min(99.9, Math.max(10, Math.round(luckScore * 10) / 10));

  // Determine Luck Rank & Title
  let luckTier: LuckMetric['tier'] = 'B';
  let luckTitle = '';
  let luckColor = '#94a3b8';
  let luckTextColor = 'text-slate-400';
  let luckBg = 'from-slate-700/20 to-slate-800/10';
  let luckBorder = 'border-slate-600/30';

  if (luckScore >= 90 || luckRatio >= 3.5) {
    luckTier = 'SSS';
    luckColor = '#fbbf24';
    luckTextColor = 'text-amber-400';
    luckBg = 'from-amber-500/25 via-yellow-500/15 to-slate-900';
    luckBorder = 'border-amber-400/50';
    luckTitle =
      lang === 'ja'
        ? '🌟 神引き・超絶豪運'
        : lang === 'en'
        ? '🌟 SSS · Divine RNG Deity'
        : '🌟 歐皇降世 · 絕世豪運';
  } else if (luckScore >= 80 || luckRatio >= 1.85) {
    luckTier = 'SS';
    luckColor = '#f59e0b';
    luckTextColor = 'text-amber-500';
    luckBg = 'from-amber-600/20 via-orange-500/15 to-slate-900';
    luckBorder = 'border-amber-500/40';
    luckTitle =
      lang === 'ja'
        ? '🔥 大当たり・錦鯉体質'
        : lang === 'en'
        ? '🔥 SS · Blessed Luck'
        : '🔥 歐氣爆棚 · 錦鯉體質';
  } else if (luckScore >= 65 || luckRatio >= 1.3) {
    luckTier = 'S';
    luckColor = '#c084fc';
    luckTextColor = 'text-purple-400';
    luckBg = 'from-purple-500/20 via-indigo-500/15 to-slate-900';
    luckBorder = 'border-purple-500/35';
    luckTitle =
      lang === 'ja'
        ? '✨ 強運・出金マスター'
        : lang === 'en'
        ? '✨ S · Super Lucky'
        : '✨ 歐氣滿滿 · 出金大師';
  } else if (luckScore >= 50 || luckRatio >= 1.0) {
    luckTier = 'A';
    luckColor = '#38bdf8';
    luckTextColor = 'text-sky-400';
    luckBg = 'from-sky-500/20 via-cyan-500/15 to-slate-900';
    luckBorder = 'border-sky-500/35';
    luckTitle =
      lang === 'ja'
        ? '🍀 好調・順調コレクション'
        : lang === 'en'
        ? '🍀 A · Solid Luck'
        : '🍀 超越期望 · 平穩小紅';
  } else {
    luckTier = 'B';
    luckColor = '#94a3b8';
    luckTextColor = 'text-slate-400';
    luckBg = 'from-slate-700/20 to-slate-900';
    luckBorder = 'border-slate-600/30';
    luckTitle =
      lang === 'ja'
        ? '🛡️ 蓄力中・神引き予感'
        : lang === 'en'
        ? '🛡️ B · Brewing Luck'
        : '🛡️ 厚積薄發 · 蓄力歐皇';
  }

  const luckMetric: LuckMetric = {
    score: luckScore,
    ratio: Math.round(luckRatio * 100) / 100,
    tier: luckTier,
    title: luckTitle,
    color: luckColor,
    textColor: luckTextColor,
    bg: luckBg,
    border: luckBorder,
    estimatedPacks,
    totalHighTierCopies,
    totalCardsCount,
    actualLuckPoints: Math.round(actualLuckPoints),
    expectedLuckPoints: Math.round(normalizedExpected),
    tiers: luckTiers,
  };

  return {
    collectorIndex,
    tierKey,
    tierLabel: tierInfo.label,
    tierBadgeColor,
    tierDescription: tierInfo.desc,
    completionPercent: Math.round(completionPercent * 10) / 10,
    totalUniqueOwned: uniqueOwned,
    totalCardsInDb,
    totalCardsCount,
    totalPackPoints,
    rarityCounts,
    totalRarityCounts,
    luckMetric,
    packProgress,
    topCards,
  };
}
