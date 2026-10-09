import React, { useState } from "react";
import { TrainerProfile } from "../types";
import { X, User, Coffee, Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { formatFriendCode, normalizeFriendCode } from "../utils/tradeState";

interface TrainerProfileModalProps {
  profile: TrainerProfile;
  onClose: () => void;
  onSave: (updated: TrainerProfile) => Promise<boolean>;
  onOpenCoffee?: () => void;
  zIndex?: number;
}

const AVATAR_PRESETS = [
  "/pokeball-avatar.jpg",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
];

export const TrainerProfileModal: React.FC<TrainerProfileModalProps> = ({
  profile,
  onClose,
  onSave,
  onOpenCoffee,
  zIndex,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [bio, setBio] = useState(profile.bio);
  const [friendCode, setFriendCode] = useState(
    formatFriendCode(profile.friendCode),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const code = normalizeFriendCode(friendCode);
    if (code && code.length !== 16) {
      setError(t("fillFriendCodeFirst"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await onSave({
        ...profile,
        name: name.trim() || "Trainer",
        friendCode: code,
        avatar,
        bio: bio.trim(),
      });
      if (saved) onClose();
      else setError(t("save") + " failed");
    } catch {
      setError(t("save") + " failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ zIndex: zIndex || 50 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="trainer-profile-dialog"
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {t("profile")}
              </h3>
              <p className="text-xs text-slate-400">{t("appTitle")}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {t("trainerAvatarLabel")}
            </label>
            <div className="flex items-center gap-3">
              <img
                src={avatar || "/pokeball-avatar.jpg"}
                alt="Avatar preview"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-400 bg-slate-950 shadow-md"
              />
              <div className="flex gap-2 flex-wrap">
                {AVATAR_PRESETS.map((avUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(avUrl)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border p-0.5 bg-slate-950 transition-transform hover:scale-105 cursor-pointer ${
                      avatar === avUrl
                        ? "border-sky-400 ring-2 ring-sky-400/40"
                        : "border-slate-800"
                    }`}
                  >
                    <img
                      src={avUrl}
                      alt={`Avatar ${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trainer Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t("trainerNicknameLabel")}
            </label>
            <input
              type="text"
              id="trainer-name-input"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("trainerNicknamePlaceholder")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-friend-code"
              className="text-xs font-semibold text-slate-300"
            >
              {t("friendCode")}
            </label>
            <input
              id="profile-friend-code"
              inputMode="numeric"
              value={friendCode}
              onChange={(e) =>
                setFriendCode(formatFriendCode(e.target.value).slice(0, 19))
              }
              placeholder="0000-0000-0000-0000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t("trainerBioLabel")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder={t("trainerBioPlaceholder")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Completed Trades Counter */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">{t("statusCompleted")}</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {profile.completedTrades}
            </span>
          </div>

          {/* Supporter Badge or Buy Me a Coffee Action */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {profile.isSupporter
                    ? profile.supporterBadge || "☕ Supporter"
                    : t("buyCoffee") || "Buy Me a Coffee"}
                </span>
              </div>
              {profile.isSupporter && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  VIP
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {profile.isSupporter
                ? "已解锁专属金色赞助者荣誉，感谢你为 PTCG Pocket 交换平台提供动力！"
                : t("coffeeSubtitle") ||
                  "支持作者维护全图鉴数据、AI 识图与实时联机撮合。"}
            </p>

            {onOpenCoffee && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCoffee();
                }}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>
                  {profile.isSupporter
                    ? "再次请作者喝咖啡 ☕"
                    : t("buyCoffee") || "请作者喝杯咖啡 ☕"}
                </span>
              </button>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              {t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
