'use client';

import React, { useState } from 'react';
import { Incident } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ActionFormProps {
  incident: Incident;
  onEventAdded: (event: any) => void;
}

export function ActionForm({ incident, onEventAdded }: ActionFormProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = incident.status === 'closed';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting || isClosed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'action',
          text: text.trim(),
          imageUrl: null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record corrective action');
      }

      onEventAdded(json.data);
      setText('');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isClosed) {
    return (
      <Card className="p-4 bg-stone-50 border-stone-200 text-xs text-stone-500 italic text-center">
        This case is closed. Corrective action logging is locked.
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-white border-stone-200">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-serif font-bold text-stone-900 text-sm">
            Log Official Corrective Action
          </h3>
          <p className="text-[11px] text-stone-500">
            Record site inspections, notices issued under Section 31A of Air Act 1981, or mitigation steps.
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
          Officer Mode Active
        </span>
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={2}
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Issued directive to regional industrial unit to inspect particulate scrubbing equipment and implement dust suppression within 24 hours."
          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !text.trim()}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-4 py-2"
          >
            {submitting ? 'Recording Action...' : 'Record Corrective Action'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
