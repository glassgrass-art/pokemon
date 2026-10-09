import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, PokemonCard, Rarity, EnergyType, PackExpansion, TrainerCategory } from '../types';
import {
  SUPPORTED_LANGUAGES,
  UI_TRANSLATIONS,
  PACK_TRANSLATIONS,
  RARITY_TRANSLATIONS,
  ENERGY_TRANSLATIONS,
  getTrainerCategoryName as getTrainerCategoryNameUtil,
  getCardName as getCardNameUtil,
  getCardImageUrl as getCardImageUrlUtil,
} from '../utils/i18n';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  cardArtLanguage: SupportedLanguage | 'auto';
  setCardArtLanguage: (lang: SupportedLanguage | 'auto') => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  getCardName: (card: PokemonCard) => string;
  getCardImageUrl: (card: PokemonCard, quality?: 'high' | 'low', specificLang?: SupportedLanguage) => string;
  getPackName: (pack: PackExpansion) => string;
  getRarityName: (rarity: Rarity) => string;
  getEnergyName: (type: EnergyType) => string;
  getTrainerCategoryName: (category: TrainerCategory) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'ptcg_pocket_app_lang';
const ART_LANG_KEY = 'ptcg_pocket_app_art_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh-Hans') {
        localStorage.setItem(STORAGE_KEY, 'zh-Hant');
        return 'zh-Hant';
      }
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved as SupportedLanguage;
      }
      // Detect browser language
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith('zh')) return 'zh-Hant';
      if (navLang.startsWith('ja')) return 'ja';
      if (navLang.startsWith('ko')) return 'ko';
      if (navLang.startsWith('fr')) return 'fr';
      if (navLang.startsWith('de')) return 'de';
      if (navLang.startsWith('es')) return 'es';
      if (navLang.startsWith('it')) return 'it';
      if (navLang.startsWith('pt')) return 'pt';
    } catch {}
    return 'zh-Hant';
  });

  const [cardArtLanguage, setCardArtLanguageState] = useState<SupportedLanguage | 'auto'>(() => {
    try {
      const saved = localStorage.getItem(ART_LANG_KEY);
      if (saved === 'zh-Hans') {
        localStorage.setItem(ART_LANG_KEY, 'zh-Hant');
        return 'zh-Hant';
      }
      if (saved === 'auto' || (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved))) {
        return saved as SupportedLanguage | 'auto';
      }
    } catch {}
    return 'auto';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const setCardArtLanguage = (lang: SupportedLanguage | 'auto') => {
    setCardArtLanguageState(lang);
    try {
      localStorage.setItem(ART_LANG_KEY, lang);
    } catch {}
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS['zh-Hant'];
    let text = dict[key] || UI_TRANSLATIONS['en']?.[key] || UI_TRANSLATIONS['zh-Hant']?.[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  const getCardName = (card: PokemonCard): string => {
    return getCardNameUtil(card, currentLanguage);
  };

  const getCardImageUrl = (
    card: PokemonCard,
    quality: 'high' | 'low' = 'high',
    specificLang?: SupportedLanguage
  ): string => {
    const effectiveLang = specificLang || (cardArtLanguage === 'auto' ? currentLanguage : cardArtLanguage);
    return getCardImageUrlUtil(card, effectiveLang, quality);
  };

  const getPackName = (pack: PackExpansion): string => {
    return PACK_TRANSLATIONS[pack]?.[currentLanguage] || PACK_TRANSLATIONS[pack]?.['zh-Hant'] || pack;
  };

  const getRarityName = (rarity: Rarity): string => {
    return RARITY_TRANSLATIONS[rarity]?.[currentLanguage] || RARITY_TRANSLATIONS[rarity]?.['zh-Hant'] || rarity;
  };

  const getEnergyName = (type: EnergyType): string => {
    return ENERGY_TRANSLATIONS[type]?.[currentLanguage] || ENERGY_TRANSLATIONS[type]?.['zh-Hant'] || type;
  };

  const getTrainerCategoryName = (category: TrainerCategory): string => {
    return getTrainerCategoryNameUtil(category, currentLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        cardArtLanguage,
        setCardArtLanguage,
        t,
        getCardName,
        getCardImageUrl,
        getPackName,
        getRarityName,
        getEnergyName,
        getTrainerCategoryName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
