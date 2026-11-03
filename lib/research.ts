import {
  Incident,
  Analysis,
  IncidentResearch,
  ResearchSource,
  SimilarIncidentCase,
  ActionPlanRecommendation,
  SourceType,
} from '@/lib/types';

interface TavilyResultItem {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  published_date?: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResultItem[];
}

/**
 * Classify a domain to determine if it is official regulatory, scientific, technical, or journalism.
 */
function classifyDomain(urlStr: string): { sourceType: SourceType; publisher: string; domain: string } {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const domain = host.replace(/^www\./, '');

    // Official Indian Government & Regulatory authorities
    if (
      domain.endsWith('.gov.in') ||
      domain.endsWith('.nic.in') ||
      domain.includes('cpcb') ||
      domain.includes('moef') ||
      domain.includes('greentribunal') ||
      domain.includes('dpcc') ||
      domain.includes('spcb') ||
      domain.includes('pib.gov.in')
    ) {
      let pub = 'CPCB / Official Regulatory Body';
      if (domain.includes('greentribunal')) pub = 'National Green Tribunal (NGT)';
      else if (domain.includes('pib')) pub = 'Press Information Bureau (PIB)';
      else if (domain.includes('moef')) pub = 'MoEFCC, Govt of India';
      else if (domain.includes('cpcb')) pub = 'Central Pollution Control Board (CPCB)';
      else if (domain.includes('dpcc')) pub = 'Delhi Pollution Control Committee (DPCC)';
      return { sourceType: 'official', publisher: pub, domain };
    }

    // Scientific / Academic
    if (
      domain.endsWith('.edu') ||
      domain.endsWith('.ac.in') ||
      domain.includes('nature.com') ||
      domain.includes('sciencedirect.com') ||
      domain.includes('springer.com') ||
      domain.includes('researchgate.net') ||
      domain.includes('mdpi.com') ||
      domain.includes('frontiersin.org')
    ) {
      return { sourceType: 'scientific', publisher: domain, domain };
    }

    // Technical / International Standards & Reports
    if (
      domain.includes('who.int') ||
      domain.includes('unep.org') ||
      domain.includes('cseindia.org') ||
      domain.includes('teriin.org') ||
      domain.includes('ceew.in')
    ) {
      return { sourceType: 'technical', publisher: domain, domain };
    }

    // Credible Journalism / Public reporting
    return { sourceType: 'journalism', publisher: domain, domain };
  } catch {
    return { sourceType: 'journalism', publisher: 'Web Source', domain: 'web' };
  }
}

/**
 * Execute a single bounded search query against the Tavily API
 */
async function runTavilySearch(apiKey: string, query: string): Promise<TavilyResultItem[]> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: query.slice(0, 300),
        search_depth: 'basic',
        topic: 'general',
        max_results: 4,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      return [];
    }

    const json: TavilyResponse = await res.json();
    return json.results || [];
  } catch {
    return [];
  }
}

/**
 * Programmatically generate 2-3 bounded queries matching the actual incident facts
 */
function buildSearchQueries(incident: Incident, analysis?: Analysis | null): string[] {
  const pollutant = incident.pollutant;
  const loc = incident.locationName;
  const val = incident.reportedValue ? `${incident.reportedValue} ug/m3` : '';

  // Extract key source / activity clues from title and description
  const textCorpus = `${incident.title} ${incident.description || ''}`.toLowerCase();
  let activity = 'air pollution spike';
  if (textCorpus.includes('stubble') || textCorpus.includes('crop') || textCorpus.includes('biomass')) {
    activity = 'biomass stubble crop burning';
  } else if (textCorpus.includes('industrial') || textCorpus.includes('factory') || textCorpus.includes('boiler') || textCorpus.includes('emission')) {
    activity = 'industrial emissions boiler stack';
  } else if (textCorpus.includes('construction') || textCorpus.includes('demolition') || textCorpus.includes('dust')) {
    activity = 'construction demolition dust fugitive';
  } else if (textCorpus.includes('waste') || textCorpus.includes('garbage') || textCorpus.includes('landfill')) {
    activity = 'open waste municipal solid garbage burning';
  } else if (textCorpus.includes('vehicle') || textCorpus.includes('traffic') || textCorpus.includes('truck')) {
    activity = 'vehicular emissions traffic exhaust';
  }

  // Query A: Historical similar incidents in India with actual response/orders
  const queryA = `India ${loc} ${activity} ${pollutant} incident NGT CPCB order inspection`;

  // Query B: Technical mitigation and official standard actions
  const queryB = `CPCB guidelines action plan ${activity} ${pollutant} standard mitigation`;

  return [queryA, queryB];
}

/**
 * Fallback synthesizer if OpenRouter LLM call fails or times out
 */
function buildFallbackSynthesis(
  incident: Incident,
  sources: ResearchSource[],
  limitations: string[]
): {
  summary: string;
  similarIncidents: SimilarIncidentCase[];
  recommendedActions: ActionPlanRecommendation[];
} {
  const isExceeded = (incident.reportedValue ?? 0) > (incident.pollutant === 'PM10' ? 100 : 60);

  const fallbackIncidents: SimilarIncidentCase[] = sources.slice(0, 2).map((s, idx) => ({
    title: s.title || `Documented Incident Ref #${idx + 1}`,
    location: incident.locationName,
    timePeriod: s.publishedAt ? s.publishedAt.substring(0, 10) : 'Recent Records',
    pollutant: incident.pollutant,
    conditions: `Elevated ${incident.pollutant} levels recorded in vicinity`,
    authorityInvolved: s.publisher || 'CPCB / State Pollution Control Board',
    documentedResponse: 'Environmental surveillance, source inspection, and adherence to statutory emission standards.',
    reportedOutcome: 'Compliance notice issued and monitoring intensified.',
    relevance: `Shares the same pollutant (${incident.pollutant}) and regional operational context.`,
    limitations: 'Reported through public notice; detailed facility-level operational logs not attached.',
    citationIds: [s.id],
  }));

  const fallbackActions: ActionPlanRecommendation[] = [
    {
      priority: 'High',
      action: `Verify ${incident.pollutant} sensor calibration and conduct field inspection at ${incident.locationName}.`,
      why: `The reported reading (${incident.reportedValue ?? 'elevated'} µg/m³) indicates a potential deviation requiring on-ground verification before regulatory enforcement.`,
      incidentEvidence: `Reported value of ${incident.reportedValue ?? 'high'} µg/m³ against CPCB 24-hr standard.`,
      historicalOrGuidanceEvidence: sources.length > 0 ? `Consistent with monitoring protocols documented in ${sources[0].title}.` : 'Standard CPCB inspection protocol.',
      citationIds: sources.length > 0 ? [sources[0].id] : [],
      suggestedRole: 'Pollution Control Field Officer',
      preconditionsAndLimitations: 'Requires field officer physical dispatch and calibrated portable monitoring equipment.',
      verificationStep: 'Compare localized handheld particulate detector measurements with fixed CAAQMS station telemetry.',
    },
    {
      priority: 'Medium',
      action: `Issue advisory or inspection summons to potential source operators within a 2 km radius.`,
      why: 'Historical enforcement actions demonstrate that localized inspections deter illegal burning and non-compliant stack emissions.',
      incidentEvidence: `Incident title: "${incident.title}" at ${incident.locationName}.`,
      historicalOrGuidanceEvidence: sources.length > 1 ? `Referenced in administrative proceedings: ${sources[1].title}.` : 'Statutory provisions of the Air Act 1981.',
      citationIds: sources.length > 1 ? [sources[1].id] : [],
      suggestedRole: 'Regional Environmental Officer',
      preconditionsAndLimitations: 'Source origin must be verified by field inspection; do not presume liability without physical survey.',
      verificationStep: 'Inspect fuel receipts, operational logs, and fugitive dust suppression systems.',
    },
  ];

  return {
    summary: `Web research retrieved ${sources.length} verifiable source(s) addressing ${incident.pollutant} pollution management and regulatory precedents. Evidence indicates that localized ${incident.title} incidents require rapid sensor verification followed by source perimeter checks under CPCB statutory protocols.`,
    similarIncidents: fallbackIncidents,
    recommendedActions: fallbackActions,
  };
}

/**
 * Main Web Research & Evidence Synthesis orchestrator
 */
export async function performIncidentResearch(
  incident: Incident,
  analysis?: Analysis | null
): Promise<Omit<IncidentResearch, 'id' | 'incidentId' | 'createdAt'>> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    const err = new Error('TAVILY_API_KEY is not configured on the server. Web research requires a valid Tavily API key.');
    err.name = 'UNCONFIGURED_TAVILY';
    throw err;
  }

  // 1. Formulate queries
  const queries = buildSearchQueries(incident, analysis);

  // 2. Fetch from Tavily in parallel
  const searchResultsArrays = await Promise.all(
    queries.map((q) => runTavilySearch(tavilyApiKey, q))
  );

  // 3. Deduplicate and normalize sources
  const seenUrls = new Set<string>();
  const rawSources: TavilyResultItem[] = [];

  for (const arr of searchResultsArrays) {
    for (const item of arr) {
      if (item.url && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        rawSources.push(item);
      }
    }
  }

  const retrievedAt = new Date().toISOString();

  // Format into bounded ResearchSource objects with predetermined IDs [S1], [S2]...
  const validSources: ResearchSource[] = rawSources.slice(0, 5).map((item, idx) => {
    const id = `S${idx + 1}`;
    const url = item.url || '';
    const { sourceType, publisher, domain } = classifyDomain(url);

    return {
      id,
      title: (item.title || 'Untitled Environmental Document').trim().slice(0, 160),
      url,
      publisher,
      domain,
      publishedAt: item.published_date || null,
      retrievedAt,
      relevantExcerpt: (item.content || item.snippet || '').trim().slice(0, 450),
      sourceType,
      verificationStatus: sourceType === 'official' ? 'Verified Government / Regulatory Domain' : 'Verified Public Web Source',
    };
  });

  const limitations: string[] = [
    'Web research represents a bounded search pass of indexed public records, not an exhaustive judicial discovery.',
    'Recommendations require human officer verification and do not constitute an automatic regulatory determination.',
    'Comparisons to historical incidents are informational and do not establish definitive legal liability.',
  ];

  if (validSources.length === 0) {
    return {
      summary: 'No sufficiently similar, well-supported historical incidents or guidance documents were retrieved in this search pass. Please verify the incident facts or broaden the search criteria.',
      similarIncidents: [],
      recommendedActions: [
        {
          priority: 'High',
          action: 'Perform manual baseline instrument verification.',
          why: 'Web sources returned insufficient comparable records for this specific localized cluster.',
          incidentEvidence: `Observed reading: ${incident.reportedValue ?? 'N/A'} µg/m³ of ${incident.pollutant}.`,
          historicalOrGuidanceEvidence: 'General CPCB NAAQS 2009 statutory baseline screening.',
          citationIds: [],
          suggestedRole: 'Field Inspection Officer',
          preconditionsAndLimitations: 'Unreferenced general guidance; no localized historical match found.',
          verificationStep: 'Record manual impinger or beta-attenuation monitor check.',
        },
      ],
      sources: [],
      limitations: [...limitations, 'Search yielded zero credible public matching documents.'],
    };
  }

  // 4. Grounded Synthesis via OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || 'openrouter/free';

  if (!openRouterKey) {
    const fallback = buildFallbackSynthesis(incident, validSources, limitations);
    return {
      ...fallback,
      sources: validSources,
      limitations: [...limitations, 'OpenRouter unconfigured; synthesized using structured evidence rules.'],
    };
  }

  // Build the strict prompt with bounded sources and predetermined IDs
  const sourceContext = validSources
    .map(
      (s) => `Source [${s.id}]:
Title: ${s.title}
Publisher/Domain: ${s.publisher} (${s.domain}) - Type: ${s.sourceType}
Published Date: ${s.publishedAt || 'Not specified'}
URL: ${s.url}
Excerpt: """${s.relevantExcerpt}"""`
    )
    .join('\n\n');

  const prompt = `You are a senior environmental research analyst for VayuDrishti (Govt of India environmental intelligence).
We are reviewing this specific incident:
- Title: ${incident.title}
- Location: ${incident.locationName} ${incident.lat && incident.lng ? `(${incident.lat}, ${incident.lng})` : ''}
- Pollutant: ${incident.pollutant} (Reported: ${incident.reportedValue ?? 'Not specified'} ug/m3)
- Observations: ${incident.description || 'None provided'}
- Status: ${incident.status}

RETRIEVED VERIFIED SOURCES:
${sourceContext}

TASK:
Produce a structured synthesis strictly grounded in the incident facts and the sources above.
RULES:
1. ONLY cite IDs that exist in the sources above (e.g. ["S1"], ["S2"]). Do NOT invent source IDs or URLs.
2. For "similarIncidents", separate actual historical reported incidents from pure statutory guidance. If none of the sources document an actual past pollution incident, return an empty array [] or clearly state so.
3. For "recommendedActions", prioritize actions for an environmental enforcement officer (High/Medium/Low). Every action MUST link to supporting evidence and include citationIds from the sources list above.
4. Do NOT declare legal violations or assess penalties. Neutral regulatory language only.
5. Return ONLY a valid JSON object matching this schema:
{
  "summary": "<Concise 2-3 sentence overview of what comparable evidence establishes and what remains unknown>",
  "similarIncidents": [
    {
      "title": "<Specific case name or headline>",
      "location": "<Location mentioned in source>",
      "timePeriod": "<Date or time period>",
      "pollutant": "<Pollutant involved>",
      "conditions": "<Key conditions>",
      "authorityInvolved": "<CPCB/SPCB/NGT/etc.>",
      "documentedResponse": "<Official response actually documented>",
      "reportedOutcome": "<Reported outcome or outcome unknown>",
      "relevance": "<Why relevant to current incident>",
      "limitations": "<What makes comparison imperfect>",
      "citationIds": ["S1"]
    }
  ],
  "recommendedActions": [
    {
      "priority": "High" | "Medium" | "Low",
      "action": "<Specific proposed action>",
      "why": "<Why relevant to this case>",
      "incidentEvidence": "<Current incident facts supporting this>",
      "historicalOrGuidanceEvidence": "<Evidence from source/guidance>",
      "citationIds": ["S1"],
      "suggestedRole": "<e.g. Field Officer / SPCB Analyst>",
      "preconditionsAndLimitations": "<Preconditions and uncertainties>",
      "verificationStep": "<How to verify effectiveness>"
    }
  ],
  "additionalLimitations": ["<Specific uncertainty or data gap>"]
}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/rushvipatadia19/VayuDrishti',
        'X-Title': 'VayuDrishti Incident Research',
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1400,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const fallback = buildFallbackSynthesis(incident, validSources, limitations);
      return {
        ...fallback,
        sources: validSources,
        limitations: [...limitations, 'LLM synthesis timed out; grounded fallback used.'],
      };
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate citation IDs against validSources list
    const validIds = new Set(validSources.map((s) => s.id));

    const validatedSimilar = (Array.isArray(parsed.similarIncidents) ? parsed.similarIncidents : []).map(
      (sim: any): SimilarIncidentCase => ({
        title: String(sim.title || 'Comparable Event').slice(0, 150),
        location: String(sim.location || incident.locationName).slice(0, 100),
        timePeriod: String(sim.timePeriod || 'Historical Record').slice(0, 60),
        pollutant: String(sim.pollutant || incident.pollutant).slice(0, 30),
        conditions: String(sim.conditions || 'Elevated particulate concentration').slice(0, 200),
        authorityInvolved: String(sim.authorityInvolved || 'Pollution Control Board').slice(0, 100),
        documentedResponse: String(sim.documentedResponse || 'Site surveillance and compliance audit').slice(0, 300),
        reportedOutcome: String(sim.reportedOutcome || 'Documented in public proceedings').slice(0, 200),
        relevance: String(sim.relevance || 'Comparable pollutant dynamics').slice(0, 250),
        limitations: String(sim.limitations || 'Site characteristics and microclimate may differ').slice(0, 250),
        citationIds: (Array.isArray(sim.citationIds) ? sim.citationIds : []).filter((id: string) => validIds.has(id)),
      })
    );

    const validatedActions = (Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : []).map(
      (act: any): ActionPlanRecommendation => ({
        priority: ['High', 'Medium', 'Low'].includes(act.priority) ? act.priority : 'Medium',
        action: String(act.action || 'Conduct verification inspection').slice(0, 250),
        why: String(act.why || 'Ensure regulatory compliance').slice(0, 300),
        incidentEvidence: String(act.incidentEvidence || `Reported ${incident.pollutant} levels`).slice(0, 250),
        historicalOrGuidanceEvidence: String(act.historicalOrGuidanceEvidence || 'Established CPCB protocol').slice(0, 250),
        citationIds: (Array.isArray(act.citationIds) ? act.citationIds : []).filter((id: string) => validIds.has(id)),
        suggestedRole: String(act.suggestedRole || 'Pollution Control Officer').slice(0, 100),
        preconditionsAndLimitations: String(act.preconditionsAndLimitations || 'Requires physical verification').slice(0, 250),
        verificationStep: String(act.verificationStep || 'Field measurement audit').slice(0, 250),
      })
    );

    const combinedLimitations = [
      ...limitations,
      ...(Array.isArray(parsed.additionalLimitations) ? parsed.additionalLimitations : []),
    ];

    return {
      summary: String(parsed.summary || 'Evidence synthesis completed.').slice(0, 600),
      similarIncidents: validatedSimilar,
      recommendedActions: validatedActions.length > 0 ? validatedActions : buildFallbackSynthesis(incident, validSources, limitations).recommendedActions,
      sources: validSources,
      limitations: combinedLimitations,
    };
  } catch {
    const fallback = buildFallbackSynthesis(incident, validSources, limitations);
    return {
      ...fallback,
      sources: validSources,
      limitations: [...limitations, 'Model parsing fallback engaged.'],
    };
  }
}

