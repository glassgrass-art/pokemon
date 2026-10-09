export interface CardRegion {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  confidence: number;
}

export function regionBounds(region: CardRegion) {
  const width =
    Math.abs(Math.cos(region.angle)) * region.width +
    Math.abs(Math.sin(region.angle)) * region.height;
  const height =
    Math.abs(Math.sin(region.angle)) * region.width +
    Math.abs(Math.cos(region.angle)) * region.height;
  return {
    x: region.centerX - width / 2,
    y: region.centerY - height / 2,
    w: width,
    h: height,
  };
}

function intersectionOverUnion(a: CardRegion, b: CardRegion) {
  const x = regionBounds(a),
    y = regionBounds(b);
  const intersection =
    Math.max(0, Math.min(x.x + x.w, y.x + y.w) - Math.max(x.x, y.x)) *
    Math.max(0, Math.min(x.y + x.h, y.y + y.h) - Math.max(x.y, y.y));
  return intersection / (x.w * x.h + y.w * y.h - intersection);
}

// YOLO OBB output [1, 6, N]: center x/y, width/height, card score, angle.
// Inputs are padded on the right/bottom, so coordinates use a single square scale.
export function decodeCardRegions(
  data: ArrayLike<number>,
  shape: readonly number[],
  imageWidth: number,
  imageHeight: number,
  threshold = 0.5,
): CardRegion[] {
  if (
    shape.length !== 3 ||
    shape[0] !== 1 ||
    shape[1] !== 6 ||
    data.length !== shape[1] * shape[2]
  )
    throw new Error("Unsupported card detector output.");
  const count = shape[2],
    scale = Math.max(imageWidth, imageHeight) / 640;
  const candidates: CardRegion[] = [];
  for (let i = 0; i < count; i++) {
    const values = Array.from({ length: 6 }, (_, j) => data[j * count + i]);
    if (
      values.some((value) => !Number.isFinite(value)) ||
      values[4] < threshold ||
      values[4] > 1 ||
      values[2] <= 0 ||
      values[3] <= 0
    )
      continue;
    let [cx, cy, w, h, confidence, angle] = values;
    // Normalize the equivalent rotated box to portrait for card hashing.
    if (w > h) {
      [w, h] = [h, w];
      angle -= Math.PI / 2;
    }
    // Collection screenshots contain upright cards. A clipped bottom card can
    // otherwise be interpreted as a small landscape card rotated by 90 degrees.
    if (Math.abs(angle) > Math.PI / 4) continue;
    const region = {
      centerX: cx * scale,
      centerY: cy * scale,
      width: w * scale,
      height: h * scale,
      angle,
      confidence,
    };
    const bounds = regionBounds(region);
    const ratio = w / h;
    if (
      ratio < 0.45 ||
      ratio > 0.85 ||
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.w > imageWidth + 1 ||
      bounds.y + bounds.h > imageHeight + 1
    )
      continue;
    candidates.push(region);
  }
  const kept: CardRegion[] = [];
  for (const candidate of candidates.sort(
    (a, b) => b.confidence - a.confidence,
  )) {
    if (kept.every((region) => intersectionOverUnion(region, candidate) < 0.4))
      kept.push(candidate);
    if (kept.length >= 100) break;
  }
  return kept.sort((a, b) =>
    Math.abs(a.centerY - b.centerY) < Math.min(a.height, b.height) * 0.3
      ? a.centerX - b.centerX
      : a.centerY - b.centerY,
  );
}

export function cropCardRegion(
  source: HTMLCanvasElement,
  region: CardRegion,
): HTMLCanvasElement {
  const crop = document.createElement("canvas");
  crop.width = Math.max(1, Math.round(region.width));
  crop.height = Math.max(1, Math.round(region.height));
  const ctx = crop.getContext("2d");
  if (!ctx) throw new Error("Unable to crop detected card.");
  ctx.translate(crop.width / 2, crop.height / 2);
  ctx.rotate(-region.angle);
  ctx.drawImage(source, -region.centerX, -region.centerY);
  return crop;
}

export function inferCollectionLayout(
  regions: readonly CardRegion[],
): { cols: 3 | 5; rows: number } | null {
  const rowGroups: CardRegion[][] = [];
  for (const region of [...regions].sort((a, b) => a.centerY - b.centerY)) {
    const row = rowGroups.find(
      (group) =>
        Math.abs(group[0].centerY - region.centerY) <
        Math.min(group[0].height, region.height) * 0.3,
    );
    if (row) row.push(region);
    else rowGroups.push([region]);
  }
  const votes = { 3: 0, 5: 0 };
  for (const group of rowGroups)
    if (group.length === 3 || group.length === 5)
      votes[group.length as 3 | 5]++;
  if (!votes[3] && !votes[5]) return null;
  return { cols: votes[5] > votes[3] ? 5 : 3, rows: rowGroups.length };
}
