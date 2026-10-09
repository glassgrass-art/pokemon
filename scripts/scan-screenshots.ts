import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as tf from "@tensorflow/tfjs";
import {
  decodeCardRegions,
  regionBounds,
  cropCardRegion,
  inferCollectionLayout,
} from "../src/utils/cardGeometry";
import { computeCardDctHash } from "../src/utils/perceptualHash";
import { getCardNameIndex } from "../src/utils/cardNameMatcher";

// Raster analysis harness; no browser or app UI is opened or simulated.
const probe = createCanvas(1, 1);
Object.assign(globalThis, {
  CanvasRenderingContext2D: probe.getContext("2d").constructor,
  document: {
    createElement: (tag: string) => {
      if (tag !== "canvas") throw new Error("Canvas only");
      return createCanvas(1, 1);
    },
  },
});
const directory = resolve("public/scanner-model");
const artifact = JSON.parse(
  await readFile(resolve(directory, "model.json"), "utf8"),
);
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
    weightSpecs: artifact.weightsManifest.flatMap(
      (group: any) => group.weights,
    ),
    weightData: weights.buffer.slice(
      weights.byteOffset,
      weights.byteOffset + weights.byteLength,
    ),
    signature: artifact.signature,
  }),
);
const outputDirectory = resolve("scanner-results");
await mkdir(outputDirectory, { recursive: true });
try {
  for (const filename of process.argv.slice(2)) {
    const image = await loadImage(filename);
    const source = createCanvas(image.width, image.height);
    source.getContext("2d").drawImage(image, 0, 0);
    const resized = createCanvas(640, 640),
      context = resized.getContext("2d");
    const size = Math.max(image.width, image.height);
    context.fillStyle = "#000";
    context.fillRect(0, 0, 640, 640);
    context.drawImage(
      source,
      0,
      0,
      (image.width / size) * 640,
      (image.height / size) * 640,
    );
    const rgba = context.getImageData(0, 0, 640, 640).data;
    const rgb = new Uint8Array(640 * 640 * 3);
    for (let pixel = 0; pixel < 640 * 640; pixel++)
      for (let channel = 0; channel < 3; channel++)
        rgb[pixel * 3 + channel] = rgba[pixel * 4 + channel];
    const input = tf.tidy(() =>
      tf.tensor3d(rgb, [640, 640, 3]).div(255).expandDims(0),
    );
    const output = model.execute(input) as tf.Tensor;
    try {
      const regions = decodeCardRegions(
        await output.data(),
        output.shape,
        image.width,
        image.height,
      );
      const annotated = createCanvas(image.width, image.height);
      const drawing = annotated.getContext("2d");
      drawing.drawImage(source, 0, 0);
      const results = [];
      for (const [index, region] of regions.entries()) {
        const crop = cropCardRegion(
          source as unknown as HTMLCanvasElement,
          region,
        ) as unknown as typeof source;
        const hash = computeCardDctHash(crop as unknown as HTMLCanvasElement);
        const matched = getCardNameIndex().matchTwoStepSlot(hash.hashBuf, {
          isOwned: !hash.isGrayscale,
        });
        const bounds = regionBounds(region);
        const cropName = `${basename(filename)}-${index + 1}.png`;
        await writeFile(
          resolve(outputDirectory, cropName),
          crop.toBuffer("image/png"),
        );
        results.push({
          index: index + 1,
          box: {
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.w),
            height: Math.round(bounds.h),
          },
          angle: region.angle,
          detectorScore: region.confidence,
          cardId: matched.card?.id,
          name: matched.card?.nameCn,
          matchScore: matched.similarity,
          margin: matched.margin,
          selected: matched.similarity >= 0.85 && (matched.margin ?? 0) >= 0.02,
          candidates: matched.candidates?.map((candidate) => ({
            id: candidate.card.id,
            name: candidate.card.nameCn,
            score: candidate.similarity,
          })),
          crop: resolve(outputDirectory, cropName),
        });
        drawing.strokeStyle =
          matched.similarity >= 0.85 ? "#22c55e" : "#f97316";
        drawing.lineWidth = 5;
        drawing.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
        drawing.fillStyle = "#000";
        drawing.fillRect(bounds.x, bounds.y, Math.min(bounds.w, 250), 36);
        drawing.fillStyle = "#fff";
        drawing.font = "22px sans-serif";
        drawing.fillText(
          `${index + 1}: ${matched.card?.id || "?"} ${Math.round(matched.similarity * 100)}`,
          bounds.x + 4,
          bounds.y + 27,
        );
      }
      const report = {
        file: filename,
        width: image.width,
        height: image.height,
        layout: inferCollectionLayout(regions),
        count: results.length,
        matched: results.filter((item) => item.cardId).length,
        selected: results.filter((item) => item.selected).length,
        results,
      };
      await writeFile(
        resolve(outputDirectory, basename(filename) + ".json"),
        JSON.stringify(report, null, 2),
      );
      await writeFile(
        resolve(outputDirectory, basename(filename) + ".annotated.jpg"),
        annotated.toBuffer("image/jpeg"),
      );
      console.log(
        JSON.stringify(
          {
            ...report,
            results: results.map(
              ({ index, cardId, name, matchScore, selected }) => ({
                index,
                cardId,
                name,
                matchScore,
                selected,
              }),
            ),
          },
          null,
          2,
        ),
      );
    } finally {
      input.dispose();
      output.dispose();
    }
  }
} finally {
  model.dispose();
}
if (tf.memory().numTensors !== 0) throw new Error("Inference leaked tensors.");
