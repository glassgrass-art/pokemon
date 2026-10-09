import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageUrl,
  readLimitedImage,
  createIpLimiter,
  authorizeScan,
  validateScanInput,
} from "../src/serverSecurity";
test("image proxy rejects internal hosts, credentials, misleading subdomains, ports and protocols", () => {
  for (const url of [
    "http://assets.tcgdex.net/a",
    "https://127.0.0.1/a",
    "https://localhost/a",
    "https://169.254.169.254/latest/meta-data",
    "https://assets.tcgdex.net.attacker.example/a",
    "https://assets.tcgdex.net:444/a",
    "https://user:pass@assets.tcgdex.net/a",
    "file:///etc/passwd",
  ])
    assert.throws(() => validateImageUrl(url));
  assert.equal(
    validateImageUrl("https://assets.tcgdex.net/en/tcgp/A1/001").hostname,
    "assets.tcgdex.net",
  );
});
test("image responses are bounded even without a content length and cannot serve HTML/SVG", async () => {
  await assert.rejects(
    readLimitedImage(
      new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
    ),
  );
  await assert.rejects(
    readLimitedImage(
      new Response(new Uint8Array(9), {
        headers: { "content-type": "image/png" },
      }),
      8,
    ),
    /too large/,
  );
  const image = await readLimitedImage(
    new Response(new Uint8Array(8), {
      headers: { "content-type": "image/png" },
    }),
    8,
  );
  assert.equal(image.buffer.length, 8);
});
test("IP limiter refuses repeated requests and scanning fails closed without server configuration", async () => {
  const statuses: number[] = [];
  let called = 0;
  const res: any = {
    status(n: number) {
      statuses.push(n);
      return this;
    },
    json() {
      return this;
    },
    setHeader() {},
  };
  const req: any = {
    ip: "127.0.0.1",
    socket: {},
    headers: {},
    body: { imageBase64: "AAAA", mimeType: "image/jpeg" },
  };
  const limiter = createIpLimiter(1, 60000);
  limiter(req, res, () => called++);
  limiter(req, res, () => called++);
  assert.equal(called, 1);
  assert.deepEqual(statuses, [429]);
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await authorizeScan(req, res, () => called++);
    assert.equal(statuses.at(-1), 503);
    assert.equal(called, 1);
  } finally {
    if (old !== undefined) process.env.GEMINI_API_KEY = old;
  }
  validateScanInput({ ...req, body: { imageBase64: 42 } }, res, () => called++);
  assert.equal(statuses.at(-1), 400);
});
