import { parseSidecarConfig } from './config.ts';
import type { SidecarConfig } from './config.ts';

export type SidecarReady = { type: 'sidecar_ready' };
export type Ping = { type: 'ping' };
export type Pong = { type: 'pong' };
export type Shutdown = { type: 'shutdown' };
export type Cancel = { type: 'cancel'; request_id: string };
export type AgentRequest = {
  type: 'agent_request';
  request_id: string;
  config: SidecarConfig;
};
export type StreamStart = {
  type: 'stream_start';
  request_id: string;
  session_id: string;
  config: SidecarConfig;
};
export type StreamMessage = {
  type: 'stream_message';
  request_id: string;
  session_id: string;
  user_message: string;
};
export type StreamEnd = {
  type: 'stream_end';
  session_id: string;
};

export type RequestComplete = { type: 'request_complete'; request_id: string };
export type AgentResponse = {
  type: 'agent_response';
  request_id: string;
  content: string;
  done: boolean;
};
export type AgentEvent = {
  type: 'agent_event';
  request_id: string;
  event: unknown;
};
export type AgentError = {
  type: 'error';
  request_id: string;
  message: string;
};
export type SidecarSystem = {
  type: 'system';
  request_id: string;
  subtype: string;
  timestamp: number;
};

export type InboundMessage =
  | Ping
  | Shutdown
  | Cancel
  | AgentRequest
  | StreamStart
  | StreamMessage
  | StreamEnd;
export type OutboundMessage =
  | SidecarReady
  | Pong
  | RequestComplete
  | AgentResponse
  | AgentEvent
  | AgentError
  | SidecarSystem;

export function writeLine(message: OutboundMessage): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function parseIncomingMessage(line: string): InboundMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (obj.type === 'ping') return { type: 'ping' };
  if (obj.type === 'shutdown') return { type: 'shutdown' };

  if (obj.type === 'cancel') {
    if (typeof obj.request_id !== 'string' || obj.request_id.length === 0) return null;
    return { type: 'cancel', request_id: obj.request_id };
  }

  if (obj.type === 'agent_request') {
    if (typeof obj.request_id !== 'string' || obj.request_id.length === 0) return null;
    return {
      type: 'agent_request',
      request_id: obj.request_id,
      config: parseSidecarConfig(obj.config),
    };
  }

  if (obj.type === 'stream_start') {
    if (typeof obj.request_id !== 'string' || obj.request_id.length === 0) return null;
    if (typeof obj.session_id !== 'string' || obj.session_id.length === 0) return null;
    return {
      type: 'stream_start',
      request_id: obj.request_id,
      session_id: obj.session_id,
      config: parseSidecarConfig(obj.config),
    };
  }

  if (obj.type === 'stream_message') {
    if (typeof obj.request_id !== 'string' || obj.request_id.length === 0) return null;
    if (typeof obj.session_id !== 'string' || obj.session_id.length === 0) return null;
    if (typeof obj.user_message !== 'string') return null;
    return {
      type: 'stream_message',
      request_id: obj.request_id,
      session_id: obj.session_id,
      user_message: obj.user_message,
    };
  }

  if (obj.type === 'stream_end') {
    if (typeof obj.session_id !== 'string' || obj.session_id.length === 0) return null;
    return { type: 'stream_end', session_id: obj.session_id };
  }

  return null;
}

