import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const sidecarRoot = resolve(appRoot, 'sidecar');
const sdkPackageJson = resolve(
  sidecarRoot,
  'node_modules',
  '@anthropic-ai',
  'claude-agent-sdk',
  'package.json',
);

function run(cmd, args, cwd) {
  const executable = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd;
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${executable} ${args.join(' ')} failed with code ${code ?? -1}`));
    });
    child.on('error', rejectPromise);
  });
}

if (!existsSync(sdkPackageJson)) {
  console.error('[sidecar] dependencies missing, running npm ci in sidecar/');
  await run('npm', ['ci'], sidecarRoot);
}
