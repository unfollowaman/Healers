import { getCatalogFromStore } from './_lib/catalogStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { catalog } = await getCatalogFromStore();

    let nonNullCount = 0;
    let nullCount = 0;
    let catalogSummary = [];
    let firstNonNullCoverFileId = null;

    for (const song of catalog) {
      catalogSummary.push({
        title: song.title,
        coverFileId: song.coverFileId
      });

      if (song.coverFileId) {
        nonNullCount++;
        if (!firstNonNullCoverFileId) {
          firstNonNullCoverFileId = song.coverFileId;
        }
      } else {
        nullCount++;
      }
    }

    let coverProbe = null;

    if (firstNonNullCoverFileId) {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const url = `${protocol}://${host}/api/cover?file_id=${firstNonNullCoverFileId}`;

      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      const first12BytesHex = Array.from(uint8Array.slice(0, 12))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');

      coverProbe = {
        statusCode: response.status,
        contentType: response.headers.get('content-type'),
        byteLength: buffer.byteLength,
        first12BytesHex: first12BytesHex
      };
    }

    return res.status(200).json({
      catalogSummary,
      nonNullCount,
      nullCount,
      coverProbe
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
