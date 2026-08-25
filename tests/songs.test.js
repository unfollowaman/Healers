import test from 'node:test';
import assert from 'node:assert';
import { normalizeChannelId } from '../api/songs.js';

test('normalizeChannelId', (t) => {
  assert.strictEqual(normalizeChannelId(''), '');
  assert.strictEqual(normalizeChannelId('  '), '');
  assert.strictEqual(normalizeChannelId(null), '');
  assert.strictEqual(normalizeChannelId(undefined), '');
  assert.strictEqual(normalizeChannelId(123), '123');
  assert.strictEqual(normalizeChannelId(' 123 '), '123');
  assert.strictEqual(normalizeChannelId('-1001234567890'), '-1001234567890');
  assert.strictEqual(normalizeChannelId(' -1001234567890  '), '-1001234567890');
  assert.strictEqual(normalizeChannelId('@my_channel'), '@my_channel');
  assert.strictEqual(normalizeChannelId('  @my_channel '), '@my_channel');
});
