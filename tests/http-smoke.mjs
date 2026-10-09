import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const port = 43127;
const server = spawn(process.execPath, ["dist/server.cjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    NODE_ENV: "production",
    GEMINI_API_KEY: "",
    SUPABASE_URL: "",
    VITE_SUPABASE_URL: "",
    KOFI_VERIFICATION_TOKEN: "smoke-test-token",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});
const base = "http://127.0.0.1:" + port;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(base + "/api/health");
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Production server did not start");
  assert.equal((await fetch(base)).status, 200);
  assert.equal(
    (
      await fetch(
        base +
          "/api/proxy-image?url=" +
          encodeURIComponent("http://127.0.0.1:80/"),
      )
    ).status,
    400,
  );
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await post("/api/scan-dex", { imageBase64: 42 })).status, 400);
  assert.equal(
    (
      await post("/api/scan-dex", {
        imageBase64: "AAAA",
        mimeType: "image/jpeg",
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await post("/api/kofi/webhook", {
        message_id: "spoof",
        verification_token: "wrong",
        is_public: true,
      })
    ).status,
    403,
  );
  await post("/api/kofi/webhook", {
    message_id: "private",
    verification_token: "smoke-test-token",
    is_public: false,
    from_name: "Private donor",
  });
  assert.deepEqual(
    (await (await fetch(base + "/api/kofi/supporters")).json()).supporters,
    [],
  );
  assert.equal(
    (await (await fetch(base + "/api/kofi/check-badge?name=Anonymous")).json())
      .verified,
    false,
  );
  console.log("Production HTTP smoke: 8 checks passed.");
} finally {
  server.kill();
}
