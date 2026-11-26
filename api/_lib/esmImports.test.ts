import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

// Vercel runs api/*.ts as native Node ESM, which needs explicit `.js` extensions on
// relative runtime imports. Vite and Vitest resolve extensionless paths, so a missing
// extension passes every local check and only crashes the deployed function
// (FUNCTION_INVOCATION_FAILED). This walks the import graph of each API entry point.
const ENTRY_POINTS = ['api/ai.ts', 'api/extract-job.ts'];
const IMPORT_PATTERN = /^\s*(import|export)\s+(?!type\b)[^;]*?\sfrom\s+'(\.{1,2}\/[^']+)'/gm;

function runtimeRelativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(IMPORT_PATTERN)].map(match => match[2]);
}

function walk(entry: string, seen = new Set<string>(), problems: string[] = []): string[] {
  if (seen.has(entry)) return problems;
  seen.add(entry);
  for (const specifier of runtimeRelativeImports(entry)) {
    if (!specifier.endsWith('.js')) {
      problems.push(`${entry}: '${specifier}' needs a .js extension`);
      continue;
    }
    const target = resolve(dirname(entry), specifier.replace(/\.js$/, '.ts'));
    if (existsSync(target)) walk(target, seen, problems);
  }
  return problems;
}

describe('API ESM imports', () => {
  it.each(ENTRY_POINTS)('%s only uses relative runtime imports with .js extensions', entry => {
    expect(walk(resolve(entry))).toEqual([]);
  });
});
