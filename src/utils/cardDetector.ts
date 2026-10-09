import type { GraphModel } from "@tensorflow/tfjs";
import { decodeCardRegions } from "./cardGeometry";

let modelLoading: Promise<GraphModel> | undefined;
let inferenceQueue: Promise<unknown> = Promise.resolve();
async function loadModel() {
  const tf = await import("@tensorflow/tfjs");
  if (!modelLoading)
    modelLoading = (async () => {
      await tf.ready();
      const env = (import.meta as unknown as { env?: Record<string, string> })
        .env;
      const url = env?.VITE_SCANNER_MODEL_URL || "/scanner-model/model.json";
      return tf.loadGraphModel(url, {
        fetchFunc: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(45000) }),
      });
    })().catch((error) => {
      modelLoading = undefined;
      throw error;
    });
  return { tf, model: await modelLoading };
}

export async function detectCardRegions(canvas: HTMLCanvasElement) {
  // Large batches must not run several GPU graphs at once on a phone.
  const task = inferenceQueue
    .catch(() => undefined)
    .then(async () => {
      const { tf, model } = await loadModel();
      const size = Math.max(canvas.width, canvas.height);
      // Downsample before creating tensors to avoid a full-resolution square GPU allocation.
      const resized = document.createElement("canvas");
      resized.width = 640;
      resized.height = 640;
      const context = resized.getContext("2d");
      if (!context) throw new Error("Unable to prepare card localization.");
      context.fillStyle = "#000";
      context.fillRect(0, 0, 640, 640);
      context.drawImage(
        canvas,
        0,
        0,
        (canvas.width / size) * 640,
        (canvas.height / size) * 640,
      );
      const input = tf.tidy(() => {
        return tf.browser.fromPixels(resized).div(255).expandDims(0);
      });
      let output:
        | import("@tensorflow/tfjs").Tensor
        | import("@tensorflow/tfjs").Tensor[]
        | import("@tensorflow/tfjs").NamedTensorMap;
      try {
        output = await model.executeAsync(input);
        const tensors: import("@tensorflow/tfjs").Tensor[] =
          output instanceof tf.Tensor
            ? [output]
            : Array.isArray(output)
              ? output
              : (Object.values(output) as import("@tensorflow/tfjs").Tensor[]);
        if (tensors.length !== 1)
          throw new Error("Unsupported card detector outputs.");
        return decodeCardRegions(
          await tensors[0].data(),
          tensors[0].shape,
          canvas.width,
          canvas.height,
        );
      } finally {
        input.dispose();
        if (output) tf.dispose(output);
      }
    });
  inferenceQueue = task;
  return task;
}
