import React from 'react';
import { Rarity } from '../types';

export const RARITY_IMAGE_URLS = {
  diamond: 'https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/rarities/diamond.webp',
  star: 'https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/rarities/star.webp',
  shinyStar: 'https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/rarities/shiny-star.webp',
  crown: 'https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/rarities/crown.webp',
};

export interface RarityConfig {
  type: 'diamond' | 'star' | 'shinyStar' | 'crown';
  count: number;
  labelCn: string;
  labelEn: string;
  symbol: string;
}

export const RARITY_DETAILS: Record<Rarity, RarityConfig> = {
  '1D': { type: 'diamond', count: 1, labelCn: '一菱', labelEn: '1 Diamond', symbol: '◊' },
  '2D': { type: 'diamond', count: 2, labelCn: '二菱', labelEn: '2 Diamonds', symbol: '◊◊' },
  '3D': { type: 'diamond', count: 3, labelCn: '三菱', labelEn: '3 Diamonds', symbol: '◊◊◊' },
  '4D': { type: 'diamond', count: 4, labelCn: '四菱', labelEn: '4 Diamonds (ex)', symbol: '◊◊◊◊' },
  '1S': { type: 'star', count: 1, labelCn: '一星', labelEn: '1 Star (AR)', symbol: '☆' },
  '2S': { type: 'star', count: 2, labelCn: '二星', labelEn: '2 Stars (SAR)', symbol: '☆☆' },
  '3S': { type: 'star', count: 3, labelCn: '三星', labelEn: '3 Stars (Immersive)', symbol: '☆☆☆' },
  '1RS': { type: 'shinyStar', count: 1, labelCn: '一彩星', labelEn: '1 Shiny Star', symbol: '🌟' },
  '2RS': { type: 'shinyStar', count: 2, labelCn: '二彩星', labelEn: '2 Shiny Stars', symbol: '🌟🌟' },
  'CR': { type: 'crown', count: 1, labelCn: '皇冠', labelEn: 'Crown Rare', symbol: '👑' },
};

interface RarityBadgeProps {
  rarity: Rarity | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({
  rarity,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const config = RARITY_DETAILS[rarity as Rarity] || RARITY_DETAILS['1D'];
  const iconUrl = RARITY_IMAGE_URLS[config.type];

  // Size configurations
  const iconSizeClasses = {
    xs: 'h-2.5 w-auto object-contain',
    sm: 'h-3.5 w-auto object-contain',
    md: 'h-4 w-auto object-contain',
    lg: 'h-5 w-auto object-contain',
  };

  const gapClasses = {
    xs: 'gap-0.5',
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1',
  };

  return (
    <span
      className={`inline-flex items-center ${gapClasses[size]} select-none ${className}`}
      title={`${config.labelCn} · ${config.labelEn}`}
    >
      {Array.from({ length: config.count }).map((_, idx) => (
        <img
          key={idx}
          src={iconUrl}
          alt={config.labelCn}
          className={`${iconSizeClasses[size]} drop-shadow-sm`}
          loading="lazy"
          onError={(e) => {
            // Fallback to text symbol if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ))}
      {showLabel && (
        <span className="text-xs font-semibold ml-1 text-slate-300">
          {config.labelCn}
        </span>
      )}
    </span>
  );
};
