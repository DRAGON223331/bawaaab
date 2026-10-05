module.exports=(req,res)=>{res.setHeader('Set-Cookie','tower_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true});};
