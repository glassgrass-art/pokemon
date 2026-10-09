import { PokemonCard, PackExpansion, UserCardStatus, EnergyType } from '../types';
import { CARDS_DATABASE, PACK_INFO } from '../data/cardsData';
import {
  computeCardDctHash,
  matchCardSlotDct,
  computeRgbPerceptualHash,
  matchCardSlot,
  calculateHashSimilarity,
  VisualFeatureVector,
} from './perceptualHash';
import { getCardNameIndex } from './cardNameMatcher';

export interface ScannedCardSlot {
  id: string; // card id e.g. "A1-001"
  card: PokemonCard;
  owned: boolean;
  count: number;
  confidence: number;
  box: { x: number; y: number; width: number; height: number }; // normalized coords [0..1]
  croppedDataUrl?: string;
  isModified?: boolean;
  matchMethod?: 'two_step_precise' | 'visual_hash' | 'hybrid' | 'sequential';
  hammingDistance?: number;
  visualSimilarity?: number;
}

export interface GridDetectionOptions {
  preferredCols?: number | 'AUTO';
  verticalShiftRatio?: number;
  horizontalShiftRatio?: number;
  cardScale?: number;
  rowGapScale?: number;
  anchorPoint?: { x: number; y: number };
}

export interface GridDetectionResult {
  cols: number;
  rows: number;
  galleryX: number;
  galleryY: number;
  galleryW: number;
  galleryH: number;
  cellW: number;
  cellH: number;
  cardW: number;
  cardH: number;
  cardMarginX: number;
  cardMarginY: number;
  slots: {
    row: number;
    col: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
}

export interface ScanResult {
  fileName: string;
  previewUrl: string;
  slots: ScannedCardSlot[];
  packCode: string;
  packName: string;
  autoDetected: boolean;
  detectedCols: number;
  detectedRows: number;
  confidence: number;
  tokensUsed?: number;
  durationMs?: number;
  cached?: boolean;
  engine?: string;
  summary: {
    totalDetected: number;
    ownedCount: number;
    duplicateCount: number;
    unownedCount: number;
  };
}

/**
 * Load an image from a File, Blob, or URL into an HTMLImageElement
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
    }
  });
}

/**
 * Optimizes an image for fast network upload & high-fidelity Gemini OCR
 * Preserves high resolution (up to 2560px) and clean text edges for micro card numbers
 */
function getFastUploadImageBase64(canvas: HTMLCanvasElement): string {
  const maxDim = 2560;
  if (canvas.width <= maxDim && canvas.height <= maxDim) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }
  const scale = maxDim / Math.max(canvas.width, canvas.height);
  const fastCanvas = document.createElement('canvas');
  fastCanvas.width = Math.round(canvas.width * scale);
  fastCanvas.height = Math.round(canvas.height * scale);
  const fCtx = fastCanvas.getContext('2d');
  if (fCtx) {
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(canvas, 0, 0, fastCanvas.width, fastCanvas.height);
    return fastCanvas.toDataURL('image/jpeg', 0.92);
  }
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Converts RGB to HSL for precise color classification
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

/**
 * Estimates Pokémon Energy type from HSL hue and saturation
 */
function estimateEnergyTypeFromHsl(h: number, s: number, l: number): EnergyType | 'trainer' {
  if (s < 0.12) {
    if (l < 0.22) return 'darkness';
    if (l > 0.72) return 'colorless';
    return 'metal';
  }
  if (h >= 75 && h <= 165) return 'grass';
  if (h >= 170 && h <= 245) {
    return s > 0.40 ? 'water' : 'metal';
  }
  if (h >= 42 && h <= 72) return 'lightning';
  if ((h >= 0 && h <= 25) || h >= 340) return 'fire';
  if (h >= 250 && h <= 325) return 'psychic';
  if (h >= 25 && h <= 45) return 'fighting';
  return 'colorless';
}

/**
 * Automatically determine whether the screenshot has 3 columns (large view) or 5 columns (compact view)
 */
export function autoDetectColumns(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  headerBottom: number,
  footerTop: number
): 3 | 5 {
  try {
    const yStart = Math.floor(headerBottom + (footerTop - headerBottom) * 0.15);
    const yEnd = Math.floor(footerTop - (footerTop - headerBottom) * 0.15);
    const yStep = Math.max(3, Math.floor((yEnd - yStart) / 16));

    // 3-column boundary lines (normalized relative to width)
    const borders3 = [0.044, 0.322, 0.361, 0.639, 0.678, 0.956].map((r) => Math.round(width * r));

    // 5-column boundary lines
    const borders5 = [0.020, 0.196, 0.216, 0.392, 0.412, 0.588, 0.608, 0.784, 0.804, 0.980].map((r) =>
      Math.round(width * r)
    );

    let sum3 = 0;
    let count3 = 0;
    let sum5 = 0;
    let count5 = 0;

    for (let y = yStart; y < yEnd; y += yStep) {
      for (const x of borders3) {
        if (x >= 2 && x < width - 2) {
          const pL = ctx.getImageData(x - 2, y, 1, 1).data;
          const pR = ctx.getImageData(x + 2, y, 1, 1).data;
          sum3 += Math.abs((pL[0] + pL[1] + pL[2]) - (pR[0] + pR[1] + pR[2]));
          count3++;
        }
      }

      for (const x of borders5) {
        if (x >= 2 && x < width - 2) {
          const pL = ctx.getImageData(x - 2, y, 1, 1).data;
          const pR = ctx.getImageData(x + 2, y, 1, 1).data;
          sum5 += Math.abs((pL[0] + pL[1] + pL[2]) - (pR[0] + pR[1] + pR[2]));
          count5++;
        }
      }
    }

    const avg3 = count3 > 0 ? sum3 / count3 : 0;
    const avg5 = count5 > 0 ? sum5 / count5 : 0;

    // If 5-column edge boundary density is distinctly higher, choose 5 columns
    return avg5 > avg3 * 1.1 ? 5 : 3;
  } catch {
    return 3;
  }
}

/**
 * Pocket Gallery Grid Detection Engine (Supports 3-Column Large & 5-Column Compact Views with Auto-Detection)
 * Grounded in authentic Pokémon TCG Pocket UI measurements and 1vcian's reference architecture.
 */
export function detectGridConfiguration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  optionsOrPreferredCols?: number | 'AUTO' | GridDetectionOptions,
  legacyVerticalShift = 0
): GridDetectionResult {
  const options: GridDetectionOptions =
    typeof optionsOrPreferredCols === 'object' && optionsOrPreferredCols !== null
      ? optionsOrPreferredCols
      : {
          preferredCols: optionsOrPreferredCols === 5 || optionsOrPreferredCols === 3 ? optionsOrPreferredCols : 'AUTO',
          verticalShiftRatio: legacyVerticalShift,
        };

  const verticalShiftRatio = options.verticalShiftRatio ?? 0;
  const horizontalShiftRatio = options.horizontalShiftRatio ?? 0;
  const cardScale = Math.max(0.7, Math.min(1.4, options.cardScale ?? 1.0));
  const rowGapScale = Math.max(0.4, Math.min(2.5, options.rowGapScale ?? 1.0));
  const anchorPoint = options.anchorPoint;

  // Step 1: Detect Top Header Bottom & Bottom Footer Top
  let headerBottom = height * 0.228;
  let footerTop = height * 0.885;

  try {
    const startY = Math.floor(height * 0.19);
    const endY = Math.floor(height * 0.27);
    let maxEdgeEnergy = 0;
    let detectedHeader = headerBottom;

    const sampleXs = [0.25, 0.5, 0.75].map((r) => Math.round(width * r));

    for (let y = startY; y <= endY; y += 2) {
      let gradSum = 0;
      for (const sx of sampleXs) {
        const pUp = ctx.getImageData(sx, y - 2, 1, 1).data;
        const pDown = ctx.getImageData(sx, y + 2, 1, 1).data;
        const lumUp = 0.299 * pUp[0] + 0.587 * pUp[1] + 0.114 * pUp[2];
        const lumDown = 0.299 * pDown[0] + 0.587 * pDown[1] + 0.114 * pDown[2];
        gradSum += Math.abs(lumUp - lumDown);
      }
      if (gradSum > maxEdgeEnergy) {
        maxEdgeEnergy = gradSum;
        detectedHeader = y;
      }
    }

    if (maxEdgeEnergy > 25 && detectedHeader > height * 0.21 && detectedHeader < height * 0.27) {
      headerBottom = detectedHeader + height * 0.006;
    }

    // Detect bottom footer boundary
    for (let y = Math.floor(height * 0.94); y >= Math.floor(height * 0.84); y -= 3) {
      const midData = ctx.getImageData(Math.round(width * 0.5), y, 1, 1).data;
      const leftData = ctx.getImageData(Math.round(width * 0.2), y, 1, 1).data;
      const rightData = ctx.getImageData(Math.round(width * 0.8), y, 1, 1).data;
      const avgLum =
        (
          0.299 * midData[0] + 0.587 * midData[1] + 0.114 * midData[2] +
          0.299 * leftData[0] + 0.587 * leftData[1] + 0.114 * leftData[2] +
          0.299 * rightData[0] + 0.587 * rightData[1] + 0.114 * rightData[2]
        ) / 3;

      if (avgLum < 20 && y > height * 0.86) {
        footerTop = y - height * 0.005;
        break;
      }
    }
  } catch {
    // Keep defaults
  }

  // Step 1.5: Determine Columns (3 vs 5)
  let cols: number = 3;
  if (options.preferredCols === 5) {
    cols = 5;
  } else if (options.preferredCols === 3) {
    cols = 3;
  } else {
    // AUTO DETECTION: Analyze horizontal gradients
    cols = autoDetectColumns(ctx, width, height, headerBottom, footerTop);
  }

  // Step 2: Physical Dimensions for 3-Column or 5-Column Gallery
  // 3-col: cardW ~27.8% of width, 5-col: cardW ~17.6% of width
  const baseCardW = cols === 5 ? Math.round(width * 0.176) : Math.round(width * 0.278);
  const cardW = Math.round(baseCardW * cardScale);
  const cardH = Math.round(cardW * 1.397);
  const rowGapY = cols === 5 ? Math.round(cardH * 0.062 * rowGapScale) : Math.round(cardH * 0.068 * rowGapScale);
  const rowStep = cardH + rowGapY;

  const colGapX = cols === 5 ? Math.round(width * 0.020) : Math.round(width * 0.039);
  const totalGalleryW = cols * cardW + (cols - 1) * colGapX;
  const horizontalShiftPx = horizontalShiftRatio * width;
  const leftMargin = Math.round((width - totalGalleryW) / 2) + Math.round(horizontalShiftPx);

  const columnPositions: { x: number; w: number }[] = [];
  for (let c = 0; c < cols; c++) {
    columnPositions.push({
      x: leftMargin + c * (cardW + colGapX),
      w: cardW,
    });
  }

  // Step 3: Vertical Grid Alignment (Edge Gradient Phase Correlation)
  const sampleXs: number[] = [];
  for (let c = 0; c < cols; c++) {
    const col = columnPositions[c];
    sampleXs.push(Math.round(col.x + col.w * 0.25));
    sampleXs.push(Math.round(col.x + col.w * 0.50));
    sampleXs.push(Math.round(col.x + col.w * 0.75));
  }

  const edgeEnergy = new Float32Array(height);
  const bodyBrightness = new Float32Array(height);
  const scanStartY = Math.floor(headerBottom);
  const scanEndY = Math.floor(footerTop);

  try {
    for (let y = scanStartY + 2; y <= scanEndY - 2; y += 2) {
      let gradSum = 0;
      let brightSum = 0;
      for (const sx of sampleXs) {
        if (sx < 0 || sx >= width) continue;
        const pUp = ctx.getImageData(sx, y - 2, 1, 1).data;
        const pDown = ctx.getImageData(sx, y + 2, 1, 1).data;
        const lumUp = 0.299 * pUp[0] + 0.587 * pUp[1] + 0.114 * pUp[2];
        const lumDown = 0.299 * pDown[0] + 0.587 * pDown[1] + 0.114 * pDown[2];
        gradSum += Math.abs(lumUp - lumDown);
        brightSum += lumDown;
      }
      edgeEnergy[y] = gradSum;
      edgeEnergy[y + 1] = gradSum;
      bodyBrightness[y] = brightSum;
      bodyBrightness[y + 1] = brightSum;
    }
  } catch {}

  let bestPhase = 0;
  let bestPhaseScore = -Infinity;

  for (let phase = 0; phase < rowStep; phase += 2) {
    let score = 0;
    let countedRows = 0;

    for (let cur = headerBottom + phase; cur + cardH <= footerTop; cur += rowStep) {
      const topY = Math.round(cur);
      const bottomY = Math.round(cur + cardH);
      const midY = Math.round(cur + cardH * 0.5);
      const gapY = Math.round(cur - rowGapY * 0.5);

      let rowScore = 0;
      if (topY >= 0 && topY < height) rowScore += 3.0 * edgeEnergy[topY];
      if (bottomY >= 0 && bottomY < height) rowScore += 2.0 * edgeEnergy[bottomY];
      if (midY >= 0 && midY < height) rowScore += 0.8 * bodyBrightness[midY];
      if (gapY >= 0 && gapY < height) rowScore -= 2.0 * edgeEnergy[gapY];

      score += rowScore;
      countedRows++;
    }

    if (countedRows > 0) {
      const avgScore = score / countedRows;
      if (avgScore > bestPhaseScore) {
        bestPhaseScore = avgScore;
        bestPhase = phase;
      }
    }
  }

  let bestRowStartY = headerBottom + bestPhase;

  // Step 4: Interactive Anchor Point (Click to Snap on any card)
  if (anchorPoint) {
    const targetPxX = anchorPoint.x * width;
    const targetPxY = anchorPoint.y * height;

    // Direct vertical snap to clicked card center
    const clickedCardTop = targetPxY - cardH / 2;
    const offsetFromHeader = clickedCardTop - headerBottom;
    const snappedPhase = ((offsetFromHeader % rowStep) + rowStep) % rowStep;
    bestRowStartY = headerBottom + snappedPhase;

    // Direct horizontal snap to nearest column
    let nearestColIdx = 0;
    let minXDist = Infinity;
    for (let c = 0; c < cols; c++) {
      const colCenter = columnPositions[c].x + columnPositions[c].w / 2;
      const dist = Math.abs(colCenter - targetPxX);
      if (dist < minXDist) {
        minXDist = dist;
        nearestColIdx = c;
      }
    }
    const currentNearestCenter = columnPositions[nearestColIdx].x + columnPositions[nearestColIdx].w / 2;
    const deltaX = Math.round(targetPxX - currentNearestCenter);
    for (let c = 0; c < cols; c++) {
      columnPositions[c].x += deltaX;
    }
  }

  // Step 5: Slots Assembly
  const verticalShiftPx = verticalShiftRatio * height;
  let startY = bestRowStartY + verticalShiftPx;

  while (startY - rowStep >= headerBottom - cardH * 0.10) {
    startY -= rowStep;
  }
  while (startY < headerBottom - cardH * 0.35) {
    startY += rowStep;
  }

  const slots: { row: number; col: number; x: number; y: number; w: number; h: number }[] = [];
  let curY = startY;
  let rowIndex = 0;
  const minVisibilityRatio = 0.55;

  while (curY + cardH * minVisibilityRatio <= footerTop && curY < height * 0.96) {
    if (curY >= headerBottom - cardH * 0.15) {
      const visibleTop = Math.max(headerBottom, curY);
      const visibleBottom = Math.min(footerTop, curY + cardH);
      const visibleH = visibleBottom - visibleTop;

      if (visibleH >= cardH * minVisibilityRatio) {
        for (let c = 0; c < cols; c++) {
          slots.push({
            row: rowIndex,
            col: c,
            x: Math.round(columnPositions[c].x),
            y: Math.round(curY),
            w: cardW,
            h: cardH,
          });
        }
        rowIndex++;
      }
    }
    curY += rowStep;
  }

  // Fallback if no slots assembled
  if (slots.length === 0) {
    const fallbackY = Math.round(height * 0.235);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({
          row: r,
          col: c,
          x: Math.round(columnPositions[c].x),
          y: Math.round(fallbackY + r * rowStep),
          w: cardW,
          h: cardH,
        });
      }
    }
  }

  const rows = Math.max(...slots.map((s) => s.row)) + 1;
  const galleryY = slots[0]?.y ?? Math.round(headerBottom);
  const galleryH = slots.length > 0 ? slots[slots.length - 1].y + cardH - galleryY : Math.round(footerTop - headerBottom);

  return {
    cols,
    rows,
    galleryX: leftMargin,
    galleryY,
    galleryW: totalGalleryW,
    galleryH,
    cellW: cardW + colGapX,
    cellH: rowStep,
    cardW,
    cardH,
    cardMarginX: colGapX,
    cardMarginY: rowGapY,
    slots,
  };
}

/**
 * High-Accuracy Official Top-Right Energy Badge Detection
 * In 3-column view, every owned Pokémon card has a distinctive circular elemental badge at top-right.
 */
function detectEnergyBadge(
  ctx: CanvasRenderingContext2D,
  slotX: number,
  slotY: number,
  slotW: number,
  slotH: number
): { detected: boolean; type: EnergyType | null; confidence: number } {
  try {
    // Official energy badge coordinates:
    // Center at ~86% width, ~7.5% height of card
    const badgeCenterX = Math.round(slotX + slotW * 0.86);
    const badgeCenterY = Math.round(slotY + slotH * 0.075);
    const radius = Math.max(5, Math.round(slotW * 0.055));

    const sampleBoxW = radius * 2 + 2;
    const sampleBoxH = radius * 2 + 2;
    const startX = Math.max(0, badgeCenterX - radius);
    const startY = Math.max(0, badgeCenterY - radius);

    const badgeData = ctx.getImageData(startX, startY, sampleBoxW, sampleBoxH).data;

    let sumR = 0, sumG = 0, sumB = 0, validPixels = 0;
    const pixelCount = badgeData.length / 4;

    for (let i = 0; i < badgeData.length; i += 4) {
      const px = (i / 4) % sampleBoxW;
      const py = Math.floor((i / 4) / sampleBoxW);
      const dx = px - radius;
      const dy = py - radius;

      // Inner 75% circle radius
      if (dx * dx + dy * dy <= (radius * 0.75) * (radius * 0.75)) {
        sumR += badgeData[i];
        sumG += badgeData[i + 1];
        sumB += badgeData[i + 2];
        validPixels++;
      }
    }

    if (validPixels < 5) {
      return { detected: false, type: null, confidence: 0 };
    }

    const avgR = sumR / validPixels;
    const avgG = sumG / validPixels;
    const avgB = sumB / validPixels;
    const hsl = rgbToHsl(avgR, avgG, avgB);

    if (hsl.s < 0.14) {
      if (hsl.l < 0.28) return { detected: true, type: 'darkness', confidence: 0.85 };
      if (hsl.l > 0.72) return { detected: true, type: 'colorless', confidence: 0.82 };
      return { detected: true, type: 'metal', confidence: 0.80 };
    }

    if (hsl.h >= 75 && hsl.h <= 165) return { detected: true, type: 'grass', confidence: 0.95 };
    if (hsl.h >= 180 && hsl.h <= 245) return { detected: true, type: 'water', confidence: 0.95 };
    if (hsl.h >= 42 && hsl.h <= 72) return { detected: true, type: 'lightning', confidence: 0.95 };
    if ((hsl.h >= 0 && hsl.h <= 22) || hsl.h >= 340) return { detected: true, type: 'fire', confidence: 0.95 };
    if (hsl.h >= 250 && hsl.h <= 325) return { detected: true, type: 'psychic', confidence: 0.92 };
    if (hsl.h >= 23 && hsl.h <= 42) return { detected: true, type: 'fighting', confidence: 0.90 };

    return { detected: false, type: null, confidence: 0 };
  } catch {
    return { detected: false, type: null, confidence: 0 };
  }
}

/**
 * Accurate Slot Color & Ownership Analysis for 3-Column Pocket Gallery
 */
export function analyzeSlotColors(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cols = 3
): {
  isOwned: boolean;
  saturation: number;
  brightness: number;
  estimatedCount: number;
  dominantType: EnergyType | 'trainer';
  lumStdDev: number;
} {
  try {
    const sampleX = Math.round(x + width * 0.12);
    const sampleY = Math.round(y + height * 0.15);
    const sampleW = Math.max(12, Math.round(width * 0.76));
    const sampleH = Math.max(12, Math.round(height * 0.58));

    const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data;

    let sumR = 0, sumG = 0, sumB = 0;
    let sumSat = 0, sumBright = 0;
    let colorfulPixels = 0;
    const pixelCount = imgData.length / 4;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      sumR += r;
      sumG += g;
      sumB += b;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const sat = max === 0 ? 0 : delta / max;
      const bright = max / 255;

      sumSat += sat;
      sumBright += bright;

      if (delta > 22 && sat > 0.12) {
        colorfulPixels++;
      }
    }

    const avgSat = sumSat / pixelCount;
    const avgBright = sumBright / pixelCount;
    const colorRatio = colorfulPixels / pixelCount;

    // Luminance variance to distinguish unowned silhouette from textured card art
    const avgLum = 0.299 * (sumR / pixelCount) + 0.587 * (sumG / pixelCount) + 0.114 * (sumB / pixelCount);
    let sumLumSqDiff = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      sumLumSqDiff += (lum - avgLum) * (lum - avgLum);
    }
    const lumStdDev = Math.sqrt(sumLumSqDiff / pixelCount);

    // In Pokémon Pocket 3-column gallery:
    // Unowned card: dark slate navy placeholder (#172033) with card number or question mark.
    // Saturation < 0.11, colorRatio < 0.09, and lumStdDev < 23.
    // Owned card: rich illustration, colored energy frame, colorRatio >= 0.10 or avgSat >= 0.12.
    const isOwned = colorRatio >= 0.10 || avgSat >= 0.12 || lumStdDev > 26;

    // Detect duplicate badge (pill badge in bottom-right corner of card)
    let estimatedCount = isOwned ? 1 : 0;
    if (isOwned) {
      const badgeX = Math.round(x + width * 0.62);
      const badgeY = Math.round(y + height * 0.72);
      const badgeW = Math.max(8, Math.round(width * 0.32));
      const badgeH = Math.max(8, Math.round(height * 0.24));

      try {
        const badgeData = ctx.getImageData(badgeX, badgeY, badgeW, badgeH).data;
        let darkBackgroundPixels = 0;
        let brightWhitePixels = 0;
        for (let i = 0; i < badgeData.length; i += 4) {
          const r = badgeData[i];
          const g = badgeData[i + 1];
          const b = badgeData[i + 2];
          if (r < 60 && g < 60 && b < 60) {
            darkBackgroundPixels++;
          }
          if (r > 190 && g > 190 && b > 190) {
            brightWhitePixels++;
          }
        }
        const total = badgeData.length / 4;
        const badgeRatio = brightWhitePixels / total;
        const darkRatio = darkBackgroundPixels / total;

        if (darkRatio > 0.08 && badgeRatio > 0.02) {
          estimatedCount = 2;
        }
      } catch {}
    }

    const avgR = sumR / pixelCount;
    const avgG = sumG / pixelCount;
    const avgB = sumB / pixelCount;
    const hsl = rgbToHsl(avgR, avgG, avgB);
    const dominantType = estimateEnergyTypeFromHsl(hsl.h, hsl.s, hsl.l);

    return {
      isOwned,
      saturation: avgSat,
      brightness: avgBright,
      estimatedCount,
      dominantType,
      lumStdDev,
    };
  } catch {
    return {
      isOwned: true,
      saturation: 0.5,
      brightness: 0.5,
      estimatedCount: 1,
      dominantType: 'colorless',
      lumStdDev: 30,
    };
  }
}

/**
 * Auto-detect pack and card offset using multi-slot sequence alignment
 */
function autoDetectPackAndOffset(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  slotAnalyses: { dominantType: EnergyType | 'trainer'; isOwned: boolean; energyBadgeType?: EnergyType | null }[],
  cols = 3
): { packCode: string; startIndex: number; confidence: number } {
  // 1. Analyze top header bar for set banner theme colors
  const headerHeight = Math.round(height * 0.14);
  let headerHue = 0;
  let headerSat = 0;

  try {
    const headerData = ctx.getImageData(
      Math.round(width * 0.2),
      Math.round(height * 0.02),
      Math.round(width * 0.6),
      Math.max(10, headerHeight - 10)
    ).data;

    let sumR = 0, sumG = 0, sumB = 0;
    const count = headerData.length / 4;
    for (let i = 0; i < headerData.length; i += 4) {
      sumR += headerData[i];
      sumG += headerData[i + 1];
      sumB += headerData[i + 2];
    }
    const hsl = rgbToHsl(sumR / count, sumG / count, sumB / count);
    headerHue = hsl.h;
    headerSat = hsl.s;
  } catch {}

  const candidatePacks = Object.keys(PACK_INFO);
  let bestPack = 'A1';
  let bestOffset = 0;
  let highestScore = -1;

  for (const packCode of candidatePacks) {
    const packCards = CARDS_DATABASE.filter((c) => c.pack === packCode).sort((a, b) => {
      return (parseInt(a.cardNumber, 10) || 0) - (parseInt(b.cardNumber, 10) || 0);
    });

    if (packCards.length === 0) continue;

    // Header color correlation
    let headerBonus = 0;
    if (packCode === 'A1a' && (headerHue >= 300 || headerHue <= 15) && headerSat > 0.18) {
      headerBonus = 30; // Pink/Mew theme
    } else if (packCode === 'A2' && headerHue >= 180 && headerHue <= 240) {
      headerBonus = 30; // Cyan/Blue theme
    } else if (packCode === 'A2a' && headerHue >= 45 && headerHue <= 70) {
      headerBonus = 30; // Gold/Arceus theme
    } else if (packCode === 'PROMO-A' && headerHue >= 120 && headerHue <= 170) {
      headerBonus = 30; // Green theme
    } else if (packCode === 'B4a') {
      headerBonus = 25; // Team Rocket pack
    } else if (packCode === 'A1' && ((headerHue >= 15 && headerHue <= 45) || headerSat < 0.2)) {
      headerBonus = 20; // Amber/Orange
    }

    // In 3-column view, users scroll by rows of 3
    const maxOffset = Math.max(0, packCards.length - slotAnalyses.length);
    const step = 3;

    for (let offset = 0; offset <= maxOffset; offset += step) {
      let score = headerBonus;
      const windowCards = packCards.slice(offset, offset + slotAnalyses.length);

      for (let i = 0; i < windowCards.length; i++) {
        const expectedType = windowCards[i].type;
        const detected = slotAnalyses[i];

        if (detected.isOwned) {
          if (detected.energyBadgeType && expectedType === detected.energyBadgeType) {
            score += 35; // Top-right official energy badge match!
          } else if (expectedType === detected.dominantType) {
            score += 15;
          } else if (expectedType === 'colorless') {
            score += 10;
          } else if (
            (expectedType === 'fire' && detected.dominantType === 'fighting') ||
            (expectedType === 'fighting' && detected.dominantType === 'fire')
          ) {
            score += 6;
          } else if (
            detected.energyBadgeType &&
            detected.energyBadgeType !== expectedType
          ) {
            score -= 20; // Clear elemental conflict penalty
          }
        } else {
          score += 5; // Unowned silhouette alignment
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestPack = packCode;
        bestOffset = offset;
      }
    }
  }

  const confidence = Math.min(0.99, Math.max(0.70, (highestScore / (slotAnalyses.length * 35 + 30))));
  return {
    packCode: bestPack,
    startIndex: bestOffset,
    confidence,
  };
}

/**
 * Main Entry Point: Process Pokémon TCG Pocket Screenshot in 3-Column or 5-Column Gallery Mode
 */
export async function processScreenshot(
  fileOrBlob: File | Blob | string,
  options: {
    targetPack?: string;
    startCardIndex?: number;
    matchingMode?: 'two_step' | 'visual_hash' | 'hybrid' | 'sequential' | 'ai';
    sensitivity?: 'strict' | 'balanced' | 'relaxed';
    fileName?: string;
    preferredCols?: number | 'AUTO';
    verticalShiftRatio?: number;
    horizontalShiftRatio?: number;
    cardScale?: number;
    rowGapScale?: number;
    anchorPoint?: { x: number; y: number };
  } = {}
): Promise<ScanResult> {
  const image = await loadImage(fileOrBlob);

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to obtain canvas 2D rendering context');

  ctx.drawImage(image, 0, 0);

  // Step 1: Detect Grid Configuration (3-Column Large or 5-Column Compact with Auto-Detection)
  const grid = detectGridConfiguration(ctx, canvas.width, canvas.height, {
    preferredCols: options.preferredCols ?? 'AUTO',
    verticalShiftRatio: options.verticalShiftRatio ?? 0,
    horizontalShiftRatio: options.horizontalShiftRatio ?? 0,
    cardScale: options.cardScale ?? 1.0,
    rowGapScale: options.rowGapScale ?? 1.0,
    anchorPoint: options.anchorPoint,
  });

  // Step 2: Extract Features & Badges for every slot
  const slotAnalyses = grid.slots.map((slot) => {
    const analysis = analyzeSlotColors(ctx, slot.x, slot.y, slot.w, slot.h, grid.cols);
    const featureVector = computeRgbPerceptualHash(ctx, slot.x, slot.y, slot.w, slot.h);
    const energyBadge = detectEnergyBadge(ctx, slot.x, slot.y, slot.w, slot.h);

    return {
      slot,
      analysis,
      featureVector,
      energyBadge,
    };
  });

  // Step 3: Recognition Engine (Two-Step Precise / Pure Local 2D-DCT Hash / Cloud AI)
  let detectionConfidence = 0.95;
  let isAiRecognized = false;
  let apiTokensUsed = 0;
  let apiDurationMs = 0;
  let apiCached = false;
  let apiEngine = '1vcian 2D-DCT 感知哈希 (3,545卡离线特征库)';
  let aiDetectedCards: Array<{
    slotIndex: number;
    cardNumber?: string;
    name?: string;
    owned: boolean;
    count: number;
    confidence: number;
    box_2d?: [number, number, number, number];
    matchedCard?: PokemonCard | null;
  }> | null = null;

  let recognizedNames: Array<{
    slotIndex: number;
    name: string;
    isEx?: boolean;
    isOwned?: boolean;
    count?: number;
    box_2d?: [number, number, number, number];
  }> | null = null;

  // Pipeline 1: Two-Step Precise Recognition (Step 1: Multi-language Name OCR, Step 2: 2D-DCT Hash Variant Selector)
  if (options.matchingMode === 'two_step' || options.matchingMode === 'hybrid') {
    try {
      const base64Data = getFastUploadImageBase64(canvas);
      const apiRes = await fetch('/api/scan-dex-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.success && Array.isArray(data.detectedNames) && data.detectedNames.length > 0) {
          recognizedNames = data.detectedNames;
          apiTokensUsed = data.tokensUsed || 0;
          apiDurationMs = data.durationMs || 0;
          apiCached = !!data.cached;
          apiEngine = '双步精识 (多语言卡名提取 + 本地2D-DCT异画精匹)';
          detectionConfidence = 0.99;
        }
      }
    } catch (e) {
      console.warn('Fast Name Reader bypassed, falling back to pure 2D-DCT hash:', e);
    }
  }

  // Pipeline 2: Full Cloud AI Vision
  if (options.matchingMode === 'ai') {
    try {
      const base64Data = getFastUploadImageBase64(canvas);
      const apiRes = await fetch('/api/scan-dex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.success && Array.isArray(data.detectedCards) && data.detectedCards.length > 0) {
          aiDetectedCards = data.detectedCards;
          detectionConfidence = 0.98;
          isAiRecognized = true;
          apiTokensUsed = data.tokensUsed || 0;
          apiDurationMs = data.durationMs || 0;
          apiCached = !!data.cached;
          apiEngine = data.engine || 'gemini-2.5-flash';
        }
      }
    } catch (e) {
      console.warn('AI Vision /api/scan-dex bypassed, falling back to 2D-DCT perceptual hash:', e);
    }
  }

  const slots: ScannedCardSlot[] = [];

  if (isAiRecognized && aiDetectedCards && aiDetectedCards.length > 0) {
    // Pipeline A: AI-Native Full-Dex Recognition
    for (let i = 0; i < aiDetectedCards.length; i++) {
      const aiSlot = aiDetectedCards[i];
      let matchedCard: PokemonCard | undefined;

      if (aiSlot.matchedCard) {
        matchedCard = CARDS_DATABASE.find((c) => c.id === aiSlot.matchedCard?.id) || aiSlot.matchedCard;
      } else if (aiSlot.name || (aiSlot as any).nameCn || (aiSlot as any).nameEn) {
        const norm = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_'’·()（）]/g, '');
        const target = norm(aiSlot.name || (aiSlot as any).nameCn || (aiSlot as any).nameEn);
        matchedCard = CARDS_DATABASE.find(
          (c) => norm(c.nameCn) === target || norm(c.nameEn) === target || (c.nameCn && c.nameCn.includes(target))
        );
      } else if (aiSlot.cardNumber) {
        matchedCard = CARDS_DATABASE.find((c) => c.cardNumber === aiSlot.cardNumber);
      }

      if (!matchedCard) {
        matchedCard = CARDS_DATABASE[0];
      }

      const slotAnalysis = slotAnalyses[i];
      const slotBox = slotAnalysis?.slot || {
        row: Math.floor(i / grid.cols),
        col: i % grid.cols,
        x: Math.round(((i % grid.cols) * canvas.width) / grid.cols),
        y: Math.round((Math.floor(i / grid.cols) * canvas.height) / Math.max(1, grid.rows)),
        w: Math.round(canvas.width / grid.cols),
        h: Math.round(canvas.height / Math.max(1, grid.rows)),
      };

      // Create thumbnail preview
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 120;
      thumbCanvas.height = 168;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(canvas, slotBox.x, slotBox.y, slotBox.w, slotBox.h, 0, 0, 120, 168);
      }

      slots.push({
        id: matchedCard.id,
        card: matchedCard,
        owned: typeof aiSlot.owned === 'boolean' ? aiSlot.owned : true,
        count: aiSlot.count !== undefined ? aiSlot.count : (aiSlot.owned === false ? 0 : 1),
        confidence: aiSlot.confidence || 0.98,
        box: {
          x: slotBox.x / canvas.width,
          y: slotBox.y / canvas.height,
          width: slotBox.w / canvas.width,
          height: slotBox.h / canvas.height,
        },
        croppedDataUrl: thumbCanvas.toDataURL('image/jpeg', 0.85),
        matchMethod: 'visual_hash',
        hammingDistance: 0,
        visualSimilarity: aiSlot.confidence || 0.98,
      });
    }
  } else {
    // Pipeline B: Two-Step Recognition or Pure 1vcian 2D-DCT Perceptual Hash Engine
    const nameIndex = getCardNameIndex();

    for (let i = 0; i < slotAnalyses.length; i++) {
      const { slot, analysis, energyBadge } = slotAnalyses[i];

      // Create thumbnail preview
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 120;
      thumbCanvas.height = 168;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(canvas, slot.x, slot.y, slot.w, slot.h, 0, 0, 120, 168);
      }

      // Compute 1vcian 2D-DCT RGB perceptual hash directly on the slot
      const dctResult = computeCardDctHash(ctx, slot.x, slot.y, slot.w, slot.h);
      const recognizedSlot = recognizedNames?.find((n) => n.slotIndex === i);
      const isSlotOwned = recognizedSlot?.isOwned !== undefined ? recognizedSlot.isOwned : (!dctResult.isGrayscale && analysis.isOwned);

      // Two-Step Match:
      // Step 1: Filter candidates by Pokémon name (Traditional Chinese, English, etc.)
      // Step 2: 2D-DCT Perceptual Hash matching within that Pokémon's artwork variants
      const match = nameIndex.matchTwoStepSlot(dctResult.hashBuf, {
        recognizedName: recognizedSlot?.name,
        isEx: recognizedSlot?.isEx,
        targetPack: options.targetPack,
        detectedEnergyType: energyBadge?.type,
        isOwned: isSlotOwned,
        expectedIndex: i,
      });

      const matchedCard = match.card;
      const slotOwned = isSlotOwned;
      const slotCount = isSlotOwned ? (recognizedSlot?.count || Math.max(1, analysis.estimatedCount)) : 0;
      const slotConfidence = match.confidencePct / 100;

      slots.push({
        id: matchedCard.id,
        card: matchedCard,
        owned: slotOwned,
        count: slotCount,
        confidence: slotConfidence,
        box: {
          x: slot.x / canvas.width,
          y: slot.y / canvas.height,
          width: slot.w / canvas.width,
          height: slot.h / canvas.height,
        },
        croppedDataUrl: thumbCanvas.toDataURL('image/jpeg', 0.85),
        matchMethod: match.method,
        hammingDistance: match.distance,
        visualSimilarity: match.similarity,
      });
    }
  }

  // Draw overlay bounding boxes onto preview
  const previewCanvas = document.createElement('canvas');
  const previewMaxW = 1440;
  const scale = Math.min(1, previewMaxW / canvas.width);
  previewCanvas.width = canvas.width * scale;
  previewCanvas.height = canvas.height * scale;
  const pCtx = previewCanvas.getContext('2d');

  if (pCtx) {
    pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    slots.forEach((s) => {
      const bx = s.box.x * previewCanvas.width;
      const by = s.box.y * previewCanvas.height;
      const bw = s.box.width * previewCanvas.width;
      const bh = s.box.height * previewCanvas.height;

      pCtx.lineWidth = 3;
      pCtx.strokeStyle = s.owned ? '#10b981' : '#64748b';
      pCtx.strokeRect(bx, by, bw, bh);

      // Top aligned card identification banner
      if (s.card) {
        const topBannerH = 24;
        pCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        pCtx.fillRect(bx, by, bw, topBannerH);

        // Status indicator circle on left of top banner
        pCtx.beginPath();
        pCtx.arc(bx + 12, by + 12, 5, 0, Math.PI * 2);
        pCtx.fillStyle = s.owned ? '#10b981' : '#94a3b8';
        pCtx.fill();

        // Aligned card name & number
        pCtx.fillStyle = '#f8fafc';
        pCtx.font = 'bold 12px sans-serif';
        const cardDisplayName = s.card.nameCn || s.card.nameEn || s.card.names?.['zh-Hans'] || s.card.names?.en || '';
        const title = `#${s.card.cardNumber} ${cardDisplayName}`;
        pCtx.fillText(title, bx + 22, by + 16);

        // Top-right official energy attribute indicator for owned cards
        if (s.owned && s.card) {
          const typeColorMap: Record<string, string> = {
            grass: '#22c55e',
            fire: '#ef4444',
            water: '#0ea5e9',
            lightning: '#eab308',
            psychic: '#a855f7',
            fighting: '#d97706',
            darkness: '#475569',
            metal: '#94a3b8',
            colorless: '#cbd5e1',
          };
          const dotColor = typeColorMap[s.card.type] || '#10b981';
          pCtx.beginPath();
          pCtx.arc(bx + bw - 12, by + 12, 6, 0, Math.PI * 2);
          pCtx.fillStyle = dotColor;
          pCtx.fill();
          pCtx.strokeStyle = '#ffffff';
          pCtx.lineWidth = 1.5;
          pCtx.stroke();
        }
      }

      // Bottom status bar: Owned/Unowned count and similarity percentage
      const bottomH = 22;
      pCtx.fillStyle = s.owned ? 'rgba(6, 78, 59, 0.90)' : 'rgba(30, 41, 59, 0.90)';
      pCtx.fillRect(bx, by + bh - bottomH, bw, bottomH);

      pCtx.fillStyle = '#ffffff';
      pCtx.font = 'bold 11px sans-serif';
      const statusText = s.owned ? (s.count > 1 ? `✓ 已有 x${s.count}` : '✓ 已收录') : '✗ 未收录';
      pCtx.fillText(statusText, bx + 8, by + bh - 6);

      if (s.visualSimilarity !== undefined) {
        const simPct = Math.round(s.visualSimilarity * 100);
        const simText = `${simPct}% 似度`;
        pCtx.font = 'bold 10px sans-serif';
        pCtx.fillStyle = simPct >= 75 ? '#34d399' : simPct >= 60 ? '#fde047' : '#94a3b8';
        const simW = pCtx.measureText(simText).width;
        pCtx.fillText(simText, bx + bw - simW - 8, by + bh - 6);
      }
    });
  }

  const ownedCount = slots.filter((s) => s.owned).length;
  const duplicateCount = slots.filter((s) => s.owned && s.count > 1).length;
  const unownedCount = slots.filter((s) => !s.owned).length;

  const packsFound = Array.from(new Set(slots.map((s) => s.card?.pack).filter(Boolean)));
  const finalPackCode = packsFound.length === 1 ? (packsFound[0] as string) : 'ALL';
  const packName =
    packsFound.length > 1
      ? `全图鉴混合识别 (${packsFound.slice(0, 3).join(', ')}${packsFound.length > 3 ? '等' : ''})`
      : (PACK_INFO[finalPackCode as PackExpansion]?.nameCn || '全图鉴全卡包');

  return {
    fileName: options.fileName || 'game_screenshot.png',
    previewUrl: previewCanvas.toDataURL('image/jpeg', 0.85),
    slots,
    packCode: finalPackCode,
    packName,
    autoDetected: true,
    detectedCols: 3,
    detectedRows: grid.rows,
    confidence: detectionConfidence,
    tokensUsed: apiTokensUsed,
    durationMs: apiDurationMs,
    cached: apiCached,
    engine: apiEngine,
    summary: {
      totalDetected: slots.length,
      ownedCount,
      duplicateCount,
      unownedCount,
    },
  };
}

/**
 * Generate a realistic synthetic demo screenshot of Pokémon TCG Pocket 3-Column Collection Gallery
 */
export async function generateSampleScreenshot(
  packCode: PackExpansion = 'A1'
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failure');

  // Background - matches Pocket's sleek dark slate navy canvas
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0d131d');
  grad.addColorStop(0.5, '#131c28');
  grad.addColorStop(1, '#0e1520');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const packNameCn = PACK_INFO[packCode]?.nameCn || packCode;

  // 1. Top Status & Nav Bar (y: 0 ~ 240)
  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(0, 0, canvas.width, 240);

  // Title & Back Button simulation
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('‹', 40, 140);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(packNameCn, 90, 140);

  // Search & Filter Buttons (right side of menu bar)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(canvas.width - 120, 130, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(canvas.width - 50, 130, 24, 0, Math.PI * 2);
  ctx.fill();

  // 2. Collection Progress Sub-Header & Rarity Tabs (y: 240 ~ 440)
  ctx.fillStyle = '#0e1622';
  ctx.fillRect(0, 240, canvas.width, 200);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`COLLECTION • 226/226 (100%)`, 48, 305);

  // Rarity Tab Pills
  const rarities = ['◆1', '◆2', '◆3', '◆4', '★1', '★2', '★3', 'Crown'];
  rarities.forEach((r, idx) => {
    const rx = 48 + idx * 124;
    if (rx + 110 < canvas.width) {
      ctx.fillStyle = idx === 0 ? '#0284c7' : '#1e293b';
      ctx.roundRect(rx, 340, 110, 44, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r, rx + 55, 368);
    }
  });

  // Subheader bottom divider line at y = 440 (22.9% of height)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 440);
  ctx.lineTo(canvas.width, 440);
  ctx.stroke();

  // 3. Card Grid: 3 columns x 3 rows = 9 cards
  // Starts at y = 454, cardW = 300, cardH = 419, colGap = 41, rowGap = 28
  const candidateCards = CARDS_DATABASE.filter((c) => c.pack === packCode);
  const cardW = 300;
  const cardH = 419;
  const colGap = 41;
  const rowGap = 28;
  const startX = 48;
  const startY = 454;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const card = candidateCards[idx] || candidateCards[0];
      const x = startX + c * (cardW + colGap);
      const y = startY + r * (cardH + rowGap);
      const isOwned = idx % 2 === 0 || idx % 3 === 0;

      if (isOwned) {
        const cardGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
        if (card.type === 'fire') {
          cardGrad.addColorStop(0, '#ef4444');
          cardGrad.addColorStop(1, '#f97316');
        } else if (card.type === 'water') {
          cardGrad.addColorStop(0, '#0284c7');
          cardGrad.addColorStop(1, '#38bdf8');
        } else if (card.type === 'lightning') {
          cardGrad.addColorStop(0, '#eab308');
          cardGrad.addColorStop(1, '#fde047');
        } else if (card.type === 'psychic') {
          cardGrad.addColorStop(0, '#a855f7');
          cardGrad.addColorStop(1, '#d946ef');
        } else {
          cardGrad.addColorStop(0, '#22c55e');
          cardGrad.addColorStop(1, '#86efac');
        }
        ctx.fillStyle = cardGrad;
        ctx.roundRect(x, y, cardW, cardH, 16);
        ctx.fill();

        // Card inner illustration box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.roundRect(x + 12, y + 16, cardW - 24, cardH * 0.54, 10);
        ctx.fill();

        // Official top-right circular energy badge
        const typeBadgeColorMap: Record<string, string> = {
          grass: '#15803d',
          fire: '#b91c1c',
          water: '#0369a1',
          lightning: '#ca8a04',
          psychic: '#7e22ce',
          fighting: '#9a3412',
          darkness: '#1e293b',
          metal: '#64748b',
          colorless: '#e2e8f0',
        };
        const badgeBg = typeBadgeColorMap[card.type] || '#15803d';
        ctx.beginPath();
        ctx.arc(x + cardW - 32, y + 30, 16, 0, Math.PI * 2);
        ctx.fillStyle = badgeBg;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Duplicate counter badge
        if (idx === 0 || idx === 4) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x + cardW - 32, y + cardH - 32, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('x2', x + cardW - 32, y + cardH - 25);
        }
      } else {
        // Silhouette placeholder
        ctx.fillStyle = '#172033';
        ctx.roundRect(x, y, cardW, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = '#27354f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#3b4d6b';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', x + cardW / 2, y + cardH / 2 + 12);
      }
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], `sample_${packCode}_3col.png`, { type: 'image/png' }));
      }
    }, 'image/png');
  });
}

/**
 * Merge or overwrite scan results into the user's collection
 */
export function applyScanResultsToCollection(
  userCollection: Record<string, UserCardStatus>,
  slots: ScannedCardSlot[],
  mode: 'merge' | 'overwrite_pack' | 'overwrite_all' = 'merge',
  targetPack?: string
): Record<string, UserCardStatus> {
  const nextCollection: Record<string, UserCardStatus> =
    mode === 'overwrite_all' ? {} : { ...userCollection };

  if (mode === 'overwrite_pack' && targetPack) {
    Object.keys(nextCollection).forEach((key) => {
      const card = CARDS_DATABASE.find((c) => c.id === key);
      if (card && card.pack === targetPack) {
        delete nextCollection[key];
      }
    });
  }

  slots.forEach((slot) => {
    if (!slot.card) return;
    const cardId = slot.card.id;
    const existing = nextCollection[cardId];

    if (slot.owned) {
      const count = Math.max(1, slot.count || 1);
      nextCollection[cardId] = {
        cardId,
        count: mode === 'merge' && existing ? Math.max(existing.count, count) : count,
        forTradeCount: existing?.forTradeCount || 0,
        inWishlist: existing?.inWishlist || false,
        updatedAt: Date.now(),
      };
    } else if (mode === 'overwrite_pack' || mode === 'overwrite_all') {
      nextCollection[cardId] = {
        cardId,
        count: 0,
        forTradeCount: 0,
        inWishlist: existing?.inWishlist || false,
        updatedAt: Date.now(),
      };
    }
  });

  return nextCollection;
}

