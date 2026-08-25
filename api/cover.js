import https from 'node:https';
import { requireEnv } from './_lib/utils.js';
import { telegramRequest } from './songs.js';

const TELEGRAM_FILE_BASE = 'https://api.telegram.org/file/bot';

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

async function getTelegramFilePath(token, fileId) {
  try {
    const result = await telegramRequest(token, 'getFile', { file_id: fileId });
    if (!result?.file_path) {
      throw new Error('Telegram did not return a downloadable file path.');
    }
    return result.file_path;
  } catch (error) {
    // Override 502/etc from telegramRequest to 404 for cover images
    error.statusCode = 404;
    throw error;
  }
}

function streamTelegramCover({ token, filePath }, res) {
  return new Promise((resolve, reject) => {
    const fileUrl = new URL(`${TELEGRAM_FILE_BASE}${token}/${filePath}`);
    const request = https.request(fileUrl, {
      method: 'GET'
    }, (telegramResponse) => {
      const headers = { ...telegramResponse.headers };
      headers['cache-control'] = 'public, max-age=604800, immutable';

      let contentType = 'image/jpeg';
      const lowerPath = filePath.toLowerCase();
      if (lowerPath.endsWith('.png')) {
        contentType = 'image/png';
      } else if (lowerPath.endsWith('.webp')) {
        contentType = 'image/webp';
      }
      headers['content-type'] = contentType;

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

    const filePath = await getTelegramFilePath(token, fileId);

    if (req.method === 'HEAD') {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.status(200).end();
    }

    await streamTelegramCover({
      token,
      filePath
    }, res);
  } catch (error) {
    if (!res.headersSent) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: error.message || 'Unable to stream cover image from Telegram.'
      });
    }

    res.destroy(error);
  }
}
