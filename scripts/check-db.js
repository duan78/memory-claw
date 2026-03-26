#!/usr/bin/env node
/**
 * Simple script to check database contents
 */

import { MemoryDB } from '../dist/src/db.js';
const path = '/root/.openclaw/memory/memory-claw';

async function checkDB() {
  const db = new MemoryDB(path, 1024);
  const memories = await db.getAll();

  console.log('=== Database Contents ===');
  console.log('Total memories:', memories.length);
  console.log('');

  if (memories.length === 0) {
    console.log('Database is empty.');
    return;
  }

  memories.forEach((m, i) => {
    console.log(`Memory ${i+1}:`);
    console.log(`  ID: ${m.id.slice(0, 8)}...`);
    console.log(`  Text: ${m.text.slice(0, 100)}${m.text.length > 100 ? '...' : ''}`);
    console.log(`  Importance: ${m.importance.toFixed(2)}`);
    console.log(`  Category: ${m.category}`);
    console.log(`  Tier: ${m.tier}`);
    console.log(`  Created: ${new Date(m.createdAt).toISOString()}`);
    console.log(`  Source: ${m.source}`);
    console.log(`  Hit Count: ${m.hitCount || 0}`);
    console.log('');
  });
}

checkDB().catch(console.error);
