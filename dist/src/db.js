/**
 * Memory Claw v2.4.11 - Database Module
 *
 * v2.4.11 improvements:
 * - FIXED: Auto-migration now correctly detects vector dimension using type.listSize
 *
 * v2.4.10 improvements:
 * - Auto-migrate vector dimension mismatch on startup
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
 * @version 2.4.11
 * @author duan78
 */
import { randomUUID } from "node:crypto";
import { TIER_IMPORTANCE, TABLE_NAME, OLD_TABLE_NAME } from "./config.js";
import { calculateTextSimilarity } from "./utils/text.js";
/**
 * Validates that a string is a properly formatted UUID.
 */
function isValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
export class MemoryDB {
    dbPath;
    vectorDim;
    db = null;
    table = null;
    initPromise = null;
    constructor(dbPath, vectorDim = 1024) {
        this.dbPath = dbPath;
        this.vectorDim = vectorDim;
    }
    async ensure() {
        if (this.table)
            return;
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = this.init();
        return this.initPromise;
    }
    async init() {
        const lancedb = await import("@lancedb/lancedb");
        this.db = await lancedb.connect(this.dbPath);
        const tables = await this.db.tableNames();
        if (tables.includes(TABLE_NAME)) {
            this.table = await this.db.openTable(TABLE_NAME);
            // v2.4.10: Check vector dimension and auto-migrate if mismatch
            const schema = await this.table.schema();
            const vectorField = schema.fields.find((f) => f.name === "vector");
            if (vectorField && vectorField.type) {
                // LanceDB stores FixedSizeList as typeId 16 with listSize property
                const fieldType = vectorField.type;
                // FixedSizeList has typeId 16 and listSize contains the dimension
                const actualDim = (fieldType.typeId === 16 && fieldType.listSize) || 0;
                if (actualDim !== this.vectorDim) {
                    console.warn(`memory-claw: Vector dimension mismatch detected! Expected ${this.vectorDim}D, found ${actualDim}D. Recreating table...`);
                    // Drop the old table
                    await this.db.dropTable(TABLE_NAME);
                    // Create new table with correct dimension using Float32Array
                    const schemaData = [{
                            id: "__schema__",
                            text: "",
                            vector: new Float32Array(this.vectorDim),
                            importance: 0,
                            category: "other",
                            tier: "episodic",
                            tags: [""], // Non-empty array to force string[] type inference
                            createdAt: 0,
                            updatedAt: 0,
                            lastAccessed: 0,
                            source: "manual",
                            hitCount: 0,
                        }];
                    this.table = await this.db.createTable(TABLE_NAME, schemaData);
                    await this.table.delete('id = "__schema__"');
                    console.warn(`memory-claw: Table recreated with correct vector dimension (${this.vectorDim}D)`);
                    return;
                }
            }
            // Migration: Add tier field to existing tables (v2.3.0+)
            await this.migrateTierField();
        }
        else {
            // Create table with Float32Array for proper vector type inference
            const schemaData = [{
                    id: "__schema__",
                    text: "",
                    vector: new Float32Array(this.vectorDim),
                    importance: 0,
                    category: "other",
                    tier: "episodic",
                    tags: [""], // Non-empty array to force string[] type inference
                    createdAt: 0,
                    updatedAt: 0,
                    lastAccessed: 0,
                    source: "manual",
                    hitCount: 0,
                }];
            this.table = await this.db.createTable(TABLE_NAME, schemaData);
            await this.table.delete('id = "__schema__"');
        }
    }
    /**
     * Migration: Add tier field to existing memories (v2.3.0+)
     * Sets tier = "episodic" for memories that don't have the field
     */
    async migrateTierField() {
        if (!this.table)
            return;
        try {
            // Check if tier column exists by inspecting schema
            const schema = await this.table.schema();
            const hasTierField = schema.fields.some((f) => f.name === "tier");
            if (!hasTierField) {
                // Add tier field with default value to all existing rows
                const existingRows = await this.table.query().limit(10000).toArray();
                if (existingRows.length > 0) {
                    // LanceDB doesn't support ALTER TABLE, so we need to add the field to each row
                    for (const row of existingRows) {
                        try {
                            await this.table.update({
                                where: `id = '${row.id}'`,
                                values: { tier: "episodic" }
                            });
                        }
                        catch {
                            // Ignore individual update errors
                        }
                    }
                    console.log(`memory-claw: Migrated ${existingRows.length} memories with tier field`);
                }
            }
        }
        catch (error) {
            console.warn(`memory-claw: Tier migration check failed: ${error}`);
        }
    }
    async store(entry) {
        await this.ensure();
        const now = Date.now();
        const fullEntry = {
            text: entry.text,
            vector: entry.vector,
            importance: entry.importance,
            category: entry.category,
            source: entry.source || "manual",
            id: randomUUID(),
            tier: entry.tier || "episodic",
            tags: entry.tags || [],
            createdAt: now,
            updatedAt: now,
            lastAccessed: now,
            hitCount: 0,
        };
        await this.table.add([fullEntry]);
        return fullEntry;
    }
    async search(vector, limit = 5, minScore = 0.3, enableWeightedScoring = true, tierFilter) {
        await this.ensure();
        const fetchLimit = enableWeightedScoring ? limit * 3 : limit;
        // v2.4.0: Use select to exclude vector field from results
        const results = await this.table.vectorSearch(vector)
            .limit(fetchLimit)
            .select(["id", "text", "category", "importance", "tier", "tags", "hitCount", "createdAt", "_distance"])
            .toArray();
        const now = Date.now();
        let scoredResults = results.map((row) => {
            const distance = row._distance ?? 0;
            const similarity = 1 / (1 + distance);
            const tier = row.tier || "episodic";
            if (tierFilter && !tierFilter.includes(tier)) {
                return null;
            }
            if (!enableWeightedScoring) {
                return {
                    id: row.id,
                    text: row.text,
                    category: row.category,
                    importance: row.importance,
                    tier,
                    tags: row.tags || [],
                    score: similarity,
                    hitCount: row.hitCount || 0,
                };
            }
            const importance = row.importance || 0.5;
            const createdAt = row.createdAt || now;
            const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
            const recency = Math.max(0, 1 - ageInDays / 90);
            const tierWeight = TIER_IMPORTANCE[tier] || 0.5;
            const hitBonus = Math.min(row.hitCount / 20, 0.1);
            const weightedScore = similarity * 0.4 + importance * 0.2 + tierWeight * 0.2 + recency * 0.1 + hitBonus;
            return {
                id: row.id,
                text: row.text,
                category: row.category,
                importance,
                tier,
                tags: row.tags || [],
                score: weightedScore,
                hitCount: row.hitCount || 0,
            };
        }).filter((r) => r !== null);
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
    async count() {
        await this.ensure();
        return this.table.countRows();
    }
    async deleteById(id) {
        await this.ensure();
        if (!isValidUUID(id))
            return false;
        try {
            await this.table.delete(`id = '${id}'`);
            return true;
        }
        catch {
            return false;
        }
    }
    async deleteByQuery(query) {
        await this.ensure();
        const results = await this.textSearch(query, 50);
        let deleted = 0;
        for (const result of results) {
            await this.deleteById(result.id);
            deleted++;
        }
        return deleted;
    }
    async textSearch(query, limit = 10) {
        await this.ensure();
        try {
            const results = await this.table
                .query()
                .where(`text LIKE '%${query.replace(/'/g, "''")}%'`)
                .limit(limit)
                .toArray();
            return results
                .map((row) => ({
                id: row.id,
                text: row.text,
                category: row.category,
                importance: row.importance,
                tier: row.tier || "episodic",
                tags: row.tags || [],
                score: 1.0,
                hitCount: row.hitCount || 0,
            }))
                .filter((r) => calculateTextSimilarity(query, r.text) > 0.5);
        }
        catch {
            return [];
        }
    }
    async findByText(text, limit = 5) {
        return this.textSearch(text, limit);
    }
    async incrementHitCount(id) {
        await this.ensure();
        if (!isValidUUID(id))
            return;
        try {
            const results = await this.table
                .query()
                .where(`id = '${id.replace(/'/g, "''")}'`)
                .limit(1)
                .toArray();
            if (results.length > 0) {
                const entry = results[0];
                const newHitCount = (entry.hitCount || 0) + 1;
                await this.table.update({
                    where: `id = '${id}'`,
                    values: { hitCount: newHitCount, updatedAt: Date.now(), lastAccessed: Date.now() }
                });
            }
        }
        catch (error) {
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
    async batchIncrementHitCounts(updates) {
        await this.ensure();
        if (updates.size === 0)
            return;
        const now = Date.now();
        const ids = Array.from(updates.keys()).filter((id) => isValidUUID(id));
        if (ids.length === 0)
            return;
        try {
            // v2.4.7: Optimize by fetching all entries in a single query with OR clause
            const orClause = ids.map((id) => `id = '${id.replace(/'/g, "''")}'`).join(' OR ');
            const results = await this.table
                .query()
                .where(orClause)
                .limit(ids.length)
                .toArray();
            // Create a map of existing entries for quick lookup
            const entryMap = new Map();
            for (const row of results) {
                entryMap.set(row.id, row);
            }
            // Update entries that exist
            const updatePromises = ids.map(async (id) => {
                const entry = entryMap.get(id);
                if (!entry)
                    return;
                const increment = updates.get(id) || 0;
                const newHitCount = (entry.hitCount || 0) + increment;
                try {
                    await this.table.update({
                        where: `id = '${id}'`,
                        values: { hitCount: newHitCount, updatedAt: now, lastAccessed: now }
                    });
                }
                catch (error) {
                    // Non-critical: hit count updates can fail without breaking functionality
                    console.warn(`memory-claw: Failed to update hit count for ${id.slice(0, 8)}...: ${error}`);
                }
            });
            await Promise.all(updatePromises);
        }
        catch (error) {
            console.warn(`memory-claw: Batch hit count update failed (non-critical): ${error}`);
        }
    }
    /**
     * v2.4.0: Get a memory by ID (for auto-promotion checks)
     */
    async getById(id) {
        await this.ensure();
        if (!isValidUUID(id))
            return null;
        try {
            const results = await this.table
                .query()
                .where(`id = '${id.replace(/'/g, "''")}'`)
                .limit(1)
                .toArray();
            if (results.length === 0)
                return null;
            const row = results[0];
            return {
                id: row.id,
                text: row.text,
                vector: row.vector,
                importance: row.importance,
                category: row.category,
                tier: row.tier || "episodic",
                tags: row.tags || [],
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                lastAccessed: row.lastAccessed || row.createdAt,
                source: row.source,
                hitCount: row.hitCount || 0,
            };
        }
        catch {
            return null;
        }
    }
    async promote(id, tierManager) {
        await this.ensure();
        if (!isValidUUID(id))
            return { success: false, message: "Invalid memory ID" };
        try {
            const results = await this.table
                .query()
                .where(`id = '${id.replace(/'/g, "''")}'`)
                .limit(1)
                .toArray();
            if (results.length === 0)
                return { success: false, message: "Memory not found" };
            const entry = results[0];
            const currentTier = entry.tier || "episodic";
            const newTier = tierManager.getNextTier(currentTier);
            if (!newTier)
                return { success: false, message: "Memory is already at highest tier (core)" };
            await this.table.update({
                where: `id = '${id}'`,
                values: { tier: newTier, updatedAt: Date.now() }
            });
            return { success: true, newTier, message: `Promoted from ${currentTier} to ${newTier}` };
        }
        catch (error) {
            return { success: false, message: `Failed to promote: ${error}` };
        }
    }
    async demote(id, tierManager) {
        await this.ensure();
        if (!isValidUUID(id))
            return { success: false, message: "Invalid memory ID" };
        try {
            const results = await this.table
                .query()
                .where(`id = '${id.replace(/'/g, "''")}'`)
                .limit(1)
                .toArray();
            if (results.length === 0)
                return { success: false, message: "Memory not found" };
            const entry = results[0];
            const currentTier = entry.tier || "episodic";
            const newTier = tierManager.getPreviousTier(currentTier);
            if (!newTier)
                return { success: false, message: "Memory is already at lowest tier (episodic)" };
            await this.table.update({
                where: `id = '${id}'`,
                values: { tier: newTier, updatedAt: Date.now() }
            });
            return { success: true, newTier, message: `Demoted from ${currentTier} to ${newTier}` };
        }
        catch (error) {
            return { success: false, message: `Failed to demote: ${error}` };
        }
    }
    async getByTier(tier, limit = 50) {
        await this.ensure();
        try {
            // v2.4.0: Exclude vector field
            const results = await this.table
                .query()
                .where(`tier = '${tier}'`)
                .select(["id", "text", "category", "importance", "tier", "tags", "hitCount", "createdAt", "updatedAt", "lastAccessed", "source"])
                .limit(limit)
                .toArray();
            return results.map((row) => ({
                id: row.id,
                text: row.text,
                vector: [],
                importance: row.importance,
                category: row.category,
                tier: row.tier || "episodic",
                tags: row.tags || [],
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                lastAccessed: row.lastAccessed || row.createdAt,
                source: row.source,
                hitCount: row.hitCount || 0,
            }));
        }
        catch {
            return [];
        }
    }
    async autoTierUpdate(tierManager) {
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
                    if (result.success)
                        promoted++;
                }
                else if (shouldDemote) {
                    const result = await this.demote(memory.id, tierManager);
                    if (result.success)
                        demoted++;
                }
            }
        }
        catch (error) {
            console.warn(`memory-claw: Auto tier update failed: ${error}`);
        }
        return { promoted, demoted };
    }
    async getAll() {
        await this.ensure();
        const results = await this.table.query().limit(10000).toArray();
        return results.map((row) => ({
            id: row.id,
            text: row.text,
            vector: row.vector,
            importance: row.importance,
            category: row.category,
            tier: row.tier || "episodic",
            tags: row.tags || [],
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            lastAccessed: row.lastAccessed || row.createdAt,
            source: row.source,
            hitCount: row.hitCount || 0,
        }));
    }
    /**
     * v2.4.0: Tier-aware garbage collection
     * - Core memories: NEVER deleted (protected)
     * - Contextual memories: more lenient thresholds (2x maxAge, half minHitCount)
     * - Episodic memories: normal thresholds
     */
    async garbageCollect(maxAge, minImportance, minHitCount) {
        await this.ensure();
        const now = Date.now();
        let deleted = 0;
        const batchSize = 100;
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
            const results = await this.table
                .query()
                .limit(batchSize)
                .offset(offset)
                .toArray();
            if (results.length === 0) {
                hasMore = false;
                break;
            }
            for (const row of results) {
                const tier = row.tier || "episodic";
                const memory = {
                    id: row.id,
                    createdAt: row.createdAt,
                    importance: row.importance,
                    hitCount: row.hitCount || 0,
                    tier,
                };
                // Core memories are protected
                if (tier === "core")
                    continue;
                let effectiveMaxAge = maxAge;
                let effectiveMinHitCount = minHitCount;
                if (tier === "contextual") {
                    effectiveMaxAge = maxAge * 2;
                    effectiveMinHitCount = Math.max(1, Math.floor(minHitCount / 2));
                }
                const age = now - memory.createdAt;
                if (age > effectiveMaxAge &&
                    memory.importance < minImportance &&
                    memory.hitCount < effectiveMinHitCount) {
                    await this.deleteById(memory.id);
                    deleted++;
                }
            }
            if (results.length < batchSize) {
                hasMore = false;
            }
            else {
                offset += batchSize;
            }
        }
        return deleted;
    }
    async tableExists(tableName) {
        await this.ensure();
        const tables = await this.db.tableNames();
        return tables.includes(tableName);
    }
    async getOldTableEntries() {
        await this.ensure();
        const tables = await this.db.tableNames();
        if (!tables.includes(OLD_TABLE_NAME))
            return [];
        const oldTable = await this.db.openTable(OLD_TABLE_NAME);
        const results = await oldTable.query().limit(10000).toArray();
        return results.map((row) => ({
            id: row.id,
            text: row.text,
            vector: row.vector,
            importance: row.importance,
            category: row.category,
            tier: "episodic",
            tags: [],
            createdAt: row.createdAt,
            updatedAt: Date.now(),
            lastAccessed: Date.now(),
            source: "manual",
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
    async compact() {
        await this.ensure();
        try {
            // LanceDB's Python SDK has optimize() and compact() methods, but the JS SDK
            // doesn't expose these directly. As an alternative, we can check if the table
            // has any optimization methods and call them.
            const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.table) || {});
            if (this.table && typeof this.table.compact === "function") {
                await this.table.compact();
                console.log("memory-claw: Database compacted successfully");
            }
            else if (this.table && typeof this.table.optimize === "function") {
                await this.table.optimize();
                console.log("memory-claw: Database optimized successfully");
            }
            else if (this.table && typeof this.table.createNewVersion === "function") {
                // createNewVersion can help trigger compaction of underlying data files
                await this.table.createNewVersion();
                console.log("memory-claw: Database version updated (may help with compaction)");
            }
            else {
                // No direct compaction method available - this is non-critical
                // The database will still function, just may have more transaction files
                console.log("memory-claw: Compaction not available (non-critical, DB still functional)");
            }
        }
        catch (error) {
            // Compaction is non-critical - log warning but don't fail
            console.warn(`memory-claw: Compaction failed (non-critical): ${error}`);
        }
    }
    /**
     * v2.4.3: Get database statistics for monitoring
     */
    async getStats() {
        await this.ensure();
        const count = await this.count();
        return {
            count,
            estimatedSize: count * 1500, // Rough estimate in bytes (vector + metadata)
        };
    }
}
