'use client';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Something went wrong.</h2>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary"
      >
        Try again
      </button>
    </div>
  );
}
