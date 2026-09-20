export async function getCatalogFromStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    // Perform both Upstash GET requests in parallel to avoid sequential network round-trips
    const [catalogResponse, offsetResponse] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(["GET", "murex:catalog"])
      }),
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(["GET", "murex:offset"])
      })
    ]);

    if (!catalogResponse.ok) {
      throw new Error(`status ${catalogResponse.status}`);
    }
    if (!offsetResponse.ok) {
      throw new Error(`status ${offsetResponse.status}`);
    }

    const [catalogData, offsetData] = await Promise.all([
      catalogResponse.json(),
      offsetResponse.json()
    ]);

    if (catalogData.error) {
      const err = new Error(`murex:catalog read failed: ${catalogData.error}`);
      err.statusCode = 503;
      throw err;
    }
    if (offsetData.error) {
      const err = new Error(`murex:offset read failed: ${offsetData.error}`);
      err.statusCode = 503;
      throw err;
    }

    const catalog = catalogData.result ? JSON.parse(catalogData.result) : [];
    const offset = offsetData.result ? parseInt(offsetData.result, 10) : 0;

    return { catalog, offset };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw new Error(`Upstash request failed: ${error.message}`);
  }
}

export async function getLastRefreshTime() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return 0;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["GET", "murex:refresh:lastrun"])
    });

    if (!response.ok) return 0;

    const data = await response.json().catch(() => null);
    if (!data || data.error) return 0;

    return data.result ? parseInt(data.result, 10) : 0;
  } catch (error) {
    console.warn('Failed to read murex:refresh:lastrun:', error.message);
    return 0;
  }
}

export async function setLastRefreshTime(timestamp) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["SET", "murex:refresh:lastrun", String(timestamp)])
    });

    if (!response.ok) return;

    const data = await response.json().catch(() => null);
    if (data?.error) {
      console.warn('Failed to write murex:refresh:lastrun:', data.error);
    }
  } catch (error) {
    console.warn('Failed to write murex:refresh:lastrun:', error.message);
  }
}

export async function saveCatalogToStore(catalog, offset) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    // Perform both Upstash SET requests in parallel to avoid sequential network round-trips
    const [catalogResponse, offsetResponse] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(["SET", "murex:catalog", JSON.stringify(catalog)])
      }),
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(["SET", "murex:offset", String(offset)])
      })
    ]);

    if (!catalogResponse.ok) {
      throw new Error(`status ${catalogResponse.status}`);
    }
    if (!offsetResponse.ok) {
      throw new Error(`status ${offsetResponse.status}`);
    }

    const [catalogData, offsetData] = await Promise.all([
      catalogResponse.json(),
      offsetResponse.json()
    ]);

    if (catalogData.error) {
      const err = new Error(`murex:catalog write failed: ${catalogData.error}`);
      err.statusCode = 503;
      throw err;
    }
    if (offsetData.error) {
      const err = new Error(`murex:offset write failed: ${offsetData.error}`);
      err.statusCode = 503;
      throw err;
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw new Error(`Upstash request failed: ${error.message}`);
  }
}
