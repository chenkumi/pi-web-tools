import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { defaults } from '../../src/config.ts';
import { registerWebTools } from '../../src/index.ts';

function harness(provider: 'openai' | 'brave' | 'exa' = 'openai', enabled = true) {
  const tools: string[] = [];
  const hooks = new Map<string, Function>();
  const commands = new Map<string, unknown>();
  const config = defaults(); config.provider = provider; config.enabled = enabled;
  const pi = { getActiveTools() { return tools; }, registerTool(t: { name: string }) { tools.push(t.name); }, on(name: string, fn: Function) { hooks.set(name, fn); }, registerCommand(name: string, command: unknown) { commands.set(name, command); } } as unknown as ExtensionAPI;
  registerWebTools(pi, () => config);
  return { tools, hooks, commands };
}
test('OpenAI only registers web_fetch; Brave/Exa register local search', () => {
  assert.deepEqual(harness().tools, ['web_fetch']);
  for (const provider of ['brave', 'exa'] as const) assert.deepEqual(harness(provider).tools, ['web_fetch', 'web_search']);
  assert.deepEqual(harness('brave', false).tools, ['web_fetch']);
});
test('native hook restricted by model and mode, guidance matches capability', () => {
  const native = harness();
  const context = { model: { api: 'openai-responses', provider: 'openai' } };
  const event = { payload: { tools: [] } };
  const output = native.hooks.get('before_provider_request')!(event, context);
  assert.deepEqual(output.tools, [{ type: 'web_search' }]);
  assert.deepEqual(event.payload.tools, []);
  assert.ok(native.hooks.get('before_agent_start')!({ systemPrompt: 'Original' }, context).systemPrompt.startsWith('Original'));
  assert.equal(native.hooks.get('before_provider_request')!(event, { model: { api: 'anthropic-messages', provider: 'anthropic' } }), undefined);
  assert.equal(harness('brave').hooks.get('before_provider_request')!(event, context), undefined);
  assert.equal(harness('openai', false).hooks.get('before_provider_request')!(event, context), undefined);
});
test('conflict explicitly aborts even when the runner swallows hook errors', () => {
  const native = harness();
  native.tools.push('web_search');
  const abort = new AbortController();
  const ctx = { model: { api: 'openai-responses', provider: 'openai' }, abort: () => abort.abort() };
  assert.equal(native.hooks.get('before_agent_start')!({ systemPrompt: 'Original' }, ctx), undefined);
  const payload = { tools: [{ type: 'function', name: 'web_search' }] };
  // Actual pi 0.85.1 runner catches/logs hook errors and retains the old payload.
  try { native.hooks.get('before_provider_request')!({ payload }, ctx); } catch { /* runner logs error */ }
  assert.equal(abort.signal.aborted, true);
  assert.equal(payload.tools[0]?.type, 'function');
});
test('shutdown before any fetch does not need a browser', async () => {
  await harness().hooks.get('session_shutdown')!({}, {});
});
