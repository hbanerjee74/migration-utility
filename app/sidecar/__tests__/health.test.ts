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

describe.skipIf(!nodeAvailable || !existsSync(sidecarEntry))('health', () => {
  it('emits sidecar_ready and pong', async () => {
    const child = spawn('node', [sidecarEntry], { stdio: 'pipe' });
    const stdoutLines: string[] = [];

    const sawReady = new Promise<void>((resolveReady) => {
      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdoutLines.push(chunk);
        if (chunk.includes('"type":"sidecar_ready"')) {
          resolveReady();
        }
      });
    });

    await sawReady;
    child.stdin.write('{"type":"ping"}\n');
    child.stdin.write('{"type":"shutdown"}\n');

    await new Promise<void>((resolveDone) => child.on('exit', () => resolveDone()));
    const output = stdoutLines.join('\n');
    expect(output).toContain('"type":"sidecar_ready"');
    expect(output).toContain('"type":"pong"');
  }, 10_000);
});
