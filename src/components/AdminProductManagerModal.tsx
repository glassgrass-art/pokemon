import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  Edit3,
  ExternalLink,
  Layers,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Settings2,
  Tag,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { ShopProduct, getAffiliateConfig, saveAffiliateConfig, AffiliateConfig } from '../data/shopData';
import { processUploadedImageFile } from '../utils/imageUploadHelper';
import {
  loadCustomProducts,
  saveCustomProducts,
  loadProductOverrides,
  saveProductOverrides,
  ProductOverride,
} from '../utils/merchantStorage';

interface AdminProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsUpdated: () => void;
  onSwitchToCustomerView: () => void;
  allProducts: ShopProduct[];
  initialEditProductId?: string | null;
}

export const AdminProductManagerModal: React.FC<AdminProductManagerModalProps> = ({
  isOpen,
  onClose,
  onProductsUpdated,
  onSwitchToCustomerView,
  allProducts,
  initialEditProductId,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'settings'>('manage');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New product form state
  const [newTitleZh, setNewTitleZh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newPrice, setNewPrice] = useState('$24.99');
  const [newOriginalPrice, setNewOriginalPrice] = useState('$29.99');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newAsin, setNewAsin] = useState('');
  const [newCategory, setNewCategory] = useState<'merchandise' | 'lifestyle_lighting' | 'desk_mat' | 'digital_gear' | 'home_plush'>('merchandise');
  const [newDiscountTip, setNewDiscountTip] = useState('⚡ 美亞正品現貨 · 官方授權正版');
  const [newDesc, setNewDesc] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newGalleryLabels, setNewGalleryLabels] = useState<string[]>([]);

  // Editing existing product state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editGalleryLabels, setEditGalleryLabels] = useState<string[]>([]);
  const [editSearchQuery, setEditSearchQuery] = useState('');

  // Affiliate config state
  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>(() => getAffiliateConfig());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Handle uploading files for NEW product
  const handleUploadNewImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);
    try {
      const addedDataUrls: string[] = [];
      const addedLabels: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await processUploadedImageFile(file);
        addedDataUrls.push(dataUrl);
        // Default label name based on file or counter
        const baseName = file.name.replace(/\.[^/.]+$/, '').slice(0, 15);
        addedLabels.push(`款式 ${newImages.length + i + 1} (${baseName})`);
      }
      setNewImages((prev) => [...prev, ...addedDataUrls]);
      setNewGalleryLabels((prev) => [...prev, ...addedLabels]);
      showToast(`成功導入 ${files.length} 張本地高畫質圖片！`);
    } catch (err: any) {
      alert(`圖片上傳失敗: ${err?.message || '請確認格式為圖片'}`);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle uploading files for EDITING product
  const handleUploadEditImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);
    try {
      const addedDataUrls: string[] = [];
      const addedLabels: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await processUploadedImageFile(file);
        addedDataUrls.push(dataUrl);
        const baseName = file.name.replace(/\.[^/.]+$/, '').slice(0, 15);
        addedLabels.push(`款式 ${editImages.length + i + 1} (${baseName})`);
      }
      setEditImages((prev) => [...prev, ...addedDataUrls]);
      setEditGalleryLabels((prev) => [...prev, ...addedLabels]);
      showToast(`成功追加 ${files.length} 張新圖片！`);
    } catch (err: any) {
      alert(`圖片上傳失敗: ${err?.message || '請確認格式為圖片'}`);
    } finally {
      setIsProcessingImage(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  // Add external image URL
  const handleAddImageUrl = (url: string, isEdit = false) => {
    if (!url.trim()) return;
    if (isEdit) {
      setEditImages((prev) => [...prev, url.trim()]);
      setEditGalleryLabels((prev) => [...prev, `圖片 ${prev.length + 1}`]);
    } else {
      setNewImages((prev) => [...prev, url.trim()]);
      setNewGalleryLabels((prev) => [...prev, `圖片 ${prev.length + 1}`]);
    }
    showToast('圖片鏈接已加入');
  };

  // Save NEW custom product
  const handleSaveNewProduct = () => {
    if (!newTitleZh.trim()) {
      alert('請填寫商品中文名稱');
      return;
    }
    if (newImages.length === 0) {
      alert('請至少上傳一張商品圖片');
      return;
    }

    const customId = `custom-us-${Date.now()}`;
    const newProd: ShopProduct = {
      id: customId,
      asin: newAsin.trim() || undefined,
      regions: ['us'],
      name: newTitleZh.trim(),
      nameEn: newTitleEn.trim() || newTitleZh.trim(),
      category: newCategory,
      price: newPrice.trim().startsWith('$') ? newPrice.trim() : `$${newPrice.trim()}`,
      originalPrice: newOriginalPrice.trim() ? (newOriginalPrice.trim().startsWith('$') ? newOriginalPrice.trim() : `$${newOriginalPrice.trim()}`) : undefined,
      discountTip: newDiscountTip.trim() || '⚡ 美亞官方正品推薦',
      rating: 4.8,
      reviewCount: 360,
      badge: '商戶自選新品',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      desc: newDesc.trim() || '美亞官方正版熱銷精選周邊，高品質保障，直郵到府。',
      descEn: 'Curated official Pokémon merchandise from Amazon US.',
      features: ['美亞官方正品保證', '支持多款式左右滑動預覽', '現貨速發品質保障'],
      featuresEn: ['Official Amazon US merchandise', 'Multiple style previews available', 'Fast shipping quality guaranteed'],
      imageUrl: newImages[0],
      images: newImages,
      galleryLabels: newGalleryLabels,
      platform: 'Amazon',
      targetUrl: newTargetUrl.trim() || (newAsin.trim() ? `https://www.amazon.com/dp/${newAsin.trim()}?tag=${affiliateConfig.amazonTag || 'ptcgpocket-20'}` : 'https://www.amazon.com?tag=ptcgpocket-20'),
      affiliateParamType: 'amazon',
    };

    const currentCustom = loadCustomProducts();
    saveCustomProducts([newProd, ...currentCustom]);
    onProductsUpdated();

    // Reset form
    setNewTitleZh('');
    setNewTitleEn('');
    setNewPrice('$24.99');
    setNewOriginalPrice('$29.99');
    setNewTargetUrl('');
    setNewAsin('');
    setNewDesc('');
    setNewImages([]);
    setNewGalleryLabels([]);

    showToast('🎉 新商品已成功發布到美亞商城！前台已可即時查看');
    setActiveTab('manage');
  };

  // Start editing existing product
  const startEditProduct = (prod: ShopProduct) => {
    if (!prod || !prod.id) return;
    setEditingProductId(prod.id);
    const existingImages = prod.images && Array.isArray(prod.images) && prod.images.length > 0
      ? [...prod.images]
      : (prod.imageUrl ? [prod.imageUrl] : []);
    const existingLabels = prod.galleryLabels && Array.isArray(prod.galleryLabels) && prod.galleryLabels.length > 0
      ? [...prod.galleryLabels]
      : existingImages.map((_, i) => `款式 ${i + 1}`);
    setEditImages(existingImages);
    setEditGalleryLabels(existingLabels);
  };

  const safeAllProducts = useMemo(() => {
    return (allProducts || []).filter((p): p is ShopProduct => !!p && typeof p === 'object' && !!p.id);
  }, [allProducts]);

  const usProducts = useMemo(() => {
    return safeAllProducts.filter((p) => !p.regions || p.regions.includes('us'));
  }, [safeAllProducts]);

  const filteredEditProducts = useMemo(() => {
    const q = (editSearchQuery || '').toLowerCase().trim();
    if (!q) return usProducts;
    return usProducts.filter((p) => {
      const matchZh = (p.name || '').toLowerCase().includes(q);
      const matchEn = (p.nameEn || '').toLowerCase().includes(q);
      const matchId = (p.id || '').toLowerCase().includes(q);
      return matchZh || matchEn || matchId;
    });
  }, [usProducts, editSearchQuery]);

  const overrides = useMemo(() => {
    try {
      return loadProductOverrides() || {};
    } catch {
      return {};
    }
  }, [isOpen, allProducts]);

  useEffect(() => {
    if (isOpen && initialEditProductId) {
      const prod = safeAllProducts.find((p) => p.id === initialEditProductId);
      if (prod) {
        setActiveTab('manage');
        startEditProduct(prod);
      }
    }
  }, [isOpen, initialEditProductId, safeAllProducts]);

  // Save changes to existing product
  const handleSaveEditProduct = (prod: ShopProduct) => {
    if (editImages.length === 0) {
      alert('請至少保留一張圖片');
      return;
    }

    const overrides = loadProductOverrides();
    overrides[prod.id] = {
      ...overrides[prod.id],
      imageUrl: editImages[0],
      images: editImages,
      galleryLabels: editGalleryLabels,
    };
    saveProductOverrides(overrides);

    // Also update if it was a custom product
    const customList = loadCustomProducts();
    const customIdx = customList.findIndex((p) => p.id === prod.id);
    if (customIdx !== -1) {
      customList[customIdx] = {
        ...customList[customIdx],
        imageUrl: editImages[0],
        images: editImages,
        galleryLabels: editGalleryLabels,
      };
      saveCustomProducts(customList);
    }

    onProductsUpdated();
    setEditingProductId(null);
    showToast(`✅ 已更新《${prod.name.slice(0, 12)}...》的實拍展示圖！`);
  };

  // Toggle hide product
  const toggleHideProduct = (prodId: string) => {
    const overrides = loadProductOverrides();
    const isHidden = !!overrides[prodId]?.hidden;
    overrides[prodId] = {
      ...overrides[prodId],
      hidden: !isHidden,
    };
    saveProductOverrides(overrides);
    onProductsUpdated();
    showToast(isHidden ? '商品已重新上架' : '商品已從前台隱藏');
  };

  // Reset product to default
  const resetProductOverride = (prodId: string) => {
    const overrides = loadProductOverrides();
    delete overrides[prodId];
    saveProductOverrides(overrides);

    // Also remove from custom products if custom
    const customList = loadCustomProducts().filter((p) => p.id !== prodId);
    saveCustomProducts(customList);

    onProductsUpdated();
    showToast('已重置為原始配置');
  };

  // Save affiliate configuration
  const handleSaveAffiliateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAffiliateConfig(affiliateConfig);
    onProductsUpdated();
    showToast('聯盟標籤與推廣參數已保存生效');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Management Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100">
                  商戶後台管理中心 (Merchant Admin Workbench)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  美區專用
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                此後台僅供管理員操作，可自選上傳本地圖片、發布新商品及配置美亞聯盟標籤
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToCustomerView}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="切換到純淨的普通用戶前台視角，驗證用戶看到的實際效果"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>以用戶前台視角預覽</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80 px-4 shrink-0 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'add'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>➕ 新增商品 & 上傳圖片</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'manage'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📦 管理現有商品 & 更換實拍圖 ({usProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>⚙️ 美亞聯盟 ID 與分佣設定</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ADD NEW PRODUCT & UPLOAD IMAGES */}
          {activeTab === 'add' && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>上傳商品圖片 (支持多圖輪播 & 款式標籤)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      您可以從本地電腦選擇 1 張或多張實拍圖片，系統會自動優化並生成多圖滑動輪播展示
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadNewImages(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingImage ? '正在優化上傳...' : '📁 選擇本地圖片上傳'}</span>
                  </button>
                </div>

                {/* Drag / Drop or Preview Area */}
                {newImages.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/50 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 flex items-center justify-center mx-auto mb-2 transition-all">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-300 group-hover:text-amber-300">
                      點擊此處選擇您電腦中的照片 (可同時選多張)
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      支持 JPG, PNG, WebP 高畫質圖片，自動生成多款式滑動預覽
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {newImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 p-1 flex flex-col gap-1.5"
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950">
                            <img
                              src={img}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-contain"
                            />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 shadow">
                                首圖
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setNewImages((prev) => prev.filter((_, i) => i !== idx));
                                setNewGalleryLabels((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                              title="刪除此圖"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Label input for this variant */}
                          <input
                            type="text"
                            value={newGalleryLabels[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewGalleryLabels((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                            placeholder={`款式 ${idx + 1} 名稱`}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Basic Info Form */}
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>商品基本資料</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      商品中文名稱 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitleZh}
                      onChange={(e) => setNewTitleZh(e.target.value)}
                      placeholder="例：Jazwares 寶可夢官方正版 12英寸超柔毛絨公仔"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      英文名稱 (English Title)
                    </label>
                    <input
                      type="text"
                      value={newTitleEn}
                      onChange={(e) => setNewTitleEn(e.target.value)}
                      placeholder="例：Pokémon Official 12-Inch Plush Figure"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        美亞商品直達鏈接 (Amazon Target URL)
                      </label>
                      {(newTargetUrl.trim() || newAsin.trim()) && (
                        <a
                          href={newTargetUrl.trim() || `https://www.amazon.com/dp/${newAsin.trim()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>打開該鏈接找圖 ↗</span>
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newTargetUrl}
                      onChange={(e) => setNewTargetUrl(e.target.value)}
                      placeholder="https://www.amazon.com/dp/..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      亞馬遜 ASIN (選填，如 B0F4GGF5Z8)
                    </label>
                    <input
                      type="text"
                      value={newAsin}
                      onChange={(e) => setNewAsin(e.target.value)}
                      placeholder="例：B0F4GGF5Z8"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      前台展示價格 ($)
                    </label>
                    <input
                      type="text"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="$22.99"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      劃線原價 ($)
                    </label>
                    <input
                      type="text"
                      value={newOriginalPrice}
                      onChange={(e) => setNewOriginalPrice(e.target.value)}
                      placeholder="$29.99"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      所屬商品分類
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="merchandise">🍜 官方正版餐具·保溫杯·馬克杯</option>
                      <option value="home_plush">🛋️ 毛絨玩偶·公仔·電競靠墊</option>
                      <option value="digital_gear">🎮 電競手把支架·發光手錶</option>
                      <option value="lifestyle_lighting">💡 LED 霓虹氛圍燈</option>
                      <option value="desk_mat">🖱️ 競技電競桌墊·滑鼠墊</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      優惠促銷標籤文字
                    </label>
                    <input
                      type="text"
                      value={newDiscountTip}
                      onChange={(e) => setNewDiscountTip(e.target.value)}
                      placeholder="⚡ 美亞正品 · 同一鏈接含多款可選"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    商品賣點介紹 (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="輸入商品特色描述..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNewProduct}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>立即發布此商品至美亞商城</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE EXISTING PRODUCTS & EDIT IMAGES */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-slate-400">
                  當前美亞商城共有 <span className="text-amber-400 font-bold">{usProducts.length}</span> 件商品。您可以點擊任何商品更換自己的實拍圖或自定義圖片：
                </p>
                <input
                  type="text"
                  value={editSearchQuery}
                  onChange={(e) => setEditSearchQuery(e.target.value)}
                  placeholder="搜索商品名稱..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48 sm:w-64"
                />
              </div>

              {/* Hidden Global File Input for Editing */}
              <input
                ref={editFileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadEditImages(e.target.files)}
              />

              {/* Product List Table / Grid with Inline Editing Accordion */}
              <div className="space-y-3">
                {filteredEditProducts.map((prod) => {
                  const isEditing = editingProductId === prod.id;
                  const isHidden = !!(prod?.id && overrides[prod.id]?.hidden);
                  const hasCustomOverride = !!(prod?.id && (overrides[prod.id] || prod.id.startsWith('custom-')));
                  const imageCount = isEditing ? editImages.length : (prod?.images?.length || 1);
                  const productUrl =
                    prod.targetUrl ||
                    (prod.asin
                      ? `https://www.amazon.com/dp/${prod.asin}`
                      : `https://www.amazon.com/s?k=${encodeURIComponent(prod.nameEn || prod.name)}`);

                  return (
                    <div
                      key={prod.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isEditing
                          ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/50'
                          : isHidden
                          ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Row: Basic Info & Action Buttons */}
                      <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 p-1 flex items-center justify-center">
                            {(isEditing && editImages[0]) ? (
                              <img
                                src={editImages[0]}
                                alt={prod.name || 'Product'}
                                className="w-full h-full object-contain"
                              />
                            ) : prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name || 'Product'}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=300&q=80';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-200 truncate">
                                {prod.name}
                              </span>
                              {hasCustomOverride && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  已自定義實拍圖
                                </span>
                              )}
                              {isHidden && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  已隱藏
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2.5 mt-1 font-mono flex-wrap">
                              <span className="text-emerald-400 font-bold">{prod.price}</span>
                              <span className="text-amber-300 font-semibold">{imageCount} 張展示圖</span>
                              {prod.asin && <span>ASIN: {prod.asin}</span>}
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-[11px] font-sans font-medium transition-colors"
                                title="直接開啟美亞商品頁面下載圖片"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>商品鏈接 / 下載圖片 ↗</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-sky-200 border border-sky-500/40 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            title="在新分頁開啟美亞商品頁，直接右鍵下載圖片"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                            <span className="hidden sm:inline">美亞原頁</span><span>找圖 ↗</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingProductId(null);
                              } else {
                                startEditProduct(prod);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                              isEditing
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700'
                            }`}
                            title="上傳或更換此商品的實拍圖"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{isEditing ? '收起編輯' : '更換/追加圖片'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleHideProduct(prod.id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs transition-all cursor-pointer"
                            title={isHidden ? '在前台重新顯示' : '在前台隱藏'}
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {hasCustomOverride && (
                            <button
                              type="button"
                              onClick={() => resetProductOverride(prod.id)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs transition-all cursor-pointer"
                              title="恢復預設狀態"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* INLINE EDITING ACCORDION DRAWER - Appears directly beneath this item */}
                      {isEditing && (
                        <div className="border-t border-slate-800 bg-slate-950/80 p-4 space-y-4 animate-fade-in">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                            <div>
                              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>正在為《{prod.name}》更換實拍圖</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                點擊「開啟美亞找圖」下載原品圖，保存後點擊右側按鈕上傳替換或追加
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-400/50 font-bold text-xs transition-all shadow flex items-center gap-1.5 cursor-pointer"
                                title="直接在新分頁開啟美亞商品頁面下載圖片"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                                <span>🌐 開啟美亞頁面下載圖片 ↗</span>
                              </a>

                              <button
                                type="button"
                                disabled={isProcessingImage}
                                onClick={() => editFileInputRef.current?.click()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isProcessingImage ? '正在優化上傳...' : '📁 選擇本地圖片上傳 (支持多選)'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Image Grid */}
                          <div className="space-y-2">
                            <label className="block text-[11px] font-semibold text-slate-400">
                              當前展示圖清單（前台輪播展示，可修改款式標籤）：
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {editImages.map((img, idx) => (
                                <div
                                  key={idx}
                                  className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700 p-1 flex flex-col gap-1.5 shadow-sm"
                                >
                                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950">
                                    <img src={img} alt={`Slide ${idx + 1}`} className="w-full h-full object-contain" />
                                    {idx === 0 && (
                                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 shadow">
                                        首圖 (Cover)
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditImages((prev) => prev.filter((_, i) => i !== idx));
                                        setEditGalleryLabels((prev) => prev.filter((_, i) => i !== idx));
                                      }}
                                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                                      title="刪除此圖"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={editGalleryLabels[idx] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditGalleryLabels((prev) => {
                                        const next = [...prev];
                                        next[idx] = val;
                                        return next;
                                      });
                                    }}
                                    placeholder={`款式 ${idx + 1} 標籤`}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Save & Cancel Row */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <span className="text-[11px] text-slate-400">
                              共 {editImages.length} 張圖片將生效至前台多圖滑動輪播中
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingProductId(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditProduct(prod)}
                                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>保存並生效</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AFFILIATE SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveAffiliateConfig} className="space-y-4 max-w-xl mx-auto">
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-amber-400" />
                  <span>亞馬遜美區聯盟設定 (Amazon Associates US)</span>
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    美亞推廣標籤 (Amazon US Associates Tag)
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.amazonTag || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, amazonTag: e.target.value })}
                    placeholder="ptcgpocket-20"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    前台所有美亞商品鏈接均會自動綁定此 Tag，用戶下單後即可在亞馬遜聯盟後台獲取返利統計。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    自定義商戶合作專屬促銷碼 (Promo Code)
                  </label>
                  <input
                    type="text"
                    value={affiliateConfig.customSellerPromoCode || ''}
                    onChange={(e) => setAffiliateConfig({ ...affiliateConfig, customSellerPromoCode: e.target.value })}
                    placeholder="如 POCKET2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存聯盟設定</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
