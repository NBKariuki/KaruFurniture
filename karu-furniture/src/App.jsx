import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SB_URL = import.meta.env.VITE_SB_URL;
const SB_KEY = import.meta.env.VITE_SB_KEY;
const BUCKET = "product-images";
const ADMIN_PW = import.meta.env.VITE_ADMIN_PW;

const C = { navy:"#050A1F", mid:"#0A1128", light:"#0F1A3A", yellow:"#F5C000", white:"#FFFFFF", bg:"#F5F5F5", muted:"#8899AA", dark:"#556677", green:"#4CAF50", red:"#E85B5B" };
const AK = "karu-analytics-v3";
const catLabel = id => ({living:"Living Room",bedroom:"Bedroom",decor:"Decor & Flowers"}[id]||id);

const H = { "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" };
const sb = {
  get: async () => { const r = await fetch(`${SB_URL}/rest/v1/products?select=*&order=created_at.desc`,{headers:H}); if(!r.ok) throw new Error("fetch failed"); return r.json(); },
  post: async (d) => { const r = await fetch(`${SB_URL}/rest/v1/products`,{method:"POST",headers:H,body:JSON.stringify(d)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  patch: async (id,d) => { const r = await fetch(`${SB_URL}/rest/v1/products?id=eq.${id}`,{method:"PATCH",headers:H,body:JSON.stringify(d)}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  del: async (id) => { const r = await fetch(`${SB_URL}/rest/v1/products?id=eq.${id}`,{method:"DELETE",headers:H}); if(!r.ok) throw new Error("delete failed"); },
  upload: async (file) => {
    const name=`${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
    const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${name}`,{method:"POST",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":file.type},body:file});
    if(!r.ok) throw new Error("upload failed");
    return `${SB_URL}/storage/v1/object/public/${BUCKET}/${name}`;
  },
  delImg: async (url) => { const n=url.split(`/${BUCKET}/`)[1]; if(!n) return; await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${n}`,{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}}); }
};

const loadA = async () => { try { const r=await window.storage.get(AK); return r?JSON.parse(r.value):{}; } catch { return {}; } };
const saveA = async (d) => { try { await window.storage.set(AK,JSON.stringify(d)); } catch {} };

const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0} html{scroll-behavior:smooth} body{overflow-x:hidden} a{text-decoration:none;color:inherit}
    input,textarea,select{outline:none;font-family:'DM Sans',sans-serif} button{font-family:'DM Sans',sans-serif;cursor:pointer}
    .pc{transition:all 0.3s} .pc:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(245,192,0,0.15)!important}
    .cc{transition:all 0.3s} .cc:hover{border-color:#F5C000!important;transform:translateY(-3px)}
    .by{transition:all 0.2s} .by:hover{background:#E6B400!important;transform:translateY(-1px)}
    .bg{transition:all 0.2s} .bg:hover{border-color:#F5C000!important;color:#F5C000!important}
    .ar{transition:background 0.15s} .ar:hover{background:rgba(245,192,0,0.04)!important}
    @media(max-width:768px){.hg{grid-template-columns:1fr!important}.hv{display:none!important}.h1{font-size:56px!important}.cg{grid-template-columns:1fr!important}.ag{grid-template-columns:1fr!important}.rf{flex-direction:column!important}.ff{flex-direction:column!important}.sg{grid-template-columns:1fr 1fr!important}}
    @media(max-width:480px){.pg{grid-template-columns:1fr 1fr!important}.sg{grid-template-columns:1fr!important}}
  `}</style>
);

export default function App() {
  const [view, setView] = useState("consumer");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [cat, setCat] = useState("all");
  const [analytics, setAnalytics] = useState({});
  const [lc, setLc] = useState(0);
  const lt = useRef(null);

  useEffect(() => {
    Promise.all([
      sb.get().then(setProducts).catch(()=>{}),
      loadA().then(setAnalytics)
    ]).finally(()=>setLoading(false));
    loadA().then(a => {
      const today=new Date().toISOString().split("T")[0];
      const v=a.visits||{};
      const u={...a,visits:{...v,[today]:(v[today]||0)+1}};
      setAnalytics(u); saveA(u);
    });
  }, []);

  const track = useCallback((ev,key="global") => {
    setAnalytics(prev => {
      const b=prev[key]||{};
      const u={...prev,[key]:{...b,[ev]:(b[ev]||0)+1,last:Date.now()}};
      saveA(u); return u;
    });
  }, []);

  const handleLogo = () => {
    clearTimeout(lt.current);
    setLc(p => { const n=p+1; if(n>=5){setView("admin-login");return 0;} lt.current=setTimeout(()=>setLc(0),2500); return n; });
  };

  const wa = (p) => {
    track("whatsapp",p?p.id:"global");
    const m=p?`Hi KARU Furniture! I'm interested in the *${p.name}* (KSh ${Number(p.price).toLocaleString()}). Is it available?`:`Hi KARU Furniture! I'd like to see what's available.`;
    window.open(`https://wa.me/254720772866?text=${encodeURIComponent(m)}`,"_blank");
  };

  const reserve = (p) => {
    track("reserve",p.id);
    window.open(`https://wa.me/254720772866?text=${encodeURIComponent(`Hi KARU Furniture! I'd like to *RESERVE* the *${p.name}* (KSh ${Number(p.price).toLocaleString()}). Please confirm.`)}`,"_blank");
  };

  const filtered = cat==="all"?products:products.filter(p=>p.category===cat);

  if(view==="admin-login") return <AdminLogin onSuccess={()=>setView("admin")} onBack={()=>setView("consumer")} />;
  if(view==="admin") return <AdminDash products={products} analytics={analytics} setProducts={setProducts} onBack={()=>setView("consumer")} />;

  const Btn = ({children,onClick,yellow,style={}}) => (
    <button onClick={onClick} className={yellow?"by":"bg"} style={{background:yellow?C.yellow:"transparent",color:yellow?C.navy:C.white,border:yellow?"none":`1px solid rgba(255,255,255,0.25)`,padding:"14px 28px",borderRadius:4,fontSize:14,fontWeight:yellow?700:400,...style}}>{children}</button>
  );

  return (
    <>
    <GS/>
    {/* NAV */}
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(5,10,31,0.96)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(245,192,0,0.12)",height:64,display:"flex",alignItems:"center",padding:"0 32px"}}>
      <div style={{maxWidth:1200,margin:"0 auto",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:6,cursor:"pointer",userSelect:"none"}} onClick={handleLogo}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:C.yellow,letterSpacing:"0.1em"}}>KARU</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.white,letterSpacing:"0.2em",opacity:0.75}}>FURNITURE</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <a href="#cat" style={{color:C.muted,fontSize:13}}>Shop</a>
          <button className="by" onClick={()=>wa(null)} style={{background:C.yellow,color:C.navy,border:"none",padding:"8px 18px",borderRadius:4,fontSize:13,fontWeight:700}}>📞 0720 772 866</button>
        </div>
      </div>
    </nav>

    {/* HERO */}
    <section style={{minHeight:"100vh",background:C.navy,paddingTop:64,display:"flex",alignItems:"center"}}>
      <div className="hg" style={{maxWidth:1200,margin:"0 auto",padding:"60px 32px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center",width:"100%"}}>
        <div>
          <div style={{display:"inline-block",background:"rgba(245,192,0,0.1)",border:"1px solid rgba(245,192,0,0.25)",borderRadius:100,padding:"5px 14px",marginBottom:28}}>
            <span style={{color:C.yellow,fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>Now open in Gachie, Nairobi</span>
          </div>
          <h1 className="h1" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:82,lineHeight:0.95,color:C.white,letterSpacing:"0.02em",marginBottom:28}}>
            THE FURNITURE SHOP<br/>
            <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:64,letterSpacing:"-0.01em"}}>We </span><span style={{color:C.yellow}}>NEEDED</span>
          </h1>
          <p style={{color:"#9AAABB",fontSize:16,lineHeight:1.75,maxWidth:440,marginBottom:40,fontFamily:"'DM Sans',sans-serif"}}>
            Furnishing a home takes enough time and money. KARU makes the furniture part simple with guaranteed quality pieces, fair prices, right where you are.
          </p>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:48}}>
            <a href="#cat" className="by" style={{background:C.yellow,color:C.navy,padding:"14px 28px",borderRadius:4,fontSize:14,fontWeight:700,display:"inline-block",letterSpacing:"0.02em"}}>See What's In Stock</a>
            <button className="bg" onClick={()=>wa(null)} style={{background:"transparent",color:C.white,border:"1px solid rgba(255,255,255,0.2)",padding:"14px 28px",borderRadius:4,fontSize:14,letterSpacing:"0.02em"}}>Chat on WhatsApp</button>
          </div>
          <div style={{display:"flex",gap:32,flexWrap:"wrap",paddingTop:24,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            {[["Solid build quality","Every piece checked before it goes out"],["Honest pricing","What you see is what you pay"],["Right here","Gachie, off Kiambu Road"]].map(([title,sub])=>(
              <div key={title}>
                <div style={{color:C.white,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>{title}</div>
                <div style={{color:C.muted,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stacked category cards */}
        <div className="hv" style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          <div style={{position:"relative",width:340,height:420}}>
            {/* Back card bedroom */}
            <div style={{position:"absolute",top:0,right:0,width:270,height:170,background:C.mid,borderRadius:16,border:"1px solid #1A2A4A",padding:"22px 24px",transform:"rotate(4deg)",boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
              <div style={{color:C.muted,fontSize:10,letterSpacing:"0.15em",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>BEDROOM</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",color:C.white,fontSize:30,lineHeight:1.1,letterSpacing:"0.03em"}}>Beds &<br/>Wardrobes</div>
            </div>
            {/* Back card decor */}
            <div style={{position:"absolute",bottom:0,left:0,width:270,height:170,background:C.light,borderRadius:16,border:"1px solid rgba(245,192,0,0.15)",padding:"22px 24px",transform:"rotate(-3deg)",boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
              <div style={{color:C.muted,fontSize:10,letterSpacing:"0.15em",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>DECOR</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",color:C.white,fontSize:30,lineHeight:1.1,letterSpacing:"0.03em"}}>Flowers &<br/>Arrangements</div>
            </div>
            {/* Front card living room */}
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:280,height:170,background:`linear-gradient(135deg,#0A1A3A,#050A1F)`,borderRadius:16,border:"1px solid rgba(245,192,0,0.35)",padding:"22px 24px",zIndex:10,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
              <div style={{color:C.yellow,fontSize:10,letterSpacing:"0.15em",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>LIVING ROOM</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",color:C.white,fontSize:30,lineHeight:1.1,letterSpacing:"0.03em"}}>Sofas, Tables<br/>& More</div>
              <div style={{position:"absolute",bottom:20,right:20,width:32,height:32,borderRadius:"50%",background:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",color:C.navy,fontSize:13,fontWeight:700}}>›</div>
            </div>
            {/* Showroom badge */}
            <div style={{position:"absolute",top:-16,left:8,background:C.yellow,borderRadius:8,padding:"8px 14px",zIndex:20,boxShadow:"0 4px 16px rgba(245,192,0,0.3)"}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",color:C.navy,fontSize:11,fontWeight:700}}>📍 Gachie Showroom</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* CATEGORIES + PRODUCTS */}
    <section id="cat" style={{background:C.mid,padding:"80px 32px"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{color:C.yellow,fontSize:11,letterSpacing:"0.2em",marginBottom:12,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>What we carry</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:C.white,marginBottom:12,letterSpacing:"0.03em"}}>Shop by Room</h2>
        <p style={{color:C.muted,fontSize:15,fontFamily:"'DM Sans',sans-serif",marginBottom:40,maxWidth:480,lineHeight:1.6}}>Pick the room you're working on and we'll show you what's available.</p>
        <div className="cg" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginBottom:60}}>
          {[{id:"living",icon:"🛋️",label:"Living Room",sub:"Make the room you actually live in work for you."},{id:"bedroom",icon:"🛏️",label:"Bedroom",sub:"Sleep well. Start well."},{id:"decor",icon:"🌿",label:"Decor & Flowers",sub:"The finishing touches that make a house feel like yours."}].map(c=>(
            <div key={c.id} className="cc" style={{background:C.navy,border:`1px solid ${cat===c.id?C.yellow:"#1A2A4A"}`,borderRadius:10,padding:"32px 28px",position:"relative"}}
              onClick={()=>{setCat(c.id);track("click",`cat_${c.id}`);}}>
              <div style={{fontSize:40,marginBottom:18}}>{c.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:C.white,marginBottom:8,letterSpacing:"0.03em"}}>{c.label}</div>
              <div style={{color:C.muted,fontSize:13,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>{c.sub}</div>
              <div style={{position:"absolute",top:28,right:28,color:C.yellow,fontSize:18}}>›</div>
            </div>
          ))}
        </div>

        {/* PRODUCT GRID */}
        <div style={{borderTop:"1px solid #1A2A4A",paddingTop:48}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32,flexWrap:"wrap",gap:16}}>
            <div style={{color:C.yellow,fontSize:11,letterSpacing:"0.25em",textTransform:"uppercase"}}>THE COLLECTION</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{id:"all",label:"All"},{id:"living",label:"Living Room"},{id:"bedroom",label:"Bedroom"},{id:"decor",label:"Decor"}].map(c=>(
                <button key={c.id} onClick={()=>{setCat(c.id);track("click",`cat_${c.id}`);}}
                  style={{padding:"7px 16px",background:cat===c.id?C.yellow:"transparent",border:`1px solid ${cat===c.id?C.yellow:"#2A3A5A"}`,borderRadius:100,color:cat===c.id?C.navy:C.muted,fontSize:12,fontWeight:cat===c.id?700:400}}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {loading?(
            <div style={{textAlign:"center",padding:"60px 0",color:C.muted,fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>Getting things ready...</div>
          ):filtered.length===0?(
            <div style={{padding:"48px 0",maxWidth:400}}>
              <div style={{color:C.white,fontSize:17,fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:10}}>We're still loading up the showroom.</div>
              <div style={{color:C.muted,fontSize:14,fontFamily:"'DM Sans',sans-serif",lineHeight:1.7,marginBottom:24}}>Come back soon. WhatsApp us and we'll tell you what's available right now.</div>
              <button className="by" onClick={()=>wa(null)} style={{background:C.yellow,color:C.navy,border:"none",padding:"12px 24px",borderRadius:4,fontSize:14,fontWeight:700}}>Ask What's Available</button>
            </div>
          ):(
            <div className="pg" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:20}}>
              {filtered.map(p=>(
                <div key={p.id} className="pc" onClick={()=>{setSel(p);track("view",p.id);}} style={{background:C.navy,borderRadius:10,overflow:"hidden",border:"1px solid #1A2A4A"}}>
                  <div style={{height:190,background:`linear-gradient(135deg,${C.light},${C.navy})`,position:"relative",overflow:"hidden"}}>
                    {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      :<div style={{width:"100%",height:"100%",display:"flex",justifyContent:"center",alignItems:"center",fontSize:64}}>🪑</div>}
                    {p.badge&&<div style={{position:"absolute",top:10,left:10,background:C.yellow,color:C.navy,padding:"3px 10px",borderRadius:100,fontSize:10,fontWeight:700}}>{p.badge}</div>}
                    {p.original_price&&p.original_price>p.price&&<div style={{position:"absolute",top:p.badge?34:10,left:10,background:C.red,color:C.white,padding:"3px 10px",borderRadius:100,fontSize:10,fontWeight:700}}>-{Math.round((1-p.price/p.original_price)*100)}% OFF</div>}
                    <div style={{position:"absolute",top:10,right:10,background:p.status==="In Stock"?"rgba(76,175,80,0.2)":"rgba(232,91,91,0.2)",color:p.status==="In Stock"?C.green:C.red,padding:"3px 10px",borderRadius:100,fontSize:10}}>
                      {p.status==="In Stock"?"✓ In Stock":"✕ "+p.status}
                    </div>
                  </div>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{color:C.yellow,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:4}}>{catLabel(p.category)}</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.white,marginBottom:8,lineHeight:1.3}}>{p.name}</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.yellow}}>KSh {Number(p.price).toLocaleString()}</div>
                      {p.original_price&&p.original_price>p.price&&<div style={{fontSize:12,color:C.muted,textDecoration:"line-through"}}>KSh {Number(p.original_price).toLocaleString()}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>

    {/* RESERVE */}
    <section style={{background:`linear-gradient(135deg,${C.navy},${C.mid})`,padding:"80px 32px",borderTop:"1px solid rgba(245,192,0,0.15)"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div className="rf" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:40,flexWrap:"wrap"}}>
          <div>
            <div style={{color:C.yellow,fontSize:11,letterSpacing:"0.2em",marginBottom:12,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>Seen something you like?</div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,color:C.white,marginBottom:14,letterSpacing:"0.03em"}}>Hold It For Free</h2>
            <p style={{color:"#9AAABB",fontSize:15,lineHeight:1.75,maxWidth:480,fontFamily:"'DM Sans',sans-serif"}}>WhatsApp us the piece you want and we'll set it aside. No payment, no commitment. Just first dibs while you decide.</p>
          </div>
          <button className="by" onClick={()=>wa(null)} style={{background:C.yellow,color:C.navy,border:"none",padding:"16px 32px",borderRadius:4,fontSize:14,fontWeight:700,whiteSpace:"nowrap",letterSpacing:"0.02em"}}>WhatsApp to Reserve</button>
        </div>
      </div>
    </section>



    {/* FOOTER */}
    <footer style={{background:C.navy,padding:"40px 32px",borderTop:`1px solid ${C.mid}`}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div className="ff" style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:32,marginBottom:24}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:C.yellow,letterSpacing:"0.1em"}}>KARU</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.white,letterSpacing:"0.2em",opacity:0.7}}>FURNITURE</span>
            </div>
            <div style={{color:C.muted,fontSize:13,fontFamily:"'DM Sans',sans-serif",lineHeight:1.6,maxWidth:240}}>Good furniture, fair prices, right here in your neighbourhood.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[["📍","Gachie, off Kiambu Road, Nairobi"],["📞","0720 772 866"],["⏰","Mon–Sat 8am–7pm  ·  Sun 10am–5pm"]].map(([icon,text])=>(
              <div key={text} style={{display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{fontSize:13}}>{icon}</span>
                <span style={{color:C.dark,fontSize:13,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.mid}`,paddingTop:20}}>
          <span style={{color:C.muted,fontSize:12}}>© 2026 KARU Furniture. Nairobi, Kenya.</span>
        </div>
      </div>
    </footer>

    {/* MODAL */}
    {sel&&(
      <div style={{position:"fixed",inset:0,background:"rgba(5,10,31,0.92)",zIndex:200,display:"flex",justifyContent:"center",alignItems:"center",padding:20,backdropFilter:"blur(6px)"}} onClick={()=>setSel(null)}>
        <div style={{background:C.white,borderRadius:12,maxWidth:540,width:"100%",overflow:"hidden",position:"relative",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setSel(null)} style={{position:"absolute",top:14,right:14,background:"rgba(5,10,31,0.15)",border:"none",color:C.navy,width:32,height:32,borderRadius:"50%",fontSize:14,fontWeight:700,zIndex:10}}>✕</button>
          <div style={{height:220,background:`linear-gradient(135deg,${C.navy},${C.mid})`,display:"flex",justifyContent:"center",alignItems:"center",overflow:"hidden"}}>
            {sel.image_url?<img src={sel.image_url} alt={sel.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:80}}>🪑</span>}
          </div>
          <div style={{padding:"24px 28px 32px"}}>
            <div style={{color:C.yellow,fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:6}}>{catLabel(sel.category)}</div>
            <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:C.navy,marginBottom:10}}>{sel.name}</h3>
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:C.yellow}}>KSh {Number(sel.price).toLocaleString()}</div>
              {sel.original_price&&sel.original_price>sel.price&&<div style={{fontSize:16,color:C.muted,textDecoration:"line-through"}}>KSh {Number(sel.original_price).toLocaleString()}</div>}
            </div>
            <p style={{color:C.dark,fontSize:14,lineHeight:1.7,marginBottom:14}}>{sel.description}</p>
            <div style={{color:sel.status==="In Stock"?C.green:C.red,fontSize:13,marginBottom:24}}>{sel.status==="In Stock"?"✓":"✕"} {sel.status}</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button className="by" onClick={()=>reserve(sel)} style={{background:C.yellow,color:C.navy,border:"none",padding:"14px 24px",borderRadius:4,fontSize:14,fontWeight:700,flex:1}}>Reserve This Piece</button>
              <button className="bg" onClick={()=>wa(sel)} style={{background:"transparent",color:C.navy,border:"1px solid rgba(5,10,31,0.25)",padding:"14px 20px",borderRadius:4,fontSize:14}}>Ask a Question</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function AdminLogin({onSuccess,onBack}) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const go=()=>{ if(pw===ADMIN_PW){onSuccess();}else{setErr("Incorrect password.");} };
  return (
    <>
    <GS/>
    <div style={{minHeight:"100vh",background:C.navy,display:"flex",justifyContent:"center",alignItems:"center",padding:24}}>
      <div style={{background:C.mid,border:"1px solid rgba(245,192,0,0.2)",borderRadius:12,padding:"40px 36px",maxWidth:380,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:C.yellow,letterSpacing:"0.1em"}}>KARU</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.white,opacity:0.75,marginLeft:6}}>ADMIN</span>
          <div style={{color:C.muted,fontSize:13,marginTop:8}}>Management Dashboard</div>
        </div>
        <input type="password" placeholder="Enter admin password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}
          style={{width:"100%",background:C.light,border:`1px solid ${err?C.red:"#1A2A4A"}`,borderRadius:6,padding:"12px 16px",color:C.white,fontSize:15,marginBottom:8}}/>
        {err&&<div style={{color:C.red,fontSize:12,marginBottom:8}}>{err}</div>}
        <button className="by" onClick={go} style={{width:"100%",background:C.yellow,color:C.navy,border:"none",padding:14,borderRadius:6,fontSize:15,fontWeight:700,marginTop:4}}>Access Dashboard</button>
        <button onClick={onBack} style={{width:"100%",background:"transparent",color:C.muted,border:"none",padding:"12px 0",fontSize:13,marginTop:8}}>← Back to site</button>
      </div>
    </div>
    </>
  );
}

function AdminDash({products,analytics,setProducts,onBack}) {
  const [tab,setTab]=useState("products");
  const [items,setItems]=useState(products);
  const [showForm,setShowForm]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState(null);
  const [toast,setToast]=useState(null);

  useEffect(()=>setItems(products),[products]);

  const msg=(text,type="ok")=>{setToast({text,type});setTimeout(()=>setToast(null),3000);};

  const del=async(p)=>{
    if(!confirm(`Delete "${p.name}"?`))return;
    setDeleting(p.id);
    try{if(p.image_url)await sb.delImg(p.image_url).catch(()=>{});await sb.del(p.id);setItems(x=>x.filter(i=>i.id!==p.id));msg(`"${p.name}" deleted.`);}
    catch{msg("Delete failed.","err");}finally{setDeleting(null);}
  };

  const save=async(data)=>{
    setSaving(true);
    try{
      if(editItem){const[u]=await sb.patch(editItem.id,data);setItems(x=>x.map(i=>i.id===editItem.id?u:i));msg("Updated.");}
      else{const[c]=await sb.post(data);setItems(x=>[c,...x]);msg("Product added.");}
      setShowForm(false);setEditItem(null);
    }catch{msg("Save failed.","err");}finally{setSaving(false);}
  };

  const getA=id=>analytics[id]||{};
  const tv=items.reduce((s,p)=>s+(getA(p.id).view||0),0);
  const tw=items.reduce((s,p)=>s+(getA(p.id).whatsapp||0),0);
  const tr=items.reduce((s,p)=>s+(getA(p.id).reserve||0),0);
  const tvis=Object.values(analytics.visits||{}).reduce((s,v)=>s+v,0);

  const chartD=[...items].map(p=>({name:p.name.slice(0,14),v:getA(p.id).view||0,w:getA(p.id).whatsapp||0,r:getA(p.id).reserve||0}))
    .sort((a,b)=>(b.v+b.w*3+b.r*5)-(a.v+a.w*3+a.r*5)).slice(0,8);

  const visD=Object.entries(analytics.visits||{}).sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([d,c])=>({date:d.slice(5),count:c}));
  const catD=[{name:"Living",clicks:analytics.cat_living?.click||0},{name:"Bedroom",clicks:analytics.cat_bedroom?.click||0},{name:"Decor",clicks:analytics.cat_decor?.click||0}];
  const maxCat=Math.max(...catD.map(d=>d.clicks),1);

  return(
    <>
    <GS/>
    <div style={{minHeight:"100vh",background:C.navy,color:C.white,fontFamily:"'DM Sans',sans-serif"}}>
      {/* Admin Nav */}
      <div style={{background:C.mid,borderBottom:"1px solid #1A2A4A",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.yellow,letterSpacing:"0.1em"}}>KARU</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.white,opacity:0.6,letterSpacing:"0.2em"}}>ADMIN</span>
          </div>
          {["products","analytics"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?C.light:"transparent",color:tab===t?C.yellow:C.muted,border:"none",padding:"6px 16px",borderRadius:4,fontSize:13,fontWeight:tab===t?600:400}}>
              {t==="products"?"📦 Products":"📊 Insights"}
            </button>
          ))}
        </div>
        <button onClick={onBack} style={{background:"transparent",color:C.muted,border:"1px solid #1A2A4A",padding:"6px 16px",borderRadius:4,fontSize:12}}>← Back to Site</button>
      </div>

      {toast&&<div style={{position:"fixed",top:70,right:24,background:toast.type==="err"?C.red:C.green,color:C.white,padding:"10px 20px",borderRadius:6,fontSize:13,zIndex:999}}>{toast.text}</div>}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>

        {/* PRODUCTS TAB */}
        {tab==="products"&&(
          <div>
            <div className="sg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
              {[{l:"Total",v:items.length,i:"🪑",c:C.white},{l:"In Stock",v:items.filter(p=>p.status==="In Stock").length,i:"✅",c:C.green},{l:"Out of Stock",v:items.filter(p=>p.status!=="In Stock").length,i:"❌",c:C.red},{l:"Discounted",v:items.filter(p=>p.original_price&&p.original_price>p.price).length,i:"🏷️",c:C.yellow}].map(s=>(
                <div key={s.l} style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:"16px 18px"}}>
                  <div style={{fontSize:20,marginBottom:6}}>{s.i}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{color:C.muted,fontSize:11,marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
            {!showForm&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><button className="by" onClick={()=>{setEditItem(null);setShowForm(true);}} style={{background:C.yellow,color:C.navy,border:"none",padding:"10px 22px",borderRadius:4,fontSize:14,fontWeight:700}}>+ Add Product</button></div>}
            {showForm&&<ProdForm initial={editItem} onSave={save} onCancel={()=>{setShowForm(false);setEditItem(null);}} saving={saving}/>}
            <div style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid #1A2A4A",display:"grid",gridTemplateColumns:"56px 1fr 90px 110px 110px 90px",gap:12}}>
                {["IMG","PRODUCT","CAT","PRICE","STATUS","EDIT"].map(h=><div key={h} style={{color:C.muted,fontSize:10,letterSpacing:"0.1em"}}>{h}</div>)}
              </div>
              {items.length===0?<div style={{padding:40,textAlign:"center",color:C.muted}}>No products yet. Add your first piece above.</div>
                :items.map((p,i)=>(
                <div key={p.id} className="ar" style={{padding:"10px 16px",borderBottom:i<items.length-1?"1px solid #0F1A3A":"none",display:"grid",gridTemplateColumns:"56px 1fr 90px 110px 110px 90px",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:6,overflow:"hidden",background:C.light,display:"flex",justifyContent:"center",alignItems:"center",fontSize:20}}>
                    {p.image_url?<img src={p.image_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"🪑"}
                  </div>
                  <div><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{p.name}</div>{p.badge&&<span style={{background:C.yellow+"22",color:C.yellow,fontSize:10,padding:"2px 8px",borderRadius:100}}>{p.badge}</span>}</div>
                  <div style={{color:C.muted,fontSize:11}}>{catLabel(p.category)}</div>
                  <div><div style={{fontSize:13,fontWeight:600}}>KSh {Number(p.price).toLocaleString()}</div>{p.original_price&&p.original_price>p.price&&<div style={{fontSize:10,color:C.red}}>{Math.round((1-p.price/p.original_price)*100)}% off</div>}</div>
                  <div><span style={{background:p.status==="In Stock"?"rgba(76,175,80,0.15)":"rgba(232,91,91,0.15)",color:p.status==="In Stock"?C.green:C.red,padding:"4px 10px",borderRadius:100,fontSize:11}}>{p.status}</span></div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setEditItem(p);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}} style={{background:C.light,border:"1px solid #1A2A4A",color:C.muted,padding:"5px 10px",borderRadius:4,fontSize:12}}>✏️</button>
                    <button onClick={()=>del(p)} disabled={deleting===p.id} style={{background:"rgba(232,91,91,0.15)",border:"1px solid rgba(232,91,91,0.3)",color:C.red,padding:"5px 10px",borderRadius:4,fontSize:12}}>{deleting===p.id?"…":"🗑️"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab==="analytics"&&(
          <div>
            <div className="sg" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
              {[{l:"Site Visits",v:tvis,i:"🌐",c:C.white},{l:"Product Views",v:tv,i:"👁️",c:C.white},{l:"WhatsApp Clicks",v:tw,i:"💬",c:"#25D366"},{l:"Reserves",v:tr,i:"📌",c:C.yellow}].map(s=>(
                <div key={s.l} style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:"18px 18px"}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.i}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:s.c,lineHeight:1}}>{s.v}</div>
                  <div style={{color:C.muted,fontSize:11,marginTop:6}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Funnel */}
            <div style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:24,marginBottom:20}}>
              <div style={{color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:16}}>CONVERSION FUNNEL</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
                {[{l:"Views",v:tv,c:C.white},{l:"WhatsApp",v:tw,c:"#25D366",r:tv?Math.round(tw/tv*100):0},{l:"Reserves",v:tr,c:C.yellow,r:tw?Math.round(tr/tw*100):0}].map((f,i)=>(
                  <div key={f.l} style={{textAlign:"center",padding:"16px 0",borderRight:i<2?"1px solid #1A2A4A":"none"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:f.c,lineHeight:1}}>{f.v}</div>
                    <div style={{color:C.muted,fontSize:12,marginTop:6}}>{f.l}</div>
                    {f.r!==undefined&&<div style={{color:f.c,fontSize:11,marginTop:4}}>{f.r}% conversion</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:24,marginBottom:20}}>
              <div style={{color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:16}}>TOP PRODUCTS BY ENGAGEMENT</div>
              {chartD.every(d=>d.v+d.w+d.r===0)?<div style={{color:C.muted,textAlign:"center",padding:"24px 0",fontSize:13}}>No engagement data yet. Share your site link to start tracking.</div>:(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartD} margin={{left:-20}}>
                    <XAxis dataKey="name" tick={{fill:C.muted,fontSize:9}}/>
                    <YAxis tick={{fill:C.muted,fontSize:9}}/>
                    <Tooltip contentStyle={{background:C.light,border:"1px solid #1A2A4A",borderRadius:6,color:C.white}}/>
                    <Bar dataKey="v" fill={C.white} opacity={0.4} name="Views" radius={[3,3,0,0]}/>
                    <Bar dataKey="w" fill="#25D366" name="WhatsApp" radius={[3,3,0,0]}/>
                    <Bar dataKey="r" fill={C.yellow} name="Reserve" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:24}}>
                <div style={{color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:16}}>DAILY VISITS (14 DAYS)</div>
                {visD.length<2?<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"24px 0"}}>Visit data builds over time.</div>:(
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={visD}>
                      <XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}}/>
                      <YAxis tick={{fill:C.muted,fontSize:9}}/>
                      <Tooltip contentStyle={{background:C.light,border:"1px solid #1A2A4A",borderRadius:6}}/>
                      <Line type="monotone" dataKey="count" stroke={C.yellow} strokeWidth={2} dot={false} name="Visits"/>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{background:C.mid,border:"1px solid #1A2A4A",borderRadius:8,padding:24}}>
                <div style={{color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:16}}>CATEGORY CLICKS</div>
                {catD.every(d=>d.clicks===0)?<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"24px 0"}}>No category data yet.</div>:catD.map(d=>(
                  <div key={d.name} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:C.white}}>{d.name}</span>
                      <span style={{fontSize:12,color:C.yellow,fontWeight:600}}>{d.clicks}</span>
                    </div>
                    <div style={{height:4,background:"#1A2A4A",borderRadius:2}}>
                      <div style={{height:4,background:C.yellow,borderRadius:2,width:`${(d.clicks/maxCat)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div style={{background:C.mid,border:"1px solid rgba(245,192,0,0.2)",borderRadius:8,padding:24,marginTop:20}}>
              <div style={{color:C.yellow,fontSize:10,letterSpacing:"0.1em",marginBottom:16}}>💡 SMART INSIGHTS</div>
              {items.length===0?<div style={{color:C.muted,fontSize:13}}>Add products to start generating insights.</div>:
              [...items].sort((a,b)=>(getA(b.id).view||0)-(getA(a.id).view||0)).slice(0,5).map(p=>{
                const a=getA(p.id); const v=a.view||0; const w=a.whatsapp||0; const r=a.reserve||0;
                let insight="";
                if(v>3&&w===0) insight=`"${p.name}" gets views but no WhatsApp clicks. Price may be too high or description needs work.`;
                else if(w>1&&r===0) insight=`"${p.name}" generates WhatsApp interest but no reserves. Follow up faster on enquiries.`;
                else if(v>0&&w>0&&Math.round(w/v*100)>30) insight=`"${p.name}" has a strong ${Math.round(w/v*100)}% click-through rate. Consider restocking more.`;
                else if(v===0&&p.status==="In Stock") insight=`"${p.name}" has had zero views. Push it on WhatsApp Status.`;
                if(!insight) return null;
                return <div key={p.id} style={{borderLeft:`3px solid ${C.yellow}`,paddingLeft:12,marginBottom:12,fontSize:13,color:C.muted,lineHeight:1.5}}>{insight}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function ProdForm({initial,onSave,onCancel,saving}) {
  const [f,setF]=useState({name:initial?.name||"",category:initial?.category||"living",price:initial?.price||"",original_price:initial?.original_price||"",description:initial?.description||"",status:initial?.status||"In Stock",badge:initial?.badge||"",image_url:initial?.image_url||"",is_featured:initial?.is_featured||false});
  const [imgFile,setImgFile]=useState(null); const [uploading,setUploading]=useState(false); const [preview,setPreview]=useState(initial?.image_url||"");
  const ref=useRef();
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const onImg=e=>{const file=e.target.files[0];if(!file)return;setImgFile(file);setPreview(URL.createObjectURL(file));};
  const go=async()=>{
    if(!f.name.trim()){alert("Name required.");return;}
    if(!f.price){alert("Price required.");return;}
    let url=f.image_url;
    if(imgFile){setUploading(true);try{url=await sb.upload(imgFile);}catch{alert("Image upload failed. Is the bucket public?");setUploading(false);return;}setUploading(false);}
    onSave({...f,image_url:url,price:Number(f.price),original_price:f.original_price?Number(f.original_price):null});
  };
  const inp=(label,key,type="text",ph="")=>(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:5}}>{label}</label>
      <input type={type} value={f[key]} onChange={e=>set(key,e.target.value)} placeholder={ph}
        style={{width:"100%",background:C.light,border:"1px solid #1A2A4A",borderRadius:6,padding:"10px 14px",color:C.white,fontSize:14}}/>
    </div>
  );
  return(
    <div style={{background:C.mid,border:`1px solid ${C.yellow}44`,borderRadius:8,padding:24,marginBottom:20}}>
      <div style={{color:C.yellow,fontSize:14,fontWeight:600,marginBottom:20}}>{initial?"✏️ Edit Product":"+ New Product"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div>
          {inp("PRODUCT NAME *","name","text","e.g. 3+1+1 Sofa Set")}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:5}}>CATEGORY</label>
            <select value={f.category} onChange={e=>set("category",e.target.value)} style={{width:"100%",background:C.light,border:"1px solid #1A2A4A",borderRadius:6,padding:"10px 14px",color:C.white,fontSize:14}}>
              <option value="living">Living Room</option><option value="bedroom">Bedroom</option><option value="decor">Decor & Flowers</option>
            </select>
          </div>
          {inp("SALE PRICE (KSh) *","price","number","25000")}
          {inp("ORIGINAL PRICE (for discount display)","original_price","number","Leave blank if no discount")}
          {inp("BADGE TEXT","badge","text","New Arrival, Best Seller, Sale…")}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:5}}>STATUS</label>
            <select value={f.status} onChange={e=>set("status",e.target.value)} style={{width:"100%",background:C.light,border:"1px solid #1A2A4A",borderRadius:6,padding:"10px 14px",color:C.white,fontSize:14}}>
              <option>In Stock</option><option>Out of Stock</option><option>Available to Order</option>
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="checkbox" id="ft" checked={f.is_featured} onChange={e=>set("is_featured",e.target.checked)}/>
            <label htmlFor="ft" style={{color:C.muted,fontSize:13}}>Mark as Featured</label>
          </div>
        </div>
        <div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:5}}>PRODUCT IMAGE</label>
            <div style={{width:"100%",height:170,background:C.light,border:"1px dashed #1A2A4A",borderRadius:6,display:"flex",justifyContent:"center",alignItems:"center",overflow:"hidden",marginBottom:8,cursor:"pointer"}} onClick={()=>ref.current?.click()}>
              {preview?<img src={preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center",color:C.muted}}><div style={{fontSize:32,marginBottom:6}}>📷</div><div style={{fontSize:12}}>Click to upload</div></div>}
            </div>
            <input ref={ref} type="file" accept="image/*" onChange={onImg} style={{display:"none"}}/>
            <button onClick={()=>ref.current?.click()} style={{width:"100%",background:C.light,border:"1px solid #1A2A4A",color:C.muted,padding:"8px 0",borderRadius:4,fontSize:12}}>{uploading?"⏳ Uploading…":preview?"🔄 Change Image":"📷 Choose Image"}</button>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:C.muted,fontSize:10,letterSpacing:"0.1em",marginBottom:5}}>DESCRIPTION</label>
            <textarea value={f.description} onChange={e=>set("description",e.target.value)} rows={5} placeholder="Material, dimensions, colour options…"
              style={{width:"100%",background:C.light,border:"1px solid #1A2A4A",borderRadius:6,padding:"10px 14px",color:C.white,fontSize:14,resize:"vertical",lineHeight:1.5}}/>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={onCancel} style={{background:"transparent",color:C.muted,border:"1px solid #1A2A4A",padding:"10px 22px",borderRadius:4,fontSize:13}}>Cancel</button>
        <button className="by" onClick={go} disabled={saving||uploading} style={{background:saving||uploading?"#556677":C.yellow,color:C.navy,border:"none",padding:"10px 28px",borderRadius:4,fontSize:14,fontWeight:700,cursor:saving||uploading?"not-allowed":"pointer"}}>
          {saving?"Saving…":uploading?"Uploading…":initial?"Save Changes":"Add Product"}
        </button>
      </div>
    </div>
  );
}
