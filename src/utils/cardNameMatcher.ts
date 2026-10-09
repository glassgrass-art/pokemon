import { PokemonCard } from "../types";
import { CARDS_DATABASE } from "../data/cardsData";
import {
  calculateDctSimilarity,
  PrecomputedHash,
  getPrecomputedCardHashes,
} from "./perceptualHash";

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
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\s\-_'’·()（）「」【】]/g, "")
    .replace(/ex$/i, "")
    .replace(/^mega/i, "")
    .replace(/^超級/, "")
    .replace(/^超级/, "")
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
      const isEx =
        !!card.isEx ||
        /ex\b/i.test(card.nameEn || "") ||
        /ex\b/i.test(card.nameCn || "");
      const rawTw = card.names?.["zh-Hant"] || card.nameCn || "";
      const rawEn = card.names?.en || card.nameEn || "";
      const rawJa = card.names?.ja || "";
      const rawKo = card.names?.ko || "";

      const normTw = normalizeCardName(rawTw);
      const normEn = normalizeCardName(rawEn);
      const normJa = normalizeCardName(rawJa);
      const normKo = normalizeCardName(rawKo);

      const speciesKey = `${normEn}_${isEx ? "ex" : "normal"}`;

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
          if (typeof val === "string") registerTerm(val);
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
    } = {},
  ): {
    card: PokemonCard | null;
    similarity: number;
    distance: number;
    confidencePct: number;
    method: "two_step_precise" | "visual_hash" | "sequential";
    candidates?: { card: PokemonCard; similarity: number }[];
    margin?: number;
  } {
    // A silhouette carries no artwork identity. Position is not a card number.
    if (options.isOwned === false && !options.recognizedName) {
      return {
        card: null,
        similarity: 0,
        distance: 192,
        confidencePct: 0,
        method: "visual_hash",
      };
    }

    const named = options.recognizedName
      ? this.findCardsByName(options.recognizedName, options.isEx)
      : [];
    const namedIds = new Set(named.map((card) => card.id));
    const ranked = getPrecomputedCardHashes()
      .filter((item) => !named.length || namedIds.has(item.cardId))
      .filter(
        (item) =>
          !options.targetPack ||
          options.targetPack === "AUTO" ||
          item.card.pack === options.targetPack ||
          item.card.expansionCode === options.targetPack,
      )
      .map((item) => ({
        card: item.card,
        ...calculateDctSimilarity(queryHash, item.hashBuf),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    const best = ranked[0];
    return {
      card: best?.card || null,
      similarity: best?.similarity || 0,
      distance: best?.diffBits ?? 192,
      confidencePct: Math.round((best?.similarity || 0) * 100),
      method: named.length ? "two_step_precise" : "visual_hash",
      candidates: ranked.map((item) => ({
        card: item.card,
        similarity: item.similarity,
      })),
      margin: best ? best.similarity - (ranked[1]?.similarity || 0) : 0,
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
