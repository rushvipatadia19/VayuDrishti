import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Page not found.</h2>
      <Link href="/" className="text-sm text-dark-accent underline">← Back to dashboard</Link>
    </div>
  );
}

