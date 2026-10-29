export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const headers = {};
  if (env.LL2_API_KEY) headers.Authorization = `Token ${env.LL2_API_KEY}`;

  const r = await fetch(
    "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20",
    { headers }
  );
  if (!r.ok) {
    return Response.json({ error: "Launch API error" }, { status: r.status });
  }

  const res = new Response(r.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600",
    },
  });
  waitUntil(cache.put(request, res.clone()));
  return res;
}