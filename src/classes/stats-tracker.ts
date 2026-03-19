/**
 * Memory Claw v2.4.0 - Statistics Tracker with Debounce
 *
 * v2.4.0: Added debounce to avoid disk I/O on every operation.
 * Stats are now only flushed to disk:
 * - Every 30 seconds if dirty
 * - On shutdown (call shutdown())
 * - On explicit reset
 *
 * @version 2.4.0
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
}

export class StatsTracker {
  private captures = 0;
  private recalls = 0;
  private errors = 0;
  private lastReset = Date.now();
  private dirty = false;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.load();
    this.startFlushInterval();
  }

  private load(): void {
    try {
      if (existsSync(STATS_PATH)) {
        const data = JSON.parse(readFileSync(STATS_PATH, "utf-8")) as StatsData;
        this.captures = data.captures || 0;
        this.recalls = data.recalls || 0;
        this.errors = data.errors || 0;
        this.lastReset = data.lastReset || Date.now();
      }
    } catch (error) {
      console.warn(`memory-claw: Failed to load stats: ${error}`);
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
      };
      writeFileSync(STATS_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`memory-claw: Failed to save stats: ${error}`);
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
  }

  recall(count: number): void {
    this.recalls += count;
    this.dirty = true;
  }

  error(): void {
    this.errors++;
    this.dirty = true;
  }

  getStats(): { captures: number; recalls: number; errors: number; uptime: number } {
    return {
      captures: this.captures,
      recalls: this.recalls,
      errors: this.errors,
      uptime: Math.floor((Date.now() - this.lastReset) / 1000),
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
