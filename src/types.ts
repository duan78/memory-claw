/**
 * Memory Claw v2.4.0 - Shared Types
 *
 * @version 2.4.0
 * @author duan78
 */

// Memory tier types (v2.3.0 - Hierarchical Memory)
export type MemoryTier = "core" | "contextual" | "episodic";

export type MemorySource = "auto-capture" | "agent_end" | "session_end" | "manual";

export interface MemoryEntry {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: string;
  tier: MemoryTier;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessed?: number;
  source: MemorySource;
  hitCount: number;
}

export interface SearchResult {
  id: string;
  text: string;
  category: string;
  importance: number;
  tier: MemoryTier;
  tags?: string[];
  score: number;
  hitCount: number;
}

export interface MemoryExport {
  version: string;
  exportedAt: number;
  count: number;
  memories: Array<{
    id: string;
    text: string;
    importance: number;
    category: string;
    tier: MemoryTier;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
    lastAccessed?: number;
    source: string;
    hitCount: number;
  }>;
}

export interface FrenchMemoryConfig {
  embedding: {
    apiKey: string;
    model: string;
    baseUrl?: string;
    dimensions?: number;
  };
  dbPath?: string;
  enabled?: boolean;
  maxCapturePerTurn?: number;
  captureMinChars?: number;
  captureMaxChars?: number;
  minCaptureImportance?: number;
  recallLimit?: number;
  recallMinScore?: number;
  enableStats?: boolean;
  gcInterval?: number;
  gcMaxAge?: number;
  rateLimitMaxPerHour?: number;
  enableWeightedRecall?: boolean;
  enableDynamicImportance?: boolean;
  locales?: string[];
}
