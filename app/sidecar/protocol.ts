// Message types
export type SidecarReady = { type: 'sidecar_ready' };
export type Ping = { type: 'ping'; id: string };
export type Pong = { type: 'pong'; id: string };
export type AgentRequest = {
  type: 'agent_request';
  id: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
};
export type AgentResponse = {
  type: 'agent_response';
  id: string;
  content: string;
  done: boolean;
};
export type AgentError = {
  type: 'agent_error';
  id: string;
  error: string;
};

export type InboundMessage = Ping | AgentRequest;
export type OutboundMessage = SidecarReady | Pong | AgentResponse | AgentError;

export function writeLine(msg: OutboundMessage): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

export function parseLine(line: string): InboundMessage | null {
  try {
    const parsed = JSON.parse(line);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as InboundMessage;
    }
    return null;
  } catch {
    return null;
  }
}
