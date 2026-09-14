import assert from 'node:assert/strict';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { DefaultResourceLoader, SettingsManager, type ExtensionContext } from '@earendil-works/pi-coding-agent';

const root = process.argv[2]!;
const expected = JSON.parse(process.argv[3]!) as string[];
const loader = new DefaultResourceLoader({
  cwd: process.cwd(), agentDir: join(homedir(), '.pi', 'agent'),
  settingsManager: SettingsManager.inMemory(),
  noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true,
  additionalExtensionPaths: [root],
});
await loader.reload();
const loaded = loader.getExtensions();
assert.deepEqual(loaded.errors, []);
assert.equal(loaded.extensions.length, 1);
const extension = loaded.extensions[0]!;
assert.deepEqual([...extension.tools.keys()], expected);
assert.ok(extension.handlers.has('session_shutdown'));
assert.ok(extension.commands.has('web-tools'));
// Exercise the real loader's lazy transitive imports without launching a browser.
await assert.rejects(extension.tools.get('web_fetch')!.definition.execute('smoke', { url: 'http://127.0.0.1/' }, undefined, undefined, {} as ExtensionContext), /NETWORK_BLOCKED/);
for (const handler of extension.handlers.get('session_shutdown') ?? []) await (handler as Function)({ type: 'session_shutdown', reason: 'quit' }, {});
console.log(JSON.stringify({ loaded: true, tools: [...extension.tools.keys()] }));
