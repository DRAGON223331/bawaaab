import { getSession } from '../../../lib/session';

export default async function handler(req,res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({error:'يجب تسجيل الدخول أولاً.'});
  const path = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const guildId = path[0];
  if (!guildId) return res.status(400).json({error:'guildId مطلوب.'});
  const base = String(process.env.BOT_API_URL||'').replace(/\/$/,'');
  if (!base || !process.env.BOT_API_KEY) return res.status(500).json({error:'إعدادات اتصال البوت ناقصة في Vercel.'});
  const target = `${base}/api/dashboard/${path.map(encodeURIComponent).join('/')}`;
  const headers = {'X-Dashboard-API-Key':process.env.BOT_API_KEY,'X-Dashboard-User-ID':String(session.user.id)};
  if (req.method !== 'GET') headers['Content-Type']='application/json';
  const options={method:req.method,headers};
  if(req.method!=='GET' && req.method!=='HEAD') options.body=JSON.stringify(req.body||{});
  try {
    const r=await fetch(target,options); const text=await r.text();
    res.status(r.status).setHeader('Content-Type','application/json'); return res.send(text||'{}');
  } catch(e){ return res.status(502).json({error:`تعذر الاتصال بالبوت: ${e.message}`}); }
}
