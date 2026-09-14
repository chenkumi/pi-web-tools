import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { clip, toolOutput, MAX_INLINE_BYTES, MAX_INLINE_LINES } from '../../src/output.ts';

test('Unicode byte clipping and terminal control cleanup', async () => {
  assert.equal(clip('中😀文', 7, 10), '中😀');
  assert.equal(clip('a\nb\nc', 100, 2), 'a\nb');
  assert.equal((await toolOutput('a\u001b[31mb')).content[0]?.text, 'a[31mb');
});
test('long output is bounded including notice, full content private and readable', async () => {
  const text = ('中😀text\n').repeat(5000);
  const result = await toolOutput(text);
  assert.ok(result.details.truncated);
  assert.ok(result.details.fullOutputPath);
  try {
    assert.ok(Buffer.byteLength(result.content[0]!.text) <= MAX_INLINE_BYTES);
    assert.ok(result.content[0]!.text.split('\n').length <= MAX_INLINE_LINES);
    assert.equal(await readFile(result.details.fullOutputPath!, 'utf8'), text);
    assert.equal((await stat(result.details.fullOutputPath!)).mode & 0o777, 0o600);
  } finally { await rm(dirname(result.details.fullOutputPath!), { recursive: true }); }
});
