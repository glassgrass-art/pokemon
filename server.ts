import { matchCardAgainstFullDex } from './src/scanCardMatcher';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {createIpLimiter,authorizeScan,validateScanInput,validateImageUrl,readLimitedImage} from './src/serverSecurity';
import tcgpCards from './src/data/tcgpCardsDatabase.json';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ limit: '6mb', extended: true }));

import crypto from 'crypto';

// In-memory cache for instant 0-token response on repeated screenshots
const scanCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
function setScanCache(key:string,value:{timestamp:number;data:any}) {
  for(const [id,item] of scanCache) if(Date.now()-item.timestamp>=CACHE_TTL_MS) scanCache.delete(id);
  if(scanCache.size>=256) scanCache.delete(scanCache.keys().next().value!);
  scanCache.set(key,value);
}

// Live verified supporters list from Ko-fi webhooks
const kofiSupporters: Array<{
  id: string;
  name: string;
  amount: string;
  currency: string;
  cups: number;
  badge: string;
  message: string;
  timestamp: number;
}> = [];

// Only use the server-owned key after authentication and quota checks.
function getAIService(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Please configure it in Settings or provide an API key.');
  }
  return new GoogleGenAI({ apiKey: key, httpOptions: {timeout: 45000} });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    totalCardsInDex: tcgpCards.length,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    cachedScans: scanCache.size,
  });
});

// Image export proxy only supports trusted HTTPS image hosts. Redirects are rejected.
app.get('/api/proxy-image',createIpLimiter(60,60000),async(req,res)=>{
  try {
    if(typeof req.query.url!=='string') return res.status(400).send('Missing image URL');
    const url=validateImageUrl(req.query.url);
    const upstream=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!upstream.ok) return res.status(502).send('Image source unavailable');
    const {buffer,contentType}=await readLimitedImage(upstream);
    res.setHeader('Content-Type',contentType);res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','public, max-age=86400');res.send(buffer);
  }catch{res.status(400).send('Unable to load this image safely');}
});

// Ko-fi Webhook receiver (Ko-fi sends POST with data payload on donation)
app.post('/api/kofi/webhook', createIpLimiter(30,60000), (req, res) => {
  try {
    let payload = req.body;
    if (payload.data && typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch {}
    }
    const expected=process.env.KOFI_VERIFICATION_TOKEN;
    const provided=typeof payload.verification_token==='string'?payload.verification_token:'';
    if (!expected) return res.status(503).json({error:'Donation verification not configured'});
    if (Buffer.byteLength(expected)!==Buffer.byteLength(provided) || !crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(provided))) return res.status(403).json({error:'Invalid verification token'});
    if (!payload.message_id || !payload.is_public) return res.status(200).json({received:true});
    if (kofiSupporters.some(s=>s.id==='kofi-'+payload.message_id)) return res.status(200).json({received:true});
    const fromName = String(payload.from_name || 'Anonymous Trainer').trim().slice(0,80);
    const rawAmount = String(payload.amount || '3.00');
    const currency = payload.currency || 'USD';
    const message = String(payload.message || '').slice(0,500);

    // Calculate badge STRICTLY from actual payment amount received
    const numAmount = parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 3.0;
    const verifiedBadge =
      numAmount >= 8.5
        ? '☕☕☕ Master Supporter'
        : numAmount >= 5.5
        ? '☕☕ Super Supporter'
        : '☕ Supporter';
    const verifiedCups = Math.max(1, Math.round(numAmount / 3));

    kofiSupporters.unshift({
      id: `kofi-${payload.message_id || Date.now()}`,
      name: fromName,
      amount: `$${numAmount.toFixed(2)}`,
      currency,
      cups: verifiedCups,
      badge: verifiedBadge,
      message,
      timestamp: Date.now(),
    });

    if (kofiSupporters.length>100) kofiSupporters.length=100;
    console.log(`[Ko-fi Webhook] Verified donation: ${fromName} paid $${numAmount.toFixed(2)} -> Awarded ${verifiedBadge}`);
    res.status(200).json({ received: true, verifiedBadge });
  } catch (err) {
    console.error('[Ko-fi Webhook] Error processing:', err);
    res.status(200).json({ received: false });
  }
});

// Supporters query endpoint
app.get('/api/kofi/supporters', (_req, res) => {
  res.json({ supporters: kofiSupporters });
});

// Trainer names are not identities; never award account benefits using name matching.
app.get('/api/kofi/check-badge',(_req,res)=>res.json({verified:false}));

// Official Dex API: Direct lookup from authentic Pokémon TCG Pocket Database
app.get('/api/dex/cards', (req, res) => {
  const { pack, search } = req.query;
  let results = tcgpCards as any[];
  if (pack && pack !== 'ALL') {
    results = results.filter((c) => c.expansionCode === pack || c.pack === pack);
  }
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.cardNumber?.includes(s) ||
        c.nameCn?.includes(s) ||
        c.nameEn?.toLowerCase().includes(s)
    );
  }
  res.json({ total: results.length, cards: results });
});

// Fast Name Extractor Endpoint for Step 1 of Two-Step Precise Recognition
app.post('/api/scan-dex-names', createIpLimiter(30,60000), validateScanInput, authorizeScan, async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 in request' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgHash = crypto.createHash('md5').update(res.locals.scanUserId + '_names_' + cleanBase64).digest('hex');

    const cached = scanCache.get(imgHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json({
        ...cached.data,
        cached: true,
        tokensUsed: 0,
        engine: 'memory-cache (0-token)',
        durationMs: Date.now() - startTime,
      });
      return;
    }

    const ai = getAIService();

    const namePrompt = `You are a high-precision card detector and reader for "Pokémon Trading Card Game Pocket" (Pokémon TCG Pocket).
The screenshot shows a 3-column card collection/gallery grid (3 cards per row, ordered left-to-right, row-by-row).
The game UI language is typically Traditional Chinese (繁體中文) or English, or Japanese.
Detect every visible card in the 3-column grid (row by row, left to right).

For each card:
- "slotIndex": integer starting at 0
- "name": Pokémon/Trainer name in the in-game language (e.g., "妙蛙種子", "妙蛙花 EX", "皮卡丘", "超夢 ex", "噴火龍", "騎拉帝納 ex", "Bulbasaur", "Mewtwo ex", "Charizard")
- "isEx": boolean (true if card has EX / ex mark)
- "isOwned": boolean (false if unowned grey silhouette/number, true if owned)
- "count": number of copies (default 1 if owned, 0 if unowned)
- "box_2d": [ymin, xmin, ymax, xmax] normalized bounding box coordinates on scale 0 to 1000 (e.g. [140, 25, 270, 200])

Output strictly valid JSON:
{
  "detectedNames": [
    { "slotIndex": 0, "name": "妙蛙種子", "isEx": false, "isOwned": true, "count": 1, "box_2d": [140, 25, 270, 200] }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            { text: namePrompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    if (parsed.detectedNames && (!Array.isArray(parsed.detectedNames) || parsed.detectedNames.length>100)) throw new Error('Invalid OCR response');
    if (parsed.detectedCards && (!Array.isArray(parsed.detectedCards) || parsed.detectedCards.length>100)) throw new Error('Invalid recognition response');

    const resultData = {
      success: true,
      detectedNames: parsed.detectedNames || [],
      durationMs: Date.now() - startTime,
      tokensUsed: response.usageMetadata?.totalTokenCount || 0,
      engine: 'gemini-2.5-flash (Fast Name OCR)',
    };

    setScanCache(imgHash, { timestamp: Date.now(), data: resultData });
    res.json(resultData);
  } catch (err: any) {
    console.warn('API /api/scan-dex-names error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to extract card names', success: false });
  }
});

// Gemini Vision Screen Recognition Endpoint - Optimized with Caching & 3,639 Full-Dex Matching
app.post('/api/scan-dex', createIpLimiter(30,60000), validateScanInput, authorizeScan, async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 in request' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgHash = crypto.createHash('md5').update(res.locals.scanUserId + cleanBase64).digest('hex');

    // 1. Instant Cache Check (0 Token & <5ms response on duplicate uploads)
    const cached = scanCache.get(imgHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json({
        ...cached.data,
        cached: true,
        tokensUsed: 0,
        engine: 'memory-cache (0-token)',
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // 2. Custom or built-in Gemini API key
    const ai = getAIService();

    const prompt = `You are an expert AI recognizing screenshots from the mobile game "Pokémon Trading Card Game Pocket" (Pokémon TCG Pocket / 宝可梦TCG口袋版).
The user uploaded a screenshot of a 3-column card collection/gallery screen (3 cards per row, ordered left-to-right, row-by-row).
The game UI language is typically Traditional Chinese (繁體中文), English, or Japanese.

CRITICAL HIGH-RARITY & SPECIAL VARIANT IDENTIFICATION:
Many cards are high-rarity secret or alternate-art variants. You MUST look carefully at the visual style and bottom-left rarity symbols:
1. 'CR' (Crown Rare / 皇冠卡): 100% full metallic GOLD frame, gold filigree, and golden Pokémon art! (e.g. Gold Pikachu ex, Gold Mewtwo ex, Gold Charizard ex). Set rarity to "CR".
2. '3S' (3 Stars / 三星实境卡 / 沉浸卡): Borderless, expansive cinematic illustration with panoramic background (e.g. Immersive Pikachu, Immersive Mewtwo, Immersive Charizard). Set rarity to "3S".
3. '2RS' (2 Rainbow Stars / 2彩星 / 色违 EX): A shiny Pokémon with vivid MULTICOLORED / RAINBOW STARBURST SPARKLES bursting in the background! (e.g. Shiny Giratina ex, Shiny Darkrai ex, Shiny Mega Absol ex). Set rarity to "2RS".
4. '1RS' (1 Rainbow Star / 1彩星 / 色违非EX): Regular shiny Pokémon with rainbow star sparkles. Set rarity to "1RS".
5. '2S' (2 Stars / 二星 / SAR / 特别全画 / SR): Full-art card with illustrated colorful framing or story scene (e.g. SAR Eevee ex, SAR Lillie, SAR Erika, SAR Mew ex). Set rarity to "2S".
6. '1S' (1 Star / 一星 / AR / 特别插画): Art Rare full illustration of non-ex basic Pokémon. Set rarity to "1S".
7. '4D' (4 Diamonds / 四菱形 / 普通 EX): Standard double-rare EX card with regular dark border. ONLY use 4D if the card is NOT a shiny, gold, immersive, or full-art card!
8. '1D', '2D', '3D': Regular common/uncommon/rare cards.

CARD NUMBERS (CRITICAL):
Look at the bottom-left or bottom edge of each card for the printed card number (e.g. "285/226", "377/380", "281", "002"). High rarity cards have card numbers greater than 200 (e.g. 235, 259, 281, 285, 364, 376, 377, 378). Always extract the card number if readable!

For each card slot visible in the grid (row by row, left to right):
- slotIndex: 0, 1, 2...
- nameCn: Chinese Pokémon/Card name (e.g. "超级阿勃梭鲁 ex", "骑拉帝纳 ex", "达克莱伊 ex", "墨海马", "皮卡丘 ex")
- nameEn: English Pokémon/Card name (e.g. "Mega Absol ex", "Giratina ex", "Darkrai ex", "Horsea", "Pikachu ex")
- isEx: boolean, true if this is an "ex" card
- type: Elemental type ('grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'colorless', or 'trainer')
- rarity: Exact rarity tier ('CR', '3S', '2S', '1S', '2RS', '1RS', '4D', '3D', '2D', '1D')
- cardNumber: Card number if readable at the bottom or shown on unowned grey box (e.g. "001", "005", "230", "281", "285", "377", "378"), or null
- packCode: Expansion code if visible or inferred (e.g. "A1", "A2", "A2b", "A3", "A3b", "B1", "B2", "B3", "B4", "A4b"), or null
- owned: boolean (true if full colorful card or partially visible colorful card, false ONLY if it is a dark grey silhouette/number box)
- count: integer (look at bottom right for badges like 1, 2, 5, etc. Default 1 if owned, 0 if unowned)
- box_2d: [ymin, xmin, ymax, xmax] - normalized bounding box coordinates on scale 0 to 1000 representing the exact card borders
- confidence: number between 0 and 1; use 0 for unreadable or uncertain cards. This is a model estimate, not measured accuracy.

Output strictly valid JSON matching this schema:
{
  "detectedCards": [
    {
      "slotIndex": 0,
      "nameCn": "骑拉帝纳 ex",
      "nameEn": "Giratina ex",
      "isEx": true,
      "type": "psychic",
      "rarity": "2RS",
      "cardNumber": "377",
      "packCode": "A4b",
      "owned": true,
      "count": 1,
      "box_2d": [140, 25, 270, 200],
      "confidence": 0.99
    }
  ]
}`;

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      if (![429,500,502,503,504].includes(Number(err.status || err.code))) throw err;
      console.warn('Temporary scan failure; retrying once.');
      await new Promise((r) => setTimeout(r, 1000));
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    // Cross-reference EACH detected card slot against the entire 3,639 card database
    const enrichedCards = (Array.isArray(parsed.detectedCards) ? parsed.detectedCards.slice(0,100).filter((card: any) => card && typeof card === 'object') : []).map((dc: any) => {
      const bestMatch = matchCardAgainstFullDex(dc, tcgpCards as any[]);

      return {
        ...dc,
        confidence: typeof dc.confidence==='number' && Number.isFinite(dc.confidence) ? Math.min(1,Math.max(0,dc.confidence)) : 0,
        count: Number.isInteger(dc.count) ? Math.min(99,Math.max(0,dc.count)) : 0,
        needsReview: !bestMatch || !dc.cardNumber || !dc.packCode,
        name: dc.nameCn || dc.name || (bestMatch ? bestMatch.nameCn : ''),
        nameCn: dc.nameCn || (bestMatch ? bestMatch.nameCn : ''),
        nameEn: dc.nameEn || (bestMatch ? bestMatch.nameEn : ''),
        matchedCard: bestMatch || null,
        cardNumber: bestMatch ? bestMatch.cardNumber : (dc.cardNumber || ''),
        packCode: bestMatch ? bestMatch.pack : (dc.packCode || ''),
      };
    });

    const tokensUsed = response.usageMetadata?.totalTokenCount || 1450;
    const durationMs = Date.now() - startTime;

    const resultData = {
      success: true,
      totalDetected: enrichedCards.length,
      detectedCards: enrichedCards,
      tokensUsed,
      durationMs,
      cached: false,
      engine: 'gemini-2.5-flash (full-dex)',
    };

    // Store in cache for 24h
    setScanCache(imgHash, {
      timestamp: Date.now(),
      data: resultData,
    });

    res.json(resultData);
  } catch (err: any) {
    console.error('Gemini card recognition failed:', err);
    res.status(500).json({
      error: err.message || 'Gemini recognition failed',
      fallbackToLocal: true,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`Server running on http://${process.env.HOST || '127.0.0.1'}:${PORT}`);
  });
}

startServer();
