import precached from '@/data/ai-cache.json';

const memory = new Map<string, ExplainResult>();

export interface ExplainFacts {
  pollutant: string;
  stationName: string;
  observed: number;
  averagingPeriod: string;
  limit: number;
  standardName: string;
  clause: string;
  standardExcerpt: string;
  exceeded: boolean;
  ratio: number;
  zScore: number;
  dataQuality: string;
  isAnomaly: boolean;
}

export interface ExplainResult {
  explanation: string;
  nextStep: string;
  unknowns: string[];
}

export function buildPrompt(facts: ExplainFacts): string {
  return `You are an environmental compliance assistant helping an officer review an air-quality incident.
Facts (computed by our code — do not recalculate):
- Pollutant: ${facts.pollutant} at ${facts.stationName}; observed ${facts.observed} µg/m³ (${facts.averagingPeriod} average)
- Applicable limit: ${facts.limit} µg/m³ (${facts.standardName}, ${facts.clause}); exceeded: ${facts.exceeded}; ${facts.ratio}x the limit
- Anomaly: z-score ${facts.zScore} against the recent baseline; data quality: ${facts.dataQuality}
Relevant official text: """${facts.standardExcerpt}"""
Return this exact JSON and nothing else:
{
  "explanation": "<3-4 plain sentences on why this reading was flagged, citing the standard above>",
  "nextStep": "<one practical next step for the officer>",
  "unknowns": ["<one thing not yet established>", "<another if relevant>"]
}
Do not state that a legal violation occurred. Use only the limit given above. Neutral wording only.`;
}

export function fallbackExplanation(facts: ExplainFacts): {
  result: ExplainResult;
  cacheHit: false;
  fallback: true;
} {
  const result: ExplainResult = {
    explanation: `The observed ${facts.pollutant} reading of ${facts.observed} µg/m³ is ${facts.ratio}x the ${facts.averagingPeriod} limit of ${facts.limit} µg/m³ set by ${facts.standardName} (${facts.clause}). This reading is ${facts.exceeded ? 'above' : 'within'} the applicable standard.${facts.isAnomaly ? ' It is also statistically unusual for this location.' : ''} This is an AI-assisted screening and not an official regulatory decision.`,
    nextStep: facts.exceeded
      ? 'Verify the instrument and dispatch an officer to inspect nearby sources.'
      : 'Continue routine monitoring; no immediate action indicated.',
    unknowns: ['Source of the spike is not established', 'Instrument calibration not verified'],
  };
  return { result, cacheHit: false, fallback: true };
}

export async function explain(
  key: string,
  facts: ExplainFacts
): Promise<{ result: ExplainResult; cacheHit: boolean; fallback: boolean }> {
  // 1. Check data/ai-cache.json
  const fileCache = (precached as Record<string, ExplainResult>)[key];
  if (fileCache) {
    return { result: fileCache, cacheHit: true, fallback: false };
  }

  // 2. Check in-memory map
  const memCache = memory.get(key);
  if (memCache) {
    return { result: memCache, cacheHit: true, fallback: false };
  }

  // 3. Try OpenRouter (Primary) or legacy Hugging Face
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || 'openrouter/free';

  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/rushvipatadia19/VayuDrishti',
          'X-Title': 'VayuDrishti Environmental Intelligence',
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [{ role: 'user', content: buildPrompt(facts) }],
          temperature: 0.2,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content ?? '';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // If model wrapped with additional text, attempt regex match
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('bad json from model');
          }
        }
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'explanation' in parsed &&
          'nextStep' in parsed &&
          'unknowns' in parsed &&
          typeof (parsed as Record<string, unknown>).explanation === 'string' &&
          typeof (parsed as Record<string, unknown>).nextStep === 'string' &&
          Array.isArray((parsed as Record<string, unknown>).unknowns)
        ) {
          const typedParsed = parsed as ExplainResult;
          memory.set(key, typedParsed);
          return { result: typedParsed, cacheHit: false, fallback: false };
        }
      }
    } catch {
      // Ignore error and fall through to fallback/legacy
    }
  }

  // Optional legacy fallback to HF if configured and OpenRouter was not
  if (process.env.HF_TOKEN && !openRouterKey) {
    try {
      const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.HF_MODEL ?? 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: buildPrompt(facts) }],
          temperature: 0.2,
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content ?? '';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          'explanation' in parsed &&
          'nextStep' in parsed &&
          'unknowns' in parsed
        ) {
          const typedParsed = parsed as ExplainResult;
          memory.set(key, typedParsed);
          return { result: typedParsed, cacheHit: false, fallback: false };
        }
      }
    } catch {
      // fall through to deterministic fallback
    }
  }

  // 4. Deterministic Rule-Based Fallback
  return fallbackExplanation(facts);
}
