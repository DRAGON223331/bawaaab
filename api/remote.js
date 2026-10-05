const crypto=require('crypto');
function valid(req){
  const c=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('tower_admin='));
  if(!c)return false; const raw=c.slice('tower_admin='.length); const [p,s]=raw.split('.'); if(!p||!s)return false;
  const expected=crypto.createHmac('sha256',process.env.DASHBOARD_SESSION_SECRET||'change-this-secret').update(p).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return false;
  try{return JSON.parse(Buffer.from(p,'base64url').toString()).exp>Date.now()}catch{return false}
}
module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!valid(req))return res.status(401).json({error:'غير مسجل الدخول'});
  const base=String(process.env.BOT_DASHBOARD_URL||'').replace(/\/$/,'');
  const key=String(process.env.BOT_DASHBOARD_API_KEY||'');
  if(!base||!key)return res.status(500).json({error:'BOT_DASHBOARD_URL أو BOT_DASHBOARD_API_KEY غير مضبوط.'});
  const {path,method='GET',body}=req.body||{};
  if(!String(path||'').startsWith('/api/')||path==='/api/remote')return res.status(400).json({error:'مسار غير مسموح'});
  try{
    const r=await fetch(base+'/api/remote',{method:'POST',headers:{'content-type':'application/json','x-dashboard-api-key':key},body:JSON.stringify({path,method,body})});
    const text=await r.text(); res.status(r.status).setHeader('content-type',r.headers.get('content-type')||'application/json'); return res.send(text);
  }catch(e){return res.status(502).json({error:'تعذر الاتصال بالبوت: '+e.message})}
};
