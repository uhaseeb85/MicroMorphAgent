export class RateLimiter {
  private readonly maxConcurrent: number;
  private readonly minDelayMs: number;

  constructor(maxConcurrent = 50, minDelayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs;
  }

  async batchFetch<T, R>(items: T[], fetchFn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunk(items, this.maxConcurrent);

    for (const chunk of chunks) {
      try {
        const batchResults = await Promise.all(chunk.map(fetchFn));
        results.push(...batchResults);
        
        // Add a small delay between batches to be nice to the API
        if (chunks.length > 1) {
          await this.sleep(this.minDelayMs);
        }
      } catch (e: any) {
        if (e.status === 403 && e.headers && e.headers['x-ratelimit-remaining'] === '0') {
          const resetAt = parseInt(e.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetAt - Date.now() + 1000;
          console.warn(`Rate limit hit. Waiting ${waitTime}ms...`);
          await this.sleep(waitTime);
          
          // Retry chunk
          const retryBatch = await Promise.all(chunk.map(fetchFn));
          results.push(...retryBatch);
        } else {
          throw e;
        }
      }
    }
    return results;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
