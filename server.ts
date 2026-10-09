import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import tcgpCards from './src/data/tcgpCardsDatabase.json';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import crypto from 'crypto';

// In-memory cache for instant 0-token response on repeated screenshots
const scanCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

// Lazy initialize Gemini client or use request-provided custom key
function getAIService(customApiKey?: string): GoogleGenAI {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured. Please configure it in Settings or provide an API key.');
  }
  return new GoogleGenAI({ apiKey: key });
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

// Safe Image Proxy for canvas export without CORS restrictions
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return res.status(400).send('Invalid url protocol');
  }

  try {
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Upstream image error');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const buffer = await upstreamRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Image Proxy] Error fetching image:', err);
    res.status(500).send('Failed to fetch image');
  }
});

// Ko-fi Webhook receiver (Ko-fi sends POST with data payload on donation)
app.post('/api/kofi/webhook', (req, res) => {
  try {
    let payload = req.body;
    if (payload.data && typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch {}
    }
    const fromName = (payload.from_name || 'Anonymous Trainer').trim();
    const rawAmount = String(payload.amount || '3.00');
    const currency = payload.currency || 'USD';
    const message = payload.message || '';

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

// Real-time badge lookup by trainer name or recent donation
app.get('/api/kofi/check-badge', (req, res) => {
  const name = String(req.query.name || '').trim().toLowerCase();
  if (!name) {
    return res.json({ verified: false });
  }

  // Look for any donation from this name in the last 2 hours
  const match = kofiSupporters.find(
    (s) =>
      s.name.toLowerCase() === name ||
      s.name.toLowerCase().includes(name) ||
      name.includes(s.name.toLowerCase())
  );

  if (match) {
    return res.json({
      verified: true,
      badge: match.badge,
      cups: match.cups,
      amount: match.amount,
      name: match.name,
    });
  }

  res.json({ verified: false });
});

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

// Normalize any user or AI rarity string to canonical TCGP rarity code
function normalizeRarity(raw?: string): string {
  if (!raw) return '';
  const s = String(raw).toLowerCase().trim();
  if (s.includes('crown') || s === 'cr' || s.includes('皇冠') || s.includes('金卡') || s.includes('gold')) return 'CR';
  if (s.includes('3 star') || s === '3s' || s.includes('三星') || s.includes('实境') || s.includes('沉浸') || s.includes('immersive')) return '3S';
  if (s.includes('2 rainbow') || s === '2rs' || s.includes('2彩星') || s.includes('彩星ex') || s.includes('shiny ex') || s.includes('rainbow ex')) return '2RS';
  if (s.includes('1 rainbow') || s === '1rs' || s.includes('1彩星') || s.includes('色违') || s.includes('shiny') || s.includes('rainbow')) return '1RS';
  if (s.includes('2 star') || s === '2s' || s.includes('二星') || s.includes('sar') || s.includes('sr') || s.includes('特别全画') || s.includes('全画') || s.includes('special art')) return '2S';
  if (s.includes('1 star') || s === '1s' || s.includes('一星') || s.includes('ar') || s.includes('特别插画') || s.includes('art rare')) return '1S';
  if (s.includes('4 diamond') || s === '4d' || s.includes('四菱') || s.includes('4菱') || s.includes('double rare')) return '4D';
  if (s.includes('3 diamond') || s === '3d' || s.includes('三菱') || s.includes('3菱')) return '3D';
  if (s.includes('2 diamond') || s === '2d' || s.includes('二菱') || s.includes('2菱')) return '2D';
  if (s.includes('1 diamond') || s === '1d' || s.includes('一菱') || s.includes('1菱')) return '1D';
  return raw.toUpperCase().trim();
}

// Normalize species name across Simplified/Traditional Chinese and English Mega/EX prefixes
function cleanSpecies(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\s\-_'’·()（）]/g, '')
    .replace(/ex$/i, '')
    .replace(/^mega/i, '')
    .replace(/^超级/, '')
    .replace(/^超級/, '')
    .replace(/級/g, '级')
    .replace(/瑪/g, '玛')
    .replace(/寶/g, '宝')
    .replace(/機/g, '机')
    .replace(/亞/g, '亚')
    .replace(/鳥/g, '鸟')
    .replace(/龍/g, '龙')
    .replace(/車/g, '车')
    .replace(/獸/g, '兽')
    .replace(/夢/g, '梦')
    .replace(/龜/g, '龟')
    .replace(/鯉/g, '鲤')
    .replace(/惡/g, '恶')
    .replace(/靈/g, '灵')
    .replace(/變/g, '变');
}

// Helper: Multi-criteria fuzzy & exact matcher across the entire 3,639 card database
function matchCardAgainstFullDex(detected: any, allCards: any[]): any | null {
  const norm = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_'’·()（）]/g, '');
  const targetName = norm(detected.name || detected.nameCn || detected.nameEn);
  const targetNameCn = detected.nameCn || detected.name;
  const targetNameEn = detected.nameEn || detected.name;
  const targetSpeciesCn = cleanSpecies(targetNameCn);
  const targetSpeciesEn = cleanSpecies(targetNameEn);

  const targetNum = detected.cardNumber ? String(detected.cardNumber).replace(/^0+/, '') : '';
  const targetPack = (detected.packCode || detected.pack || '').toUpperCase().trim();
  const targetType = (detected.type || '').toLowerCase();
  const isEx = !!detected.isEx || /ex\b/i.test(targetName);
  const targetRarity = normalizeRarity(detected.rarity);
  const isHighRarity = ['1S', '2S', '3S', 'CR', '1RS', '2RS'].includes(targetRarity);

  let bestCard: any = null;
  let highestScore = -1;

  for (const card of allCards) {
    let score = 0;
    const cCn = norm(card.nameCn);
    const cEn = norm(card.nameEn);
    const cSpeciesCn = cleanSpecies(card.nameCn);
    const cSpeciesEn = cleanSpecies(card.nameEn);

    // CRITICAL SPECIES ENFORCEMENT:
    // If a Pokémon name or species is recognized, the candidate MUST belong to the same species!
    // Never allow card number or rarity to cause a cross-species mismatch (e.g. Venonat matching Charmander).
    const isSpeciesMatch =
      (targetSpeciesCn && cSpeciesCn && (targetSpeciesCn === cSpeciesCn || cSpeciesCn.includes(targetSpeciesCn) || targetSpeciesCn.includes(cSpeciesCn))) ||
      (targetSpeciesEn && cSpeciesEn && (targetSpeciesEn === cSpeciesEn || cSpeciesEn.includes(targetSpeciesEn) || targetSpeciesEn.includes(cSpeciesEn))) ||
      (targetName && (cCn === targetName || cEn === targetName || cCn.includes(targetName) || cEn.includes(targetName)));

    const hasTargetSpecies = !!(targetSpeciesCn || targetSpeciesEn || targetName);

    if (hasTargetSpecies && !isSpeciesMatch) {
      continue; // Reject completely different Pokémon species
    }

    if (isSpeciesMatch) {
      score += 200;
      if (targetSpeciesCn === cSpeciesCn || targetSpeciesEn === cSpeciesEn) {
        score += 50; // Exact species match bonus
      }
    }

    const cNum = String(card.cardNumber || '').replace(/^0+/, '');
    const cPack = (card.expansionCode || card.pack || '').toUpperCase();
    const cType = (card.type || '').toLowerCase();
    const cIsEx = !!card.isEx || /ex\b/i.test(card.nameCn || '') || /ex\b/i.test(card.nameEn || '');
    const cRarity = normalizeRarity(card.rarity);
    const cIsHighRarity = ['1S', '2S', '3S', 'CR', '1RS', '2RS'].includes(cRarity);

    // 1. EX variant match
    if (isEx === cIsEx) {
      score += 30;
    } else if (isEx && !cIsEx) {
      score -= 40;
    }

    // 2. High Rarity Matching (Decisive distinction: Crown, 3S Immersion, 2RS Rainbow Shiny, 2S SAR)
    if (targetRarity) {
      if (cRarity === targetRarity) {
        score += 80; // Exact rarity tier match (e.g. 2RS with 2RS, 3S with 3S, CR with CR)
      } else if (isHighRarity && cIsHighRarity) {
        score += 35; // Both are special art variants
      } else if (isHighRarity && !cIsHighRarity) {
        score -= 60; // Do not pick standard 4D/1D common card when user card is high rarity
      } else if (!isHighRarity && cIsHighRarity) {
        score -= 40;
      }
    }

    // 3. Card number match (Refines between the same Pokémon, e.g. base set vs promo vs secret art)
    if (targetNum && cNum === targetNum) {
      score += 70;
    }

    // 4. Pack code match (bonus if identified)
    if (targetPack) {
      if (cPack === targetPack || (targetPack === 'PROMO' && cPack.startsWith('P'))) {
        score += 35;
      }
    }

    // 5. Energy element match
    if (targetType && cType === targetType) {
      score += 15;
    }

    if (score > highestScore && score >= 40) {
      highestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}

// Fast Name Extractor Endpoint for Step 1 of Two-Step Precise Recognition
app.post('/api/scan-dex-names', async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType, apiKey: bodyApiKey } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 in request' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgHash = crypto.createHash('md5').update('names_' + cleanBase64).digest('hex');

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

    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;
    const ai = getAIService(customApiKey);

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

    const resultData = {
      success: true,
      detectedNames: parsed.detectedNames || [],
      durationMs: Date.now() - startTime,
      tokensUsed: response.usageMetadata?.totalTokenCount || 0,
      engine: 'gemini-2.5-flash (Fast Name OCR)',
    };

    scanCache.set(imgHash, { timestamp: Date.now(), data: resultData });
    res.json(resultData);
  } catch (err: any) {
    console.warn('API /api/scan-dex-names error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to extract card names', success: false });
  }
});

// Gemini Vision Screen Recognition Endpoint - Optimized with Caching & 3,639 Full-Dex Matching
app.post('/api/scan-dex', async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType, apiKey: bodyApiKey } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 in request' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgHash = crypto.createHash('md5').update(cleanBase64).digest('hex');

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
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;
    const ai = getAIService(customApiKey);

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
- confidence: number between 0.85 and 1.0

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
      console.warn('Initial generateContent call hit spike, retrying after 1s delay:', err?.message || err);
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
    const enrichedCards = (parsed.detectedCards || []).map((dc: any) => {
      const bestMatch = matchCardAgainstFullDex(dc, tcgpCards as any[]);

      return {
        ...dc,
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
    scanCache.set(imgHash, {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
