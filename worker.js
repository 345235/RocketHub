export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/launches") {
      return getLaunches(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function getLaunches(request, env, ctx) {
  try {
    const cache = caches.default;
    const origin = new URL(request.url).origin;
    const freshKey = new Request(`${origin}/__cache/launches-fresh`);
    const staleKey = new Request(`${origin}/__cache/launches-stale`);

    const fresh = await cache.match(freshKey);
    if (fresh) return fresh;

    const headers = {};
    if (env.LL2_API_KEY) headers.Authorization = `Token ${env.LL2_API_KEY}`;

    const r = await fetch(
      "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20",
      { headers }
    );

    if (r.ok) {
      const body = await r.text();
      const json = { "Content-Type": "application/json" };
      ctx.waitUntil(
        Promise.all([
          cache.put(freshKey, new Response(body, {
            headers: { ...json, "Cache-Control": "public, max-age=600" },
          })),
          cache.put(staleKey, new Response(body, {
            headers: { ...json, "Cache-Control": "public, max-age=86400" },
          })),
        ])
      );
      return new Response(body, { headers: json });
    }

    const stale = await cache.match(staleKey);
    if (stale) {
      const body = await stale.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", "X-Data-Stale": "true" },
      });
    }

    const detail = (await r.text()).slice(0, 300);
    return Response.json(
      { error: "Launch API error", status: r.status, detail },
      { status: r.status }
    );
  } catch (err) {
    return Response.json(
      { error: "Worker crashed", detail: String(err) },
      { status: 500 }
    );
  }
}