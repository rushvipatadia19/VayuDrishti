export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toFixed(decimals);
}
