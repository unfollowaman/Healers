import test from 'node:test';
import assert from 'node:assert';
import { validateFileId } from '../api/stream.js';

test('validateFileId - valid file IDs', (t) => {
  // Valid alphanumeric and hyphenated strings between 10 and 512 characters
  assert.doesNotThrow(() => validateFileId('1234567890'));
  assert.doesNotThrow(() => validateFileId('A_valid_telegram_file_id-1234567890'));
  assert.doesNotThrow(() => validateFileId('a'.repeat(10)));
  assert.doesNotThrow(() => validateFileId('a'.repeat(512)));
});

test('validateFileId - missing or non-string file IDs', (t) => {
  const invalidInputs = [
    null,
    undefined,
    '',
    1234567890,
    {},
    [],
    true,
    false
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => validateFileId(input),
      (err) => {
        assert.strictEqual(err.message, 'Missing required file_id query parameter.');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});

test('validateFileId - invalid string formats or lengths', (t) => {
  const invalidStrings = [
    'short',               // Less than 10 chars (length 5)
    '123456789',           // 9 chars
    'a'.repeat(513),       // More than 512 chars
    'invalid file id!',    // Contains spaces and exclamation mark
    'file_id_with_$pecial',// Contains disallowed symbol $
    'file_id/with/slash',  // Contains slashes
    'file_id_with.dot'     // Contains dots
  ];

  for (const str of invalidStrings) {
    assert.throws(
      () => validateFileId(str),
      (err) => {
        assert.strictEqual(err.message, 'Invalid file_id query parameter.');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});
