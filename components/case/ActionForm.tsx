'use client';
import { useState } from 'react';
import type { CaseStatus } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PhotoUpload } from '@/components/report/PhotoUpload';

// Strict server transitions:
// open → under_review
// under_review → action_taken | open
// action_taken → closed | under_review
// closed → nothing
const ALLOWED_NEXT_STATUS: Record<CaseStatus, CaseStatus[]> = {
  open: ['under_review'],
  under_review: ['action_taken', 'open'],
  action_taken: ['closed', 'under_review'],
  closed: [],
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open (Return for intake)',
  under_review: 'Under Review (Assign officer)',
  action_taken: 'Action Taken (Log remediation)',
  closed: 'Closed (Final Resolution)',
};

export function ActionForm({
  incidentId,
  currentStatus,
  onActionAdded,
  onStatusChanged,
}: {
  incidentId: string;
  currentStatus: CaseStatus;
  onActionAdded: (text: string, imageUrl: string | null) => Promise<void>;
  onStatusChanged: (newStatus: CaseStatus, reason?: string) => Promise<void>;
}) {
  const isClosed = currentStatus === 'closed';

  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [targetStatus, setTargetStatus] = useState<CaseStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const allowedOptions = ALLOWED_NEXT_STATUS[currentStatus] || [];

  async function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setActionError(null);
    setSubmittingAction(true);
    try {
      await onActionAdded(text.trim(), imageUrl);
      setText('');
      setImageUrl(null);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!targetStatus) return;
    setStatusError(null);
    setSubmittingStatus(true);
    try {
      await onStatusChanged(targetStatus as CaseStatus, statusReason.trim() || undefined);
      setTargetStatus('');
      setStatusReason('');
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setSubmittingStatus(false);
    }
  }

  if (isClosed) {
    return (
      <Card className="p-6 bg-gray-50 border-gray-200 text-center">
        <span className="text-xl">🔒</span>
        <h4 className="font-bold text-gray-700 mt-1">This case is closed</h4>
        <p className="text-xs text-gray-500 mt-1">
          Final regulatory determination recorded. No further actions or status modifications may be logged.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Add Corrective Action */}
      <Card className="p-5 space-y-4">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Log Corrective Action</h4>
          <p className="text-xs text-gray-500">Record field inspection, water misting, or source shutdown.</p>
        </div>

        {actionError && <ErrorBanner message={actionError} />}

        <form onSubmit={handleAddAction} className="space-y-4">
          <textarea
            rows={3}
            maxLength={500}
            placeholder="e.g. Dispatched anti-smog mist cannon to Sector-4 roadway..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <PhotoUpload onUpload={(url) => setImageUrl(url)} />

          <Button
            type="submit"
            variant="primary"
            loading={submittingAction}
            disabled={!text.trim()}
            className="w-full py-2 text-sm"
          >
            Add action
          </Button>
        </form>
      </Card>

      {/* 2. Transition Status */}
      <Card className="p-5 space-y-4">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Advance Case Status</h4>
          <p className="text-xs text-gray-500">
            Current status: <strong className="capitalize">{currentStatus.replace('_', ' ')}</strong>
          </p>
        </div>

        {statusError && <ErrorBanner message={statusError} />}

        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label htmlFor="next-status" className="block text-xs font-semibold text-gray-700 mb-1">
              Select Permitted Next Transition
            </label>
            <select
              id="next-status"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as CaseStatus)}
              className="w-full rounded-xl border border-border p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose next step --</option>
              {allowedOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {STATUS_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-reason" className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Administrative Justification (optional)
            </label>
            <input
              id="status-reason"
              type="text"
              maxLength={200}
              placeholder="e.g. Officer verification completed on-site"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            loading={submittingStatus}
            disabled={!targetStatus}
            className="w-full py-2 text-sm"
          >
            Update status
          </Button>
        </form>
      </Card>
    </div>
  );
}
