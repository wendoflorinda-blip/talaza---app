// Cache curto em memória para leituras públicas repetidas.
// Não usar para dados privados, pagamentos, mensagens, favoritos ou permissões.
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 100;
const entries = new Map();

export async function cachedQuery(key, loader, ttlMs = CACHE_TTL_MS) {
  const now = Date.now();
  const existing = entries.get(key);
  if (existing?.promise) return existing.promise;
  if (existing && existing.expiresAt > now) return existing.value;
  if (existing) entries.delete(key);

  const promise = Promise.resolve()
    .then(loader)
    .then((result) => {
      if (!result?.error) {
        entries.set(key, { value: result, expiresAt: Date.now() + ttlMs });
        while (entries.size > CACHE_MAX_ENTRIES) {
          entries.delete(entries.keys().next().value);
        }
      }
      return result;
    })
    .finally(() => {
      const current = entries.get(key);
      if (current?.promise === promise) entries.delete(key);
    });

  entries.set(key, { promise, expiresAt: 0 });
  return promise;
}

export function invalidateQueryCache(prefix = '') {
  for (const key of entries.keys()) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key);
  }
}

export function clearQueryCache() {
  entries.clear();
}
