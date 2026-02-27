import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidecarIndex = resolve(__dirname, '..', 'index.ts');

// NOTE: These tests require Bun to be installed.
// They are skipped if bun is not available.
const bunAvailable = (() => {
  try {
    const { execSync } = require('child_process');
    execSync('bun --version', { stdio: 'ignore' });
    return true;
  } catch { return false; }
})();

describe.skipIf(!bunAvailable)('shutdown', () => {
  it('exits cleanly on SIGTERM', async () => {
    const child = spawn('bun', ['run', sidecarIndex], { stdio: 'pipe' });
    // Wait for sidecar_ready
    await new Promise<void>((resolve) => {
      child.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('sidecar_ready')) resolve();
      });
    });
    child.kill('SIGTERM');
    const code = await new Promise<number>((resolve) => {
      child.on('exit', (c) => resolve(c ?? 0));
    });
    expect(code).toBe(0);
  }, 10_000);
});
