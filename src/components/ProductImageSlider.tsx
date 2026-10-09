import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Star, Layers, Sparkles } from 'lucide-react';

interface ProductImageSliderProps {
  images: string[];
  labels?: string[];
  title: string;
  affiliateUrl: string;
  rating: number;
  reviewCount: number;
  displayPrice: string;
  isJa?: boolean;
  isZh?: boolean;
}

export const ProductImageSlider: React.FC<ProductImageSliderProps> = ({
  images,
  labels,
  title,
  affiliateUrl,
  rating,
  reviewCount,
  displayPrice,
  isJa,
  isZh,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  const cleanImages = images && images.length > 0 ? images : ['/src/assets/images/real_snorlax_mug.jpg'];
  const hasMultiple = cleanImages.length > 1;

  // Scroll to index
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const targetLeft = container.clientWidth * index;
    isProgrammaticScroll.current = true;
    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
    setCurrentIndex(index);
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextIdx = currentIndex === 0 ? cleanImages.length - 1 : currentIndex - 1;
    scrollToIndex(nextIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextIdx = currentIndex === cleanImages.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(nextIdx);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    scrollToIndex(index);
  };

  const handleLabelClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    scrollToIndex(index);
  };

  // Sync scroll position with current index
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const width = container.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(container.scrollLeft / width);
      if (newIndex >= 0 && newIndex < cleanImages.length && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  const currentLabel = labels && labels[currentIndex] ? labels[currentIndex] : null;

  return (
    <div className="mb-4">
      {/* Clickable Image Showcase Link */}
      <a
        href={affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group/img block relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 cursor-pointer shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400 select-none"
        title={isJa ? `${title} の商品詳細ページへ` : isZh ? `點擊直達《${title}》商品詳情頁` : `View details for ${title}`}
      >
        {/* Horizontal Scroll Snap Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {cleanImages.map((imgSrc, idx) => (
            <div
              key={idx}
              className="w-full h-full flex-shrink-0 snap-center relative overflow-hidden"
            >
              <img
                src={imgSrc}
                alt={`${title} - ${idx + 1}`}
                className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover/img:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = '/src/assets/images/real_jazwares_gengar_front.jpg';
                }}
              />
            </div>
          ))}
        </div>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent pointer-events-none" />

        {/* Variant Indicator Badge (Top Left) */}
        {hasMultiple && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-md border border-amber-400/50 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-lg">
              <Layers className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {currentLabel || `${currentIndex + 1} / ${cleanImages.length}`}
              </span>
            </span>
          </div>
        )}

        {/* Scroll / Swipe Indicator (Top Right) */}
        {hasMultiple && (
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10 pointer-events-auto bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/80 text-[10px] text-slate-300">
            <span className="text-[10px] text-amber-400 font-mono font-bold mr-0.5">
              {currentIndex + 1}/{cleanImages.length}
            </span>
            <div className="flex items-center gap-0.5">
              {cleanImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  className={`rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-3 h-1.5 bg-amber-400 shadow-sm'
                      : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                  title={`Switch to image ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Left Arrow Button */}
        {hasMultiple && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/90 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-slate-700/80 flex items-center justify-center transition-all opacity-85 sm:opacity-0 group-hover/img:opacity-100 shadow-xl backdrop-blur-sm active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Arrow Button */}
        {hasMultiple && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/90 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-slate-700/80 flex items-center justify-center transition-all opacity-85 sm:opacity-0 group-hover/img:opacity-100 shadow-xl backdrop-blur-sm active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Hover Amazon Click Prompt */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-slate-950/30 backdrop-blur-[1px] pointer-events-none">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xl transform translate-y-1 group-hover/img:translate-y-0 transition-transform">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>{isJa ? '商品ページを見る ↗' : isZh ? '直達商品詳情頁 ↗' : 'View Product Details ↗'}</span>
          </span>
        </div>

        {/* Floating Rating and Price */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs pointer-events-none z-10">
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-700/60 text-amber-300 font-bold shadow-md">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
            <span className="text-[10px] text-slate-400">({reviewCount.toLocaleString()}+)</span>
          </div>
          <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-slate-700/60 text-emerald-400 font-black tracking-tight shadow-md">
            {displayPrice}
          </div>
        </div>
      </a>

      {/* Clickable Variant Style Chips (e.g. Snorlax / Gengar / Pikachu) */}
      {hasMultiple && labels && labels.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
          <span className="text-slate-500 font-medium shrink-0 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            {isJa ? '選択:' : isZh ? '款式預覽:' : 'Style:'}
          </span>
          {labels.map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => handleLabelClick(e, idx)}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                currentIndex === idx
                  ? 'bg-amber-400 text-slate-950 shadow-sm border border-amber-300'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
