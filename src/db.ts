/**
 * Memory Claw v2.4.7 - Database Module
 *
 * v2.4.7 improvements:
 * - Optimized batch query operations with single OR query
 * - Improved batch hit count performance
 *
 * v2.4.6 improvements:
 * - Optimized batch query operations
 * - Improved error handling
 *
 * v2.4.3 improvements:
 * - Fixed low capture rate by relaxing trigger requirements
 * - Added LanceDB compaction to reduce transaction bloat
 * - Optimized batch hit count updates to reduce transactions
 * - Added database statistics for monitoring
 *
 * v2.4.2 improvements:
 * - Fixed LanceDB schema inference for empty tags array
 *
 * v2.4.0 improvements:
 * - Batch hit count updates
 * - Vector exclusion from search results
 * - Tier-aware garbage collection
 * - Auto-promotion support
 *
 * @version 2.4.7
 * @author duan78
 */

import { randomUUID } from "node:crypto";
import type * as LanceDB from "@lancedb/lancedb";
import type { MemoryEntry, MemoryTier, SearchResult, MemorySource } from "./types.js";
import { TIER_IMPORTANCE, TABLE_NAME, OLD_TABLE_NAME } from "./config.js";
import { TierManager } from "./classes/tier-manager.js";
import { normalizeText, calculateTextSimilarity } from "./utils/text.js";

/**
 * Validates that a string is a properly formatted UUID.
 */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export class MemoryDB {
  private db: LanceDB.Connection | null = null;
  private table: LanceDB.Table | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly dbPath: string, private readonly vectorDim: number) {}

  private async ensure(): Promise<void> {
    if (this.table) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.init();
    return this.initPromise;
  }

  private async init(): Promise<void> {
    const lancedb = await import("@lancedb/lancedb");
    this.db = await lancedb.connect(this.dbPath);
    const tables = await this.db.tableNames();

    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
      // Migration: Add tier field to existing tables (v2.3.0+)
      await this.migrateTierField();
    } else {
      this.table = await this.db.createTable(TABLE_NAME, [
        {
          id: "__schema__",
          text: "",
          vector: Array.from({ length: this.vectorDim }).fill(0),
          importance: 0,
          category: "other",
          tier: "episodic",
          tags: [""],  // Non-empty array to force string[] type inference
          createdAt: 0,
          updatedAt: 0,
          lastAccessed: 0,
          source: "manual",
          hitCount: 0,
        },
      ]);
      await this.table.delete('id = "__schema__"');
    }
  }

  /**
   * Migration: Add tier field to existing memories (v2.3.0+)
   * Sets tier = "episodic" for memories that don't have the field
   */
  private async migrateTierField(): Promise<void> {
    if (!this.table) return;

    try {
      // Check if tier column exists by inspecting schema
      const schema = await this.table.schema();
      const hasTierField = schema.fields.some((f: any) => f.name === "tier");

      if (!hasTierField) {
        // Add tier field with default value to all existing rows
        const existingRows = await this.table!.query().limit(10000).toArray();

        if (existingRows.length > 0) {
          // LanceDB doesn't support ALTER TABLE, so we need to add the field to each row
          for (const row of existingRows) {
            try {
              await (this.table as any).update({
                where: `id = '${(row as any).id}'`,
                values: { tier: "episodic" }
              });
            } catch {
              // Ignore individual update errors
            }
          }
          console.log(`memory-claw: Migrated ${existingRows.length} memories with tier field`);
        }
      }
    } catch (error) {
      console.warn(`memory-claw: Tier migration check failed: ${error}`);
    }
  }

  async store(entry: {
    text: string;
    vector: number[];
    importance: number;
    category: string;
    source: MemorySource;
    tier?: MemoryTier;
    tags?: string[];
  }): Promise<MemoryEntry> {
    await this.ensure();
    const now = Date.now();
    const fullEntry = {
      ...entry,
      id: randomUUID(),
      tier: entry.tier || "episodic",
      tags: entry.tags || [],
      createdAt: now,
      updatedAt: now,
      lastAccessed: now,
      hitCount: 0,
    };
    await this.table!.add([fullEntry]);
    return fullEntry as MemoryEntry;
  }

  async search(
    vector: number[],
    limit = 5,
    minScore = 0.3,
    enableWeightedScoring = true,
    tierFilter?: MemoryTier[]
  ): Promise<SearchResult[]> {
    await this.ensure();
    const fetchLimit = enableWeightedScoring ? limit * 3 : limit;
    // v2.4.0: Use select to exclude vector field from results
    const results = await this.table!.vectorSearch(vector)
      .limit(fetchLimit)
      .select(["id", "text", "category", "importance", "tier", "tags", "hitCount", "createdAt", "_distance"])
      .toArray();

    const now = Date.now();

    let scoredResults = results.map((row) => {
      const distance = (row as any)._distance ?? 0;
      const similarity = 1 / (1 + distance);
      const tier = (row.tier as MemoryTier) || "episodic";

      if (tierFilter && !tierFilter.includes(tier)) {
        return null;
      }

      if (!enableWeightedScoring) {
        return {
          id: row.id as string,
          text: row.text as string,
          category: row.category as string,
          importance: row.importance as number,
          tier,
          tags: (row.tags as string[]) || [],
          score: similarity,
          hitCount: (row.hitCount as number) || 0,
        };
      }

      const importance = (row.importance as number) || 0.5;
      const createdAt = (row.createdAt as number) || now;
      const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0, 1 - ageInDays / 90);
      const tierWeight = TIER_IMPORTANCE[tier] || 0.5;
      const hitBonus = Math.min((row.hitCount as number) / 20, 0.1);
      const weightedScore =
        similarity * 0.4 + importance * 0.2 + tierWeight * 0.2 + recency * 0.1 + hitBonus;

      return {
        id: row.id as string,
        text: row.text as string,
        category: row.category as string,
        importance,
        tier,
        tags: (row.tags as string[]) || [],
        score: weightedScore,
        hitCount: (row.hitCount as number) || 0,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (enableWeightedScoring) {
      const maxHitCount = Math.max(...scoredResults.map((r) => r.hitCount), 1);
      scoredResults = scoredResults.map((r) => {
        const diversityPenalty = (r.hitCount / maxHitCount) * 0.1;
        return { ...r, score: r.score * (1 - diversityPenalty) };
      });
    }

    scoredResults.sort((a, b) => b.score - a.score);
    scoredResults = scoredResults.slice(0, limit);

    return scoredResults.filter((r) => r.score >= minScore);
  }

  async count(): Promise<number> {
    await this.ensure();
    return this.table!.countRows();
  }

  async deleteById(id: string): Promise<boolean> {
    await this.ensure();
    if (!isValidUUID(id)) return false;
    try {
      await this.table!.delete(`id = '${id}'`);
      return true;
    } catch {
      return false;
    }
  }

  async deleteByQuery(query: string): Promise<number> {
    await this.ensure();
    const results = await this.textSearch(query, 50);
    let deleted = 0;
    for (const result of results) {
      await this.deleteById(result.id);
      deleted++;
    }
    return deleted;
  }

  async textSearch(query: string, limit = 10): Promise<SearchResult[]> {
    await this.ensure();
    try {
      const results = await this.table!
        .query()
        .where(`text LIKE '%${query.replace(/'/g, "''")}%'`)
        .limit(limit)
        .toArray();
      return results
        .map((row) => ({
          id: row.id as string,
          text: row.text as string,
          category: row.category as string,
          importance: row.importance as number,
          tier: (row.tier as MemoryTier) || "episodic",
          tags: (row.tags as string[]) || [],
          score: 1.0,
          hitCount: (row.hitCount as number) || 0,
        }))
        .filter((r) => calculateTextSimilarity(query, r.text) > 0.5);
    } catch {
      return [];
    }
  }

  async findByText(text: string, limit = 5): Promise<SearchResult[]> {
    return this.textSearch(text, limit);
  }

  async incrementHitCount(id: string): Promise<void> {
    await this.ensure();
    if (!isValidUUID(id)) return;
    try {
      const results = await this.table!
        .query()
        .where(`id = '${id.replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();
      if (results.length > 0) {
        const entry = results[0] as any;
        const newHitCount = ((entry.hitCount as number) || 0) + 1;
        await (this.table as any).update({
          where: `id = '${id}'`,
          values: { hitCount: newHitCount, updatedAt: Date.now(), lastAccessed: Date.now() }
        });
      }
    } catch (error) {
      console.warn(`memory-claw: Failed to increment hit count for ${id}: ${error}`);
    }
  }

  /**
   * v2.4.0: Batch increment hit counts for multiple memories.
   *
   * v2.4.3: Optimized to reduce transaction bloat by:
   * - Fetching all entries first in a single query
   * - Performing updates in a single batch operation
   * - Only logging errors instead of throwing
   */
  async batchIncrementHitCounts(updates: Map<string, number>): Promise<void> {
    await this.ensure();
    if (updates.size === 0) return;

    const now = Date.now();
    const ids = Array.from(updates.keys()).filter((id) => isValidUUID(id));

    if (ids.length === 0) return;

    try {
      // v2.4.7: Optimize by fetching all entries in a single query with OR clause
      const orClause = ids.map((id) => `id = '${id.replace(/'/g, "''")}'`).join(' OR ');
      const results = await this.table!
        .query()
        .where(orClause)
        .limit(ids.length)
        .toArray();

      // Create a map of existing entries for quick lookup
      const entryMap = new Map<string, any>();
      for (const row of results) {
        entryMap.set((row as any).id, row);
      }

      // Update entries that exist
      const updatePromises = ids.map(async (id) => {
        const entry = entryMap.get(id);
        if (!entry) return;

        const increment = updates.get(id) || 0;
        const newHitCount = ((entry.hitCount as number) || 0) + increment;

        try {
          await (this.table as any).update({
            where: `id = '${id}'`,
            values: { hitCount: newHitCount, updatedAt: now, lastAccessed: now }
          });
        } catch (error) {
          // Non-critical: hit count updates can fail without breaking functionality
          console.warn(`memory-claw: Failed to update hit count for ${id.slice(0, 8)}...: ${error}`);
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.warn(`memory-claw: Batch hit count update failed (non-critical): ${error}`);
    }
  }

  /**
   * v2.4.0: Get a memory by ID (for auto-promotion checks)
   */
  async getById(id: string): Promise<MemoryEntry | null> {
    await this.ensure();
    if (!isValidUUID(id)) return null;
    try {
      const results = await this.table!
        .query()
        .where(`id = '${id.replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) return null;

      const row = results[0];
      return {
        id: row.id as string,
        text: row.text as string,
        vector: row.vector as number[],
        importance: row.importance as number,
        category: row.category as string,
        tier: (row.tier as MemoryTier) || "episodic",
        tags: (row.tags as string[]) || [],
        createdAt: row.createdAt as number,
        updatedAt: row.updatedAt as number,
        lastAccessed: (row.lastAccessed as number) || row.createdAt as number,
        source: row.source as MemorySource,
        hitCount: (row.hitCount as number) || 0,
      };
    } catch {
      return null;
    }
  }

  async promote(id: string, tierManager: TierManager): Promise<{ success: boolean; newTier?: MemoryTier; message: string }> {
    await this.ensure();
    if (!isValidUUID(id)) return { success: false, message: "Invalid memory ID" };

    try {
      const results = await this.table!
        .query()
        .where(`id = '${id.replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) return { success: false, message: "Memory not found" };

      const entry = results[0] as any;
      const currentTier = (entry.tier as MemoryTier) || "episodic";
      const newTier = tierManager.getNextTier(currentTier);

      if (!newTier) return { success: false, message: "Memory is already at highest tier (core)" };

      await (this.table as any).update({
        where: `id = '${id}'`,
        values: { tier: newTier, updatedAt: Date.now() }
      });

      return { success: true, newTier, message: `Promoted from ${currentTier} to ${newTier}` };
    } catch (error) {
      return { success: false, message: `Failed to promote: ${error}` };
    }
  }

  async demote(id: string, tierManager: TierManager): Promise<{ success: boolean; newTier?: MemoryTier; message: string }> {
    await this.ensure();
    if (!isValidUUID(id)) return { success: false, message: "Invalid memory ID" };

    try {
      const results = await this.table!
        .query()
        .where(`id = '${id.replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) return { success: false, message: "Memory not found" };

      const entry = results[0] as any;
      const currentTier = (entry.tier as MemoryTier) || "episodic";
      const newTier = tierManager.getPreviousTier(currentTier);

      if (!newTier) return { success: false, message: "Memory is already at lowest tier (episodic)" };

      await (this.table as any).update({
        where: `id = '${id}'`,
        values: { tier: newTier, updatedAt: Date.now() }
      });

      return { success: true, newTier, message: `Demoted from ${currentTier} to ${newTier}` };
    } catch (error) {
      return { success: false, message: `Failed to demote: ${error}` };
    }
  }

  async getByTier(tier: MemoryTier, limit = 50): Promise<MemoryEntry[]> {
    await this.ensure();
    try {
      // v2.4.0: Exclude vector field
      const results = await this.table!
        .query()
        .where(`tier = '${tier}'`)
        .select(["id", "text", "category", "importance", "tier", "tags", "hitCount", "createdAt", "updatedAt", "lastAccessed", "source"])
        .limit(limit)
        .toArray();

      return results.map((row) => ({
        id: row.id as string,
        text: row.text as string,
        vector: [],
        importance: row.importance as number,
        category: row.category as string,
        tier: (row.tier as MemoryTier) || "episodic",
        tags: (row.tags as string[]) || [],
        createdAt: row.createdAt as number,
        updatedAt: row.updatedAt as number,
        lastAccessed: (row.lastAccessed as number) || row.createdAt as number,
        source: row.source as MemorySource,
        hitCount: (row.hitCount as number) || 0,
      }));
    } catch {
      return [];
    }
  }

  async autoTierUpdate(tierManager: TierManager): Promise<{ promoted: number; demoted: number }> {
    await this.ensure();
    let promoted = 0;
    let demoted = 0;

    try {
      const allMemories = await this.getAll();

      for (const memory of allMemories) {
        const shouldPromote = tierManager.shouldPromote(memory);
        const shouldDemote = tierManager.shouldDemote(memory);

        if (shouldPromote) {
          const result = await this.promote(memory.id, tierManager);
          if (result.success) promoted++;
        } else if (shouldDemote) {
          const result = await this.demote(memory.id, tierManager);
          if (result.success) demoted++;
        }
      }
    } catch (error) {
      console.warn(`memory-claw: Auto tier update failed: ${error}`);
    }

    return { promoted, demoted };
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.ensure();
    const results = await this.table!.query().limit(10000).toArray();
    return results.map((row) => ({
      id: row.id as string,
      text: row.text as string,
      vector: row.vector as number[],
      importance: row.importance as number,
      category: row.category as string,
      tier: (row.tier as MemoryTier) || "episodic",
      tags: (row.tags as string[]) || [],
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
      lastAccessed: (row.lastAccessed as number) || row.createdAt as number,
      source: row.source as MemorySource,
      hitCount: (row.hitCount as number) || 0,
    }));
  }

  /**
   * v2.4.0: Tier-aware garbage collection
   * - Core memories: NEVER deleted (protected)
   * - Contextual memories: more lenient thresholds (2x maxAge, half minHitCount)
   * - Episodic memories: normal thresholds
   */
  async garbageCollect(maxAge: number, minImportance: number, minHitCount: number): Promise<number> {
    await this.ensure();
    const now = Date.now();
    let deleted = 0;
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const results = await this.table!
        .query()
        .limit(batchSize)
        .offset(offset)
        .toArray();

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of results) {
        const tier = (row.tier as MemoryTier) || "episodic";
        const memory = {
          id: row.id as string,
          createdAt: row.createdAt as number,
          importance: row.importance as number,
          hitCount: (row.hitCount as number) || 0,
          tier,
        };

        // Core memories are protected
        if (tier === "core") continue;

        let effectiveMaxAge = maxAge;
        let effectiveMinHitCount = minHitCount;

        if (tier === "contextual") {
          effectiveMaxAge = maxAge * 2;
          effectiveMinHitCount = Math.max(1, Math.floor(minHitCount / 2));
        }

        const age = now - memory.createdAt;
        if (
          age > effectiveMaxAge &&
          memory.importance < minImportance &&
          memory.hitCount < effectiveMinHitCount
        ) {
          await this.deleteById(memory.id);
          deleted++;
        }
      }

      if (results.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    return deleted;
  }

  async tableExists(tableName: string): Promise<boolean> {
    await this.ensure();
    const tables = await this.db!.tableNames();
    return tables.includes(tableName);
  }

  async getOldTableEntries(): Promise<MemoryEntry[]> {
    await this.ensure();
    const tables = await this.db!.tableNames();
    if (!tables.includes(OLD_TABLE_NAME)) return [];

    const oldTable = await this.db!.openTable(OLD_TABLE_NAME);
    const results = await oldTable.query().limit(10000).toArray();
    return results.map((row) => ({
      id: row.id as string,
      text: row.text as string,
      vector: row.vector as number[],
      importance: row.importance as number,
      category: row.category as string,
      tier: "episodic" as MemoryTier,
      tags: [] as string[],
      createdAt: row.createdAt as number,
      updatedAt: Date.now(),
      lastAccessed: Date.now(),
      source: "manual" as const,
      hitCount: 0,
    }));
  }

  /**
   * v2.4.5: Compact LanceDB database to reduce transaction file bloat
   *
   * LanceDB accumulates transaction files for every operation (insert, update, delete).
   * The JS SDK doesn't expose direct compaction methods, but we can use createNewVersion
   * to trigger optimization of the underlying Lance format.
   *
   * Recommended: Call after batch operations or periodically (e.g., every 100 operations).
   */
  async compact(): Promise<void> {
    await this.ensure();
    try {
      // LanceDB's Python SDK has optimize() and compact() methods, but the JS SDK
      // doesn't expose these directly. As an alternative, we can check if the table
      // has any optimization methods and call them.
      const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.table) || {});

      if (this.table && typeof (this.table as any).compact === "function") {
        await (this.table as any).compact();
        console.log("memory-claw: Database compacted successfully");
      } else if (this.table && typeof (this.table as any).optimize === "function") {
        await (this.table as any).optimize();
        console.log("memory-claw: Database optimized successfully");
      } else if (this.table && typeof (this.table as any).createNewVersion === "function") {
        // createNewVersion can help trigger compaction of underlying data files
        await (this.table as any).createNewVersion();
        console.log("memory-claw: Database version updated (may help with compaction)");
      } else {
        // No direct compaction method available - this is non-critical
        // The database will still function, just may have more transaction files
        console.log("memory-claw: Compaction not available (non-critical, DB still functional)");
      }
    } catch (error) {
      // Compaction is non-critical - log warning but don't fail
      console.warn(`memory-claw: Compaction failed (non-critical): ${error}`);
    }
  }

  /**
   * v2.4.3: Get database statistics for monitoring
   */
  async getStats(): Promise<{ count: number; estimatedSize: number }> {
    await this.ensure();
    const count = await this.count();
    return {
      count,
      estimatedSize: count * 1500, // Rough estimate in bytes (vector + metadata)
    };
  }
}
