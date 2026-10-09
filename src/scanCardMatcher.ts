// Normalize any user or AI rarity string to canonical TCGP rarity code
function normalizeRarity(raw?: string): string {
  if (!raw) return "";
  const s = String(raw).toLowerCase().trim();
  if (
    s.includes("crown") ||
    s === "cr" ||
    s.includes("皇冠") ||
    s.includes("金卡") ||
    s.includes("gold")
  )
    return "CR";
  if (
    s.includes("3 star") ||
    s === "3s" ||
    s.includes("三星") ||
    s.includes("实境") ||
    s.includes("沉浸") ||
    s.includes("immersive")
  )
    return "3S";
  if (
    s.includes("2 rainbow") ||
    s === "2rs" ||
    s.includes("2彩星") ||
    s.includes("彩星ex") ||
    s.includes("shiny ex") ||
    s.includes("rainbow ex")
  )
    return "2RS";
  if (
    s.includes("1 rainbow") ||
    s === "1rs" ||
    s.includes("1彩星") ||
    s.includes("色违") ||
    s.includes("shiny") ||
    s.includes("rainbow")
  )
    return "1RS";
  if (
    s.includes("2 star") ||
    s === "2s" ||
    s.includes("二星") ||
    s.includes("sar") ||
    s.includes("sr") ||
    s.includes("特别全画") ||
    s.includes("全画") ||
    s.includes("special art")
  )
    return "2S";
  if (
    s.includes("1 star") ||
    s === "1s" ||
    s.includes("一星") ||
    s.includes("ar") ||
    s.includes("特别插画") ||
    s.includes("art rare")
  )
    return "1S";
  if (
    s.includes("4 diamond") ||
    s === "4d" ||
    s.includes("四菱") ||
    s.includes("4菱") ||
    s.includes("double rare")
  )
    return "4D";
  if (
    s.includes("3 diamond") ||
    s === "3d" ||
    s.includes("三菱") ||
    s.includes("3菱")
  )
    return "3D";
  if (
    s.includes("2 diamond") ||
    s === "2d" ||
    s.includes("二菱") ||
    s.includes("2菱")
  )
    return "2D";
  if (
    s.includes("1 diamond") ||
    s === "1d" ||
    s.includes("一菱") ||
    s.includes("1菱")
  )
    return "1D";
  return raw.toUpperCase().trim();
}

// Normalize species name across Simplified/Traditional Chinese and English Mega/EX prefixes
function cleanSpecies(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\s\-_'’·()（）]/g, "")
    .replace(/ex$/i, "")
    .replace(/^mega/i, "")
    .replace(/^超级/, "")
    .replace(/^超級/, "")
    .replace(/級/g, "级")
    .replace(/瑪/g, "玛")
    .replace(/寶/g, "宝")
    .replace(/機/g, "机")
    .replace(/亞/g, "亚")
    .replace(/鳥/g, "鸟")
    .replace(/龍/g, "龙")
    .replace(/車/g, "车")
    .replace(/獸/g, "兽")
    .replace(/夢/g, "梦")
    .replace(/龜/g, "龟")
    .replace(/鯉/g, "鲤")
    .replace(/惡/g, "恶")
    .replace(/靈/g, "灵")
    .replace(/變/g, "变");
}

// Helper: Multi-criteria fuzzy & exact matcher across the entire 3,639 card database
export function matchCardAgainstFullDex(
  detected: any,
  allCards: any[],
): any | null {
  const norm = (s?: string) =>
    (s || "").toLowerCase().replace(/[\s\-_'’·()（）]/g, "");
  const targetName = norm(detected.name || detected.nameCn || detected.nameEn);
  const targetNameCn = detected.nameCn || detected.name;
  const targetNameEn = detected.nameEn || detected.name;
  const targetSpeciesCn = cleanSpecies(targetNameCn);
  const targetSpeciesEn = cleanSpecies(targetNameEn);

  const targetNum = detected.cardNumber
    ? String(detected.cardNumber).replace(/^0+/, "")
    : "";
  const targetPack = (detected.packCode || detected.pack || "")
    .toUpperCase()
    .trim();
  const targetType = (detected.type || "").toLowerCase();
  const isEx = !!detected.isEx || /ex\b/i.test(targetName);
  const targetRarity = normalizeRarity(detected.rarity);
  const isHighRarity = ["1S", "2S", "3S", "CR", "1RS", "2RS"].includes(
    targetRarity,
  );

  let bestCard: any = null;
  let highestScore = -1;
  let tied = false;

  for (const card of allCards) {
    let score = 0;
    const cCn = norm(card.nameCn);
    const cEn = norm(card.nameEn);
    const cSpeciesCn = cleanSpecies(card.nameCn);
    const cSpeciesEn = cleanSpecies(card.nameEn);

    // CRITICAL SPECIES ENFORCEMENT:
    // If a Pokémon name or species is recognized, the candidate MUST belong to the same species!
    // Never allow card number or rarity to cause a cross-species mismatch (e.g. Venonat matching Charmander).
    const isSpeciesMatch =
      (targetSpeciesCn &&
        cSpeciesCn &&
        (targetSpeciesCn === cSpeciesCn ||
          cSpeciesCn.includes(targetSpeciesCn) ||
          targetSpeciesCn.includes(cSpeciesCn))) ||
      (targetSpeciesEn &&
        cSpeciesEn &&
        (targetSpeciesEn === cSpeciesEn ||
          cSpeciesEn.includes(targetSpeciesEn) ||
          targetSpeciesEn.includes(cSpeciesEn))) ||
      (targetName &&
        (cCn === targetName ||
          cEn === targetName ||
          cCn.includes(targetName) ||
          cEn.includes(targetName)));

    const hasTargetSpecies = !!(
      targetSpeciesCn ||
      targetSpeciesEn ||
      targetName
    );

    if (hasTargetSpecies && !isSpeciesMatch) {
      continue; // Reject completely different Pokémon species
    }

    if (isSpeciesMatch) {
      score += 200;
      if (targetSpeciesCn === cSpeciesCn || targetSpeciesEn === cSpeciesEn) {
        score += 50; // Exact species match bonus
      }
    }

    const cNum = String(card.cardNumber || "").replace(/^0+/, "");
    const cPack = (card.expansionCode || card.pack || "").toUpperCase();
    if (
      targetPack &&
      cPack !== targetPack &&
      !(targetPack === "PROMO" && cPack.startsWith("P"))
    )
      continue;
    if (targetNum && cNum !== targetNum) continue;
    if (targetRarity && normalizeRarity(card.rarity) !== targetRarity) continue;
    const cType = (card.type || "").toLowerCase();
    const cIsEx =
      !!card.isEx ||
      /ex\b/i.test(card.nameCn || "") ||
      /ex\b/i.test(card.nameEn || "");
    const cRarity = normalizeRarity(card.rarity);
    const cIsHighRarity = ["1S", "2S", "3S", "CR", "1RS", "2RS"].includes(
      cRarity,
    );

    // 1. EX variant match
    if (isEx === cIsEx) {
      score += 30;
    } else if (isEx && !cIsEx) {
      score -= 40;
    }

    // 2. High Rarity Matching (Decisive distinction: Crown, 3S Immersion, 2RS Rainbow Shiny, 2S SAR)
    if (targetRarity) {
      if (cRarity === targetRarity) {
        score += 80; // Exact rarity tier match (e.g. 2RS with 2RS, 3S with 3S, CR with CR)
      } else if (isHighRarity && cIsHighRarity) {
        score += 35; // Both are special art variants
      } else if (isHighRarity && !cIsHighRarity) {
        score -= 60; // Do not pick standard 4D/1D common card when user card is high rarity
      } else if (!isHighRarity && cIsHighRarity) {
        score -= 40;
      }
    }

    // 3. Card number match (Refines between the same Pokémon, e.g. base set vs promo vs secret art)
    if (targetNum && cNum === targetNum) {
      score += 70;
    }

    // 4. Pack code match (bonus if identified)
    if (targetPack) {
      if (
        cPack === targetPack ||
        (targetPack === "PROMO" && cPack.startsWith("P"))
      ) {
        score += 35;
      }
    }

    // 5. Energy element match
    if (targetType && cType === targetType) {
      score += 15;
    }

    if (score > highestScore && score >= 40) {
      highestScore = score;
      bestCard = card;
      tied = false;
    } else if (score === highestScore && score >= 40) {
      tied = true;
    }
  }

  return tied ? null : bestCard;
}
