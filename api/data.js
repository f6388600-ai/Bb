import { MongoClient } from 'mongodb';

let clientPromise;
async function getDb(){
  const uri=process.env.MONGODB_URI;
  if(!uri) return null;
  if(!clientPromise) clientPromise=MongoClient.connect(uri);
  const client=await clientPromise;
  return client.db(process.env.MONGODB_DB || 'streamhub');
}

export default async function handler(req){
  const db=await getDb();
  if(!db) return new Response(JSON.stringify({ok:true,mongo:false,channels:[]}),{headers:{'content-type':'application/json'}});
  const col=db.collection('channels');
  if(req.method==='GET'){
    const channels=await col.find({}).sort({name:1}).toArray();
    return new Response(JSON.stringify({ok:true,mongo:true,channels:channels.map(({_id,...c})=>c)}),{headers:{'content-type':'application/json'}});
  }
  if(req.method==='POST'){
    const key=req.headers.get('x-admin-key');
    if(!process.env.ADMIN_KEY || key!==process.env.ADMIN_KEY) return new Response('Unauthorized',{status:401});
    const body=await req.json();
    if(!Array.isArray(body.channels)) return new Response('channels must be an array',{status:400});
    await col.deleteMany({});
    if(body.channels.length) await col.insertMany(body.channels.map(c=>({...c,_id:String(c.id)})));
    return new Response(JSON.stringify({ok:true,mongo:true,count:body.channels.length}),{headers:{'content-type':'application/json'}});
  }
  return new Response('Method not allowed',{status:405});
}
