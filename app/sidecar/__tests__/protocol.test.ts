import { describe, it, expect } from 'vitest';
import { parseLine, writeLine } from '../protocol.ts';

describe('parseLine', () => {
  it('parses a ping message', () => {
    const result = parseLine('{"type":"ping","id":"abc"}');
    expect(result).toEqual({ type: 'ping', id: 'abc' });
  });

  it('parses an agent_request', () => {
    const result = parseLine('{"type":"agent_request","id":"1","prompt":"hello"}');
    expect(result).toMatchObject({ type: 'agent_request', id: '1' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseLine('not json')).toBeNull();
  });

  it('returns null for missing type', () => {
    expect(parseLine('{"id":"1"}')).toBeNull();
  });
});
