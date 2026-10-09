import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const revision = "3ab58f1cec6a03e3e85455cf7aade3bb8561f92e";
const base = `https://raw.githubusercontent.com/marcelpanse/tcg-pocket-collection-tracker/${revision}/frontend/public/model/`;
const files = {
  "model.json":
    "353ec7eecd8d9575af0d08ae17d435850595e5dd3884ac9f2f5d30c289fffd79",
  "group1-shard1of3.bin":
    "1b210632bdea5797cdefa15ce7fc4b57174813407b9e3efbb487b83c30491582",
  "group1-shard2of3.bin":
    "b2c93da8c3f6ffd9d65a3f39a62b658730d944244e5bc80256f8660b483b0fde",
  "group1-shard3of3.bin":
    "93feaca286e127ec98e031c420063c72894c6a3e6fc56da1e51cf5aee6e9e43d",
  "metadata.yaml":
    "70582eba91eea76e081714450098b3c554bf65d852d4548f413ccce6c200d4dc",
};
const destination = resolve("public/scanner-model");
const local = process.argv[2];
console.log(
  "Installing local verification model. Upstream metadata: AGPL-3.0. Review its license before distributing or deploying it.",
);
const verified = [];
for (const [filename, expected] of Object.entries(files)) {
  let content;
  if (local) content = await readFile(resolve(local, filename));
  else {
    const response = await fetch(base + filename, {
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(`Model download failed: ${response.status}`);
    content = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(content).digest("hex") !== expected)
    throw new Error(`Checksum mismatch: ${filename}`);
  verified.push([filename, content]);
}
await mkdir(destination, { recursive: true });
for (const [filename, content] of verified)
  await writeFile(resolve(destination, filename), content);
await writeFile(
  resolve(destination, "SOURCE.txt"),
  `Source: ${base}\nRevision: ${revision}\nModel license: AGPL-3.0 (see metadata.yaml and https://www.gnu.org/licenses/agpl-3.0.html)\nThis local directory is not committed.\n`,
);
console.log("Verified and installed model into public/scanner-model.");
