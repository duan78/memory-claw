/**
 * Memory Claw v2.4.0 - Rate Limiter
 *
 * @version 2.4.0
 * @author duan78
 */
export class RateLimiter {
    captures = [];
    maxCapturesPerHour;
    hourMs = 3600000;
    constructor(maxCapturesPerHour = 10) {
        this.maxCapturesPerHour = maxCapturesPerHour;
    }
    canCapture(importance = 0.5) {
        const now = Date.now();
        // Remove captures older than 1 hour
        this.captures = this.captures.filter((ts) => now - ts < this.hourMs);
        // If under limit, allow
        if (this.captures.length < this.maxCapturesPerHour) {
            return true;
        }
        // If over limit, only allow high importance
        return importance > 0.8;
    }
    recordCapture() {
        this.captures.push(Date.now());
    }
    getCaptureCount() {
        const now = Date.now();
        this.captures = this.captures.filter((ts) => now - ts < this.hourMs);
        return this.captures.length;
    }
    reset() {
        this.captures = [];
    }
}
