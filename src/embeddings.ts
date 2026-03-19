/**
 * Memory Claw v2.4.0 - Embeddings Client with LRU Cache
 *
 * v2.4.0 improvements:
 * - LRU cache with TTL (1 hour) to avoid redundant API calls
 * - Max 1000 cache entries
 * - Cache statistics for monitoring
 *
 * @version 2.4.0
 * @author duan78
 */

import OpenAI from "openai";
import { normalizeText } from "./utils/text.js";

interface CacheEntry {
  vector: number[];
  ts: number;
}

export class Embeddings {
  private client: OpenAI;
  private detectedVectorDim: number | null = null;
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTTL = 3600000; // 1 hour in milliseconds
  private readonly maxCacheSize = 1000;

  constructor(
    apiKey: string,
    private model: string,
    private baseUrl?: string,
    private dimensions?: number
  ) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  /**
   * Simple hash function for text to use as cache key
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${this.model}:${hash.toString(16)}`;
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

    const params: Record<string, unknown> = {
      model: this.model,
      input: normalizedText,
    };

    if (this.dimensions && !this.baseUrl) {
      params.dimensions = this.dimensions;
    }

    try {
      const response = await this.client.embeddings.create(params as any);
      const vector = response.data[0].embedding;

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
    return this.detectedVectorDim || this.dimensions || 1024;
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
