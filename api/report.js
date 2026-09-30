import { MongoClient } from 'mongodb';
let p;
async function db(){if(!process.env.MONGODB_URI)return null;if(!p)p=MongoClient.connect(process.env.MONGODB_URI);return (await p).db(process.env.MONGODB_DB||'streamhub');}
export default async function handler(req){
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const body=await req.json().catch(()=>({})); const d=await db();
 if(d) await d.collection('reports').insertOne({...body,createdAt:new Date()});
 return new Response(JSON.stringify({ok:true,saved:!!d}),{headers:{'content-type':'application/json'}});
}
