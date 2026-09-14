export interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

export function getLocalCache<T>(key: string): Record<string, CachedEntry<T>> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalCache<T>(key: string, id: string, data: T) {
  const cache = getLocalCache<T>(key);
  cache[id] = { data, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(cache));
}

export function getFreshLocalCacheValue<T>(key: string, id: string, ttlMs: number): T | null {
  const cache = getLocalCache<T>(key);
  const entry = cache[id];
  if (!entry) return null;
  return Date.now() - entry.timestamp < ttlMs ? entry.data : null;
}

export function isFallbackPayload(value: unknown): value is { fallback: true; error?: string; message?: string } {
  return !!value && typeof value === "object" && (value as { fallback?: boolean }).fallback === true;
}

export function hasGeeAnalyticsPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return !!(payload.land_use || payload.vegetation || payload.suitability || payload.growth_stage);
}

export function hasSoilPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return !!(payload.classification && payload.metrics && payload.texture && payload.water_retention);
}

export function hasNdviPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.mean_ndvi === "number" || Array.isArray(payload.timeseries);
}
