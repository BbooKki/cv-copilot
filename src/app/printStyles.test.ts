import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

describe('print styles', () => {
  it('keeps the CV preview visible when the workspace defaults to the Copilot view', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const printStyles = css.match(/@media print\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';
    const paperShellRule = printStyles.match(/\.paper-shell\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(paperShellRule).toMatch(/display:\s*block\s*!important/);
  });
});
