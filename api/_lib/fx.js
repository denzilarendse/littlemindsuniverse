import { HttpError } from './http.js';

const API = 'https://api.frankfurter.dev/v2/rate';
const cache = new Map();
const DEFAULT_FRESH_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_STALE_MS = 36 * 60 * 60 * 1000;

function positiveMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cachePolicy() {
  return {
    freshMs: positiveMs(process.env.FX_CACHE_FRESH_MS, DEFAULT_FRESH_MS),
    maxStaleMs: positiveMs(process.env.FX_CACHE_MAX_STALE_MS, DEFAULT_MAX_STALE_MS)
  };
}

function cacheKey(base, quote) {
  return `${base}:${quote}`;
}

function cachedRate(base, quote, now, allowStale = false) {
  const entry = cache.get(cacheKey(base, quote));
  if (!entry) return null;
  const ageMs = now - entry.cachedAt;
  const { freshMs, maxStaleMs } = cachePolicy();
  if (ageMs <= freshMs || (allowStale && ageMs <= maxStaleMs)) {
    return { ...entry.value, source: ageMs <= freshMs ? `${entry.value.source}-cache` : `${entry.value.source}-stale-cache`, cached_at: new Date(entry.cachedAt).toISOString() };
  }
  cache.delete(cacheKey(base, quote));
  return null;
}

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

  const now = Date.now();
  const fresh = cachedRate(base, quote, now, false);
  if (fresh) return fresh;

  try {
    const response = await fetch(`${API}/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'LittleMindsUniverse/4.0' }
    });
    if (!response.ok) throw new Error(`FX provider HTTP ${response.status}`);
    const data = await response.json();
    const rate = Number(data?.rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('FX provider returned an invalid rate');
    const value = { rate, date: data?.date || new Date(now).toISOString().slice(0, 10), source: 'frankfurter-v2' };
    cache.set(cacheKey(base, quote), { value, cachedAt: now });
    return value;
  } catch (error) {
    const stale = cachedRate(base, quote, now, true);
    if (stale) return stale;
    throw new HttpError(502, 'FX reference rate is unavailable');
  }
}

export function clearFxCacheForTests() {
  if (process.env.NODE_ENV !== 'test') throw new Error('FX cache reset is test-only');
  cache.clear();
}
