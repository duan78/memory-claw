/**
 * Memory Claw v2.4.0 - Tier Manager
 *
 * Manages memory tier assignments, promotions, and demotions.
 * Tiers represent the importance and injection strategy for memories:
 * - core: Always injected (preferences, identity, critical decisions)
 * - contextual: Injected if relevant to current query
 * - episodic: Retrieved only via semantic search
 *
 * @version 2.4.0
 * @author duan78
 */
import { TIER_IMPORTANCE, TIER_PROMOTION_THRESHOLDS } from "../config.js";
export class TierManager {
    /**
     * Determine appropriate tier for a new memory based on its properties
     */
    determineTier(importance, category, source) {
        // High importance or critical categories go to core
        if (importance >= 0.85 || category === "entity" || category === "decision") {
            return "core";
        }
        // Manual entries with good importance go to contextual
        if (source === "manual" && importance >= 0.6) {
            return "contextual";
        }
        // Preferences and technical config go to contextual
        if (category === "preference" || category === "technical") {
            return "contextual";
        }
        // Everything else starts as episodic
        return "episodic";
    }
    /**
     * Check if a memory should be promoted to a higher tier
     */
    shouldPromote(memory) {
        const { tier, importance, hitCount } = memory;
        if (tier === "episodic") {
            // Promote to contextual if frequently accessed and moderately important
            return (importance >= TIER_PROMOTION_THRESHOLDS.contextual.minImportance &&
                hitCount >= TIER_PROMOTION_THRESHOLDS.contextual.minHitCount);
        }
        if (tier === "contextual") {
            // Promote to core if very important and frequently accessed
            return (importance >= TIER_PROMOTION_THRESHOLDS.core.minImportance &&
                hitCount >= TIER_PROMOTION_THRESHOLDS.core.minHitCount);
        }
        return false; // Core memories don't get promoted further
    }
    /**
     * Check if a memory should be demoted to a lower tier
     */
    shouldDemote(memory) {
        const { tier, importance, hitCount, createdAt } = memory;
        const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
        if (tier === "core") {
            // Demote from core if importance dropped and not accessed in 30 days
            return importance < 0.7 && hitCount < 3 && ageInDays > 30;
        }
        if (tier === "contextual") {
            // Demote from contextual if not useful
            return importance < 0.5 && hitCount < 2 && ageInDays > 14;
        }
        return false; // Episodic can't be demoted further
    }
    /**
     * Get the next tier up for promotion
     */
    getNextTier(currentTier) {
        if (currentTier === "episodic")
            return "contextual";
        if (currentTier === "contextual")
            return "core";
        return null;
    }
    /**
     * Get the next tier down for demotion
     */
    getPreviousTier(currentTier) {
        if (currentTier === "core")
            return "contextual";
        if (currentTier === "contextual")
            return "episodic";
        return null;
    }
    /**
     * Calculate injection priority for a memory (higher = more important to inject)
     */
    getInjectionPriority(memory) {
        const tierWeight = TIER_IMPORTANCE[memory.tier];
        return tierWeight * 0.6 + memory.importance * 0.3 + Math.min(memory.hitCount / 10, 0.1);
    }
}
