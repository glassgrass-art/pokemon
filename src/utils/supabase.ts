import { createClient } from "@supabase/supabase-js";
import type {
  TradeListing,
  TradeProposal,
  TrainerProfile,
  UserCardStatus,
} from "../types";
import { normalizeFriendCode } from "./tradeState";
import { getAppliedTradeIds, getStorageKey, getStorageOwner } from "./storage";

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const url = env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, "");
const key = env.VITE_SUPABASE_ANON_KEY?.trim();
export const cloudConfigured = !!url && !!key && !key.startsWith("sb_secret_");
export const supabase = createClient(
  cloudConfigured ? url : "https://not-configured.invalid",
  cloudConfigured ? key : "not-configured",
);

export interface CloudBackupPayload {
  trainerProfile: TrainerProfile;
  userCollection: Record<string, UserCardStatus>;
  appliedTradeIds?: string[];
}
interface Result {
  success: boolean;
  message?: string;
  isTableMissing?: boolean;
}
export interface BackupResult extends Result {
  updatedAt?: string;
}
export interface RestoreResult extends BackupResult {
  data?: CloudBackupPayload;
  version?: number;
}

function failure(error: unknown): Result {
  const e = error as { code?: string; message?: string };
  const missing = ["42P01", "PGRST205", "PGRST202"].includes(e?.code || "");
  return {
    success: false,
    isTableMissing: missing,
    message: missing
      ? "交换服务尚未升级，请等待站点维护者完成配置。"
      : e?.message || "网络连接失败，请重试。",
  };
}
export async function currentUserId() {
  if (!cloudConfigured) throw new Error("云端服务尚未配置。");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("请先登录网站账号。");
  return data.session.user.id;
}
export async function scanAuthHeaders() {
  if (!cloudConfigured) return { "Content-Type": "application/json" };
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(data.session
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {}),
  };
}
async function accountClient() {
  const scope = getStorageOwner();
  if (!cloudConfigured) throw new Error("云端服务尚未配置。");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== scope)
    throw new Error("账号已改变，请重新打开此页面。");
  // Pin the bearer token so an account switch cannot reassign an in-flight operation.
  const client = createClient(url, key, {
    global: {
      headers: { Authorization: "Bearer " + data.session.access_token },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { client, userId: scope };
}
export function getAutoSyncEnabled() {
  return localStorage.getItem(getStorageKey("auto_sync")) === "true";
}
export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(getStorageKey("auto_sync"), String(enabled));
}
export function getLastSyncTime() {
  return Number(localStorage.getItem(getStorageKey("last_sync"))) || null;
}
function rememberBackup(
  row: { version: number; updated_at: string },
  scope = getStorageOwner(),
) {
  localStorage.setItem(
    getStorageKey("backup_version", scope),
    String(row.version),
  );
  localStorage.setItem(
    getStorageKey("last_sync", scope),
    String(Date.parse(row.updated_at)),
  );
}
export async function registerTrainer(profile: TrainerProfile) {
  const { client } = await accountClient();
  const code = normalizeFriendCode(profile.friendCode);
  if (code.length !== 16) throw new Error("请填写完整的16位游戏好友码。");
  const { error } = await client.rpc("register_trainer_v2", {
    p_code: code,
    p_name: profile.name.trim() || "Trainer",
    p_avatar: profile.avatar || "",
  });
  if (error) throw error;
}
export async function fetchCloudTradeListings(): Promise<
  Result & { listings?: TradeListing[] }
> {
  if (!cloudConfigured) return failure(new Error("云端服务尚未配置。"));
  try {
    const { data, error } = await supabase
      .from("trade_listings_v2")
      .select("*, profile:trainer_profiles_v2!owner_id(*)")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) return failure(error);
    const rows = [...(data || [])];
    if (getStorageOwner() !== "guest") {
      const { client, userId } = await accountClient();
      const { data: mine, error: mineError } = await client
        .from("trade_listings_v2")
        .select("*, profile:trainer_profiles_v2!owner_id(*)")
        .eq("owner_id", userId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30);
      if (mineError) return failure(mineError);
      const ids = new Set(rows.map((row) => row.id));
      rows.push(...(mine || []).filter((row) => !ids.has(row.id)));
    }
    return {
      success: true,
      listings: rows
        .map((row) => {
          const quantities = row.offer_quantities as Record<string, number>;
          const offers = (row.offer_card_ids as string[]).filter(
            (id) => quantities[id] > 0,
          );
          return {
            id: row.id,
            ownerId: row.owner_id,
            trainerName: row.profile.trainer_name,
            trainerAvatar: row.profile.trainer_avatar,
            friendCode: row.profile.friend_code,
            offerCardId: offers[0],
            wantCardId: row.want_card_ids[0],
            offerCardIds: offers,
            wantCardIds: row.want_card_ids,
            offerQuantities: quantities,
            rarity: row.rarity,
            note: row.note,
            tags: [],
            status: row.status,
            createdAt: Date.parse(row.created_at),
            publishState: "published" as const,
          };
        })
        .filter((row) => row.offerCardIds.length),
    };
  } catch (error) {
    return failure(error);
  }
}
export async function publishCloudTradeListing(
  listing: TradeListing,
): Promise<Result> {
  try {
    const { client } = await accountClient();
    const { error } = await client.rpc("publish_listing_v2", {
      p_id: listing.id,
      p_offer: listing.offerCardIds || [listing.offerCardId],
      p_want: listing.wantCardIds || [listing.wantCardId],
      p_quantities: listing.offerQuantities,
      p_note: listing.note || "",
    });
    return error ? failure(error) : { success: true };
  } catch (error) {
    return failure(error);
  }
}
export async function removeCloudTradeListing(
  listingId: string,
): Promise<Result> {
  try {
    const { client } = await accountClient();
    const { error } = await client.rpc("cancel_listing_v2", {
      p_id: listingId,
    });
    return error ? failure(error) : { success: true };
  } catch (error) {
    return failure(error);
  }
}
function proposalFromRow(row: any): TradeProposal {
  return {
    id: row.id,
    listingId: row.listing_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    fromTrainerName: row.sender?.trainer_name || "Trainer",
    fromFriendCode: row.sender?.friend_code || "",
    toTrainerName: row.recipient?.trainer_name || "Trainer",
    toFriendCode: row.recipient?.friend_code || "",
    offerCardId: row.offer_card_id,
    wantCardId: row.want_card_id,
    status: row.status,
    fromConfirmedAt: row.from_confirmed_at,
    toConfirmedAt: row.to_confirmed_at,
    hasFlair: row.has_flair,
    hasGoldFrame: row.has_gold_frame,
    createdAt: Date.parse(row.created_at),
  };
}
const proposalSelect =
  "*, sender:trainer_profiles_v2!from_user_id(*), recipient:trainer_profiles_v2!to_user_id(*)";
export async function fetchCloudTradeProposals(): Promise<
  Result & { proposals?: TradeProposal[] }
> {
  try {
    const { client, userId } = await accountClient();
    const rows: any[] = [];
    for (let page = 0; ; page++) {
      const { data, error } = await client
        .from("trade_proposals_v2")
        .select(proposalSelect)
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 200, page * 200 + 199);
      if (error) return failure(error);
      rows.push(...(data || []));
      if (!data || data.length < 200) break;
    }
    return { success: true, proposals: rows.map(proposalFromRow) };
  } catch (error) {
    return failure(error);
  }
}
export async function sendCloudTradeProposal(
  proposal: TradeProposal,
): Promise<Result> {
  try {
    const { client } = await accountClient();
    const { error } = await client.rpc("request_trade_v2", {
      p_id: proposal.id,
      p_listing: proposal.listingId,
      p_give: proposal.offerCardId,
      p_get: proposal.wantCardId,
      p_flair: !!proposal.hasFlair,
      p_gold: !!proposal.hasGoldFrame,
    });
    return error ? failure(error) : { success: true };
  } catch (error) {
    return failure(error);
  }
}
export async function respondCloudTrade(
  proposalId: string,
  action: "accept" | "decline" | "confirm",
): Promise<Result> {
  try {
    const { client } = await accountClient();
    const { error } = await client.rpc("respond_trade_v2", {
      p_id: proposalId,
      p_action: action,
    });
    return error ? failure(error) : { success: true };
  } catch (error) {
    return failure(error);
  }
}
export async function backupToCloud(
  payload: CloudBackupPayload,
): Promise<BackupResult> {
  try {
    const { client, userId } = await accountClient();
    const { data, error } = await client.rpc("save_backup_v2", {
      p_profile: payload.trainerProfile,
      p_collection: payload.userCollection,
      p_applied: payload.appliedTradeIds || getAppliedTradeIds(userId),
      p_version:
        Number(localStorage.getItem(getStorageKey("backup_version", userId))) ||
        0,
    });
    if (error) return failure(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !Number.isInteger(row.version))
      throw new Error("备份响应无效，请重试。");
    rememberBackup(row, userId);
    return {
      success: true,
      message: "已备份到当前登录账号。",
      updatedAt: row.updated_at,
    };
  } catch (error) {
    return failure(error);
  }
}
export async function restoreFromCloud(): Promise<RestoreResult> {
  try {
    const { client, userId } = await accountClient();
    const { data, error } = await client
      .from("trainer_backups_v2")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return failure(error);
    if (!data) return { success: false, message: "这个账号还没有云端备份。" };
    return {
      success: true,
      message: "已读取当前账号的备份。",
      updatedAt: data.updated_at,
      version: data.version,
      data: {
        trainerProfile: data.trainer_profile,
        userCollection: data.user_collection,
        appliedTradeIds: data.applied_trade_ids,
      },
    };
  } catch (error) {
    return failure(error);
  }
}
export function adoptBackupVersion(version: number, updatedAt: string) {
  rememberBackup({ version, updated_at: updatedAt });
}
