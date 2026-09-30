const ALLOWED_HOSTS = new Set([
  "livetv.akr4m.com"
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range,Content-Type,Origin,Accept",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type"
  };
}

function proxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function rewriteUriAttributes(line, baseUrl) {
  return line.replace(/URI=("([^"]+)"|'([^']+)')/gi, (full, quoted, dq, sq) => {
    const value = dq ?? sq;
    try {
      const absolute = new URL(value, baseUrl).toString();
      return `URI="${proxyUrl(absolute)}"`;
    } catch {
      return full;
    }
  });
}

function rewriteManifest(text, baseUrl) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) return rewriteUriAttributes(line, baseUrl);
      try {
        const absolute = new URL(trimmed, baseUrl).toString();
        return proxyUrl(absolute);
      } catch {
        return line;
      }
    })
    .join("\n");
}

function contentTypeLooksLikeManifest(type, url) {
  const t = String(type || "").toLowerCase();
  return t.includes("mpegurl") || t.includes("vnd.apple.mpegurl") || /\.m3u8(?:$|[?#])/i.test(url);
}

module.exports = async (req, res) => {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw) return res.status(400).json({ error: "Missing url" });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return res.status(400).json({ error: "Unsupported protocol" });
  }

  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return res.status(403).json({ error: "Upstream host is not allowed" });
  }

  const upstreamHeaders = {
    "User-Agent": "Mozilla/5.0 StreamHub/VercelProxy",
    "Accept": "*/*"
  };

  if (req.headers.range) upstreamHeaders.Range = req.headers.range;
  if (req.headers["if-none-match"]) upstreamHeaders["If-None-Match"] = req.headers["if-none-match"];
  if (req.headers["if-modified-since"]) upstreamHeaders["If-Modified-Since"] = req.headers["if-modified-since"];

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: upstreamHeaders,
      redirect: "follow"
    });

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    res.status(upstream.status);
    res.setHeader("Content-Type", contentTypeLooksLikeManifest(type, target.href) ? "application/vnd.apple.mpegurl; charset=utf-8" : type);
    res.setHeader("Cache-Control", "no-store, max-age=0");

    for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    if (req.method === "HEAD") return res.end();

    if (contentTypeLooksLikeManifest(type, target.href)) {
      const text = await upstream.text();
      return res.send(rewriteManifest(text, target.toString()));
    }

    if (!upstream.body) return res.end();

    const reader = upstream.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
    return res.send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(502).json({ error: "Upstream stream could not be reached" });
  }
};
