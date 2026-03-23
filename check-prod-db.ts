#!/usr/bin/env tsx
/**
 * Check production database
 */

import { MemoryDB } from "./src/db.js";

async function checkDB() {
  const db = new MemoryDB("/root/.openclaw/memory/memory-claw", 1024);
  const count = await db.count();
  console.log(`Database count: ${count}`);

  if (count > 0) {
    const allMemories = await db.getAll();
    console.log(`\nTotal memories: ${allMemories.length}`);

    if (allMemories.length > 0) {
      console.log(`\nFirst memory:`);
      console.log(`  Text: "${allMemories[0].text.slice(0, 100)}..."`);
      console.log(`  Vector dimension: ${allMemories[0].vector.length}`);
      console.log(`  Created at: ${new Date(allMemories[0].createdAt).toISOString()}`);
    }
  }
}

checkDB().catch(console.error);
