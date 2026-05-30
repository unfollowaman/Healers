import https from 'node:https';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const TELEGRAM_FILE_BASE = 'https://api.telegram.org/file/bot';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function validateFileId(fileId) {
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

async function getTelegramFile(token, fileId) {
  const url = new URL(`${TELEGRAM_API_BASE}${token}/getFile`);
  url.searchParams.set('file_id', fileId);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    const error = new Error(body?.description || 'Unable to resolve Telegram file.');
    error.statusCode = response.status || 502;
    throw error;
  }

  if (!body.result?.file_path) {
    const error = new Error('Telegram did not return a downloadable file path.');
    error.statusCode = 502;
    throw error;
  }

  return body.result;
}

function streamTelegramFile({ token, filePath, range }, res) {
  return new Promise((resolve, reject) => {
    const fileUrl = new URL(`${TELEGRAM_FILE_BASE}${token}/${filePath}`);
    const request = https.request(fileUrl, {
      method: 'GET',
      headers: range ? { Range: range } : undefined
    }, (telegramResponse) => {
      const headers = { ...telegramResponse.headers };
      headers['cache-control'] = 'private, max-age=3600';
      headers['accept-ranges'] = headers['accept-ranges'] || 'bytes';
      headers['content-type'] = headers['content-type'] || 'audio/mpeg';

      delete headers['set-cookie'];
      delete headers['content-security-policy'];

      res.writeHead(telegramResponse.statusCode || 200, headers);
      telegramResponse.pipe(res);
      telegramResponse.on('end', resolve);
    });

    request.on('error', reject);
    request.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const token = requireEnv('TELEGRAM_BOT_TOKEN');
    const fileId = req.query?.file_id;
    validateFileId(fileId);

    const file = await getTelegramFile(token, fileId);

    if (req.method === 'HEAD') {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.status(200).end();
    }

    await streamTelegramFile({
      token,
      filePath: file.file_path,
      range: req.headers.range
    }, res);
  } catch (error) {
    if (!res.headersSent) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: error.message || 'Unable to stream audio from Telegram.'
      });
    }

    res.destroy(error);
  }
}
