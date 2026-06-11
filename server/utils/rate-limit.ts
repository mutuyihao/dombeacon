export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitState {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, RateLimitBucket>();

const pruneExpiredBuckets = (now: number) => {
  if (buckets.size < 10000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const consumeRateLimit = (params: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitState => {
  const now = params.now ?? Date.now();
  const limit = Math.max(1, Math.floor(params.limit));
  const windowMs = Math.max(1000, Math.floor(params.windowMs));

  pruneExpiredBuckets(now);

  const existing = buckets.get(params.key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(params.key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
};

export const resetRateLimitBucketsForTests = () => buckets.clear();
