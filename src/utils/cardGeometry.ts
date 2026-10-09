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
