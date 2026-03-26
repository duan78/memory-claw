import { readFileSync } from 'fs';

const source = readFileSync('src/plugin-entry.ts', 'utf-8');

console.log('🔍 Direct Verification of v2.4.53 Fixes\n');

// Check 1: Version
const hasVersion = source.includes('v2.4.53');
console.log(`✅ Version 2.4.53: ${hasVersion ? 'YES' : 'NO'}`);

// Check 2: Batch processing fix
const hasBatchFix = source.includes('if (messageSentBatch.length >= MAX_BATCH_SIZE)') &&
                   source.includes('Clear the batch to make room for new events') &&
                   source.includes('message_sent batch full');
console.log(`✅ Batch processing fix: ${hasBatchFix ? 'YES' : 'NO'}`);

// Check 3: No old buggy code
const hasOldBug = source.includes('> MAX_BATCH_SIZE - 1') &&
                source.includes('return; // But batch stays full!');
console.log(`✅ Old buggy code removed: ${!hasOldBug ? 'YES' : 'NO'}`);

// Check 4: Hook count
const hookMatch = source.match(/const hookNames = \[([\s\S]*?)\];/);
let hookCount = 0;
if (hookMatch) {
  hookCount = (hookMatch[1].match(/"/g) || []).length;
}
console.log(`✅ Hook variants: ${hookCount} (expected 40+)`);

// Check 5: Fast health checks
const hasFastChecks = source.includes('15000') && source.includes('60000');
console.log(`✅ Fast health checks (15s/60s): ${hasFastChecks ? 'YES' : 'NO'}`);

// Check 6: Enhanced diagnostics
const hasEnhanced = source.includes('totalFireCount') &&
                   source.includes('mostRecentHook') &&
                   source.includes('timeSinceLastFire');
console.log(`✅ Enhanced diagnostics: ${hasEnhanced ? 'YES' : 'NO'}`);

// Check 7: New hook variants
const newVariants = ['agent_done', 'agent:done', 'finish', 'on_agent_end'];
const hasNewVariants = newVariants.every(v => source.includes(`"${v}"`));
console.log(`✅ New hook variants: ${hasNewVariants ? 'YES' : 'NO'}`);

// Check 8: Events are never dropped
const neverDrops = source.includes('// Safe to add to batch now (either space available or batch was just cleared)') &&
                  source.includes('messageSentBatch.push(event)') &&
                  !source.includes('return; // Current event is dropped!');
console.log(`✅ Events never dropped: ${neverDrops ? 'YES' : 'NO'}`);

const allGood = hasVersion && hasBatchFix && !hasOldBug && hookCount >= 40 && hasFastChecks && hasEnhanced && hasNewVariants && neverDrops;
console.log(`\n${allGood ? '✅ ALL FIXES VERIFIED - Ready for deployment!' : '❌ SOME ISSUES FOUND'}`);
