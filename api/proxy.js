module.exports=async(req,res)=>{try{
const raw=(req.query&&req.query.url)||"";if(!raw)return res.status(400).send("Missing url");
let target;try{target=new URL(raw)}catch{return res.status(400).send("Invalid URL")}
if(!["http:","https:"].includes(target.protocol))return res.status(400).send("Only HTTP(S)");
const up=await fetch(target.href,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0","Accept":"*/*"}});
if(!up.ok)return res.status(up.status).send("Upstream HTTP "+up.status);
res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Cache-Control","no-store");
const ct=up.headers.get("content-type")||"",playlist=ct.toLowerCase().includes("mpegurl")||/\.m3u8(?:$|\?)/i.test(target.href);
if(!playlist){res.setHeader("Content-Type",ct||"application/octet-stream");return res.status(200).send(Buffer.from(await up.arrayBuffer()))}
let text=await up.text(),base=up.url||target.href;
text=text.replace(/URI="([^"]+)"/g,(_,u)=>`URI="/api/proxy?url=${encodeURIComponent(new URL(u,base).href)}"`);
text=text.split(/\r?\n/).map(line=>{let x=line.trim();if(!x||x.startsWith("#"))return line;try{return "/api/proxy?url="+encodeURIComponent(new URL(x,base).href)}catch{return line}}).join("\n");
res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");return res.status(200).send(text);
}catch(e){return res.status(502).send("Proxy failed: "+(e.message||"unknown"))}};