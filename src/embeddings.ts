/**
 * Memory Claw v2.4.14 - Embeddings Client with LRU Cache
 *
 * v2.4.14 improvements:
 * - CRITICAL FIX: Use native fetch instead of OpenAI library to avoid dimension bug
 * - CRITICAL FIX: mistral-embed returns 1024 dimensions (verified via API)
 *
 * v2.4.9 improvements:
 * - CRITICAL FIX: Corrected default vector dimension for mistral-embed (256 not 1024)
 * - Improved dimension detection with proper fallback
 *
 * v2.4.7 improvements:
 * - Fixed dimensions parameter condition
 * - Improved vector dimension fallback
 *
 * v2.4.6 improvements:
 * - Improved hash function to reduce collision risk
 * - Better cache key generation with FNV-1a algorithm
 *
 * v2.4.0 improvements:
 * - LRU cache with TTL (1 hour) to avoid redundant API calls
 * - Max 1000 cache entries
 * - Cache statistics for monitoring
 *
 * @version 2.4.14
 * @author duan78
 */

import { normalizeText } from "./utils/text.js";

interface CacheEntry {
  vector: number[];
  ts: number;
}

export class Embeddings {
  private apiKey: string;
  private baseUrl: string;
  private detectedVectorDim: number | null = null;
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTTL = 3600000; // 1 hour in milliseconds
  private readonly maxCacheSize = 1000;

  constructor(
    apiKey: string,
    private model: string,
    baseUrl?: string,
    private dimensions?: number
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.mistral.ai/v1";
  }

  /**
   * FNV-1a hash function for better cache key distribution
   * Reduces collision risk compared to simple hash
   */
  private hashText(text: string): string {
    // FNV-1a 32-bit hash algorithm
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    // Combine with model name for cache key
    return `${this.model}:${(hash >>> 0).toString(16)}`;
  }

  /**
   * Clean expired entries from cache (called periodically)
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.ts > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const normalizedText = normalizeText(text);
    const hash = this.hashText(normalizedText);

    // Check cache
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.ts < this.cacheTTL) {
      return cached.vector;
    }

    // Clean expired entries periodically (when cache is getting full)
    if (this.cache.size >= this.maxCacheSize * 0.8) {
      this.cleanExpiredEntries();
    }

    try {
      // Use native fetch instead of OpenAI library to avoid dimension bugs
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: normalizedText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const vector = data.data[0].embedding;

      // Detect actual vector dimension on first embedding
      if (!this.detectedVectorDim) {
        this.detectedVectorDim = vector.length;
        if (this.dimensions && this.dimensions !== vector.length) {
          console.warn(
            `memory-claw: Vector dimension mismatch! Config: ${this.dimensions}, Actual: ${vector.length}. Using actual dimension.`
          );
        }
      }

      // Store in cache with LRU eviction
      if (this.cache.size >= this.maxCacheSize) {
        // Remove oldest entry (first in Map)
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(hash, { vector, ts: Date.now() });

      return vector;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Embedding failed: ${error.message}`);
      }
      throw error;
    }
  }

  getVectorDim(): number {
    // CRITICAL FIX: mistral-embed returns 1024 dimensions (verified via API)
    if (this.model.includes("mistral-embed")) {
      return this.detectedVectorDim || this.dimensions || 1024;
    }
    return this.detectedVectorDim || (this.dimensions && this.dimensions > 0 ? this.dimensions : 1024);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttlMs: this.cacheTTL,
    };
  }
}
