// Vercel Node.js Serverless Function (CommonJS)
module.exports = async (req, res) => {
  try {
    const raw = (req.query && req.query.url) || "";
    if (!raw) return res.status(400).send("Missing url query parameter");

    let target;
    try { target = new URL(raw); } catch { return res.status(400).send("Invalid URL"); }
    if (!["http:", "https:"].includes(target.protocol)) {
      return res.status(400).send("Only HTTP(S) URLs are supported");
    }

    const upstream = await fetch(target.href, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream returned HTTP ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") || "";
    const looksLikePlaylist =
      contentType.toLowerCase().includes("mpegurl") ||
      /\.m3u8(?:$|\?)/i.test(target.href);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    if (!looksLikePlaylist) {
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      const data = Buffer.from(await upstream.arrayBuffer());
      return res.status(200).send(data);
    }

    let playlist = await upstream.text();
    const base = upstream.url || target.href;

    // Rewrite URI="..." attributes used by keys, maps and alternate renditions.
    playlist = playlist.replace(/URI="([^"]+)"/g, (_match, uri) => {
      const absolute = new URL(uri, base).href;
      return `URI="/api/proxy?url=${encodeURIComponent(absolute)}"`;
    });

    // Rewrite child playlists and media segment URLs.
    playlist = playlist.split(/\r?\n/).map(line => {
      const value = line.trim();
      if (!value || value.startsWith("#")) return line;
      try {
        const absolute = new URL(value, base).href;
        return `/api/proxy?url=${encodeURIComponent(absolute)}`;
      } catch {
        return line;
      }
    }).join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.status(200).send(playlist);
  } catch (err) {
    return res.status(502).send("Proxy request failed: " + (err && err.message ? err.message : "unknown error"));
  }
};
