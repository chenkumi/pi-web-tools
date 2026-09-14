import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('real pi loader discovers package and switches tool registration in isolated HOME', { timeout: 60000 }, async () => {
  const home = await mkdtemp(join(tmpdir(), 'pi-web-package-test-'));
  try {
    await mkdir(join(home, '.pi', 'agent'), { recursive: true });
    for (const provider of ['openai', 'brave', 'exa']) {
      await writeFile(join(home, '.pi', 'agent', 'web_search.json'), JSON.stringify({ provider }));
      const expected = provider === 'openai' ? ['web_fetch'] : ['web_fetch', 'web_search'];
      const { stdout } = await exec(process.execPath, ['--import', import.meta.resolve('tsx'), join(root, 'tests/fixtures/load-package.ts'), root, JSON.stringify(expected)], {
        cwd: home, env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: join(home, '.pi', 'agent'), PI_OFFLINE: '1' }, timeout: 20000,
      });
      assert.ok(stdout.includes('"loaded":true'));
    }
  } finally { await rm(home, { recursive: true, force: true }); }
});
