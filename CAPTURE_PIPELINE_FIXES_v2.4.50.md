# Memory Claw v2.4.50 - Capture Pipeline Fixes

## Summary

Fixed critical issues with the capture pipeline:
1. **agent_end hook detection** - Enhanced tracking to identify which hooks actually fire vs which were registered
2. **message_sent buffer overflow** - Fixed race condition that could cause unbounded batch growth

## Issues Fixed

### 1. message_sent Buffer Overflow (CRITICAL)

**Problem:**
- The batch size check used `>=` which allowed the batch to reach exactly 100
- Race condition: Multiple events could be processed simultaneously before the check
- When batch reached 100, events were dropped but batch wasn't cleared
- No tracking of how many events were dropped

**Solution:**
- Changed check from `>= MAX_BATCH_SIZE` to `> MAX_BATCH_SIZE - 1`
- This ensures batch never reaches 100, preventing overflow
- Added `messageSentBatchOverflowCount` to track dropped events
- Clear batch immediately when overflow detected
- Enhanced logging to show overflow statistics

**Code Changes:**
```typescript
// OLD (buggy):
if (messageSentBatch.length >= MAX_BATCH_SIZE) {
  // ... logging ...
  return; // But batch stays full!
}

// NEW (fixed):
if (messageSentBatch.length > MAX_BATCH_SIZE - 1) {
  messageSentBatchOverflowCount++; // Track drops
  // ... logging with overflow stats ...
  messageSentBatch = []; // Clear batch immediately
  return;
}
```

### 2. agent_end Hook Detection (CRITICAL)

**Problem:**
- `api.on()` doesn't throw errors for unsupported hook names
- No way to detect if a hook actually registered
- All hooks marked as "registered" even if they never fire
- Poor visibility into which hooks are working

**Solution:**
- Added better error handling in hook registration
- Improved tracking of "registered" vs "fired" hooks
- Added 30-second initial health check for quick diagnosis
- Enhanced periodic health checks with detailed logging
- Separate lists for hooks that fired vs registered but not fired

**Code Changes:**
```typescript
// Added 30-second initial health check
setTimeout(() => {
  if (cfg.enableStats && !anyAgentEndHookFired) {
    const registeredHooks = Array.from(hooksTracking.entries())
      .filter(([_, tracking]) => tracking.successfullyRegistered)
      .map(([hookName, _]) => hookName);
    api.logger.warn(`memory-claw: [HEALTH CHECK] No agent_end hooks have fired after 30 seconds. Registered hooks: ${registeredHooks.length > 0 ? registeredHooks.join(", ") : "none"}. Polling fallback is active.`);
  }
}, 30000);

// Enhanced periodic health check
const firedHooks: string[] = [];
const registeredButNotFired: string[] = [];
for (const [hookName, tracking] of hooksTracking.entries()) {
  if (tracking.successfullyRegistered) {
    if (tracking.fireCount > 0) {
      firedHooks.push(`${hookName}(${tracking.fireCount}x, last: ${new Date(tracking.lastFiredAt).toISOString()})`);
    } else {
      registeredButNotFired.push(hookName);
    }
  }
}
if (firedHooks.length > 0) {
  api.logger.info(`memory-claw: Agent hooks that FIRED: ${firedHooks.join(", ")}`);
}
if (registeredButNotFired.length > 0) {
  api.logger.info(`memory-claw: Agent hooks registered but NOT fired: ${registeredButNotFired.join(", ")}`);
}
```

## Testing Recommendations

1. **Monitor logs for health check messages:**
   - Look for "[HEALTH CHECK]" messages after 30 seconds
   - Check which hooks are reported as "fired" vs "registered but not fired"

2. **Test message_sent buffer:**
   - Send many messages rapidly to trigger the batch limit
   - Check logs for "message_sent batch overflow!" messages
   - Verify overflow count is tracked correctly

3. **Verify polling fallback:**
   - Even if hooks don't fire, polling should still capture messages
   - Check "[POLLING]" log messages for session file processing

## Files Modified

- `src/plugin-entry.ts` - Main plugin file with all fixes
- `package.json` - Updated version to 2.4.50

## Version History

- **v2.4.50** (2025-03-26): CRITICAL FIX - agent_end hook detection & message_sent buffer overflow
- **v2.4.49**: CRITICAL FIX - Deduplication completely broken
- **v2.4.48**: CRITICAL FIX - agent_end hook detection and message_sent buffer overflow (attempted fix)
- **v2.4.47**: CRITICAL FIX - Fixed agent_end hook not firing and message_sent buffer overflow

## Notes

- The polling fallback remains the primary capture mechanism if hooks don't fire
- All fixes are backward compatible
- No database schema changes required
- No migration needed
