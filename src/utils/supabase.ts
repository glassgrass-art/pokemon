import { createClient } from '@supabase/supabase-js';
import { TrainerProfile, UserCardStatus } from '../types';

// Supabase configuration with default fallbacks provided by user
const defaultUrl = 'https://bkhzhpvkktgncjqcaycz.supabase.co';
const defaultKey = 'sb_publishable_NiH56WLDjM4zz2CJ1vzcdQ_cJJycSjV';

// Normalize url by trimming trailing slashes and /rest/v1
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const rawUrl = (metaEnv?.VITE_SUPABASE_URL || defaultUrl).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Prioritize valid publishable key. Never pass sb_secret_* in browser, as Supabase JS SDK explicitly throws "Forbidden use of secret API key in browser"
let candidateKey = (metaEnv?.VITE_SUPABASE_ANON_KEY || '').trim();
if (!candidateKey || candidateKey.startsWith('sb_secret_')) {
  candidateKey = defaultKey;
}
const anonKey = candidateKey;

export const supabase = createClient(rawUrl, anonKey);

const STORAGE_KEYS = {
  SYNC_KEY: 'ptcgp_cloud_sync_key_v1',
  LAST_SYNC: 'ptcgp_last_cloud_sync_time_v1',
  AUTO_SYNC: 'ptcgp_auto_cloud_sync_v1',
};

// Generate an unambiguous 6-character uppercase alphanumeric sync key (引继码)
export function generateSyncKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get or generate device sync key
export function getOrCreateSyncKey(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.SYNC_KEY);
    if (existing && existing.trim().length >= 4) {
      return existing.trim().toUpperCase();
    }
    const newKey = generateSyncKey();
    localStorage.setItem(STORAGE_KEYS.SYNC_KEY, newKey);
    return newKey;
  } catch (e) {
    console.warn('Failed to access sync key in localStorage:', e);
    return '8K9X2B';
  }
}

// Save custom sync key
export function saveSyncKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_KEY, key.trim().toUpperCase());
  } catch (e) {
    console.warn('Failed to save sync key:', e);
  }
}

// Last sync timestamp
export function getLastSyncTime(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return raw ? parseInt(raw, 10) : null;
  } catch (e) {
    return null;
  }
}

export function setLastSyncTime(ts: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, ts.toString());
  } catch (e) {
    // ignore
  }
}

// Auto sync preference
export function getAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
  } catch (e) {
    return false;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
}

export interface CloudBackupPayload {
  trainerProfile: TrainerProfile;
  userCollection: Record<string, UserCardStatus>;
}

export interface BackupResult {
  success: boolean;
  message: string;
  updatedAt?: string;
  isTableMissing?: boolean;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  data?: CloudBackupPayload;
  updatedAt?: string;
  isTableMissing?: boolean;
}

// Standard SQL template for Supabase SQL Editor
export const SUPABASE_SETUP_SQL = `-- 复制并在 Supabase 项目的 SQL Editor 中粘贴运行（一次性建好备份表、全网联机挂单表与双向匹配消息信箱表）：

-- 1. 训练家数据云端备份表
CREATE TABLE IF NOT EXISTS public.trainer_backups (
  friend_code TEXT PRIMARY KEY,
  sync_key TEXT NOT NULL,
  trainer_profile JSONB,
  user_collection JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trainer_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainer_backups' AND policyname = 'Allow public sync access'
  ) THEN
    CREATE POLICY "Allow public sync access" 
    ON public.trainer_backups 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;

-- 2. 全网卡牌交换挂单大厅公共池
CREATE TABLE IF NOT EXISTS public.trade_listings (
  id TEXT PRIMARY KEY,
  trainer_name TEXT NOT NULL,
  trainer_avatar TEXT,
  friend_code TEXT NOT NULL,
  offer_card_id TEXT NOT NULL,
  want_card_id TEXT NOT NULL,
  offer_card_ids JSONB DEFAULT '[]'::jsonb,
  want_card_ids JSONB DEFAULT '[]'::jsonb,
  rarity TEXT,
  note TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at BIGINT NOT NULL
);

ALTER TABLE public.trade_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_listings' AND policyname = 'Allow all trade access'
  ) THEN
    CREATE POLICY "Allow all trade access" 
    ON public.trade_listings 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;

-- 3. 交换意向与即时匹配通知信箱 (双向消息通知)
CREATE TABLE IF NOT EXISTS public.trade_proposals (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  from_trainer_name TEXT NOT NULL,
  from_friend_code TEXT NOT NULL,
  to_trainer_name TEXT NOT NULL,
  to_friend_code TEXT NOT NULL,
  offer_card_id TEXT NOT NULL,
  want_card_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at BIGINT NOT NULL
);

ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_proposals' AND policyname = 'Allow all proposals access'
  ) THEN
    CREATE POLICY "Allow all proposals access" 
    ON public.trade_proposals 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;
`;

import type { TradeListing, TradeProposal } from '../types';

/**
 * Fetch all shared public listings from Supabase
 */
export async function fetchCloudTradeListings(): Promise<{
  success: boolean;
  listings?: TradeListing[];
  isTableMissing?: boolean;
  message?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('trade_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('trade_listings') ||
        error.message.includes('does not exist')
      ) {
        return {
          success: false,
          isTableMissing: true,
          message: '未检测到 trade_listings 云端挂单表，正在使用本地演示挂单。可在云端设置中执行 SQL 建表。',
        };
      }
      return { success: false, message: error.message };
    }

    if (!data) return { success: true, listings: [] };

    // Format DB records to TradeListing
    const listings: TradeListing[] = data.map((row: any) => ({
      id: row.id,
      trainerName: row.trainer_name,
      trainerAvatar: row.trainer_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      friendCode: row.friend_code,
      offerCardId: row.offer_card_id,
      wantCardId: row.want_card_id,
      offerCardIds: Array.isArray(row.offer_card_ids) ? row.offer_card_ids : [row.offer_card_id],
      wantCardIds: Array.isArray(row.want_card_ids) ? row.want_card_ids : [row.want_card_id],
      rarity: row.rarity,
      note: row.note || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      status: row.status || 'active',
      createdAt: typeof row.created_at === 'number' ? row.created_at : Number(row.created_at) || Date.now(),
      isUserListing: false,
    }));

    return { success: true, listings };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Publish a new trade listing directly to Supabase cloud
 */
export async function publishCloudTradeListing(listing: TradeListing): Promise<{
  success: boolean;
  message?: string;
  isTableMissing?: boolean;
}> {
  try {
    const payload = {
      id: listing.id,
      trainer_name: listing.trainerName,
      trainer_avatar: listing.trainerAvatar,
      friend_code: listing.friendCode,
      offer_card_id: listing.offerCardId,
      want_card_id: listing.wantCardId,
      offer_card_ids: listing.offerCardIds || [listing.offerCardId],
      want_card_ids: listing.wantCardIds || [listing.wantCardId],
      rarity: listing.rarity,
      note: listing.note || '',
      tags: listing.tags || [],
      status: listing.status || 'active',
      created_at: listing.createdAt || Date.now(),
    };

    const { error } = await supabase.from('trade_listings').insert(payload);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('trade_listings') ||
        error.message.includes('does not exist')
      ) {
        return {
          success: false,
          isTableMissing: true,
          message: 'Supabase 中尚未创建 trade_listings 表，已保存在本地。请在云端同步弹窗运行 SQL 开启全网交换大厅。',
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Update trade listing status (e.g. cancelled or completed) in Supabase
 */
export async function updateCloudTradeStatus(
  listingId: string,
  status: 'active' | 'pending' | 'completed' | 'cancelled'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_listings')
      .update({ status })
      .eq('id', listingId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Remove a trade listing completely from Supabase (or set status completed)
 */
export async function removeCloudTradeListing(listingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      // Fallback to updating status to completed if delete policy forbids direct DELETE
      await supabase
        .from('trade_listings')
        .update({ status: 'completed' })
        .eq('id', listingId);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a trade proposal / instant match notification to cloud database for both parties
 */
export async function sendCloudTradeProposal(proposal: TradeProposal): Promise<{
  success: boolean;
  message?: string;
  isTableMissing?: boolean;
}> {
  try {
    const payload = {
      id: proposal.id,
      listing_id: proposal.listingId || null,
      from_trainer_name: proposal.fromTrainerName,
      from_friend_code: proposal.fromFriendCode,
      to_trainer_name: proposal.toTrainerName,
      to_friend_code: proposal.toFriendCode,
      offer_card_id: proposal.offerCardId,
      want_card_id: proposal.wantCardId,
      status: proposal.status || 'pending',
      message: proposal.message || '',
      created_at: proposal.createdAt || Date.now(),
    };

    const { error } = await supabase.from('trade_proposals').upsert(payload, { onConflict: 'id' });

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('trade_proposals') ||
        error.message.includes('does not exist')
      ) {
        return {
          success: false,
          isTableMissing: true,
          message: 'Supabase 中尚未创建 trade_proposals 表，已暂存于本地信箱。',
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Fetch cloud trade proposals for a trainer (both incoming to friendCode and outgoing from friendCode)
 */
export async function fetchCloudTradeProposals(friendCode: string): Promise<{
  success: boolean;
  proposals?: TradeProposal[];
  isTableMissing?: boolean;
  message?: string;
}> {
  try {
    const cleanCode = (friendCode || '').trim();
    if (!cleanCode) return { success: true, proposals: [] };

    // Fetch proposals where current trainer is either recipient or sender
    const { data, error } = await supabase
      .from('trade_proposals')
      .select('*')
      .or(`to_friend_code.eq.${cleanCode},from_friend_code.eq.${cleanCode}`)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('trade_proposals') ||
        error.message.includes('does not exist')
      ) {
        return {
          success: false,
          isTableMissing: true,
          message: '未检测到 trade_proposals 云端提案表。可在云端设置中执行最新 SQL 建表。',
        };
      }
      return { success: false, message: error.message };
    }

    if (!data) return { success: true, proposals: [] };

    const proposals: TradeProposal[] = data.map((row: any) => ({
      id: row.id,
      listingId: row.listing_id || undefined,
      fromTrainerName: row.from_trainer_name,
      fromFriendCode: row.from_friend_code,
      toTrainerName: row.to_trainer_name,
      toFriendCode: row.to_friend_code,
      offerCardId: row.offer_card_id,
      wantCardId: row.want_card_id,
      status: row.status || 'pending',
      message: row.message || '',
      createdAt: typeof row.created_at === 'number' ? row.created_at : Number(row.created_at) || Date.now(),
    }));

    return { success: true, proposals };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

/**
 * Update proposal status in cloud
 */
export async function updateCloudTradeProposalStatus(
  proposalId: string,
  status: 'pending' | 'accepted' | 'declined' | 'completed'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trade_proposals')
      .update({ status })
      .eq('id', proposalId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Backup user collection and profile to Supabase (方案A: 好友代码 + 引继码)
 */
export async function backupToCloud(
  friendCodeInput: string,
  syncKeyInput: string,
  payload: CloudBackupPayload
): Promise<BackupResult> {
  const cleanFriendCode = friendCodeInput.replace(/\D/g, '').slice(0, 16);
  const cleanSyncKey = syncKeyInput.trim().toUpperCase();

  if (cleanFriendCode.length !== 16) {
    return {
      success: false,
      message: '请确保好友代码为完整的 16 位纯数字。',
    };
  }

  if (cleanSyncKey.length < 4) {
    return {
      success: false,
      message: '引继码格式不正确，至少需要 4 位字符。',
    };
  }

  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('trainer_backups').upsert(
      {
        friend_code: cleanFriendCode,
        sync_key: cleanSyncKey,
        trainer_profile: payload.trainerProfile,
        user_collection: payload.userCollection,
        updated_at: nowIso,
      },
      { onConflict: 'friend_code' }
    );

    if (error) {
      console.error('Supabase backup error:', error);
      // Check if table does not exist
      if (error.code === '42P01' || error.message.includes('relation "trainer_backups" does not exist') || error.message.includes('does not exist')) {
        return {
          success: false,
          isTableMissing: true,
          message: 'Supabase 数据库中未找到 "trainer_backups" 数据表。请一键复制建表 SQL 并执行。',
        };
      }
      return {
        success: false,
        message: `云端同步失败: ${error.message}`,
      };
    }

    setLastSyncTime(Date.now());
    saveSyncKey(cleanSyncKey);

    return {
      success: true,
      message: '图鉴及个人档案已成功备份至 Supabase 云端！',
      updatedAt: nowIso,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `网络或服务连接异常: ${msg}`,
    };
  }
}

/**
 * Restore user collection and profile from Supabase (方案A: 好友代码 + 引继码)
 */
export async function restoreFromCloud(
  friendCodeInput: string,
  syncKeyInput: string
): Promise<RestoreResult> {
  const cleanFriendCode = friendCodeInput.replace(/\D/g, '').slice(0, 16);
  const cleanSyncKey = syncKeyInput.trim().toUpperCase();

  if (cleanFriendCode.length !== 16) {
    return {
      success: false,
      message: '请输入完整的 16 位纯数字好友代码。',
    };
  }

  if (cleanSyncKey.length < 4) {
    return {
      success: false,
      message: '请输入 4~8 位引继同步码。',
    };
  }

  try {
    const { data, error } = await supabase
      .from('trainer_backups')
      .select('friend_code, sync_key, trainer_profile, user_collection, updated_at')
      .eq('friend_code', cleanFriendCode)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "trainer_backups" does not exist') || error.message.includes('does not exist')) {
        return {
          success: false,
          isTableMissing: true,
          message: 'Supabase 数据库中未找到 "trainer_backups" 数据表。请在 Supabase SQL Editor 执行建表。',
        };
      }
      return {
        success: false,
        message: `云端查询失败: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        message: '未在云端找到该好友代码的备份记录。请确认好友代码是否输入正确，或原设备是否已上传。',
      };
    }

    // Verify sync key (case-insensitive)
    if ((data.sync_key || '').trim().toUpperCase() !== cleanSyncKey) {
      return {
        success: false,
        message: '引继码校验失败！该好友代码对应的引继码不匹配，请核对原设备上生成的 6 位引继码。',
      };
    }

    const payload: CloudBackupPayload = {
      trainerProfile: data.trainer_profile,
      userCollection: data.user_collection || {},
    };

    setLastSyncTime(Date.now());
    saveSyncKey(cleanSyncKey);

    return {
      success: true,
      message: '云端图鉴与个人档案恢复成功！已同步至当前设备。',
      data: payload,
      updatedAt: data.updated_at,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `网络或服务连接异常: ${msg}`,
    };
  }
}
