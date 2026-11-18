import test from 'node:test';
import assert from 'node:assert';
import { requireEnv, validateFileId } from '../api/_lib/utils.js';

test('requireEnv - returns environment variable when present', (t) => {
  const original = process.env.TEST_VAR_PRESENT;
  try {
    process.env.TEST_VAR_PRESENT = 'secret_value';
    assert.strictEqual(requireEnv('TEST_VAR_PRESENT'), 'secret_value');
  } finally {
    if (original !== undefined) {
      process.env.TEST_VAR_PRESENT = original;
    } else {
      delete process.env.TEST_VAR_PRESENT;
    }
  }
});

test('requireEnv - throws 500 when environment variable is missing or empty', (t) => {
  assert.throws(
    () => requireEnv('NON_EXISTENT_VAR_NAME_XYZ'),
    (err) => {
      assert.strictEqual(err.statusCode, 500);
      assert.match(err.message, /NON_EXISTENT_VAR_NAME_XYZ is not configured/);
      return true;
    }
  );

  const original = process.env.TEST_EMPTY_VAR;
  try {
    process.env.TEST_EMPTY_VAR = '';
    assert.throws(
      () => requireEnv('TEST_EMPTY_VAR'),
      (err) => {
        assert.strictEqual(err.statusCode, 500);
        return true;
      }
    );
  } finally {
    if (original !== undefined) {
      process.env.TEST_EMPTY_VAR = original;
    } else {
      delete process.env.TEST_EMPTY_VAR;
    }
  }
});

test('validateFileId - accepts valid alphanumeric and hyphenated strings (10-512 chars)', (t) => {
  assert.doesNotThrow(() => validateFileId('1234567890'));
  assert.doesNotThrow(() => validateFileId('abc_123-XYZ_456'));
  assert.doesNotThrow(() => validateFileId('a'.repeat(10)));
  assert.doesNotThrow(() => validateFileId('b'.repeat(512)));
});

test('validateFileId - throws 400 for missing, non-string, or empty file IDs', (t) => {
  const invalid = [null, undefined, '', 1234567890, {}, [], true, false];
  for (const item of invalid) {
    assert.throws(
      () => validateFileId(item),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Missing required file_id query parameter/);
        return true;
      }
    );
  }
});

test('validateFileId - throws 400 for invalid formats or out-of-range lengths', (t) => {
  const invalidStrings = [
    'short',
    'a'.repeat(9),
    'a'.repeat(513),
    'has spaces in it!',
    'file$id#special',
    '../../../etc/passwd'
  ];

  for (const str of invalidStrings) {
    assert.throws(
      () => validateFileId(str),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Invalid file_id query parameter/);
        return true;
      }
    );
  }
});
