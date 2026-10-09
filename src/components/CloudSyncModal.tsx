import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TrainerProfile, UserCardStatus, SupportedLanguage } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  getOrCreateSyncKey,
  generateSyncKey,
  saveSyncKey,
  getLastSyncTime,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  backupToCloud,
  restoreFromCloud,
} from '../utils/supabase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerProfile: TrainerProfile;
  userCollection: Record<string, UserCardStatus>;
  onSyncSuccess: (newProfile: TrainerProfile, newCollection: Record<string, UserCardStatus>) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  zIndex?: number;
}

const CLOUD_SYNC_I18N = {
  'zh-Hant': {
    modalTitle: '雲端跨設備同步',
    modalSubtitle: '使用「16位好友代碼 + 6位引繼碼」實現手機與電腦隨時互通無縫防丟',
    badgeSupabase: '免註冊 · Supabase',
    tabBackup: '本設備備份上雲',
    tabRestore: '在新設備恢復圖鑑',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: '當前設備專屬引繼憑證',
    myCredentialsDesc: '憑這兩項即可在任意設備同步',
    friendCodeLabel: '1. 我的 16 位好友代碼',
    noFriendCode: '暫未設置好友代碼',
    syncKeyLabel: '2. 我的 6 位雲端引繼碼 (Sync Key)',
    regenerateTooltip: '更換新的引繼碼',
    copy: '複製',
    copied: '已複製',
    copyKey: '複製密鑰',
    statsCollected: '當前已收集卡牌',
    statsWishlist: '心願單卡牌',
    cardsUnit: '張',
    autoSyncTitle: '自動靜默同步雲端',
    autoSyncDesc: '在圖鑑標記擁有或增減數量時，自動在背景儲存在 Supabase',
    lastBackupLabel: '最近備份狀態：',
    notBackedUpYet: '當前設備尚未上傳過',
    backupButton: '立即備份上傳當前圖鑑至雲端',
    backingUp: '正在備份上傳至 Supabase...',
    restoreGuide: '💡 換機/跨設備匯入指南：在新的手機或瀏覽器中打開本站，在此輸入原設備的好友代碼與 6 位引繼碼，點擊恢復即可一秒同步！',
    enterFriendCodeLabel: '1. 原設備好友代碼 (16位純數字)',
    enterFriendCodePlaceholder: '例如：6950-8984-1582-7618',
    enterSyncKeyLabel: '2. 原設備 6 位引繼碼 (Sync Key)',
    enterSyncKeyPlaceholder: '例如：8K9X2B',
    strategyLabel: '同步合併策略',
    strategyOverwriteTitle: '完全覆蓋 (推薦)',
    strategyOverwriteDesc: '以雲端圖鑑完全替換當前設備',
    strategyMergeTitle: '智能合併',
    strategyMergeDesc: '合併兩台設備的卡牌最大數量',
    restoreButton: '從雲端恢復並同步到當前設備',
    restoring: '正在從 Supabase 查詢並同步...',
    sqlConnectionTitle: 'Supabase 專案連接資訊',
    sqlMountedBadge: '已掛載客戶端',
    sqlEndpointLabel: '專案網址:',
    sqlTablesLabel: '雲端表名:',
    sqlGuideTitle: '首次對接請在 Supabase 執行建表（一鍵開啟雲備份與全網聯機掛單）：',
    sqlStep1: '進入 Supabase Dashboard 進入您的專案。',
    sqlStep2: '在左側選單點擊 SQL Editor，點擊 New query。',
    sqlStep3: '點擊下方按鈕複製 SQL，貼上進去後點擊右下角綠色的 Run 按鈕即完成！',
    sqlCopy: '一鍵複製 SQL',
    sqlCopied: '已複製 SQL',
    footerNotice: '本地已永久儲存，雲端雙重保險',
    done: '完成',
    toastCopiedKey: '已複製 6 位雲端引繼碼',
    toastCopiedCode: '已複製 16 位好友代碼',
    toastCopiedSql: '已複製 Supabase 建表 SQL 腳本',
    toastRegenerateKey: '已產生新引繼碼: ',
    toastAutoSyncOn: '已開啟雲端自動靜默備份',
    toastAutoSyncOff: '已關閉雲端自動同步',
    toastBackupSuccess: '☁️ 雲端備份成功！',
    toastBackupError: '雲端同步失敗，請檢查提示',
    toastRestoreSuccess: '🎉 雲端數據恢復成功！',
    errFriendCode16: '您的訓練家個人檔案中好友代碼未滿 16 位純數字，請先在個人檔案中填好好友代碼。',
    errRestoreCode16: '請輸入完整的 16 位純數字好友代碼。',
    errSyncKey6: '請輸入正確格式的 6 位引繼碼。',
    msgBackupSuccess: '✓ 圖鑑及檔案已成功同步保存至 Supabase 雲端！在其他設備憑好友代碼與引繼碼即可恢復。',
    msgRestoreSuccess: '✓ 成功從雲端拉取！已將 {count} 張卡牌數據與檔案同步至當前設備。',
  },
  'en': {
    modalTitle: 'Cloud Cross-Device Sync',
    modalSubtitle: 'Use your 16-digit Friend Code + 6-character Sync Key to seamlessly sync across devices',
    badgeSupabase: 'No Signup · Supabase',
    tabBackup: 'Backup to Cloud',
    tabRestore: 'Restore on New Device',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Device Sync Credentials',
    myCredentialsDesc: 'Use these two keys to sync on any device',
    friendCodeLabel: '1. My 16-Digit Friend Code',
    noFriendCode: 'Friend code not set',
    syncKeyLabel: '2. My 6-Char Sync Key',
    regenerateTooltip: 'Generate new sync key',
    copy: 'Copy',
    copied: 'Copied',
    copyKey: 'Copy Key',
    statsCollected: 'Cards Collected',
    statsWishlist: 'Wishlist Cards',
    cardsUnit: 'cards',
    autoSyncTitle: 'Silent Auto-Sync to Cloud',
    autoSyncDesc: 'Automatically back up to Supabase in background when editing collection',
    lastBackupLabel: 'Last Backup Status:',
    notBackedUpYet: 'Never backed up from this device',
    backupButton: 'Backup Collection to Cloud Now',
    backingUp: 'Backing up to Supabase...',
    restoreGuide: '💡 Transfer Guide: Open this app on your new phone or browser, enter your Friend Code & 6-char Sync Key here, and tap restore!',
    enterFriendCodeLabel: '1. Original Device Friend Code (16 digits)',
    enterFriendCodePlaceholder: 'e.g. 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Original Device 6-Char Sync Key',
    enterSyncKeyPlaceholder: 'e.g. 8K9X2B',
    strategyLabel: 'Restore Strategy',
    strategyOverwriteTitle: 'Full Overwrite (Recommended)',
    strategyOverwriteDesc: 'Completely replace current device data with cloud data',
    strategyMergeTitle: 'Smart Merge',
    strategyMergeDesc: 'Keep the highest card count between both devices',
    restoreButton: 'Restore from Cloud to This Device',
    restoring: 'Querying and restoring from Supabase...',
    sqlConnectionTitle: 'Supabase Project Information',
    sqlMountedBadge: 'Client Connected',
    sqlEndpointLabel: 'Project URL:',
    sqlTablesLabel: 'Cloud Tables:',
    sqlGuideTitle: 'Run table creation SQL in Supabase (enables Cloud Sync and live trading):',
    sqlStep1: 'Go to Supabase Dashboard and open your project.',
    sqlStep2: 'Click SQL Editor on the left menu, then New query.',
    sqlStep3: 'Copy the SQL below, paste it in, and click the green Run button!',
    sqlCopy: 'Copy SQL',
    sqlCopied: 'SQL Copied',
    footerNotice: 'Stored locally in browser, protected with cloud backup',
    done: 'Done',
    toastCopiedKey: 'Copied 6-char Sync Key',
    toastCopiedCode: 'Copied 16-digit Friend Code',
    toastCopiedSql: 'Copied Supabase SQL script',
    toastRegenerateKey: 'Generated new Sync Key: ',
    toastAutoSyncOn: 'Enabled silent cloud auto-sync',
    toastAutoSyncOff: 'Disabled cloud auto-sync',
    toastBackupSuccess: '☁️ Cloud backup succeeded!',
    toastBackupError: 'Cloud sync failed, check prompt',
    toastRestoreSuccess: '🎉 Cloud data restored successfully!',
    errFriendCode16: 'Your trainer profile Friend Code must be 16 digits. Please update your profile first.',
    errRestoreCode16: 'Please enter a valid 16-digit Friend Code.',
    errSyncKey6: 'Please enter a valid 6-character Sync Key.',
    msgBackupSuccess: '✓ Collection & profile successfully saved to Supabase! You can restore on any device with your codes.',
    msgRestoreSuccess: '✓ Successfully retrieved from cloud! Synchronized {count} cards and profile to this device.',
  },
  'ja': {
    modalTitle: 'クラウド端末間同期',
    modalSubtitle: '「16桁フレンドコード + 6桁引継ぎキー」でスマホとPC間をいつでも相互同期',
    badgeSupabase: '登録不要 · Supabase',
    tabBackup: 'この端末からバックアップ',
    tabRestore: '新端末で復元',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: '端末専用引継ぎ認証情報',
    myCredentialsDesc: 'この2つでどの端末でも同期可能',
    friendCodeLabel: '1. 自分の 16桁フレンドコード',
    noFriendCode: 'フレンドコード未設定',
    syncKeyLabel: '2. 自分の 6桁引継ぎキー (Sync Key)',
    regenerateTooltip: '新しい引継ぎキーを生成',
    copy: 'コピー',
    copied: 'コピー済',
    copyKey: 'キーをコピー',
    statsCollected: '現在の所持カード',
    statsWishlist: 'ウィッシュリスト',
    cardsUnit: '種類',
    autoSyncTitle: 'バックグラウンド自動同期',
    autoSyncDesc: '図鑑の枚数変更時にSupabaseへバックグラウンドで自動保存',
    lastBackupLabel: '最新バックアップ状態：',
    notBackedUpYet: 'この端末から未アップロード',
    backupButton: '図鑑を今すぐクラウドへ保存',
    backingUp: 'Supabaseへアップロード中...',
    restoreGuide: '💡 機種変更・引継ぎガイド：新しいスマホやブラウザで本サイトを開き、元のフレンドコードと6桁の引継ぎキーを入力して復元をクリック！',
    enterFriendCodeLabel: '1. 元端末のフレンドコード (16桁数字)',
    enterFriendCodePlaceholder: '例：6950-8984-1582-7618',
    enterSyncKeyLabel: '2. 元端末の 6桁引継ぎキー (Sync Key)',
    enterSyncKeyPlaceholder: '例：8K9X2B',
    strategyLabel: '同期・統合ルール',
    strategyOverwriteTitle: '完全上書き (推奨)',
    strategyOverwriteDesc: 'クラウドの図鑑データで現在の端末を完全置換',
    strategyMergeTitle: 'スマート結合',
    strategyMergeDesc: '両端末の所持カード枚数の多い方を採用して結合',
    restoreButton: 'クラウドから現在の端末に復元',
    restoring: 'Supabaseからデータを取得中...',
    sqlConnectionTitle: 'Supabase 接続情報',
    sqlMountedBadge: 'クライアント接続済',
    sqlEndpointLabel: 'プロジェクトURL:',
    sqlTablesLabel: 'クラウドテーブル:',
    sqlGuideTitle: 'Supabaseでの初回テーブル作成手順（クラウド同期と市場募集を有効化）：',
    sqlStep1: 'Supabase Dashboardでプロジェクトを開きます。',
    sqlStep2: '左メニューの「SQL Editor」を開き「New query」をクリック。',
    sqlStep3: '下記のSQLをコピーして貼り付け、右下の緑色の「Run」をクリック！',
    sqlCopy: 'SQLをコピー',
    sqlCopied: 'SQLをコピーしました',
    footerNotice: 'ブラウザに永続保存・クラウド二重保護',
    done: '完了',
    toastCopiedKey: '6桁引継ぎキーをコピーしました',
    toastCopiedCode: '16桁フレンドコードをコピーしました',
    toastCopiedSql: 'Supabase用SQLをコピーしました',
    toastRegenerateKey: '新しい引継ぎキーを生成しました: ',
    toastAutoSyncOn: 'クラウド自動同期を有効にしました',
    toastAutoSyncOff: 'クラウド自動同期を無効にしました',
    toastBackupSuccess: '☁️ クラウドバックアップが完了しました！',
    toastBackupError: 'クラウド同期に失敗しました',
    toastRestoreSuccess: '🎉 クラウドからの復元が完了しました！',
    errFriendCode16: 'フレンドコードが16桁の数字ではありません。プロフィールで設定してください。',
    errRestoreCode16: '16桁のフレンドコードを正しく入力してください。',
    errSyncKey6: '6桁の引継ぎキーを正しく入力してください。',
    msgBackupSuccess: '✓ 図鑑とプロフィールがSupabaseに保存されました！他の端末でコードを入力すると復元できます。',
    msgRestoreSuccess: '✓ クラウドから取得完了！{count} 枚のカードデータをこの端末に同期しました。',
  },
  'ko': {
    modalTitle: '클라우드 기기 간 동기화',
    modalSubtitle: '「16자리 친구 코드 + 6자리 인계 키」로 모바일과 PC 간 언제든 손쉽게 동기화',
    badgeSupabase: '가입 불필요 · Supabase',
    tabBackup: '이 기기에서 클라우드 백업',
    tabRestore: '새 기기에서 복원',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: '현재 기기 전용 인계 인증키',
    myCredentialsDesc: '이 두 가지 정보로 어떤 기기에서든 동기화 가능',
    friendCodeLabel: '1. 나의 16자리 친구 코드',
    noFriendCode: '친구 코드 미설정',
    syncKeyLabel: '2. 나의 6자리 클라우드 인계 키 (Sync Key)',
    regenerateTooltip: '새 인계 키 발급',
    copy: '복사',
    copied: '복사됨',
    copyKey: '키 복사',
    statsCollected: '현재 수집한 카드',
    statsWishlist: '위시리스트 카드',
    cardsUnit: '장',
    autoSyncTitle: '자동 백그라운드 클라우드 동기화',
    autoSyncDesc: '도감 수정 시 Supabase에 자동으로 안전하게 백업',
    lastBackupLabel: '최근 백업 상태:',
    notBackedUpYet: '이 기기에서 백업한 적 없음',
    backupButton: '현재 도감을 클라우드에 지금 백업',
    backingUp: 'Supabase에 백업 업로드 중...',
    restoreGuide: '💡 기기 변경 가이드: 새 기기나 브라우저에서 사이트를 열고, 원래의 친구 코드와 6자리 인계 키를 입력 후 복원하세요!',
    enterFriendCodeLabel: '1. 원본 기기 친구 코드 (16자리 숫자)',
    enterFriendCodePlaceholder: '예: 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. 원본 기기 6자리 인계 키 (Sync Key)',
    enterSyncKeyPlaceholder: '예: 8K9X2B',
    strategyLabel: '동기화 병합 방식',
    strategyOverwriteTitle: '전체 덮어쓰기 (권장)',
    strategyOverwriteDesc: '클라우드 도감 데이터로 현재 기기를 완전 대체',
    strategyMergeTitle: '스마트 병합',
    strategyMergeDesc: '두 기기 중 더 많은 카드 수량을 기준으로 병합',
    restoreButton: '클라우드에서 현재 기기로 복원',
    restoring: 'Supabase에서 데이터를 불러오는 중...',
    sqlConnectionTitle: 'Supabase 프로젝트 연결 정보',
    sqlMountedBadge: '클라이언트 연결됨',
    sqlEndpointLabel: '프로젝트 주소:',
    sqlTablesLabel: '클라우드 테이블:',
    sqlGuideTitle: 'Supabase에서 최초 1회 테이블 생성 SQL 실행 (클라우드 백업 및 실시간 교환 활성화):',
    sqlStep1: 'Supabase Dashboard에 로그인하여 프로젝트를 엽니다.',
    sqlStep2: '좌측 메뉴에서 SQL Editor 클릭 후 New query 선택.',
    sqlStep3: '아래 SQL을 복사하여 붙여넣고 오른쪽 아래 Run 버튼을 누르면 완료!',
    sqlCopy: 'SQL 복사',
    sqlCopied: 'SQL 복사 완료',
    footerNotice: '브라우저 영구 보관 & 클라우드 2중 보호',
    done: '완료',
    toastCopiedKey: '6자리 인계 키를 복사했습니다',
    toastCopiedCode: '16자리 친구 코드를 복사했습니다',
    toastCopiedSql: 'Supabase SQL을 복사했습니다',
    toastRegenerateKey: '새 인계 키가 생성되었습니다: ',
    toastAutoSyncOn: '클라우드 자동 동기화 켜짐',
    toastAutoSyncOff: '클라우드 자동 동기화 꺼짐',
    toastBackupSuccess: '☁️ 클라우드 백업 성공!',
    toastBackupError: '클라우드 동기화 실패',
    toastRestoreSuccess: '🎉 클라우드 복원 성공!',
    errFriendCode16: '친구 코드가 16자리 숫자가 아닙니다. 프로필에서 먼저 입력해주세요.',
    errRestoreCode16: '16자리 친구 코드를 정확히 입력해주세요.',
    errSyncKey6: '6자리 인계 키를 정확히 입력해주세요.',
    msgBackupSuccess: '✓ 도감과 프로필이 Supabase에 성공적으로 저장되었습니다! 다른 기기에서 복원할 수 있습니다.',
    msgRestoreSuccess: '✓ 클라우드 복원 완료! {count} 장의 카드 데이터를 이 기기로 동기화했습니다.',
  },
  'fr': {
    modalTitle: 'Synchronisation Cloud Multi-Appareils',
    modalSubtitle: 'Utilisez votre Code Ami 16 chiffres + Clé de 6 caractères pour synchroniser mobiles et PC',
    badgeSupabase: 'Sans Inscription · Supabase',
    tabBackup: 'Sauvegarder sur le Cloud',
    tabRestore: 'Restaurer sur un Appareil',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Identifiants de Synchronisation',
    myCredentialsDesc: 'Ces 2 identifiants suffisent pour synchroniser sur tout appareil',
    friendCodeLabel: '1. Mon Code Ami (16 chiffres)',
    noFriendCode: 'Code ami non configuré',
    syncKeyLabel: '2. Ma Clé de Synchro (6 car.)',
    regenerateTooltip: 'Générer une nouvelle clé',
    copy: 'Copier',
    copied: 'Copié',
    copyKey: 'Copier la clé',
    statsCollected: 'Cartes possédées',
    statsWishlist: 'Liste de souhaits',
    cardsUnit: 'cartes',
    autoSyncTitle: 'Sauvegarde Cloud Silencieuse',
    autoSyncDesc: 'Sauvegarde automatiquement en arrière-plan sur Supabase lors des modifications',
    lastBackupLabel: 'Dernière sauvegarde :',
    notBackedUpYet: 'Jamais sauvegardé depuis cet appareil',
    backupButton: 'Sauvegarder la collection sur le Cloud',
    backingUp: 'Sauvegarde sur Supabase en cours...',
    restoreGuide: '💡 Guide de transfert : Ouvrez le site sur votre nouvel appareil, entrez votre Code Ami et Clé à 6 caractères, puis cliquez sur Restaurer !',
    enterFriendCodeLabel: '1. Code Ami d’origine (16 chiffres)',
    enterFriendCodePlaceholder: 'ex. : 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Clé de Synchro d’origine (6 car.)',
    enterSyncKeyPlaceholder: 'ex. : 8K9X2B',
    strategyLabel: 'Stratégie de Restauration',
    strategyOverwriteTitle: 'Remplacement complet (Recommandé)',
    strategyOverwriteDesc: 'Remplace totalement les données locales par le Cloud',
    strategyMergeTitle: 'Fusion intelligente',
    strategyMergeDesc: 'Conserve le nombre le plus élevé de cartes entre les deux appareils',
    restoreButton: 'Restaurer depuis le Cloud sur cet appareil',
    restoring: 'Récupération depuis Supabase...',
    sqlConnectionTitle: 'Connexion au projet Supabase',
    sqlMountedBadge: 'Client connecté',
    sqlEndpointLabel: 'URL du projet :',
    sqlTablesLabel: 'Tables Cloud :',
    sqlGuideTitle: 'Exécutez ce script SQL dans Supabase (active la sauvegarde et les annonces de troc) :',
    sqlStep1: 'Rendez-vous sur Supabase Dashboard et ouvrez votre projet.',
    sqlStep2: 'Cliquez sur SQL Editor dans le menu de gauche, puis New query.',
    sqlStep3: 'Copiez le SQL ci-dessous, collez-le et cliquez sur le bouton vert Run !',
    sqlCopy: 'Copier le SQL',
    sqlCopied: 'SQL Copié',
    footerNotice: 'Stockage local persistant & Double sécurité Cloud',
    done: 'Terminer',
    toastCopiedKey: 'Clé de 6 caractères copiée',
    toastCopiedCode: 'Code Ami à 16 chiffres copié',
    toastCopiedSql: 'Script SQL Supabase copié',
    toastRegenerateKey: 'Nouvelle clé générée : ',
    toastAutoSyncOn: 'Synchronisation automatique activée',
    toastAutoSyncOff: 'Synchronisation automatique désactivée',
    toastBackupSuccess: '☁️ Sauvegarde Cloud réussie !',
    toastBackupError: 'Échec de la synchronisation',
    toastRestoreSuccess: '🎉 Restauration des données réussie !',
    errFriendCode16: 'Votre Code Ami doit comporter 16 chiffres. Veuillez le configurer dans votre profil.',
    errRestoreCode16: 'Veuillez saisir un Code Ami valide à 16 chiffres.',
    errSyncKey6: 'Veuillez saisir une Clé de Synchronisation valide à 6 caractères.',
    msgBackupSuccess: '✓ Collection sauvegardée sur Supabase ! Vous pouvez restaurer sur tout appareil avec vos codes.',
    msgRestoreSuccess: '✓ Données récupérées ! {count} cartes synchronisées sur cet appareil.',
  },
  'de': {
    modalTitle: 'Cloud Geräteübergreifende Synchronisation',
    modalSubtitle: 'Nutzen Sie Freundescode (16 Ziffern) + Sync-Schlüssel (6 Zeichen) für nahtlose Synchronisation',
    badgeSupabase: 'Ohne Registrierung · Supabase',
    tabBackup: 'In Cloud sichern',
    tabRestore: 'Auf neuem Gerät wiederherstellen',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Gerätespezifische Sync-Zugangsdaten',
    myCredentialsDesc: 'Mit diesen 2 Angaben auf jedem Gerät synchronisieren',
    friendCodeLabel: '1. Mein 16-stelliger Freundescode',
    noFriendCode: 'Freundescode nicht festgelegt',
    syncKeyLabel: '2. Mein 6-stelliger Sync-Schlüssel',
    regenerateTooltip: 'Neuen Schlüssel generieren',
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyKey: 'Schlüssel kopieren',
    statsCollected: 'Gesammelte Karten',
    statsWishlist: 'Wunschliste',
    cardsUnit: 'Karten',
    autoSyncTitle: 'Automatische Cloud-Sicherung',
    autoSyncDesc: 'Speichert Änderungen automatisch im Hintergrund auf Supabase',
    lastBackupLabel: 'Letzter Sicherungsstatus:',
    notBackedUpYet: 'Noch nicht von diesem Gerät hochgeladen',
    backupButton: 'Sammlung jetzt in Cloud sichern',
    backingUp: 'Sicherung auf Supabase läuft...',
    restoreGuide: '💡 Umzugshilfe: Öffnen Sie die Seite auf Ihrem neuen Gerät, geben Sie Freundescode und 6-stelligen Schlüssel ein und klicken Sie auf Wiederherstellen!',
    enterFriendCodeLabel: '1. Original Freundescode (16 Ziffern)',
    enterFriendCodePlaceholder: 'z.B.: 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Original 6-stelliger Sync-Schlüssel',
    enterSyncKeyPlaceholder: 'z.B.: 8K9X2B',
    strategyLabel: 'Wiederherstellungsstrategie',
    strategyOverwriteTitle: 'Vollständig überschreiben (Empfohlen)',
    strategyOverwriteDesc: 'Lokale Daten vollständig durch Cloud-Daten ersetzen',
    strategyMergeTitle: 'Intelligente Zusammenführung',
    strategyMergeDesc: 'Höchste Kartenanzahl beider Geräte beibehalten',
    restoreButton: 'Aus Cloud auf diesem Gerät wiederherstellen',
    restoring: 'Daten werden von Supabase geladen...',
    sqlConnectionTitle: 'Supabase Projektverbindung',
    sqlMountedBadge: 'Client verbunden',
    sqlEndpointLabel: 'Projekt-URL:',
    sqlTablesLabel: 'Cloud-Tabellen:',
    sqlGuideTitle: 'Tabellen-SQL in Supabase ausführen (aktiviert Cloud-Sync und Tauschmarkt):',
    sqlStep1: 'Öffnen Sie Ihr Projekt im Supabase Dashboard.',
    sqlStep2: 'Klicken Sie links auf SQL Editor und dann auf New query.',
    sqlStep3: 'SQL unten kopieren, einfügen und auf den grünen Run-Button klicken!',
    sqlCopy: 'SQL kopieren',
    sqlCopied: 'SQL kopiert',
    footerNotice: 'Lokal im Browser gesichert & Cloud-Doppelschutz',
    done: 'Fertig',
    toastCopiedKey: '6-stelligen Schlüssel kopiert',
    toastCopiedCode: '16-stelligen Freundescode kopiert',
    toastCopiedSql: 'Supabase SQL-Skript kopiert',
    toastRegenerateKey: 'Neuer Schlüssel generiert: ',
    toastAutoSyncOn: 'Automatische Cloud-Synchronisation aktiviert',
    toastAutoSyncOff: 'Automatische Cloud-Synchronisation deaktiviert',
    toastBackupSuccess: '☁️ Cloud-Sicherung erfolgreich!',
    toastBackupError: 'Cloud-Synchronisation fehlgeschlagen',
    toastRestoreSuccess: '🎉 Wiederherstellung erfolgreich!',
    errFriendCode16: 'Freundescode muss 16 Ziffern lang sein. Bitte im Profil eintragen.',
    errRestoreCode16: 'Bitte einen gültigen 16-stelligen Freundescode eingeben.',
    errSyncKey6: 'Bitte einen gültigen 6-stelligen Sync-Schlüssel eingeben.',
    msgBackupSuccess: '✓ Sammlung auf Supabase gesichert! Mit Ihren Codes auf jedem Gerät wiederherstellbar.',
    msgRestoreSuccess: '✓ Aus Cloud wiederhergestellt! {count} Karten auf diesem Gerät synchronisiert.',
  },
  'es': {
    modalTitle: 'Sincronización en la Nube entre Dispositivos',
    modalSubtitle: 'Usa tu Código de Amigo (16 dígitos) + Clave (6 car.) para sincronizar móviles y ordenadores',
    badgeSupabase: 'Sin Registro · Supabase',
    tabBackup: 'Respaldar en la Nube',
    tabRestore: 'Restaurar en Nuevo Dispositivo',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Credenciales de Sincronización',
    myCredentialsDesc: 'Usa estas dos claves para sincronizar en cualquier dispositivo',
    friendCodeLabel: '1. Mi Código de Amigo (16 dígitos)',
    noFriendCode: 'Código no configurado',
    syncKeyLabel: '2. Mi Clave de Sincronización (6 car.)',
    regenerateTooltip: 'Generar nueva clave',
    copy: 'Copiar',
    copied: 'Copiado',
    copyKey: 'Copiar Clave',
    statsCollected: 'Cartas coleccionadas',
    statsWishlist: 'Lista de deseos',
    cardsUnit: 'cartas',
    autoSyncTitle: 'Autoguardado silencioso en la nube',
    autoSyncDesc: 'Guarda automáticamente en Supabase en segundo plano al modificar la colección',
    lastBackupLabel: 'Última copia:',
    notBackedUpYet: 'Nunca respaldado desde este dispositivo',
    backupButton: 'Respaldar colección en la nube ahora',
    backingUp: 'Guardando en Supabase...',
    restoreGuide: '💡 Guía de cambio de dispositivo: Abre la web en tu nuevo móvil o navegador, introduce aquí tu Código y Clave de 6 car., ¡y pulsa Restaurar!',
    enterFriendCodeLabel: '1. Código de Amigo original (16 dígitos)',
    enterFriendCodePlaceholder: 'ej.: 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Clave de Sincronización original (6 car.)',
    enterSyncKeyPlaceholder: 'ej.: 8K9X2B',
    strategyLabel: 'Estrategia de Restauración',
    strategyOverwriteTitle: 'Sobrescribir completamente (Recomendado)',
    strategyOverwriteDesc: 'Reemplaza completamente los datos locales con la nube',
    strategyMergeTitle: 'Fusión inteligente',
    strategyMergeDesc: 'Conserva la mayor cantidad de cartas entre ambos dispositivos',
    restoreButton: 'Restaurar desde la nube en este dispositivo',
    restoring: 'Consultando y sincronizando desde Supabase...',
    sqlConnectionTitle: 'Conexión con Supabase',
    sqlMountedBadge: 'Cliente Conectado',
    sqlEndpointLabel: 'URL del Proyecto:',
    sqlTablesLabel: 'Tablas en la Nube:',
    sqlGuideTitle: 'Ejecuta el script SQL en Supabase (habilita la copia en la nube y el mercado):',
    sqlStep1: 'Accede a Supabase Dashboard y entra en tu proyecto.',
    sqlStep2: 'Haz clic en SQL Editor en el menú lateral y luego en New query.',
    sqlStep3: 'Copia el SQL de abajo, pégalo y haz clic en el botón verde Run.',
    sqlCopy: 'Copiar SQL',
    sqlCopied: 'SQL Copiado',
    footerNotice: 'Guardado permanente local y doble seguridad en la nube',
    done: 'Hecho',
    toastCopiedKey: 'Clave de 6 caracteres copiada',
    toastCopiedCode: 'Código de Amigo de 16 dígitos copiado',
    toastCopiedSql: 'Script SQL de Supabase copiado',
    toastRegenerateKey: 'Nueva clave generada: ',
    toastAutoSyncOn: 'Sincronización automática activada',
    toastAutoSyncOff: 'Sincronización automática desactivada',
    toastBackupSuccess: '☁️ ¡Copia en la nube completada con éxito!',
    toastBackupError: 'Error en la sincronización',
    toastRestoreSuccess: '🎉 ¡Datos restaurados con éxito!',
    errFriendCode16: 'Tu Código de Amigo debe tener 16 dígitos. Por favor, configúralo en tu perfil.',
    errRestoreCode16: 'Introduce un Código de Amigo válido de 16 dígitos.',
    errSyncKey6: 'Introduce una Clave de Sincronización válida de 6 caracteres.',
    msgBackupSuccess: '✓ ¡Colección guardada en Supabase! Puedes restaurarla en cualquier dispositivo con tus códigos.',
    msgRestoreSuccess: '✓ ¡Datos recuperados! Se han sincronizado {count} cartas con este dispositivo.',
  },
  'it': {
    modalTitle: 'Sincronizzazione Cloud Multi-Dispositivo',
    modalSubtitle: 'Usa il tuo Codice Amico (16 cifre) + Chiave (6 car.) per sincronizzare cellulare e PC',
    badgeSupabase: 'Senza Registrazione · Supabase',
    tabBackup: 'Backup su Cloud',
    tabRestore: 'Ripristina su Nuovo Dispositivo',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Credenziali di Sincronizzazione',
    myCredentialsDesc: 'Bastano queste 2 chiavi per sincronizzare su qualsiasi dispositivo',
    friendCodeLabel: '1. Il mio Codice Amico (16 cifre)',
    noFriendCode: 'Codice non impostato',
    syncKeyLabel: '2. La mia Chiave di Synchro (6 car.)',
    regenerateTooltip: 'Genera nuova chiave',
    copy: 'Copia',
    copied: 'Copiato',
    copyKey: 'Copia Chiave',
    statsCollected: 'Carte possedute',
    statsWishlist: 'Lista desideri',
    cardsUnit: 'carte',
    autoSyncTitle: 'Salvataggio automatico silenzioso',
    autoSyncDesc: 'Salva automaticamente su Supabase in background quando modifichi la collezione',
    lastBackupLabel: 'Ultimo backup:',
    notBackedUpYet: 'Nessun backup effettuato da questo dispositivo',
    backupButton: 'Esegui backup su Cloud adesso',
    backingUp: 'Salvataggio su Supabase in corso...',
    restoreGuide: '💡 Guida al trasferimento: Apri il sito sul nuovo dispositivo, inserisci Codice Amico e Chiave a 6 car., quindi premi Ripristina!',
    enterFriendCodeLabel: '1. Codice Amico originale (16 cifre)',
    enterFriendCodePlaceholder: 'es.: 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Chiave di Synchro originale (6 car.)',
    enterSyncKeyPlaceholder: 'es.: 8K9X2B',
    strategyLabel: 'Strategia di Ripristino',
    strategyOverwriteTitle: 'Sovrascrittura totale (Consigliata)',
    strategyOverwriteDesc: 'Sostituisce completamente i dati locali con quelli del Cloud',
    strategyMergeTitle: 'Unione intelligente',
    strategyMergeDesc: 'Conserva la quantità massima di carte tra i due dispositivi',
    restoreButton: 'Ripristina dal Cloud su questo dispositivo',
    restoring: 'Recupero dati da Supabase...',
    sqlConnectionTitle: 'Connessione Progetto Supabase',
    sqlMountedBadge: 'Client Connesso',
    sqlEndpointLabel: 'URL del Progetto:',
    sqlTablesLabel: 'Tabelle Cloud:',
    sqlGuideTitle: 'Esegui lo script SQL su Supabase (abilita backup cloud e borsa scambi):',
    sqlStep1: 'Accedi alla Dashboard di Supabase e apri il tuo progetto.',
    sqlStep2: 'Clicca su SQL Editor nel menu a sinistra e poi su New query.',
    sqlStep3: 'Copia il codice SQL sottostante, incollalo e premi il pulsante verde Run!',
    sqlCopy: 'Copia SQL',
    sqlCopied: 'SQL Copiato',
    footerNotice: 'Salvataggio locale persistente & Doppia protezione Cloud',
    done: 'Fatto',
    toastCopiedKey: 'Chiave a 6 caratteri copiata',
    toastCopiedCode: 'Codice Amico a 16 cifre copiato',
    toastCopiedSql: 'Script SQL di Supabase copiato',
    toastRegenerateKey: 'Nuova chiave generata: ',
    toastAutoSyncOn: 'Sincronizzazione automatica attivata',
    toastAutoSyncOff: 'Sincronizzazione automatica disattivata',
    toastBackupSuccess: '☁️ Backup su Cloud completato!',
    toastBackupError: 'Sincronizzazione fallita',
    toastRestoreSuccess: '🎉 Ripristino dati completato!',
    errFriendCode16: 'Il Codice Amico deve contenere 16 cifre. Configuralo prima nel profilo.',
    errRestoreCode16: 'Inserisci un Codice Amico valido di 16 cifre.',
    errSyncKey6: 'Inserisci una Chiave di Sincronizzazione valida di 6 caratteri.',
    msgBackupSuccess: '✓ Collezione salvata su Supabase! Puoi ripristinarla su qualsiasi dispositivo con i tuoi codici.',
    msgRestoreSuccess: '✓ Dati recuperati! {count} carte sincronizzate con questo dispositivo.',
  },
  'pt': {
    modalTitle: 'Sincronização na Nuvem entre Dispositivos',
    modalSubtitle: 'Use seu Código de Amigo (16 dígitos) + Chave (6 car.) para sincronizar celular e PC',
    badgeSupabase: 'Sem Cadastro · Supabase',
    tabBackup: 'Fazer Backup na Nuvem',
    tabRestore: 'Restaurar em Novo Dispositivo',
    tabSql: 'Supabase SQL',
    myCredentialsTitle: 'Credenciais de Sincronização',
    myCredentialsDesc: 'Com essas 2 informações você sincroniza em qualquer dispositivo',
    friendCodeLabel: '1. Meu Código de Amigo (16 dígitos)',
    noFriendCode: 'Código não configurado',
    syncKeyLabel: '2. Minha Chave de Sincronização (6 car.)',
    regenerateTooltip: 'Gerar nova chave',
    copy: 'Copiar',
    copied: 'Copiado',
    copyKey: 'Copiar Chave',
    statsCollected: 'Cartas colecionadas',
    statsWishlist: 'Lista de desejos',
    cardsUnit: 'cartas',
    autoSyncTitle: 'Backup automático silencioso na nuvem',
    autoSyncDesc: 'Salva automaticamente no Supabase em segundo plano ao alterar a coleção',
    lastBackupLabel: 'Último backup:',
    notBackedUpYet: 'Nenhum backup realizado deste dispositivo',
    backupButton: 'Fazer backup da coleção na nuvem agora',
    backingUp: 'Salvando no Supabase...',
    restoreGuide: '💡 Guia de transferência: Abra o site no novo aparelho, insira seu Código e Chave de 6 car. aqui e clique em Restaurar!',
    enterFriendCodeLabel: '1. Código de Amigo original (16 dígitos)',
    enterFriendCodePlaceholder: 'ex.: 6950-8984-1582-7618',
    enterSyncKeyLabel: '2. Chave de Sincronização original (6 car.)',
    enterSyncKeyPlaceholder: 'ex.: 8K9X2B',
    strategyLabel: 'Estratégia de Restauração',
    strategyOverwriteTitle: 'Substituição completa (Recomendado)',
    strategyOverwriteDesc: 'Substitui totalmente os dados locais pelos dados da nuvem',
    strategyMergeTitle: 'Fusão inteligente',
    strategyMergeDesc: 'Mantém a maior quantidade de cartas entre os dois aparelhos',
    restoreButton: 'Restaurar da nuvem para este dispositivo',
    restoring: 'Buscando e sincronizando dados do Supabase...',
    sqlConnectionTitle: 'Conexão com Projeto Supabase',
    sqlMountedBadge: 'Cliente Conectado',
    sqlEndpointLabel: 'URL do Projeto:',
    sqlTablesLabel: 'Tabelas na Nuvem:',
    sqlGuideTitle: 'Execute o script SQL no Supabase (ativa o backup em nuvem e o mercado de trocas):',
    sqlStep1: 'Acesse o Supabase Dashboard e abra seu projeto.',
    sqlStep2: 'Clique em SQL Editor no menu lateral e depois em New query.',
    sqlStep3: 'Copie o código SQL abaixo, cole e clique no botão verde Run!',
    sqlCopy: 'Copiar SQL',
    sqlCopied: 'SQL Copiado',
    footerNotice: 'Armazenamento local permanente & Dupla proteção em nuvem',
    done: 'Concluir',
    toastCopiedKey: 'Chave de 6 caracteres copiada',
    toastCopiedCode: 'Código de Amigo de 16 dígitos copiado',
    toastCopiedSql: 'Script SQL do Supabase copiado',
    toastRegenerateKey: 'Nova chave gerada: ',
    toastAutoSyncOn: 'Sincronização automática ativada',
    toastAutoSyncOff: 'Sincronização automática desativada',
    toastBackupSuccess: '☁️ Backup na nuvem realizado com sucesso!',
    toastBackupError: 'Falha na sincronização',
    toastRestoreSuccess: '🎉 Dados restaurados com sucesso!',
    errFriendCode16: 'Seu Código de Amigo deve ter 16 dígitos. Configure-o no seu perfil.',
    errRestoreCode16: 'Insira um Código de Amigo válido de 16 dígitos.',
    errSyncKey6: 'Insira uma Chave de Sincronização válida de 6 caracteres.',
    msgBackupSuccess: '✓ Coleção salva no Supabase! Você pode restaurá-la em qualquer aparelho com seus códigos.',
    msgRestoreSuccess: '✓ Dados recuperados! {count} cartas sincronizadas com este dispositivo.',
  },
};

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  trainerProfile,
  userCollection,
  onSyncSuccess,
  showToast,
  zIndex,
}) => {
  const { currentLanguage } = useLanguage();
  const t = CLOUD_SYNC_I18N[currentLanguage] || CLOUD_SYNC_I18N['zh-Hant'];

  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');

  // Backup form state
  const [currentSyncKey, setCurrentSyncKey] = useState<string>(() => getOrCreateSyncKey());
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(() => getLastSyncTime());
  const [isAutoSync, setIsAutoSync] = useState<boolean>(() => getAutoSyncEnabled());

  // Restore form state
  const [restoreFriendCode, setRestoreFriendCode] = useState('');
  const [restoreSyncKey, setRestoreSyncKey] = useState('');
  const [restoreStrategy, setRestoreStrategy] = useState<'overwrite' | 'merge'>('overwrite');

  // Loading & status state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sync state with storage when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSyncKey(getOrCreateSyncKey());
      setLastSyncTs(getLastSyncTime());
      setIsAutoSync(getAutoSyncEnabled());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format 16 digit friend code
  const formatFriendCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const handleRestoreFriendCodeChange = (val: string) => {
    setRestoreFriendCode(formatFriendCode(val));
  };

  const handleCopySyncKey = () => {
    navigator.clipboard.writeText(currentSyncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToast(t.toastCopiedKey, 'info');
  };

  const handleCopyMyFriendCode = () => {
    navigator.clipboard.writeText(trainerProfile.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast(t.toastCopiedCode, 'info');
  };

  const handleRegenerateKey = () => {
    const newKey = generateSyncKey();
    setCurrentSyncKey(newKey);
    saveSyncKey(newKey);
    showToast(`${t.toastRegenerateKey}${newKey}`, 'info');
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setIsAutoSync(enabled);
    setAutoSyncEnabled(enabled);
    showToast(enabled ? t.toastAutoSyncOn : t.toastAutoSyncOff, 'info');
  };

  // Perform Backup to Supabase
  const handlePerformBackup = async () => {
    const cleanCode = trainerProfile.friendCode.replace(/\D/g, '');
    if (cleanCode.length !== 16) {
      setStatusMessage({
        type: 'error',
        text: t.errFriendCode16,
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const res = await backupToCloud(trainerProfile.friendCode, currentSyncKey, {
      trainerProfile,
      userCollection,
    });

    setIsLoading(false);

    if (res.success) {
      setLastSyncTs(Date.now());
      setStatusMessage({
        type: 'success',
        text: t.msgBackupSuccess,
      });
      showToast(t.toastBackupSuccess, 'success');
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
      showToast(t.toastBackupError, 'error');
    }
  };

  // Perform Restore from Supabase
  const handlePerformRestore = async () => {
    const cleanCode = restoreFriendCode.replace(/\D/g, '');
    if (cleanCode.length !== 16) {
      setStatusMessage({
        type: 'error',
        text: t.errRestoreCode16,
      });
      return;
    }

    const cleanKey = restoreSyncKey.trim().toUpperCase();
    if (!cleanKey || cleanKey.length !== 6) {
      setStatusMessage({
        type: 'error',
        text: t.errSyncKey6,
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const res = await restoreFromCloud(cleanCode, cleanKey);
    setIsLoading(false);

    if (res.success && res.data) {
      const cloudCollection = res.data.userCollection || {};
      const cloudProfile = res.data.trainerProfile;

      let finalCollection = { ...userCollection };

      if (restoreStrategy === 'overwrite') {
        finalCollection = cloudCollection;
      } else {
        Object.entries(cloudCollection).forEach(([cardId, cloudStatus]) => {
          const localStatus = finalCollection[cardId];
          const localCount = localStatus ? localStatus.count : 0;
          const statusObj = cloudStatus as UserCardStatus;
          const mergedCount = Math.max(localCount, statusObj?.count || 0);

          finalCollection[cardId] = {
            cardId,
            count: mergedCount,
            inWishlist: statusObj?.inWishlist || (localStatus ? localStatus.inWishlist : false),
            forTradeCount: Math.max(0, mergedCount - 1),
            updatedAt: Date.now(),
          };
        });
      }

      const finalProfile: TrainerProfile = {
        ...trainerProfile,
        name: cloudProfile?.name || trainerProfile.name,
        friendCode: cloudProfile?.friendCode ? formatFriendCode(cloudProfile.friendCode) : trainerProfile.friendCode,
        avatar: cloudProfile?.avatar || trainerProfile.avatar,
        completedTrades: Math.max(trainerProfile.completedTrades || 0, cloudProfile?.completedTrades || 0),
      };

      onSyncSuccess(finalProfile, finalCollection);
      setLastSyncTs(Date.now());
      setCurrentSyncKey(cleanKey);

      setStatusMessage({
        type: 'success',
        text: t.msgRestoreSuccess.replace('{count}', String(Object.keys(finalCollection).length)),
      });
      showToast(t.toastRestoreSuccess, 'success');
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  // Stats calculation
  const totalCardsOwned = (Object.values(userCollection) as UserCardStatus[]).filter((c) => c && c.count > 0).length;
  const totalWishlist = (Object.values(userCollection) as UserCardStatus[]).filter((c) => c && c.inWishlist).length;

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100">{t.modalTitle}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t.badgeSupabase}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1">
          <button
            onClick={() => {
              setActiveTab('backup');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'backup'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>{t.tabBackup}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('restore');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'restore'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CloudDownload className="w-4 h-4" />
            <span>{t.tabRestore}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* Status feedback Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-sky-950/40 border-sky-500/40 text-sky-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* TAB 1: Backup */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Credentials Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    {t.myCredentialsTitle}
                  </span>
                  <span className="text-[10px] text-slate-500">{t.myCredentialsDesc}</span>
                </div>

                {/* Friend code display */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      {t.friendCodeLabel}
                    </div>
                    <div className="font-mono text-sm sm:text-base font-bold text-sky-400">
                      {trainerProfile.friendCode || t.noFriendCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMyFriendCode}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? t.copied : t.copy}</span>
                  </button>
                </div>

                {/* 6-char Sync Key display */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-indigo-300 font-semibold flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      <span>{t.syncKeyLabel}</span>
                    </div>
                    <div className="font-mono text-lg sm:text-xl font-black text-amber-400 tracking-wider">
                      {currentSyncKey}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRegenerateKey}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={t.regenerateTooltip}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySyncKey}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? t.copied : t.copyKey}</span>
                    </button>
                  </div>
                </div>

                {/* Current Data Overview */}
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{t.statsCollected}</div>
                    <div className="text-sm font-bold text-slate-100 font-mono">{totalCardsOwned} {t.cardsUnit}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{t.statsWishlist}</div>
                    <div className="text-sm font-bold text-rose-400 font-mono">{totalWishlist} {t.cardsUnit}</div>
                  </div>
                </div>
              </div>

              {/* Auto sync switch */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.autoSyncTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {t.autoSyncDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAutoSync(!isAutoSync)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                    isAutoSync ? 'bg-sky-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                      isAutoSync ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sync Timestamp Info */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{t.lastBackupLabel}</span>
                <span className="font-mono text-slate-300">
                  {lastSyncTs ? new Date(lastSyncTs).toLocaleString() : t.notBackedUpYet}
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                id="btn-perform-backup"
                disabled={isLoading}
                onClick={handlePerformBackup}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{t.backingUp}</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 text-slate-950" />
                    <span>{t.backupButton}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Restore */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-200 leading-relaxed">
                {t.restoreGuide}
              </div>

              {/* Restore Input 1: Friend Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{t.enterFriendCodeLabel}</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {restoreFriendCode.replace(/\D/g, '').length}/16
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t.enterFriendCodePlaceholder}
                  value={restoreFriendCode}
                  onChange={(e) => handleRestoreFriendCodeChange(e.target.value)}
                  maxLength={19}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-sm text-sky-300 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Restore Input 2: Sync Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.enterSyncKeyLabel}</span>
                </label>
                <input
                  type="text"
                  placeholder={t.enterSyncKeyPlaceholder}
                  value={restoreSyncKey}
                  onChange={(e) => setRestoreSyncKey(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-sm tracking-wider font-bold text-amber-400 uppercase focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Merge or Overwrite Strategy */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300">{t.strategyLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreStrategy('overwrite')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      restoreStrategy === 'overwrite'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">{t.strategyOverwriteTitle}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.strategyOverwriteDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreStrategy('merge')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      restoreStrategy === 'merge'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">{t.strategyMergeTitle}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.strategyMergeDesc}</div>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                id="btn-perform-restore"
                disabled={isLoading}
                onClick={handlePerformRestore}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{t.restoring}</span>
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-4 h-4 text-slate-950" />
                    <span>{t.restoreButton}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t.footerNotice}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
