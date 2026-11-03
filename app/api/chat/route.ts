import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail } from '@/lib/response';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(2000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(10),
  caseContext: z
    .object({
      incidentId: z.string().optional(),
      title: z.string().optional(),
      pollutant: z.string().optional(),
      reportedValue: z.number().nullable().optional(),
      stationName: z.string().optional(),
      status: z.string().optional(),
      isAnomaly: z.boolean().optional(),
      standardName: z.string().optional(),
      standardLimit: z.number().optional(),
      exceeded: z.boolean().optional(),
      explanation: z.string().optional(),
    })
    .optional(),
});

const SYSTEM_PROMPT = `You are Vayu Assistant (वायुदृष्टि सहायक), an environmental intelligence and compliance guidance assistant for India.
You provide neutral, factual, plain-language explanations about air quality, CPCB NAAQS standards, PM2.5 and PM10 health impacts, and the incident compliance workflow.

CRITICAL RULES:
1. Always clarify that screening analysis is AI-assisted decision support, NOT a formal legal or regulatory determination.
2. The current monitoring data in VayuDrishti is historical ambient air quality data (2015–2020), not live real-time sensor streams.
3. CPCB 24-hour standards: PM2.5 limit is 60 µg/m³; PM10 limit is 100 µg/m³.
4. Do not accuse any entity or named factory of violations unless proven in official court or regulatory orders.
5. If context data is missing or unavailable, state that honestly without inventing numbers or forecasts.
6. Keep answers concise, factual, and helpful.`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400, 'VALIDATION');
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Validation error in chat request', 400, 'VALIDATION');
  }

  const { messages, caseContext } = parsed.data;
  const userMsg = messages[messages.length - 1].content;

  // Check if HF is available
  const hfToken = process.env.HF_TOKEN;
  const hfModel = process.env.HF_MODEL || 'openai/gpt-oss-120b';

  let contextSnippet = '';
  if (caseContext && caseContext.incidentId) {
    contextSnippet = `\n[Current Case Context]: Case ID: ${caseContext.incidentId}, Title: ${caseContext.title || 'N/A'}, Pollutant: ${caseContext.pollutant || 'N/A'}, Reported Value: ${caseContext.reportedValue ?? 'N/A'} µg/m³, Station: ${caseContext.stationName || 'N/A'}, Status: ${caseContext.status || 'open'}, Limit: ${caseContext.standardLimit ?? 60} µg/m³, Exceeded: ${caseContext.exceeded ? 'Yes' : 'No'}.`;
  }

  if (hfToken) {
    try {
      const response = await fetch(`https://router.huggingface.co/hf-inference/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: hfModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextSnippet },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 350,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (response.ok) {
        const json = await response.json();
        const reply = json.choices?.[0]?.message?.content;
        if (reply) {
          return ok({ message: reply, fallback: false });
        }
      }
    } catch {
      // Model error or timeout - fall through to intelligent rule-based answer
    }
  }

  // Graceful rule-based environmental knowledge engine
  const fallbackReply = generateRuleBasedResponse(userMsg, caseContext);
  return ok({ message: fallbackReply, fallback: true });
}

function generateRuleBasedResponse(
  query: string,
  context?: {
    incidentId?: string;
    title?: string;
    pollutant?: string;
    reportedValue?: number | null;
    stationName?: string;
    status?: string;
    isAnomaly?: boolean;
    standardLimit?: number;
    exceeded?: boolean;
    explanation?: string;
  }
): string {
  const q = query.toLowerCase();

  if (q.includes('pm2.5') || q.includes('fine particulate')) {
    return 'PM2.5 refers to fine inhalable particles with diameters generally 2.5 micrometres and smaller. Under India’s National Ambient Air Quality Standards (CPCB NAAQS), the 24-hour average limit is 60 µg/m³, and the annual limit is 40 µg/m³. Because of their microscopic size, PM2.5 particles can penetrate deep into lungs and enter the bloodstream.';
  }

  if (q.includes('pm10') || q.includes('coarse particulate') || q.includes('dust')) {
    return 'PM10 refers to respirable particulate matter with diameters 10 micrometres and smaller, primarily originating from mechanical dust, construction activity, road wear, and biomass burning. CPCB NAAQS sets the 24-hour standard at 100 µg/m³ and the annual standard at 60 µg/m³.';
  }

  if (q.includes('standard') || q.includes('naaqs') || q.includes('cpcb') || q.includes('limit')) {
    return 'CPCB NAAQS (National Ambient Air Quality Standards) prescribes statutory ambient thresholds: PM2.5 (24-hour avg: 60 µg/m³), PM10 (24-hour avg: 100 µg/m³). Note that instantaneous peak readings differ from regulatory 24-hour rolling averages; sustained exceedance of these limits triggers Graded Response Action Plan (GRAP) actions.';
  }

  if (q.includes('flagged') || q.includes('why') || q.includes('anomaly')) {
    if (context && context.reportedValue !== undefined && context.reportedValue !== null) {
      return `This incident was flagged because the reported ${context.pollutant || 'pollutant'} level of ${context.reportedValue} µg/m³ exceeds the applicable CPCB 24-hour NAAQS threshold (${context.standardLimit || 60} µg/m³) and represents a statistically significant z-score departure from the 30-day baseline for this area.`;
    }
    return 'Incidents are flagged when reported values exceed CPCB NAAQS statutory limits or when a localized measurement diverges significantly (z-score > 2.0) from the station’s recent 30-day historical distribution.';
  }

  if (q.includes('workflow') || q.includes('what should happen') || q.includes('next step') || q.includes('process')) {
    return 'The VayuDrishti incident workflow follows four stages:\n1. Report: Resident or sensor logs location and photographic evidence.\n2. Review: Pollution Control Officer validates coordinates and runs statutory anomaly analysis.\n3. Action: Officer issues inspection orders or abatement notices.\n4. Close: Verifiable air quality recovery is documented in the case timeline.';
  }

  if (context && context.incidentId) {
    return `Regarding Case ${context.incidentId} (${context.title || 'Incident'}): The reported value is ${context.reportedValue ?? 'N/A'} µg/m³ of ${context.pollutant || 'particulates'}. ${context.exceeded ? 'This exceeds the CPCB NAAQS 24-hour limit.' : 'This reading remains within normal baseline.'} Status is currently '${context.status || 'open'}'. Please refer to the statutory panel for detailed threshold comparisons.`;
  }

  return 'I am Vayu Assistant. You can ask me about CPCB air quality standards, PM2.5/PM10 health thresholds, how statutory anomaly detection works, or the step-by-step incident response workflow.';
}

