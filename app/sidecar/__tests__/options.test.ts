import { describe, expect, it } from 'vitest';
import { buildInitialPrompt, buildSessionOptions } from '../options.ts';
import type { SidecarConfig } from '../config.ts';

function makeConfig(overrides: Partial<SidecarConfig> = {}): SidecarConfig {
  return {
    prompt: 'translate this proc',
    apiKey: 'sk-ant-test',
    cwd: '/tmp/migration',
    model: 'claude-sonnet-4-6',
    ...overrides,
  };
}

describe('buildSessionOptions', () => {
  it('keeps project setting source and claude_code preset', () => {
    const options = buildSessionOptions(makeConfig());
    expect(options.settingSources).toEqual(['project']);
    expect(options.systemPrompt).toEqual({ type: 'preset', preset: 'claude_code' });
  });

  it('uses cwd and env api key', () => {
    const options = buildSessionOptions(makeConfig({ cwd: '/tmp/work', apiKey: 'sk-ant-2' }));
    expect(options.cwd).toBe('/tmp/work');
    expect((options.env ?? {}).ANTHROPIC_API_KEY).toBe('sk-ant-2');
  });
});

describe('buildInitialPrompt', () => {
  it('returns prompt as-is when no system prompt', () => {
    expect(buildInitialPrompt(makeConfig())).toBe('translate this proc');
  });

  it('prepends system prompt when provided', () => {
    expect(buildInitialPrompt(makeConfig({ systemPrompt: 'You are a dbt expert' }))).toBe(
      'You are a dbt expert\n\ntranslate this proc',
    );
  });
});

