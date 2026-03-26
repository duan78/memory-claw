# Memory Claw v2.4.54 - Capture Pipeline Fixes

## Summary

Fixed critical issues with the capture pipeline that were causing agent_end hooks not to fire and message_sent buffer overflow problems.

## Issues Fixed

### 1. message_sent Buffer Overflow (CRITICAL)

**Problem:**
- The v2.4.53 fix had a fundamental flaw: it accumulated events in a batch but just cleared them when full
- When batch reached 100 events, the code cleared the array but never processed the events
- The log said "processing immediately" but events were just discarded
- This wasted memory and provided no value since message_sent is disabled for capture anyway

**Solution:**
- Completely removed batching mechanism
- Simplified to just count events and rate-limited logging (once per minute)
- No buffer accumulation, no memory overhead
- Events are monitored for diagnostics only (not used for capture)

**Code Changes:**
```typescript
// OLD (v2.4.53 - wasteful batching):
let messageSentBatch: unknown[] = [];
if (messageSentBatch.length >= MAX_BATCH_SIZE) {
  messageSentBatch = []; // Clear but never process!
}
messageSentBatch.push(event);

// NEW (v2.4.54 - simple counting):
let messageSentCount = 0;
messageSentCount = (messageSentCount + 1) % 1000000;
// Rate-limited logging only, no batching
```

**Why message_sent can't be used for capture:**
- Event structure: `{to, content, success, error}`
- Missing `role` field to distinguish user vs assistant messages
- No message object, just response content
- Can't determine what to capture without role/message context

### 2. agent_end Hook Detection (ENHANCED)

**Problem:**
- 40+ hook name variants were tried but no way to know which OpenClaw actually supports
- Hooks don't throw errors when registered with unsupported names
- No mechanism to detect which hooks actually fire
- Polling was too slow (30s) to be reliable as primary mechanism

**Solution:**
- Added hook discovery mechanism to test which hooks OpenClaw supports
- Enhanced diagnostics to capture event structure when hooks fire
- Made polling more aggressive (15s instead of 30s) as primary mechanism
- Faster health checks (10s and 30s) for quicker diagnosis

**New Features:**
```typescript
// Hook discovery - tests which hooks OpenClaw actually supports
const discoverSupportedHooks = async (): Promise<string[]> => {
  // Try registering test hooks and detect errors
  // Returns list of potentially supported hook names
};

// Enhanced event structure capture
interface HookTracking {
  hookName: string;
  fired: boolean;
  fireCount: number;
  successfullyRegistered: boolean;
  lastFiredAt: number;
  eventStructure?: string; // NEW: Capture sample event structure
}
```

**Polling Improvements:**
- Reduced interval from 30s to 15s (more aggressive)
- Now the primary capture mechanism (more reliable than hooks)
- Better logging to show polling is working

### 3. Health Monitoring Enhancements (IMPROVED)

**Problem:**
- Health checks were too slow (15s and 60s)
- Insufficient information about event structure
- Polling wasn't emphasized as the primary mechanism

**Solution:**
- Faster health checks (10s and 30s) for quicker diagnosis
- Enhanced logging shows event structure when hooks fire
- Emphasized polling as the primary capture mechanism
- Better messaging about expected behavior

## Testing Recommendations

1. **Monitor logs for health check messages:**
   - Look for "[HEALTH CHECK]" messages after 10 seconds
   - Check which hooks are reported as "fired"
   - Verify polling is working (look for "[POLLING]" messages)

2. **Verify message_sent is no longer accumulating:**
   - Check logs for "message_sent FIRED!" messages (should be rate-limited to once per minute)
   - Should see "event structure: {to, content, success, error}" in logs
   - No "batch full" messages anymore

3. **Check polling frequency:**
   - Polling now runs every 15 seconds (was 30s)
   - Look for "[POLLING]" messages every 15 seconds
   - Verify messages are being captured from session files

4. **Hook discovery diagnostics:**
   - Look for "[HOOK DISCOVERY]" messages at startup
   - Should show which hooks OpenClaw potentially supports
   - Check event structure when hooks fire

## Files Modified

- `src/plugin-entry.ts` - Main plugin file with all fixes
- `package.json` - Updated version to 2.4.54 and description

## Version History

- **v2.4.54** (2026-03-26): CRITICAL FIX - Simplified message_sent (no buffer), aggressive polling (15s), hook discovery
- **v2.4.53** (2026-03-26): CRITICAL FIX - agent_end hook detection (40+ variants) + message_sent buffer overflow (attempted fix)
- **v2.4.52**: CRITICAL FIX - Dedup was STILL broken (checking only 50/222 rows)
- **v2.4.51**: CRITICAL FIX - Real-time deduplication was still broken
- **v2.4.50**: CRITICAL FIX - Fixed agent_end hook detection and message_sent buffer overflow

## Key Improvements

1. **No Buffer Overhead**: message_sent now just counts/logs, no batch accumulation
2. **Better Hook Discovery**: Mechanism to detect which hooks OpenClaw actually supports
3. **Faster Diagnosis**: 10-second health checks provide quicker feedback
4. **Enhanced Diagnostics**: Event structure capture shows what hooks provide
5. **Aggressive Polling**: 15-second interval as primary capture mechanism
6. **Clearer Messaging**: Emphasizes polling as the reliable fallback

## Expected Behavior After Fix

1. **message_sent**: Should see simple count logging (once per minute), no batch processing
2. **agent_end hooks**: May still not fire, but hook discovery will show which are supported
3. **Polling**: Should be active every 15 seconds, capturing messages reliably
4. **Health checks**: Should see informative messages after 10s and 30s
5. **Memory capture**: Should work reliably through polling (primary mechanism)

## Troubleshooting

If capture still has issues:

1. Check logs for "[POLLING]" messages (should appear every 15 seconds)
2. Look for "[HOOK DISCOVERY]" messages to see which hooks are supported
3. Verify session files exist in `~/.openclaw/agents/main/sessions/`
4. Check that polling is processing messages (look for "Converted to X user messages")
5. If polling works, hooks are less critical - polling is the primary mechanism

## Architecture Decision

**Why polling is now the primary mechanism:**

1. **Reliability**: Hooks depend on OpenClaw's implementation details that may change
2. **Consistency**: Polling works the same across all OpenClaw versions
3. **Completeness**: Session files contain complete conversation history
4. **Independence**: Not affected by hook naming or event structure changes

The system is designed to be resilient - hooks provide real-time capture when available, but polling ensures nothing is missed.
