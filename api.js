import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));

app.use("/api", (req, res, next) => {
    const origin = req.get("Origin");
    const isLocalOrigin = origin === "null" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

    if (isLocalOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.sendStatus(204);
    }

    next();
});

app.get("/", (_req, res) => res.sendFile("spacehub.html", { root }));
app.get("/style.css", (_req, res) => res.sendFile("style.css", { root }));
app.get("/script.js", (_req, res) => res.sendFile("script.js", { root }));

let cache = {data: null, time: 0 };
const TTL = 10 * 60 * 1000;

app.get("/api/launches", async (_req, res) => {
    try {
        if (cache.data && Date.now() - cache.time < TTL) {
            return res.json(cache.data)
        }
        const headers = {};
        if (process.env.LL2_API_KEY) {
            headers.Authorization = `Token ${process.env.LL2_API_KEY}` 
        }
        const r = await fetch ( 
            "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20",
            { headers }
        );
        if (!r.ok){
            if (cache.data?.results?.some(launch => Date.parse(launch.net) > Date.now())) {
                return res.json(cache.data);
            }
            const error = r.status === 429
                ? "Launch provider rate limit reached. Try again later or configure LL2_API_KEY."
                : `Launch provider returned ${r.status}`;
            return res.status(r.status).json({ error });
        }

        const data = await r.json();
        if (!Array.isArray(data.results)) throw new Error("Unexpected response from launch provider");
        cache = { data, time: Date.now() };
        res.json(cache.data);
    } catch (err) {
        console.error("Could not fetch launch data:", err);
        res.status(500).json({ error: "Failed to fetch launches" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
