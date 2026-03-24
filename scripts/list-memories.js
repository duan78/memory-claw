#!/usr/bin/env node
/**
 * Simple script to list all memories in the database
 */

import { connect } from "@lancedb/lancedb";

const DB_PATH = "/root/.openclaw/memory/memory-claw";
const TABLE_NAME = "memories_claw";

async function listMemories() {
  console.log("Connecting to database at:", DB_PATH);
  const db = await connect(DB_PATH);

  // Get all table names
  const tables = await db.tableNames();
  console.log("Available tables:", tables);

  if (!tables.includes(TABLE_NAME)) {
    console.log(`Table ${TABLE_NAME} does not exist`);
    return;
  }

  const table = await db.openTable(TABLE_NAME);

  // Get schema
  const schema = await table.schema();
  console.log("\nTable schema:");
  console.log(JSON.stringify(schema, null, 2));

  // Get count
  const count = await table.countRows();
  console.log(`\nTotal rows: ${count}`);

  if (count === 0) {
    console.log("No memories found");
    return;
  }

  // Get all rows
  const results = await table.query().limit(100).toArray();
  console.log(`\nFound ${results.length} rows:\n`);

  for (const row of results) {
    console.log(`ID: ${row.id}`);
    console.log(`Text: "${row.text}"`);
    console.log(`Has vector: ${!!row.vector}`);
    console.log(`Importance: ${row.importance}`);
    console.log(`Category: ${row.category}`);
    console.log(`Tier: ${row.tier}`);
    console.log("---");
  }
}

listMemories().catch(console.error);
