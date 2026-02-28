import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');

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

await run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'sidecar/tsconfig.build.json'], appRoot);
