export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/launches") {
      return getLaunches(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function getLaunches(request, env, ctx ) {
  try {
    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) return hit;


    const headers = {};
    if (env.LL2_API_KEY) headers.Authorization = `Token ${env.LL2_API_KEY}`;

    const r = await fetch (
      "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20&mode=detailed",
      { headers, cf: {cacheTtl: 600, cacheEverything: true } }
    );
    if (!r.ok){
      const body = await r.text ();
      return Response.json(
        { error: "Launch API error", status: r.status, detail: body.slice(0, 300) },
        { status: r.status }
      );
    }
 
  const res = new Response(r.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600",
    },
  });
  ctx.waitUntil(cache.put(request, res.clone()));
  return res; 
} catch (err) {
  return Response.json (
    { error: "Worker crashed", detail: String(err) },
    { status: 500 }
  );
 }
}
  

