#!/usr/bin/env node
/**
 * Checks that every new/changed instrumented line in the diff vs origin/main
 * is covered by tests. Run after: CYPRESS_COVERAGE=true npm test
 *
 * Usage: node scripts/check-diff-coverage.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const LCOV = resolve(ROOT, 'coverage/lcov.info');

/** Parse lcov.info → { 'src/foo.tsx' → Map<lineNo, hits> } */
function parseLcov(content) {
  const files = {};
  let current = null;
  for (const line of content.split('\n')) {
    if (line.startsWith('SF:')) {
      current = line.slice(3).trim();
      files[current] = new Map();
    } else if (line.startsWith('DA:') && current) {
      const comma = line.indexOf(',', 3);
      const lineNo = parseInt(line.slice(3, comma));
      const hits = parseInt(line.slice(comma + 1));
      files[current].set(lineNo, hits);
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return files;
}

/** Parse unified diff (--unified=0) → { 'src/foo.tsx' → Set<lineNo> } (added lines only) */
function parseDiffNewLines(diff) {
  const files = {};
  let current = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      current = line.slice(6).trim();
      files[current] = new Set();
    } else if (line.startsWith('@@ ') && current) {
      // e.g. "@@ -3,0 +4,2 @@"  new-start=4 count=2  →  lines 4,5
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      if (!match) continue;
      const start = parseInt(match[1]);
      const count = match[2] !== undefined ? parseInt(match[2]) : 1;
      if (count === 0) continue; // pure deletion hunk — no new lines
      for (let i = 0; i < count; i++) files[current].add(start + i);
    }
  }
  return files;
}

// ── Compute diff vs origin/main ──────────────────────────────────────────────

let diff;
try {
  const base = execSync('git merge-base HEAD origin/main', { cwd: ROOT }).toString().trim();
  diff = execSync(`git diff --unified=0 ${base} HEAD -- 'src/**'`, {
    cwd: ROOT,
  }).toString();
} catch (e) {
  console.error('Could not compute diff vs origin/main:', e.message);
  process.exit(1);
}

// ── Load coverage ────────────────────────────────────────────────────────────

let lcovContent;
try {
  lcovContent = readFileSync(LCOV, 'utf8');
} catch {
  console.error('coverage/lcov.info not found — run: CYPRESS_COVERAGE=true npm test');
  process.exit(1);
}

const coverage = parseLcov(lcovContent);
const diffLines = parseDiffNewLines(diff);

// ── Check ─────────────────────────────────────────────────────────────────────

let failures = 0;
for (const [file, newLines] of Object.entries(diffLines)) {
  const fileCov = coverage[file];
  if (!fileCov) continue; // file not instrumented (e.g. types-only) — skip
  for (const lineNo of [...newLines].sort((a, b) => a - b)) {
    if (!fileCov.has(lineNo)) continue; // non-instrumented line (blank/comment) — skip
    if (fileCov.get(lineNo) === 0) {
      console.error(`  UNCOVERED  ${file}:${lineNo}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n✗ ${failures} new/changed line(s) not covered. Add tests, then re-run:\n`);
  console.error('    CYPRESS_COVERAGE=true npm test\n');
  process.exit(1);
} else {
  const newLineCount = Object.values(diffLines).reduce((n, s) => n + s.size, 0);
  console.log(`✓ Diff coverage OK (${newLineCount} new lines, all instrumented lines hit)`);
}
