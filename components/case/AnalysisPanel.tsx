import React from 'react';
import type { Analysis } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function AnalysisPanel({
  analysis,
  onAnalyze,
  analyzing,
}: {
  analysis: Analysis | null;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">
              Regulatory Compliance Screening
            </h3>
            {analysis && (
              <Badge
                label={analysis.cacheHit ? '⚡ Instant (Pre-cached)' : '✨ Newly Screened'}
                color="green"
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated statutory threshold comparison & regulatory clause citations.
          </p>
        </div>

        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Analyzing case...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>{analysis ? 'Re-analyze this case' : 'Analyze this case'}</span>
            </>
          )}
        </button>
      </div>

      {!analysis ? (
        <div className="py-8 text-center text-gray-500">
          <p className="font-semibold text-gray-700">No analysis generated yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Click &quot;Analyze this case&quot; to compute statistical z-scores, evaluate CPCB NAAQS limits, and produce official regulatory reasoning.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statutory Reference Quote */}
          <div className="rounded-xl bg-gray-50 p-4 border-l-4 border-primary border-t border-r border-b border-border">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-dark-accent block mb-1">
              Applicable Standard: {analysis.standardRef.name} · {analysis.standardRef.clause}
            </span>
            <blockquote className="text-xs text-gray-700 italic leading-relaxed">
              &quot;{analysis.standardRef.excerpt}&quot;
            </blockquote>
          </div>

          {/* Neutral Explanation */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Compliance Findings
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed bg-surface p-4 rounded-xl border border-border font-normal">
              {analysis.explanation}
            </p>
          </div>

          {/* Next Steps */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Recommended Administrative Action
            </h4>
            <div className="flex items-start gap-3 bg-tint/60 p-4 rounded-xl border border-green-200 text-dark-accent">
              <span className="text-base">📋</span>
              <p className="text-sm font-medium leading-relaxed">
                {analysis.nextStep}
              </p>
            </div>
          </div>

          {/* Unknowns List */}
          {analysis.unknowns && analysis.unknowns.length > 0 && (
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Parameters Not Yet Established
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                {analysis.unknowns.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Disclaimer */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-gray-400 italic">
              Note: AI-assisted screening, not an official regulatory decision. Findings must be verified by designated pollution control officers.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

