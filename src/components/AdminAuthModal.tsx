import React, { useState } from 'react';
import { X, Lock, Key, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { setAdminAuthenticated } from '../utils/merchantStorage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passphrase, setPassphrase] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin code is admin888 (or 888888, or admin)
    const validCodes = ['admin888', '888888', 'admin', 'pocket2026'];
    if (validCodes.includes(passphrase.trim().toLowerCase())) {
      setAdminAuthenticated(true);
      setErrorMsg(null);
      setPassphrase('');
      onSuccess();
    } else {
      setErrorMsg('訪問金鑰不正確，請輸入商戶管理密碼（預設: admin888）');
    }
  };

  const handleQuickDemoAccess = () => {
    setAdminAuthenticated(true);
    setErrorMsg(null);
    setPassphrase('');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">
            進入商戶管理後台 (Admin Mode)
          </h3>
          <p className="text-xs text-slate-400">
            給用戶看的界面與後台管理界面已完全分離。請驗證身份以進入後台自選上傳圖片與管理商品。
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3 pt-1">
          <div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="請輸入管理金鑰 (預設: admin888)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                autoFocus
              />
            </div>
            {errorMsg && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>確認解鎖後台</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleQuickDemoAccess}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold transition-all border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>我是商戶本人（一鍵授權進入後台）</span>
          </button>
        </form>
      </div>
    </div>
  );
};
