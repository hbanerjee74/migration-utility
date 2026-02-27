import type { AgentRequest, AgentError } from './protocol.ts';
import { writeLine } from './protocol.ts';

export async function handleAgentRequest(request: AgentRequest): Promise<void> {
  try {
    // Import SDK dynamically to allow mocking in tests
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const stream = query({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      model: request.model ?? 'claude-sonnet-4-6',
    });
    for await (const event of stream) {
      if (event.type === 'assistant' && event.message?.content) {
        const text = event.message.content
          .filter((b: {type: string}) => b.type === 'text')
          .map((b: {type: string; text: string}) => b.text)
          .join('');
        if (text) {
          writeLine({ type: 'agent_response', id: request.id, content: text, done: false });
        }
      }
    }
    writeLine({ type: 'agent_response', id: request.id, content: '', done: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[sidecar] agent_request ${request.id}: failed: ${error}`);
    writeLine({ type: 'agent_error', id: request.id, error } satisfies AgentError);
  }
}
