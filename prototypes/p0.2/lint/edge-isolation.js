#!/usr/bin/env node
/**
 * Edge Isolation Lint Rule
 *
 * Ensures that edge/buffer (audio handling) imports NO:
 * - Network modules (fetch, http, https, ws, WebSocket, XMLHttpRequest)
 * - Filesystem (fs, path)
 * - Storage (localStorage, sessionStorage, AsyncStorage, MMKV)
 * - Logging services (external)
 *
 * Exit code: 0 if pass, 1 if violations found
 */

const fs = require("fs");
const path = require("path");

const bannedImports = [
  // Network
  "fetch",
  "http",
  "https",
  "ws",
  "websocket",
  "xmlhttprequest",
  "axios",
  "node-fetch",
  "superagent",
  "got",
  
  // Filesystem
  "fs",
  "path",
  "os",
  
  // Storage
  "localStorage",
  "sessionStorage",
  "AsyncStorage",
  "mmkv",
  "realm",
  
  // Logging
  "winston",
  "bunyan",
  "pino",
  "sentry",
  "datadog",
];

const bannedPatterns = [
  /require\s*\(\s*['"](fetch|http|https|ws|fs|path)['"]\s*\)/gi,
  /import\s+.*\s+from\s+['"](fetch|http|https|ws|fs|path)['"]/gi,
  /localStorage\./g,
  /sessionStorage\./g,
  /AsyncStorage\./g,
  /\.write\s*\(/g, // fs.write
  /\.readFile/g,   // fs.readFile
];

function lintEdgeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const violations = [];

  // Check for banned imports
  for (const banned of bannedImports) {
    const regex = new RegExp(
      `(?:import|require|from)\\s+["'].*${banned}.*["']`,
      "gi"
    );
    if (regex.test(content)) {
      violations.push(`Found import of banned module: ${banned}`);
    }
  }

  // Check for banned patterns
  for (const pattern of bannedPatterns) {
    if (pattern.test(content)) {
      violations.push(`Found banned pattern: ${pattern}`);
    }
  }

  return violations;
}

function main() {
  console.log("🔍 Edge Isolation Lint\n");

  const edgeFiles = [
    "edge-buffer.ts",
    "inference-engine.ts",
    "flag-builder.ts",
  ];

  let totalViolations = 0;

  for (const file of edgeFiles) {
    const filePath = path.join(__dirname, "..", file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${file} not found (skipping)`);
      continue;
    }

    const violations = lintEdgeFile(filePath);

    if (violations.length === 0) {
      console.log(`  ✅ ${file}: PASS (no banned imports)`);
    } else {
      console.log(`  ❌ ${file}: FAIL`);
      for (const v of violations) {
        console.log(`     - ${v}`);
      }
      totalViolations += violations.length;
    }
  }

  console.log();
  if (totalViolations === 0) {
    console.log("✅ All edge files pass isolation lint\n");
    process.exit(0);
  } else {
    console.log(`❌ ${totalViolations} violation(s) found\n`);
    process.exit(1);
  }
}

main();
