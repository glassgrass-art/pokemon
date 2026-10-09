import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeCardRegions,
  regionBounds,
  inferCollectionLayout,
} from "../src/utils/cardGeometry";
import {
  calculateDctSimilarity,
  hashRgbPixels96,
} from "../src/utils/perceptualHash";
function output(rows: number[][]) {
  return Float32Array.from(
    Array.from({ length: 6 }, (_, index) =>
      rows.map((row) => row[index]),
    ).flat(),
  );
}
test("detector maps square padding to portrait images, rejects padding and suppresses duplicates", () => {
  const rows = [
    [160, 240, 100, 140, 0.9, 0],
    [161, 241, 100, 140, 0.8, 0],
    [520, 200, 100, 140, 0.95, 0],
    [160, 480, 100, 140, 0.1, 0],
  ];
  const regions = decodeCardRegions(
    output(rows),
    [1, 6, rows.length],
    400,
    800,
  );
  assert.equal(regions.length, 1);
  assert.equal(regions[0].centerX, 200);
  assert.equal(regions[0].centerY, 300);
  assert.equal(regions[0].width, 125);
  assert.equal(regions[0].height, 175);
});
test("detector normalizes equivalent rotated boxes and excludes partial cards", () => {
  const rows = [
    [300, 300, 140, 100, 0.9, Math.PI / 2],
    [2, 300, 100, 140, 0.9, 0],
  ];
  const regions = decodeCardRegions(output(rows), [1, 6, 2], 640, 640);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].width, 100);
  assert.ok(Math.abs(regions[0].angle) < 1e-6);
  assert.ok(Math.abs(regionBounds(regions[0]).x - 250) < 1e-4);
  assert.throws(
    () => decodeCardRegions([], [1, 5, 1], 640, 640),
    /Unsupported/,
  );
});

test("collection layouts distinguish three/five columns and reject a partial-card false rotation", () => {
  const partial = output([[227, 640, 38, 50, 0.62, 0.01]]);
  assert.equal(decodeCardRegions(partial, [1, 6, 1], 1080, 2340).length, 0);
  const falselyRotated = output([[200, 500, 80, 60, 0.9, 0.01]]);
  assert.equal(
    decodeCardRegions(falselyRotated, [1, 6, 1], 640, 640).length,
    0,
  );
  for (const cols of [3, 5] as const) {
    const regions = Array.from({ length: cols * 2 }, (_, i) => ({
      centerX: 50 + (i % cols) * 110,
      centerY: 100 + Math.floor(i / cols) * 160,
      width: 100,
      height: 140,
      angle: 0,
      confidence: 0.9,
    }));
    assert.deepEqual(inferCollectionLayout(regions), { cols, rows: 2 });
  }
});
test("RGB hash rejects incompatible buffers and is deterministic for asymmetric RGB pixels", () => {
  const rgba = new Uint8Array(96 * 96 * 4);
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 96; x++) {
      const offset = (y * 96 + x) * 4;
      rgba[offset] = (x * 3 + y) % 256;
      rgba[offset + 1] = (x * y) % 256;
      rgba[offset + 2] = (x + 7 * y) % 256;
      rgba[offset + 3] = 255;
    }
  const first = hashRgbPixels96(rgba).hashBuf;
  assert.equal(first.length, 6);
  assert.equal(
    calculateDctSimilarity(first, hashRgbPixels96(rgba).hashBuf).similarity,
    1,
  );
  assert.throws(
    () => calculateDctSimilarity(new Uint32Array(4), first),
    /Incompatible/,
  );
  assert.throws(() => hashRgbPixels96(new Uint8Array(3)), /Expected/);
});
