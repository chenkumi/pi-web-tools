import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssistantMessageEventStream, type Model, type AssistantMessage } from '@earendil-works/pi-ai';
// Deliberate version-pinned compatibility probe, not a runtime dependency on pi internals.
import { processResponsesStream } from '../../node_modules/@earendil-works/pi-ai/dist/api/openai-responses-shared.js';

test('pi 0.85.1 native annotation-only URLs are lost, explicit Markdown URLs survive', async () => {
  const model: Model<'openai-responses'> = {
    id: 'fixture', name: 'Fixture', provider: 'openai', api: 'openai-responses',
    baseUrl: 'https://api.openai.com/v1', reasoning: false, input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 4096,
  };
  const explicitUrl = 'https://explicit.example/source';
  const hiddenUrl = 'https://annotation-only.example/source';
  const message = { type: 'message', id: 'msg_test', role: 'assistant', status: 'completed', content: [{
    type: 'output_text', text: `Answer [source](${explicitUrl})`,
    annotations: [{ type: 'url_citation', url: hiddenUrl, title: 'Hidden source', start_index: 0, end_index: 6 }],
  }] };
  const hosted = { type: 'web_search_call', id: 'ws_test', status: 'completed', action: { type: 'search', queries: ['test'], sources: [{ type: 'url', url: hiddenUrl }] } };
  async function* events() {
    yield { type: 'response.output_item.added', output_index: 0, item: hosted };
    yield { type: 'response.output_item.done', output_index: 0, item: hosted };
    yield { type: 'response.output_item.done', output_index: 1, item: message };
    yield { type: 'response.completed', response: { id: 'resp_test', status: 'completed', output: [hosted, message] } };
  }
  const output: AssistantMessage = { role: 'assistant', api: model.api, provider: model.provider, model: model.id,
    content: [], stopReason: 'stop', timestamp: 0,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  };
  await processResponsesStream(events() as unknown as Parameters<typeof processResponsesStream>[0], output, createAssistantMessageEventStream(), model);
  assert.ok(JSON.stringify(output).includes(explicitUrl));
  assert.ok(!JSON.stringify(output).includes(hiddenUrl), 'If pi starts preserving annotations, update compatibility guidance and this probe.');
});
