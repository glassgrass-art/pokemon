import { useState } from "react";
import type { TrainerProfile, UserCardStatus } from "../types";
import {
  adoptBackupVersion,
  backupToCloud,
  restoreFromCloud,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
} from "../utils/supabase";
import {
  getAppliedTradeIds,
  getStorageKey,
  isSnapshot,
  loadGuestProgress,
  saveSnapshot,
} from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trainerProfile: TrainerProfile;
  userCollection: Record<string, UserCardStatus>;
  onSyncSuccess: (
    profile: TrainerProfile,
    collection: Record<string, UserCardStatus>,
  ) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  zIndex?: number;
  signedIn: boolean;
  onSignIn: () => void;
}
export const CloudSyncModal = ({
  isOpen,
  onClose,
  trainerProfile,
  userCollection,
  onSyncSuccess,
  showToast,
  zIndex,
  signedIn,
  onSignIn,
}: Props) => {
  const { currentLanguage } = useLanguage();
  const zh = currentLanguage === "zh-Hant";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [auto, setAuto] = useState(getAutoSyncEnabled);
  const [restore, setRestore] = useState<Awaited<
    ReturnType<typeof restoreFromCloud>
  > | null>(null);
  const exportLocal = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 2,
            trainerProfile,
            userCollection,
            appliedTradeIds: getAppliedTradeIds(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocket-collection-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const run = async (action: "backup" | "restore") => {
    setBusy(true);
    setMessage("");
    try {
      const result =
        action === "backup"
          ? await backupToCloud({ trainerProfile, userCollection })
          : await restoreFromCloud();
      setMessage(result.message || "");
      if (action === "restore" && result.success) setRestore(result);
      if (!result.success)
        showToast(result.message || (zh ? "同步失败" : "Sync failed"), "error");
    } catch {
      setMessage(
        zh
          ? "无法保存数据，请导出本地备份后重试。"
          : "Unable to save. Export your local backup and retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const applyRestore = () => {
    if (!restore?.data) return;
    try {
      // Save local data as a recoverable snapshot before replacement.
      const recovery = {
        profile: trainerProfile,
        collection: userCollection,
        appliedTradeIds: getAppliedTradeIds(),
      };
      localStorage.setItem(
        getStorageKey("restore_recovery"),
        JSON.stringify(recovery),
      );
      saveSnapshot({
        profile: restore.data.trainerProfile,
        collection: restore.data.userCollection,
        appliedTradeIds: restore.data.appliedTradeIds || [],
      });
      if (restore.version && restore.updatedAt)
        adoptBackupVersion(restore.version, restore.updatedAt);
      onSyncSuccess(restore.data.trainerProfile, restore.data.userCollection);
      setRestore(null);
      showToast(zh ? "已恢复云端备份。" : "Cloud backup restored.", "success");
    } catch {
      setMessage(
        zh
          ? "本地存储空间不足，请先导出备份。"
          : "Local storage is full. Export a backup first.",
      );
    }
  };
  const importGuest = () => {
    try {
      const guest = loadGuestProgress();
      const collection = { ...userCollection };
      for (const [id, status] of Object.entries(guest.collection)) {
        if (!collection[id] || collection[id].count < status.count)
          collection[id] = status;
      }
      const profile = trainerProfile.friendCode
        ? trainerProfile
        : guest.profile;
      saveSnapshot({
        profile,
        collection,
        appliedTradeIds: getAppliedTradeIds(),
      });
      onSyncSuccess(profile, collection);
      showToast(
        zh
          ? "已合并此浏览器原有收藏，请核对后备份。"
          : "Browser collection imported. Review it before backing up.",
        "success",
      );
    } catch {
      setMessage(
        zh
          ? "原有收藏无法读取，请检查本地备份。"
          : "Unable to read the previous browser collection.",
      );
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ zIndex: zIndex || 90 }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-title"
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 text-slate-100"
      >
        <div className="flex justify-between">
          <h2 id="cloud-title" className="font-bold">
            {zh ? "收藏备份与恢复" : "Collection backup & restore"}
          </h2>
          <button aria-label={zh ? "关闭" : "Close"} onClick={onClose}>
            ×
          </button>
        </div>
        <p className="text-sm text-slate-400">
          {zh
            ? "云端收藏跟随网站账号。在新设备登录同一邮箱即可恢复；好友码不再作为登录凭据。"
            : "Your cloud collection belongs to your account. Sign in with the same email on another device to restore it."}
        </p>
        <button
          onClick={exportLocal}
          className="w-full p-3 bg-slate-800 rounded-lg"
        >
          {zh ? "导出本地备份文件" : "Export a local backup"}
        </button>
        <label className="block text-sm text-sky-300">
          {zh ? "读取本地备份文件" : "Read a local backup file"}
          <input
            type="file"
            accept="application/json,.json"
            className="block mt-2 text-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 10 * 1024 * 1024) throw new Error();
                const value = JSON.parse(await file.text());
                const snapshot = {
                  profile: value.trainerProfile,
                  collection: value.userCollection,
                  appliedTradeIds: value.appliedTradeIds || [],
                };
                if (!isSnapshot(snapshot)) throw new Error();
                setRestore({
                  success: true,
                  data: {
                    trainerProfile: snapshot.profile,
                    userCollection: snapshot.collection,
                    appliedTradeIds: snapshot.appliedTradeIds,
                  },
                });
                setMessage(
                  zh
                    ? "文件已读取，请核对后确认恢复。"
                    : "Backup file loaded. Review and apply the restore.",
                );
              } catch {
                setMessage(
                  zh
                    ? "文件格式无效或超过10 MB，请选择本网站导出的备份。"
                    : "Invalid backup or file exceeds 10 MB. Select a backup exported by this website.",
                );
              }
            }}
          />
        </label>
        <button
          onClick={() => {
            try {
              const raw = localStorage.getItem(
                getStorageKey("restore_recovery"),
              );
              if (!raw) throw new Error();
              const data = JSON.parse(raw);
              setRestore({
                success: true,
                data: {
                  trainerProfile: data.profile,
                  userCollection: data.collection,
                  appliedTradeIds: data.appliedTradeIds || [],
                },
              });
              setMessage(
                zh
                  ? "已读取恢复前保留的本地副本，请确认是否恢复。"
                  : "Previous local recovery copy loaded. Review before applying.",
              );
            } catch {
              setMessage(
                zh
                  ? "此账号没有可用的恢复副本。"
                  : "No recovery copy exists for this account.",
              );
            }
          }}
          className="text-sm text-sky-300"
        >
          {zh
            ? "读取上次恢复前的本地副本"
            : "Read the local copy saved before the last restore"}
        </button>
        {!signedIn ? (
          <button
            onClick={onSignIn}
            className="w-full p-3 bg-sky-400 text-slate-950 rounded-lg"
          >
            {zh ? "登录后使用云端备份" : "Sign in for cloud backup"}
          </button>
        ) : (
          <>
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => run("backup")}
                className="flex-1 p-3 bg-sky-400 text-slate-950 rounded-lg disabled:opacity-50"
              >
                {zh ? "备份到云端" : "Back up"}
              </button>
              <button
                disabled={busy}
                onClick={() => run("restore")}
                className="flex-1 p-3 bg-slate-800 rounded-lg disabled:opacity-50"
              >
                {zh ? "读取云端备份" : "Read cloud backup"}
              </button>
            </div>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => {
                  setAuto(e.target.checked);
                  setAutoSyncEnabled(e.target.checked);
                }}
              />
              {zh ? "收藏变更后自动备份" : "Back up after collection changes"}
            </label>
            <button
              disabled={busy}
              onClick={importGuest}
              className="text-sm text-sky-300"
            >
              {zh
                ? "合并此浏览器登录前的收藏"
                : "Import this browser’s collection from before sign-in"}
            </button>
          </>
        )}
        {message && (
          <p role="status" className="text-sm text-amber-300">
            {message}
          </p>
        )}
        {restore?.data && (
          <div className="p-3 border border-amber-500 rounded-lg text-sm space-y-3">
            <p>
              {zh
                ? "此备份将替换当前收藏，原有数据会保留一份恢复副本。"
                : "This replaces your current collection. A recovery copy will be saved."}{" "}
              {Object.keys(restore.data.userCollection).length}{" "}
              {zh ? "条卡牌记录" : "card records"}
            </p>
            <button
              disabled={busy}
              onClick={applyRestore}
              className="p-2 bg-amber-400 text-slate-950 rounded-lg"
            >
              {zh ? "确认恢复" : "Apply restore"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
