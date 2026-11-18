export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

export function validateFileId(fileId) {
  if (!fileId || typeof fileId !== 'string') {
    const error = new Error('Missing required file_id query parameter.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^[\w-]{10,512}$/.test(fileId)) {
    const error = new Error('Invalid file_id query parameter.');
    error.statusCode = 400;
    throw error;
  }
}
