/**
 * Memory Claw v2.4.29 - Configuration Constants
 *
 * v2.4.29 improvements:
 * - No changes to config (version bump for code cleanup)
 *
 * v2.4.28 improvements:
 * - FIXED: Added gcMinImportance (0.2) and gcMinHitCount (1) to DEFAULT_CONFIG
 * - FIXED: GC thresholds now match capture thresholds to prevent memory loss
 *
 * @version 2.4.29
 * @author duan78
 */

import { join } from "node:path";
import { homedir } from "node:os";
import type { FrenchMemoryConfig, MemoryTier } from "./types.js";

// Database paths
export const DEFAULT_DB_PATH = join(homedir(), ".openclaw", "memory", "memory-claw");
export const STATS_PATH = join(homedir(), ".openclaw", "memory", "memory-claw-stats.json");

// Table names
export const TABLE_NAME = "memories_claw";
export const OLD_TABLE_NAME = "memories";
export const LEGACY_TABLE_NAME = "memories_fr";

// v2.3.0: Tier importance weights
export const TIER_IMPORTANCE: Record<MemoryTier, number> = {
  core: 0.95,       // Always injected, highest importance
  contextual: 0.75, // Injected if relevant to current context
  episodic: 0.5,    // Retrieved via semantic search only
};

// v2.3.0: Tier promotion thresholds
export const TIER_PROMOTION_THRESHOLDS = {
  core: { minImportance: 0.8, minHitCount: 5 },
  contextual: { minImportance: 0.6, minHitCount: 2 },
};

// Default configuration
export const DEFAULT_CONFIG: Omit<FrenchMemoryConfig, "embedding"> = {
  enabled: true,
  maxCapturePerTurn: 5,
  captureMinChars: 50,
  captureMaxChars: 3000,
  minCaptureImportance: 0.25, // v2.4.17: Lowered from 0.45 to 0.25 for better factual content capture
  recallLimit: 5,
  recallMinScore: 0.3,
  enableStats: true,
  gcInterval: 86400000, // 24 hours
  gcMaxAge: 2592000000, // 30 days
  gcMinImportance: 0.2, // v2.4.28: FIXED - Was 0.5, causing captured memories (0.25+) to be deleted
  gcMinHitCount: 1, // v2.4.28: FIXED - Was 3, causing new memories to be deleted before getting hits
  rateLimitMaxPerHour: 10,
  enableWeightedRecall: true,
  enableDynamicImportance: true,
  locales: ["fr", "en", "es", "de", "zh", "it", "pt", "ru", "ja", "ko", "ar"],
};

// Category importance weights
export const CATEGORY_IMPORTANCE: Record<string, number> = {
  entity: 0.9,
  decision: 0.85,
  preference: 0.7,
  seo: 0.6,
  technical: 0.65,
  workflow: 0.6,
  debug: 0.4,
  fact: 0.5,
};

// Source importance weights
export const SOURCE_IMPORTANCE: Record<string, number> = {
  manual: 0.9,
  agent_end: 0.7,
  session_end: 0.6,
  "auto-capture": 0.6,
};
