// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();

// In-memory cache with expiration
const memoryCache = new Map<string, { data: any; expires: number }>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const optimizedFetcher = async (url: string) => {
  const now = Date.now();

  // Check memory cache first
  const cached = memoryCache.get(url);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  // Check if request is already in flight
  if (requestCache.has(url)) {
    return requestCache.get(url)!;
  }

  // Make the request and cache it
  const request = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      return res.json();
    })
    .then((data) => {
      // Store in memory cache
      memoryCache.set(url, { data, expires: now + CACHE_DURATION });
      // Remove from in-flight cache
      requestCache.delete(url);
      return data;
    })
    .catch((error) => {
      // Remove from in-flight cache on error
      requestCache.delete(url);
      throw error;
    });

  requestCache.set(url, request);
  return request;
};

// Clear cache on demand
export const clearFetcherCache = (url?: string) => {
  if (url) {
    memoryCache.delete(url);
    requestCache.delete(url);
  } else {
    memoryCache.clear();
    requestCache.clear();
  }
};

// Prefetch data
export const prefetchData = async (url: string) => {
  return optimizedFetcher(url);
};

// Request batching for multiple URLs
export const batchFetch = async (urls: string[]) => {
  const promises = urls.map((url) => optimizedFetcher(url).catch(() => null));
  return Promise.all(promises);
};
