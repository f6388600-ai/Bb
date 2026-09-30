(() => {
  "use strict";
  const builtin = [
    { id:"bd-tv-27", name:"BD TV", category:"Bangla", logo:"https://i.imgur.com/WpMA9kC.png", url:"http://livetv.akr4m.com:8080/bdtv/restrem/27.m3u8", type:"hls" }
  ];
  const state = { channels: [], filtered: [], category:"All", homeCategory:"All", search:"", sort:"default", current:null, hls:null, dash:null, theme:localStorage.getItem("iptv_theme")||"dark", watched:readJson("streamhub_watched",[]), popular:readJson("streamhub_popular",{}) };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  function readJson(key,fallback){ try{const v=JSON.parse(localStorage.getItem(key)||"null");return v==null?fallback:v;}catch{return fallback;} }
  function saveActivity(){ localStorage.setItem("streamhub_watched",JSON.stringify(state.watched.slice(0,20))); localStorage.setItem("streamhub_popular",JSON.stringify(state.popular)); }
  function markWatched(c){ state.watched=[c.id,...state.watched.filter(id=>id!==c.id)].slice(0,20); state.popular[c.id]=(Number(state.popular[c.id])||0)+1; saveActivity(); }
  const initials = (n) => { const a=String(n||"TV").trim().split(/\s+/).filter(Boolean); return (a.length===1?a[0].slice(0,2):a[0][0]+a.at(-1)[0]).toUpperCase(); };
  function allChannels(){
    const external = Array.isArray(window.DEFAULT_CHANNELS)?window.DEFAULT_CHANNELS:[];
    const local = (()=>{try{const x=JSON.parse(localStorage.getItem("simple_iptv_channels")||"[]");return Array.isArray(x)?x:[]}catch{return []}})();
    const out=[]; for(const c of [...builtin,...external,...local]){ if(!c?.name||!c?.url) continue; const item={id:String(c.id||`${c.name}-${c.url}`),name:String(c.name),category:String(c.category||"Other"),logo:String(c.logo||""),url:String(c.url),type:String(c.type||"auto").toLowerCase()}; if(!out.some(x=>x.id===item.id||x.url===item.url)) out.push(item); } return out;
  }
  function detectType(c){ if(c.type!=="auto") return c.type; const u=c.url.toLowerCase().split(/[?#]/)[0]; if(/\.m3u8$/.test(u))return"hls"; if(/\.mpd$/.test(u))return"dash"; if(/\.(mp4|webm|ogg|ogv|m4v)$/.test(u))return"video"; if(/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|dai\.ly/.test(u))return"embed"; return /^https?:/.test(u)?"video":"embed"; }
  function playableUrl(c){ const type=detectType(c); if(type==="hls" && /^http:\/\//i.test(c.url) && new URL(c.url).hostname.toLowerCase()==="livetv.akr4m.com") return `/api/proxy?url=${encodeURIComponent(c.url)}`; return c.url; }
  function getId(){ return new URLSearchParams(location.search).get("id")||""; }
  function navigate(path){ history.pushState({},"",path); renderRoute(); }
  function renderRoute(){ const p=location.pathname.replace(/\/+$/,'')||"/home"; $$(".page").forEach(x=>x.classList.add("hidden")); if(p==="/channels"){ $("#channelsPage").classList.remove("hidden"); renderCategories(); applyFilters(); } else if(p==="/play"){ $("#playPage").classList.remove("hidden"); openById(getId()); } else { $("#homePage").classList.remove("hidden"); renderHome(); } window.scrollTo({top:0,behavior:"instant"}); }
  function card(c){ return `<article class="channel-card" data-id="${esc(c.id)}"><div class="logo-box">${c.logo?`<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:''}<span class="logo-fallback" style="${c.logo?'display:none':''}">${esc(initials(c.name))}</span><span class="live-badge">LIVE</span></div><div class="card-body"><div class="channel-name">${esc(c.name)}</div><div class="channel-meta"><span>${esc(c.category)}</span><span class="play-mini">▶</span></div></div></article>`; }
  function bindCards(root){ $$(root+" .channel-card").forEach(el=>el.onclick=()=>navigate(`/play?id=${encodeURIComponent(el.dataset.id)}`)); }
  const categoryEmoji = {
    Sports:"🏆", Sport:"🏆", News:"📰", Entertainment:"🍿", Movies:"🎬",
    Bangla:"🇧🇩", Religious:"🕌", Kids:"🧸", Music:"🎵", Live:"🔴"
  };
  function categoryIcon(name){ return categoryEmoji[name] || "📺"; }
  function categoryTitle(name){
    const titles={Sports:"Trending Sports",Sport:"Trending Sports",Bangla:"Bangladeshi Live TV",Entertainment:"Movies & Entertainment",News:"News Network",Religious:"Religious & Islamic",Music:"Music"};
    return titles[name] || name;
  }
  function seeAllHref(category){ return `/channels?category=${encodeURIComponent(category)}`; }
  function renderHome(){
    $("#homeCount").textContent=state.channels.length;
    const latest=state.watched.map(id=>state.channels.find(c=>c.id===id)).filter(Boolean).slice(0,8);
    $("#latestGrid").innerHTML=latest.length?latest.map(card).join(""):`<div class="empty-shelf">Watch a channel and it will appear here.</div>`;
    bindCards("#latestGrid");

    const popular=[...state.channels].sort((a,b)=>(Number(state.popular[b.id])||0)-(Number(state.popular[a.id])||0)||a.name.localeCompare(b.name)).slice(0,8);
    $("#popularGrid").innerHTML=popular.length?popular.map(card).join(""):empty();
    bindCards("#popularGrid");

    const categories=[...new Set(state.channels.map(c=>c.category).filter(Boolean))];
    $("#categoryShelves").innerHTML=categories.map(category=>{
      const list=state.channels.filter(c=>c.category===category).slice(0,12);
      return `<section class="home-shelf category-shelf">
        <div class="section-head shelf-head">
          <div><div class="eyebrow">CATEGORY</div><h2>${esc(categoryTitle(category))} ${categoryIcon(category)}</h2></div>
          <a class="see-all" href="${seeAllHref(category)}">See all <span>→</span></a>
        </div>
        <div class="channel-row">${list.map(card).join("")}</div>
      </section>`;
    }).join("");
    $$("#categoryShelves .channel-row").forEach(row=>bindCardsFor(row));
  }
  function bindCardsFor(root){
    root.querySelectorAll?.(".channel-card").forEach(el=>el.onclick=()=>navigate(`/play?id=${encodeURIComponent(el.dataset.id)}`));
  }
  function empty(){return `<div class="empty-state"><div class="empty-icon">📺</div><h3>No channels found</h3><p>Try another search or category.</p></div>`;}
  function renderCategories(){ const cats=["All",...new Set(state.channels.map(c=>c.category).filter(Boolean))]; $("#categoryRow").innerHTML=cats.map(c=>`<button class="category-btn ${state.category===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join(""); $$("#categoryRow .category-btn").forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCategories();applyFilters();}); }
  function applyFilters(){ let r=state.channels.filter(c=>(state.category==="All"||c.category===state.category)&&(!state.search||`${c.name} ${c.category}`.toLowerCase().includes(state.search.toLowerCase()))); if(state.sort==="az")r.sort((a,b)=>a.name.localeCompare(b.name)); if(state.sort==="category")r.sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)); state.filtered=r; $("#channelGrid").innerHTML=r.length?r.map(card).join(""):empty(); $("#resultCount").textContent=`${r.length} channel${r.length===1?'':'s'}`; bindCards("#channelGrid"); }
  function setTheme(){ document.documentElement.classList.toggle("light",state.theme==="light"); $("#themeBtn").textContent=state.theme==="dark"?"☀":"☾"; }
  function setup(){
    setTheme(); $("#themeBtn").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";localStorage.setItem("iptv_theme",state.theme);setTheme();};
    $("#randomBtn").onclick=()=>{const c=state.channels[Math.floor(Math.random()*state.channels.length)];if(c)navigate(`/play?id=${encodeURIComponent(c.id)}`)};
    $("#refreshBtn").onclick=()=>{state.channels=allChannels();renderCategories();applyFilters();renderHome();};
    $("#searchInput").oninput=e=>{state.search=e.target.value.trim();$("#searchWrap").classList.toggle("has-value",!!state.search); if(location.pathname==="/channels")applyFilters();};
    $("#clearSearch").onclick=()=>{$("#searchInput").value="";state.search="";$("#searchWrap").classList.remove("has-value");if(location.pathname==="/channels")applyFilters();};
    $$("[data-sort]").forEach(b=>b.onclick=()=>{$$("[data-sort]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.sort=b.dataset.sort;applyFilters();});
    window.addEventListener("popstate",renderRoute);
    $("#retryBtn").onclick=()=>state.current&&openById(state.current.id);
    state.channels=allChannels(); renderRoute();
  }
  function cleanup(){ if(state.hls){try{state.hls.destroy()}catch{} state.hls=null;} if(state.dash){try{state.dash.reset()}catch{} state.dash=null;} const v=$("#videoPlayer"); if(v){v.pause();v.removeAttribute("src");v.load();} const f=$("#embedPlayer"); if(f)f.src="about:blank"; }
  function loading(on,msg="Connecting to stream..."){ const x=$("#loadingOverlay"); x.classList.toggle("hidden",!on); const s=x.querySelector("span");if(s)s.textContent=msg; }
  function error(msg){loading(false);$("#errorText").textContent=msg;$("#errorOverlay").classList.remove("hidden");}
  function openById(id){ const c=state.channels.find(x=>x.id===id)||state.channels[0]; if(!c){$("#playTitle").textContent="Channel not found";return;} state.current=c; markWatched(c); $("#playTitle").textContent=c.name;$("#playMeta").textContent=`${c.category} • ${detectType(c).toUpperCase()}`;$("#playerCategory").textContent=c.category;$("#playerType").textContent=detectType(c).toUpperCase();$("#errorOverlay").classList.add("hidden");cleanup();loading(true); const t=detectType(c); if(t==="hls")return playHls(c);if(t==="dash")return playDash(c);if(t==="embed")return playEmbed(c);return playVideo(c); }
  function playHls(c){
    const v=$("#videoPlayer");v.style.display="block";$("#embedPlayer").style.display="none";const url=playableUrl(c);
    if(v.canPlayType("application/vnd.apple.mpegurl")){v.src=url;v.onloadedmetadata=()=>{loading(false);v.play().catch(()=>{})};v.onerror=()=>error("HLS stream could not be played. Check whether the source is online.");return;}
    if(!window.Hls?.isSupported()) return error("This browser does not support HLS playback.");
    const h=new Hls({enableWorker:true,lowLatencyMode:true,startLevel:0,capLevelToPlayerSize:true,backBufferLength:6,maxBufferLength:8,maxMaxBufferLength:16,liveSyncDurationCount:1,liveMaxLatencyDurationCount:2,maxLiveSyncPlaybackRate:1.5,manifestLoadingMaxRetry:1,fragLoadingMaxRetry:1,levelLoadingMaxRetry:1,initialLiveManifestSize:1,maxBufferHole:0.5});
    state.hls=h;h.loadSource(url);h.attachMedia(v);
    h.on(Hls.Events.MANIFEST_PARSED,()=>{loading(false);v.play().catch(()=>{})});
    h.on(Hls.Events.ERROR,(_,d)=>{if(!d.fatal)return;if(d.type===Hls.ErrorTypes.NETWORK_ERROR){try{h.startLoad(-1);return}catch{}}if(d.type===Hls.ErrorTypes.MEDIA_ERROR){try{h.recoverMediaError();return}catch{}}error("HLS playback failed. The stream may be offline or unavailable.");});
  }
  function playVideo(c){const v=$("#videoPlayer");v.style.display="block";$("#embedPlayer").style.display="none";v.src=playableUrl(c);v.onloadedmetadata=()=>{loading(false);v.play().catch(()=>{})};v.onerror=()=>error("This video cannot be played by the browser.");}
  function playDash(c){const v=$("#videoPlayer");v.style.display="block";$("#embedPlayer").style.display="none";if(!window.dashjs)return error("DASH player library is unavailable.");const p=dashjs.MediaPlayer().create();state.dash=p;p.initialize(v,playableUrl(c),true);p.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED,()=>loading(false));p.on(dashjs.MediaPlayer.events.ERROR,()=>error("DASH playback failed."));}
  function yt(u){try{const x=new URL(u);if(x.hostname.includes("youtu.be"))return x.pathname.slice(1);if(x.pathname==="/watch")return x.searchParams.get("v");const m=x.pathname.match(/\/(?:embed|shorts|live)\/([^/]+)/);return m?.[1]||null}catch{return null}}
  function playEmbed(c){const v=$("#videoPlayer"),f=$("#embedPlayer");v.style.display="none";f.style.display="block";let u=c.url,id=yt(u);if(id)u=`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;else{const vm=u.match(/vimeo\.com\/(?:video\/)?(\d+)/);const dm=u.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([\w]+)/);if(vm)u=`https://player.vimeo.com/video/${vm[1]}?autoplay=1`;else if(dm)u=`https://www.dailymotion.com/embed/video/${dm[1]}?autoplay=1`;}f.src=u;f.onload=()=>loading(false);}
  document.addEventListener("DOMContentLoaded",setup);
})();
