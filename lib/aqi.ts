export type AqiBucket = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export const AQI_BANDS: { max: number; label: AqiBucket; token: string }[] = [
  { max: 50,  label: 'Good',         token: 'aqi-good' },
  { max: 100, label: 'Satisfactory', token: 'aqi-satisfactory' },
  { max: 200, label: 'Moderate',     token: 'aqi-moderate' },
  { max: 300, label: 'Poor',         token: 'aqi-poor' },
  { max: 400, label: 'Very Poor',    token: 'aqi-very-poor' },
  { max: 500, label: 'Severe',       token: 'aqi-severe' },
];

export function getBand(aqi: number): { label: AqiBucket; token: string } {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[5];
}

// CPCB PM2.5 → AQI with linear interpolation between breakpoints
export function pm25ToAqi(pm25: number): { aqi: number; aqiBucket: AqiBucket } {
  if (pm25 <= 12)    return { aqi: Math.round((pm25 / 12) * 50), aqiBucket: 'Good' };
  if (pm25 <= 35.4)  return { aqi: Math.round(51 + ((pm25 - 12.1) / 23.3) * 49), aqiBucket: 'Satisfactory' };
  if (pm25 <= 55.4)  return { aqi: Math.round(101 + ((pm25 - 35.5) / 19.9) * 99), aqiBucket: 'Moderate' };
  if (pm25 <= 150.4) return { aqi: Math.round(201 + ((pm25 - 55.5) / 94.9) * 99), aqiBucket: 'Poor' };
  if (pm25 <= 250.4) return { aqi: Math.round(301 + ((pm25 - 150.5) / 99.9) * 99), aqiBucket: 'Very Poor' };
  return { aqi: Math.min(500, Math.round(401 + ((pm25 - 250.5) / 249.5) * 99)), aqiBucket: 'Severe' };
}

// CPCB PM10 → AQI
export function pm10ToAqi(pm10: number): { aqi: number; aqiBucket: AqiBucket } {
  if (pm10 <= 50)   return { aqi: Math.round((pm10 / 50) * 50), aqiBucket: 'Good' };
  if (pm10 <= 100)  return { aqi: Math.round(51 + ((pm10 - 51) / 49) * 49), aqiBucket: 'Satisfactory' };
  if (pm10 <= 250)  return { aqi: Math.round(101 + ((pm10 - 101) / 149) * 99), aqiBucket: 'Moderate' };
  if (pm10 <= 350)  return { aqi: Math.round(201 + ((pm10 - 251) / 99) * 99), aqiBucket: 'Poor' };
  if (pm10 <= 430)  return { aqi: Math.round(301 + ((pm10 - 351) / 79) * 99), aqiBucket: 'Very Poor' };
  return { aqi: Math.min(500, Math.round(401 + ((pm10 - 431) / 69) * 99)), aqiBucket: 'Severe' };
}
