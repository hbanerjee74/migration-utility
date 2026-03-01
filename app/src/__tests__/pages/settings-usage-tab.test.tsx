import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import UsageTab from '../../routes/settings/usage-tab';
import { mockInvoke, resetTauriMocks } from '../../test/mocks/tauri';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | null = null;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve: (value: T) => resolve?.(value) };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/usage']}>
      <UsageTab />
    </MemoryRouter>,
  );
}

describe('UsageTab (Settings)', () => {
  beforeEach(() => {
    resetTauriMocks();
  });

  it('keeps newest expanded run detail visible when run-detail responses return out of order', async () => {
    const user = userEvent.setup();
    const runADetail = deferred<unknown>();
    const runBDetail = deferred<unknown>();

    mockInvoke.mockImplementation((cmd: string, args?: { runId?: string }) => {
      if (cmd === 'usage_get_summary') {
        return Promise.resolve({
          totalRuns: 2,
          completedRuns: 2,
          failedRuns: 0,
          totalCostUsd: 0.0456,
          totalInputTokens: 123,
          totalOutputTokens: 456,
        });
      }
      if (cmd === 'usage_list_runs') {
        return Promise.resolve([
          {
            runId: 'agent-11111111-1111-1111-1111-111111111111',
            transcriptPath: '/tmp/agent-a.jsonl',
            startedAt: '2026-02-28T00:00:00Z',
            completedAt: '2026-02-28T00:01:00Z',
            status: 'completed',
            model: 'claude',
            totalCostUsd: 0.0123,
            inputTokens: 10,
            outputTokens: 20,
            toolsUsed: [],
            skillsLoaded: [],
            preview: 'Run A',
          },
          {
            runId: 'agent-22222222-2222-2222-2222-222222222222',
            transcriptPath: '/tmp/agent-b.jsonl',
            startedAt: '2026-02-28T00:02:00Z',
            completedAt: '2026-02-28T00:03:00Z',
            status: 'completed',
            model: 'claude',
            totalCostUsd: 0.0333,
            inputTokens: 30,
            outputTokens: 40,
            toolsUsed: [],
            skillsLoaded: [],
            preview: 'Run B',
          },
        ]);
      }
      if (cmd === 'usage_get_run_detail' && args?.runId === 'agent-11111111-1111-1111-1111-111111111111') {
        return runADetail.promise;
      }
      if (cmd === 'usage_get_run_detail' && args?.runId === 'agent-22222222-2222-2222-2222-222222222222') {
        return runBDetail.promise;
      }
      return Promise.reject(new Error(`Unmocked command: ${cmd}`));
    });

    renderPage();

    const runAButton = await screen.findByRole('button', {
      name: /agent-11111111-1111-1111-1111-111111111111/,
    });
    const runBButton = await screen.findByRole('button', {
      name: /agent-22222222-2222-2222-2222-222222222222/,
    });

    await user.click(runAButton);
    await user.click(runBButton);

    runBDetail.resolve({
      run: {
        runId: 'agent-22222222-2222-2222-2222-222222222222',
        transcriptPath: '/tmp/agent-b.jsonl',
        startedAt: '2026-02-28T00:02:00Z',
        completedAt: '2026-02-28T00:03:00Z',
        status: 'completed',
        model: 'claude',
        totalCostUsd: 0.0333,
        inputTokens: 30,
        outputTokens: 40,
        toolsUsed: [],
        skillsLoaded: [],
        preview: 'Run B',
      },
      events: [{ eventType: 'agent_response', label: 'Assistant', content: 'detail from run B', timestampMs: null }],
    });

    await waitFor(() => {
      expect(screen.getByText('detail from run B')).toBeInTheDocument();
    });

    runADetail.resolve({
      run: {
        runId: 'agent-11111111-1111-1111-1111-111111111111',
        transcriptPath: '/tmp/agent-a.jsonl',
        startedAt: '2026-02-28T00:00:00Z',
        completedAt: '2026-02-28T00:01:00Z',
        status: 'completed',
        model: 'claude',
        totalCostUsd: 0.0123,
        inputTokens: 10,
        outputTokens: 20,
        toolsUsed: [],
        skillsLoaded: [],
        preview: 'Run A',
      },
      events: [{ eventType: 'agent_response', label: 'Assistant', content: 'detail from run A', timestampMs: null }],
    });

    await waitFor(() => {
      expect(screen.getByText('detail from run B')).toBeInTheDocument();
      expect(screen.queryByText('detail from run A')).not.toBeInTheDocument();
    });
  });
});
