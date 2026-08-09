// Cloudflare Worker: per-post like counter backed by Workers KV.
//
// Routes:
//   GET  /api/likes/:slug            -> { slug, count }
//   POST /api/likes/:slug            -> body { action: "like" | "unlike" } -> { slug, count }
//
// Bind a KV namespace named LIKES to this Worker (see wrangler.toml).

const ALLOWED_ORIGINS = [
  'https://navid72m.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const match = url.pathname.match(/^\/api\/likes\/([a-zA-Z0-9\-_]{1,128})\/?$/);
    if (!match) {
      return json({ error: 'not found' }, 404, cors);
    }
    const slug = match[1];
    const key = `likes:${slug}`;

    if (request.method === 'GET') {
      const raw = await env.LIKES.get(key);
      const count = raw ? parseInt(raw, 10) : 0;
      return json({ slug, count }, 200, cors);
    }

    if (request.method === 'POST') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        // no/invalid body -> default to "like"
      }
      const action = body.action === 'unlike' ? 'unlike' : 'like';

      const raw = await env.LIKES.get(key);
      let count = raw ? parseInt(raw, 10) : 0;
      count = action === 'like' ? count + 1 : Math.max(0, count - 1);

      await env.LIKES.put(key, String(count));
      return json({ slug, count }, 200, cors);
    }

    return json({ error: 'method not allowed' }, 405, cors);
  },
};
