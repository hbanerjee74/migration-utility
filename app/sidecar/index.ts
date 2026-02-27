import * as readline from 'readline';
import { writeLine, parseLine } from './protocol.ts';
import { handleAgentRequest } from './agent-runner.ts';

// Signal readiness immediately
writeLine({ type: 'sidecar_ready' });
console.error('[sidecar] ready');

// Handle graceful shutdown
function shutdown() {
  console.error('[sidecar] shutting down');
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Read stdin line by line
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
  const msg = parseLine(line.trim());
  if (!msg) {
    console.error('[sidecar] received unparseable line');
    return;
  }
  if (msg.type === 'ping') {
    writeLine({ type: 'pong', id: msg.id });
  } else if (msg.type === 'agent_request') {
    handleAgentRequest(msg).catch((err) => {
      console.error('[sidecar] unhandled error:', err);
    });
  }
});

rl.on('close', () => {
  console.error('[sidecar] stdin closed, exiting');
  process.exit(0);
});
