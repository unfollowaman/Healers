export default async function handler(req, res) {
  // 1. Check authorization
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Perform lightweight Upstash write
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Missing UPSTASH credentials');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["SET", "murex:keepalive", timestamp])
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      const err = new Error(`murex:keepalive write failed: ${data.error}`);
      err.statusCode = 503;
      err.detail = data.error;
      throw err;
    }

    return res.status(200).json({ ok: true, key: "murex:keepalive", timestamp });
  } catch (error) {
    console.error('Error handling /api/cron/keepalive request:', error);
    if (error.statusCode === 503) {
      return res.status(503).json({
        error: 'Upstash keepalive failed',
        detail: error.detail
      });
    }

    return res.status(500).json({
      error: error.message || 'Internal server error during keepalive.'
    });
  }
}
