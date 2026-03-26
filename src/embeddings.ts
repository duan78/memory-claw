/**
 * Memory Claw v2.4.55 - Embeddings Client with LRU Cache and Circuit Breaker
 *
 * v2.4.55 improvements:
 * - Added circuit breaker for API calls to prevent error loops
 * - Tracks consecutive embedding failures and stops API calls after threshold
 * - Returns cached vectors when circuit is open
 * - Reduces CPU spikes from repeated failed API calls
 *
 * v2.4.27 improvements:
 * - Enhanced embed() to use comprehensive cleanSenderMetadata for consistent metadata cleaning
 * - Improved capture quality by ensuring embeddings always use thoroughly cleaned text
 * - Better integration with shared text utilities (v2.4.27)
 * - Multi-phase metadata cleaning for better accuracy
 *
 * v2.4.24 improvements:
 * - Enhanced embed() to use cleanSenderMetadata for consistent metadata cleaning
 * - Improved capture quality by ensuring embeddings always use cleaned text
 * - Better integration with shared text utilities
 *
 * v2.4.21 improvements:
 * - Fixed mclaw_store to embed cleaned text instead of original (critical bug)
 * - Enhanced metadata cleaning patterns with more system artifacts
 * - Improved vector detection for LanceDB FixedSizeList format
 *
 * @version 2.4.55
 * @author duan78
 */

import { normalizeText, cleanSenderMetadata } from "./utils/text.js";
import { CircuitBreaker } from "./classes/circuit-breaker.js";

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

  // v2.4.55: Circuit breaker for API calls
  private apiCircuitBreaker: CircuitBreaker;

  constructor(
    apiKey: string,
    private model: string,
    baseUrl?: string,
    private dimensions?: number
  ) {
    this.apiKey = apiKey;
    // FIX: Z.AI keys should use Mistral official endpoint, not api.z.ai
    // Z.AI's /embeddings endpoint returns 404, must use Mistral's API directly
    if (baseUrl && baseUrl.includes("api.z.ai")) {
      console.warn("memory-claw: Z.AI endpoint detected, switching to Mistral official API (api.z.ai/v1/embeddings returns 404)");
      this.baseUrl = "https://api.mistral.ai/v1";
    } else {
      this.baseUrl = baseUrl || "https://api.mistral.ai/v1";
    }

    // v2.4.55: Initialize circuit breaker for API calls
    this.apiCircuitBreaker = new CircuitBreaker({
      consecutiveErrorThreshold: 5, // Open after 5 consecutive API errors
      backoffDurationMs: 60000, // Wait 1 minute before retrying
      maxErrorsPerHour: 50, // Max 50 API errors per hour
    });
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
    // v2.4.24: Clean metadata first, then normalize for consistent embedding quality
    const cleanedText = cleanSenderMetadata(text);
    const normalizedText = normalizeText(cleanedText);
    const hash = this.hashText(normalizedText);

    // Check cache
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.ts < this.cacheTTL) {
      return cached.vector;
    }

    // v2.4.55: Check circuit breaker before making API call
    const circuitState = this.apiCircuitBreaker.canProceed();
    if (!circuitState.allowed) {
      console.warn(`memory-claw: Embedding API circuit breaker active: ${circuitState.reason}`);
      // If circuit is open but we have cached results, return them (even if expired)
      if (cached) {
        console.warn("memory-claw: Using expired cache due to circuit breaker");
        return cached.vector;
      }
      // Otherwise throw an error
      throw new Error(`Embedding API unavailable: ${circuitState.reason}`);
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
          encoding_format: "float",
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

      // v2.4.55: Record success to circuit breaker
      this.apiCircuitBreaker.recordSuccess();

      return vector;
    } catch (error) {
      // v2.4.55: Record error to circuit breaker
      const errorResult = this.apiCircuitBreaker.recordError();
      if (errorResult.circuitOpened) {
        console.warn(`memory-claw: Embedding API circuit breaker opened - pausing API calls for 60 seconds`);
      }

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

  /**
   * v2.4.55: Get circuit breaker diagnostics for monitoring
   */
  getCircuitBreakerDiagnostics(): string {
    return this.apiCircuitBreaker.getDiagnostics();
  }
}
