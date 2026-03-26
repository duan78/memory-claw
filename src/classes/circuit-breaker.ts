/**
 * Memory Claw v2.4.55 - Circuit Breaker for Error Backoff
 *
 * Implements circuit breaker pattern to prevent error loops:
 * - Tracks consecutive errors
 * - Opens circuit (stops operations) after threshold
 * - Closes circuit after backoff period
 * - Tracks errors per hour for global limit
 *
 * @version 2.4.55
 * @author duan78
 */

export interface CircuitBreakerConfig {
  consecutiveErrorThreshold: number; // Open circuit after this many consecutive errors
  backoffDurationMs: number; // How long to keep circuit open
  maxErrorsPerHour: number; // Global error limit per hour
}

export interface CircuitBreakerState {
  isOpen: boolean;
  consecutiveErrors: number;
  lastErrorTime: number;
  reopenAt: number;
  hourlyErrors: number[];
  disabled: boolean; // Global disable flag
}

export class CircuitBreaker {
  private state: CircuitBreakerState;

  constructor(private config: CircuitBreakerConfig) {
    this.state = {
      isOpen: false,
      consecutiveErrors: 0,
      lastErrorTime: 0,
      reopenAt: 0,
      hourlyErrors: [],
      disabled: false,
    };
  }

  /**
   * Check if operations should proceed
   * Returns false if circuit is open or globally disabled
   */
  canProceed(): { allowed: boolean; reason?: string } {
    // Clean old hourly errors
    this.cleanOldErrors();

    // Check if globally disabled
    if (this.state.disabled) {
      return { allowed: false, reason: "Globally disabled (too many errors in last hour)" };
    }

    // Check if circuit is open
    if (this.state.isOpen) {
      const now = Date.now();
      if (now < this.state.reopenAt) {
        const remainingMs = this.state.reopenAt - now;
        const remainingSecs = Math.ceil(remainingMs / 1000);
        return { allowed: false, reason: `Circuit open (${remainingSecs}s remaining)` };
      } else {
        // Circuit cooldown expired, reset
        this.closeCircuit();
      }
    }

    return { allowed: true };
  }

  /**
   * Record a successful operation
   * Resets consecutive error count and closes circuit if it was open
   */
  recordSuccess(): void {
    this.state.consecutiveErrors = 0;
    if (this.state.isOpen) {
      this.closeCircuit();
    }
  }

  /**
   * Record an error
   * Opens circuit if threshold reached, disables globally if hourly limit exceeded
   */
  recordError(): { circuitOpened: boolean; globallyDisabled: boolean } {
    const now = Date.now();
    this.state.consecutiveErrors++;
    this.state.lastErrorTime = now;
    this.state.hourlyErrors.push(now);

    let circuitOpened = false;
    let globallyDisabled = false;

    // Check if we should open the circuit
    if (!this.state.isOpen && this.state.consecutiveErrors >= this.config.consecutiveErrorThreshold) {
      this.openCircuit();
      circuitOpened = true;
    }

    // Check if we should globally disable
    this.cleanOldErrors();
    if (!this.state.disabled && this.state.hourlyErrors.length >= this.config.maxErrorsPerHour) {
      this.state.disabled = true;
      globallyDisabled = true;
      // Schedule re-enable after 1 hour
      setTimeout(() => {
        this.state.disabled = false;
        console.log("memory-claw: CircuitBreaker re-enabled after hourly limit cooldown");
      }, 3600000); // 1 hour
    }

    return { circuitOpened, globallyDisabled };
  }

  /**
   * Get current circuit breaker state for diagnostics
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Manually close the circuit (for recovery)
   */
  closeCircuit(): void {
    this.state.isOpen = false;
    this.state.consecutiveErrors = 0;
    this.state.reopenAt = 0;
  }

  /**
   * Manually open the circuit (for testing or manual intervention)
   */
  openCircuit(): void {
    this.state.isOpen = true;
    this.state.reopenAt = Date.now() + this.config.backoffDurationMs;
  }

  /**
   * Reset the circuit breaker completely
   */
  reset(): void {
    this.state = {
      isOpen: false,
      consecutiveErrors: 0,
      lastErrorTime: 0,
      reopenAt: 0,
      hourlyErrors: [],
      disabled: false,
    };
  }

  /**
   * Clean errors older than 1 hour
   */
  private cleanOldErrors(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    this.state.hourlyErrors = this.state.hourlyErrors.filter(ts => ts > oneHourAgo);
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): string {
    const now = Date.now();
    this.cleanOldErrors();
    const errorsInLastHour = this.state.hourlyErrors.length;

    let status = this.state.disabled
      ? "DISABLED (hourly limit exceeded)"
      : this.state.isOpen
      ? `OPEN (backoff active, ${(this.state.reopenAt - now) / 1000}s remaining)`
      : "CLOSED (operational)";

    return `CircuitBreaker: ${status} | Consecutive errors: ${this.state.consecutiveErrors}/${this.config.consecutiveErrorThreshold} | Errors/hour: ${errorsInLastHour}/${this.config.maxErrorsPerHour}`;
  }
}
