import { runPersistent } from './persistent-mode.ts';

runPersistent()
  .then(() => {
    console.error('[sidecar] exited');
    process.exit(0);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sidecar] fatal: ${message}`);
    process.exit(1);
  });

