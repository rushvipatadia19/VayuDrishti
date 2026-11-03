'use client';

import React, { useState } from 'react';
import { IncidentResearch, ResearchSource, SimilarIncidentCase, ActionPlanRecommendation } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';

interface IncidentResearchPanelProps {
  incidentId: string;
  initialResearch: IncidentResearch | null;
  onResearchCompleted?: (research: IncidentResearch) => void;
}

export function IncidentResearchPanel({
  incidentId,
  initialResearch,
  onResearchCompleted,
}: IncidentResearchPanelProps) {
  const [research, setResearch] = useState<IncidentResearch | null>(initialResearch);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function handleRunResearch(forceRefresh = false) {
    if (loading) return;
    setLoading(true);
    setError(null);

    // Staged progress indicators
    setStage('Formulating incident queries & searching public environmental records...');
    const t1 = setTimeout(() => {
      setStage('Reviewing official regulatory and scientific documents...');
    }, 2500);
    const t2 = setTimeout(() => {
      setStage('Comparing documented responses and synthesizing evidence-backed actions...');
    }, 5500);

    try {
      const res = await fetch(`/api/incidents/${incidentId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete incident research');
      }

      setResearch(json.data);
      if (onResearchCompleted) {
        onResearchCompleted(json.data);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setStage('');
    }
  }

  // Helper to render source badge
  function renderSourceTypeBadge(type: string) {
    switch (type) {
      case 'official':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
            Official Govt / CPCB
          </span>
        );
      case 'scientific':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded-full border border-blue-300">
            Scientific / Peer-Reviewed
          </span>
        );
      case 'technical':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-800 rounded-full border border-purple-300">
            Technical Standard
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-700 rounded-full border border-stone-300">
            Public Documentation
          </span>
        );
    }
  }

  // Helper to render priority badge
  function renderPriorityBadge(priority: 'High' | 'Medium' | 'Low') {
    switch (priority) {
      case 'High':
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded border border-rose-300">Priority: High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded border border-amber-300">Priority: Medium</span>;
      case 'Low':
        return <span className="px-2 py-0.5 text-xs font-bold bg-stone-100 text-stone-700 rounded border border-stone-300">Priority: Low</span>;
    }
  }

  return (
    <Card className="p-6 border-stone-200 bg-white shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="text-lg font-bold text-stone-900">
              Similar Incidents & Evidence-Based Actions
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Researches comparable environmental incidents, official regulatory responses, and technical guidance to develop case-specific recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {research && (
            <span className="text-xs text-stone-400">
              Researched: {formatDateTime(research.createdAt)}
            </span>
          )}
          <Button
            onClick={() => handleRunResearch(Boolean(research))}
            disabled={loading}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Researching...
              </span>
            ) : research ? (
              'Research Again'
            ) : (
              'Research Similar Incidents'
            )}
          </Button>
        </div>
      </div>

      {/* Loading State with Meaningful Stages */}
      {loading && (
        <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-emerald-900">{stage}</span>
          </div>
          <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-700 h-full w-2/3 animate-pulse" />
          </div>
          <p className="text-[11px] text-emerald-700 italic">
            Connecting to verified public environmental repositories, CPCB gazettes, and peer-reviewed technical archives...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="text-xs text-rose-800">
            <span className="font-bold">Web Research Notice: </span>
            {error}
          </div>
          <Button
            variant="secondary"
            onClick={() => handleRunResearch(true)}
            className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
          >
            Retry Research
          </Button>
        </div>
      )}

      {/* Empty State before Research is Run */}
      {!research && !loading && !error && (
        <div className="p-8 text-center bg-stone-50/70 border border-dashed border-stone-300 rounded-xl space-y-2">
          <div className="text-stone-400 text-sm font-medium">
            Web research has not been performed for this incident yet.
          </div>
          <p className="text-xs text-stone-500 max-w-lg mx-auto">
            Click <strong>“Research Similar Incidents”</strong> to search public environmental registries, identify similar historical enforcement orders, and generate traceable, citation-backed actions.
          </p>
        </div>
      )}

      {/* Research Results Display */}
      {research && !loading && (
        <div className="space-y-6">
          {/* Section A: Research Summary */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Section A — Evidence Synthesis & Baseline Context
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              {research.summary}
            </p>
          </div>

          {/* Section B: Similar Historical Incidents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Section B — Documented Similar Historical Cases
              </h4>
              <span className="text-[11px] text-stone-400">
                {research.similarIncidents.length} precedent(s) reviewed
              </span>
            </div>

            {research.similarIncidents.length === 0 ? (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 italic">
                No sufficiently similar, well-supported historical incidents were found in this search pass. Technical guidance and statutory baselines are referenced below.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {research.similarIncidents.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-semibold text-stone-900 text-xs">
                        {c.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {c.citationIds.map((cid) => (
                          <span
                            key={cid}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 rounded"
                          >
                            [{cid}]
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-lg">
                      <div>
                        <span className="font-semibold text-stone-700">Location:</span> {c.location}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-700">Period:</span> {c.timePeriod}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-700">Pollutant:</span> {c.pollutant}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-700">Authority:</span> {c.authorityInvolved}
                      </div>
                    </div>

                    <div className="text-xs text-stone-700 space-y-1">
                      <div>
                        <span className="font-semibold text-stone-800">Documented Response:</span> {c.documentedResponse}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800">Reported Outcome:</span> {c.reportedOutcome}
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex flex-col md:flex-row justify-between gap-1">
                      <div>
                        <span className="font-semibold text-stone-600">Relevance:</span> {c.relevance}
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">Comparison Limitations:</span> {c.limitations}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Recommended Action Plan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Section C — Recommended Action Plan
              </h4>
              <span className="text-[11px] text-stone-400">
                Grounded enforcement recommendations
              </span>
            </div>

            <div className="space-y-3">
              {research.recommendedActions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-stone-200 rounded-xl space-y-2 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {renderPriorityBadge(act.priority)}
                      <span className="font-bold text-xs text-stone-900">{act.action}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {act.citationIds.map((cid) => (
                        <span
                          key={cid}
                          className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 rounded"
                        >
                          [{cid}]
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-stone-700 space-y-1.5">
                    <div>
                      <span className="font-semibold text-stone-800">Why this action is relevant:</span> {act.why}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-800">Incident Evidence:</span> {act.incidentEvidence}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-800">Documented Precedent / Guidance:</span> {act.historicalOrGuidanceEvidence}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-lg text-stone-600 mt-2">
                    <div>
                      <span className="font-semibold text-stone-700">Assigned Role:</span> {act.suggestedRole}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700">Preconditions & Caveats:</span> {act.preconditionsAndLimitations}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700">Verification Step:</span> {act.verificationStep}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section D: Sources and Research Coverage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Section D — Verified Sources & Citation Index
              </h4>
              <span className="text-[11px] text-stone-400">
                {research.sources.length} verifiable source(s)
              </span>
            </div>

            <div className="space-y-2">
              {research.sources.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-stone-50/70 border border-stone-200 rounded-lg text-xs space-y-1.5 hover:bg-stone-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        [{s.id}]
                      </span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-emerald-900 hover:underline hover:text-emerald-700"
                      >
                        {s.title} ↗
                      </a>
                    </div>
                    {renderSourceTypeBadge(s.sourceType)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-[11px] text-stone-500">
                    <span>
                      <strong className="text-stone-600">Publisher:</strong> {s.publisher}
                    </span>
                    <span>
                      <strong className="text-stone-600">Domain:</strong> {s.domain}
                    </span>
                    <span>
                      <strong className="text-stone-600">Published:</strong> {s.publishedAt ? formatDateTime(s.publishedAt) : 'Not specified'}
                    </span>
                    <span>
                      <strong className="text-stone-600">Status:</strong> {s.verificationStatus}
                    </span>
                  </div>

                  {s.relevantExcerpt && (
                    <div className="text-[11px] text-stone-600 italic bg-white p-2 rounded border border-stone-200">
                      "{s.relevantExcerpt}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Research Limitations & Legal Notice */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-[11px] text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️ Scope Limitations & Regulatory Notice</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              {research.limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
            <p className="pt-1 text-[10px] text-amber-700 italic">
              AI-assisted environmental research and screening. Recommendations require appropriate human review and do not constitute an official regulatory determination.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
