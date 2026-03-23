/**
 * Memory Claw v2.4.4 - Statistics Tracker with Improved Persistence
 *
 * v2.4.4 improvements:
 * - Immediate flush for critical operations (capture)
 * - Better error logging with stack traces
 * - More frequent saves to prevent data loss
 * - Logging when stats are saved/loaded
 *
 * @version 2.4.4
 * @author duan78
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { STATS_PATH } from "../config.js";

interface StatsData {
  captures: number;
  recalls: number;
  errors: number;
  lastReset: number;
  recentErrors: Array<{ timestamp: number; message: string; operation: string }>;
}

export class StatsTracker {
  private captures = 0;
  private recalls = 0;
  private errors = 0;
  private lastReset = Date.now();
  private dirty = false;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RECENT_ERRORS = 50; // v2.4.3: Keep last 50 errors with details
  private recentErrors: Array<{ timestamp: number; message: string; operation: string }> = [];

  constructor() {
    this.load();
    this.startFlushInterval();
    console.log("memory-claw: StatsTracker initialized");
  }

  private load(): void {
    try {
      if (existsSync(STATS_PATH)) {
        const data = JSON.parse(readFileSync(STATS_PATH, "utf-8")) as StatsData;
        this.captures = data.captures || 0;
        this.recalls = data.recalls || 0;
        this.errors = data.errors || 0;
        this.lastReset = data.lastReset || Date.now();
        this.recentErrors = (data.recentErrors || []).slice(0, this.MAX_RECENT_ERRORS);
        console.log(`memory-claw: Stats loaded - captures: ${this.captures}, recalls: ${this.recalls}, errors: ${this.errors}`);
      } else {
        console.log("memory-claw: No existing stats file found, starting fresh");
      }
    } catch (error) {
      console.warn(`memory-claw: Failed to load stats: ${error}`);
      console.error("Stats load error details:", error);
    }
  }

  private save(): void {
    try {
      const dir = join(homedir(), ".openclaw", "memory");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data: StatsData = {
        captures: this.captures,
        recalls: this.recalls,
        errors: this.errors,
        lastReset: this.lastReset,
        recentErrors: this.recentErrors,
      };
      writeFileSync(STATS_PATH, JSON.stringify(data, null, 2));
      // v2.4.4: Log when stats are saved
      console.log(`memory-claw: Stats saved - captures: ${this.captures}, recalls: ${this.recalls}, errors: ${this.errors}`);
    } catch (error) {
      console.error(`memory-claw: Failed to save stats: ${error}`);
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush dirty stats to disk (called periodically and on shutdown)
   */
  flush(): void {
    if (this.dirty) {
      this.save();
      this.dirty = false;
    }
  }

  /**
   * Call on shutdown to flush any pending stats
   */
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  capture(): void {
    this.captures++;
    this.dirty = true;
    // v2.4.4: Immediate flush for captures to prevent data loss
    this.flush();
  }

  recall(count: number): void {
    this.recalls += count;
    this.dirty = true;
  }

  error(operation: string, message: string): void {
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

  getStats(): { captures: number; recalls: number; errors: number; uptime: number; recentErrors: Array<{ timestamp: number; message: string; operation: string }> } {
    return {
      captures: this.captures,
      recalls: this.recalls,
      errors: this.errors,
      uptime: Math.floor((Date.now() - this.lastReset) / 1000),
      recentErrors: [...this.recentErrors],
    };
  }

  reset(): void {
    this.captures = 0;
    this.recalls = 0;
    this.errors = 0;
    this.lastReset = Date.now();
    this.save(); // Immediate save on reset
    this.dirty = false;
  }
}
