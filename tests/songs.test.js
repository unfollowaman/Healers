import test from 'node:test';
import assert from 'node:assert';
import { normalizeChannelId, isExpectedChannel } from '../api/songs.js';

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

test('isExpectedChannel', (t) => {
  // Returns true when expectedChannelId is not set / empty / whitespace
  assert.strictEqual(isExpectedChannel({ id: -100123 }, ''), true);
  assert.strictEqual(isExpectedChannel({ id: -100123 }, null), true);
  assert.strictEqual(isExpectedChannel({ id: -100123 }, undefined), true);
  assert.strictEqual(isExpectedChannel(null, ''), true);

  // Match by numeric chat id
  assert.strictEqual(isExpectedChannel({ id: -1001234567890 }, '-1001234567890'), true);
  assert.strictEqual(isExpectedChannel({ id: -1001234567890 }, ' -1001234567890 '), true);
  assert.strictEqual(isExpectedChannel({ id: '-1001234567890' }, '-1001234567890'), true);

  // Match by @username (case-insensitive)
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '@my_channel'), true);
  assert.strictEqual(isExpectedChannel({ username: 'MY_CHANNEL' }, '@my_channel'), true);
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '@MY_CHANNEL'), true);
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '  @my_channel  '), true);

  // Mismatches
  assert.strictEqual(isExpectedChannel({ id: -100123, username: 'other_channel' }, '-100999'), false);
  assert.strictEqual(isExpectedChannel({ id: -100123, username: 'other_channel' }, '@my_channel'), false);

  // Handles nullish or missing chat objects gracefully when expectedChannelId is present
  assert.strictEqual(isExpectedChannel(null, '-100123'), false);
  assert.strictEqual(isExpectedChannel(undefined, '-100123'), false);
  assert.strictEqual(isExpectedChannel({}, '-100123'), false);
});
