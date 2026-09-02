#!/usr/bin/env node
/**
 * publish.mjs — publish @jrumandal/shared to GitHub Packages.
 *
 * Strategy (auto-increment):
 *   Query the registry for the highest published version and bump the PATCH
 *   segment (0.0.1 -> 0.0.2 -> ...). This makes "publish on every main push"
 *   safe, since GitHub Packages (like npm) forbids republishing a version that
 *   already exists (409 Conflict).
 *
 * Auth is expected to come from the environment (a generated ~/.npmrc in CI
 * using the _authToken format with GITHUB_TOKEN).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REGISTRY = 'https://npm.pkg.github.com/';
const root = process.cwd();
const pkgPath = join(root, 'package.json');

function sh(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const name = pkg.name;

// Find the highest published version (or none).
let latest = null;
try {
  const out = sh(`npm view ${JSON.stringify(name)} versions --registry=${REGISTRY} --json`, root);
  const versions = JSON.parse(out);
  if (Array.isArray(versions) && versions.length) {
    latest = versions
      .slice()
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .at(-1);
  }
} catch {
  latest = null; // not published yet
}

let next;
if (!latest) {
  next = '0.0.1';
} else {
  const m = latest.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (m) {
    next = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
  } else {
    next = '0.0.1';
  }
}

console.log(`\n=== ${name}: latest=${latest ?? '(none)'} -> publishing ${next} ===`);
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

sh(`pnpm publish --no-git-checks --access public --registry=${REGISTRY}`, root);
console.log(`\n✅ Published ${name}@${next} to GitHub Packages.`);
