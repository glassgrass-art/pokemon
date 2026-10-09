import React, { useState, useRef, useEffect } from 'react';
import { PokemonCard, UserCardStatus, PackExpansion } from '../types';
import { PACK_INFO, CARDS_DATABASE } from '../data/cardsData';
import { useLanguage } from '../context/LanguageContext';
import { RarityBadge } from './RarityBadge';
import {
  processScreenshot,
  applyScanResultsToCollection,
  ScannedCardSlot,
  ScanResult,
} from '../utils/dexScanner';
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  Copy,
  Download,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  FileImage,
  ArrowRight,
  Layers,
  HelpCircle,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Search,
  ExternalLink,
  Cpu,
  Crosshair,
  Move,
  Maximize2,
  ZoomIn,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DexScannerModalProps {
  userCollection: Record<string, UserCardStatus>;
  onClose: () => void;
  onImport: (newCollection: Record<string, UserCardStatus>) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onInspectCard?: (card: PokemonCard) => void;
  zIndex?: number;
}

export const DexScannerModal: React.FC<DexScannerModalProps> = ({
  userCollection,
  onClose,
  onImport,
  showToast,
  onInspectCard,
  zIndex,
}) => {
  const { currentLanguage, getCardName, getCardImageUrl } = useLanguage();

  // Scanner Config: Default to 'AUTO' so users DO NOT need to choose a pack!
  const [selectedPack, setSelectedPack] = useState<string>('AUTO');
  const [startCardNumber, setStartCardNumber] = useState<number>(1);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite_pack' | 'overwrite_all'>('merge');

  // Scanner Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [cardSlots, setCardSlots] = useState<ScannedCardSlot[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'unowned' | 'duplicate'>('all');
  const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(true);
  const [previewZoomMode, setPreviewZoomMode] = useState<'standard' | 'expanded' | 'actual'>('expanded');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showClarityGuide, setShowClarityGuide] = useState(false);
  const previewImgRef = useRef<HTMLImageElement>(null);

  // Dynamic Alignment Calibration States
  const [currentSourceImages, setCurrentSourceImages] = useState<(File | Blob | string)[]>([]);
  const [verticalOffsetShift, setVerticalOffsetShift] = useState<number>(0);
  const [horizontalOffsetShift, setHorizontalOffsetShift] = useState<number>(0);
  const [cardScale, setCardScale] = useState<number>(1.0);
  const [rowGapScale, setRowGapScale] = useState<number>(1.0);
  const [isCrosshairActive, setIsCrosshairActive] = useState<boolean>(false);
  const [preferredCols, setPreferredCols] = useState<number | 'AUTO'>('AUTO');
  const [overrideStartNumber, setOverrideStartNumber] = useState<number | null>(null);
  const [overridePack, setOverridePack] = useState<string | null>(null);

  // Recognition Engine Settings (Default: Two-Step Precise Name Match + 2D-DCT Variant Hash)
  const [matchingMode, setMatchingMode] = useState<'two_step' | 'visual_hash' | 'hybrid' | 'sequential' | 'ai'>('two_step');
  const [matchingSensitivity, setMatchingSensitivity] = useState<'strict' | 'balanced' | 'relaxed'>('balanced');

  // Quick In-Slot Card Replacement Picker State
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internationalized UI strings for all 9 supported languages
  const labels = {
    'zh-Hant': {
      title: '智慧截圖識圖匯入',
      subtitle: '上傳遊戲圖鑑截圖，自動辨識所屬卡包、卡牌及擁有狀態',
      tabScanner: '截圖辨識匯入 (自動識別)',
      tabJson: 'JSON 資料備份與還原',
      dbFeatureStatus: '離線圖鑑特徵比對庫 (3,545 張卡牌)',
      speedBadge: '毫秒級極速辨識 · 無需手動輸入',
      packsSupport: '支援 A1 ~ B4a 全系列 3 列圖鑑截圖',
      bannerTitle: '上傳遊戲圖鑑截圖自動識別並匯入',
      bannerDesc: '支援一次上傳多張截圖或在視窗內直接貼上剪貼簿圖片。系統將自動辨識卡牌所屬卡包、編號、稀有度與暗色未獲得剪影，一鍵匯入個人圖鑑！',
      dropTitle: '點擊選擇 或 拖曳遊戲 3 列圖鑑截圖至此',
      dropDesc: '支援單張或多張截圖批次辨識；亦可在任意位置直接按 Ctrl+V (Cmd+V) 貼上截圖',
      analyzing: '正在解析卡牌網格與所屬卡包...',
      detectedPack: '辨識所屬卡包',
      confidence: '置信度',
      batchQueue: '批次截圖隊列',
      totalCardsIdentified: '共辨識出 {count} 張卡牌',
      clickInspectHint: '點擊下方標籤可逐圖核對，匯入時將自動合併所有截圖卡牌',
      cacheHit: '命中特徵快取',
      tokens: '消耗',
      hideGrid: '隱藏網格檢測',
      showGrid: '檢視網格檢測',
      previewSize: '預覽尺寸:',
      standardZoom: '標準 (260px)',
      largeZoom: '大圖 (560px)',
      actualZoom: '1:1 原始高清',
      fullscreen: '全螢幕大圖',
      downloadAlign: '下載對齊圖',
      clarityGuide: '截圖清晰指南',
      clarityTitle: '如何截圖最清晰？',
      clarityTip1: '最清晰方法（推薦）：在手機相簿中找到遊戲原圖直接發送。手機截圖解析度高達 1080×2400，完全無損，AI 能看清每一個卡牌細節。',
      clarityTip2: '對齊調試圖：點擊上方【下載對齊圖】，可直接保存帶有綠紅檢測框的高清原圖，偏離幾像素一目了然！',
      clarityTip3: '網頁中看清：點擊【大圖 (560px)】或【1:1 原始高清】，圖片即可拉大滾動，卡牌清晰不再縮成一團。',
      crosshairSnap: '🎯 點擊截圖任意卡牌瞬時吸附對齊',
      waitingClick: '正在等待點擊卡牌...',
      crosshairHint: '請點擊截圖中任意一張卡牌中心，網格將瞬時自動吸附對齊！',
      standard3Col: '標準 3 列圖鑑模式',
      resetAll: '重置全部',
      verticalY: '垂直 Y:',
      horizontalX: '水平 X:',
      zoom: '縮放:',
      rowGap: '行距:',
      packLabel: '卡包:',
      startNumLabel: '起點:',
      engine: '辨識引擎:',
      twoStep: '🔮 雙步精準辨識 (推薦)',
      visualHash: '⚡ 本地特徵比對',
      sequential: '📋 序號快速匹配',
      cloudAi: '🤖 雲端 AI 視覺',
      tolerance: '容差:',
      tolStrict: '嚴格 (85%+ 相似)',
      tolBalanced: '平衡 (70%+ 相似)',
      tolRelaxed: '寬鬆 (55%+ 相似)',
      allCards: '全部',
      owned: '已收錄',
      missing: '未收錄',
      duplicates: '重複卡',
      selectAllOwned: '全選已收錄',
      resetMissing: '重置未收錄',
      cropLabel: '截圖',
      matchLabel: '匹配',
      hasOwned: '已擁有',
      notOwned: '未擁有',
      collapse: '收起',
      calibrateCard: '校準卡牌',
      setOwned: '設為已有',
      replaceCardPlaceholder: '搜尋更正此卡: 名稱或編號 (如 噴火龍 / 004)...',
      importModeLabel: '匯入模式：',
      mergeMode: '智慧合併 (保留現有進度)',
      overwritePack: '覆蓋此卡包原有卡牌',
      confirmImport: '確認匯入至我的圖鑑',
      confirmBatchImport: '確認合併匯入全部 {count} 張截圖 ({owned} 張已收錄)',
      backupTitle: '備份現有卡牌資料',
      backupDesc: '匯出全量 JSON 格式收藏資料至本機檔案或剪貼簿',
      copyJson: '複製 JSON',
      copied: '已複製',
      downloadJsonFile: '下載檔案 (.json)',
      restoreTitle: '從 JSON 資料還原',
      restoreDesc: '貼上之前備份的 JSON 文字資料以還原圖鑑',
      pasteJsonPlaceholder: '在此處貼上 JSON 資料物件...',
      confirmRestore: '確認還原',
      downloadHd: '下載高清原圖',
      escClose: '按 ESC 或點擊背景關閉全螢幕預覽',
      toastSnapAligned: '🎯 已以點擊卡牌中心為基準精準對齊網格！',
      toastImportSuccess: '🎉 成功匯入！已同步 {count} 張卡牌至圖鑑',
      toastBatchScan: '⚡ 已極速並發辨識 {files} 張截圖！共辨識出 {cards} 張卡牌（{owned} 張已收錄）',
      toastSingleScan: '⚡ 已極速辨識！共辨識出 {cards} 張卡牌（{owned} 張已收錄）',
      toastJsonRestored: 'JSON 資料備份已成功還原！',
      errInvalidJson: '請輸入或貼上合法的 JSON 資料',
    },
    en: {
      title: 'Smart Screenshot Scanner',
      subtitle: 'Upload game screenshots to automatically detect packs, cards, and ownership',
      tabScanner: 'Screenshot Scanner (Auto-Detect)',
      tabJson: 'JSON Backup & Restore',
      dbFeatureStatus: 'Offline Card Feature DB (3,545 Cards)',
      speedBadge: 'Sub-second Recognition · Zero Manual Typing',
      packsSupport: 'Supports A1 ~ B4a Full Series 3-Column Dex Screenshots',
      bannerTitle: 'Upload In-Game Dex Screenshots to Auto-Import',
      bannerDesc: 'Supports multi-image batch upload or direct clipboard paste (Ctrl+V). Automatically identifies packs, card numbers, rarities, and silhouettes!',
      dropTitle: 'Click or Drag & Drop 3-Column Dex Screenshots Here',
      dropDesc: 'Supports single or batch uploads; you can also press Ctrl+V / Cmd+V to paste from clipboard',
      analyzing: 'Analyzing screenshot grid and card positions...',
      detectedPack: 'Detected Pack',
      confidence: 'Confidence',
      batchQueue: 'Batch Screenshot Queue',
      totalCardsIdentified: '{count} Cards Identified',
      clickInspectHint: 'Click tabs below to verify each screenshot; all merge together on import',
      cacheHit: 'Feature Cache Hit',
      tokens: 'Tokens',
      hideGrid: 'Hide Grid',
      showGrid: 'Show Grid',
      previewSize: 'Preview Size:',
      standardZoom: 'Standard (260px)',
      largeZoom: 'Expanded (560px)',
      actualZoom: '1:1 Original',
      fullscreen: 'Fullscreen',
      downloadAlign: 'Download Overlay',
      clarityGuide: 'Clarity Guide',
      clarityTitle: 'How to get crystal-clear scans?',
      clarityTip1: 'Best way (Recommended): Send original screenshots straight from your gallery (1080x2400 uncompressed).',
      clarityTip2: 'Calibration: Click [Download Overlay] to save the inspection frame image and see pixel accuracy.',
      clarityTip3: 'Web View: Click [Expanded (560px)] or [1:1 Original] to zoom in smoothly.',
      crosshairSnap: '🎯 Click Any Card to Auto-Align Grid',
      waitingClick: 'Waiting for card click...',
      crosshairHint: 'Click the center of any card in the screenshot to instantly snap the grid!',
      standard3Col: 'Standard 3-Column Mode',
      resetAll: 'Reset All',
      verticalY: 'Vertical Y:',
      horizontalX: 'Horizontal X:',
      zoom: 'Zoom:',
      rowGap: 'Row Gap:',
      packLabel: 'Pack:',
      startNumLabel: 'Start #:',
      engine: 'Engine:',
      twoStep: '🔮 Two-Step Match (Recommended)',
      visualHash: '⚡ Feature Hashing',
      sequential: '📋 Sequential Index',
      cloudAi: '🤖 Cloud AI Vision',
      tolerance: 'Tolerance:',
      tolStrict: 'Strict (85%+ Match)',
      tolBalanced: 'Balanced (70%+ Match)',
      tolRelaxed: 'Relaxed (55%+ Match)',
      allCards: 'All',
      owned: 'Owned',
      missing: 'Missing',
      duplicates: 'Duplicates',
      selectAllOwned: 'Select All Owned',
      resetMissing: 'Reset Missing',
      cropLabel: 'Crop',
      matchLabel: 'Match',
      hasOwned: 'Owned',
      notOwned: 'Missing',
      collapse: 'Collapse',
      calibrateCard: 'Calibrate',
      setOwned: 'Mark Owned',
      replaceCardPlaceholder: 'Search card to correct: Name or # (e.g. Charizard / 004)...',
      importModeLabel: 'Import Mode:',
      mergeMode: 'Smart Merge (Keep existing cards)',
      overwritePack: 'Overwrite detected expansion pack',
      confirmImport: 'Import Cards to Collection',
      confirmBatchImport: 'Merge and Import All {count} Screenshots ({owned} Owned)',
      backupTitle: 'Backup Card Collection Data',
      backupDesc: 'Export full JSON collection data to file or clipboard',
      copyJson: 'Copy JSON',
      copied: 'Copied',
      downloadJsonFile: 'Download (.json)',
      restoreTitle: 'Restore from JSON Backup',
      restoreDesc: 'Paste previously exported JSON data to restore your collection',
      pasteJsonPlaceholder: 'Paste JSON data here...',
      confirmRestore: 'Confirm Restore',
      downloadHd: 'Download HD Image',
      escClose: 'Press ESC or click background to close',
      toastSnapAligned: '🎯 Grid aligned to clicked card center!',
      toastImportSuccess: '🎉 Successfully imported {count} cards into your collection!',
      toastBatchScan: '⚡ Processed {files} screenshots! Found {cards} cards ({owned} owned)',
      toastSingleScan: '⚡ Scan complete! Found {cards} cards ({owned} owned)',
      toastJsonRestored: 'JSON collection data restored successfully!',
      errInvalidJson: 'Please enter valid JSON data',
    },
    ja: {
      title: 'スクリーンショット自動認識インポート',
      subtitle: 'ゲーム内の図鑑スクショから、パック・カード・所持数を自動判定',
      tabScanner: 'スクショ自動インポート',
      tabJson: 'JSON バックアップ・復元',
      dbFeatureStatus: 'オフライン図鑑特徴DB (3,545枚)',
      speedBadge: '超高速ミリ秒認識 · 手動入力不要',
      packsSupport: 'A1〜B4a 全シリーズ3列図鑑スクショ対応',
      bannerTitle: 'ゲーム図鑑スクショをアップロードして自動インポート',
      bannerDesc: '複数枚の同時アップロードやクリップボード貼り付け(Ctrl+V)に対応。パック、番号、レアリティ、未所持シルエットを自動判定！',
      dropTitle: '3列図鑑スクショをドラッグ＆ドロップまたはクリックで選択',
      dropDesc: '複数枚の一括認識に対応。Ctrl+V (Cmd+V) で直接貼り付けも可能',
      analyzing: 'カードグリッドとパックを自動解析中...',
      detectedPack: '認識パック',
      confidence: '判定信頼度',
      batchQueue: '一括スクショキュー',
      totalCardsIdentified: '計 {count} 枚のカードを認識',
      clickInspectHint: '各スクショをクリックして確認できます。インポート時にすべて統合されます',
      cacheHit: 'キャッシュ命中',
      tokens: '消費',
      hideGrid: 'グリッド非表示',
      showGrid: 'グリッド表示',
      previewSize: '表示サイズ:',
      standardZoom: '標準 (260px)',
      largeZoom: '拡大 (560px)',
      actualZoom: '1:1 原寸高画質',
      fullscreen: '全画面表示',
      downloadAlign: '位置確認図ダウンロード',
      clarityGuide: '鮮明撮影ガイド',
      clarityTitle: 'きれいに認識させるコツ',
      clarityTip1: 'おすすめ：スマホのアルバムから原寸スクショを直接選択してください（無圧縮1080x2400）。',
      clarityTip2: '位置確認：上の【位置確認図ダウンロード】で検出枠付きの画像を確認できます。',
      clarityTip3: '画面拡大：【拡大 (560px)】または【1:1 原寸】で細部まで確認できます。',
      crosshairSnap: '🎯 任意のカードをクリックして自動吸着整列',
      waitingClick: 'カードをクリック待機中...',
      crosshairHint: 'スクショ内の任意のカード中心をクリックするとグリッドが自動吸着します！',
      standard3Col: '標準3列図鑑モード',
      resetAll: 'すべてリセット',
      verticalY: '垂直 Y:',
      horizontalX: '水平 X:',
      zoom: '拡大縮小:',
      rowGap: '行間隔:',
      packLabel: 'パック:',
      startNumLabel: '開始番号:',
      engine: '認識エンジン:',
      twoStep: '🔮 2段階高精度認識 (推奨)',
      visualHash: '⚡ 特徴量ハッシュ照合',
      sequential: '📋 図鑑番号連続照合',
      cloudAi: '🤖 クラウド AI 視覚',
      tolerance: '許容度:',
      tolStrict: '厳格 (85%+ 一致)',
      tolBalanced: '標準 (70%+ 一致)',
      tolRelaxed: '広め (55%+ 一致)',
      allCards: 'すべて',
      owned: '所持済',
      missing: '未所持',
      duplicates: '重複カード',
      selectAllOwned: 'すべて所持済みにする',
      resetMissing: 'すべて未所持にする',
      cropLabel: 'スクショ',
      matchLabel: '照合',
      hasOwned: '所持中',
      notOwned: '未所持',
      collapse: '閉じる',
      calibrateCard: 'カード補正',
      setOwned: '所持にする',
      replaceCardPlaceholder: 'カード名または番号で検索補正 (例: リザードン / 004)...',
      importModeLabel: 'インポート方式：',
      mergeMode: 'スマート統合 (既存カードを保持)',
      overwritePack: '対象パックを上書き',
      confirmImport: '図鑑にコレクション反映',
      confirmBatchImport: 'スクショ {count} 枚分をすべて統合インポート ({owned}枚所持)',
      backupTitle: 'カードコレクションのバックアップ',
      backupDesc: '全カードデータをJSON形式でファイルまたはクリップボードに出力',
      copyJson: 'JSON をコピー',
      copied: 'コピー済',
      downloadJsonFile: 'ファイルを保存 (.json)',
      restoreTitle: 'JSON データから復元',
      restoreDesc: 'バックアップしたJSONテキストを貼り付けて復元',
      pasteJsonPlaceholder: 'JSON データをここに貼り付けてください...',
      confirmRestore: '復元を実行',
      downloadHd: '高画質画像をダウンロード',
      escClose: 'ESCキーまたは背景クリックで閉じる',
      toastSnapAligned: '🎯 クリックしたカードを中心に合わせてグリッドを吸着しました！',
      toastImportSuccess: '🎉 {count} 枚のカードデータを図鑑に反映しました！',
      toastBatchScan: '⚡ {files} 枚のスクショを一括認識！計 {cards} 枚（所持 {owned} 枚）',
      toastSingleScan: '⚡ 認識完了！計 {cards} 枚（所持 {owned} 枚）',
      toastJsonRestored: 'JSON バックアップから復元しました！',
      errInvalidJson: '有効な JSON データを入力してください',
    },
    ko: {
      title: '스마트 스크린샷 인식 도감 가져오기',
      subtitle: '게임 내 도감 캡처본으로 팩, 카드 및 보유 상태를 자동 판별',
      tabScanner: '스크린샷 자동 인식',
      tabJson: 'JSON 백업 및 복원',
      dbFeatureStatus: '오프라인 도감 특징 DB (3,545장)',
      speedBadge: '초고속 인식 · 수동 입력 불필요',
      packsSupport: 'A1 ~ B4a 전 시리즈 3열 도감 스크린샷 지원',
      bannerTitle: '게임 도감 스크린샷 업로드로 자동 가져오기',
      bannerDesc: '여러 장 동시 업로드 및 Ctrl+V 클립보드 붙여넣기를 지원합니다. 팩, 번호, 레어도 및 미보유 실루엣을 자동 판별!',
      dropTitle: '3열 도감 스크린샷을 드래그하거나 클릭하여 선택',
      dropDesc: '단일 또는 다중 스크린샷 일괄 인식 지원. Ctrl+V로 붙여넣기도 가능',
      analyzing: '카드 그리드와 팩 정보를 분석하는 중...',
      detectedPack: '인식된 팩',
      confidence: '신뢰도',
      batchQueue: '스크린샷 대기열',
      totalCardsIdentified: '총 {count}장 카드 인식',
      clickInspectHint: '아래 탭을 눌러 각 스크린샷을 확인하세요. 가져오기 시 모두 병합됩니다',
      cacheHit: '캐시 적중',
      tokens: '소모',
      hideGrid: '그리드 숨기기',
      showGrid: '그리드 표시',
      previewSize: '미리보기 크기:',
      standardZoom: '표준 (260px)',
      largeZoom: '확대 (560px)',
      actualZoom: '1:1 원본 고화질',
      fullscreen: '전체 화면',
      downloadAlign: '정렬 이미지 다운로드',
      clarityGuide: '선명도 가이드',
      clarityTitle: '스크린샷을 선명하게 찍는 방법',
      clarityTip1: '추천 방법: 갤러리 원본 스크린샷을 바로 선택하세요 (1080x2400 무손실).',
      clarityTip2: '정렬 확인: 위의 [정렬 이미지 다운로드]로 감지 박스가 표시된 원본을 확인할 수 있습니다.',
      clarityTip3: '화면 확대: [확대 (560px)] 또는 [1:1 원본]으로 세부 사항을 크게 확인하세요.',
      crosshairSnap: '🎯 카드 클릭 시 그리드 자동 스냅 정렬',
      waitingClick: '카드 클릭 대기 중...',
      crosshairHint: '스크린샷 속 임의의 카드 중심을 클릭하면 그리드가 즉시 정렬됩니다!',
      standard3Col: '표준 3열 도감 모드',
      resetAll: '전체 초기화',
      verticalY: '수직 Y:',
      horizontalX: '수평 X:',
      zoom: '확대/축소:',
      rowGap: '행 간격:',
      packLabel: '팩:',
      startNumLabel: '시작 번호:',
      engine: '인식 엔진:',
      twoStep: '🔮 2단계 정밀 인식 (권장)',
      visualHash: '⚡ 로컬 특징 매칭',
      sequential: '📋 번호 순차 매칭',
      cloudAi: '🤖 클라우드 AI 비전',
      tolerance: '허용 오차:',
      tolStrict: '엄격 (85%+ 일치)',
      tolBalanced: '균형 (70%+ 일치)',
      tolRelaxed: '여유 (55%+ 일치)',
      allCards: '전체',
      owned: '보유함',
      missing: '미보유',
      duplicates: '중복 카드',
      selectAllOwned: '모두 보유 처리',
      resetMissing: '모두 미보유 처리',
      cropLabel: '캡처',
      matchLabel: '매칭',
      hasOwned: '보유 중',
      notOwned: '미보유',
      collapse: '접기',
      calibrateCard: '카드 보정',
      setOwned: '보유로 변경',
      replaceCardPlaceholder: '수정할 카드 검색: 이름 또는 번호 (예: 리자몽 / 004)...',
      importModeLabel: '가져오기 방식:',
      mergeMode: '스마트 병합 (기존 카드 유지)',
      overwritePack: '해당 팩 덮어쓰기',
      confirmImport: '내 도감에 카드 가져오기',
      confirmBatchImport: '스크린샷 {count}장 전체 병합 가져오기 ({owned}장 보유)',
      backupTitle: '카드 데이터 백업',
      backupDesc: '전체 JSON 카드 컬렉션을 파일이나 클립보드로 내보내기',
      copyJson: 'JSON 복사',
      copied: '복사됨',
      downloadJsonFile: '파일 다운로드 (.json)',
      restoreTitle: 'JSON 데이터에서 복원',
      restoreDesc: '백업해 둔 JSON 텍스트를 붙여넣어 도감 복원',
      pasteJsonPlaceholder: '여기에 JSON 데이터를 붙여넣으세요...',
      confirmRestore: '복원 확인',
      downloadHd: '고화질 원본 다운로드',
      escClose: 'ESC 키 또는 배경을 클릭하여 닫기',
      toastSnapAligned: '🎯 클릭한 카드를 기준으로 그리드가 정렬되었습니다!',
      toastImportSuccess: '🎉 {count}장의 카드를 도감에 성공적으로 가져왔습니다!',
      toastBatchScan: '⚡ 스크린샷 {files}장 인식 완료! 총 {cards}장 (보유 {owned}장)',
      toastSingleScan: '⚡ 인식 완료! 총 {cards}장 (보유 {owned}장)',
      toastJsonRestored: 'JSON 백업 데이터가 성공적으로 복원되었습니다!',
      errInvalidJson: '올바른 JSON 데이터를 입력해주세요',
    },
    fr: {
      title: 'Scanner Intelligent de Captures',
      subtitle: 'Analysez vos captures du Pokédex pour détecter packs, cartes et statuts',
      tabScanner: 'Scanner de Captures (Auto)',
      tabJson: 'Sauvegarde & Restauration JSON',
      dbFeatureStatus: 'Base d’empreintes hors-ligne (3 545 Cartes)',
      speedBadge: 'Reconnaissance Ultra-rapide · Zéro Saisie',
      packsSupport: 'Supporte les captures 3 colonnes A1 ~ B4a',
      bannerTitle: 'Importez vos captures du jeu automatiquement',
      bannerDesc: 'Téléversez plusieurs captures ou collez directement depuis le presse-papiers (Ctrl+V). Détection automatique des packs et doublons !',
      dropTitle: 'Glissez-déposez vos captures à 3 colonnes ici',
      dropDesc: 'Prise en charge par lot ou collage direct avec Ctrl+V / Cmd+V',
      analyzing: 'Analyse de la grille et des cartes...',
      detectedPack: 'Extension Détectée',
      confidence: 'Fiabilité',
      batchQueue: 'File d’attente des captures',
      totalCardsIdentified: '{count} cartes identifiées',
      clickInspectHint: 'Cliquez ci-dessous pour vérifier chaque capture avant l’import groupé',
      cacheHit: 'Cache d’empreintes',
      tokens: 'Jetons',
      hideGrid: 'Masquer Grille',
      showGrid: 'Afficher Grille',
      previewSize: 'Taille d’aperçu :',
      standardZoom: 'Standard (260px)',
      largeZoom: 'Agrandie (560px)',
      actualZoom: '1:1 Original',
      fullscreen: 'Plein Écran',
      downloadAlign: 'Télécharger Grille',
      clarityGuide: 'Guide de netteté',
      clarityTitle: 'Comment obtenir des scans parfaits ?',
      clarityTip1: 'Recommandé : Utilisez les captures originales de votre smartphone (1080x2400 sans compression).',
      clarityTip2: 'Alignement : Cliquez sur [Télécharger Grille] pour visualiser les contours de détection.',
      clarityTip3: 'Zoom Web : Sélectionnez [Agrandie] ou [1:1 Original] pour inspecter les détails.',
      crosshairSnap: '🎯 Cliquez sur une carte pour auto-aligner',
      waitingClick: 'En attente d’un clic...',
      crosshairHint: 'Cliquez sur le centre d’une carte pour caler instantanément la grille !',
      standard3Col: 'Mode Standard 3 Colonnes',
      resetAll: 'Réinitialiser Tout',
      verticalY: 'Vertical Y :',
      horizontalX: 'Horizontal X :',
      zoom: 'Zoom :',
      rowGap: 'Espacement :',
      packLabel: 'Pack :',
      startNumLabel: 'N° Départ :',
      engine: 'Moteur :',
      twoStep: '🔮 Double Étape (Recommandé)',
      visualHash: '⚡ Empreinte Visuelle',
      sequential: '📋 Index Séquentiel',
      cloudAi: '🤖 Vision IA Cloud',
      tolerance: 'Tolérance :',
      tolStrict: 'Stricte (85%+)',
      tolBalanced: 'Équilibrée (70%+)',
      tolRelaxed: 'Souple (55%+)',
      allCards: 'Toutes',
      owned: 'Possédées',
      missing: 'Manquantes',
      duplicates: 'Doublons',
      selectAllOwned: 'Tout Sélectionner',
      resetMissing: 'Réinitialiser Manquantes',
      cropLabel: 'Capture',
      matchLabel: 'Trouvée',
      hasOwned: 'Possédée',
      notOwned: 'Non possédée',
      collapse: 'Replier',
      calibrateCard: 'Corriger',
      setOwned: 'Marquer Possédée',
      replaceCardPlaceholder: 'Corriger : Nom ou N° (ex. : Dracaufeu / 004)...',
      importModeLabel: 'Mode d’Importation :',
      mergeMode: 'Fusion Intelligente (Conserver existant)',
      overwritePack: 'Remplacer l’extension détectée',
      confirmImport: 'Importer dans ma Collection',
      confirmBatchImport: 'Fusionner et Importer {count} Captures ({owned} possédées)',
      backupTitle: 'Sauvegarde des Données',
      backupDesc: 'Exporter les données complètes au format JSON',
      copyJson: 'Copier JSON',
      copied: 'Copié',
      downloadJsonFile: 'Télécharger (.json)',
      restoreTitle: 'Restaurer depuis JSON',
      restoreDesc: 'Collez vos données JSON pour restaurer votre collection',
      pasteJsonPlaceholder: 'Collez le code JSON ici...',
      confirmRestore: 'Confirmer la Restauration',
      downloadHd: 'Télécharger l’image HD',
      escClose: 'Appuyez sur Échap ou cliquez pour fermer',
      toastSnapAligned: '🎯 Grille alignée sur la carte sélectionnée !',
      toastImportSuccess: '🎉 {count} cartes importées avec succès !',
      toastBatchScan: '⚡ {files} captures traitées ! {cards} cartes trouvées ({owned} possédées)',
      toastSingleScan: '⚡ Scan terminé ! {cards} cartes trouvées ({owned} possédées)',
      toastJsonRestored: 'Collection JSON restaurée avec succès !',
      errInvalidJson: 'Veuillez saisir un JSON valide',
    },
    de: {
      title: 'Intelligenter Screenshot-Scanner',
      subtitle: 'Analysieren Sie Dex-Screenshots zur automatischen Kartenerkennung',
      tabScanner: 'Screenshot-Scanner (Auto)',
      tabJson: 'JSON Backup & Wiederherstellung',
      dbFeatureStatus: 'Offline-Merkmalsdatenbank (3.545 Karten)',
      speedBadge: 'Blitzschnelle Erkennung · Keine manuelle Eingabe',
      packsSupport: 'Unterstützt A1 ~ B4a 3-Spalten-Screenshots',
      bannerTitle: 'Screenshots hochladen und automatisch importieren',
      bannerDesc: 'Laden Sie mehrere Screenshots hoch oder fügen Sie Bilder direkt aus der Zwischenablage ein (Strg+V). Erkennt Packs und Karten automatisch!',
      dropTitle: '3-Spalten-Screenshots hierher ziehen oder klicken',
      dropDesc: 'Unterstützt Einzel- oder Stapel-Uploads sowie Strg+V zum Einfügen',
      analyzing: 'Raster und Karten werden analysiert...',
      detectedPack: 'Erkanntes Pack',
      confidence: 'Sicherheit',
      batchQueue: 'Screenshot-Warteschlange',
      totalCardsIdentified: '{count} Karten erkannt',
      clickInspectHint: 'Klicken Sie unten, um Screenshots vor dem Gesamtimport zu prüfen',
      cacheHit: 'Cache-Treffer',
      tokens: 'Tokens',
      hideGrid: 'Raster verbergen',
      showGrid: 'Raster anzeigen',
      previewSize: 'Vorschaugröße:',
      standardZoom: 'Standard (260px)',
      largeZoom: 'Vergrößert (560px)',
      actualZoom: '1:1 Original',
      fullscreen: 'Vollbild',
      downloadAlign: 'Rasterbild herunterladen',
      clarityGuide: 'Klarheits-Leitfaden',
      clarityTitle: 'Wie gelingen die schärfsten Scans?',
      clarityTip1: 'Empfohlen: Verwenden Sie unkomprimierte Original-Screenshots (1080x2400).',
      clarityTip2: 'Ausrichtung: Klicken Sie auf [Rasterbild herunterladen] für Prüfrahmen.',
      clarityTip3: 'Web-Zoom: Wählen Sie [Vergrößert] oder [1:1 Original] für Detailansichten.',
      crosshairSnap: '🎯 Auf beliebige Karte klicken zum Einrasten',
      waitingClick: 'Warte auf Klick...',
      crosshairHint: 'Klicken Sie auf eine Kartenmitte im Screenshot, um das Raster auszurichten!',
      standard3Col: 'Standard 3-Spalten-Modus',
      resetAll: 'Alles zurücksetzen',
      verticalY: 'Vertikal Y:',
      horizontalX: 'Horizontal X:',
      zoom: 'Zoom:',
      rowGap: 'Zeilenabstand:',
      packLabel: 'Pack:',
      startNumLabel: 'Startnr.:',
      engine: 'Engine:',
      twoStep: '🔮 2-Schritt-Präzision (Empfohlen)',
      visualHash: '⚡ Bildmerkmals-Hash',
      sequential: '📋 Sequenz-Index',
      cloudAi: '🤖 Cloud KI Vision',
      tolerance: 'Toleranz:',
      tolStrict: 'Strikt (85%+)',
      tolBalanced: 'Ausgewogen (70%+)',
      tolRelaxed: 'Tolerant (55%+)',
      allCards: 'Alle',
      owned: 'Im Besitz',
      missing: 'Fehlend',
      duplicates: 'Doppelte',
      selectAllOwned: 'Alle als Besessen',
      resetMissing: 'Fehlende zurücksetzen',
      cropLabel: 'Ausschnitt',
      matchLabel: 'Gefunden',
      hasOwned: 'Besessen',
      notOwned: 'Fehlt',
      collapse: 'Einklappen',
      calibrateCard: 'Korrigieren',
      setOwned: 'Als Besessen markieren',
      replaceCardPlaceholder: 'Karte korrigieren: Name oder Nr. (z.B. Glurak / 004)...',
      importModeLabel: 'Import-Modus:',
      mergeMode: 'Intelligente Zusammenführung (Bestehendes behalten)',
      overwritePack: 'Erkanntes Pack überschreiben',
      confirmImport: 'In Sammlung importieren',
      confirmBatchImport: 'Alle {count} Screenshots importieren ({owned} besessen)',
      backupTitle: 'Sammlungsdaten sichern',
      backupDesc: 'Vollständige Sammlung als JSON exportieren',
      copyJson: 'JSON kopieren',
      copied: 'Kopiert',
      downloadJsonFile: 'Datei herunterladen (.json)',
      restoreTitle: 'Aus JSON wiederherstellen',
      restoreDesc: 'Fügen Sie exportierte JSON-Daten ein',
      pasteJsonPlaceholder: 'JSON-Daten hier einfügen...',
      confirmRestore: 'Wiederherstellung bestätigen',
      downloadHd: 'HD-Bild herunterladen',
      escClose: 'ESC oder Hintergrund klicken zum Schließen',
      toastSnapAligned: '🎯 Raster an Kartenmitte ausgerichtet!',
      toastImportSuccess: '🎉 {count} Karten erfolgreich importiert!',
      toastBatchScan: '⚡ {files} Screenshots verarbeitet! {cards} Karten gefunden ({owned} besessen)',
      toastSingleScan: '⚡ Scan fertig! {cards} Karten gefunden ({owned} besessen)',
      toastJsonRestored: 'JSON-Sammlung erfolgreich wiederhergestellt!',
      errInvalidJson: 'Bitte gültige JSON-Daten eingeben',
    },
    es: {
      title: 'Escáner Inteligente de Capturas',
      subtitle: 'Analiza capturas de tu Pokédex para detectar sobres, cartas y propiedad',
      tabScanner: 'Escáner de Capturas (Auto)',
      tabJson: 'Copia de Seguridad y Restauración JSON',
      dbFeatureStatus: 'Base de rasgos sin conexión (3.545 Cartas)',
      speedBadge: 'Reconocimiento Ultrarrápido · Sin Escritura Manual',
      packsSupport: 'Compatible con capturas de 3 columnas A1 ~ B4a',
      bannerTitle: 'Sube capturas del juego para importar automáticamente',
      bannerDesc: 'Sube varias capturas o pega directamente desde el portapapeles (Ctrl+V). ¡Detecta sobres y cartas automáticamente!',
      dropTitle: 'Arrastra aquí tus capturas de 3 columnas o haz clic',
      dropDesc: 'Soporta capturas individuales o en lote, o presiona Ctrl+V para pegar',
      analyzing: 'Analizando cuadrícula y cartas...',
      detectedPack: 'Sobre Detectado',
      confidence: 'Precisión',
      batchQueue: 'Cola de Capturas',
      totalCardsIdentified: '{count} Cartas Identificadas',
      clickInspectHint: 'Haz clic abajo para verificar cada captura antes de importar todo',
      cacheHit: 'Caché de Rasgos',
      tokens: 'Tokens',
      hideGrid: 'Ocultar Cuadrícula',
      showGrid: 'Ver Cuadrícula',
      previewSize: 'Tamaño de vista previa:',
      standardZoom: 'Estándar (260px)',
      largeZoom: 'Ampliada (560px)',
      actualZoom: '1:1 Original',
      fullscreen: 'Pantalla Completa',
      downloadAlign: 'Descargar Cuadrícula',
      clarityGuide: 'Guía de Nitidez',
      clarityTitle: '¿Cómo lograr capturas más nítidas?',
      clarityTip1: 'Recomendado: Envía las capturas originales desde tu galería (1080x2400 sin comprimir).',
      clarityTip2: 'Calibración: Haz clic en [Descargar Cuadrícula] para ver los recuadros de alineación.',
      clarityTip3: 'Zoom Web: Selecciona [Ampliada] o [1:1 Original] para ver los detalles con claridad.',
      crosshairSnap: '🎯 Clic en cualquier carta para auto-alinear',
      waitingClick: 'Esperando clic...',
      crosshairHint: '¡Haz clic en el centro de cualquier carta para ajustar la cuadrícula al instante!',
      standard3Col: 'Modo Estándar de 3 Columnas',
      resetAll: 'Restablecer Todo',
      verticalY: 'Vertical Y:',
      horizontalX: 'Horizontal X:',
      zoom: 'Zoom:',
      rowGap: 'Espaciado:',
      packLabel: 'Sobre:',
      startNumLabel: 'N° Inicial:',
      engine: 'Motor:',
      twoStep: '🔮 Doble Paso Preciso (Recomendado)',
      visualHash: '⚡ Huella Visual Local',
      sequential: '📋 Índice Secuencial',
      cloudAi: '🤖 Visión IA en la Nube',
      tolerance: 'Tolerancia:',
      tolStrict: 'Estricta (85%+)',
      tolBalanced: 'Equilibrada (70%+)',
      tolRelaxed: 'Flexible (55%+)',
      allCards: 'Todas',
      owned: 'En Posesión',
      missing: 'Faltantes',
      duplicates: 'Repetidas',
      selectAllOwned: 'Marcar Todas como Poseídas',
      resetMissing: 'Restablecer Faltantes',
      cropLabel: 'Captura',
      matchLabel: 'Emparejada',
      hasOwned: 'Poseída',
      notOwned: 'Falta',
      collapse: 'Plegar',
      calibrateCard: 'Calibrar',
      setOwned: 'Marcar Poseída',
      replaceCardPlaceholder: 'Corregir carta: Nombre o N° (ej. Charizard / 004)...',
      importModeLabel: 'Modo de Importación:',
      mergeMode: 'Fusión Inteligente (Conservar existentes)',
      overwritePack: 'Sobrescribir sobre detectado',
      confirmImport: 'Importar Cartas a mi Colección',
      confirmBatchImport: 'Fusionar e Importar {count} Capturas ({owned} en posesión)',
      backupTitle: 'Copia de Seguridad de la Colección',
      backupDesc: 'Exporta toda la colección en formato JSON',
      copyJson: 'Copiar JSON',
      copied: 'Copiado',
      downloadJsonFile: 'Descargar archivo (.json)',
      restoreTitle: 'Restaurar desde JSON',
      restoreDesc: 'Pega tus datos JSON para restaurar tu colección',
      pasteJsonPlaceholder: 'Pega los datos JSON aquí...',
      confirmRestore: 'Confirmar Restauración',
      downloadHd: 'Descargar Imagen HD',
      escClose: 'Presiona ESC o haz clic para cerrar',
      toastSnapAligned: '🎯 ¡Cuadrícula alineada al centro de la carta!',
      toastImportSuccess: '🎉 ¡Se importaron {count} cartas con éxito!',
      toastBatchScan: '⚡ ¡{files} capturas analizadas! {cards} cartas encontradas ({owned} en posesión)',
      toastSingleScan: '⚡ ¡Escaneo listo! {cards} cartas encontradas ({owned} en posesión)',
      toastJsonRestored: '¡Colección JSON restaurada con éxito!',
      errInvalidJson: 'Por favor, introduce un JSON válido',
    },
    it: {
      title: 'Scanner Intelligente Screenshot',
      subtitle: 'Carica screenshot del Pokédex per rilevare automaticamente carte e possesso',
      tabScanner: 'Scanner Screenshot (Auto)',
      tabJson: 'Backup & Ripristino JSON',
      dbFeatureStatus: 'Database impronte offline (3.545 Carte)',
      speedBadge: 'Riconoscimento Istantaneo · Nessun Inserimento Manuale',
      packsSupport: 'Supporta screenshot a 3 colonne serie A1 ~ B4a',
      bannerTitle: 'Carica screenshot di gioco per importazione automatica',
      bannerDesc: 'Carica più immagini o incolla direttamente dalla clipboard (Ctrl+V). Riconosce automaticamente bustine e carte possedute!',
      dropTitle: 'Trascina qui gli screenshot a 3 colonne o fai clic',
      dropDesc: 'Supporta caricamenti singoli o multipli, oppure premi Ctrl+V per incollare',
      analyzing: 'Analisi della griglia e delle carte in corso...',
      detectedPack: 'Bustina Rilevata',
      confidence: 'Affidabilità',
      batchQueue: 'Coda Screenshot',
      totalCardsIdentified: '{count} Carte Identificate',
      clickInspectHint: 'Fai clic sotto per verificare ogni screenshot prima dell’importazione combinata',
      cacheHit: 'Cache Impronte',
      tokens: 'Token',
      hideGrid: 'Nascondi Griglia',
      showGrid: 'Mostra Griglia',
      previewSize: 'Dimensione anteprima:',
      standardZoom: 'Standard (260px)',
      largeZoom: 'Ingrandita (560px)',
      actualZoom: '1:1 Originale',
      fullscreen: 'Schermo Intero',
      downloadAlign: 'Scarica Allineamento',
      clarityGuide: 'Guida alla Nitidezza',
      clarityTitle: 'Come ottenere scansioni perfette?',
      clarityTip1: 'Consigliato: Usa screenshot originali dalla galleria (1080x2400 senza compressione).',
      clarityTip2: 'Allineamento: Clicca su [Scarica Allineamento] per vedere i riquadri di rilevamento.',
      clarityTip3: 'Zoom Web: Seleziona [Ingrandita] o [1:1 Originale] per esaminare ogni dettaglio.',
      crosshairSnap: '🎯 Clicca su qualsiasi carta per auto-allineare',
      waitingClick: 'In attesa del clic...',
      crosshairHint: 'Clicca al centro di una carta nello screenshot per centrare la griglia istantaneamente!',
      standard3Col: 'Modalità Standard 3 Colonne',
      resetAll: 'Ripristina Tutto',
      verticalY: 'Verticale Y:',
      horizontalX: 'Orizzontale X:',
      zoom: 'Zoom:',
      rowGap: 'Spaziatura:',
      packLabel: 'Bustina:',
      startNumLabel: 'N° Iniziale:',
      engine: 'Motore:',
      twoStep: '🔮 Doppio Passaggio (Consigliato)',
      visualHash: '⚡ Impronta Visiva Locale',
      sequential: '📋 Indice Sequenziale',
      cloudAi: '🤖 Visione AI Cloud',
      tolerance: 'Tolleranza:',
      tolStrict: 'Rigorosa (85%+)',
      tolBalanced: 'Bilanciata (70%+)',
      tolRelaxed: 'Ampia (55%+)',
      allCards: 'Tutte',
      owned: 'Possedute',
      missing: 'Mancanti',
      duplicates: 'Doppie',
      selectAllOwned: 'Seleziona Tutte Possedute',
      resetMissing: 'Azzera Mancanti',
      cropLabel: 'Ritaglio',
      matchLabel: 'Trovata',
      hasOwned: 'Posseduta',
      notOwned: 'Mancante',
      collapse: 'Comprimi',
      calibrateCard: 'Correggi',
      setOwned: 'Segna Posseduta',
      replaceCardPlaceholder: 'Correggi carta: Nome o N° (es. Charizard / 004)...',
      importModeLabel: 'Modalità di Importazione:',
      mergeMode: 'Unione Intelligente (Conserva esistenti)',
      overwritePack: 'Sovrascrivi bustina rilevata',
      confirmImport: 'Importa Carte nella Collezione',
      confirmBatchImport: 'Unisci e Importa {count} Screenshot ({owned} possedute)',
      backupTitle: 'Backup Dati Collezione',
      backupDesc: 'Esporta l’intera collezione in formato JSON',
      copyJson: 'Copia JSON',
      copied: 'Copiato',
      downloadJsonFile: 'Scarica file (.json)',
      restoreTitle: 'Ripristina da JSON',
      restoreDesc: 'Incolla dati JSON precedentemente esportati',
      pasteJsonPlaceholder: 'Incolla i dati JSON qui...',
      confirmRestore: 'Conferma Ripristino',
      downloadHd: 'Scarica Immagine HD',
      escClose: 'Premi ESC o clicca sullo sfondo per chiudere',
      toastSnapAligned: '🎯 Griglia allineata al centro della carta selezionata!',
      toastImportSuccess: '🎉 {count} carte importate con successo!',
      toastBatchScan: '⚡ Elaborati {files} screenshot! {cards} carte trovate ({owned} possedute)',
      toastSingleScan: '⚡ Scansione completata! {cards} carte trovate ({owned} possedute)',
      toastJsonRestored: 'Collezione JSON ripristinata con successo!',
      errInvalidJson: 'Inserisci un JSON valido',
    },
    pt: {
      title: 'Scanner Inteligente de Capturas',
      subtitle: 'Analise capturas da sua Pokédex para detectar pacotes, cartas e posse',
      tabScanner: 'Scanner de Capturas (Auto)',
      tabJson: 'Backup e Restauração JSON',
      dbFeatureStatus: 'Banco offline de características (3.545 Cartas)',
      speedBadge: 'Reconhecimento Ultrarrápido · Sem Digitação Manual',
      packsSupport: 'Suporta capturas de 3 colunas A1 ~ B4a',
      bannerTitle: 'Envie capturas do jogo para importar automaticamente',
      bannerDesc: 'Envie várias capturas ou cole da área de transferência (Ctrl+V). Reconhece automaticamente pacotes e cartas!',
      dropTitle: 'Arraste capturas de 3 colunas para cá ou clique',
      dropDesc: 'Suporta capturas únicas ou em lote, ou pressione Ctrl+V para colar',
      analyzing: 'Analisando grade e cartas...',
      detectedPack: 'Pacote Detectado',
      confidence: 'Confiança',
      batchQueue: 'Fila de Capturas',
      totalCardsIdentified: '{count} Cartas Identificadas',
      clickInspectHint: 'Clique abaixo para conferir cada captura antes de importar tudo junto',
      cacheHit: 'Cache de Características',
      tokens: 'Tokens',
      hideGrid: 'Ocultar Grade',
      showGrid: 'Exibir Grade',
      previewSize: 'Tamanho de visualização:',
      standardZoom: 'Padrão (260px)',
      largeZoom: 'Expandido (560px)',
      actualZoom: '1:1 Original',
      fullscreen: 'Tela Cheia',
      downloadAlign: 'Baixar Alinhamento',
      clarityGuide: 'Guia de Nitidez',
      clarityTitle: 'Como obter capturas mais nítidas?',
      clarityTip1: 'Recomendado: Envie as imagens originais da sua galeria (1080x2400 sem compressão).',
      clarityTip2: 'Alinhamento: Clique em [Baixar Alinhamento] para visualizar as caixas de detecção.',
      clarityTip3: 'Zoom Web: Escolha [Expandido] ou [1:1 Original] para ver os detalhes com clareza.',
      crosshairSnap: '🎯 Clique em qualquer carta para auto-alinhar',
      waitingClick: 'Aguardando clique...',
      crosshairHint: 'Clique no centro de qualquer carta para ajustar a grade na hora!',
      standard3Col: 'Modo Padrão de 3 Colunas',
      resetAll: 'Redefinir Tudo',
      verticalY: 'Vertical Y:',
      horizontalX: 'Horizontal X:',
      zoom: 'Zoom:',
      rowGap: 'Espaçamento:',
      packLabel: 'Pacote:',
      startNumLabel: 'N° Inicial:',
      engine: 'Motor:',
      twoStep: '🔮 Duas Etapas Preciso (Recomendado)',
      visualHash: '⚡ Hash Visual Local',
      sequential: '📋 Índice Sequencial',
      cloudAi: '🤖 Visão IA na Nuvem',
      tolerance: 'Tolerância:',
      tolStrict: 'Rigorosa (85%+)',
      tolBalanced: 'Equilibrada (70%+)',
      tolRelaxed: 'Flexível (55%+)',
      allCards: 'Todas',
      owned: 'Possuídas',
      missing: 'Faltando',
      duplicates: 'Repetidas',
      selectAllOwned: 'Marcar Todas como Possuídas',
      resetMissing: 'Zerar Faltando',
      cropLabel: 'Captura',
      matchLabel: 'Correspondência',
      hasOwned: 'Possuída',
      notOwned: 'Falta',
      collapse: 'Recolher',
      calibrateCard: 'Corrigir',
      setOwned: 'Marcar Possuída',
      replaceCardPlaceholder: 'Corrigir carta: Nome ou N° (ex.: Charizard / 004)...',
      importModeLabel: 'Modo de Importação:',
      mergeMode: 'Fusão Inteligente (Manter existentes)',
      overwritePack: 'Substituir pacote detectado',
      confirmImport: 'Importar Cartas para a Coleção',
      confirmBatchImport: 'Mesclar e Importar {count} Capturas ({owned} possuídas)',
      backupTitle: 'Backup dos Dados da Coleção',
      backupDesc: 'Exportar coleção completa em formato JSON',
      copyJson: 'Copiar JSON',
      copied: 'Copiado',
      downloadJsonFile: 'Baixar arquivo (.json)',
      restoreTitle: 'Restaurar de Dados JSON',
      restoreDesc: 'Cole dados JSON exportados para restaurar sua coleção',
      pasteJsonPlaceholder: 'Cole os dados JSON aqui...',
      confirmRestore: 'Confirmar Restauração',
      downloadHd: 'Baixar Imagem HD',
      escClose: 'Pressione ESC ou clique no fundo para fechar',
      toastSnapAligned: '🎯 Grade alinhada ao centro da carta!',
      toastImportSuccess: '🎉 {count} cartas importadas com sucesso!',
      toastBatchScan: '⚡ Processadas {files} capturas! {cards} cartas encontradas ({owned} possuídas)',
      toastSingleScan: '⚡ Escaneamento pronto! {cards} cartas encontradas ({owned} possuídas)',
      toastJsonRestored: 'Coleção JSON restaurada com sucesso!',
      errInvalidJson: 'Insira dados JSON válidos',
    },
  }[currentLanguage] || {
    title: 'Smart Screenshot Scanner',
    subtitle: 'Upload game screenshots to automatically detect packs, cards, and ownership',
    tabScanner: 'Screenshot Scanner (Auto-Detect)',
    tabJson: 'JSON Backup & Restore',
    dbFeatureStatus: 'Offline Card Feature DB (3,545 Cards)',
    speedBadge: 'Sub-second Recognition · Zero Manual Typing',
    packsSupport: 'Supports A1 ~ B4a Full Series 3-Column Dex Screenshots',
    bannerTitle: 'Upload In-Game Dex Screenshots to Auto-Import',
    bannerDesc: 'Supports multi-image batch upload or direct clipboard paste (Ctrl+V). Automatically identifies packs, card numbers, rarities, and silhouettes!',
    dropTitle: 'Click or Drag & Drop 3-Column Dex Screenshots Here',
    dropDesc: 'Supports single or batch uploads; you can also press Ctrl+V / Cmd+V to paste from clipboard',
    analyzing: 'Analyzing screenshot grid and card positions...',
    detectedPack: 'Detected Pack',
    confidence: 'Confidence',
    batchQueue: 'Batch Screenshot Queue',
    totalCardsIdentified: '{count} Cards Identified',
    clickInspectHint: 'Click tabs below to verify each screenshot; all merge together on import',
    cacheHit: 'Feature Cache Hit',
    tokens: 'Tokens',
    hideGrid: 'Hide Grid',
    showGrid: 'Show Grid',
    previewSize: 'Preview Size:',
    standardZoom: 'Standard (260px)',
    largeZoom: 'Expanded (560px)',
    actualZoom: '1:1 Original',
    fullscreen: 'Fullscreen',
    downloadAlign: 'Download Overlay',
    clarityGuide: 'Clarity Guide',
    clarityTitle: 'How to get crystal-clear scans?',
    clarityTip1: 'Best way (Recommended): Send original screenshots straight from your gallery (1080x2400 uncompressed).',
    clarityTip2: 'Calibration: Click [Download Overlay] to save the inspection frame image and see pixel accuracy.',
    clarityTip3: 'Web View: Click [Expanded (560px)] or [1:1 Original] to zoom in smoothly.',
    crosshairSnap: '🎯 Click Any Card to Auto-Align Grid',
    waitingClick: 'Waiting for card click...',
    crosshairHint: 'Click the center of any card in the screenshot to instantly snap the grid!',
    standard3Col: 'Standard 3-Column Mode',
    resetAll: 'Reset All',
    verticalY: 'Vertical Y:',
    horizontalX: 'Horizontal X:',
    zoom: 'Zoom:',
    rowGap: 'Row Gap:',
    packLabel: 'Pack:',
    startNumLabel: 'Start #:',
    engine: 'Engine:',
    twoStep: '🔮 Two-Step Match (Recommended)',
    visualHash: '⚡ Feature Hashing',
    sequential: '📋 Sequential Index',
    cloudAi: '🤖 Cloud AI Vision',
    tolerance: 'Tolerance:',
    tolStrict: 'Strict (85%+ Match)',
    tolBalanced: 'Balanced (70%+ Match)',
    tolRelaxed: 'Relaxed (55%+ Match)',
    allCards: 'All',
    owned: 'Owned',
    missing: 'Missing',
    duplicates: 'Duplicates',
    selectAllOwned: 'Select All Owned',
    resetMissing: 'Reset Missing',
    cropLabel: 'Crop',
    matchLabel: 'Match',
    hasOwned: 'Owned',
    notOwned: 'Missing',
    collapse: 'Collapse',
    calibrateCard: 'Calibrate',
    setOwned: 'Mark Owned',
    replaceCardPlaceholder: 'Search card to correct: Name or # (e.g. Charizard / 004)...',
    importModeLabel: 'Import Mode:',
    mergeMode: 'Smart Merge (Keep existing cards)',
    overwritePack: 'Overwrite detected expansion pack',
    confirmImport: 'Import Cards to Collection',
    confirmBatchImport: 'Merge and Import All {count} Screenshots ({owned} Owned)',
    backupTitle: 'Backup Card Collection Data',
    backupDesc: 'Export full JSON collection data to file or clipboard',
    copyJson: 'Copy JSON',
    copied: 'Copied',
    downloadJsonFile: 'Download (.json)',
    restoreTitle: 'Restore from JSON Backup',
    restoreDesc: 'Paste previously exported JSON data to restore your collection',
    pasteJsonPlaceholder: 'Paste JSON data here...',
    confirmRestore: 'Confirm Restore',
    downloadHd: 'Download HD Image',
    escClose: 'Press ESC or click background to close',
    toastSnapAligned: '🎯 Grid aligned to clicked card center!',
    toastImportSuccess: '🎉 Successfully imported {count} cards into your collection!',
    toastBatchScan: '⚡ Processed {files} screenshots! Found {cards} cards ({owned} owned)',
    toastSingleScan: '⚡ Scan complete! Found {cards} cards ({owned} owned)',
    toastJsonRestored: 'JSON collection data restored successfully!',
    errInvalidJson: 'Please enter valid JSON data',
  };

  // Listen for Ctrl+V / Cmd+V paste screenshot
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFiles([file]);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedPack, startCardNumber]);

  // Process uploaded or pasted screenshot files with fast concurrency
  const handleProcessFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      // Parallelize processing across all uploaded screenshots for 3x-5x speedup
      const results: ScanResult[] = await Promise.all(
        files.map((file) =>
          processScreenshot(file, {
            fileName: file.name,
            targetPack: selectedPack === 'AUTO' ? undefined : selectedPack,
            preferredCols,
            matchingMode,
            sensitivity: matchingSensitivity,
          })
        )
      );

      setCurrentSourceImages(files);
      setVerticalOffsetShift(0);
      setHorizontalOffsetShift(0);
      setCardScale(1.0);
      setRowGapScale(1.0);
      setIsCrosshairActive(false);
      setOverrideStartNumber(null);
      setOverridePack(null);

      setScanResults(results);
      setActiveResultIndex(0);
      setCardSlots(results[0]?.slots || []);

      const totalCards = results.reduce((sum, r) => sum + r.slots.length, 0);
      const totalOwned = results.reduce((sum, r) => sum + r.slots.filter((s) => s.owned).length, 0);

      const toastMsg =
        files.length > 1
          ? labels.toastBatchScan.replace('{files}', String(files.length)).replace('{cards}', String(totalCards)).replace('{owned}', String(totalOwned))
          : labels.toastSingleScan.replace('{cards}', String(totalCards)).replace('{owned}', String(totalOwned));
      showToast(toastMsg, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error parsing screenshot', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Live Recalibrate Grid: adjust vertical & horizontal shift, scale, row gap, columns, start number or pack in real-time
  const handleRecalibrate = async (params: {
    shiftDelta?: number;
    horizontalShiftDelta?: number;
    scaleDelta?: number;
    rowGapDelta?: number;
    resetShift?: boolean;
    cols?: number | 'AUTO';
    startCardNum?: number;
    pack?: string;
    mode?: 'two_step' | 'hybrid' | 'visual_hash' | 'sequential' | 'ai';
    sensitivity?: 'strict' | 'balanced' | 'relaxed';
    anchorPoint?: { x: number; y: number };
  }) => {
    const currentImg = currentSourceImages[activeResultIndex];
    if (!currentImg) return;

    const nextShift = params.resetShift
      ? 0
      : params.shiftDelta !== undefined
      ? Math.max(-0.25, Math.min(0.25, verticalOffsetShift + params.shiftDelta))
      : verticalOffsetShift;
    const nextHShift = params.resetShift
      ? 0
      : params.horizontalShiftDelta !== undefined
      ? Math.max(-0.20, Math.min(0.20, horizontalOffsetShift + params.horizontalShiftDelta))
      : horizontalOffsetShift;
    const nextScale = params.resetShift
      ? 1.0
      : params.scaleDelta !== undefined
      ? Math.max(0.75, Math.min(1.35, cardScale + params.scaleDelta))
      : cardScale;
    const nextRowGap = params.resetShift
      ? 1.0
      : params.rowGapDelta !== undefined
      ? Math.max(0.5, Math.min(2.0, rowGapScale + params.rowGapDelta))
      : rowGapScale;

    const nextCols = params.cols !== undefined ? params.cols : preferredCols;
    const nextPack = params.pack !== undefined ? params.pack : (overridePack || currentResult?.packCode || 'A1');
    const defaultStart = parseInt(cardSlots[0]?.card?.cardNumber, 10) || 1;
    const stepDelta = (currentResult?.detectedCols || 3);
    const nextStart = params.startCardNum !== undefined
      ? params.startCardNum
      : (overrideStartNumber ?? defaultStart);
    const nextMode = params.mode !== undefined ? params.mode : matchingMode;
    const nextSens = params.sensitivity !== undefined ? params.sensitivity : matchingSensitivity;

    setVerticalOffsetShift(nextShift);
    setHorizontalOffsetShift(nextHShift);
    setCardScale(nextScale);
    setRowGapScale(nextRowGap);
    setPreferredCols(nextCols);
    setOverridePack(nextPack);
    setOverrideStartNumber(nextStart);

    setIsProcessing(true);
    try {
      const res = await processScreenshot(currentImg, {
        fileName: currentResult?.fileName || 'game_screenshot.png',
        targetPack: nextPack,
        startCardIndex: nextStart,
        preferredCols: nextCols,
        verticalShiftRatio: nextShift,
        horizontalShiftRatio: nextHShift,
        cardScale: nextScale,
        rowGapScale: nextRowGap,
        anchorPoint: params.anchorPoint,
        matchingMode: nextMode,
        sensitivity: nextSens,
      });

      setScanResults((prev) => {
        const copy = [...prev];
        copy[activeResultIndex] = res;
        return copy;
      });
      setCardSlots(res.slots);
      showToast(`已重新对齐（${res.detectedCols}列画廊，共 ${res.slots.length} 卡槽，垂直 ${(nextShift * 100).toFixed(1)}%）`, 'info');
    } catch (e: any) {
      console.error(e);
      showToast('识别重算失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Change Matching Algorithm (Two-Step Precise / 2D-DCT Visual Hash / Hybrid / Sequential / Cloud AI)
  const handleUpdateAlgorithm = (
    newMode: 'two_step' | 'visual_hash' | 'hybrid' | 'sequential' | 'ai',
    newSens: 'strict' | 'balanced' | 'relaxed'
  ) => {
    setMatchingMode(newMode);
    setMatchingSensitivity(newSens);
    if (currentSourceImages.length > 0) {
      handleRecalibrate({ mode: newMode, sensitivity: newSens });
    }
  };

  // Replace a misidentified card slot with another card
  const handleReplaceCardInSlot = (slotId: string, newCard: PokemonCard) => {
    setCardSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          return {
            ...slot,
            id: newCard.id,
            card: newCard,
            isModified: true,
            confidence: 1.0,
            visualSimilarity: 1.0,
            hammingDistance: 0,
            matchMethod: 'visual_hash',
          };
        }
        return slot;
      })
    );
    setEditingSlotId(null);
    setSlotSearchQuery('');
    showToast(`已将卡牌校正为 #${newCard.cardNumber} ${getCardName(newCard)}`, 'success');
  };

  // Switch between multiple uploaded screenshots with state preservation
  const handleSelectResult = (index: number) => {
    if (index === activeResultIndex) return;
    setScanResults((prev) => {
      const copy = [...prev];
      if (copy[activeResultIndex]) {
        copy[activeResultIndex] = {
          ...copy[activeResultIndex],
          slots: cardSlots,
        };
      }
      return copy;
    });
    setActiveResultIndex(index);
    setCardSlots(scanResults[index]?.slots || []);
  };

  // Remove a single screenshot from batch
  const handleRemoveResult = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newResults = scanResults.filter((_, i) => i !== index);
    const newImages = currentSourceImages.filter((_, i) => i !== index);
    setScanResults(newResults);
    setCurrentSourceImages(newImages);
    if (newResults.length === 0) {
      setCardSlots([]);
      setActiveResultIndex(0);
    } else {
      const nextIdx = Math.max(0, Math.min(activeResultIndex, newResults.length - 1));
      setActiveResultIndex(nextIdx);
      setCardSlots(newResults[nextIdx]?.slots || []);
    }
    showToast(`已移除截图 #${index + 1}`, 'info');
  };

  // Edit card slot ownership
  const handleToggleOwned = (slotId: string) => {
    setCardSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          const nextOwned = !slot.owned;
          return {
            ...slot,
            owned: nextOwned,
            count: nextOwned ? Math.max(1, slot.count) : 0,
            isModified: true,
          };
        }
        return slot;
      })
    );
  };

  // Edit card slot count
  const handleUpdateCount = (slotId: string, delta: number) => {
    setCardSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          const nextCount = Math.max(0, slot.count + delta);
          return {
            ...slot,
            count: nextCount,
            owned: nextCount > 0,
            isModified: true,
          };
        }
        return slot;
      })
    );
  };

  // Batch actions
  const handleBatchSetAllOwned = () => {
    setCardSlots((prev) =>
      prev.map((s) => ({
        ...s,
        owned: true,
        count: s.count > 0 ? s.count : 1,
        isModified: true,
      }))
    );
    showToast(labels.selectAllOwned, 'info');
  };

  const handleBatchResetUnowned = () => {
    setCardSlots((prev) =>
      prev.map((s) => ({
        ...s,
        owned: false,
        count: 0,
        isModified: true,
      }))
    );
    showToast(labels.resetMissing, 'info');
  };

  // Commit scanned cards into collection
  const handleConfirmImport = () => {
    const allSlots = scanResults.flatMap((r, idx) => (idx === activeResultIndex ? cardSlots : r.slots));
    const effectivePack = currentResult?.packCode || (selectedPack !== 'AUTO' ? selectedPack : 'A1');

    const updated = applyScanResultsToCollection(userCollection, allSlots, importMode, effectivePack);
    onImport(updated);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const ownedImported = allSlots.filter((s) => s.owned).length;
    showToast(`🎉 成功导入！已同步 ${ownedImported} 张卡牌至图鉴`, 'success');
    onClose();
  };

  // Filtered card slots for review
  const filteredSlots = cardSlots.filter((slot) => {
    if (filterType === 'owned') return slot.owned;
    if (filterType === 'unowned') return !slot.owned;
    if (filterType === 'duplicate') return slot.owned && slot.count > 1;
    return true;
  });

  const currentResult = scanResults[activeResultIndex];

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="dex-scanner-dialog"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-100">
                  {labels.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Auto-Detect Pack
                </span>
              </div>
              <p className="text-xs text-slate-400">{labels.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          <div className="space-y-5">
              {/* Step 1: Pack Selection & Upload Dropzone */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                {/* Official Database Status Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {labels.dbFeatureStatus}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {labels.speedBadge}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {labels.packsSupport}
                  </span>
                </div>

                {/* Direct Full-Dex Information Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-200">
                      {labels.bannerTitle}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {labels.bannerDesc}
                    </p>
                  </div>
                </div>

                {/* Upload & Drop Zone - Clean, Direct, No Sample Buttons */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleProcessFiles(Array.from(e.dataTransfer.files));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-sky-500/80 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl p-7 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleProcessFiles(Array.from(e.target.files));
                      }
                    }}
                  />

                  <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>

                  <p className="text-sm font-bold text-slate-200">
                    {labels.dropTitle}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {labels.dropDesc}
                  </p>
                </div>
              </div>

              {/* Processing Spinner */}
              {isProcessing && (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-200">
                    {labels.analyzing}
                  </p>
                </div>
              )}

              {/* Step 2: Interactive Review Table */}
              {cardSlots.length > 0 && !isProcessing && (
                <div className="space-y-4">
                  {/* Multi-Screenshot Selector Strip (When user uploaded 2+ screenshots) */}
                  {scanResults.length > 1 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-100 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-sky-400" />
                            {labels.batchQueue} ({scanResults.length})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                            {labels.totalCardsIdentified.replace('{count}', String(scanResults.reduce((sum, r) => sum + r.slots.length, 0)))}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {labels.clickInspectHint}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                        {scanResults.map((result, idx) => {
                          const isActive = activeResultIndex === idx;
                          const owned = result.slots.filter((s) => s.owned).length;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectResult(idx)}
                              className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                isActive
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md shadow-sky-500/20 ring-1 ring-sky-400/60'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {result.previewUrl ? (
                                <img
                                  src={result.previewUrl}
                                  alt=""
                                  className="w-5 h-7 object-cover rounded shadow-sm border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-7 bg-slate-800 rounded flex items-center justify-center text-[10px] shrink-0">
                                  #{idx + 1}
                                </div>
                              )}
                              <div className="text-left">
                                <div className="leading-tight text-[11px] flex items-center gap-1">
                                  <span>截图 #{idx + 1}</span>
                                  {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal">
                                  {result.slots.length} 张 ({owned} 拥有)
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveResult(idx, e)}
                                className="ml-1 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="移除此截图"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Results Summary Bar with Auto-Detected Pack Badge */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-slate-100 text-sm">
                          {currentResult?.packName} ({currentResult?.packCode})
                        </span>
                        {currentResult?.autoDetected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            Auto-Detected ({Math.round(currentResult.confidence * 100)}%)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {labels.owned}: {cardSlots.filter((s) => s.owned).length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {labels.duplicates}: {cardSlots.filter((s) => s.owned && s.count > 1).length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {labels.missing}: {cardSlots.filter((s) => !s.owned).length}
                        </span>
                      </div>

                      {/* Performance & Token Telemetry */}
                      {currentResult?.tokensUsed !== undefined && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                          {currentResult.cached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              命中指纹缓存 (0 Token / {currentResult.durationMs || 1}ms)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              消耗 ~{currentResult.tokensUsed} Tokens ({((currentResult.durationMs || 1200) / 1000).toFixed(2)}s)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Screenshot Preview toggle */}
                    {currentResult?.previewUrl && (
                      <button
                        onClick={() => setShowScreenshotOverlay(!showScreenshotOverlay)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        {showScreenshotOverlay ? labels.hideGrid : labels.showGrid}
                      </button>
                    )}
                  </div>

                  {/* Visual Detected Screenshot Overlay & Calibration Console */}
                  {showScreenshotOverlay && currentResult?.previewUrl && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      {/* Top Preview Toolbar: Zoom, Lightbox, Download, and Clarity Guide */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">{labels.previewSize}</span>
                          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setPreviewZoomMode('standard')}
                              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                previewZoomMode === 'standard' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {labels.standardZoom}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewZoomMode('expanded')}
                              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                previewZoomMode === 'expanded' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {labels.largeZoom}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewZoomMode('actual')}
                              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                previewZoomMode === 'actual' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {labels.actualZoom}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setIsLightboxOpen(true)}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-800 transition-colors cursor-pointer"
                          >
                            <Maximize2 className="w-3 h-3 text-sky-400" />
                            {labels.fullscreen}
                          </button>

                          <a
                            href={currentResult.previewUrl}
                            download={`scan_overlay_${currentResult.packCode || 'card'}.png`}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-800 transition-colors"
                          >
                            <Download className="w-3 h-3 text-emerald-400" />
                            {labels.downloadAlign}
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowClarityGuide(!showClarityGuide)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              showClarityGuide
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                            }`}
                          >
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                            {labels.clarityGuide}
                          </button>
                        </div>
                      </div>

                      {/* Clarity Guide Tip Box */}
                      {showClarityGuide && (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            {labels.clarityTitle}
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/80">
                            <li>{labels.clarityTip1}</li>
                            <li>{labels.clarityTip2}</li>
                            <li>{labels.clarityTip3}</li>
                          </ul>
                        </div>
                      )}

                      {/* Screenshot Container with dynamic height and precise anchor point calculation */}
                      <div
                        className={`relative rounded-xl border border-slate-800 flex justify-center bg-slate-900/90 p-2 select-none transition-all ${
                          previewZoomMode === 'standard'
                            ? 'max-h-64 overflow-y-auto'
                            : previewZoomMode === 'expanded'
                            ? 'max-h-[560px] overflow-y-auto'
                            : 'max-h-[700px] overflow-auto'
                        } ${isCrosshairActive ? 'ring-2 ring-amber-400 cursor-crosshair' : ''}`}
                        onClick={(e) => {
                          if (!isCrosshairActive || !previewImgRef.current) return;
                          const imgRect = previewImgRef.current.getBoundingClientRect();
                          if (imgRect.width === 0 || imgRect.height === 0) return;
                          const clickX = Math.max(0, Math.min(1, (e.clientX - imgRect.left) / imgRect.width));
                          const clickY = Math.max(0, Math.min(1, (e.clientY - imgRect.top) / imgRect.height));
                          handleRecalibrate({ anchorPoint: { x: clickX, y: clickY } });
                          setIsCrosshairActive(false);
                          showToast('🎯 已以点击卡牌中心为基准精准对齐网格！', 'info');
                        }}
                      >
                        <img
                          ref={previewImgRef}
                          src={currentResult.previewUrl}
                          alt="Screenshot overlay"
                          className={`rounded-lg shadow-md pointer-events-none transition-all ${
                            previewZoomMode === 'standard'
                              ? 'max-h-60 object-contain'
                              : previewZoomMode === 'expanded'
                              ? 'max-h-[540px] object-contain'
                              : 'w-auto max-w-none'
                          }`}
                        />
                        {isCrosshairActive && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center gap-1.5 z-10 pointer-events-none">
                            <Crosshair className="w-4 h-4 animate-spin" />
                            请点击截图中任意一张卡牌中心，网格将瞬时自动吸附对齐！
                          </div>
                        )}
                      </div>

                      {/* Calibration Controls */}
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                            网格切图全维度校准控制台
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                            <span>卡包: <strong className="text-sky-400">{currentResult.packCode}</strong></span>
                            <span>布局: <strong className="text-emerald-400">{currentResult.detectedCols}列 x {currentResult.detectedRows || Math.ceil((currentResult.slots?.length || 0) / (currentResult.detectedCols || 1))}行 (共{currentResult.slots?.length || 0}张)</strong></span>
                            <span>Y: <strong className="text-amber-400">{(verticalOffsetShift * 100).toFixed(1)}%</strong></span>
                            <span>X: <strong className="text-purple-400">{(horizontalOffsetShift * 100).toFixed(1)}%</strong></span>
                            <span>缩放: <strong className="text-cyan-400">{Math.round(cardScale * 100)}%</strong></span>
                            <span>行距: <strong className="text-emerald-400">{Math.round(rowGapScale * 100)}%</strong></span>
                          </div>
                        </div>

                        {/* Top quick-action row: Click to Snap & Column Switch */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCrosshairActive(!isCrosshairActive)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                              isCrosshairActive
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            {isCrosshairActive ? labels.waitingClick : labels.crosshairSnap}
                          </button>

                          {/* Dedicated 3-Column Gallery Mode Badge */}
                          <div className="flex items-center gap-1.5 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/30 text-xs">
                            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                            <span className="text-sky-300 font-bold text-[11px]">{labels.standard3Col}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRecalibrate({ resetShift: true })}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-400" />
                            {labels.resetAll}
                          </button>
                        </div>

                        {/* Multi-axis micro adjustments */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                          {/* Vertical Nudge */}
                          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] px-1 font-medium whitespace-nowrap">{labels.verticalY}</span>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ shiftDelta: -0.02 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ▲▲ -2%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ shiftDelta: -0.005 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ▲ -0.5%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ shiftDelta: 0.005 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ▼ +0.5%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ shiftDelta: 0.02 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ▼▼ +2%
                            </button>
                          </div>

                          {/* Horizontal Nudge & Scaling */}
                          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] px-1 font-medium whitespace-nowrap">{labels.horizontalX}</span>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ horizontalShiftDelta: -0.01 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ◀ -1%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ horizontalShiftDelta: 0.01 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              ▶ +1%
                            </button>
                            <span className="text-slate-500 mx-0.5">|</span>
                            <span className="text-slate-400 text-[11px] font-medium">{labels.zoom}</span>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ scaleDelta: -0.03 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              -3%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ scaleDelta: 0.03 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              +3%
                            </button>
                          </div>

                          {/* Row Gap Nudge */}
                          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400 text-[11px] px-1 font-medium whitespace-nowrap">{labels.rowGap}</span>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ rowGapDelta: -0.04 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              -4%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ rowGapDelta: -0.01 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              -1%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ rowGapDelta: 0.01 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              +1%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecalibrate({ rowGapDelta: 0.04 })}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] cursor-pointer"
                            >
                              +4%
                            </button>
                          </div>

                          {/* Quick Pack & Start # Correction */}
                          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 col-span-1 sm:col-span-2 lg:col-span-3">
                            <span className="text-slate-400 text-[11px] font-medium">{labels.packLabel}</span>
                            <select
                              value={overridePack || currentResult.packCode}
                              onChange={(e) => handleRecalibrate({ pack: e.target.value })}
                              className="bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 text-[11px] font-bold focus:outline-none cursor-pointer"
                            >
                              {Object.entries(PACK_INFO).map(([code, info]) => (
                                <option key={code} value={code}>
                                  {info.icon} {code}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-slate-400 text-[11px]">{labels.startNumLabel}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const step = 3;
                                  const cur = overrideStartNumber ?? (parseInt(cardSlots[0]?.card?.cardNumber, 10) || 1);
                                  handleRecalibrate({ startCardNum: Math.max(1, cur - step) });
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                -3
                              </button>
                              <span className="font-mono text-sky-400 font-bold px-1 text-[11px]">
                                #{overrideStartNumber ?? (cardSlots[0]?.card?.cardNumber || '1')}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const step = 3;
                                  const cur = overrideStartNumber ?? (parseInt(cardSlots[0]?.card?.cardNumber, 10) || 1);
                                  handleRecalibrate({ startCardNum: cur + step });
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                +3
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>💡</span>
                          <span>{labels.crosshairHint}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recognition Engine Selection Toolbar */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-sky-400" />
                        {labels.engine}
                      </span>
                      <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleUpdateAlgorithm('two_step', matchingSensitivity)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            matchingMode === 'two_step'
                              ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {labels.twoStep}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAlgorithm('visual_hash', matchingSensitivity)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            matchingMode === 'visual_hash'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {labels.visualHash}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAlgorithm('sequential', matchingSensitivity)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            matchingMode === 'sequential'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {labels.sequential}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAlgorithm('ai', matchingSensitivity)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            matchingMode === 'ai'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {labels.cloudAi}
                        </button>
                      </div>

                      {/* Sensitivity */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-slate-400 text-[11px]">{labels.tolerance}</span>
                        <select
                          value={matchingSensitivity}
                          onChange={(e) => handleUpdateAlgorithm(matchingMode, e.target.value as any)}
                          className="bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="strict">{labels.tolStrict}</option>
                          <option value="balanced">{labels.tolBalanced}</option>
                          <option value="relaxed">{labels.tolRelaxed}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills & Batch Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                          filterType === 'all'
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {labels.allCards} ({cardSlots.length})
                      </button>
                      <button
                        onClick={() => setFilterType('owned')}
                        className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                          filterType === 'owned'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {labels.owned} ({cardSlots.filter((s) => s.owned).length})
                      </button>
                      <button
                        onClick={() => setFilterType('unowned')}
                        className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                          filterType === 'unowned'
                            ? 'bg-slate-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {labels.missing} ({cardSlots.filter((s) => !s.owned).length})
                      </button>
                      <button
                        onClick={() => setFilterType('duplicate')}
                        className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                          filterType === 'duplicate'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {labels.duplicates} ({cardSlots.filter((s) => s.owned && s.count > 1).length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBatchSetAllOwned}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer text-xs"
                      >
                        {labels.selectAllOwned}
                      </button>
                      <button
                        onClick={handleBatchResetUnowned}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold cursor-pointer text-xs"
                      >
                        {labels.resetMissing}
                      </button>
                    </div>
                  </div>

                  {/* Cards Grid Review List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredSlots.map((slot) => {
                      const card = slot.card;
                      const isEditing = editingSlotId === slot.id;
                      const currentPackCode = overridePack || currentResult?.packCode || card.pack;
                      
                      const candidateCards = isEditing
                        ? CARDS_DATABASE.filter((c) => {
                            if (!slotSearchQuery.trim()) {
                              return (
                                c.nameCn === card.nameCn ||
                                c.nameEn === card.nameEn ||
                                c.type === card.type
                              );
                            }
                            const q = slotSearchQuery.trim().toLowerCase();
                            return (
                              c.cardNumber.includes(q) ||
                              (c.nameCn && c.nameCn.toLowerCase().includes(q)) ||
                              (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
                              (c.pack && c.pack.toLowerCase().includes(q))
                            );
                          }).slice(0, 12)
                        : [];

                      return (
                        <div
                          key={slot.id}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 relative ${
                            slot.owned
                              ? 'bg-slate-950/80 border-emerald-500/40 hover:border-emerald-500'
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 opacity-85'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Visual Comparison: Cropped Screenshot Slice + Matched Card Thumbnail */}
                              <div className="flex items-center gap-1 shrink-0">
                                {slot.croppedDataUrl && (
                                  <div
                                    className="relative w-9 h-12 rounded bg-slate-800 overflow-hidden border border-sky-500/40"
                                  >
                                    <img
                                      src={slot.croppedDataUrl}
                                      alt="Screenshot crop"
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-0 inset-x-0 bg-sky-950/90 text-sky-300 text-[7px] text-center font-bold">
                                      {labels.cropLabel}
                                    </span>
                                  </div>
                                )}
                                <div
                                  onClick={() => onInspectCard?.(card)}
                                  className="relative w-9 h-12 rounded overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer"
                                >
                                  <img
                                    src={getCardImageUrl(card)}
                                    alt={getCardName(card)}
                                    className={`w-full h-full object-cover ${!slot.owned ? 'grayscale contrast-75 brightness-50' : ''}`}
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-slate-300 text-[7px] text-center font-bold">
                                    {labels.matchLabel}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] text-slate-400">
                                    #{card.cardNumber}
                                  </span>
                                  <RarityBadge rarity={card.rarity} />
                                  {slot.visualSimilarity !== undefined && (
                                    <span
                                      className={`px-1 rounded text-[9px] font-mono font-bold ${
                                        slot.visualSimilarity >= 0.8
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : slot.visualSimilarity >= 0.65
                                          ? 'bg-sky-500/20 text-sky-300'
                                          : 'bg-amber-500/20 text-amber-300'
                                      }`}
                                    >
                                      {Math.round(slot.visualSimilarity * 100)}%
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-slate-100 truncate text-xs mt-0.5">
                                  {getCardName(card)}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                  <span>
                                    {slot.owned ? (
                                      <span className="text-emerald-400 font-bold">
                                        ✓ {labels.hasOwned} x{slot.count}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">{labels.notOwned}</span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingSlotId(null);
                                      } else {
                                        setEditingSlotId(slot.id);
                                        setSlotSearchQuery('');
                                      }
                                    }}
                                    className="text-[9px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                  >
                                    {isEditing ? labels.collapse : labels.calibrateCard}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Ownership Toggle & Count Stepper */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleOwned(slot.id)}
                                className={`px-2 py-1 rounded-lg font-bold text-[10px] transition-colors cursor-pointer ${
                                  slot.owned
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                }`}
                              >
                                {slot.owned ? labels.hasOwned : labels.setOwned}
                              </button>

                              {slot.owned && (
                                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                  <button
                                    onClick={() => handleUpdateCount(slot.id, -1)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-4 text-center font-mono font-bold text-xs text-white">
                                    {slot.count}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateCount(slot.id, 1)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick In-Slot Card Replacement Dropdown */}
                          {isEditing && (
                            <div className="mt-1 pt-2 border-t border-slate-800 flex flex-col gap-1.5 bg-slate-900/90 p-2 rounded-lg">
                              <div className="flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder={labels.replaceCardPlaceholder}
                                  value={slotSearchQuery}
                                  onChange={(e) => setSlotSearchQuery(e.target.value)}
                                  className="w-full bg-slate-950 text-white px-2 py-1 rounded text-[11px] border border-slate-700 focus:outline-none focus:border-indigo-500"
                                  autoFocus
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-0.5">
                                {candidateCards.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleReplaceCardInSlot(slot.id, c)}
                                    className="flex items-center gap-1.5 p-1 rounded bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500 text-left transition-colors cursor-pointer"
                                  >
                                    <img
                                      src={getCardImageUrl(c)}
                                      alt={getCardName(c)}
                                      className="w-5 h-7 object-cover rounded shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-bold text-white truncate">
                                        #{c.cardNumber} {getCardName(c)}
                                      </p>
                                      <p className="text-[9px] text-slate-400 truncate">{c.pack}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 3: Import Mode & Submit Bar */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-200">{labels.importModeLabel}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                            className="accent-sky-500"
                          />
                          <span>{labels.mergeMode}</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'overwrite_pack'}
                            onChange={() => setImportMode('overwrite_pack')}
                            className="accent-sky-500"
                          />
                          <span>{labels.overwritePack}</span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {scanResults.length > 1
                          ? labels.confirmBatchImport.replace('{count}', String(scanResults.length)).replace('{owned}', String(scanResults.flatMap((r, idx) => (idx === activeResultIndex ? cardSlots : r.slots)).filter((s) => s.owned).length))
                          : labels.confirmImport}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Full-screen Lightbox for pixel-perfect inspection */}
      {isLightboxOpen && currentResult?.previewUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={currentResult.previewUrl}
              download={`scan_overlay_${currentResult.packCode || 'card'}.png`}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-xl transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              {labels.downloadHd}
            </a>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="max-w-full max-h-[88vh] overflow-auto p-2 flex justify-center items-center rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentResult.previewUrl}
              alt="Full resolution overlay"
              className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          </div>
          <div className="mt-3 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            {labels.escClose}
          </div>
        </div>
      )}
    </div>
  );
};
