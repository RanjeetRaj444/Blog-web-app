// Fails the build when JS bundles exceed the size budget (gzip sizes).
// Usage: npm run build && npm run check:bundle
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FILE_KB = 120;
const MAX_TOTAL_KB = 350;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] || join(root, "dist", "assets");

if (!existsSync(dir)) {
  console.error(`No build output at ${dir}. Run "npm run build" first.`);
  process.exit(2);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({
    name: f,
    kb: gzipSync(readFileSync(join(dir, f))).length / 1024,
  }))
  .sort((a, b) => b.kb - a.kb);

const total = files.reduce((sum, f) => sum + f.kb, 0);
const problems = [];

for (const f of files) {
  console.log(`${f.kb.toFixed(1).padStart(7)} KB gzip  ${f.name}`);
  if (f.kb > MAX_FILE_KB) {
    problems.push(`${f.name} is ${f.kb.toFixed(1)} KB (limit ${MAX_FILE_KB} KB)`);
  }
}
console.log(`${total.toFixed(1).padStart(7)} KB gzip  TOTAL JS (${files.length} files)`);
if (total > MAX_TOTAL_KB) {
  problems.push(`total JS is ${total.toFixed(1)} KB (limit ${MAX_TOTAL_KB} KB)`);
}

if (problems.length) {
  console.error("\nBundle size budget exceeded:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("\nBundle size budget OK");
