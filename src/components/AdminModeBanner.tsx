import React from 'react';
import { ShieldCheck, Plus, Eye, LogOut, Upload, Settings } from 'lucide-react';

interface AdminModeBannerProps {
  onOpenWorkbench: () => void;
  onSwitchToCustomerView: () => void;
  onLogoutAdmin: () => void;
}

export const AdminModeBanner: React.FC<AdminModeBannerProps> = ({
  onOpenWorkbench,
  onSwitchToCustomerView,
  onLogoutAdmin,
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-sky-500/20 border-b border-amber-500/40 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-200 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="font-bold text-amber-300 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>商戶管理員模式 (Admin Active)</span>
        </span>
        <span className="hidden md:inline text-slate-400 text-[11px]">
          — 當前正處於後台管理狀態，您可以自選上傳本地圖片、發布新商品或更換實拍圖
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenWorkbench}
          className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow flex items-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-3 h-3" />
          <span>管理商品 / 上傳圖片</span>
        </button>

        <button
          onClick={onSwitchToCustomerView}
          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          title="切換到普通用戶視角，驗證用戶看到的前台"
        >
          <Eye className="w-3 h-3 text-sky-400" />
          <span>切換為用戶前台視角</span>
        </button>

        <button
          onClick={onLogoutAdmin}
          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
          title="退出管理員模式"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
