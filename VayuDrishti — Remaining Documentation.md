# VayuDrishti — Remaining Documentation

# 03. Frontend Guidelines

**For:** Diva · Read before writing any component or page.

## §1 Principles

- Mobile-first: design at 390 px, then scale up.
- Tailwind 4 tokens only (`app/globals.css` `@theme`). No inline styles, no raw hex, no `tailwind.config.ts`.
- Every data screen has four states: **loading** (Skeleton), **error** (ErrorBanner + retry), **empty** (EmptyState), **data**. Ship all four.
- All HTTP through `api()` / `useApi()` in `lib/`. No raw `fetch` in components.
- Use shared primitives: `Button`, `Card`, `Badge`, `EmptyState`, `ErrorBanner`, `Skeleton`. Never a second button style.
- `'use client'` only for hooks, events, browser APIs. Server Components are the default.
- Accessibility: labels on every input, `aria-label` on icon-only buttons, `role="alert"` on errors, colour + text always.
- Neutral language: "potential concern", never blame a named facility.

## §2 Tailwind 4 token setup (`app/globals.css`)

```css
@import "tailwindcss";
@theme {
  --color-primary:         #237a3b;
  --color-primary-hover:   #1b5e2d;
  --color-accent:          #3aa347;
  --color-tint:            #ecf9ee;
  --color-dark-accent:     #14532d;
  --color-surface:         #ffffff;
  --color-bg:              #f3f4f6;
  --color-border:          #e5e7eb;
  --color-aqi-good:        #1a7a1a;
  --color-aqi-satisfactory:#4caf50;
  --color-aqi-moderate:    #f59e0b;
  --color-aqi-poor:        #f97316;
  --color-aqi-very-poor:   #ef4444;
  --color-aqi-severe:      #7b0000;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-card: 0.75rem;
}
```

Use token classes: `bg-primary`, `text-dark-accent`, `rounded-card`. Never `bg-[#237a3b]`.

## §3 Shared UI components (`components/ui/`)

Create these before building any screen.

```tsx
// Button.tsx
type Variant = 'primary'|'secondary'|'ghost';
export function Button({ variant='primary', loading, children, disabled, ...rest }: { variant?: Variant; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const s = { primary:'bg-primary text-white hover:bg-primary-hover', secondary:'border border-border bg-surface text-dark-accent hover:bg-tint', ghost:'text-primary hover:bg-tint' };
  return (
    <button {...rest} disabled={disabled||loading}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${s[variant]} ${rest.className??''}`}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

// Card.tsx
export function Card({ children, className='' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-card border border-border p-4 shadow-sm ${className}`}>{children}</div>;
}

// Badge.tsx
const p = { green:'bg-tint text-dark-accent', yellow:'bg-yellow-100 text-yellow-800', orange:'bg-orange-100 text-orange-800', red:'bg-red-100 text-red-800', maroon:'bg-red-200 text-red-900', grey:'bg-gray-100 text-gray-700' } as const;
export function Badge({ label, color='grey' }: { label: string; color?: keyof typeof p }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p[color]}`}>{label}</span>;
}

// ErrorBanner.tsx
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: ()=>void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <span className="flex-1 text-sm">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-sm underline">Retry</button>}
    </div>
  );
}

// EmptyState.tsx
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
      <p className="font-medium text-gray-700">{title}</p>
      {body && <p className="text-sm">{body}</p>}
    </div>
  );
}

// Skeleton.tsx
export function Skeleton({ className='' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} aria-hidden />;
}
```

## §4 Data-fetching pattern

```typescript
// lib/api.ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL??''}${path}`,
    { ...init, headers: { 'Content-Type':'application/json', ...init?.headers } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

// lib/useApi.ts  ('use client')
'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
export function useApi<T>(path: string) {
  const [data, setData]       = useState<T|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try   { setData(await api<T>(path)); }
    catch (e) { setError((e as Error).message); }
    finally   { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}
```

In every Client Component:

```tsx
const { data, loading, error, refetch } = useApi<StationSummary[]>('/api/stations');
if (loading) return <Skeleton className="h-64 w-full" />;
if (error)   return <ErrorBanner message={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState title="No stations found" />;
// render data
```

## §5 AQI band helper (`lib/aqi.ts`)

```typescript
export type AqiBucket = 'Good'|'Satisfactory'|'Moderate'|'Poor'|'Very Poor'|'Severe';
export const AQI_BANDS = [
  { max:50,  label:'Good'         as AqiBucket, color:'var(--color-aqi-good)',         badge:'green'  as const },
  { max:100, label:'Satisfactory' as AqiBucket, color:'var(--color-aqi-satisfactory)', badge:'green'  as const },
  { max:200, label:'Moderate'     as AqiBucket, color:'var(--color-aqi-moderate)',     badge:'yellow' as const },
  { max:300, label:'Poor'         as AqiBucket, color:'var(--color-aqi-poor)',         badge:'orange' as const },
  { max:400, label:'Very Poor'    as AqiBucket, color:'var(--color-aqi-very-poor)',    badge:'red'    as const },
  { max:500, label:'Severe'       as AqiBucket, color:'var(--color-aqi-severe)',       badge:'maroon' as const },
];
export function getBand(aqi: number) {
  return AQI_BANDS.find(b => aqi <= b.max) ?? AQI_BANDS[5];
}
```

Always show **colour + text label** together. Never colour alone.

## §6 Map (Leaflet — client-side only)

```tsx
// components/IndiaMap.tsx  ('use client')
'use client';
import { useEffect, useRef } from 'react';
import type { StationSummary } from '@/lib/types';
import { getBand } from '@/lib/aqi';
export function IndiaMap({ stations, onSelect }: { stations: StationSummary[]; onSelect:(s:StationSummary)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let cleanup = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cleanup) return;
      const map = L.map(ref.current!).setView([20.5, 78.9], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      stations.forEach(s => {
        const { color, label } = getBand(s.aqi ?? 0);
        L.circleMarker([s.lat, s.lng], { radius:10, color:'#fff', weight:1, fillColor:color, fillOpacity:0.85 })
          .bindTooltip(`${s.city} — ${label} (AQI ${s.aqi??'—'})`)
          .on('click', () => onSelect(s))
          .addTo(map);
      });
    })();
    return () => { cleanup = true; };
  }, [stations, onSelect]);
  return <div ref={ref} className="h-[480px] w-full rounded-xl" aria-label="India air quality map" />;
}
```

Load with `next/dynamic` and `ssr: false`:

```tsx
import dynamic from 'next/dynamic';
const IndiaMap = dynamic(() => import('@/components/IndiaMap').then(m => m.IndiaMap), { ssr: false });
```

## §7 Photo upload (Cloudinary unsigned)

```tsx
// components/PhotoUpload.tsx  ('use client')
'use client';
import { useState } from 'react';
export function PhotoUpload({ onUpload }: { onUpload:(url:string)=>void }) {
  const [preview, setPreview] = useState<string|null>(null);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string|null>(null);
  async function handle(file: File) {
    setBusy(true); setErr(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload failed');
      setPreview(json.secure_url); onUpload(json.secure_url);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="photo">Photo (optional)</label>
      <input id="photo" type="file" accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      {busy    && <p className="text-sm text-gray-500">Uploading…</p>}
      {err     && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {preview && <img src={preview} alt="Upload preview" className="mt-2 h-32 w-auto rounded-lg object-cover" />}
      <p className="text-xs text-gray-400">Report still submits without a photo.</p>
    </div>
  );
}
```

## §8 Root layout (`app/layout.tsx`)

```tsx
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans text-gray-900">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <span className="font-bold text-dark-accent">🌿 VayuDrishti</span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
            Historical data (2015–2020), not live
          </span>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

## §9 Accessibility checklist (before every commit)

- [ ] Every `<input>` has a `<label>` or `aria-label`
- [ ] Icon-only buttons have `aria-label`
- [ ] Error containers have `role="alert"`
- [ ] AQI: colour + text label always shown together
- [ ] Keyboard focus visible at 390 px width
- [ ] Text contrast ≥ 4.5 : 1

## §10 Antigravity task prompt (one task at a time)

```
Read docs/03_FRONTEND_GUIDELINES.md and docs/10_UI_UX_DESIGN.md.
Task: build [component or page, e.g. app/report/page.tsx].
Tailwind 4 tokens from globals.css — no raw hex, no inline styles.
Use Button, Card, Badge, ErrorBanner, EmptyState, Skeleton from components/ui/.
All data through useApi() — no raw fetch.
Four states per data screen: loading, error, empty, data.
'use client' only for hooks/events. Next.js 16: await params.
No new deps. Accessible: labels, aria-label, role=alert, colour+text for AQI. Mobile-first (390 px).
Show how you tested it. List files changed.
```
