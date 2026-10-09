import { useState } from "react";
import { cloudConfigured, supabase } from "../utils/supabase";
import { useLanguage } from "../context/LanguageContext";

export default function SignInModal({ onClose }: { onClose: () => void }) {
  const { currentLanguage } = useLanguage();
  const zh = currentLanguage === "zh-Hant";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!cloudConfigured)
        throw new Error(
          zh
            ? "站点登录尚未配置，请稍后再试。"
            : "Sign-in is not configured yet.",
        );
      const { error } =
        sent && token
          ? await supabase.auth.verifyOtp({
              email: email.trim(),
              token: token.trim(),
              type: "email",
            })
          : await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { emailRedirectTo: window.location.origin },
            });
      if (error) throw error;
      setSent(true);
      setMessage(
        zh
          ? "请在邮箱中打开登录链接；如果邮件提供验证码，也可以在这里输入。"
          : "Open the sign-in link in your email, or enter the code if your email includes one.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : zh
            ? "登录失败，请重试。"
            : "Sign-in failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-title"
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100"
      >
        <div className="flex justify-between">
          <h2 id="sign-in-title" className="font-bold">
            {zh ? "登录卡牌交换账号" : "Sign in to trade"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={zh ? "关闭" : "Close"}
          >
            ×
          </button>
        </div>
        <p className="text-sm text-slate-400">
          {zh
            ? "登录后可以发布挂单、接收交换意向，并在不同设备恢复收藏。游戏好友码只用于联系对方。"
            : "Sign in to publish listings, receive offers, and back up your collection. Your game friend code is for contacting partners."}
        </p>
        <label className="block text-sm">
          {zh ? "邮箱" : "Email"}
          <input
            type="email"
            required
            value={email}
            disabled={busy || sent}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="block w-full mt-2 p-3 bg-slate-950 rounded-lg"
          />
        </label>
        {sent && (
          <label className="block text-sm">
            {zh ? "邮件验证码（如有）" : "Email code (if included)"}
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="one-time-code"
              className="block w-full mt-2 p-3 bg-slate-950 rounded-lg"
            />
          </label>
        )}
        {message && (
          <p role="status" className="text-sm text-amber-300">
            {message}
          </p>
        )}
        <button
          disabled={busy || !cloudConfigured}
          className="w-full p-3 rounded-lg bg-sky-400 text-slate-950 font-bold disabled:opacity-50"
        >
          {busy
            ? zh
              ? "处理中…"
              : "Working…"
            : sent && token
              ? zh
                ? "验证并登录"
                : "Verify code"
              : zh
                ? "发送登录邮件"
                : "Send sign-in email"}
        </button>
        {sent && (
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setToken("");
              setMessage("");
            }}
            className="text-sm text-slate-400"
          >
            {zh ? "更换邮箱" : "Use another email"}
          </button>
        )}
      </form>
    </div>
  );
}
