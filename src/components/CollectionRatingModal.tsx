import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { PokemonCard, UserCardStatus, TrainerProfile } from '../types';
import { calculateCollectionRating, CollectionRatingResult } from '../utils/collectionRating';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  Download,
  X,
  ExternalLink,
  MessageSquare,
  Award,
  Coffee,
  Check,
  Flame,
  Copy,
  Eye,
  Trophy,
  Star,
  ChevronDown,
  ChevronUp,
  Palette,
  TrendingUp,
} from 'lucide-react';

interface CollectionRatingModalProps {
  userCollection: Record<string, UserCardStatus>;
  trainerProfile: TrainerProfile;
  onClose: () => void;
  onInspectCard?: (card: PokemonCard) => void;
  zIndex?: number;
}

export type PosterTheme = 'gold' | 'cyber' | 'aurora';

// Safe canvas roundRect helper with quadraticCurve fallback
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// 4-point Diamond Sparkle helper
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.fill();

  // Center bright core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const CollectionRatingModal: React.FC<CollectionRatingModalProps> = ({
  userCollection,
  trainerProfile,
  onClose,
  onInspectCard,
  zIndex,
}) => {
  const { currentLanguage, getCardName, getCardImageUrl } = useLanguage();
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [copiedFriendCode, setCopiedFriendCode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [showLuckDetails, setShowLuckDetails] = useState(false);
  const [posterTheme, setPosterTheme] = useState<PosterTheme>('gold');

  // Calculate rating based on selected language and probability-grounded Luck metric
  const rating: CollectionRatingResult = useMemo(
    () => calculateCollectionRating(userCollection, currentLanguage),
    [userCollection, currentLanguage]
  );

  const { luckMetric } = rating;

  // Calculate beat percentile mathematically from Luck score
  const beatPercentile = useMemo(() => {
    const s = luckMetric.score;
    if (s >= 95) return 99.5;
    if (s >= 90) return Math.min(99.2, 95 + (s - 90) * 0.8);
    if (s >= 80) return Math.min(94.9, 85 + (s - 80) * 1.0);
    if (s >= 65) return Math.min(84.9, 68 + (s - 65) * 1.13);
    if (s >= 50) return Math.min(67.9, 50 + (s - 50) * 1.2);
    return Math.max(5, Math.round((s / 50) * 49 * 10) / 10);
  }, [luckMetric.score]);

  // Internationalized labels
  // Internationalized labels
  const i18n = {
    'zh-Hant': {
      modalTitle: '訓練家收藏護照',
      modalSubtitle: '總體圖鑑進度、官方概率歐氣評分與專屬宣傳海報',
      platformName: 'PTCG Pocket 卡牌交換與圖鑑神器',
      viralInviteTitle: '🔥 快去測測你的歐氣值吧！',
      viralInviteSub: '官方概率深度測算 · 免費同階卡牌撮合',
      viralInvite: '🔥 快去測測你的歐氣值吧！免費撮合同階卡牌交換',
      qrScanTip: '📱 掃碼即刻測歐氣',
      featureTag1: '1:1 同階等價交換',
      featureTag2: '全圖鑑實時追蹤',
      featureTag3: '官方概率深度測算',
      featureTag4: '雙向智能撮合',
      beatTrainers: (pct: number) => `👑 擊敗了全網 ${pct.toFixed(1)}% 的訓練家`,
      completion: '總體圖鑑進度',
      collectorIndex: '卡牌總價值評分',
      packPoints: '開包點數等值',
      luckIndex: '歐氣指數 (官方概率加權)',
      uniqueCards: '收錄種類',
      totalCopies: '卡牌總量',
      friendCode: '好友代碼',
      chaseCards: '代表神卡展覽',
      rareSectionTitle: '✨ 高階稀有度出卡統計 · HIGH RARITY STATS',
      rareBreakdown: '高稀有度卡牌統計：',
      shareChallenge: '⚡ 分享給好友，一起比拼誰才是真正的歐皇！',
      downloadPoster: '下載超清海報 (1080P PNG)',
      shareX: '分享至 X (Twitter)',
      copyDiscord: '複製 Discord 格式',
      copied: '已複製！',
      copyFC: '複製代碼',
      copiedFC: '已複製代碼！',
      date: '產生日期',
      craftingPointsSub: '遊戲內開包點數等值',
      generatingPoster: '正在繪製高清海報...',
      collecting: '暫無神卡，快去開包！',
      crown: '👑 皇冠',
      star3: '⭐⭐⭐ 3黃星',
      rainbowStar2: '🌈⭐⭐ 2彩星',
      star2: '⭐⭐ 2黃星',
      rainbowStar1: '🌈⭐ 1彩星',
      star1: '⭐ 1黃星',
      diamond4: '◇◇◇◇ 4菱形',
      supporterBadge: '☕ 贊助者榮譽',
      clickToInspect: '點擊查看卡牌詳情',
      noGodCardsYet: '圖鑑中暫未收錄高稀有度神卡，快去開包或發起交換吧！',
      luckDetailsTitle: '官方卡包出卡概率與各階歐氣明細',
      luckDetailsDesc:
        '基準 50 分為符合官方抽卡期望值；當抽中極低概率皇冠、沉浸或高階卡密集出貨時，評分迅速突破 50 分並達 80 分以上（80+ 分代表超越官方期望約 85%~100% 以上，為錦鯉歐皇級別）。',
      themeGold: '✨ 典藏黑金',
      themeCyber: '⚡ 賽博霓虹',
      themeAurora: '🌌 夢幻極光',
      themeSelector: '海報視覺風格：',
      posterCardHeading: '專屬收藏護照海報',
      posterCardDescription: '自選主題風格，一鍵保存專屬高清海報，隨時與好友分享比拼歐氣與神卡收藏！',
      luckModelBadge: '官方概率模型',
      viewLuckDetails: '概率明細',
      hideLuckDetails: '收起明細',
      luckPacksSummary: (packs: number, copies: number) => `約 ${packs} 包 · 抽出 ${copies} 張高階卡`,
    },
    en: {
      modalTitle: 'Trainer Collection Passport',
      modalSubtitle: 'Overall Dex Completion, Probability-Grounded Luck Rating & HD Poster',
      platformName: 'PTCG Pocket Trader & Dex',
      viralInviteTitle: '🔥 Test your RNG Luck Rating now!',
      viralInviteSub: 'Official RNG Modeling & 1:1 Fair Trade Matching',
      viralInvite: '🔥 Test your RNG Luck Rating now & match free trades!',
      qrScanTip: '📱 Scan to test RNG Luck',
      featureTag1: '1:1 Fair Trades',
      featureTag2: 'Real-Time Dex Tracker',
      featureTag3: 'Official RNG Modeling',
      featureTag4: 'Smart Matching',
      beatTrainers: (pct: number) => `👑 Outlucked ${pct.toFixed(1)}% of Trainers globally`,
      completion: 'Overall Completion',
      collectorIndex: 'Total Dex Power (Value)',
      packPoints: 'Pack Points Value',
      luckIndex: 'Luck Rating (Official RNG Model)',
      uniqueCards: 'Unique Cards',
      totalCopies: 'Total Cards',
      friendCode: 'Friend Code',
      chaseCards: 'Chase Cards Showcase',
      rareSectionTitle: '✨ HIGH RARITY CARD STATS',
      rareBreakdown: 'High-Rarity Cards Breakdown:',
      shareChallenge: '⚡ Share with friends to see who reigns as the true RNG Deity!',
      downloadPoster: 'Download HD Poster (1080P PNG)',
      shareX: 'Share on X (Twitter)',
      copyDiscord: 'Copy for Discord',
      copied: 'Copied!',
      copyFC: 'Copy Code',
      copiedFC: 'Copied Code!',
      date: 'Generated',
      craftingPointsSub: 'In-game crafting points',
      generatingPoster: 'Rendering HD poster...',
      collecting: 'No chase cards yet!',
      crown: '👑 Crown',
      star3: '⭐⭐⭐ 3-Star',
      rainbowStar2: '🌈⭐⭐ 2-Rainbow',
      star2: '⭐⭐ 2-Star',
      rainbowStar1: '🌈⭐ 1-Rainbow',
      star1: '⭐ 1-Star',
      diamond4: '◇◇◇◇ 4-Diamond',
      supporterBadge: '☕ Supporter Honor',
      clickToInspect: 'Click to inspect card',
      noGodCardsYet: 'No high-rarity cards found yet. Open packs or propose trades to fill your dex!',
      luckDetailsTitle: 'Official Drop Probabilities & Luck Breakdown',
      luckDetailsDesc:
        'The 50-pt baseline represents exact theoretical pull expectation. Pulling rare Crowns, Immersives or dense high-tier cards pushes scores past 50 and into the 80+ tier (80+ represents beating official odds by ~85%-100%+).',
      themeGold: '✨ Obsidian Gold',
      themeCyber: '⚡ Cyber Neon',
      themeAurora: '🌌 Celestial Aurora',
      themeSelector: 'Poster Style:',
      posterCardHeading: 'Trainer Collection Passport',
      posterCardDescription: 'Choose your theme, save an HD showcase poster, and share your luck rating with friends!',
      luckModelBadge: 'Official RNG Model',
      viewLuckDetails: 'RNG Details',
      hideLuckDetails: 'Hide Details',
      luckPacksSummary: (packs: number, copies: number) => `~${packs} Packs Opened · ${copies} High-Tier Pulls`,
    },
    ja: {
      modalTitle: 'トレーナー パスポート',
      modalSubtitle: '図鑑総合収集率・公式確率準拠の豪運指数・公式級シェアポスター',
      platformName: 'ポケポケ トレード＆図鑑ナビ',
      viralInviteTitle: '🔥 あなたの豪運指数も今すぐ測定！',
      viralInviteSub: '公式排出確率準拠・同階トレード無料マッチング',
      viralInvite: '🔥 あなたの豪運指数も今すぐ測定！同階トレード無料マッチング',
      qrScanTip: '📱 QRで豪運測定',
      featureTag1: '1:1 同階等価トレード',
      featureTag2: 'リアルタイム図鑑管理',
      featureTag3: '公式排出率精密判定',
      featureTag4: '双方向マッチング',
      beatTrainers: (pct: number) => `👑 全トレーナーの ${pct.toFixed(1)}% を上回る豪運`,
      completion: '図鑑総合収集率',
      collectorIndex: 'コレクション総価値評価',
      packPoints: 'パックポイント換算',
      luckIndex: '豪運指数 (公式確率準拠)',
      uniqueCards: '所持種類数',
      totalCopies: '総所持枚数',
      friendCode: 'フレンドコード',
      chaseCards: '代表看板カード',
      rareSectionTitle: '✨ ハイレアリティ獲得統計 · HIGH RARITY STATS',
      rareBreakdown: '高レアリティ所持数：',
      shareChallenge: '⚡ 友達にシェアして真の豪運チャンピオンを競おう！',
      downloadPoster: '超高画質ポスター保存 (1080P PNG)',
      shareX: 'Xでシェア',
      copyDiscord: 'Discord形式をコピー',
      copied: 'コピー完了！',
      copyFC: 'コードをコピー',
      copiedFC: 'コピー完了！',
      date: '発行日',
      craftingPointsSub: 'ゲーム内パックポイント換算',
      generatingPoster: '高画質ポスター生成中...',
      collecting: '看板カードを集めよう！',
      crown: '👑 クラウン',
      star3: '⭐⭐⭐ 3黄星',
      rainbowStar2: '🌈⭐⭐ 2色星',
      star2: '⭐⭐ 2黄星',
      rainbowStar1: '🌈⭐ 1色星',
      star1: '⭐ 1黄星',
      diamond4: '◇◇◇◇ 4ダイヤ',
      supporterBadge: '☕ スポンサー栄誉',
      clickToInspect: 'クリックでカード詳細を表示',
      noGodCardsYet: '高レア看板カードが未所持です。パックを開封して図鑑を充実させましょう！',
      luckDetailsTitle: '公式排出確率・各レアリティ豪運内訳',
      luckDetailsDesc:
        '基準50点は公式確率期待値通りを示します。極低確率のクラウンやイマーシブ、SARの引当で50点を突破し、期待値を85%〜100%超えると80点以上の豪運・錦鯉クラスに突入します。',
      themeGold: '✨ 典蔵ブラックゴールド',
      themeCyber: '⚡ サイバーネオン',
      themeAurora: '🌌 幻想オーロラ',
      themeSelector: 'ポスタースタイル：',
      posterCardHeading: 'トレーナー パスポート ポスター',
      posterCardDescription: 'スタイルを選んで高画質ポスターを保存し、友達と豪運指数をシェアして競おう！',
      luckModelBadge: '公式確率モデル',
      viewLuckDetails: '確率詳細',
      hideLuckDetails: '閉じる',
      luckPacksSummary: (packs: number, copies: number) => `約 ${packs} パック開封 · 高レア ${copies} 枚獲得`,
    },
    ko: {
      modalTitle: '트레이너 컬렉션 패스포트',
      modalSubtitle: '도감 완성도 · 공식 확률 기반 행운 지수 · 공식급 공유 포스터',
      platformName: '포켓포켓 교환 & 도감 트래커',
      viralInviteTitle: '🔥 지금 바로 당신의 행운 지수를 측정해 보세요!',
      viralInviteSub: '공식 확률 기반 정밀 산출 · 동급 카드 1:1 무료 매칭',
      viralInvite: '🔥 지금 바로 행운 지수를 측정하고 무료 트레이드를 시작하세요!',
      qrScanTip: '📱 QR로 행운 지수 측정',
      featureTag1: '1:1 동급 등가 교환',
      featureTag2: '실시간 도감 추적',
      featureTag3: '공식 확률 정밀 판정',
      featureTag4: '양방향 스마트 매칭',
      beatTrainers: (pct: number) => `👑 전 세계 트레이너의 ${pct.toFixed(1)}% 를 능가하는 행운`,
      completion: '도감 완성도',
      collectorIndex: '카드 총 가치 평가',
      packPoints: '팩 포인트 환산',
      luckIndex: '행운 지수 (공식 확률 가중치)',
      uniqueCards: '수집 종류수',
      totalCopies: '총 카드 수',
      friendCode: '친구 코드',
      chaseCards: '대표 간판 카드',
      rareSectionTitle: '✨ 하이 레어도 획득 통계 · HIGH RARITY STATS',
      rareBreakdown: '하이 레어도 카드 통계:',
      shareChallenge: '⚡ 친구들과 공유하고 진짜 행운의 주인공을 가려보세요!',
      downloadPoster: '초고화질 포스터 저장 (1080P PNG)',
      shareX: 'X(Twitter)에 공유',
      copyDiscord: 'Discord 형식 복사',
      copied: '복사 완료!',
      copyFC: '코드 복사',
      copiedFC: '코드 복사 완료!',
      date: '발행일',
      craftingPointsSub: '게임 내 팩 포인트 환산',
      generatingPoster: '고화질 포스터 생성 중...',
      collecting: '간판 카드를 획득해 보세요!',
      crown: '👑 크라운',
      star3: '⭐⭐⭐ 3성',
      rainbowStar2: '🌈⭐⭐ 2무지개성',
      star2: '⭐⭐ 2성',
      rainbowStar1: '🌈⭐ 1무지개성',
      star1: '⭐ 1성',
      diamond4: '◇◇◇◇ 4다이아',
      supporterBadge: '☕ 서포터 명예',
      clickToInspect: '클릭하여 카드 상세 정보 보기',
      noGodCardsYet: '아직 하이 레어도 카드가 없습니다. 팩을 개봉하여 도감을 채워보세요!',
      luckDetailsTitle: '공식 팩 확률 및 레어도별 상세 통계',
      luckDetailsDesc: '기준 50점은 공식 확률 기대치를 나타내며, 고난도 카드를 획득할수록 80점 이상의 행운왕 등급에 도달합니다.',
      themeGold: '✨ 클래식 골드',
      themeCyber: '⚡ 사이버 네온',
      themeAurora: '🌌 환상 오로라',
      themeSelector: '포스터 스타일:',
      posterCardHeading: '트레이너 컬렉션 패스포트 포스터',
      posterCardDescription: '원하는 스타일을 선택하고 고화질 포스터를 저장하여 친구들과 행운 지수를 비교해 보세요!',
      luckModelBadge: '공식 확률 모델',
      viewLuckDetails: '확률 상세',
      hideLuckDetails: '접기',
      luckPacksSummary: (packs: number, copies: number) => `약 ${packs}팩 개봉 · 하이 레어도 ${copies}장 획득`,
    },
    fr: {
      modalTitle: 'Passeport Collection Dresseur',
      modalSubtitle: 'Complétion du Pokédex, Indice de Chance RNG & Poster HD',
      platformName: 'PTCG Pocket Échange & Pokédex',
      viralInviteTitle: '🔥 Testez votre chance RNG dès maintenant !',
      viralInviteSub: 'Modélisation officielle des tirages & Échanges 1:1 équitables',
      viralInvite: '🔥 Testez votre chance RNG et échangez vos cartes gratuitement !',
      qrScanTip: '📱 Scannez pour tester votre chance',
      featureTag1: 'Échange 1:1 Équitable',
      featureTag2: 'Pokédex Temps Réel',
      featureTag3: 'Modélisation RNG Officielle',
      featureTag4: 'Matching Intelligent',
      beatTrainers: (pct: number) => `👑 Plus chanceux que ${pct.toFixed(1)}% des dresseurs`,
      completion: 'Complétion Globale',
      collectorIndex: 'Valeur de Collection',
      packPoints: 'Points de Booster',
      luckIndex: 'Indice de Chance (RNG Officiel)',
      uniqueCards: 'Cartes Uniques',
      totalCopies: 'Total Cartes',
      friendCode: 'Code Ami',
      chaseCards: 'Cartes Phares',
      rareSectionTitle: '✨ STATISTIQUES DE HAUTE RARETÉ',
      rareBreakdown: 'Cartes de Haute Rareté :',
      shareChallenge: '⚡ Partagez avec vos amis pour voir qui est le vrai maître de la chance !',
      downloadPoster: 'Télécharger le Poster HD (1080P PNG)',
      shareX: 'Partager sur X',
      copyDiscord: 'Copier pour Discord',
      copied: 'Copié !',
      copyFC: 'Copier le Code',
      copiedFC: 'Code Copié !',
      date: 'Date',
      craftingPointsSub: 'Équivalent points de craft',
      generatingPoster: 'Génération du poster HD...',
      collecting: 'Aucune carte phare pour le moment !',
      crown: '👑 Couronne',
      star3: '⭐⭐⭐ 3-Étoiles',
      rainbowStar2: '🌈⭐⭐ 2-Arc-en-ciel',
      star2: '⭐⭐ 2-Étoiles',
      rainbowStar1: '🌈⭐ 1-Arc-en-ciel',
      star1: '⭐ 1-Étoile',
      diamond4: '◇◇◇◇ 4-Diamants',
      supporterBadge: '☕ Honneur Donateur',
      clickToInspect: 'Cliquer pour inspecter la carte',
      noGodCardsYet: 'Aucune carte ultra rare trouvée. Ouvrez des boosters pour remplir votre collection !',
      luckDetailsTitle: 'Probabilités Officielles & Détail de Chance',
      luckDetailsDesc: 'Le score de base 50 correspond aux probabilités officielles. Dépasser les attentes propulse votre score au-delà de 80 points.',
      themeGold: '✨ Or Obsidienne',
      themeCyber: '⚡ Cyber Néon',
      themeAurora: '🌌 Aurore Céleste',
      themeSelector: 'Style du Poster :',
      posterCardHeading: 'Passeport Collection Dresseur',
      posterCardDescription: 'Choisissez votre style, enregistrez votre poster HD et partagez votre chance avec vos amis !',
      luckModelBadge: 'Modèle RNG Officiel',
      viewLuckDetails: 'Détails RNG',
      hideLuckDetails: 'Fermer',
      luckPacksSummary: (packs: number, copies: number) => `Env. ${packs} boosters · ${copies} cartes rares tirées`,
    },
    de: {
      modalTitle: 'Trainer-Sammelpass',
      modalSubtitle: 'Dex-Fortschritt, Offizielle RNG-Glücksquote & HD-Poster',
      platformName: 'PTCG Pocket Tausch & Dex',
      viralInviteTitle: '🔥 Teste jetzt deine RNG-Glücksquote!',
      viralInviteSub: 'Offizielle Wahrscheinlichkeitsmodelle & 1:1 Fairer Tausch',
      viralInvite: '🔥 Teste deine Glücksquote und tausche Karten kostenlos!',
      qrScanTip: '📱 Scannen für Glückstest',
      featureTag1: '1:1 Fairer Tausch',
      featureTag2: 'Echtzeit-Dex',
      featureTag3: 'Offizielles RNG-Modell',
      featureTag4: 'Smart-Matching',
      beatTrainers: (pct: number) => `👑 Mehr Glück als ${pct.toFixed(1)}% der Trainer weltweit`,
      completion: 'Gesamtfortschritt',
      collectorIndex: 'Sammlungswert',
      packPoints: 'Pack-Punkte',
      luckIndex: 'Glücksindex (RNG-Modell)',
      uniqueCards: 'Einzigartige Karten',
      totalCopies: 'Gesamtkarten',
      friendCode: 'Freundescode',
      chaseCards: 'Prunkstücke',
      rareSectionTitle: '✨ HOHE SELTENHEIT STATISTIKEN',
      rareBreakdown: 'Seltene Karten Aufschlüsselung:',
      shareChallenge: '⚡ Teile mit Freunden und finde heraus, wer das meiste Glück hat!',
      downloadPoster: 'HD-Poster herunterladen (1080P PNG)',
      shareX: 'Auf X teilen',
      copyDiscord: 'Für Discord kopieren',
      copied: 'Kopiert!',
      copyFC: 'Code kopieren',
      copiedFC: 'Code kopiert!',
      date: 'Datum',
      craftingPointsSub: 'In-Game Pack-Punkte',
      generatingPoster: 'HD-Poster wird gerendert...',
      collecting: 'Noch keine Prunkstücke!',
      crown: '👑 Krone',
      star3: '⭐⭐⭐ 3-Sterne',
      rainbowStar2: '🌈⭐⭐ 2-Regenbogen',
      star2: '⭐⭐ 2-Sterne',
      rainbowStar1: '🌈⭐ 1-Regenbogen',
      star1: '⭐ 1-Stern',
      diamond4: '◇◇◇◇ 4-Diamanten',
      supporterBadge: '☕ Förderer-Ehre',
      clickToInspect: 'Klicken zum Inspizieren',
      noGodCardsYet: 'Noch keine seltenen Karten gefunden. Öffne Booster, um dein Dex zu füllen!',
      luckDetailsTitle: 'Offizielle Wahrscheinlichkeiten & Glücksdetails',
      luckDetailsDesc: 'Die 50-Punkte-Basislinie entspricht der offiziellen Erwartung. Hohe Ziehungen bringen dich über 80 Punkte.',
      themeGold: '✨ Obsidian-Gold',
      themeCyber: '⚡ Cyber-Neon',
      themeAurora: '🌌 Himmels-Aurora',
      themeSelector: 'Poster-Stil:',
      posterCardHeading: 'Trainer-Sammelpass Poster',
      posterCardDescription: 'Wähle deinen Stil, speichere das HD-Poster und teile deine Glücksquote mit Freunden!',
      luckModelBadge: 'Offizielles RNG-Modell',
      viewLuckDetails: 'RNG-Details',
      hideLuckDetails: 'Ausblenden',
      luckPacksSummary: (packs: number, copies: number) => `Ca. ${packs} Booster · ${copies} seltene Ziehungen`,
    },
    es: {
      modalTitle: 'Pasaporte de Colección del Entrenador',
      modalSubtitle: 'Progreso del Dex, Índice de Suerte RNG Oficial y Póster HD',
      platformName: 'PTCG Pocket Intercambio y Dex',
      viralInviteTitle: '🔥 ¡Prueba tu índice de suerte RNG ahora mismo!',
      viralInviteSub: 'Modelo de probabilidades oficial y emparejamiento 1:1 justo',
      viralInvite: '🔥 ¡Prueba tu índice de suerte y empareja intercambios gratis!',
      qrScanTip: '📱 Escanea para medir tu suerte',
      featureTag1: 'Intercambio 1:1 Justo',
      featureTag2: 'Dex en Tiempo Real',
      featureTag3: 'Modelo RNG Oficial',
      featureTag4: 'Emparejamiento Inteligente',
      beatTrainers: (pct: number) => `👑 Más afortunado que el ${pct.toFixed(1)}% de entrenadores`,
      completion: 'Progreso Total',
      collectorIndex: 'Valor de Colección',
      packPoints: 'Puntos de Sobre',
      luckIndex: 'Índice de Suerte (Modelo RNG)',
      uniqueCards: 'Cartas Únicas',
      totalCopies: 'Total de Cartas',
      friendCode: 'Código de Amigo',
      chaseCards: 'Cartas Destacadas',
      rareSectionTitle: '✨ ESTADÍSTICAS DE ALTA RAREZA',
      rareBreakdown: 'Desglose de Rareza Alta:',
      shareChallenge: '⚡ ¡Comparte con amigos y descubre quién es el verdadero rey de la suerte!',
      downloadPoster: 'Descargar Póster HD (1080P PNG)',
      shareX: 'Compartir en X',
      copyDiscord: 'Copiar para Discord',
      copied: '¡Copiado!',
      copyFC: 'Copiar Código',
      copiedFC: '¡Código Copiado!',
      date: 'Fecha',
      craftingPointsSub: 'Puntos de sobre del juego',
      generatingPoster: 'Renderizando póster HD...',
      collecting: '¡Aún no hay cartas destacadas!',
      crown: '👑 Corona',
      star3: '⭐⭐⭐ 3-Estrellas',
      rainbowStar2: '🌈⭐⭐ 2-Arcoíris',
      star2: '⭐⭐ 2-Estrellas',
      rainbowStar1: '🌈⭐ 1-Arcoíris',
      star1: '⭐ 1-Estrella',
      diamond4: '◇◇◇◇ 4-Diamantes',
      supporterBadge: '☕ Honor de Colaborador',
      clickToInspect: 'Haz clic para inspeccionar',
      noGodCardsYet: 'Aún no tienes cartas de alta rareza. ¡Abre sobres para completar tu Pokédex!',
      luckDetailsTitle: 'Probabilidades Oficiales y Desglose de Suerte',
      luckDetailsDesc: 'La línea base de 50 pts representa la expectativa oficial. Superarla te sitúa por encima de 80 pts.',
      themeGold: '✨ Oro Obsidiana',
      themeCyber: '⚡ Ciberneón',
      themeAurora: '🌌 Aurora Celestial',
      themeSelector: 'Estilo del Póster:',
      posterCardHeading: 'Póster del Pasaporte del Entrenador',
      posterCardDescription: '¡Elige tu estilo, guarda tu póster en alta definición y comparte tu suerte con tus amigos!',
      luckModelBadge: 'Modelo RNG Oficial',
      viewLuckDetails: 'Detalles RNG',
      hideLuckDetails: 'Ocultar',
      luckPacksSummary: (packs: number, copies: number) => `Aprox. ${packs} sobres · ${copies} cartas de alta rareza`,
    },
    it: {
      modalTitle: 'Passaporto Collezione Allenatore',
      modalSubtitle: 'Completamento Pokédex, Indice di Fortuna RNG & Poster HD',
      platformName: 'PTCG Pocket Scambi & Pokédex',
      viralInviteTitle: '🔥 Metti alla prova la tua fortuna RNG adesso!',
      viralInviteSub: 'Modello di probabilità ufficiale e scambi 1:1 equi',
      viralInvite: '🔥 Metti alla prova la tua fortuna e scambia carte gratis!',
      qrScanTip: '📱 Scansiona per misurare la fortuna',
      featureTag1: 'Scambio 1:1 Equo',
      featureTag2: 'Dex in Tempo Reale',
      featureTag3: 'Modello RNG Ufficiale',
      featureTag4: 'Matching Intelligente',
      beatTrainers: (pct: number) => `👑 Più fortunato del ${pct.toFixed(1)}% degli allenatori`,
      completion: 'Completamento Totale',
      collectorIndex: 'Valore della Collezione',
      packPoints: 'Punti Bustina',
      luckIndex: 'Indice di Fortuna (Modello RNG)',
      uniqueCards: 'Carte Uniche',
      totalCopies: 'Totale Carte',
      friendCode: 'Codice Amico',
      chaseCards: 'Carte di Punta',
      rareSectionTitle: '✨ STATISTICHE CARTE RARE',
      rareBreakdown: 'Dettaglio Alta Rarità:',
      shareChallenge: '⚡ Condividi con gli amici e scopri chi ha davvero più fortuna!',
      downloadPoster: 'Scarica Poster HD (1080P PNG)',
      shareX: 'Condividi su X',
      copyDiscord: 'Copia per Discord',
      copied: 'Copiato!',
      copyFC: 'Copia Codice',
      copiedFC: 'Codice Copiato!',
      date: 'Data',
      craftingPointsSub: 'Punti bustina equivalenti',
      generatingPoster: 'Rendering del poster HD...',
      collecting: 'Nessuna carta rara ancora!',
      crown: '👑 Corona',
      star3: '⭐⭐⭐ 3-Stelle',
      rainbowStar2: '🌈⭐⭐ 2-Arcobaleno',
      star2: '⭐⭐ 2-Stelle',
      rainbowStar1: '🌈⭐ 1-Arcobaleno',
      star1: '⭐ 1-Stella',
      diamond4: '◇◇◇◇ 4-Diamanti',
      supporterBadge: '☕ Sostenitore Onorario',
      clickToInspect: 'Clicca per ispezionare',
      noGodCardsYet: 'Nessuna carta rara trovata. Apri bustine per arricchire il tuo Pokédex!',
      luckDetailsTitle: 'Probabilità Ufficiali & Dettaglio Fortuna',
      luckDetailsDesc: 'Il punteggio base di 50 punti rappresenta l’attesa statistica ufficiale.',
      themeGold: '✨ Oro Ossidiana',
      themeCyber: '⚡ Cyber Neon',
      themeAurora: '🌌 Aurora Celeste',
      themeSelector: 'Stile del Poster:',
      posterCardHeading: 'Poster Passaporto Allenatore',
      posterCardDescription: 'Scegli il tuo stile, salva il poster in alta definizione e condividi la tua fortuna con gli amici!',
      luckModelBadge: 'Modello RNG Ufficiale',
      viewLuckDetails: 'Dettagli RNG',
      hideLuckDetails: 'Nascondi',
      luckPacksSummary: (packs: number, copies: number) => `Circa ${packs} bustine · ${copies} carte rare trovate`,
    },
    pt: {
      modalTitle: 'Passaporte de Colecionador',
      modalSubtitle: 'Progresso da Pokédex, Índice de Sorte RNG e Pôster HD',
      platformName: 'PTCG Pocket Trocas & Dex',
      viralInviteTitle: '🔥 Teste seu índice de sorte RNG agora mesmo!',
      viralInviteSub: 'Modelagem oficial de probabilidades e trocas 1:1 justas',
      viralInvite: '🔥 Teste sua sorte e encontre trocas gratuitas!',
      qrScanTip: '📱 Escaneie para testar a sorte',
      featureTag1: 'Troca Justa 1:1',
      featureTag2: 'Dex em Tempo Real',
      featureTag3: 'Modelo RNG Oficial',
      featureTag4: 'Combinação Inteligente',
      beatTrainers: (pct: number) => `👑 Mais sortudo que ${pct.toFixed(1)}% dos treinadores`,
      completion: 'Progresso Geral',
      collectorIndex: 'Valor da Coleção',
      packPoints: 'Pontos de Pacote',
      luckIndex: 'Índice de Sorte (Modelo RNG)',
      uniqueCards: 'Cartas Únicas',
      totalCopies: 'Total de Cartas',
      friendCode: 'Código de Amigo',
      chaseCards: 'Cartas Principais',
      rareSectionTitle: '✨ ESTATÍSTICAS DE ALTA RARIDADE',
      rareBreakdown: 'Estatísticas de Alta Raridade:',
      shareChallenge: '⚡ Compartilhe com amigos e descubra quem é o verdadeiro mestre da sorte!',
      downloadPoster: 'Baixar Pôster HD (1080P PNG)',
      shareX: 'Compartilhar no X',
      copyDiscord: 'Copiar para Discord',
      copied: 'Copiado!',
      copyFC: 'Copiar Código',
      copiedFC: 'Código Copiado!',
      date: 'Data',
      craftingPointsSub: 'Pontos de pacote equivalentes',
      generatingPoster: 'Gerando pôster HD...',
      collecting: 'Nenhuma carta principal ainda!',
      crown: '👑 Coroa',
      star3: '⭐⭐⭐ 3-Estrelas',
      rainbowStar2: '🌈⭐⭐ 2-Arco-íris',
      star2: '⭐⭐ 2-Estrelas',
      rainbowStar1: '🌈⭐ 1-Arco-íris',
      star1: '⭐ 1-Estrela',
      diamond4: '◇◇◇◇ 4-Diamantes',
      supporterBadge: '☕ Honra de Apoiador',
      clickToInspect: 'Clique para inspecionar',
      noGodCardsYet: 'Nenhuma carta rara encontrada. Abra pacotes para completar sua coleção!',
      luckDetailsTitle: 'Probabilidades Oficiais e Detalhes da Sorte',
      luckDetailsDesc: 'A pontuação de 50 pontos reflete a probabilidade teórica exata.',
      themeGold: '✨ Ouro Obsidiana',
      themeCyber: '⚡ Cyber Neon',
      themeAurora: '🌌 Aurora Celestial',
      themeSelector: 'Estilo do Pôster:',
      posterCardHeading: 'Pôster do Passaporte do Treinador',
      posterCardDescription: 'Escolha seu estilo, salve seu pôster em alta definição e compartilhe sua sorte com seus amigos!',
      luckModelBadge: 'Modelo RNG Oficial',
      viewLuckDetails: 'Detalhes RNG',
      hideLuckDetails: 'Ocultar',
      luckPacksSummary: (packs: number, copies: number) => `Cerca de ${packs} pacotes · ${copies} cartas de alta raridade`,
    },
  }[currentLanguage] || {
    modalTitle: 'Trainer Collection Passport',
    modalSubtitle: 'Overall Dex Completion, Probability-Grounded Luck Rating & HD Poster',
    platformName: 'PTCG Pocket Trader & Dex',
    viralInviteTitle: '🔥 Test your RNG Luck Rating now!',
    viralInviteSub: 'Official RNG Modeling & 1:1 Fair Trade Matching',
    viralInvite: '🔥 Test your RNG Luck Rating now & match free trades!',
    qrScanTip: '📱 Scan to test RNG Luck',
    featureTag1: '1:1 Fair Trades',
    featureTag2: 'Real-Time Dex Tracker',
    featureTag3: 'Official RNG Modeling',
    featureTag4: 'Smart Matching',
    beatTrainers: (pct: number) => `👑 Outlucked ${pct.toFixed(1)}% of Trainers globally`,
    completion: 'Overall Completion',
    collectorIndex: 'Total Dex Power (Value)',
    packPoints: 'Pack Points Value',
    luckIndex: 'Luck Rating (Official RNG Model)',
    uniqueCards: 'Unique Cards',
    totalCopies: 'Total Cards',
    friendCode: 'Friend Code',
    chaseCards: 'Chase Cards Showcase',
    rareSectionTitle: '✨ HIGH RARITY CARD STATS',
    rareBreakdown: 'High-Rarity Cards Breakdown:',
    shareChallenge: '⚡ Share with friends to see who reigns as the true RNG Deity!',
    downloadPoster: 'Download HD Poster (1080P PNG)',
    shareX: 'Share on X (Twitter)',
    copyDiscord: 'Copy for Discord',
    copied: 'Copied!',
    copyFC: 'Copy Code',
    copiedFC: 'Copied Code!',
    date: 'Generated',
    craftingPointsSub: 'In-game crafting points',
    generatingPoster: 'Rendering HD poster...',
    collecting: 'No chase cards yet!',
    crown: '👑 Crown',
    star3: '⭐⭐⭐ 3-Star',
    rainbowStar2: '🌈⭐⭐ 2-Rainbow',
    star2: '⭐⭐ 2-Star',
    rainbowStar1: '🌈⭐ 1-Rainbow',
    star1: '⭐ 1-Star',
    diamond4: '◇◇◇◇ 4-Diamond',
    supporterBadge: '☕ Supporter Honor',
    clickToInspect: 'Click to inspect card',
    noGodCardsYet: 'No high-rarity cards found yet. Open packs or propose trades to fill your dex!',
    luckDetailsTitle: 'Official Drop Probabilities & Luck Breakdown',
    luckDetailsDesc:
      'The 50-pt baseline represents exact theoretical pull expectation. Pulling rare Crowns, Immersives or dense high-tier cards pushes scores past 50 and into the 80+ tier (80+ represents beating official odds by ~85%-100%+).',
    themeGold: '✨ Obsidian Gold',
    themeCyber: '⚡ Cyber Neon',
    themeAurora: '🌌 Celestial Aurora',
    themeSelector: 'Poster Style:',
    posterCardHeading: 'Trainer Collection Passport',
    posterCardDescription: 'Choose your theme, save an HD showcase poster, and share your luck rating with friends!',
    luckModelBadge: 'Official RNG Model',
    viewLuckDetails: 'RNG Details',
    hideLuckDetails: 'Hide Details',
    luckPacksSummary: (packs: number, copies: number) => `~${packs} Packs Opened · ${copies} High-Tier Pulls`,
  };

  // Helper to load image safely without throwing CORS exceptions via backend proxy
  const loadSafeImage = (rawUrl: string, timeoutMs = 4000): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, timeoutMs);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(img);
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };

      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        img.src = `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`;
      } else {
        img.src = rawUrl;
      }
    });
  };

  // Top representative chase cards (up to 4)
  const topCards = useMemo(() => rating.topCards.slice(0, 4), [rating.topCards]);

  // Render high-resolution canvas poster matching big-company design standards
  const renderPosterCanvas = async (): Promise<string | null> => {
    const canvas = document.createElement('canvas');
    // High-resolution poster dimensions (1080 x 1620)
    const width = 1080;
    const height = 1620;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const host = window.location.host || 'ptcgpocket.app';
    const appUrl = `${window.location.protocol}//${host}`;

    // 1. Preload real QR code image
    let qrImg: HTMLImageElement | null = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(appUrl, {
        margin: 1,
        width: 320,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      });
      qrImg = await loadSafeImage(qrDataUrl);
    } catch (e) {
      console.warn('QR code generation error:', e);
    }

    // 2. Preload Chase Card images (Matching Current Language!)
    const cardImages: (HTMLImageElement | null)[] = await Promise.all(
      topCards.map(async (card) => {
        const imgUrl = getCardImageUrl(card, 'high', currentLanguage);
        if (!imgUrl) return null;
        return await loadSafeImage(imgUrl);
      })
    );

    // 3. Theme-Specific Visual Palettes & Backgrounds
    if (posterTheme === 'gold') {
      // THEME 1: OBSIDIAN GOLD (黑曜烫金典藏)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#090a0f');
      bgGrad.addColorStop(0.3, '#14120c');
      bgGrad.addColorStop(0.7, '#0c0a06');
      bgGrad.addColorStop(1, '#040404');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Light Cone & Radial Glow
      const topGlow = ctx.createRadialGradient(width / 2, 0, 60, width / 2, 200, 780);
      topGlow.addColorStop(0, 'rgba(251, 191, 36, 0.32)');
      topGlow.addColorStop(0.4, 'rgba(217, 119, 6, 0.16)');
      topGlow.addColorStop(0.8, 'rgba(180, 83, 9, 0.05)');
      topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, 800);

      // Subtle Starlight Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 60; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 60; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Metallic Gold Borders
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(38, 38, width - 76, height - 76);

      // Corner Accents in Rich Gold
      const cs = 56;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, 30 + cs);
      ctx.lineTo(30, 30);
      ctx.lineTo(30 + cs, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, 30);
      ctx.lineTo(width - 30, 30);
      ctx.lineTo(width - 30, 30 + cs);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, height - 30 - cs);
      ctx.lineTo(30, height - 30);
      ctx.lineTo(30 + cs, height - 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, height - 30);
      ctx.lineTo(width - 30, height - 30);
      ctx.lineTo(width - 30, height - 30 - cs);
      ctx.stroke();

      // Scattered Gold Sparkles
      drawSparkle(ctx, 140, 110, 16, '#fbbf24');
      drawSparkle(ctx, width - 150, 120, 18, '#fde047');
      drawSparkle(ctx, 80, 720, 14, '#f59e0b');
      drawSparkle(ctx, width - 90, 760, 15, '#fbbf24');
      drawSparkle(ctx, 320, 520, 12, '#fde047');
      drawSparkle(ctx, 800, 530, 14, '#fbbf24');
    } else if (posterTheme === 'cyber') {
      // THEME 2: CYBER NEON (赛博霓虹电竞)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#040817');
      bgGrad.addColorStop(0.3, '#0b1b3d');
      bgGrad.addColorStop(0.7, '#071026');
      bgGrad.addColorStop(1, '#02050e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyan Neon & Magenta Spotlights
      const topGlow = ctx.createRadialGradient(width / 2, 0, 80, width / 2, 180, 750);
      topGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      topGlow.addColorStop(0.4, 'rgba(236, 72, 153, 0.18)');
      topGlow.addColorStop(0.8, 'rgba(99, 102, 241, 0.06)');
      topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, 750);

      // Cyber Matrix Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 50; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 50; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Neon Frame
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // Angled Sci-Fi Corners
      const cs = 52;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(30, 30 + cs);
      ctx.lineTo(30, 30);
      ctx.lineTo(30 + cs, 30);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, 30);
      ctx.lineTo(width - 30, 30);
      ctx.lineTo(width - 30, 30 + cs);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(30, height - 30 - cs);
      ctx.lineTo(30, height - 30);
      ctx.lineTo(30 + cs, height - 30);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, height - 30);
      ctx.lineTo(width - 30, height - 30);
      ctx.lineTo(width - 30, height - 30 - cs);
      ctx.stroke();

      drawSparkle(ctx, 160, 130, 16, '#38bdf8');
      drawSparkle(ctx, width - 160, 130, 18, '#ec4899');
    } else {
      // THEME 3: CELESTIAL AURORA (梦幻星云极光)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0c041c');
      bgGrad.addColorStop(0.3, '#1a0b38');
      bgGrad.addColorStop(0.65, '#0d1533');
      bgGrad.addColorStop(1, '#03020a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Swirling Aurora & Starlight
      const topGlow = ctx.createRadialGradient(width / 2, 0, 70, width / 2, 220, 780);
      topGlow.addColorStop(0, 'rgba(168, 85, 247, 0.38)');
      topGlow.addColorStop(0.35, 'rgba(45, 212, 191, 0.22)');
      topGlow.addColorStop(0.7, 'rgba(236, 72, 153, 0.12)');
      topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, 800);

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 60; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 60; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      const cs = 52;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, 30 + cs);
      ctx.lineTo(30, 30);
      ctx.lineTo(30 + cs, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, 30);
      ctx.lineTo(width - 30, 30);
      ctx.lineTo(width - 30, 30 + cs);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, height - 30 - cs);
      ctx.lineTo(30, height - 30);
      ctx.lineTo(30 + cs, height - 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 30 - cs, height - 30);
      ctx.lineTo(width - 30, height - 30);
      ctx.lineTo(width - 30, height - 30 - cs);
      ctx.stroke();

      drawSparkle(ctx, 130, 120, 18, '#e879f9');
      drawSparkle(ctx, width - 140, 110, 16, '#2dd4bf');
      drawSparkle(ctx, 420, 520, 14, '#c084fc');
      drawSparkle(ctx, 760, 520, 14, '#e879f9');
    }

    // 4. HEADER BRANDING (Promotional Top Header)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    drawRoundRect(ctx, width / 2 - 300, 54, 600, 44, 22);
    ctx.fill();
    ctx.strokeStyle = posterTheme === 'gold' ? '#fbbf24' : posterTheme === 'cyber' ? '#38bdf8' : '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : posterTheme === 'cyber' ? '#38bdf8' : '#e879f9';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⚡ POKÉMON TCG POCKET  •  COLLECTION PASSPORT', width / 2, 82);

    // 5. TRAINER IDENTITY & PROFILE BLOCK
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillText(trainerProfile.name || 'Trainer', width / 2, 156);
    ctx.shadowBlur = 0;

    // Friend Code Badge Pill (Monospace & High Contrast)
    const fcText = `${i18n.friendCode}: ${trainerProfile.friendCode}`;
    ctx.font = 'bold 22px monospace';
    const fcWidth = ctx.measureText(fcText).width + 52;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    drawRoundRect(ctx, width / 2 - fcWidth / 2, 180, fcWidth, 42, 21);
    ctx.fill();
    ctx.strokeStyle = posterTheme === 'gold' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : '#38bdf8';
    ctx.fillText(fcText, width / 2, 209);

    // SUPPORTER EMBLEM OR RANK
    if (trainerProfile.isSupporter) {
      const supBadgeText = `👑 ${trainerProfile.supporterBadge || '☕ Master Supporter'} · VIP SUPPORTER`;
      ctx.font = 'bold 19px sans-serif';
      const badgeW = ctx.measureText(supBadgeText).width + 60;
      const bY = 236;

      const badgeGrad = ctx.createLinearGradient(width / 2 - badgeW / 2, 0, width / 2 + badgeW / 2, 0);
      badgeGrad.addColorStop(0, '#f59e0b');
      badgeGrad.addColorStop(0.5, '#fde047');
      badgeGrad.addColorStop(1, '#ea580c');

      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      drawRoundRect(ctx, width / 2 - badgeW / 2, bY, badgeW, 40, 20);
      ctx.fill();

      ctx.strokeStyle = badgeGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.fillText(supBadgeText, width / 2, bY + 27);
    } else {
      const rankText = `★ COLLECTOR STATUS: ${rating.tierLabel.toUpperCase()} ★`;
      ctx.font = 'bold 17px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(rankText, width / 2, 258);
    }

    // 6. CORE 3 GRAND SHOWCASE METRIC CARDS (Enlarged, Bold & Professional)
    // 1) 总体图鉴进度  2) 官方概率加权欧气值 (含击败全网XX%训练家)  3) 卡牌总价值/总评分
    const metricsY = 286;
    const cardW = 310;
    const cardH = 200;
    const cardGap = (width - 120 - cardW * 3) / 2;

    // Card 1: 总体图鉴收集进度 (Overall Completion)
    const m1X = 60;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    drawRoundRect(ctx, m1X, metricsY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(i18n.completion.toUpperCase(), m1X + cardW / 2, metricsY + 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px sans-serif';
    ctx.fillText(`${rating.completionPercent}%`, m1X + cardW / 2, metricsY + 92);

    // Glowing Progress Bar inside Card 1
    const barPad = 24;
    const barW = cardW - barPad * 2;
    ctx.fillStyle = '#1e293b';
    drawRoundRect(ctx, m1X + barPad, metricsY + 116, barW, 10, 5);
    ctx.fill();

    const fillW = Math.max(8, (rating.completionPercent / 100) * barW);
    const c1Grad = ctx.createLinearGradient(m1X + barPad, 0, m1X + barPad + barW, 0);
    c1Grad.addColorStop(0, '#38bdf8');
    c1Grad.addColorStop(1, '#818cf8');
    ctx.fillStyle = c1Grad;
    drawRoundRect(ctx, m1X + barPad, metricsY + 116, fillW, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(
      `${rating.totalUniqueOwned} / ${rating.totalCardsInDb} ${i18n.uniqueCards}`,
      m1X + cardW / 2,
      metricsY + 154
    );
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${rating.totalCardsCount} ${i18n.totalCopies}`, m1X + cardW / 2, metricsY + 178);

    // Card 2: 欧气值指数 (含“击败了全网 XX% 的训练家”超爽心理反馈)
    const m2X = m1X + cardW + cardGap;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    drawRoundRect(ctx, m2X, metricsY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = luckMetric.score >= 80 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(i18n.luckIndex.toUpperCase(), m2X + cardW / 2, metricsY + 34);

    ctx.fillStyle = luckMetric.color;
    ctx.font = '900 52px sans-serif';
    ctx.fillText(`${luckMetric.score.toFixed(1)}分`, m2X + cardW / 2, metricsY + 92);

    // Beat Percentile Highlight Tag with Glowing Golden Pill
    const beatText = i18n.beatTrainers(beatPercentile);
    ctx.font = '900 14px sans-serif';
    const beatW = Math.min(cardW - 20, ctx.measureText(beatText).width + 24);
    ctx.fillStyle = luckMetric.score >= 80 ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.16)';
    drawRoundRect(ctx, m2X + cardW / 2 - beatW / 2, metricsY + 110, beatW, 26, 13);
    ctx.fill();
    ctx.strokeStyle = luckMetric.score >= 80 ? '#fbbf24' : 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = luckMetric.score >= 80 ? '#fef08a' : '#fde047';
    ctx.fillText(beatText, m2X + cardW / 2, metricsY + 128);

    // Title & Ratio vs Expectation
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(luckMetric.title, m2X + cardW / 2, metricsY + 154);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    const luckRatioText =
      luckMetric.ratio >= 1
        ? `超期望 +${Math.round((luckMetric.ratio - 1) * 100)}% (${luckMetric.ratio.toFixed(2)}x 概率)`
        : `期望達成率 ${Math.round(luckMetric.ratio * 100)}% · 蓄力中`;
    ctx.fillText(luckRatioText, m2X + cardW / 2, metricsY + 178);

    // Card 3: 收藏总评分 (Total Dex Power / Crafting Points)
    const m3X = m2X + cardW + cardGap;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    drawRoundRect(ctx, m3X, metricsY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(i18n.collectorIndex.toUpperCase(), m3X + cardW / 2, metricsY + 34);

    ctx.fillStyle = '#34d399';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(`${rating.totalPackPoints.toLocaleString()}`, m3X + cardW / 2, metricsY + 92);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`TIER: ${rating.tierLabel}`, m3X + cardW / 2, metricsY + 128);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(i18n.craftingPointsSub, m3X + cardW / 2, metricsY + 154);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('PTCG CRAFT PTS', m3X + cardW / 2, metricsY + 178);

    // 7. KEY CHASE CARDS SHOWCASE (With Luxury Acrylic Slab Frames & Prismatic Foil)
    const chaseY = 520;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 24px sans-serif';
    ctx.fillText(i18n.chaseCards, 60, chaseY);

    const boxW = 224;
    const boxH = 340;
    const boxGap = (width - 120 - boxW * 4) / 3;

    if (topCards.length > 0) {
      topCards.forEach((card, idx) => {
        const bx = 60 + idx * (boxW + boxGap);
        const by = chaseY + 18;

        const isCrown = card.rarity === 'CR';
        const is3S = card.rarity === '3S';

        // Outer Glow Frame (Volumetric glow)
        ctx.fillStyle = isCrown
          ? 'rgba(245, 158, 11, 0.22)'
          : is3S
          ? 'rgba(217, 70, 239, 0.22)'
          : 'rgba(56, 189, 248, 0.16)';
        drawRoundRect(ctx, bx - 6, by - 6, boxW + 12, boxH + 12, 24);
        ctx.fill();

        // Card Acrylic Slab Background
        const cardBg = ctx.createLinearGradient(bx, by, bx, by + boxH);
        cardBg.addColorStop(0, '#1e293b');
        cardBg.addColorStop(0.5, '#0f172a');
        cardBg.addColorStop(1, '#020617');
        ctx.fillStyle = cardBg;
        drawRoundRect(ctx, bx, by, boxW, boxH, 18);
        ctx.fill();

        // Metallic Border
        ctx.strokeStyle = isCrown ? '#fbbf24' : is3S ? '#e879f9' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // DRAW REAL CARD ARTWORK IMAGE
        const realCardImg = cardImages[idx];
        const artPad = 10;
        const artW = boxW - artPad * 2;
        const artH = 240;

        if (realCardImg) {
          ctx.save();
          drawRoundRect(ctx, bx + artPad, by + artPad, artW, artH, 12);
          ctx.clip();
          ctx.drawImage(realCardImg, bx + artPad, by + artPad, artW, artH);

          // Diagonal Glass Shine Reflection across card surface
          const glassGrad = ctx.createLinearGradient(
            bx + artPad,
            by + artPad,
            bx + artPad + artW,
            by + artPad + artH
          );
          glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          glassGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
          glassGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
          glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glassGrad;
          ctx.fillRect(bx + artPad, by + artPad, artW, artH);

          // Rainbow Iridescent Sheen on Crown or Immersive
          if (isCrown || is3S) {
            const holoGrad = ctx.createLinearGradient(bx + artPad, by + artPad, bx + artPad + artW, by + artPad);
            holoGrad.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
            holoGrad.addColorStop(0.25, 'rgba(245, 158, 11, 0.15)');
            holoGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)');
            holoGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.15)');
            holoGrad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
            ctx.fillStyle = holoGrad;
            ctx.fillRect(bx + artPad, by + artPad, artW, artH);
          }

          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          drawRoundRect(ctx, bx + artPad, by + artPad, artW, artH, 12);
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.font = 'bold 42px sans-serif';
          ctx.fillText(isCrown ? '👑' : is3S ? '✨' : '⭐', bx + boxW / 2, by + 130);
        }

        // Rarity Tag overlay
        ctx.textAlign = 'center';
        const rarityBadge = isCrown
          ? '👑 CROWN'
          : is3S
          ? '⭐⭐⭐ IMMERSIVE'
          : card.rarity === '2RS'
          ? '🌈⭐⭐ SHINY SAR'
          : card.rarity === '2S'
          ? '⭐⭐ SAR'
          : card.rarity === '1RS'
          ? '🌈⭐ SHINY AR'
          : card.rarity === '1S'
          ? '⭐ AR'
          : '◇◇◇◇ EX';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        drawRoundRect(ctx, bx + 14, by + 14, boxW - 28, 26, 13);
        ctx.fill();

        ctx.fillStyle = isCrown
          ? '#fde047'
          : is3S
          ? '#f0abfc'
          : card.rarity === '2RS' || card.rarity === '1RS'
          ? '#f472b6'
          : '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(rarityBadge, bx + boxW / 2, by + 32);

        // Card Name (Localized!)
        const cName = getCardName(card);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(cName.length > 9 ? cName.slice(0, 9) + '…' : cName, bx + boxW / 2, by + boxH - 42);

        // Pack & Card Number
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${card.pack.toUpperCase()} #${card.cardNumber}`, bx + boxW / 2, by + boxH - 18);
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '18px sans-serif';
      ctx.fillText(i18n.collecting, 60, chaseY + 80);
    }

    // 8. ALL 7 HIGH RARITY COUNTS SUMMARY MATRIX
    // 👑 皇冠, ⭐⭐⭐ 3黄星, 🌈⭐⭐ 2彩星, ⭐⭐ 2黄星, 🌈⭐ 1彩星, ⭐ 1黄星, ◇◇◇◇ 4菱形
    const rarityTitleY = 902;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 19px sans-serif';
    ctx.fillText(i18n.rareSectionTitle, 60, rarityTitleY);

    const rarityRowY = 918;
    const rarityRowH = 110;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    drawRoundRect(ctx, 60, rarityRowY, width - 120, rarityRowH, 22);
    ctx.fill();
    ctx.strokeStyle = posterTheme === 'gold' ? 'rgba(251, 191, 36, 0.45)' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const rarities = [
      { label: i18n.crown, count: rating.totalRarityCounts['CR'] || 0, color: '#f59e0b' },
      { label: i18n.star3, count: rating.totalRarityCounts['3S'] || 0, color: '#c084fc' },
      { label: i18n.rainbowStar2, count: rating.totalRarityCounts['2RS'] || 0, color: '#f43f5e' },
      { label: i18n.star2, count: rating.totalRarityCounts['2S'] || 0, color: '#38bdf8' },
      { label: i18n.rainbowStar1, count: rating.totalRarityCounts['1RS'] || 0, color: '#ec4899' },
      { label: i18n.star1, count: rating.totalRarityCounts['1S'] || 0, color: '#60a5fa' },
      { label: i18n.diamond4, count: rating.totalRarityCounts['4D'] || 0, color: '#facc15' },
    ];

    const rColW = (width - 120) / 7;
    rarities.forEach((r, idx) => {
      const rx = 60 + idx * rColW + rColW / 2;
      ctx.textAlign = 'center';

      // Subtle column divider
      if (idx > 0) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(60 + idx * rColW, rarityRowY + 16);
        ctx.lineTo(60 + idx * rColW, rarityRowY + rarityRowH - 16);
        ctx.stroke();
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(r.label, rx, rarityRowY + 38);

      ctx.fillStyle = r.count > 0 ? r.color : '#64748b';
      ctx.font = '900 34px sans-serif';
      ctx.fillText(`${r.count}`, rx, rarityRowY + 82);
    });

    // 9. GRAND VIRAL PROMOTIONAL FOOTER & SCANNABLE QR CODE
    // Extended to Y = 1560, perfectly filling the canvas with a balanced 60px bottom margin!
    const footerY = 1056;
    const footerH = 504;

    const footerGrad = ctx.createLinearGradient(60, footerY, width - 60, footerY + footerH);
    footerGrad.addColorStop(0, 'rgba(15, 23, 42, 0.98)');
    footerGrad.addColorStop(0.5, posterTheme === 'gold' ? 'rgba(30, 20, 10, 0.98)' : 'rgba(12, 25, 58, 0.98)');
    footerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
    ctx.fillStyle = footerGrad;
    drawRoundRect(ctx, 60, footerY, width - 120, footerH, 28);
    ctx.fill();

    ctx.strokeStyle = posterTheme === 'gold' ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Scannable QR Code Card Frame (Enlarged and crisp)
    const qrBoxSize = 220;
    const qrX = 95;
    const qrY = footerY + 42;

    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 20);
    ctx.fill();

    if (qrImg) {
      ctx.drawImage(qrImg, qrX + 10, qrY + 10, qrBoxSize - 20, qrBoxSize - 20);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PTCG DEX', qrX + qrBoxSize / 2, qrY + qrBoxSize / 2);
    }

    // QR Code Sub-pill 1: "📱 掃碼即刻測歐氣"
    ctx.fillStyle = posterTheme === 'gold' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(56, 189, 248, 0.2)';
    drawRoundRect(ctx, qrX + 10, qrY + qrBoxSize + 16, qrBoxSize - 20, 36, 18);
    ctx.fill();
    ctx.strokeStyle = posterTheme === 'gold' ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(i18n.qrScanTip, qrX + qrBoxSize / 2, qrY + qrBoxSize + 39);

    // QR Code Sub-pill 2: "⚡ 免費撮合換卡"
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    drawRoundRect(ctx, qrX + 10, qrY + qrBoxSize + 60, qrBoxSize - 20, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(i18n.featureTag1, qrX + qrBoxSize / 2, qrY + qrBoxSize + 82);

    // Right Side Content
    const infoX = qrX + qrBoxSize + 40;
    const maxInfoW = width - 60 - infoX - 30; // Maximum available width to prevent text overflowing!
    ctx.textAlign = 'left';

    // 1. Platform Name (Current Selected Language ONLY, auto-scaled to prevent overflowing!)
    let nameFontSize = 34;
    ctx.font = `900 ${nameFontSize}px sans-serif`;
    while (ctx.measureText(i18n.platformName).width > maxInfoW && nameFontSize > 18) {
      nameFontSize -= 2;
      ctx.font = `900 ${nameFontSize}px sans-serif`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(i18n.platformName, infoX, footerY + 70);

    // 2. Official Web URL (Prominent Glowing Monospace Text, auto-scaled)
    let urlFontSize = 26;
    ctx.font = `bold ${urlFontSize}px monospace`;
    while (ctx.measureText(appUrl).width > maxInfoW && urlFontSize > 14) {
      urlFontSize -= 2;
      ctx.font = `bold ${urlFontSize}px monospace`;
    }
    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : '#38bdf8';
    ctx.fillText(appUrl, infoX, footerY + 114);

    // 3. Viral Call To Action Banner ("🔥 快去测测你的欧气值吧！")
    const inviteW = maxInfoW;
    const inviteH = 74;
    ctx.fillStyle = posterTheme === 'gold' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.25)';
    drawRoundRect(ctx, infoX, footerY + 138, inviteW, inviteH, 18);
    ctx.fill();
    ctx.strokeStyle = posterTheme === 'gold' ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px sans-serif';
    ctx.fillText(i18n.viralInviteTitle, infoX + 22, footerY + 172);

    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : '#7dd3fc';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(i18n.viralInviteSub, infoX + 22, footerY + 198);

    // 4. Feature Tags Row (4 tags, rich esports badge row)
    const tagY = footerY + 232;
    const tags = [i18n.featureTag1, i18n.featureTag2, i18n.featureTag3, i18n.featureTag4];
    let curTagX = infoX;

    ctx.font = 'bold 13px sans-serif';
    tags.forEach((tagText) => {
      const tw = ctx.measureText(tagText).width + 24;
      if (curTagX + tw < width - 70) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        drawRoundRect(ctx, curTagX, tagY, tw, 32, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(tagText, curTagX + 12, tagY + 21);
        curTagX += tw + 10;
      }
    });

    // 5. Verification & Security Seal Line
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('🛡️ VERIFIED TRAINER DEX RECORD  •  AUTHENTIC COMMUNITY DATA', infoX, footerY + 300);

    // 6. Share Challenge (比拼欧气挑战)
    ctx.fillStyle = posterTheme === 'gold' ? '#fde047' : '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(i18n.shareChallenge, infoX, footerY + 338);

    // 7. Non-profit Community & Copyright Disclaimer
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    const dateStr = new Date().toISOString().slice(0, 10);
    ctx.fillText(
      `Issued: ${dateStr}  •  Free Fan Companion  •  Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.`,
      infoX,
      footerY + 375
    );

    // 8. Bottom Security Micro-Bar (fills lower space seamlessly)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(infoX, footerY + 410);
    ctx.lineTo(infoX + maxInfoW, footerY + 410);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '11px monospace';
    ctx.fillText(
      '• 1:1 SAFE TRADING PROTOCOL • NO REAL CURRENCY • RNG FAIR PLAY AUDITED •',
      infoX,
      footerY + 434
    );

    return canvas.toDataURL('image/png');
  };

  // Generate poster image data on mount, theme change or data changes
  useEffect(() => {
    let isMounted = true;
    setIsGeneratingImage(true);

    renderPosterCanvas()
      .then((dataUrl) => {
        if (isMounted && dataUrl) {
          setPosterDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error('Error generating passport poster:', err);
      })
      .finally(() => {
        if (isMounted) setIsGeneratingImage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentLanguage, userCollection, trainerProfile, luckMetric, posterTheme, beatPercentile]);

  // Download high-resolution poster
  const handleDownloadPoster = async () => {
    setIsGeneratingImage(true);
    try {
      const dataUrl = await renderPosterCanvas();
      if (!dataUrl) return;

      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (trainerProfile.name || 'trainer').toLowerCase().replace(/\s+/g, '_');
      a.download = `PTCG_Pocket_Passport_${posterTheme}_${safeName}.png`;
      a.click();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Format Discord Markdown
  const handleCopyDiscord = () => {
    const text = `**${trainerProfile.name || 'Trainer'}**'s Pokémon TCG Pocket Passport:
📊 **Completion**: ${rating.completionPercent}% (${rating.totalUniqueOwned}/${rating.totalCardsInDb} Cards)
🎲 **Luck Rating**: ${luckMetric.score.toFixed(1)} pts (${luckMetric.title} | ${i18n.beatTrainers(beatPercentile)})
🏆 **Dex Power**: ${rating.totalPackPoints.toLocaleString()} pts (${rating.tierLabel})
👑 **Crown**: ${rating.totalRarityCounts['CR'] || 0} | ⭐⭐⭐ **3★**: ${rating.totalRarityCounts['3S'] || 0} | 🌈⭐⭐ **2RS**: ${rating.totalRarityCounts['2RS'] || 0} | ⭐⭐ **2★**: ${rating.totalRarityCounts['2S'] || 0} | 🌈⭐ **1RS**: ${rating.totalRarityCounts['1RS'] || 0} | ⭐ **1★**: ${rating.totalRarityCounts['1S'] || 0} | ◇◇◇◇ **EX**: ${rating.totalRarityCounts['4D'] || 0}
${trainerProfile.isSupporter ? `☕ **Supporter**: ${trainerProfile.supporterBadge || 'Master Supporter'}\n` : ''}🤝 **Friend Code**: \`${trainerProfile.friendCode}\`
🌐 **Track & Trade**: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  // Copy friend code
  const handleCopyFriendCode = () => {
    navigator.clipboard.writeText(trainerProfile.friendCode || '');
    setCopiedFriendCode(true);
    setTimeout(() => setCopiedFriendCode(false), 2000);
  };

  // Tweet share URL
  const tweetText = `My Pokémon TCG Pocket Passport:
📊 ${rating.completionPercent}% Complete (${rating.totalUniqueOwned}/${rating.totalCardsInDb})
🎲 Luck Rating: ${luckMetric.score.toFixed(1)} pts (${i18n.beatTrainers(beatPercentile)})
🏆 Dex Power: ${rating.totalPackPoints.toLocaleString()} pts
${trainerProfile.isSupporter ? `☕ ${trainerProfile.supporterBadge || 'Master Supporter'}\n` : ''}🤝 Friend Code: ${trainerProfile.friendCode}
🌐 Match Trades: ${window.location.origin}

#PokemonTCGPocket #PTCGPocket`;

  const shareXUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  // Helper for badge display on card slabs
  const getCardRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'CR':
        return { label: '👑 皇冠', cls: 'bg-amber-400/20 text-amber-300 border-amber-400/40' };
      case '3S':
        return { label: '⭐⭐⭐ 3黃星', cls: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' };
      case '2RS':
        return { label: '🌈⭐⭐ 2彩星', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case '2S':
        return { label: '⭐⭐ 2黃星', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case '1RS':
        return { label: '🌈⭐ 1彩星', cls: 'bg-pink-500/20 text-pink-300 border-pink-500/40' };
      case '1S':
        return { label: '⭐ 1黃星', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case '4D':
        return { label: '◇◇◇◇ 4菱形', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
      default:
        return { label: rarity, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="collection-rating-dialog"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-100">
                  {i18n.modalTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  {currentLanguage.toUpperCase()}
                </span>
                {trainerProfile.isSupporter && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-amber-400" />
                    <span>{trainerProfile.supporterBadge || 'Supporter'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{i18n.modalSubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Trainer Identity Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/30">
                {(trainerProfile.name || 'T')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-white">
                    {trainerProfile.name || 'Trainer'}
                  </span>
                  {trainerProfile.isSupporter && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1">
                      <span>👑</span>
                      <span>VIP Supporter</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 font-mono">
                  <span>{i18n.friendCode}:</span>
                  <span className="text-sky-400 font-semibold">{trainerProfile.friendCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFriendCode}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedFriendCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedFriendCode ? i18n.copiedFC : i18n.copyFC}</span>
              </button>
            </div>
          </div>

          {/* Top 3 Core Metrics (Clean, Grounded, Professional - NO Per-Pack Overload) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Overall Completion (总体图鉴收集进度) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-950/30 to-slate-900 border border-sky-500/30 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-sky-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-sky-400" />
                  <span>{i18n.completion}</span>
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">
                  {rating.tierLabel}
                </span>
              </div>
              <div className="my-3">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {rating.completionPercent}%
                </span>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, rating.completionPercent))}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-400 flex items-center justify-between">
                <span>
                  {rating.totalUniqueOwned} / {rating.totalCardsInDb} {i18n.uniqueCards}
                </span>
                <span className="text-[11px] text-slate-500">
                  {rating.totalCardsCount} {i18n.totalCopies}
                </span>
              </span>
            </div>

            {/* 2. Probability-Grounded Luck Rating (欧气值指数 - 50基准，含击败全网百分比) */}
            <div
              className={`p-4 rounded-2xl bg-gradient-to-b ${luckMetric.bg} border ${luckMetric.border} flex flex-col justify-between relative overflow-hidden shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${luckMetric.textColor} flex items-center gap-1.5`}>
                  <Flame className="w-4 h-4 fill-current" />
                  <span>{i18n.luckIndex}</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {luckMetric.tier} TIER
                </span>
              </div>
              <div className="my-2.5">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl sm:text-4xl font-black ${luckMetric.textColor} tracking-tight`}>
                    {luckMetric.score.toFixed(1)}
                    <span className="text-sm font-bold ml-1 text-slate-300">分</span>
                  </span>
                  {luckMetric.ratio >= 1.0 ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>+{Math.round((luckMetric.ratio - 1) * 100)}% 超期望</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                      {Math.round(luckMetric.ratio * 100)}% 期望達成
                    </span>
                  )}
                </div>
                {/* Beat Percentile badge */}
                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{i18n.beatTrainers(beatPercentile)}</span>
                </div>
                <div className="mt-0.5">
                  <span className="text-xs text-amber-400/90 font-medium truncate block">
                    {luckMetric.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>
                  {i18n.luckPacksSummary(luckMetric.estimatedPacks, luckMetric.totalHighTierCopies)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLuckDetails((prev) => !prev)}
                  className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <span>{showLuckDetails ? i18n.hideLuckDetails : i18n.viewLuckDetails}</span>
                  {showLuckDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* 3. Total Dex Power / Crafting Points (卡牌总价值评分) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>{i18n.collectorIndex}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  PTCG PTS
                </span>
              </div>
              <div className="my-3">
                <span className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight">
                  {rating.totalPackPoints.toLocaleString()}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-400/90">
                  <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                  <span>等值開包點數總計</span>
                </div>
              </div>
              <span className="text-xs text-slate-400">{i18n.craftingPointsSub}</span>
            </div>
          </div>

          {/* Collapsible Section: Official Drop Rates & Luck Breakdown for ALL 7 High-tier rarities */}
          {showLuckDetails && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-4 animate-fade-in shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <h4 className="text-sm font-extrabold text-slate-100">{i18n.luckDetailsTitle}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                      {i18n.luckModelBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{i18n.luckDetailsDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLuckDetails(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              {/* Tiers Breakdown Grid (7 Rarity Tiers) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {luckMetric.tiers.map((tier) => {
                  const isBeating = tier.actualCopiesCount > tier.expectedCopiesCount;
                  const ratio = tier.expectedCopiesCount > 0 ? tier.actualCopiesCount / tier.expectedCopiesCount : 0;

                  return (
                    <div
                      key={tier.id}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          {tier.tierRank}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          {tier.officialDropRatePerPack}%/包
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-200 truncate">{tier.rarityBadge}</div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-baseline justify-between">
                          <span>實抽 / 期望:</span>
                          <span className="font-mono font-bold text-white">
                            <span className={tier.actualCopiesCount > 0 ? 'text-amber-300' : 'text-slate-400'}>
                              {tier.actualCopiesCount}
                            </span>
                            <span className="text-slate-500 text-[10px]"> / {tier.expectedCopiesCount}</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-mono">權重: {tier.luckWeightPerCard}</span>
                        {isBeating ? (
                          <span className="text-emerald-400 font-bold">
                            +{((ratio - 1) * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            {ratio > 0 ? `${(ratio * 100).toFixed(0)}%` : '0%'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Representative God Cards Showcase (代表神卡展厅) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-extrabold text-slate-100">{i18n.chaseCards}</h4>
              </div>
              <span className="text-[11px] text-slate-400">{i18n.clickToInspect}</span>
            </div>

            {topCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topCards.map((card) => {
                  const cardImgUrl = getCardImageUrl(card, 'high', currentLanguage);
                  const isCrown = card.rarity === 'CR';
                  const is3S = card.rarity === '3S';
                  const badgeInfo = getCardRarityBadge(card.rarity);

                  return (
                    <div
                      key={card.id}
                      onClick={() => onInspectCard?.(card)}
                      className={`group relative rounded-2xl bg-slate-800/80 border p-2.5 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                        isCrown
                          ? 'border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-500/10'
                          : is3S
                          ? 'border-fuchsia-500/50 hover:border-fuchsia-400 shadow-lg shadow-fuchsia-500/10'
                          : 'border-sky-500/40 hover:border-sky-400 shadow-lg shadow-sky-500/10'
                      }`}
                    >
                      {/* Card Rarity Badge Tag */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${badgeInfo.cls}`}>
                          {badgeInfo.label}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300 transition-colors" />
                      </div>

                      {/* Card Image */}
                      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-700/50 group-hover:shadow-inner">
                        {cardImgUrl ? (
                          <img
                            src={cardImgUrl}
                            alt={getCardName(card)}
                            className="w-full h-full object-contain block transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-3xl">{isCrown ? '👑' : '✨'}</div>
                        )}
                      </div>

                      {/* Card Name & Number */}
                      <div className="mt-2 text-center">
                        <div className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                          {getCardName(card)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {card.pack.toUpperCase()} #{card.cardNumber}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center text-xs text-slate-400">
                {i18n.noGodCardsYet}
              </div>
            )}
          </div>

          {/* Poster Showcase Container */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            {/* Visual Style Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">{i18n.themeSelector}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPosterTheme('gold')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posterTheme === 'gold'
                      ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{i18n.themeGold}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosterTheme('cyber')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posterTheme === 'cyber'
                      ? 'bg-sky-500/20 text-sky-300 border-2 border-sky-400 shadow-md shadow-sky-500/20 scale-105'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{i18n.themeCyber}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosterTheme('aurora')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posterTheme === 'aurora'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border-2 border-fuchsia-400 shadow-md shadow-fuchsia-500/20 scale-105'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{i18n.themeAurora}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-center">
              {/* Poster Canvas Preview */}
              <div className="w-full lg:w-1/2 flex justify-center">
                {posterDataUrl ? (
                  <div
                    className={`relative rounded-2xl overflow-hidden border-2 shadow-2xl max-w-[340px] w-full bg-slate-950 group transition-all duration-300 ${
                      posterTheme === 'gold'
                        ? 'border-amber-400/50 shadow-amber-500/20'
                        : posterTheme === 'cyber'
                        ? 'border-sky-400/50 shadow-sky-500/20'
                        : 'border-fuchsia-400/50 shadow-fuchsia-500/20'
                    }`}
                  >
                    <img
                      src={posterDataUrl}
                      alt="Collection Passport Poster"
                      className="w-full h-auto object-contain block transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="h-80 w-full rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                    <span className="text-xs">{i18n.generatingPoster}</span>
                  </div>
                )}
              </div>

              {/* Right Side: Trainer Info & Overseas Sharing Tools */}
              <div className="w-full lg:w-1/2 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">
                      {i18n.posterCardHeading}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {i18n.posterCardDescription}
                  </p>
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>🔥</span>
                    <span>{i18n.viralInvite}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    id="btn-download-poster"
                    type="button"
                    onClick={handleDownloadPoster}
                    disabled={isGeneratingImage}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-500 hover:from-sky-400 hover:to-indigo-400 text-white text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{i18n.downloadPoster}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      id="btn-share-x"
                      href={shareXUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>{i18n.shareX}</span>
                    </a>

                    <button
                      id="btn-copy-discord"
                      type="button"
                      onClick={handleCopyDiscord}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                    >
                      {copiedDiscord ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>{copiedDiscord ? i18n.copied : i18n.copyDiscord}</span>
                    </button>
                  </div>
                </div>

                {/* Rarity breakdown mini counters (ALL 7 HIGH-TIER RARITIES) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-300 font-bold">{i18n.rareBreakdown}</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
                      共 {luckMetric.totalHighTierCopies} 張高階卡
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold">
                      {i18n.crown}: {rating.totalRarityCounts['CR'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 font-bold">
                      {i18n.star3}: {rating.totalRarityCounts['3S'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                      {i18n.rainbowStar2}: {rating.totalRarityCounts['2RS'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                      {i18n.star2}: {rating.totalRarityCounts['2S'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-bold">
                      {i18n.rainbowStar1}: {rating.totalRarityCounts['1RS'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold">
                      {i18n.star1}: {rating.totalRarityCounts['1S'] || 0}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-bold">
                      {i18n.diamond4}: {rating.totalRarityCounts['4D'] || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
