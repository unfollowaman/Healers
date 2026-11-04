import { Readable, Transform } from 'node:stream';
import { requireEnv } from './_lib/utils.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const TELEGRAM_FILE_BASE = 'https://api.telegram.org/file/bot';

const FILE_PATH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const filePathCache = new Map(); // file_id -> { filePath, fetchedAt }

export function clearFilePathCache() {
  filePathCache.clear();
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url, options = {}, retries = 1, delayMs = 300) {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await sleep(delayMs);
        continue;
      }
      return response;
    } catch (err) {
      if (options.signal?.aborted) {
        throw err;
      }
      if (attempt < retries) {
        attempt++;
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
}

export async function getTelegramFile(token, fileId, signal) {
  const url = new URL(`${TELEGRAM_API_BASE}${token}/getFile`);
  url.searchParams.set('file_id', fileId);

  let response;
  try {
    response = await fetchWithRetry(url, {
      signal,
      headers: {
        Accept: 'application/json'
      }
    }, 1, 300);
  } catch (err) {
    if (signal?.aborted) {
      const abortError = new Error('Request aborted');
      abortError.statusCode = 499;
      abortError.isAborted = true;
      throw abortError;
    }
    const netError = new Error('Upstream network failure.');
    netError.statusCode = 502;
    netError.errorCode = 'upstream_failed';
    throw netError;
  }

  const body = await response.json().catch(() => null);

  if (response.status === 429) {
    const retryAfter = body?.parameters?.retry_after || 5;
    const error = new Error(body?.description || 'Telegram rate limit exceeded.');
    error.statusCode = 503;
    error.retryAfter = retryAfter;
    throw error;
  }

  if (response.status === 400) {
    const error = new Error(body?.description || 'File not found or invalid file_id.');
    error.statusCode = 404;
    error.errorCode = 'not_found';
    throw error;
  }

  if (!response.ok || !body?.ok) {
    const error = new Error(body?.description || 'Unable to resolve Telegram file.');
    error.statusCode = response.status || 502;
    if (response.status >= 500) {
      error.errorCode = 'upstream_failed';
    }
    throw error;
  }

  if (!body.result?.file_path) {
    const error = new Error('Telegram did not return a downloadable file path.');
    error.statusCode = 502;
    error.errorCode = 'upstream_failed';
    throw error;
  }

  return body.result;
}

export async function resolveTelegramFilePath(token, fileId, signal) {
  const now = Date.now();
  const cached = filePathCache.get(fileId);
  if (cached && (now - cached.fetchedAt) < FILE_PATH_CACHE_TTL_MS) {
    return cached.filePath;
  }

  const file = await getTelegramFile(token, fileId, signal);
  filePathCache.set(fileId, {
    filePath: file.file_path,
    fetchedAt: now
  });
  return file.file_path;
}

export function parseRangeHeader(rangeHeader, totalLength) {
  if (!rangeHeader || typeof rangeHeader !== 'string') return null;
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return { invalid: true };

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return { invalid: true };

  let start = startStr ? parseInt(startStr, 10) : undefined;
  let end = endStr ? parseInt(endStr, 10) : undefined;

  if (startStr && Number.isNaN(start)) return { invalid: true };
  if (endStr && Number.isNaN(end)) return { invalid: true };

  if (start === undefined) {
    const suffix = end;
    if (suffix <= 0) return { invalid: true };
    if (totalLength !== undefined && totalLength !== null) {
      if (suffix > totalLength) {
        start = 0;
      } else {
        start = totalLength - suffix;
      }
      end = totalLength - 1;
    }
  } else if (end === undefined) {
    if (totalLength !== undefined && totalLength !== null) {
      end = totalLength - 1;
    }
  } else {
    if (start > end) return { invalid: true };
  }

  if (totalLength !== undefined && totalLength !== null) {
    if (start >= totalLength) {
      return { unsatisfiable: true };
    }
    if (end >= totalLength) {
      end = totalLength - 1;
    }
  }

  return { start, end };
}

export function getAudioContentType(upstreamType, filePath) {
  if (upstreamType && upstreamType.toLowerCase().startsWith('audio/')) {
    return upstreamType;
  }

  const lower = (filePath || '').toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.wav')) return 'audio/wav';

  return 'audio/mpeg';
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const startTime = Date.now();
  let firstByteTime = null;
  let bytesSent = 0;
  let outcome = 'ok';
  let upstreamStatus = 0;
  let didRetry = false;

  const fileId = req.query?.file_id;
  const rawRange = req.headers.range;
  const fileIdSuffix = (typeof fileId === 'string' && fileId.length >= 6)
    ? fileId.slice(-6)
    : (fileId || 'unknown');

  const logOutcome = () => {
    const rangeVal = rawRange || 'none';
    const ttFirstByte = firstByteTime !== null ? (firstByteTime - startTime) : 0;
    const finalOutcome = didRetry && outcome === 'ok' ? 'retry' : outcome;
    console.log(`${fileIdSuffix} ${rangeVal} ${upstreamStatus} ${ttFirstByte}ms ${bytesSent}B ${finalOutcome}`);
  };

  const abortController = new AbortController();
  let clientDisconnected = false;

  const onClose = () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      outcome = 'aborted';
      abortController.abort();
    }
  };
  if (typeof req.on === 'function') {
    req.on('close', onClose);
  }

  try {
    const token = requireEnv('TELEGRAM_BOT_TOKEN');
    validateFileId(fileId);

    let filePath = await resolveTelegramFilePath(token, fileId, abortController.signal);

    const makeDownloadRequest = async (path) => {
      const fileUrl = new URL(`${TELEGRAM_FILE_BASE}${token}/${path}`);
      const headers = {};
      if (rawRange) {
        headers.Range = rawRange;
      }
      return await fetchWithRetry(fileUrl, {
        method: 'GET',
        headers: Object.keys(headers).length ? headers : undefined,
        signal: abortController.signal
      }, 1, 300);
    };

    let downloadResponse;
    try {
      downloadResponse = await makeDownloadRequest(filePath);
    } catch (err) {
      if (abortController.signal.aborted || clientDisconnected) {
        outcome = 'aborted';
        logOutcome();
        return;
      }
      throw err;
    }

    if ([401, 403, 404].includes(downloadResponse.status)) {
      filePathCache.delete(fileId);
      didRetry = true;
      try {
        const freshFile = await getTelegramFile(token, fileId, abortController.signal);
        filePath = freshFile.file_path;
        filePathCache.set(fileId, {
          filePath,
          fetchedAt: Date.now()
        });
        downloadResponse = await makeDownloadRequest(filePath);
      } catch (retryErr) {
        if (abortController.signal.aborted || clientDisconnected) {
          outcome = 'aborted';
          logOutcome();
          return;
        }
        throw retryErr;
      }
    }

    upstreamStatus = downloadResponse.status;

    if (downloadResponse.status === 429) {
      const retryHeader = downloadResponse.headers.get('retry-after');
      const retrySec = retryHeader ? parseInt(retryHeader, 10) : 5;
      res.setHeader('Retry-After', retrySec);
      outcome = 'error';
      logOutcome();
      return res.status(503).json({ error: 'rate_limited' });
    }

    if (downloadResponse.status >= 500) {
      outcome = 'error';
      logOutcome();
      return res.status(502).json({ error: 'upstream_failed' });
    }

    if (!downloadResponse.ok && downloadResponse.status !== 206) {
      outcome = 'error';
      logOutcome();
      return res.status(downloadResponse.status).json({ error: 'upstream_failed' });
    }

    const contentType = getAudioContentType(downloadResponse.headers.get('content-type'), filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    if (req.method === 'HEAD') {
      const len = downloadResponse.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);
      logOutcome();
      return res.status(downloadResponse.status === 206 ? 206 : 200).end();
    }

    if (downloadResponse.status === 206) {
      const contentRange = downloadResponse.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const len = downloadResponse.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);

      res.status(206);

      const nodeStream = Readable.fromWeb(downloadResponse.body);
      nodeStream.on('data', (chunk) => {
        if (firstByteTime === null) firstByteTime = Date.now();
        bytesSent += chunk.length;
      });

      nodeStream.on('error', () => {
        if (clientDisconnected || abortController.signal.aborted) {
          outcome = 'aborted';
        } else {
          outcome = 'error';
        }
      });

      await new Promise((resolve, reject) => {
        nodeStream.pipe(res);
        res.on('finish', resolve);
        res.on('close', resolve);
        res.on('error', reject);
      });

      logOutcome();
      return;
    }

    // Upstream returned 200
    const rawTotalLen = downloadResponse.headers.get('content-length');
    const totalLength = rawTotalLen ? parseInt(rawTotalLen, 10) : undefined;

    if (rawRange) {
      const parsedRange = parseRangeHeader(rawRange, totalLength);

      if (parsedRange?.invalid || parsedRange?.unsatisfiable) {
        res.setHeader('Content-Range', `bytes */${totalLength !== undefined ? totalLength : '*'}`);
        outcome = 'error';
        logOutcome();
        return res.status(416).end();
      }

      const { start = 0, end = (totalLength !== undefined ? totalLength - 1 : undefined) } = parsedRange;

      if (end !== undefined) {
        const sliceLength = end - start + 1;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength !== undefined ? totalLength : '*'}`);
        res.setHeader('Content-Length', sliceLength);
      }

      res.status(206);

      let currentOffset = 0;
      const sliceTransform = new Transform({
        transform(chunk, encoding, callback) {
          const chunkStart = currentOffset;
          const chunkEnd = currentOffset + chunk.length - 1;
          currentOffset += chunk.length;

          if (chunkEnd < start) {
            return callback();
          }
          if (end !== undefined && chunkStart > end) {
            return callback();
          }

          const sliceFrom = Math.max(0, start - chunkStart);
          const sliceTo = end !== undefined
            ? Math.min(chunk.length, end - chunkStart + 1)
            : chunk.length;

          if (sliceFrom < sliceTo) {
            const sub = chunk.subarray(sliceFrom, sliceTo);
            this.push(sub);
          }

          if (end !== undefined && currentOffset > end) {
            this.push(null);
          }
          callback();
        }
      });

      const nodeStream = Readable.fromWeb(downloadResponse.body);
      nodeStream.on('data', () => {
        if (firstByteTime === null) firstByteTime = Date.now();
      });

      sliceTransform.on('data', (chunk) => {
        if (firstByteTime === null) firstByteTime = Date.now();
        bytesSent += chunk.length;
      });

      await new Promise((resolve, reject) => {
        nodeStream.pipe(sliceTransform).pipe(res);
        res.on('finish', resolve);
        res.on('close', resolve);
        res.on('error', reject);
      });

      logOutcome();
      return;
    }

    // No Range header, upstream answered 200
    if (totalLength !== undefined) {
      res.setHeader('Content-Length', totalLength);
    }
    res.status(200);

    const nodeStream = Readable.fromWeb(downloadResponse.body);
    nodeStream.on('data', (chunk) => {
      if (firstByteTime === null) firstByteTime = Date.now();
      bytesSent += chunk.length;
    });

    await new Promise((resolve, reject) => {
      nodeStream.pipe(res);
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
    });

    logOutcome();
  } catch (error) {
    if (clientDisconnected || abortController.signal.aborted || error.isAborted) {
      outcome = 'aborted';
      logOutcome();
      return;
    }

    outcome = 'error';
    logOutcome();

    if (!res.headersSent) {
      if (error.statusCode === 503) {
        if (error.retryAfter) {
          res.setHeader('Retry-After', error.retryAfter);
        }
        return res.status(503).json({ error: 'rate_limited' });
      }

      if (error.errorCode === 'not_found' || error.statusCode === 404) {
        return res.status(404).json({ error: 'not_found' });
      }

      if (error.errorCode === 'upstream_failed' || error.statusCode === 502) {
        return res.status(502).json({ error: 'upstream_failed' });
      }

      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: error.message || 'Unable to stream audio from Telegram.'
      });
    }

    res.destroy(error);
  } finally {
    if (typeof req.off === 'function') {
      req.off('close', onClose);
    }
  }
}
