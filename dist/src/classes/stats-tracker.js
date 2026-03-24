/**
 * Memory Claw v2.4.7 - Statistics Tracker with Improved Persistence
 *
 * v2.4.7 improvements:
 * - Version bump for bug fix release
 *
 * v2.4.6 improvements:
 * - Cleaner logging for production
 *
 * v2.4.4 improvements:
 * - Immediate flush for critical operations (capture)
 * - Better error logging with stack traces
 * - More frequent saves to prevent data loss
 * - Logging when stats are saved/loaded
 *
 * @version 2.4.7
 * @author duan78
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { STATS_PATH } from "../config.js";
export class StatsTracker {
    captures = 0;
    recalls = 0;
    errors = 0;
    lastReset = Date.now();
    dirty = false;
    flushInterval = null;
    FLUSH_INTERVAL_MS = 30000; // 30 seconds
    MAX_RECENT_ERRORS = 50; // v2.4.3: Keep last 50 errors with details
    recentErrors = [];
    constructor() {
        this.load();
        this.startFlushInterval();
        console.log("memory-claw: StatsTracker initialized");
    }
    load() {
        try {
            if (existsSync(STATS_PATH)) {
                const data = JSON.parse(readFileSync(STATS_PATH, "utf-8"));
                this.captures = data.captures || 0;
                this.recalls = data.recalls || 0;
                this.errors = data.errors || 0;
                this.lastReset = data.lastReset || Date.now();
                this.recentErrors = (data.recentErrors || []).slice(0, this.MAX_RECENT_ERRORS);
                console.log(`memory-claw: Stats loaded - captures: ${this.captures}, recalls: ${this.recalls}, errors: ${this.errors}`);
            }
            else {
                console.log("memory-claw: No existing stats file found, starting fresh");
            }
        }
        catch (error) {
            console.warn(`memory-claw: Failed to load stats: ${error}`);
            console.error("Stats load error details:", error);
        }
    }
    save() {
        try {
            const dir = join(homedir(), ".openclaw", "memory");
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            const data = {
                captures: this.captures,
                recalls: this.recalls,
                errors: this.errors,
                lastReset: this.lastReset,
                recentErrors: this.recentErrors,
            };
            writeFileSync(STATS_PATH, JSON.stringify(data, null, 2));
            // Only log stats saves on explicit saves, not periodic flushes
            // console.log(`memory-claw: Stats saved - captures: ${this.captures}, recalls: ${this.recalls}, errors: ${this.errors}`);
        }
        catch (error) {
            console.error(`memory-claw: Failed to save stats: ${error}`);
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
        }
    }
    startFlushInterval() {
        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.FLUSH_INTERVAL_MS);
    }
    /**
     * Flush dirty stats to disk (called periodically and on shutdown)
     */
    flush() {
        if (this.dirty) {
            this.save();
            this.dirty = false;
        }
    }
    /**
     * Call on shutdown to flush any pending stats
     */
    shutdown() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
    }
    capture() {
        this.captures++;
        this.dirty = true;
        // Only flush, don't log on every capture
        this.flush();
    }
    recall(count) {
        this.recalls += count;
        this.dirty = true;
    }
    error(operation, message) {
        this.errors++;
        this.dirty = true;
        // v2.4.3: Track error details for debugging
        this.recentErrors.push({
            timestamp: Date.now(),
            operation,
            message: message.slice(0, 200), // Limit message size
        });
        // Keep only the most recent errors
        if (this.recentErrors.length > this.MAX_RECENT_ERRORS) {
            this.recentErrors = this.recentErrors.slice(-this.MAX_RECENT_ERRORS);
        }
        // v2.4.4: Log errors immediately with details
        console.error(`memory-claw: Error in ${operation}: ${message}`);
    }
    getStats() {
        return {
            captures: this.captures,
            recalls: this.recalls,
            errors: this.errors,
            uptime: Math.floor((Date.now() - this.lastReset) / 1000),
            recentErrors: [...this.recentErrors],
        };
    }
    reset() {
        this.captures = 0;
        this.recalls = 0;
        this.errors = 0;
        this.lastReset = Date.now();
        this.save(); // Immediate save on reset
        this.dirty = false;
    }
}
