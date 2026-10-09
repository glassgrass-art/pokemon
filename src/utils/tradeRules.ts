import { PokemonCard, SupportedLanguage } from '../types';

/**
 * PTCG Pocket Official Trading Rules:
 * 1. Cards must be traded 1-to-1 with the EXACT same rarity (e.g., 1D for 1D, 4D for 4D, 1S for 1S).
 * 2. Promo cards (PROMO-A / P-A) are STRICTLY NON-TRADEABLE.
 * 3. 3-Star Immersive cards (☆☆☆ / 3S) are STRICTLY NON-TRADEABLE.
 */

export function isCardTradeable(card: PokemonCard | undefined | null): boolean {
  if (!card) return false;
  // All Promo cards (Promo-A and Promo-B) are strictly non-tradeable per rules
  if (
    card.expansionCode === 'P-A' ||
    card.expansionCode === 'P-B' ||
    card.expansionCode === 'PROMO-A' ||
    card.expansionCode === 'PROMO-B' ||
    card.pack === 'PROMO-A' ||
    card.pack === 'PROMO-B' ||
    card.id.startsWith('P-A-') ||
    card.id.startsWith('P-B-') ||
    card.id.startsWith('PROMO-A') ||
    card.id.startsWith('PROMO-B') ||
    card.id.startsWith('PROMO')
  ) {
    return false;
  }
  // 3-Star Immersive cards are non-tradeable
  if (card.rarity === '3S') {
    return false;
  }
  // Crown (CR), 1D-4D, 1S-2S, 1RS-2RS are all tradeable
  return true;
}

export function getCardTradeRestrictionReason(
  card: PokemonCard | undefined | null,
  lang: SupportedLanguage = 'zh-Hant'
): string | null {
  if (!card) return null;

  const isPromo =
    card.expansionCode === 'P-A' ||
    card.expansionCode === 'P-B' ||
    card.expansionCode === 'PROMO-A' ||
    card.expansionCode === 'PROMO-B' ||
    card.pack === 'PROMO-A' ||
    card.pack === 'PROMO-B' ||
    card.id.startsWith('P-A-') ||
    card.id.startsWith('P-B-') ||
    card.id.startsWith('PROMO-A') ||
    card.id.startsWith('PROMO-B') ||
    card.id.startsWith('PROMO');
  const isThreeStar = card.rarity === '3S';

  if (isPromo) {
    switch (lang) {
      case 'zh-Hant':
        return '特典卡包（Promo卡）依官方規則不可交換';
      case 'en':
        return 'Promo pack cards cannot be traded per official rules';
      case 'ja':
        return 'プロモカードは公式ルールにより交換できません';
      case 'ko':
        return '프로모 카드는 공식 규칙상 교환할 수 없습니다';
      case 'fr':
        return 'Les cartes Promo ne peuvent pas être échangées selon les règles';
      case 'de':
        return 'Promo-Karten können gemäß offiziellen Regeln nicht getauscht werden';
      case 'es':
        return 'Las cartas Promo no se peuvent pas échanger selon les règles officielles';
      case 'it':
        return 'Le carte promo non possono essere scambiate secondo le regole ufficiali';
      case 'pt':
        return 'Cartas Promo não podem ser trocadas segundo as regras oficiais';
      default:
        return '特典卡包（Promo卡）依官方規則不可交換';
    }
  }

  if (isThreeStar) {
    switch (lang) {
      case 'zh-Hant':
        return '3星沉浸特畫卡（☆☆☆）依官方規則不可交換';
      case 'en':
        return '3-Star Immersive cards (☆☆☆) cannot be traded per official rules';
      case 'ja':
        return '3つ星イマーシブカード（☆☆☆）は公式ルールにより交換できません';
      case 'ko':
        return '3성 이머시브 카드(☆☆☆)는 공식 규칙상 교환할 수 없습니다';
      case 'fr':
        return 'Les cartes Immersives 3 étoiles (☆☆☆) ne sont pas échangeables';
      case 'de':
        return '3-Sterne-Immersivkarten (☆☆☆) können nicht getauscht werden';
      case 'es':
        return 'Las cartas inmersivas de 3 estrellas (☆☆☆) no son intercambiables';
      case 'it':
        return 'Le carte immersive a 3 stelle (☆☆☆) non sono scambiabili';
      case 'pt':
        return 'Cartas imersivas de 3 estrelas (☆☆☆) não podem ser trocadas';
      default:
        return '3星沉浸特畫卡（☆☆☆）依官方規則不可交換';
    }
  }

  return null;
}

export function getTradeRestrictionReason(
  card: PokemonCard | undefined | null,
  lang: SupportedLanguage = 'zh-Hant'
): { title: string; description: string } | null {
  const desc = getCardTradeRestrictionReason(card, lang);
  if (!desc) return null;

  const isThreeStar = card?.rarity === '3S';
  let title = '特典卡不可交換';

  switch (lang) {
    case 'zh-Hant':
      title = isThreeStar ? '3★ 沉浸特畫不可交換' : '特典卡不可交換';
      break;
    case 'ja':
      title = isThreeStar ? '3★ イマーシブカード交換不可' : 'プロモカード交換不可';
      break;
    case 'ko':
      title = isThreeStar ? '3★ 이머시브 카드 교환 불가' : '프로모 카드 교환 불가';
      break;
    case 'fr':
      title = isThreeStar ? '3★ Immersive non échangeable' : 'Carte Promo non échangeable';
      break;
    case 'de':
      title = isThreeStar ? '3★ Immersiv nicht tauschbar' : 'Promo-Karte nicht tauschbar';
      break;
    case 'es':
      title = isThreeStar ? '3★ Inmersiva no intercambiable' : 'Carta Promo no intercambiable';
      break;
    case 'it':
      title = isThreeStar ? '3★ Immersiva non scambiabile' : 'Carta promo non scambiabile';
      break;
    case 'pt':
      title = isThreeStar ? '3★ Imersiva não trocável' : 'Carta Promo não trocável';
      break;
    case 'en':
    default:
      title = isThreeStar ? '3★ Immersive Cards Untradeable' : 'Promo Cards Untradeable';
      break;
  }

  return {
    title,
    description: desc,
  };
}
