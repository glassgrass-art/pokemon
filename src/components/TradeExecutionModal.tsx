import { useState } from "react";
import type { PokemonCard } from "../types";
import { useLanguage } from "../context/LanguageContext";
interface Props {
  giveCard: PokemonCard;
  getCard: PokemonCard;
  partnerName: string;
  partnerFriendCode: string;
  mode: "request" | "confirm";
  onConfirm: (options: {
    hasFlair: boolean;
    hasGoldFrame: boolean;
  }) => Promise<boolean>;
  onClose: () => void;
  zIndex?: number;
  giveOptions?: PokemonCard[];
  getOptions?: PokemonCard[];
  onSelectCards?: (giveId: string, getId: string) => void;
}
export const TradeExecutionModal = ({
  giveCard,
  getCard,
  partnerName,
  partnerFriendCode,
  mode,
  onConfirm,
  onClose,
  zIndex,
  giveOptions,
  getOptions,
  onSelectCards,
}: Props) => {
  const { currentLanguage, getCardName, getCardImageUrl } = useLanguage();
  const zh = currentLanguage === "zh-Hant";
  const [busy, setBusy] = useState(false),
    [flair, setFlair] = useState(false),
    [gold, setGold] = useState(false),
    [ack, setAck] = useState(false),
    [error, setError] = useState("");
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (await onConfirm({ hasFlair: flair, hasGoldFrame: gold })) onClose();
      else
        setError(
          zh
            ? "提交失败，请查看提示并重试。"
            : "Submission failed. Check the notice and retry.",
        );
    } catch {
      setError(zh ? "操作失败，请重试。" : "Operation failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(partnerFriendCode);
    } catch {
      setError(
        zh
          ? "复制失败，请手动复制好友码。"
          : "Copy failed. Please copy the friend code manually.",
      );
    }
  };
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80"
      style={{ zIndex: zIndex || 150 }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-action-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5"
      >
        <div className="flex justify-between">
          <h2 id="trade-action-title" className="font-bold text-lg">
            {mode === "request"
              ? zh
                ? "发送交换意向"
                : "Send a trade offer"
              : zh
                ? "确认游戏内交换已完成"
                : "Confirm the in-game trade"}
          </h2>
          <button
            disabled={busy}
            onClick={onClose}
            aria-label={zh ? "关闭" : "Close"}
          >
            ×
          </button>
        </div>
        <p className="text-sm text-slate-400">
          {partnerName} ·{" "}
          <span className="font-mono select-all">{partnerFriendCode}</span>{" "}
          <button onClick={copy} className="text-sky-300">
            {zh ? "复制" : "Copy"}
          </button>
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              card: giveCard,
              label: zh ? "你给出" : "You give",
              options: giveOptions,
              isGive: true,
            },
            {
              card: getCard,
              label: zh ? "你获得" : "You receive",
              options: getOptions,
              isGive: false,
            },
          ].map(({ card, label, options, isGive }) => (
            <div
              key={label}
              className="p-3 bg-slate-950 rounded-xl text-center space-y-2"
            >
              <p className="text-sm text-sky-300">{label}</p>
              <img
                src={getCardImageUrl(card, "low")}
                alt={getCardName(card)}
                className="h-36 mx-auto object-contain"
              />
              <p className="text-sm">{getCardName(card)}</p>
              <p className="text-xs text-slate-400">
                {card.id} · {card.rarity}
              </p>
              {mode === "request" && options && options.length > 1 && (
                <select
                  aria-label={label}
                  value={card.id}
                  onChange={(e) =>
                    onSelectCards?.(
                      isGive ? e.target.value : giveCard.id,
                      isGive ? getCard.id : e.target.value,
                    )
                  }
                  className="w-full bg-slate-800 rounded p-2 text-xs"
                >
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCardName(c)} · {c.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        {mode === "request" ? (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              {zh
                ? "同稀有度交换。装饰和金框要求也需双方一致；请对方接受后在游戏内核对。"
                : "Trade the same rarity. Both players must agree on matching flair and gold frames, then verify eligibility in-game."}
            </p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={flair}
                onChange={(e) => setFlair(e.target.checked)}
              />
              {zh ? "双方均使用带装饰的卡" : "Both cards have flair"}
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={gold}
                onChange={(e) => setGold(e.target.checked)}
              />
              {zh ? "双方均使用金框卡" : "Both cards have gold frames"}
            </label>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">
              {zh
                ? "网站无法验证游戏内交换。双方确认后，才会更新各自的网站收藏并扣减该挂单的出卡数量。"
                : "This website cannot verify in-game trades. Both players must confirm before collections and listing quantities update."}
            </p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              {zh
                ? "我已在游戏内完成上述卡牌交换"
                : "I completed this exact card trade in-game"}
            </label>
          </div>
        )}
        {error && (
          <p role="alert" className="text-rose-300 text-sm">
            {error}
          </p>
        )}
        <button
          onClick={confirm}
          disabled={busy || (mode === "confirm" && !ack)}
          className="w-full p-3 rounded-lg bg-emerald-400 text-slate-950 font-bold disabled:opacity-40"
        >
          {busy
            ? zh
              ? "提交中…"
              : "Submitting…"
            : mode === "request"
              ? zh
                ? "发送意向，等待接受"
                : "Send offer & wait for acceptance"
              : zh
                ? "记录我的完成确认"
                : "Record my confirmation"}
        </button>
      </section>
    </div>
  );
};
