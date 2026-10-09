import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";
import { decodeCardRegions, regionBounds } from "../src/utils/cardGeometry";
import {
  getPrecomputedCardHashes,
  hashRgbPixels96,
  calculateDctSimilarity,
} from "../src/utils/perceptualHash";

const directory = resolve("public/scanner-model");
const artifact = JSON.parse(
  await readFile(resolve(directory, "model.json"), "utf8"),
);
const specs = artifact.weightsManifest.flatMap((group: any) => group.weights);
const weights = Buffer.concat(
  await Promise.all(
    artifact.weightsManifest
      .flatMap((group: any) => group.paths)
      .map((file: string) => readFile(resolve(directory, file))),
  ),
);
await tf.setBackend("cpu");
const model = await tf.loadGraphModel(
  tf.io.fromMemory({
    modelTopology: artifact.modelTopology,
    weightSpecs: specs,
    weightData: weights.buffer.slice(
      weights.byteOffset,
      weights.byteOffset + weights.byteLength,
    ),
    signature: artifact.signature,
  }),
);
const inputImage = process.argv[2];
const expectedId = process.argv[3];
if (!inputImage)
  throw new Error(
    "Usage: npm run test:scanner-model -- <card image> [expected card ID]",
  );
// Place a real card on a neutral canvas to exercise localization independently of game UI.
// This is a component smoke test, not a real screenshot accuracy benchmark.
const card = await sharp(inputImage)
  .resize(300, 420, { fit: "fill" })
  .png()
  .toBuffer();
const scene = await sharp({
  create: { width: 640, height: 960, channels: 3, background: "#202630" },
})
  .composite([{ input: card, left: 170, top: 220 }])
  .png()
  .toBuffer();
const image = sharp(scene);
const { width, height } = await image.metadata();
const size = Math.max(width!, height!);
const padded = await image
  .removeAlpha()
  .toColorspace("srgb")
  .extend({
    top: 0,
    left: 0,
    right: size - width!,
    bottom: size - height!,
    background: "#000000",
  })
  .png()
  .toBuffer();
const { data } = await sharp(padded)
  .removeAlpha()
  .resize(640, 640, { fit: "fill", kernel: "linear" })
  .raw()
  .toBuffer({ resolveWithObject: true });
const input = tf.tidy(() =>
  tf.tensor3d(data, [640, 640, 3]).div(255).expandDims(0),
);
try {
  const output = (await model.executeAsync(input)) as tf.Tensor;
  try {
    const regions = decodeCardRegions(
      await output.data(),
      output.shape,
      width!,
      height!,
    );
    assert.ok(
      regions.length > 0,
      "The real model did not detect the supplied complete card.",
    );
    const pixels = await sharp(inputImage)
      .resize(96, 96, { fit: "fill", kernel: "cubic" })
      .toColorspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer();
    const hash = hashRgbPixels96(pixels).hashBuf;
    const matches = getPrecomputedCardHashes()
      .map((item) => ({
        id: item.cardId,
        score: calculateDctSimilarity(hash, item.hashBuf).similarity,
      }))
      .sort((a, b) => b.score - a.score);
    if (expectedId) assert.equal(matches[0].id, expectedId);
    const bounds = regionBounds(regions[0]);
    const cropPixels = await sharp(scene)
      .extract({
        left: Math.round(bounds.x),
        top: Math.round(bounds.y),
        width: Math.round(bounds.w),
        height: Math.round(bounds.h),
      })
      .resize(96, 96, { fit: "fill", kernel: "cubic" })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const croppedHash = hashRgbPixels96(cropPixels).hashBuf;
    const cropMatches = getPrecomputedCardHashes()
      .map((item) => ({
        id: item.cardId,
        score: calculateDctSimilarity(croppedHash, item.hashBuf).similarity,
      }))
      .sort((a, b) => b.score - a.score);
    if (expectedId)
      assert.ok(
        cropMatches.slice(0, 3).some((match) => match.id === expectedId),
        "Detected crop did not match the expected card.",
      );
    assert.ok(
      cropMatches[0].score > 0.85,
      "Detected crop does not resemble a catalog card.",
    );
    console.log(
      JSON.stringify(
        {
          outputShape: output.shape,
          detectedCards: regions.length,
          sourceMatches: matches.slice(0, 3),
          cropMatches: cropMatches.slice(0, 3),
        },
        null,
        2,
      ),
    );
  } finally {
    output.dispose();
  }
} finally {
  input.dispose();
  model.dispose();
}
assert.equal(tf.memory().numTensors, 0, "Inference leaked tensors.");
