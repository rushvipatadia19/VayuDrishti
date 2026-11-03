import { Suspense } from 'react';
import { ReportForm } from '@/components/report/ReportForm';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-2xl mx-auto rounded-xl" />}>
      <ReportForm />
    </Suspense>
  );
}
