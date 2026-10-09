import type {
  UserCardStatus,
  TradeListing,
  TradeProposal,
  TrainerProfile,
} from "../types";
export const EMPTY_PROFILE: TrainerProfile = {
  name: "Trainer",
  friendCode: "",
  avatar: "/pokeball-avatar.jpg",
  bio: "",
  completedTrades: 0,
};
let owner = "guest";
export function setStorageOwner(userId?: string) {
  owner = userId || "guest";
}
export function getStorageOwner() {
  return owner;
}
export function getStorageKey(name: string, scope = owner) {
  return `ptcgp_v2_${scope}_${name}`;
}
export interface Snapshot {
  collection: Record<string, UserCardStatus>;
  profile: TrainerProfile;
  appliedTradeIds: string[];
}
export function isSnapshot(value: unknown): value is Snapshot {
  const s = value as Snapshot;
  return (
    !!s &&
    !!s.collection &&
    typeof s.collection === "object" &&
    !Array.isArray(s.collection) &&
    !!s.profile &&
    ["name", "friendCode", "avatar", "bio"].every(
      (k) => typeof s.profile[k] === "string",
    ) &&
    Number.isInteger(s.profile.completedTrades) &&
    s.profile.completedTrades >= 0 &&
    Array.isArray(s.appliedTradeIds) &&
    s.appliedTradeIds.every((id) => typeof id === "string") &&
    Object.entries(s.collection).every(
      ([id, c]) =>
        !!c &&
        c.cardId === id &&
        Number.isInteger(c.count) &&
        c.count >= 0 &&
        Number.isInteger(c.forTradeCount) &&
        c.forTradeCount >= 0 &&
        typeof c.inWishlist === "boolean",
    )
  );
}
function readJson<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => boolean = () => true,
): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (!validate(value)) throw new Error("Invalid saved data");
    return value;
  } catch {
    localStorage.setItem(key + "_recovery", raw);
    return fallback;
  }
}
export function loadGuestProgress(): Snapshot {
  const raw = localStorage.getItem("ptcgp_v2_guest_snapshot");
  if (raw)
    return readJson(
      "ptcgp_v2_guest_snapshot",
      { collection: {}, profile: { ...EMPTY_PROFILE }, appliedTradeIds: [] },
      isSnapshot,
    );
  const legacy = {
    collection: readJson<Record<string, UserCardStatus>>(
      "ptcgp_user_collection_v1",
      {},
    ),
    profile: readJson("ptcgp_trainer_profile_v1", { ...EMPTY_PROFILE }),
    appliedTradeIds: [],
  };
  if (isSnapshot(legacy)) return legacy;
  localStorage.setItem("ptcgp_legacy_recovery", JSON.stringify(legacy));
  return { collection: {}, profile: { ...EMPTY_PROFILE }, appliedTradeIds: [] };
}
function snapshot(scope = owner): Snapshot {
  const raw = localStorage.getItem(getStorageKey("snapshot", scope));
  if (raw)
    return readJson(
      getStorageKey("snapshot", scope),
      { collection: {}, profile: { ...EMPTY_PROFILE }, appliedTradeIds: [] },
      isSnapshot,
    );
  if (scope === "guest") return loadGuestProgress();
  return { collection: {}, profile: { ...EMPTY_PROFILE }, appliedTradeIds: [] };
}
export function saveSnapshot(value: Snapshot) {
  if (!isSnapshot(value)) throw new Error("收藏备份格式无效，请核对数据。");
  localStorage.setItem(getStorageKey("snapshot"), JSON.stringify(value));
}
export const loadUserCollection = () => snapshot().collection;
export const loadTrainerProfile = () => snapshot().profile;
export const getAppliedTradeIds = (scope?: string) =>
  snapshot(scope).appliedTradeIds;
export function saveUserCollection(collection: Snapshot["collection"]) {
  saveSnapshot({ ...snapshot(), collection });
}
export function saveTrainerProfile(profile: TrainerProfile) {
  saveSnapshot({ ...snapshot(), profile });
}
export const loadTradeListings = (): TradeListing[] =>
  readJson(getStorageKey("listings"), [], Array.isArray);
export const loadTradeProposals = (): TradeProposal[] =>
  readJson(getStorageKey("proposals"), [], Array.isArray);
export function saveTradeListings(value: TradeListing[]) {
  localStorage.setItem(getStorageKey("listings"), JSON.stringify(value));
}
export function saveTradeProposals(value: TradeProposal[]) {
  localStorage.setItem(getStorageKey("proposals"), JSON.stringify(value));
}
