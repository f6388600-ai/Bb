/* Optional SQLite-in-browser layer. If sql.js/WASM is unavailable, localStorage remains the fallback. */
(() => {
  const LS='streamhub_db_v2';
  let SQL=null, db=null, ready=null;
  const fallback={channels:[],watch:[],favorites:[],hidden:[],settings:{autoplay:true,quality:'auto',category:'All',theme:'dark',language:'en',controls:true}};
  const loadFallback=()=>{try{return {...fallback,...JSON.parse(localStorage.getItem(LS)||'{}')}}catch{return {...fallback}}};
  let mem=loadFallback();
  const persist=()=>localStorage.setItem(LS,JSON.stringify(mem));
  async function init(){
    try{
      if(window.initSqlJs){SQL=await window.initSqlJs({locateFile:f=>'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/'+f});
        const saved=localStorage.getItem('streamhub_sqlite');
        db=saved?new SQL.Database(Uint8Array.from(atob(saved),c=>c.charCodeAt(0))):new SQL.Database();
        db.run(`CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT);`);
      }
    }catch(e){db=null}
    return true;
  }
  ready=init();
  function sqlGet(k,d){if(!db)return mem[k]??d; const r=db.exec('SELECT v FROM kv WHERE k=?',[k]);return r[0]?.values?.[0]?.[0] ? JSON.parse(r[0].values[0][0]) : d}
  function sqlSet(k,v){if(!db){mem[k]=v;persist();return}db.run('INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)',[k,JSON.stringify(v)]);const bytes=db.export();let s='';for(const b of bytes)s+=String.fromCharCode(b);localStorage.setItem('streamhub_sqlite',btoa(s))}
  window.TVDB={ready,async get(k,d){await ready;return sqlGet(k,d)},async set(k,v){await ready;sqlSet(k,v);return v},async clear(){await ready;mem={...fallback};persist();if(db){db.run('DELETE FROM kv');localStorage.removeItem('streamhub_sqlite')}}};
})();
