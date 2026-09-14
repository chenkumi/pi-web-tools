import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const temp = await mkdtemp(join(tmpdir(), 'pi-web-production-'));
try {
  const { stdout } = await exec('npm', ['pack', '--json', '--pack-destination', temp], { cwd: root, timeout: 30000 });
  const filename = JSON.parse(stdout)[0].filename;
  const home = join(temp, 'home');
  await mkdir(home);
  const env = { ...process.env, HOME: home, USERPROFILE: home, PI_CODING_AGENT_DIR: join(home, '.pi/agent'), PI_OFFLINE: '1' };
  // No lifecycle scripts and no user/global package installation.
  await exec('npm', ['install', '--prefix', join(temp, 'app'), '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', join(temp, filename)], { env, timeout: 120000, maxBuffer: 1024 * 1024 });
  const loaded = await exec(process.execPath, ['--import', import.meta.resolve('tsx'), join(root, 'tests/fixtures/load-package.ts'), join(temp, 'app/node_modules/pi-web-tools'), '["web_fetch"]'], { cwd: home, env, timeout: 30000 });
  console.log('Production tarball install and isolated pi lazy-import smoke PASS');
  console.log(loaded.stdout.trim());
} finally { await rm(temp, { recursive: true, force: true }); }
