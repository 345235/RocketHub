// server.ts
import "dotenv/config";
import express from "express";

const app = express();

let cache: { data: unknown; time: number } = { data: null, time: 0 };
const TTL = 10 * 60 * 1000; // 10 minutes

app.get("/api/launches", async (_req, res) => {
  try {
    if (cache.data && Date.now() - cache.time < TTL) {
      return res.json(cache.data);
    }

    const headers: Record<string, string> = {};
    if (process.env.LL2_API_KEY) {
      headers.Authorization = `Token ${process.env.LL2_API_KEY}`;
    }

    const r = await fetch(
      "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20",
      { headers }
    );

    if (!r.ok) {
      return res.status(r.status).json({ error: "Launch API error" });
    }

    cache = { data: await r.json(), time: Date.now() };
    res.json(cache.data);
  } catch {
    res.status(500).json({ error: "Failed to fetch launches" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));