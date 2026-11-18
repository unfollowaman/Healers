const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function telegramRequest(token, method, params = {}) {
  const url = new URL(`${TELEGRAM_API_BASE}${token}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const description = body?.description || `Telegram API request failed with status ${response.status}.`;
    const error = new Error(description);
    error.statusCode = response.status || 502;
    throw error;
  }

  return body.result;
}
