import { PokemonCard, Rarity, EnergyType, PackExpansion, TrainerCategory } from '../types';
import tcgpCards from './tcgpCardsDatabase.json';

export const RARITY_INFO: Record<
  Rarity,
  { label: string; symbol: string; tier: number; nameCn: string; color: string; bgBadge: string }
> = {
  '1D': { label: '◊', symbol: '◊', tier: 1, nameCn: '一菱', color: 'text-amber-400', bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  '2D': { label: '◊◊', symbol: '◊◊', tier: 2, nameCn: '二菱', color: 'text-amber-400', bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  '3D': { label: '◊◊◊', symbol: '◊◊◊', tier: 3, nameCn: '三菱', color: 'text-amber-300', bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  '4D': { label: '◊◊◊◊ EX', symbol: '◊◊◊◊', tier: 4, nameCn: '四菱 EX', color: 'text-yellow-300 font-bold', bgBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
  '1S': { label: '☆', symbol: '☆', tier: 5, nameCn: '一星 全图', color: 'text-sky-400', bgBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  '2S': { label: '☆☆', symbol: '☆☆', tier: 6, nameCn: '二星 特画SAR', color: 'text-indigo-400 font-bold', bgBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  '3S': { label: '☆☆☆', symbol: '☆☆☆', tier: 7, nameCn: '三星 沉浸卡', color: 'text-fuchsia-400 font-black', bgBadge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50' },
  '1RS': { label: '🌟', symbol: '🌟', tier: 5.5, nameCn: '一彩星', color: 'text-amber-300 font-bold', bgBadge: 'bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-sky-500/20 text-amber-300 border-amber-400/40' },
  '2RS': { label: '🌟🌟', symbol: '🌟🌟', tier: 6.5, nameCn: '二彩星', color: 'text-pink-300 font-bold', bgBadge: 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-sky-500/20 text-pink-300 border-pink-400/40' },
  'CR': { label: '👑', symbol: '👑', tier: 8, nameCn: '皇冠稀有', color: 'text-amber-300 font-black', bgBadge: 'bg-amber-400/25 text-amber-300 border-amber-400/60 shadow-amber-400/20 shadow-sm' },
};

export const TRAINER_CATEGORY_INFO: Record<
  TrainerCategory,
  { nameCn: string; nameEn: string; icon: string; color: string; bgBadge: string }
> = {
  supporter: { nameCn: '支持者', nameEn: 'Supporter', icon: '👤', color: 'text-amber-400', bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  item: { nameCn: '物品', nameEn: 'Item', icon: '🎒', color: 'text-sky-400', bgBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  tool: { nameCn: '宝可梦道具', nameEn: 'Tool', icon: '🛡️', color: 'text-purple-400', bgBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  stadium: { nameCn: '竞技场', nameEn: 'Stadium', icon: '🏟️', color: 'text-emerald-400', bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
};

export const PACK_INFO: Record<
  PackExpansion,
  { nameCn: string; nameEn: string; icon: string; themeColor: string; series: 'A' | 'B' | 'PROMO' }
> = {
  'A1': { nameCn: '最强基因', nameEn: 'Genetic Apex', icon: '🧬', themeColor: 'from-amber-600 to-orange-600', series: 'A' },
  'A1a': { nameCn: '梦幻之岛', nameEn: 'Mythical Island', icon: '🌸', themeColor: 'from-pink-500 to-rose-500', series: 'A' },
  'A2': { nameCn: '时空激斗', nameEn: 'Space-Time Smackdown', icon: '⏳', themeColor: 'from-cyan-600 to-blue-600', series: 'A' },
  'A2a': { nameCn: '光辉凯旋', nameEn: 'Triumphant Light', icon: '✨', themeColor: 'from-amber-400 to-yellow-600', series: 'A' },
  'A2b': { nameCn: '闪耀盛宴', nameEn: 'Shining Revelry', icon: '🌟', themeColor: 'from-yellow-400 to-orange-500', series: 'A' },
  'A3': { nameCn: '苍穹守卫者', nameEn: 'Celestial Guardians', icon: '☀️', themeColor: 'from-orange-500 to-indigo-600', series: 'A' },
  'A3a': { nameCn: '异次元危机', nameEn: 'Extradimensional Crisis', icon: '💎', themeColor: 'from-blue-600 to-indigo-800', series: 'A' },
  'A3b': { nameCn: '伊布乐园', nameEn: 'Eevee Grove', icon: '🦊', themeColor: 'from-amber-600 to-orange-400', series: 'A' },
  'A4': { nameCn: '海天之智', nameEn: 'Wisdom of Sea and Sky', icon: '🌊', themeColor: 'from-sky-600 to-blue-700', series: 'A' },
  'A4a': { nameCn: '隐秘之泉', nameEn: 'Secluded Springs', icon: '💧', themeColor: 'from-teal-600 to-cyan-700', series: 'A' },
  'A4b': { nameCn: '豪华卡包: ex', nameEn: 'Deluxe Pack: ex', icon: '👑', themeColor: 'from-amber-500 to-red-600', series: 'A' },
  'B1': { nameCn: '超级进化觉醒', nameEn: 'Mega Rising', icon: '🐉', themeColor: 'from-emerald-600 to-green-700', series: 'B' },
  'B1a': { nameCn: '绯红烈火', nameEn: 'Crimson Blaze', icon: '🔥', themeColor: 'from-red-600 to-rose-700', series: 'B' },
  'B2': { nameCn: '梦幻大巡游', nameEn: 'Fantastical Parade', icon: '🎪', themeColor: 'from-pink-600 to-indigo-600', series: 'B' },
  'B2a': { nameCn: '帕底亚奇迹', nameEn: 'Paldean Wonders', icon: '🏜️', themeColor: 'from-violet-600 to-amber-600', series: 'B' },
  'B3': { nameCn: '波动气场', nameEn: 'Pulsing Aura', icon: '💥', themeColor: 'from-blue-600 to-cyan-600', series: 'B' },
  'B3a': { nameCn: '悖谬引擎', nameEn: 'Paradox Drive', icon: '⚡', themeColor: 'from-fuchsia-600 to-purple-800', series: 'B' },
  'B4': { nameCn: '天空统治者', nameEn: 'Ruler of Skies', icon: '🌪️', themeColor: 'from-teal-500 to-sky-700', series: 'B' },
  'B4a': { nameCn: '火箭队野望', nameEn: "Team Rocket's Ambition", icon: '🚀', themeColor: 'from-zinc-700 to-red-800', series: 'B' },
  'PROMO-A': { nameCn: '特典卡 · Promo-A', nameEn: 'Promo-A Set', icon: '🎁', themeColor: 'from-emerald-600 to-teal-600', series: 'PROMO' },
  'PROMO-B': { nameCn: '特典卡 · Promo-B', nameEn: 'Promo-B Set', icon: '🎀', themeColor: 'from-fuchsia-600 to-pink-600', series: 'PROMO' },
};

export const POKEMON_ENERGY_TYPES: EnergyType[] = [
  'grass',
  'fire',
  'water',
  'lightning',
  'psychic',
  'fighting',
  'darkness',
  'metal',
  'colorless',
];

export const ENERGY_ICONS: Record<EnergyType, string> = {
  grass: '🌿',
  fire: '🔥',
  water: '💧',
  lightning: '⚡',
  psychic: '👁️',
  fighting: '👊',
  darkness: '🌑',
  metal: '⚙️',
  colorless: '⭐',
  trainer: '👤',
};

export const ENERGY_INFO: Record<EnergyType, { nameCn: string; color: string; bg: string; border: string }> = {
  grass: { nameCn: '草属性', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' },
  fire: { nameCn: '火属性', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40' },
  water: { nameCn: '水属性', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40' },
  lightning: { nameCn: '雷属性', color: 'text-amber-300', bg: 'bg-amber-400/15', border: 'border-amber-400/40' },
  psychic: { nameCn: '超能属性', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/40' },
  fighting: { nameCn: '斗属性', color: 'text-amber-600', bg: 'bg-amber-700/15', border: 'border-amber-700/40' },
  darkness: { nameCn: '恶属性', color: 'text-slate-300', bg: 'bg-slate-700/20', border: 'border-slate-600/40' },
  metal: { nameCn: '钢属性', color: 'text-zinc-300', bg: 'bg-zinc-600/20', border: 'border-zinc-500/40' },
  colorless: { nameCn: '一般属性', color: 'text-stone-300', bg: 'bg-stone-500/15', border: 'border-stone-500/40' },
  trainer: { nameCn: '训练家卡', color: 'text-cyan-300', bg: 'bg-cyan-500/15', border: 'border-cyan-500/40' },
};

export const CARDS_DATABASE: PokemonCard[] = (tcgpCards as unknown as PokemonCard[]).map((card) => {
  let exp = card.expansionCode;
  if (exp === 'P-A' || card.pack === 'PROMO-A' || card.id.startsWith('PROMO-A') || card.id.startsWith('P-A')) {
    exp = 'PROMO-A';
  } else if (exp === 'P-B' || card.pack === 'PROMO-B' || card.id.startsWith('PROMO-B') || card.id.startsWith('P-B')) {
    exp = 'PROMO-B';
  } else if (!exp && (card.id.startsWith('PROMO') || card.id.startsWith('P-'))) {
    exp = 'PROMO-A';
  }
  return {
    ...card,
    imageUrl: card.imageUrl || (card as unknown as { image?: string }).image,
    image: (card as unknown as { image?: string }).image || card.imageUrl,
    pack: (exp || 'A1') as PackExpansion,
    expansionCode: exp || 'A1',
  };
});

export const CARD_MAP = new Map<string, PokemonCard>(
  CARDS_DATABASE.map((card) => [card.id, card])
);
