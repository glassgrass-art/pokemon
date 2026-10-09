import { useState } from "react";
import type { TradeListing, TradeProposal, UserCardStatus } from "../types";
import { CARD_MAP } from "../data/cardsData";
import { useLanguage } from "../context/LanguageContext";
interface Props {
  proposals: TradeProposal[];
  listings: TradeListing[];
  userCollection: Record<string, UserCardStatus>;
  userId?: string;
  onClose: () => void;
  onAcceptProposal: (p: TradeProposal) => Promise<void>;
  onDeclineProposal: (id: string) => Promise<void>;
  onDeleteListing: (id: string) => Promise<void>;
  onRetryListing: (l: TradeListing) => Promise<boolean>;
  zIndex?: number;
}
export const MyTradesModal = ({
  proposals,
  listings,
  userId,
  onClose,
  onAcceptProposal,
  onDeclineProposal,
  onDeleteListing,
  onRetryListing,
  zIndex,
}: Props) => {
  const { currentLanguage, getCardName, getCardImageUrl } = useLanguage();
  const zh = currentLanguage === "zh-Hant";
  const [tab, setTab] = useState<"trades" | "listings" | "history">("trades"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError(zh ? "操作失败，请重试。" : "Operation failed. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  const mine = listings.filter((l) => !!userId && l.ownerId === userId);
  const shown = proposals
    .filter((p) => p.fromUserId === userId || p.toUserId === userId)
    .filter((p) =>
      tab === "history"
        ? ["completed", "declined"].includes(p.status)
        : ["pending", "accepted"].includes(p.status),
    );
  const cardLabel = (id: string) => {
    const card = CARD_MAP.get(id);
    return card ? getCardName(card) : id;
  };
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ zIndex: zIndex || 100 }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-trades-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4"
      >
        <div className="flex justify-between">
          <h2 id="my-trades-title" className="font-bold">
            {zh ? "我的交换" : "My trades"}
          </h2>
          <button aria-label={zh ? "关闭" : "Close"} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="flex gap-3 text-sm">
          {(["trades", "listings", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "text-sky-300" : "text-slate-400"}
            >
              {t === "trades"
                ? zh
                  ? "交换意向"
                  : "Offers"
                : t === "listings"
                  ? zh
                    ? "我的挂单"
                    : "My listings"
                  : zh
                    ? "交换记录"
                    : "History"}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-rose-300 text-sm">
            {error}
          </p>
        )}
        {tab === "listings" ? (
          <div className="space-y-3">
            {!mine.length && (
              <p className="text-sm text-slate-400">
                {zh ? "还没有挂单。" : "No listings yet."}
              </p>
            )}
            {mine.map((l) => (
              <div
                key={l.id}
                className="p-4 bg-slate-950 rounded-xl space-y-3 text-sm"
              >
                <p>
                  {zh ? "出" : "Offer"}：
                  {(l.offerCardIds || [l.offerCardId])
                    .map(
                      (id) =>
                        cardLabel(id) + " ×" + (l.offerQuantities?.[id] || 1),
                    )
                    .join(" / ")}
                </p>
                <p>
                  {zh ? "求" : "Want"}：
                  {(l.wantCardIds || [l.wantCardId]).map(cardLabel).join(" / ")}
                </p>
                <p className="text-xs text-amber-300">
                  {l.publishState === "failed"
                    ? zh
                      ? "发布失败，仅你可见"
                      : "Publication failed; private"
                    : l.publishState === "publishing"
                      ? zh
                        ? "发布中"
                        : "Publishing"
                      : zh
                        ? "已发布"
                        : "Published"}
                </p>
                <div className="flex gap-3">
                  {l.publishState === "failed" && (
                    <button
                      disabled={busy}
                      onClick={() => run(() => onRetryListing(l))}
                      className="text-sky-300"
                    >
                      {zh ? "重试发布" : "Retry publication"}
                    </button>
                  )}
                  <button
                    disabled={busy || l.publishState === "publishing"}
                    onClick={() => run(() => onDeleteListing(l.id))}
                    className="text-rose-300"
                  >
                    {zh ? "撤销挂单" : "Cancel listing"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {!shown.length && (
              <p className="text-sm text-slate-400">
                {zh ? "暂无交换记录。" : "No trade records yet."}
              </p>
            )}
            {shown.map((p) => {
              const sender = p.fromUserId === userId,
                give = sender ? p.offerCardId : p.wantCardId,
                get = sender ? p.wantCardId : p.offerCardId;
              const name = sender ? p.toTrainerName : p.fromTrainerName,
                code = sender ? p.toFriendCode : p.fromFriendCode;
              const confirmed = sender ? p.fromConfirmedAt : p.toConfirmedAt;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-slate-950 space-y-3 text-sm"
                >
                  <div className="flex justify-between flex-wrap gap-2">
                    <span>
                      {name} ·{" "}
                      <span className="font-mono select-all">{code}</span>
                    </span>
                    <span className="text-sky-300">
                      {p.status === "completed"
                        ? zh
                          ? "双方已确认"
                          : "Both confirmed"
                        : p.status === "declined"
                          ? zh
                            ? "已撤销／拒绝"
                            : "Cancelled / declined"
                          : p.status === "pending"
                            ? sender
                              ? zh
                                ? "等待对方接受"
                                : "Waiting for acceptance"
                              : zh
                                ? "收到交换意向"
                                : "Incoming offer"
                            : confirmed
                              ? zh
                                ? "你已确认，等待对方"
                                : "You confirmed; waiting for partner"
                              : zh
                                ? "已接受，等待游戏内交换"
                                : "Accepted; complete trade in-game"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: give, label: zh ? "你给出" : "You give" },
                      { id: get, label: zh ? "你获得" : "You receive" },
                    ].map(({ id, label }) => {
                      const card = CARD_MAP.get(id);
                      return (
                        <div
                          key={label}
                          className="flex gap-2 items-center bg-slate-900 p-2 rounded-lg"
                        >
                          {card && (
                            <img
                              src={getCardImageUrl(card, "low")}
                              alt={cardLabel(id)}
                              className="w-10 h-14 object-contain"
                            />
                          )}
                          <div>
                            <p className="text-xs text-slate-400">{label}</p>
                            {cardLabel(id)}
                            <p className="text-xs text-slate-500">{id}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">
                    {p.hasFlair
                      ? zh
                        ? "双方带装饰"
                        : "Both with flair"
                      : zh
                        ? "双方无装饰"
                        : "Both without flair"}{" "}
                    ·{" "}
                    {p.hasGoldFrame
                      ? zh
                        ? "双方金框"
                        : "Both gold frames"
                      : zh
                        ? "双方普通框"
                        : "Both standard frames"}
                  </p>
                  {tab === "trades" && (
                    <div className="flex gap-3">
                      <button
                        disabled={
                          busy || !!p.fromConfirmedAt || !!p.toConfirmedAt
                        }
                        onClick={() => run(() => onDeclineProposal(p.id))}
                        className="text-rose-300 disabled:opacity-40"
                      >
                        {zh ? "撤销／拒绝" : "Cancel / decline"}
                      </button>
                      {((p.status === "pending" && !sender) ||
                        (p.status === "accepted" && !confirmed)) && (
                        <button
                          disabled={busy}
                          onClick={() => run(() => onAcceptProposal(p))}
                          className="text-emerald-300 disabled:opacity-40"
                        >
                          {p.status === "pending"
                            ? zh
                              ? "接受交换"
                              : "Accept offer"
                            : zh
                              ? "游戏内已完成，前往确认"
                              : "Confirm in-game completion"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
