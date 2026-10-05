const crypto = require('crypto');
function b64(v){return Buffer.from(v).toString('base64url')}
function sign(v){return crypto.createHmac('sha256',process.env.DASHBOARD_SESSION_SECRET||'change-this-secret').update(v).digest('base64url')}
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {username,password}=req.body||{};
  if(String(username||'')!==(process.env.DASHBOARD_USERNAME||'admin') || String(password||'')!==(process.env.DASHBOARD_PASSWORD||'')) return res.status(401).json({error:'بيانات الدخول غير صحيحة'});
  const payload=b64(JSON.stringify({u:username,exp:Date.now()+86400000}));
  const cookie=`tower_admin=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
  res.setHeader('Set-Cookie',cookie);
  res.json({ok:true});
};
