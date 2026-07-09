const { connectLambda, getStore } = require('@netlify/blobs');

// ---- Tweakable constants ----
const COOLDOWN_MS = 20 * 1000; // must match COOLDOWN_S in button/index.html
const RESET_WORD = 'resetfilm2026'; // change this, then reset via ?reset=<word>

const STORE_NAME = 'glitch-state';
const STATE_KEY = 'state';
const DEFAULT_STATE = { count: 0, lockedUntil: 0 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  connectLambda(event);
  const store = getStore(STORE_NAME);

  // Reset escape hatch for between screenings: /trigger?reset=SECRETWORD
  const resetParam = event.queryStringParameters && event.queryStringParameters.reset;
  if (resetParam === RESET_WORD) {
    await store.setJSON(STATE_KEY, DEFAULT_STATE);
    return json(200, DEFAULT_STATE);
  }

  if (event.httpMethod === 'GET') {
    const state = (await store.get(STATE_KEY, { type: 'json' })) || DEFAULT_STATE;
    return json(200, state);
  }

  if (event.httpMethod === 'POST') {
    const state = (await store.get(STATE_KEY, { type: 'json' })) || DEFAULT_STATE;
    const now = Date.now();

    if (now < state.lockedUntil) {
      const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
      return json(429, {
        error: 'locked',
        remainingSeconds,
        count: state.count,
        lockedUntil: state.lockedUntil,
      });
    }

    const next = { count: state.count + 1, lockedUntil: now + COOLDOWN_MS };
    await store.setJSON(STATE_KEY, next);
    return json(200, next);
  }

  return json(405, { error: 'method not allowed' });
};
