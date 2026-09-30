const ALLOWED_HOSTS = new Set(["livetv.akr4m.com"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Range,Content-Type,Origin,Accept",
  "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type"
};

function proxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function isManifest(type, url) {
  const t = String(type || "").toLowerCase();
  return t.includes("mpegurl") || t.includes("vnd.apple.mpegurl") || /\.m3u8(?:$|[?#])/i.test(url);
}

function rewriteManifest(text, baseUrl) {
  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI=("([^"]+)"|'([^']+)')/gi, (full, quoted, dq, sq) => {
        try { return `URI="${proxyUrl(new URL(dq ?? sq, baseUrl).toString())}"`; }
        catch { return full; }
      });
    }
    try { return proxyUrl(new URL(trimmed, baseUrl).toString()); }
    catch { return line; }
  }).join("\n");
}

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: cors });

  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400, headers: cors });

  let target;
  try { target = new URL(raw); } catch { return new Response("Invalid url", { status: 400, headers: cors }); }
  if (!/^https?:$/.test(target.protocol)) return new Response("Unsupported protocol", { status: 400, headers: cors });
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) return new Response("Upstream host is not allowed", { status: 403, headers: cors });

  const h = new Headers({
    "User-Agent": "Mozilla/5.0 StreamHub/fast",
    "Accept": "*/*"
  });
  const range = req.headers.get("range");
  if (range) h.set("Range", range);
  const inm = req.headers.get("if-none-match");
  if (inm) h.set("If-None-Match", inm);

  try {
    const upstream = await fetch(target, { method: req.method, headers: h, redirect: "follow", cache: "no-store" });
    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const manifest = isManifest(type, target.href);
    const out = new Headers(cors);
    out.set("Content-Type", manifest ? "application/vnd.apple.mpegurl; charset=utf-8" : type);
    out.set("Cache-Control", manifest ? "public, s-maxage=1, stale-while-revalidate=2" : "public, s-maxage=8, max-age=2, stale-while-revalidate=15");
    for (const n of ["content-length","content-range","accept-ranges","etag","last-modified"]) {
      const v = upstream.headers.get(n); if (v) out.set(n, v);
    }
    if (req.method === "HEAD") return new Response(null, { status: upstream.status, headers: out });
    if (manifest) {
      const text = await upstream.text();
      return new Response(rewriteManifest(text, target.toString()), { status: upstream.status, headers: out });
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (e) {
    console.error(e);
    return new Response("Upstream stream could not be reached", { status: 502, headers: cors });
  }
}
