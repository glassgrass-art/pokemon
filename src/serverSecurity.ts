import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const IMAGE_HOSTS = new Set([
  "assets.tcgdex.net",
  "limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
  "raw.githubusercontent.com",
  "images.unsplash.com",
]);
export function validateImageUrl(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !IMAGE_HOSTS.has(url.hostname)
  )
    throw new Error("Unsupported image URL");
  return url;
}
export async function readLimitedImage(
  response: globalThis.Response,
  maxBytes = 5 * 1024 * 1024,
) {
  const contentType =
    response.headers.get("content-type")?.split(";")[0].trim() || "";
  if (
    ![
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/avif",
    ].includes(contentType)
  )
    throw new Error("Unsupported image content");
  if (Number(response.headers.get("content-length")) > maxBytes)
    throw new Error("Image too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty image");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Image too large");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  return { buffer: Buffer.concat(chunks), contentType };
}
export function createIpLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.expires <= now) buckets.delete(key);
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const old = buckets.get(key);
    // Bound unauthenticated memory use; never evict active buckets to grant a fresh quota.
    if (!old && buckets.size >= 10000) {
      res.status(503).json({ error: "Service busy. Try later." });
      return;
    }
    const bucket = old || { count: 0, expires: now + windowMs };
    bucket.count++;
    buckets.set(key, bucket);
    if (bucket.count > limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.expires - now) / 1000));
      res.status(429).json({ error: "Too many requests. Please try later." });
      return;
    }
    next();
  };
}
export async function authorizeScan(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !process.env.GEMINI_API_KEY) {
    res
      .status(503)
      .json({
        error:
          "AI scanning is not configured. Local recognition remains available.",
      });
    return;
  }
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    res.status(401).json({ error: "Sign in to use AI scanning." });
    return;
  }
  try {
    const client = createClient(url, key, {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }
    const { error: quotaError } = await client.rpc("consume_scan_quota_v2");
    if (quotaError) {
      res
        .status(429)
        .json({
          error:
            "AI quota exhausted or unavailable. Use local recognition or try tomorrow.",
        });
      return;
    }
    res.locals.scanUserId = data.user.id;
    next();
  } catch {
    res
      .status(503)
      .json({ error: "Unable to verify scanning quota. Please try later." });
  }
}
export function validateScanInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { imageBase64, mimeType } = req.body || {};
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(
      mimeType || "image/jpeg",
    )
  ) {
    res
      .status(400)
      .json({
        error: "Upload a JPEG, PNG, or WebP image smaller than 3.75 MB.",
      });
    return;
  }
  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  if (
    !base64 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    res.status(400).json({ error: "Invalid image encoding." });
    return;
  }
  next();
}
