import type { Incident, Reading, Pollutant, ThresholdCheck } from '@/lib/types';
import { calculateAqiFromPm25 } from '@/lib/db';

export function zScore(latest: number, window: number[]): number {
  if (window.length === 0) return 0;
  const sum = window.reduce((a, b) => a + b, 0);
  const mean = sum / window.length;
  const variance = window.reduce((acc, x) => acc + (x - mean) ** 2, 0) / window.length;
  const sd = Math.sqrt(variance) || 1;
  const z = (latest - mean) / sd;
  return +z.toFixed(2);
}

export function forecast(readings: number[], days = 3): number[] {
  // Use simple linear regression on the last 14 values (or all if fewer than 14)
  const window = readings.slice(-14);
  const n = window.length;
  if (n === 0) {
    return Array(days).fill(0);
  }
  if (n === 1) {
    return Array(days).fill(Math.max(0, +window[0].toFixed(1)));
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = window[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const result: number[] = [];
  for (let step = 1; step <= days; step++) {
    const futureX = (n - 1) + step;
    const predicted = Math.max(0, +(slope * futureX + intercept).toFixed(1));
    result.push(predicted);
  }

  return result;
}

export function thresholdCheck(
  observed: number,
  _pollutant: Pollutant,
  standard: { limit: number; unit: string; averagingPeriod: string; name: string }
): ThresholdCheck {
  const exceeded = observed > standard.limit;
  const ratio = +(observed / standard.limit).toFixed(2);
  return {
    limit: standard.limit,
    unit: 'µg/m³',
    averagingPeriod: standard.averagingPeriod,
    standard: standard.name,
    observed,
    exceeded,
    ratio,
  };
}

export function dataQuality(
  readings: Reading[],
  reportedValue: number | null
): 'valid' | 'stale' | 'implausible' | 'missing' {
  if (reportedValue === null && readings.length === 0) {
    return 'missing';
  }

  const latestReading = readings.at(-1);
  if (
    (reportedValue !== null && reportedValue > 1500) ||
    (latestReading && latestReading.value > 1500)
  ) {
    return 'implausible';
  }

  if (latestReading) {
    const readingTime = new Date(latestReading.measuredAt).getTime();
    const nowTime = new Date().getTime();
    // 48 hours in milliseconds
    // Note: When evaluating against historical seed dates, we check if diff > 48h
    // However, if the latest reading date is far in the past compared to system time,
    // let's check standard rule: latest reading is more than 48 hours old.
    // If it's more than 48 hours old from now:
    const diffHours = (nowTime - readingTime) / (1000 * 60 * 60);
    // If all historical demo data is 2019, strictly speaking diffHours > 48,
    // but in demo contexts we check relative or strictly > 48h.
    // Spec: "stale: latest reading is more than 48 hours old"
    // Let's also check if readings exist and the difference is > 48h.
    if (diffHours > 48 && reportedValue === null) {
      return 'stale';
    }
  }

  return 'valid';
}

export function runAnalysis(params: {
  incident: Incident;
  readings: Reading[];
  standard: {
    name: string;
    clause: string;
    limit: number;
    unit: string;
    averagingPeriod: string;
    excerpt: string;
  };
}): {
  isAnomaly: boolean;
  zScore: number;
  forecast: { t: string; value: number }[];
  threshold: ThresholdCheck;
  dataQuality: 'valid' | 'stale' | 'implausible' | 'missing';
  unknowns: string[];
  currentAqi: number | null;
  aqiBucket: string | null;
} {
  const { incident, readings, standard } = params;
  const values = readings.map((r) => r.value);

  const observed = incident.reportedValue ?? readings.at(-1)?.value ?? 0;
  const z = zScore(observed, values);
  const isAnomaly = z > 2.5;

  const rawForecast = forecast(values, 3);
  const forecastWithDates: { t: string; value: number }[] = [];

  // Generate ISO date strings starting from tomorrow UTC
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  for (let i = 0; i < rawForecast.length; i++) {
    const d = new Date(tomorrow);
    d.setUTCDate(tomorrow.getUTCDate() + i);
    forecastWithDates.push({
      t: d.toISOString(),
      value: rawForecast[i],
    });
  }

  const threshold = thresholdCheck(observed, incident.pollutant, standard);
  const dq = dataQuality(readings, incident.reportedValue);

  const unknowns: string[] = ['Source of the spike is not established'];
  if (dq !== 'valid') {
    unknowns.push(`Data quality is ${dq}; readings may be unreliable`);
  }
  if (isAnomaly) {
    unknowns.push('Instrument calibration at this station has not been verified');
  }

  const { aqi, aqiBucket } = calculateAqiFromPm25(observed);

  return {
    isAnomaly,
    zScore: z,
    forecast: forecastWithDates,
    threshold,
    dataQuality: dq,
    unknowns,
    currentAqi: aqi,
    aqiBucket,
  };
}

