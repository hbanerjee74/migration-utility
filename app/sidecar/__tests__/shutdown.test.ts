import { describe, it, expect } from 'vitest';
import { spawn, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidecarEntry = resolve(__dirname, '..', 'dist', 'index.js');

const nodeAvailable = (() => {
  try {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!nodeAvailable || !existsSync(sidecarEntry))('shutdown', () => {
  it('exits cleanly on SIGTERM', async () => {
    const child = spawn('node', [sidecarEntry], { stdio: 'pipe' });
    await new Promise<void>((resolveReady) => {
      child.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('sidecar_ready')) resolveReady();
      });
    });
    child.kill('SIGTERM');
    const code = await new Promise<number>((resolveCode) => {
      child.on('exit', (c) => resolveCode(c ?? 0));
    });
    expect(code).toBe(0);
  }, 10_000);
});

