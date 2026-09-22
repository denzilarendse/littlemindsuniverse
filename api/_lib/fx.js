import { HttpError } from './http.js';

const API = 'https://api.frankfurter.dev/v2/rate';

export function supportedDisplayCurrencies() {
  return new Set(
    String(process.env.SUPPORTED_DISPLAY_CURRENCIES || 'USD,ZAR,EUR,GBP')
      .split(',').map(v => v.trim().toUpperCase()).filter(Boolean)
  );
}

export async function fetchReferenceRate(base, quote) {
  base = String(base || '').toUpperCase();
  quote = String(quote || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote)) throw new HttpError(400, 'Unsupported currency');
  if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0, 10), source: 'identity' };
  const response = await fetch(`${API}/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'LittleMindsUniverse/4.0' }
  });
  if (!response.ok) throw new HttpError(502, 'FX reference rate is unavailable');
  const data = await response.json();
  const rate = Number(data?.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new HttpError(502, 'FX provider returned an invalid rate');
  return { rate, date: data?.date || new Date().toISOString().slice(0, 10), source: 'frankfurter-v2' };
}
