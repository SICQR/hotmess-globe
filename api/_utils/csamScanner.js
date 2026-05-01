/**
 * csamScanner.js — HOTMESS CSAM + image safety scanner
 *
 * Two-layer scanning:
 *   Layer 1 — Microsoft PhotoDNA hash matching (CSAM-specific)
 *   Layer 2 — Cloudflare Workers AI vision (NSFW + explicit content)
 *
 * Both layers are non-blocking by default (fail open) so a scanning
 * outage does not block user uploads. P1 violations always block.
 *
 * Env vars required:
 *   PHOTODNA_SUBSCRIPTION_KEY  — Microsoft PhotoDNA Cloud Service key
 *   CF_ACCOUNT_ID              — Cloudflare account ID
 *   CF_API_TOKEN               — Cloudflare API token (Workers AI: run)
 */

const PHOTODNA_ENDPOINT = 'https://api.microsoftphotodna.com/photodna/v1.0/Match';
const CF_AI_ENDPOINT = (accountId) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/llava-1.5-7b-hf`;

// ── Layer 1: PhotoDNA hash match ──────────────────────────────────────────────

/**
 * Submits image bytes to Microsoft PhotoDNA.
 * Returns true if image matches known CSAM hashes.
 * Throws on network errors so caller can handle fail-open.
 */
export async function photoDnaCheck(imageBuffer) {
  const key = process.env.PHOTODNA_SUBSCRIPTION_KEY;
  if (!key) throw new Error('PHOTODNA_SUBSCRIPTION_KEY not set');

  const res = await fetch(PHOTODNA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
      'Ocp-Apim-Subscription-Key': key,
    },
    body: imageBuffer,
  });

  if (!res.ok) {
    throw new Error(`PhotoDNA returned ${res.status}`);
  }

  const data = await res.json();
  // PhotoDNA returns { IsMatch: bool, Status: { Code, Description } }
  return data.IsMatch === true;
}

// ── Layer 2: Cloudflare Workers AI vision ────────────────────────────────────

/**
 * Runs Cloudflare Workers AI (llava-1.5-7b) to classify image content.
 * Returns { safe: bool, labels: string[], confidence: float }
 */
export async function cfAiImageCheck(imageBuffer) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) throw new Error('CF_ACCOUNT_ID / CF_API_TOKEN not set');

  const b64 = Buffer.from(imageBuffer).toString('base64');

  const res = await fetch(CF_AI_ENDPOINT(accountId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: b64,
      prompt: 'Classify this image. Is it safe for a social/nightlife app? Look for: explicit nudity, sexual content involving minors, graphic violence, illegal content. Reply with JSON: {safe: bool, labels: string[], confidence: float}',
      max_tokens: 128,
    }),
  });

  if (!res.ok) throw new Error(`CF AI returned ${res.status}`);
  const data = await res.json();

  // Parse the LLM text response — it asked for JSON
  try {
    const text = data?.result?.response || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        safe: parsed.safe !== false,
        labels: Array.isArray(parsed.labels) ? parsed.labels : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    }
  } catch { /* fall through */ }

  return { safe: true, labels: [], confidence: 0 };
}

// ── Image fetcher ─────────────────────────────────────────────────────────────

export async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'HOTMESS-SafetyScanner/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Combined scan ─────────────────────────────────────────────────────────────

/**
 * Scans an image URL for CSAM and explicit content.
 *
 * Returns:
 *   { safe: true }  — image is clean
 *   { safe: false, reason: string, priority: 'p1'|'p2', layer: string }
 *
 * Fail-open: if scanning services are unavailable, returns safe=true
 * and logs the error for manual review.
 */
export async function scanImage(imageUrl) {
  let imageBuffer;
  try {
    imageBuffer = await fetchImageBuffer(imageUrl);
  } catch (err) {
    console.error('[csam] image fetch failed', { url: imageUrl, err: err.message });
    return { safe: true, skipped: true, reason: 'fetch_failed' };
  }

  // Layer 1: PhotoDNA (CSAM-specific — highest priority)
  try {
    const isMatch = await photoDnaCheck(imageBuffer);
    if (isMatch) {
      return { safe: false, priority: 'p1', reason: 'csam_hash_match', layer: 'photodna' };
    }
  } catch (err) {
    console.error('[csam] photodna error — fail open', err.message);
    // Continue to layer 2 — do not block on PhotoDNA outage
  }

  // Layer 2: Cloudflare AI vision
  try {
    const cfResult = await cfAiImageCheck(imageBuffer);
    if (!cfResult.safe) {
      const isCsamLabel = cfResult.labels.some(l =>
        /minor|child|underage|csam/i.test(l)
      );
      return {
        safe: false,
        priority: isCsamLabel ? 'p1' : 'p2',
        reason: isCsamLabel ? 'csam_ai_detection' : 'explicit_content',
        layer: 'cf_ai',
        labels: cfResult.labels,
        confidence: cfResult.confidence,
      };
    }
  } catch (err) {
    console.error('[csam] cf ai error — fail open', err.message);
  }

  return { safe: true };
}

