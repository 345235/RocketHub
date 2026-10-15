import { error, time } from "console";
import "dotenv/config";
import express from "express";
import path from "path";
import { Script } from "vm";

const app = express();
const root = process.cwd();

app.get("/", (_req, res) => res.sendFile(path.join(root, "spacehub.html")));
app.get("/style.css", (_req, res) => res.sendFile(path.join(root, "style.css")));
app.get("/script.js", (_req, res) => res.sendFile(path.join(root, "script.js")));

let cache = {data: null, time: 0 };
const TTL = 10 * 60 * 1000;

app.get("/api/launches", async (_req, res) => {
    try {
        if (cache.data && Data.now () -cache.time  < TTL) {
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
            return res.status(r.status).json({ error: "Launch API error" })
        }

        cache = { data: await r.json(), time: Date.now() };
        res.json(cache.data);
    } catch {
        res.status(500).json({ error: "Failed to fetch launches" });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
