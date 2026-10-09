import React, { useState, useEffect } from 'react';
import { PackExpansion, SupportedLanguage } from '../types';
import { PACK_INFO } from '../data/cardsData';

interface PackExpansionLogoProps {
  packKey: PackExpansion | string;
  lang: SupportedLanguage;
  className?: string;
  altText?: string;
}

export const PackExpansionLogo: React.FC<PackExpansionLogoProps> = ({
  packKey,
  lang,
  className = 'h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[170px] object-contain',
  altText,
}) => {
  const [errorStep, setErrorStep] = useState<number>(0);

  // Reset error when pack or language changes
  useEffect(() => {
    setErrorStep(0);
  }, [packKey, lang]);

  const code =
    packKey === 'PROMO-A' || packKey === 'P-A'
      ? 'PROMO-A'
      : packKey === 'PROMO-B' || packKey === 'P-B'
      ? 'PROMO-B'
      : packKey;

  // Map app languages to official set image locale code
  let primaryLocale = 'en_US';
  if (lang === 'zh-Hant') {
    primaryLocale = 'zh_TW';
  } else if (lang === 'ja') {
    primaryLocale = 'ja_JP';
  } else if (lang === 'ko') {
    primaryLocale = 'ko_KR';
  } else if (lang === 'fr') {
    primaryLocale = 'fr_FR';
  } else if (lang === 'de') {
    primaryLocale = 'de_DE';
  } else if (lang === 'es') {
    primaryLocale = 'es_ES';
  } else if (lang === 'it') {
    primaryLocale = 'it_IT';
  } else if (lang === 'pt') {
    primaryLocale = 'pt_BR';
  }

  // Sets that only have en_US in the asset repository
  const enOnlySets = ['B1a', 'B2', 'B2a', 'B2b', 'B3', 'B3a', 'B3b', 'B4', 'B4a'];
  if (enOnlySets.includes(code)) {
    primaryLocale = 'en_US';
  }

  const primaryUrl = `https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/sets/LOGO_expansion_${code}_${primaryLocale}.webp`;
  const fallbackUrl = `https://raw.githubusercontent.com/glassgrass-art/tcg-pocket-api/main/dist/images/sets/LOGO_expansion_${code}_en_US.webp`;

  const packMeta = PACK_INFO[packKey as PackExpansion];

  if (errorStep >= 2) {
    // Both localized and EN fallback failed, render neat gradient pill
    return (
      <div
        className={`px-2.5 py-1 rounded-lg font-black text-xs sm:text-sm tracking-wider bg-gradient-to-r ${
          packMeta?.themeColor || 'from-sky-600 to-indigo-600'
        } text-white shadow-sm flex items-center gap-1.5`}
      >
        <span>{packMeta?.icon || '📦'}</span>
        <span>{code}</span>
      </div>
    );
  }

  return (
    <img
      src={errorStep === 0 ? primaryUrl : fallbackUrl}
      alt={altText || `${code} Logo`}
      className={`${className} drop-shadow-md transition-opacity duration-200`}
      loading="lazy"
      onError={() => {
        setErrorStep((prev) => prev + 1);
      }}
    />
  );
};
