import { PokemonCard } from '../types';
import { CARDS_DATABASE } from '../data/cardsData';
import { calculateDctSimilarity, PrecomputedHash, getPrecomputedCardHashes } from './perceptualHash';

/**
 * Multi-Language Card Name Matcher & Two-Step Identification Engine
 *
 * Supported Game Languages:
 * - Traditional Chinese (繁體中文 zh-Hant) - Official Pokémon TCG Pocket Chinese language
 * - English (en)
 * - Japanese (日本語 ja)
 * - Korean (한국어 ko)
 * - French (fr), German (de), Spanish (es), Italian (it), Portuguese (pt)
 */

export interface SpeciesEntry {
  canonicalName: string;
  nameTw?: string;
  nameEn?: string;
  nameJa?: string;
  isEx: boolean;
  cards: PokemonCard[];
}

// Normalize strings across Traditional Chinese, English, and Japanese
export function normalizeCardName(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\s\-_'’·()（）「」【】]/g, '')
    .replace(/ex$/i, '')
    .replace(/^mega/i, '')
    .replace(/^超級/, '')
    .replace(/^超级/, '')
    .trim();
}

class CardNameIndex {
  private nameToCardsMap = new Map<string, PokemonCard[]>();
  private allSpeciesList: SpeciesEntry[] = [];
  private cardIdToPrecomputedHashMap = new Map<string, PrecomputedHash>();

  constructor() {
    this.buildIndex();
  }

  private buildIndex() {
    const speciesMap = new Map<string, SpeciesEntry>();

    for (const card of CARDS_DATABASE) {
      const isEx = !!card.isEx || /ex\b/i.test(card.nameEn || '') || /ex\b/i.test(card.nameCn || '');
      const rawTw = card.names?.['zh-Hant'] || card.nameCn || '';
      const rawEn = card.names?.en || card.nameEn || '';
      const rawJa = card.names?.ja || '';
      const rawKo = card.names?.ko || '';

      const normTw = normalizeCardName(rawTw);
      const normEn = normalizeCardName(rawEn);
      const normJa = normalizeCardName(rawJa);
      const normKo = normalizeCardName(rawKo);

      const speciesKey = `${normEn}_${isEx ? 'ex' : 'normal'}`;

      if (!speciesMap.has(speciesKey)) {
        speciesMap.set(speciesKey, {
          canonicalName: rawEn,
          nameTw: rawTw,
          nameEn: rawEn,
          nameJa: rawJa,
          isEx,
          cards: [],
        });
      }
      speciesMap.get(speciesKey)!.cards.push(card);

      // Populate multi-language lookup terms
      const registerTerm = (term: string) => {
        if (!term) return;
        const norm = normalizeCardName(term);
        if (!norm) return;

        // Register exact term
        if (!this.nameToCardsMap.has(norm)) {
          this.nameToCardsMap.set(norm, []);
        }
        if (!this.nameToCardsMap.get(norm)!.some((c) => c.id === card.id)) {
          this.nameToCardsMap.get(norm)!.push(card);
        }

        // Also register with "ex" if card is ex
        if (isEx) {
          const exTerm = `${norm}ex`;
          if (!this.nameToCardsMap.has(exTerm)) {
            this.nameToCardsMap.set(exTerm, []);
          }
          if (!this.nameToCardsMap.get(exTerm)!.some((c) => c.id === card.id)) {
            this.nameToCardsMap.get(exTerm)!.push(card);
          }
        }
      };

      registerTerm(rawTw);
      registerTerm(rawEn);
      registerTerm(rawJa);
      registerTerm(rawKo);
      if (card.nameCn) registerTerm(card.nameCn);

      // Register all languages from card.names
      if (card.names) {
        for (const val of Object.values(card.names)) {
          if (typeof val === 'string') registerTerm(val);
        }
      }
    }

    this.allSpeciesList = Array.from(speciesMap.values());

    // Map precomputed card hashes
    const precomputed = getPrecomputedCardHashes();
    for (const item of precomputed) {
      this.cardIdToPrecomputedHashMap.set(item.cardId, item);
    }
  }

  /**
   * Look up candidate cards by Pokémon name in Traditional Chinese, English, or other language
   */
  public findCardsByName(rawName: string, isExHint?: boolean): PokemonCard[] {
    if (!rawName) return [];
    const norm = normalizeCardName(rawName);
    const hasExInName = /ex$/i.test(rawName.trim()) || isExHint;

    // 1. Direct match
    if (hasExInName && this.nameToCardsMap.has(`${norm}ex`)) {
      return this.nameToCardsMap.get(`${norm}ex`)!;
    }
    if (this.nameToCardsMap.has(norm)) {
      let list = this.nameToCardsMap.get(norm)!;
      if (isExHint !== undefined) {
        const filtered = list.filter((c) => !!c.isEx === isExHint);
        if (filtered.length > 0) list = filtered;
      }
      return list;
    }

    // 2. Prefix / partial match against species list
    for (const entry of this.allSpeciesList) {
      if (isExHint !== undefined && entry.isEx !== isExHint) continue;

      const tw = normalizeCardName(entry.nameTw);
      const en = normalizeCardName(entry.nameEn);
      const ja = normalizeCardName(entry.nameJa);

      if (
        (tw && (tw === norm || tw.includes(norm) || norm.includes(tw))) ||
        (en && (en === norm || en.includes(norm) || norm.includes(en))) ||
        (ja && (ja === norm || ja.includes(norm) || norm.includes(ja)))
      ) {
        return entry.cards;
      }
    }

    return [];
  }

  /**
   * Two-Step Identification:
   * Step 1: Filter candidates by Pokémon name / species
   * Step 2: Use 2D-DCT Perceptual Hash to find the exact variant
   */
  public matchTwoStepSlot(
    queryHash: Uint32Array,
    options: {
      recognizedName?: string;
      isEx?: boolean;
      targetPack?: string;
      detectedEnergyType?: string;
      isOwned?: boolean;
      expectedIndex?: number;
    } = {}
  ): {
    card: PokemonCard;
    similarity: number;
    distance: number;
    confidencePct: number;
    method: 'two_step_precise' | 'visual_hash' | 'sequential';
  } {
    // If not owned, preserve sequential silhouette
    if (options.isOwned === false && options.expectedIndex !== undefined) {
      const allHashes = getPrecomputedCardHashes();
      const seq = allHashes[options.expectedIndex] || allHashes[0];
      return {
        card: seq.card,
        similarity: 0.95,
        distance: 9,
        confidencePct: 95,
        method: 'sequential',
      };
    }

    // Step 1: Filter by identified Pokémon name
    let candidates: PokemonCard[] = [];
    if (options.recognizedName) {
      candidates = this.findCardsByName(options.recognizedName, options.isEx);
    }

    // If pack filter is also specified, check if candidates exist in that pack
    if (candidates.length > 0 && options.targetPack && options.targetPack !== 'AUTO') {
      const packFiltered = candidates.filter((c) => c.pack === options.targetPack || c.expansionCode === options.targetPack);
      if (packFiltered.length > 0) {
        candidates = packFiltered;
      }
    }

    // Step 2: Perceptual Hash comparison within candidate pool
    if (candidates.length > 0) {
      let bestCard: PokemonCard = candidates[0];
      let highestSimilarity = -1;
      let lowestDiff = 999;

      for (const card of candidates) {
        const item = this.cardIdToPrecomputedHashMap.get(card.id);
        if (item) {
          const { similarity, diffBits } = calculateDctSimilarity(queryHash, item.hashBuf);
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            lowestDiff = diffBits;
            bestCard = card;
          }
        }
      }

      const sim = Math.min(0.99, Math.max(0.85, highestSimilarity));
      return {
        card: bestCard,
        similarity: sim,
        distance: lowestDiff,
        confidencePct: Math.round(sim * 100),
        method: 'two_step_precise',
      };
    }

    // Fallback: full database 2D-DCT hash match if name wasn't recognized
    const allHashes = getPrecomputedCardHashes();
    let bestHash = allHashes[0];
    let highestSim = -1;
    let lowestD = 999;

    for (let i = 0; i < allHashes.length; i++) {
      const item = allHashes[i];
      if (options.targetPack && options.targetPack !== 'AUTO' && item.card.pack !== options.targetPack) {
        continue;
      }
      const { similarity, diffBits } = calculateDctSimilarity(queryHash, item.hashBuf);
      let score = similarity;
      if (options.detectedEnergyType && item.card.type?.toLowerCase() === options.detectedEnergyType.toLowerCase()) {
        score += 0.05;
      }
      if (score > highestSim) {
        highestSim = score;
        lowestD = diffBits;
        bestHash = item;
      }
    }

    const sim = Math.min(0.99, Math.max(0.65, highestSim));
    return {
      card: bestHash.card,
      similarity: sim,
      distance: lowestD,
      confidencePct: Math.round(sim * 100),
      method: 'visual_hash',
    };
  }
}

let SINGLETON_INDEX: CardNameIndex | null = null;

export function getCardNameIndex(): CardNameIndex {
  if (!SINGLETON_INDEX) {
    SINGLETON_INDEX = new CardNameIndex();
  }
  return SINGLETON_INDEX;
}
