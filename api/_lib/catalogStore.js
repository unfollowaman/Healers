export async function getCatalogFromStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const catalogResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["GET", "murex:catalog"])
    });

    if (!catalogResponse.ok) {
      throw new Error(`status ${catalogResponse.status}`);
    }

    const catalogData = await catalogResponse.json();
    if (catalogData.error) {
      throw new Error(`murex:catalog read failed: ${catalogData.error}`);
    }

    const offsetResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["GET", "murex:offset"])
    });

    if (!offsetResponse.ok) {
      throw new Error(`status ${offsetResponse.status}`);
    }

    const offsetData = await offsetResponse.json();
    if (offsetData.error) {
      throw new Error(`murex:offset read failed: ${offsetData.error}`);
    }

    const catalog = catalogData.result ? JSON.parse(catalogData.result) : [];
    const offset = offsetData.result ? parseInt(offsetData.result, 10) : 0;

    return { catalog, offset };
  } catch (error) {
    throw new Error(`Upstash request failed: ${error.message}`);
  }
}

export async function saveCatalogToStore(catalog, offset) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const catalogResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["SET", "murex:catalog", JSON.stringify(catalog)])
    });

    if (!catalogResponse.ok) {
      throw new Error(`status ${catalogResponse.status}`);
    }
    const catalogData = await catalogResponse.json();
    if (catalogData.error) {
      throw new Error(`murex:catalog write failed: ${catalogData.error}`);
    }

    const offsetResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["SET", "murex:offset", String(offset)])
    });

    if (!offsetResponse.ok) {
      throw new Error(`status ${offsetResponse.status}`);
    }
    const offsetData = await offsetResponse.json();
    if (offsetData.error) {
      throw new Error(`murex:offset write failed: ${offsetData.error}`);
    }
  } catch (error) {
    throw new Error(`Upstash request failed: ${error.message}`);
  }
}
