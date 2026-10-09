import { CoffeeSupporter } from '../types';

const SUPPORTERS_STORAGE_KEY = 'ptcgp_coffee_supporters_v1';
const CUSTOM_HANDLE_KEY = 'ptcgp_coffee_custom_handle_v1';

export const DEFAULT_HANDLE = 'pokepocket';

export function getCoffeeHandle(): string {
  try {
    const saved = localStorage.getItem(CUSTOM_HANDLE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {}
  return DEFAULT_HANDLE;
}

export function setCoffeeHandle(rawInput: string): string {
  try {
    let clean = rawInput.trim();
    // Support full URL or handle
    clean = clean.replace(/^https?:\/\/(www\.)?(ko-fi|buymeacoffee)\.com\//i, '');
    clean = clean.replace(/\/.*$/, '').trim();
    const finalHandle = clean || DEFAULT_HANDLE;
    localStorage.setItem(CUSTOM_HANDLE_KEY, finalHandle);
    return finalHandle;
  } catch {
    return DEFAULT_HANDLE;
  }
}

export function getCoffeeUrl(): string {
  const handle = getCoffeeHandle();
  if (handle.startsWith('http')) return handle;
  return `https://ko-fi.com/${handle}`;
}

export const INITIAL_SUPPORTERS: CoffeeSupporter[] = [
  {
    id: 'sup-001',
    name: 'Satoshi_JP (サトシ)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
    cups: 3,
    amount: '$9',
    message: '海外のトレーダーとも同階トレードできて最高です！応援してます！☕',
    date: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
    badge: '☕☕☕ Master Supporter',
  },
  {
    id: 'sup-002',
    name: 'Alex @ PokeTCG',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60',
    cups: 2,
    amount: '$6',
    message: 'Best PTCG Pocket companion app by far. Clean UI, accurate card IDs, zero ads. Keep it up!',
    date: Date.now() - 1000 * 60 * 60 * 20, // 20 hours ago
    badge: '☕☕ Super Supporter',
  },
  {
    id: 'sup-003',
    name: 'Minji_Seoul (민지)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60',
    cups: 2,
    amount: '$6',
    message: '포켓몬 카드 스캐너 진짜 빨라요! 개발자님 파이팅입니다!',
    date: Date.now() - 1000 * 60 * 60 * 42, // 1.7 days ago
    badge: '☕☕ Super Supporter',
  },
  {
    id: 'sup-004',
    name: 'Lucas (PokeCollector)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
    cups: 3,
    amount: '$9',
    message: 'Helped me complete genetic apex pack in 3 days with instant trade matching. Awesome work!',
    date: Date.now() - 1000 * 60 * 60 * 68, // ~3 days ago
    badge: '☕☕☕ Master Supporter',
  },
];

export function loadCoffeeSupporters(): CoffeeSupporter[] {
  try {
    const raw = localStorage.getItem(SUPPORTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load supporters from localStorage:', e);
  }
  return INITIAL_SUPPORTERS;
}

export function saveCoffeeSupporter(supporter: CoffeeSupporter): CoffeeSupporter[] {
  try {
    const current = loadCoffeeSupporters();
    const updated = [supporter, ...current];
    localStorage.setItem(SUPPORTERS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save supporter:', e);
    return [supporter, ...INITIAL_SUPPORTERS];
  }
}
