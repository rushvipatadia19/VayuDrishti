import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/response';

interface GeoapifyFeature {
  properties: {
    formatted: string;
    name?: string;
    city?: string;
    suburb?: string;
    state?: string;
    country?: string;
    lat: number;
    lon: number;
    place_id?: string;
  };
}

export interface GeocodeResult {
  formatted: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
}

// In-memory cache for recent queries (max 50)
const cache = new Map<string, { timestamp: number; results: GeocodeResult[] }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return ok<GeocodeResult[]>([]);
  }

  if (q.length < 2) {
    return ok<GeocodeResult[]>([]);
  }

  if (q.length > 120) {
    return fail('Query too long', 400, 'VALIDATION');
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return ok<GeocodeResult[]>(cached.results);
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    // Graceful fallback to matching seeded stations and major Indian cities if no key configured
    const fallbackResults = searchLocalIndianCities(q);
    return ok<GeocodeResult[]>(fallbackResults);
  }

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.set('text', q);
    url.searchParams.set('filter', 'countrycode:in');
    url.searchParams.set('limit', '6');
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      // If Geoapify returns error/quota exceeded, fall back to local search
      const fallbackResults = searchLocalIndianCities(q);
      return ok<GeocodeResult[]>(fallbackResults);
    }

    const data = await res.json();
    const features: GeoapifyFeature[] = data.features || [];

    const results: GeocodeResult[] = features
      .map((f) => ({
        formatted: f.properties.formatted,
        name: f.properties.name || f.properties.city || f.properties.suburb || f.properties.formatted,
        city: f.properties.city || f.properties.suburb || null,
        state: f.properties.state || null,
        country: f.properties.country || 'India',
        lat: f.properties.lat,
        lng: f.properties.lon,
        placeId: f.properties.place_id || `${f.properties.lat},${f.properties.lon}`,
      }))
      .filter((r) => r.lat >= 6 && r.lat <= 38 && r.lng >= 68 && r.lng <= 98); // India coordinate bounding box

    if (cache.size > 100) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, { timestamp: Date.now(), results });

    return ok<GeocodeResult[]>(results);
  } catch {
    // Network or timeout: fallback gracefully
    const fallbackResults = searchLocalIndianCities(q);
    return ok<GeocodeResult[]>(fallbackResults);
  }
}

// Built-in Indian city / region search when external key is not provided or offline
function searchLocalIndianCities(query: string): GeocodeResult[] {
  const norm = query.toLowerCase();
  const knownCities = [
    { name: 'Delhi', city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Kolkata', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
    { name: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
    { name: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
    { name: 'Pune', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
    { name: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
    { name: 'Kanpur', city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
    { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
    { name: 'Indore', city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
    { name: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
    { name: 'Patna', city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
    { name: 'Ludhiana', city: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573 },
    { name: 'Agra', city: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
    { name: 'Varanasi', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
    { name: 'Surat', city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
    { name: 'Rajkot', city: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022 },
    { name: 'Meerut', city: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
    { name: 'Faridabad', city: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178 },
    { name: 'Ghaziabad', city: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
    { name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
    { name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
    { name: 'Vadodara', city: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812 },
    { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910 },
    { name: 'Gurugram', city: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
    { name: 'Kochi', city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
    { name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366 },
    { name: 'Guwahati', city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
    { name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
    { name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322 },
    { name: 'Shimla', city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
    { name: 'Srinagar', city: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.0837, lng: 74.7973 },
    { name: 'Ranchi', city: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
    { name: 'Raipur', city: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
    { name: 'Amritsar', city: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723 },
    { name: 'Jodhpur', city: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243 },
    { name: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
    { name: 'Madurai', city: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198 },
    { name: 'Mysuru', city: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394 }
  ];

  return knownCities
    .filter(
      (c) =>
        c.name.toLowerCase().includes(norm) ||
        c.city.toLowerCase().includes(norm) ||
        c.state.toLowerCase().includes(norm)
    )
    .slice(0, 6)
    .map((c) => ({
      formatted: `${c.name}, ${c.state}, India`,
      name: c.name,
      city: c.city,
      state: c.state,
      country: 'India',
      lat: c.lat,
      lng: c.lng,
      placeId: `local-${c.name.toLowerCase()}`,
    }));
}

