import { useState, useEffect } from "react";

const SB_URL = "https://mggtvitmicbzytklmkmm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3R2aXRtaWNienl0a2xta21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTg3NzAsImV4cCI6MjA5Mjc5NDc3MH0.H4ulHFHJQQ_5wvMLdzBrlqBi89SFCiNxuvLNQ9vX-5A";
const ADMIN_ID = "17b85d21-02a3-492d-bbcc-9b4adc8a6e65";
const ADMIN_EMAIL = "tedwright@wtechfiregroup.com";
const ADMIN_PASS = "admin123";

const sb = {
  h: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
  async get(table, q = "") { const r = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, { headers: this.h }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  async post(table, data) { const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: { ...this.h, "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(data) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  async patch(table, id, data) { const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: this.h, body: JSON.stringify(data) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  async del(table, id) { const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.h }); if (!r.ok) throw new Error(await r.text()); },
};

const T = {
  navy:"#0F1E36",navyMd:"#1B2E4A",navyLt:"#243656",blue:"#1B4B8A",
  red:"#E8422A",redLt:"#FEE2DC",green:"#16A34A",greenLt:"#DCFCE7",
  amber:"#D97706",amberLt:"#FEF3C7",white:"#FFFFFF",text:"#F1F5F9",
  textMd:"#94A3B8",textDk:"#64748B",border:"#1E3354",card:"#162440",input:"#0D1829",
};

// ─── FORMAT METADATA ─────────────────────────────────────────────────────────
const FORMAT_LABEL = {
  scramble: "Scramble",
  stableford_b3of4: "Stableford – Best 3 of 4",
  hole_points_race: "Hole Points Race",
};
const FORMAT_BADGE = {
  scramble:        { bg: T.amberLt, col: "#78350f" },
  stableford_b3of4:{ bg: "#dbeafe", col: "#1e3a8a" },
  hole_points_race:{ bg: T.greenLt, col: "#14532d" },
};
const isSingleCourse = f => f === "scramble";
// Stableford uses multi-course (one row per tee). Scramble = 1 course. hole_points_race = 1 per day.
const isMultiTee  = f => f === "stableford_b3of4";
const isMultiDay  = f => f === "hole_points_race";
const teamSize = f => (f === "scramble" || f === "stableford_b3of4") ? 4 : 2;

const formatPill = f => {
  const b = FORMAT_BADGE[f] || { bg: T.navyLt, col: T.text };
  return <span style={{background:b.bg,color:b.col,padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700}}>{FORMAT_LABEL[f] || f}</span>;
};

// ─── HANDICAP & STABLEFORD HELPERS (Full WHS) ────────────────────────────────
// Course Handicap = round( HCP Index × Slope/113 + (CR − Par) )
// Playing Handicap = round( Course HCP × allowance )
const courseHandicap = (idx, course) => {
  const i = parseFloat(idx);
  if (isNaN(i)) return 0;
  if (!course || !course.slope || course.rating == null || course.par == null) return Math.round(i);
  return Math.round(i * (course.slope / 113) + (parseFloat(course.rating) - parseInt(course.par)));
};
const playingHcp = (idx, course, allow) => Math.round(courseHandicap(idx, course) * allow);
const strokesOn = (php, si) => php > 0 ? Math.floor(php / 18) + (si <= (php % 18) ? 1 : 0) : 0;
const stbPts = (gross, par, strokes) => {
  if (gross == null) return null;
  const diff = (gross - strokes) - par;
  if (diff <= -2) return 4;
  if (diff === -1) return 3;
  if (diff ===  0) return 2;
  if (diff ===  1) return 1;
  return 0;
};

const statusPill = s => {
  const m = { draft:["#78350f","#FEF3C7"], live:["#14532d","#DCFCE7"], finished:[T.textDk,"#1e293b"] };
  const [col, bg] = m[s] || [T.textDk,"#1e293b"];
  return <span style={{background:bg,color:col,padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>{s.toUpperCase()}</span>;
};

const imgToBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = e => res(e.target.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const Inp = ({label,value,onChange,type="text",placeholder="",required=false}) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
  </div>
);

const Sel = ({label,value,onChange,options}) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:14,fontFamily:"inherit",outline:"none",appearance:"none"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Btn = ({children,onClick,variant="primary",disabled=false,small=false}) => {
  const bg = {primary:T.blue,danger:T.red,success:T.green,secondary:T.navyLt,amber:T.amber}[variant]||T.blue;
  return <button onClick={onClick} disabled={disabled}
    style={{background:disabled?T.navyLt:bg,color:T.white,border:"none",borderRadius:8,padding:small?"6px 14px":"10px 20px",fontSize:small?12:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?0.5:1,whiteSpace:"nowrap",transition:"opacity 0.15s"}}>
    {children}
  </button>;
};

const Modal = ({title,onClose,children,width=560}) => (
  <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,width,maxHeight:"88vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"18px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:800,fontSize:17,color:T.text}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.textMd,fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);

const Card = ({children,style={}}) => <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,...style}}>{children}</div>;

const Stat = ({label,value,sub,color=T.blue}) => (
  <div style={{background:T.navyMd,borderRadius:10,padding:"16px 20px",border:`1px solid ${T.border}`}}>
    <div style={{fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{label}</div>
    <div style={{fontSize:32,fontWeight:900,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:T.textDk,marginTop:4}}>{sub}</div>}
  </div>
);

const Tab = ({label,active,onClick,badge}) => (
  <button onClick={onClick} style={{padding:"10px 22px",border:"none",background:"none",borderBottom:`3px solid ${active?T.blue:"transparent"}`,color:active?T.white:T.textMd,fontWeight:active?700:400,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
    {label}{badge!=null?<span style={{marginLeft:6,background:T.blue,color:T.white,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{badge}</span>:""}
  </button>
);

const ImgUpload = ({label, value, onChange}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{label}</label>}
    {value ? (
      <div style={{position:"relative",display:"inline-block"}}>
        <img src={value} alt="upload" style={{height:80,borderRadius:8,objectFit:"contain",background:T.navyMd,padding:4}}/>
        <button onClick={()=>onChange(null)} style={{position:"absolute",top:-6,right:-6,background:T.red,border:"none",color:T.white,borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
      </div>
    ) : (
      <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.input,border:`1px dashed ${T.border}`,borderRadius:8,cursor:"pointer"}}>
        <span style={{fontSize:18}}>📷</span>
        <span style={{fontSize:13,color:T.textMd}}>Click to upload image</span>
        <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{if(e.target.files[0])onChange(await imgToBase64(e.target.files[0]));}}/>
      </label>
    )}
  </div>
);

// ─── EDIT PLAYER ROW ─────────────────────────────────────────────────────────
function EditPlayerRow({player, T, onSave, compCourses, courses, isStableford}) {
  const [p, setP] = useState({
    name: player.name||"",
    handicap: String(player.handicap||""),
    company: player.company||"",
    email: player.email||"",
    course_id: player.course_id||"",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave(p);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  // Resolve current tee for the badge (label inside parens if present)
  const currentCourse = (compCourses||[]).find(cc => cc.course_id === p.course_id);
  const currentCourseObj = currentCourse ? (courses||[]).find(c => c.id === currentCourse.course_id) : null;
  const teeLabel = currentCourseObj ? (currentCourseObj.name.match(/\(([^)]+)\)/)?.[1] || currentCourseObj.name) : null;

  return (
    <div style={{background:`${T.navyMd}`,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10,marginBottom:8}}>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Name</label>
          <input value={p.name} onChange={e=>setP(x=>({...x,name:e.target.value}))}
            style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>HCP</label>
          <input value={p.handicap} onChange={e=>setP(x=>({...x,handicap:e.target.value}))} type="number"
            style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Company</label>
          <input value={p.company} onChange={e=>setP(x=>({...x,company:e.target.value}))}
            style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Email</label>
          <input value={p.email} onChange={e=>setP(x=>({...x,email:e.target.value}))} type="email"
            style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </div>
      </div>
      {isStableford && (
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>
            Tee {teeLabel && <span style={{padding:"1px 6px",background:T.blue,color:T.white,borderRadius:6,fontSize:9,marginLeft:6,letterSpacing:0.3,textTransform:"none"}}>{teeLabel}</span>}
          </label>
          <select value={p.course_id} onChange={e=>setP(x=>({...x,course_id:e.target.value}))}
            style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 10px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}>
            <option value="">— Use first attached tee —</option>
            {(compCourses||[]).map(cc => {
              const c = (courses||[]).find(x => x.id === cc.course_id);
              if (!c) return null;
              return <option key={cc.id} value={c.id}>{c.name} (Par {c.par} · CR {c.rating} · Slope {c.slope})</option>;
            })}
          </select>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={handleSave}
          style={{padding:"6px 16px",borderRadius:8,border:"none",background:saved?T.green:T.blue,color:T.white,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"background 0.2s"}}>
          {saved ? "✓ Saved" : "Save Player"}
        </button>
      </div>
    </div>
  );
}

// ─── AUCTION TAB ─────────────────────────────────────────────────────────────
function AuctionTab({auctionItems, auctionBids, onToggleClose, onDelete, onAdd, T}) {
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (auctionItems.length > 0 && !selectedItem) setSelectedItem(auctionItems[0]);
  }, [auctionItems]);

  const itemBids = selectedItem
    ? [...auctionBids.filter(b => b.item_id === selectedItem.id)].sort((a,b) => b.amount - a.amount)
    : [];
  const top = itemBids[0];

  if (auctionItems.length === 0) return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:60,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>❤️</div>
      <div style={{fontSize:16,color:T.textMd,marginBottom:16}}>No auction items yet</div>
      <button onClick={onAdd} style={{background:T.blue,color:T.white,border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add First Item</button>
    </div>
  );

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,height:"calc(100vh - 280px)"}}>
      <div style={{display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
        {auctionItems.map(item => {
          const bids = auctionBids.filter(b=>b.item_id===item.id);
          const topBid = [...bids].sort((a,b)=>b.amount-a.amount)[0];
          const isSelected = selectedItem?.id === item.id;
          return (
            <div key={item.id} onClick={()=>setSelectedItem(item)}
              style={{background:isSelected?`${T.blue}22`:T.card,border:`2px solid ${isSelected?T.blue:T.border}`,borderRadius:12,padding:"13px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}>
              {item.image ? (
                <img src={item.image} alt={item.title} style={{width:56,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
              ) : (
                <div style={{width:56,height:56,background:T.navyMd,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🏆</div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                  {item.title}
                  {item.is_closed&&<span style={{fontSize:10,background:T.textDk+"33",color:T.textDk,padding:"1px 7px",borderRadius:8}}>CLOSED</span>}
                </div>
                <div style={{fontSize:11,color:T.textMd,marginTop:2}}>{item.description}</div>
                <div style={{fontSize:11,color:T.red,marginTop:3}}>Start €{item.start_bid} · {bids.length} bid{bids.length!==1?"s":""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:20,fontWeight:900,color:topBid?T.green:T.textDk}}>€{topBid?topBid.amount:item.start_bid}</div>
                {topBid&&<div style={{fontSize:11,color:T.amber,fontWeight:700}}>🏆 {topBid.team_name}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {selectedItem ? (<>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,background:T.navyMd}}>
            <div style={{fontWeight:800,fontSize:15}}>{selectedItem.title}</div>
            <div style={{fontSize:11,color:T.textMd,marginTop:2}}>{selectedItem.description}</div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={()=>onToggleClose(selectedItem)}
                style={{padding:"5px 14px",borderRadius:8,border:"none",background:selectedItem.is_closed?T.green:T.red,color:T.white,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {selectedItem.is_closed?"↺ Reopen":"⏹ Close"}
              </button>
              <button onClick={()=>onDelete(selectedItem.id)}
                style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:"none",color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                🗑 Delete
              </button>
            </div>
          </div>

          <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:20}}>
            <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Starting Bid</div><div style={{fontSize:18,fontWeight:900,color:T.textMd}}>€{selectedItem.start_bid}</div></div>
            <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Current Top</div><div style={{fontSize:18,fontWeight:900,color:top?T.green:T.textDk}}>€{top?top.amount:selectedItem.start_bid}</div></div>
            <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Total Bids</div><div style={{fontSize:18,fontWeight:900,color:T.blue}}>{itemBids.length}</div></div>
            {top&&<div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Winning Team</div><div style={{fontSize:14,fontWeight:800,color:T.amber}}>🏆 {top.team_name}</div></div>}
          </div>

          <div style={{flex:1,overflowY:"auto"}}>
            {itemBids.length===0 ? (
              <div style={{padding:30,textAlign:"center",color:T.textDk,fontSize:13}}>No bids yet for this item</div>
            ) : itemBids.map((bid,idx)=>(
              <div key={bid.id} style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:idx===0?`${T.green}11`:"transparent"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:idx===0?T.green:T.navyMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.white,flexShrink:0}}>
                    {idx+1}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:idx===0?T.green:T.text}}>{bid.team_name}</div>
                    <div style={{fontSize:11,color:T.textDk}}>{new Date(bid.placed_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
                <div style={{fontWeight:900,fontSize:20,color:idx===0?T.green:T.text}}>€{bid.amount}</div>
              </div>
            ))}
          </div>
        </>) : (
          <div style={{padding:40,textAlign:"center",color:T.textDk}}>Select an item to see bids</div>
        )}
      </div>
    </div>
  );
}

// ─── STABLEFORD LIVE SCORES (3 leaderboards + methodology) ───────────────────
function StablefordLiveScores({ selectedComp, teams, players, scores, courses, compCourses }) {
  // Build a map of course_id → resolved course object (with parsed holes array)
  const resolveCourse = (courseId) => {
    const c = courses.find(x => x.id === courseId);
    if (!c) return null;
    const holes = Array.isArray(c.holes) ? c.holes : (() => {
      try { return JSON.parse(c.holes); } catch { return []; }
    })();
    return { ...c, holes };
  };

  // Default course = first attached tee (used for players with no course_id assigned)
  const defaultCourse = compCourses[0] ? resolveCourse(compCourses[0].course_id) : null;

  if (!defaultCourse || defaultCourse.holes.length === 0) {
    return <Card style={{padding:40,textAlign:"center",color:T.textMd}}>
      <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
      <div>No tees attached to this competition. Use "Change Tees" above to attach the tees in play before scoring.</div>
    </Card>;
  }

  // Per-player aggregate — each player computed against THEIR own tee
  const playerRows = players.map(p => {
    const team = teams.find(t => t.id === p.team_id);
    const idx  = parseFloat(p.handicap);
    const pCourse = (p.course_id && resolveCourse(p.course_id)) || defaultCourse;
    const cHcp = courseHandicap(idx, pCourse);
    const phpTeams = playingHcp(idx, pCourse, 0.9);
    const phpNett  = playingHcp(idx, pCourse, 1.0);

    let pTeams = 0, pNett = 0, pGross = 0, holesPlayed = 0;
    pCourse.holes.forEach((h, hIdx) => {
      const sc = scores.find(s => s.team_id === p.team_id && s.player_slot === p.slot && s.hole_index === hIdx);
      if (sc && sc.gross_score != null) {
        holesPlayed++;
        pTeams += stbPts(sc.gross_score, h.par, strokesOn(phpTeams, h.si));
        pNett  += stbPts(sc.gross_score, h.par, strokesOn(phpNett,  h.si));
        pGross += stbPts(sc.gross_score, h.par, 0);
      }
    });
    const teeLabel = pCourse.name.match(/\(([^)]+)\)/)?.[1] || pCourse.name;
    return { ...p, teamName: team?.name || "—", idx: isNaN(idx)?"–":idx, cHcp, phpTeams, phpNett, pTeams, pNett, pGross, holesPlayed, teeLabel, courseName: pCourse.name };
  });

  // TEAMS — best 3 of 4 per hole at 90%, each player vs their own tee
  const teamRows = teams.map(team => {
    const tp = players.filter(p => p.team_id === team.id);
    // Pre-resolve each player's course
    const tpEnriched = tp.map(p => ({
      ...p,
      course: (p.course_id && resolveCourse(p.course_id)) || defaultCourse,
      php: playingHcp(parseFloat(p.handicap), (p.course_id && resolveCourse(p.course_id)) || defaultCourse, 0.9),
    }));

    let total = 0, holesScored = 0;
    // Iterate by hole index 0..17 (every course is 18 holes)
    for (let hIdx = 0; hIdx < 18; hIdx++) {
      const pts = tpEnriched.map(p => {
        const sc = scores.find(s => s.team_id === team.id && s.player_slot === p.slot && s.hole_index === hIdx);
        if (!sc || sc.gross_score == null) return null;
        const h = p.course?.holes?.[hIdx];
        if (!h) return null;
        return stbPts(sc.gross_score, h.par, strokesOn(p.php, h.si));
      }).filter(x => x !== null);
      if (pts.length > 0) {
        const top3 = [...pts].sort((a,b) => b-a).slice(0, 3);
        total += top3.reduce((s,x) => s+x, 0);
        holesScored++;
      }
    }
    return { ...team, total, holesScored, playerCount: tp.length };
  }).sort((a,b) => b.total - a.total);

  const nettLb  = [...playerRows].filter(p => p.holesPlayed > 0).sort((a,b) => b.pNett  - a.pNett);
  const grossLb = [...playerRows].filter(p => p.holesPlayed > 0).sort((a,b) => b.pGross - a.pGross);

  const lbHeader = (icon, title, subtitle, bg) => (
    <div style={{padding:"12px 16px",background:bg,color:T.white}}>
      <div style={{fontWeight:800,fontSize:14}}>{icon} {title}</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>{subtitle}</div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* TEAMS */}
      <Card>
        {lbHeader("🏆", "TEAMS", "90% Course Handicap · best 3 of 4 stableford points per hole", T.blue)}
        <table>
          <thead><tr><th style={{width:60}}>Rank</th><th>Team</th><th style={{textAlign:"center",width:80}}>Holes</th><th style={{textAlign:"center",width:90}}>Players</th><th style={{textAlign:"center",width:100}}>Points</th></tr></thead>
          <tbody>
            {teamRows.length===0 ? <tr><td colSpan={5} style={{textAlign:"center",color:T.textDk,padding:30}}>No teams yet</td></tr> :
              teamRows.map((t,i) => (
                <tr key={t.id} style={{background:i===0?`${T.green}11`:"transparent"}}>
                  <td style={{fontWeight:900,fontSize:i<3?16:14}}>{i+1}</td>
                  <td style={{fontWeight:700}}>⚑ {t.name}</td>
                  <td style={{textAlign:"center"}}>{t.holesScored}/18</td>
                  <td style={{textAlign:"center",color:T.textMd}}>{t.playerCount}</td>
                  <td style={{textAlign:"center",fontWeight:900,fontSize:18,color:T.green}}>{t.holesScored>0?t.total:"–"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>

      {/* PLAYER NETT */}
      <Card>
        {lbHeader("👤", "Player Nett", "100% Course Handicap · individual stableford", T.navyMd)}
        <table>
          <thead><tr><th style={{width:60}}>Rank</th><th>Player</th><th>Team</th><th style={{width:90}}>Tee</th><th style={{textAlign:"center",width:60}}>Idx</th><th style={{textAlign:"center",width:60}}>Crs</th><th style={{textAlign:"center",width:70}}>Play</th><th style={{textAlign:"center",width:80}}>Holes</th><th style={{textAlign:"center",width:80}}>Points</th></tr></thead>
          <tbody>
            {nettLb.length===0 ? <tr><td colSpan={9} style={{textAlign:"center",color:T.textDk,padding:30}}>No scores yet</td></tr> :
              nettLb.map((p,i) => (
                <tr key={p.id} style={{background:i===0?`${T.green}11`:"transparent"}}>
                  <td style={{fontWeight:900,fontSize:i<3?15:13}}>{i+1}</td>
                  <td style={{fontWeight:700}}>{p.name}</td>
                  <td style={{color:T.textMd,fontSize:12}}>{p.teamName}</td>
                  <td><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6,background:T.blue,color:T.white}}>{p.teeLabel}</span></td>
                  <td style={{textAlign:"center",color:T.textMd}}>{p.idx}</td>
                  <td style={{textAlign:"center",color:T.textMd}}>{p.cHcp}</td>
                  <td style={{textAlign:"center",fontWeight:700}}>{p.phpNett}</td>
                  <td style={{textAlign:"center"}}>{p.holesPlayed}/18</td>
                  <td style={{textAlign:"center",fontWeight:900,fontSize:16,color:T.green}}>{p.pNett}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>

      {/* PLAYER GROSS */}
      <Card>
        {lbHeader("⛳", "Player Gross", "Scratch · no handicap strokes applied", T.navyMd)}
        <table>
          <thead><tr><th style={{width:60}}>Rank</th><th>Player</th><th>Team</th><th style={{width:90}}>Tee</th><th style={{textAlign:"center",width:60}}>Idx</th><th style={{textAlign:"center",width:80}}>Holes</th><th style={{textAlign:"center",width:80}}>Points</th></tr></thead>
          <tbody>
            {grossLb.length===0 ? <tr><td colSpan={7} style={{textAlign:"center",color:T.textDk,padding:30}}>No scores yet</td></tr> :
              grossLb.map((p,i) => (
                <tr key={p.id} style={{background:i===0?`${T.green}11`:"transparent"}}>
                  <td style={{fontWeight:900,fontSize:i<3?15:13}}>{i+1}</td>
                  <td style={{fontWeight:700}}>{p.name}</td>
                  <td style={{color:T.textMd,fontSize:12}}>{p.teamName}</td>
                  <td><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6,background:T.blue,color:T.white}}>{p.teeLabel}</span></td>
                  <td style={{textAlign:"center",color:T.textMd}}>{p.idx}</td>
                  <td style={{textAlign:"center"}}>{p.holesPlayed}/18</td>
                  <td style={{textAlign:"center",fontWeight:900,fontSize:16,color:T.green}}>{p.pGross}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>

      {/* METHODOLOGY */}
      <Card style={{padding:"18px 22px"}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:12,color:T.text,letterSpacing:0.3}}>📐 How handicaps & points are calculated</div>
        <div style={{fontSize:12.5,color:T.text,lineHeight:1.75}}>
          <div><strong style={{color:T.amber}}>Course Handicap</strong> &nbsp;=&nbsp; round(&nbsp;HCP&nbsp;Index&nbsp;×&nbsp;Slope&nbsp;÷&nbsp;113&nbsp;+&nbsp;(CR&nbsp;−&nbsp;Par)&nbsp;)</div>
          <div><strong style={{color:T.amber}}>Playing Handicap</strong> &nbsp;=&nbsp; round(&nbsp;Course&nbsp;HCP&nbsp;×&nbsp;allowance&nbsp;)</div>
          <div style={{marginTop:10,paddingLeft:14,color:T.textMd}}>•&nbsp;<strong style={{color:T.text}}>TEAMS</strong>: 90% allowance, best 3 of 4 stableford points per hole</div>
          <div style={{paddingLeft:14,color:T.textMd}}>•&nbsp;<strong style={{color:T.text}}>Player Nett</strong>: 100% allowance, individual stableford</div>
          <div style={{paddingLeft:14,color:T.textMd}}>•&nbsp;<strong style={{color:T.text}}>Player Gross</strong>: scratch, no strokes received</div>
          <div style={{marginTop:10}}><strong style={{color:T.amber}}>Stableford points</strong>: Eagle+ = 4&nbsp;·&nbsp;Birdie = 3&nbsp;·&nbsp;Par = 2&nbsp;·&nbsp;Bogey = 1&nbsp;·&nbsp;Double Bogey or worse = 0</div>
          <div style={{marginTop:12,padding:"10px 12px",background:T.navyMd,borderRadius:8,fontSize:12,color:T.text,lineHeight:1.6}}>
            <strong style={{color:T.amber}}>Mixed tees:</strong> each player's calculations use their own assigned tee — par, rating, slope and SI can differ between Men's/Women's tees and even between colours. Team total is best 3 of 4 contributors per hole regardless.
          </div>
          <div style={{marginTop:10,fontSize:11.5,color:T.textDk}}>
            <div style={{fontWeight:700,marginBottom:4}}>Tees in play:</div>
            {compCourses.map(cc => {
              const c = courses.find(x => x.id === cc.course_id);
              if (!c) return null;
              return <div key={cc.id} style={{paddingLeft:10}}>•&nbsp;<strong style={{color:T.textMd}}>{c.name}</strong>&nbsp;·&nbsp;Par&nbsp;{c.par}&nbsp;·&nbsp;CR&nbsp;{c.rating}&nbsp;·&nbsp;Slope&nbsp;{c.slope}</div>;
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── SPLASH ──────────────────────────────────────────────────────────────────
function Splash({onDone}) {
  const [phase, setPhase] = useState(0);
  useEffect(()=>{
    setTimeout(()=>setPhase(1), 400);
    setTimeout(()=>setPhase(2), 1100);
    setTimeout(()=>setPhase(3), 1700);
    setTimeout(()=>setPhase(4), 2300);
    setTimeout(()=>onDone(), 3400);
  },[]);
  const ease = "cubic-bezier(0.22,1,0.36,1)";
  return (
    <div style={{width:"100vw",height:"100vh",background:T.navy,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;600;700&display=swap');`}</style>
      {[{top:40,left:40,borderTop:`2px solid rgba(255,255,255,0.2)`,borderLeft:`2px solid rgba(255,255,255,0.2)`},
        {top:40,right:40,borderTop:`2px solid rgba(255,255,255,0.2)`,borderRight:`2px solid rgba(255,255,255,0.2)`},
        {bottom:40,left:40,borderBottom:`2px solid rgba(255,255,255,0.2)`,borderLeft:`2px solid rgba(255,255,255,0.2)`},
        {bottom:40,right:40,borderBottom:`2px solid rgba(255,255,255,0.2)`,borderRight:`2px solid rgba(255,255,255,0.2)`}
      ].map((s,i)=>(
        <div key={i} style={{position:"absolute",width:60,height:60,opacity:phase>=1?1:0,transition:`opacity 0.8s ease ${i*0.08}s`,...s}}/>
      ))}
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 50%, ${T.blue}22 0%, transparent 65%)`,pointerEvents:"none"}}/>
      <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{opacity:phase>=1?0.5:0,transform:phase>=1?"translateY(0)":"translateY(10px)",transition:`opacity 0.7s ease, transform 0.7s ${ease}`,fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:13,letterSpacing:6,textTransform:"uppercase",color:T.white,marginBottom:28}}>
          Golf Competition Management
        </div>
        <div style={{display:"flex",alignItems:"baseline",lineHeight:1}}>
          <span style={{opacity:phase>=2?1:0,transform:phase>=2?"translateY(0)":"translateY(20px)",transition:`opacity 0.8s ${ease} 0.05s, transform 0.8s ${ease} 0.05s`,display:"inline-block",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:120,color:T.white,letterSpacing:"-2px"}}>wRight</span>
          <span style={{width:16,display:"inline-block"}}/>
          <span style={{opacity:phase>=2?1:0,transform:phase>=2?"translateY(0)":"translateY(20px)",transition:`opacity 0.8s ${ease} 0.12s, transform 0.8s ${ease} 0.12s`,display:"inline-block",fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:120,color:T.red}}>Score</span>
        </div>
        <div style={{width:phase>=3?"600px":"0",height:"2px",background:`linear-gradient(90deg, transparent, ${T.red}, transparent)`,margin:"28px 0 24px",transition:`width 0.8s ${ease}`}}/>
        <div style={{opacity:phase>=3?0.6:0,transform:phase>=3?"translateY(0)":"translateY(10px)",transition:`opacity 0.7s ease, transform 0.7s ease`,fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:14,letterSpacing:8,textTransform:"uppercase",color:T.white}}>
          Admin Portal
        </div>
        <div style={{marginTop:60,width:320,height:2,background:"rgba(255,255,255,0.1)",borderRadius:1,overflow:"hidden"}}>
          <div style={{height:"100%",background:T.red,borderRadius:1,width:phase>=4?"100%":"0%",transition:"width 0.9s ease"}}/>
        </div>
        <div style={{opacity:phase>=4?0.4:0,transition:"opacity 0.5s ease",fontFamily:"'Montserrat',sans-serif",fontSize:11,color:T.white,marginTop:10,letterSpacing:2}}>LOADING</div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(()=>{
      if(email === ADMIN_EMAIL && pass === ADMIN_PASS) { onLogin(); }
      else { setErr("Invalid email or password"); setLoading(false); }
    }, 600);
  };

  return (
    <div style={{width:"100vw",height:"100vh",background:T.navy,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Playfair+Display:wght@700;900&display=swap');`}</style>
      <div style={{background:T.navyMd,border:`1px solid ${T.border}`,borderRadius:20,padding:"48px 48px 40px",width:440,boxShadow:"0 32px 80px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,lineHeight:1}}>
            <span style={{color:T.text}}>wRight</span><span style={{color:T.red}}>Score</span>
          </div>
          <div style={{fontSize:11,color:T.textDk,letterSpacing:3,textTransform:"uppercase",marginTop:8}}>Admin Portal</div>
        </div>

        <Inp label="Email" value={email} onChange={setEmail} type="email" placeholder="admin@example.com"/>
        <Inp label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••"/>

        {err && <div style={{color:T.red,fontSize:13,fontWeight:600,marginBottom:14,textAlign:"center"}}>⚠️ {err}</div>}

        <button onClick={handleLogin} disabled={!email||!pass||loading}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:!email||!pass?T.navyLt:T.blue,color:T.white,fontSize:16,fontWeight:700,cursor:!email||!pass?"not-allowed":"pointer",fontFamily:"inherit",marginTop:4}}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [screen, setScreen] = useState("splash");
  const [nav, setNav] = useState("dashboard");
  const [competitions, setCompetitions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [compTab, setCompTab] = useState("teams");
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [auctionItems, setAuctionItems] = useState([]);
  const [auctionBids, setAuctionBids] = useState([]);
  const [scores, setScores] = useState([]);
  const [sponsoredHoles, setSponsoredHoles] = useState([]);
  const [compCourses, setCompCourses] = useState([]);
  const [toast, setToast] = useState(null);

  const [showNewComp, setShowNewComp] = useState(false);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showEditCompCourses, setShowEditCompCourses] = useState(false);
  const [editCompCourseIds, setEditCompCourseIds] = useState(["","","",""]);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [showNewPlayer, setShowNewPlayer] = useState(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showNewSponsor, setShowNewSponsor] = useState(false);

  const [newComp, setNewComp] = useState({name:"",location:"",format:"scramble",notes:"",course_id:"",course_ids:["","","","","","","",""]});
  const [newCourse, setNewCourse] = useState({name:"",location:"",par:"70",rating:"69.0",slope:"120"});
  const [newTeam, setNewTeam] = useState({name:"",pin:""});
  const [newPlayer, setNewPlayer] = useState({name:"",handicap:"",company:"",email:"",course_id:""});
  const [newItem, setNewItem] = useState({title:"",description:"",image:null,start_bid:"",closes_at:"17:30"});
  const [newSponsor, setNewSponsor] = useState({hole_index:"2",type:"nearest_pin",sponsor_name:"",sponsor_color:"#2563eb",sponsor_logo:null,prize_desc:""});

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(()=>{ if(screen==="app") loadBase(); },[screen]);
  useEffect(()=>{ if(selectedComp) loadCompDetail(selectedComp.id); },[selectedComp]);

  const loadBase = async () => {
    try {
      const [comps,crs] = await Promise.all([
        sb.get("competitions","select=*&order=created_at.desc"),
        sb.get("courses","select=*&order=name"),
      ]);
      setCompetitions(comps); setCourses(crs);
    } catch(e) { showToast(e.message,"error"); }
  };

  const loadCompDetail = async (compId) => {
    try {
      const [t,p,ai,ab,sc,sh,cc] = await Promise.all([
        sb.get("teams",`select=*&competition_id=eq.${compId}&order=name`),
        sb.get("players",`select=*&competition_id=eq.${compId}&order=name`),
        sb.get("auction_items",`select=*&competition_id=eq.${compId}&order=sort_order`),
        sb.get("auction_bids",`select=*&competition_id=eq.${compId}&order=placed_at.desc`),
        sb.get("scores",`select=*&competition_id=eq.${compId}`),
        sb.get("sponsored_holes",`select=*&competition_id=eq.${compId}&order=hole_index`),
        sb.get("competition_courses",`select=*&competition_id=eq.${compId}&order=day`),
      ]);
      setTeams(t); setPlayers(p); setAuctionItems(ai); setAuctionBids(ab); setScores(sc); setSponsoredHoles(sh);
      setCompCourses(cc);
    } catch(e) { showToast(e.message,"error"); }
  };

  const updateCompCourses = async () => {
    if (!selectedComp) return;
    try {
      const r = await fetch(`${SB_URL}/rest/v1/competition_courses?competition_id=eq.${selectedComp.id}`, { method:"DELETE", headers: sb.h });
      if (!r.ok) throw new Error(await r.text());
      if (isSingleCourse(selectedComp.format)) {
        const cid = editCompCourseIds[0];
        if (cid) await sb.post("competition_courses", [{ competition_id: selectedComp.id, course_id: cid, day: 1 }]);
      } else {
        const links = editCompCourseIds.map((cid,i) => cid ? { competition_id: selectedComp.id, course_id: cid, day: i+1 } : null).filter(Boolean);
        if (links.length > 0) await sb.post("competition_courses", links);
      }
      const cc = await sb.get("competition_courses", `select=*&competition_id=eq.${selectedComp.id}&order=day`);
      setCompCourses(cc);
      setShowEditCompCourses(false);
      showToast("Courses updated!");
    } catch(e) { showToast(e.message, "error"); }
  };

  const createComp = async () => {
    if(!newComp.name) return;
    try {
      // handicap_allowance is only meaningful for hole_points_race (single allowance).
      // Stableford uses three allowances internally (90/100/0) so we leave this null.
      const allowance = newComp.format === "hole_points_race" ? 0.75 : null;
      const payload = {name:newComp.name,location:newComp.location,format:newComp.format,notes:newComp.notes,admin_id:ADMIN_ID,status:"draft",handicap_allowance:allowance};
      const res = await sb.post("competitions",[payload]);
      const comp = res[0];
      if(isSingleCourse(newComp.format) && newComp.course_id)
        await sb.post("competition_courses",[{competition_id:comp.id,course_id:newComp.course_id,day:1}]);
      if(newComp.format==="hole_points_race" || newComp.format==="stableford_b3of4"){
        const links = (newComp.course_ids||[]).map((cid,i)=>cid?{competition_id:comp.id,course_id:cid,day:i+1}:null).filter(Boolean);
        if(links.length>0) await sb.post("competition_courses",links);
      }
      setCompetitions(prev=>[comp,...prev]);
      setSelectedComp(comp); setCompTab("teams"); setNav("competitions");
      setShowNewComp(false);
      setNewComp({name:"",location:"",format:"scramble",notes:"",course_id:"",course_ids:["","","",""]});
      showToast("Competition created!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deleteComp = async (comp) => {
    if(!confirm(`⚠️ Delete "${comp.name}"?\n\nThis permanently deletes ALL teams, players, scores, auction data and sponsors. CANNOT be undone.`)) return;
    try {
      await sb.del("competitions",comp.id);
      setCompetitions(prev=>prev.filter(c=>c.id!==comp.id));
      if(selectedComp?.id===comp.id) setSelectedComp(null);
      showToast(`"${comp.name}" deleted`);
    } catch(e) { showToast(e.message,"error"); }
  };

  const updateCompStatus = async (comp, status) => {
    try {
      await sb.patch("competitions",comp.id,{status});
      setCompetitions(prev=>prev.map(c=>c.id===comp.id?{...c,status}:c));
      if(selectedComp?.id===comp.id) setSelectedComp(prev=>({...prev,status}));
      showToast(`Status: ${status}`);
    } catch(e) { showToast(e.message,"error"); }
  };

  const createCourse = async () => {
    if(!newCourse.name) return;
    try {
      const holes = Array.from({length:18},(_,i)=>({h:i+1,par:4,si:i+1}));
      const res = await sb.post("courses",[{...newCourse,par:parseInt(newCourse.par),rating:parseFloat(newCourse.rating),slope:parseInt(newCourse.slope),holes,added_by:ADMIN_ID}]);
      setCourses(prev=>[...prev,res[0]].sort((a,b)=>a.name.localeCompare(b.name)));
      setShowNewCourse(false); setNewCourse({name:"",location:"",par:"70",rating:"69.0",slope:"120"});
      showToast("Course added!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const updateCourse = async () => {
    if(!editCourse) return;
    try {
      const holes = editCourse.holes.map(h => ({
        h: h.h,
        par: parseInt(h.par) || 4,
        si: parseInt(h.si) || h.h,
      }));
      await sb.patch("courses",editCourse.id,{name:editCourse.name,location:editCourse.location,par:parseInt(editCourse.par),rating:parseFloat(editCourse.rating),slope:parseInt(editCourse.slope),holes});
      setCourses(prev=>prev.map(c=>c.id===editCourse.id?{...c,...editCourse,holes}:c));
      setEditCourse(null); showToast("Course updated!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deleteCourse = async (id) => {
    if(!confirm("Delete this course from the library? This cannot be undone.")) return;
    try {
      await sb.del("courses",id);
      setCourses(prev=>prev.filter(c=>c.id!==id));
      setEditCourse(null); showToast("Course deleted");
    } catch(e) { showToast(e.message,"error"); }
  };

  const createTeam = async () => {
    if(!newTeam.name||!selectedComp) return;
    try {
      const maxP = teamSize(selectedComp.format);
      const res = await sb.post("teams",[{...newTeam,competition_id:selectedComp.id,max_players:maxP}]);
      setTeams(prev=>[...prev,res[0]]);
      setShowNewTeam(false); setNewTeam({name:"",pin:""});
      showToast("Team added!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const updateTeam = async () => {
    if(!editTeam) return;
    try {
      await sb.patch("teams",editTeam.id,{name:editTeam.name,pin:editTeam.pin});
      setTeams(prev=>prev.map(t=>t.id===editTeam.id?{...t,...editTeam}:t));
      setEditTeam(null); showToast("Team updated!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deleteTeam = async (id) => {
    if(!confirm("Delete this team and all its players?")) return;
    try {
      await sb.del("teams",id);
      setTeams(prev=>prev.filter(t=>t.id!==id));
      setPlayers(prev=>prev.filter(p=>p.team_id!==id));
      setEditTeam(null); showToast("Team deleted");
    } catch(e) { showToast(e.message,"error"); }
  };

  const createPlayer = async (teamId) => {
    if(!newPlayer.name) return;
    try {
      const slot = players.filter(p=>p.team_id===teamId).length;
      const payload = {
        ...newPlayer,
        competition_id: selectedComp.id,
        team_id: teamId,
        admin_id: ADMIN_ID,
        handicap: parseFloat(newPlayer.handicap) || null,
        course_id: newPlayer.course_id || null,
        slot,
      };
      const res = await sb.post("players",[payload]);
      setPlayers(prev=>[...prev,res[0]]);
      setShowNewPlayer(null); setNewPlayer({name:"",handicap:"",company:"",email:"",course_id:""});
      showToast("Player added!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deletePlayer = async (id) => {
    try { await sb.del("players",id); setPlayers(prev=>prev.filter(p=>p.id!==id)); showToast("Player removed"); }
    catch(e) { showToast(e.message,"error"); }
  };

  const createAuctionItem = async () => {
    if(!newItem.title||!selectedComp) return;
    try {
      const res = await sb.post("auction_items",[{...newItem,competition_id:selectedComp.id,start_bid:parseInt(newItem.start_bid)||0,sort_order:auctionItems.length,emoji:"🏆"}]);
      setAuctionItems(prev=>[...prev,res[0]]);
      setShowNewItem(false); setNewItem({title:"",description:"",image:null,start_bid:"",closes_at:"17:30"});
      showToast("Item added!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deleteAuctionItem = async (id) => {
    if(!confirm("Delete this auction item?")) return;
    try { await sb.del("auction_items",id); setAuctionItems(prev=>prev.filter(i=>i.id!==id)); showToast("Item deleted"); }
    catch(e) { showToast(e.message,"error"); }
  };

  const toggleAuctionClose = async (item) => {
    try {
      await sb.patch("auction_items",item.id,{is_closed:!item.is_closed});
      setAuctionItems(prev=>prev.map(i=>i.id===item.id?{...i,is_closed:!i.is_closed}:i));
      showToast(item.is_closed?"Reopened":"Closed");
    } catch(e) { showToast(e.message,"error"); }
  };

  const createSponsor = async () => {
    if(!selectedComp) return;
    try {
      const res = await sb.post("sponsored_holes",[{...newSponsor,competition_id:selectedComp.id,hole_index:parseInt(newSponsor.hole_index)}]);
      setSponsoredHoles(prev=>[...prev,res[0]]);
      setShowNewSponsor(false); setNewSponsor({hole_index:"2",type:"nearest_pin",sponsor_name:"",sponsor_color:"#2563eb",sponsor_logo:null,prize_desc:""});
      showToast("Sponsor added!");
    } catch(e) { showToast(e.message,"error"); }
  };

  const deleteSponsor = async (id) => {
    try { await sb.del("sponsored_holes",id); setSponsoredHoles(prev=>prev.filter(s=>s.id!==id)); showToast("Removed"); }
    catch(e) { showToast(e.message,"error"); }
  };

  // ── SCREEN ROUTING ─────────────────────────────────────────
  if(screen==="splash") return <Splash onDone={()=>setScreen("login")}/>;
  if(screen==="login") return <Login onLogin={()=>{ setScreen("app"); }}/>;

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:T.navy,fontFamily:"'DM Sans',system-ui,sans-serif",color:T.text,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        input,select{font-family:inherit;color:${T.text};}input::placeholder{color:${T.textDk};}
        table{border-collapse:collapse;width:100%;}
        th{text-align:left;font-size:11px;font-weight:700;color:${T.textMd};text-transform:uppercase;letter-spacing:1px;padding:10px 16px;border-bottom:1px solid ${T.border};}
        td{padding:12px 16px;border-bottom:1px solid ${T.border};font-size:13px;color:${T.text};vertical-align:middle;}
        tr:last-child td{border-bottom:none;}tr:hover td{background:${T.navyMd}33;}
        button{font-family:inherit;}
      `}</style>

      <div style={{width:230,background:T.navyMd,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"22px 20px 18px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900}}>
            <span style={{color:T.text}}>wRight</span><span style={{color:T.red}}>Score</span>
          </div>
          <div style={{fontSize:10,color:T.textDk,letterSpacing:2,textTransform:"uppercase",marginTop:3}}>Admin Portal</div>
        </div>
        <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
          {[{id:"dashboard",icon:"▣",label:"Dashboard"},{id:"courses",icon:"⛳",label:"Courses"},{id:"competitions",icon:"🏆",label:"Competitions"}].map(n=>(
            <button key={n.id} onClick={()=>{setNav(n.id);setSelectedComp(null);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 20px",border:"none",background:nav===n.id&&!selectedComp?`${T.blue}22`:"none",color:nav===n.id&&!selectedComp?T.white:T.textMd,fontSize:13,fontWeight:nav===n.id&&!selectedComp?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderLeft:`3px solid ${nav===n.id&&!selectedComp?T.blue:"transparent"}`}}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
          {competitions.length>0&&(nav==="competitions"||selectedComp)&&(
            <div style={{borderTop:`1px solid ${T.border}`,marginTop:4,paddingTop:4}}>
              {competitions.map(c=>(
                <button key={c.id} onClick={()=>{setSelectedComp(c);setCompTab("teams");setNav("competitions");}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 20px 9px 28px",border:"none",background:selectedComp?.id===c.id?`${T.blue}33`:"none",color:selectedComp?.id===c.id?T.white:T.textMd,fontSize:12,fontWeight:selectedComp?.id===c.id?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left",borderLeft:`3px solid ${selectedComp?.id===c.id?T.blue:"transparent"}`}}>
                  <span style={{fontSize:8,color:c.status==="live"?T.green:c.status==="draft"?T.amber:T.textDk}}>●</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10,color:T.textDk}}>v1.1</div>
          <button onClick={()=>setScreen("login")} style={{background:"none",border:"none",color:T.textDk,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:58,background:T.navyMd,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:800}}>
            {selectedComp?(
              <span>
                <span style={{color:T.textMd,fontWeight:400,cursor:"pointer"}} onClick={()=>setSelectedComp(null)}>Competitions</span>
                <span style={{color:T.textMd}}> / </span>{selectedComp.name}
                <span style={{marginLeft:10}}>{statusPill(selectedComp.status)}</span>
              </span>
            ):({dashboard:"Dashboard",courses:"Courses",competitions:"Competitions"}[nav])}
          </div>
          <div style={{display:"flex",gap:8}}>
            {selectedComp&&<>
              {selectedComp.status==="draft"&&<Btn onClick={()=>updateCompStatus(selectedComp,"live")} variant="success" small>▶ Go Live</Btn>}
              {selectedComp.status==="live"&&<Btn onClick={()=>updateCompStatus(selectedComp,"finished")} variant="danger" small>⏹ Finish</Btn>}
              {selectedComp.status==="finished"&&<Btn onClick={()=>updateCompStatus(selectedComp,"draft")} variant="secondary" small>↺ Reopen</Btn>}
            </>}
            {nav==="courses"&&!selectedComp&&<Btn onClick={()=>setShowNewCourse(true)} small>+ Add Course</Btn>}
            {nav==="competitions"&&!selectedComp&&<Btn onClick={()=>setShowNewComp(true)} small>+ New Competition</Btn>}
            {selectedComp&&compTab==="teams"&&<Btn onClick={()=>setShowNewTeam(true)} small>+ Add Team</Btn>}
            {selectedComp&&compTab==="auction"&&<Btn onClick={()=>setShowNewItem(true)} small>+ Add Item</Btn>}
            {selectedComp&&compTab==="sponsors"&&<Btn onClick={()=>setShowNewSponsor(true)} small>+ Add Sponsor</Btn>}
            <Btn onClick={()=>{ loadBase(); if(selectedComp) loadCompDetail(selectedComp.id); }} variant="secondary" small>↺</Btn>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:28}}>

          {/* DASHBOARD */}
          {nav==="dashboard"&&!selectedComp&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
                <Stat label="Competitions" value={competitions.length} color={T.blue}/>
                <Stat label="Courses" value={courses.length} sub="in library" color={T.blue}/>
                <Stat label="Live Now" value={competitions.filter(c=>c.status==="live").length} color={T.green}/>
                <Stat label="Finished" value={competitions.filter(c=>c.status==="finished").length} color={T.textDk}/>
              </div>
              <Card>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:700}}>All Competitions</div>
                  <Btn onClick={()=>setShowNewComp(true)} small>+ New</Btn>
                </div>
                <table>
                  <thead><tr><th>Name</th><th>Format</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {competitions.length===0&&<tr><td colSpan={4} style={{textAlign:"center",color:T.textDk,padding:40}}>No competitions yet</td></tr>}
                    {competitions.map(c=>(
                      <tr key={c.id} style={{cursor:"pointer"}} onClick={()=>{setSelectedComp(c);setCompTab("teams");setNav("competitions");}}>
                        <td style={{fontWeight:600}}>{c.name}</td>
                        <td>{formatPill(c.format)}</td>
                        <td>{statusPill(c.status)}</td>
                        <td onClick={e=>e.stopPropagation()}><Btn onClick={()=>{setSelectedComp(c);setCompTab("teams");setNav("competitions");}} small>Open →</Btn></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* COURSES */}
          {nav==="courses"&&!selectedComp&&(
            courses.length===0?(
              <Card style={{padding:60,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>⛳</div>
                <div style={{fontSize:16,color:T.textMd,marginBottom:16}}>No courses in library yet</div>
                <Btn onClick={()=>setShowNewCourse(true)}>+ Add First Course</Btn>
              </Card>
            ):(
              <Card>
                <table>
                  <thead><tr><th>Course</th><th>Location</th><th>Par</th><th>Rating</th><th>Slope</th><th>Holes</th><th>Action</th></tr></thead>
                  <tbody>
                    {courses.map(c=>(
                      <tr key={c.id}>
                        <td style={{fontWeight:600}}>{c.name}</td>
                        <td style={{color:T.textMd}}>{c.location||"–"}</td>
                        <td>{c.par}</td><td>{c.rating}</td><td>{c.slope}</td>
                        <td>{Array.isArray(c.holes)?c.holes.length:"–"}</td>
                        <td><Btn onClick={()=>setEditCourse({...c,par:String(c.par),rating:String(c.rating),slope:String(c.slope)})} small>✏️ Edit</Btn></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          )}

          {/* COMPETITIONS LIST */}
          {nav==="competitions"&&!selectedComp&&(
            competitions.length===0?(
              <Card style={{padding:60,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>🏆</div>
                <div style={{fontSize:16,color:T.textMd,marginBottom:16}}>No competitions yet</div>
                <Btn onClick={()=>setShowNewComp(true)}>+ Create First Competition</Btn>
              </Card>
            ):(
              <Card>
                <table>
                  <thead><tr><th>Name</th><th>Format</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[...competitions].sort((a,b)=>{
                      const order={live:0,draft:1,finished:2};
                      const diff=(order[a.status]??1)-(order[b.status]??1);
                      return diff!==0?diff:a.name.localeCompare(b.name);
                    }).map(c=>(
                      <tr key={c.id}>
                        <td style={{fontWeight:700}}>{c.name}</td>
                        <td>{formatPill(c.format)}</td>
                        <td style={{color:T.textMd}}>{c.location||"–"}</td>
                        <td>{statusPill(c.status)}</td>
                        <td><div style={{display:"flex",gap:6}}>
                          <Btn onClick={()=>{setSelectedComp(c);setCompTab("teams");}} small>Open →</Btn>
                          {c.status==="draft"&&<Btn onClick={()=>updateCompStatus(c,"live")} variant="success" small>▶ Live</Btn>}
                          {c.status==="live"&&<Btn onClick={()=>updateCompStatus(c,"finished")} variant="danger" small>⏹ Finish</Btn>}
                          <Btn onClick={()=>deleteComp(c)} variant="danger" small>🗑</Btn>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          )}

          {/* COMPETITION DETAIL */}
          {selectedComp&&(
            <div>
              <div style={{background:T.navyMd,borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",gap:24,alignItems:"center",border:`1px solid ${T.border}`,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Format</div><div style={{fontWeight:700,marginTop:2}}>{FORMAT_LABEL[selectedComp.format] || selectedComp.format}</div></div>
                <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Location</div><div style={{fontWeight:700,marginTop:2}}>{selectedComp.location||"–"}</div></div>
                <div>
                  <div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>{isMultiTee(selectedComp.format)?"Tees":(compCourses.length!==1?"Courses":"Course")}</div>
                  <div style={{fontWeight:700,marginTop:2,fontSize:13}}>
                    {compCourses.length===0 ? <span style={{color:T.red}}>⚠️ No {isMultiTee(selectedComp.format)?"tee":"course"} set</span> :
                      compCourses.map(cc=>{
                        const c = courses.find(x=>x.id===cc.course_id);
                        const prefix = isMultiTee(selectedComp.format) ? `Tee ${cc.day}: ` : isMultiDay(selectedComp.format) ? `Day ${cc.day}: ` : "";
                        return <div key={cc.id}>{prefix}{c?.name||"Unknown"}{c?` · Slope ${c.slope} · CR ${c.rating} · Par ${c.par}`:""}</div>;
                      })
                    }
                  </div>
                </div>
                <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Teams</div><div style={{fontWeight:700,marginTop:2}}>{teams.length}</div></div>
                <div><div style={{fontSize:10,color:T.textDk,textTransform:"uppercase",letterSpacing:1}}>Players</div><div style={{fontWeight:700,marginTop:2}}>{players.length}</div></div>
                {selectedComp.notes&&<div style={{flex:1,fontSize:12,color:T.textMd,fontStyle:"italic"}}>{selectedComp.notes}</div>}
                <Btn onClick={()=>{
                  const slots = isMultiTee(selectedComp.format) ? 8 : isMultiDay(selectedComp.format) ? 4 : 1;
                  const ids = Array(slots).fill("");
                  compCourses.forEach(cc=>{ if(cc.day>=1&&cc.day<=slots) ids[cc.day-1]=cc.course_id; });
                  setEditCompCourseIds(ids);
                  setShowEditCompCourses(true);
                }} variant="secondary" small>
                  ✏️ Change {isMultiTee(selectedComp.format)?"Tees":isMultiDay(selectedComp.format)?"Courses":"Course"}
                </Btn>
              </div>
              <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,marginBottom:20}}>
                <Tab label="Teams & Players" active={compTab==="teams"} onClick={()=>setCompTab("teams")} badge={teams.length||null}/>
                <Tab label="Sponsors" active={compTab==="sponsors"} onClick={()=>setCompTab("sponsors")} badge={sponsoredHoles.length||null}/>
                <Tab label="Auction" active={compTab==="auction"} onClick={()=>setCompTab("auction")} badge={auctionItems.length||null}/>
                <Tab label="Live Scores" active={compTab==="scores"} onClick={()=>setCompTab("scores")}/>
              </div>

              {/* TEAMS TAB */}
              {compTab==="teams"&&(
                teams.length===0?(
                  <Card style={{padding:60,textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:12}}>👥</div>
                    <div style={{fontSize:16,color:T.textMd,marginBottom:16}}>No teams yet</div>
                    <Btn onClick={()=>setShowNewTeam(true)}>+ Add First Team</Btn>
                  </Card>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
                    {teams.map(team=>{
                      const tp=players.filter(p=>p.team_id===team.id);
                      const allowance=selectedComp.format==="scramble"?Math.round(tp.reduce((s,p)=>s+(parseFloat(p.handicap)||0),0)/10):null;
                      return(
                        <Card key={team.id}>
                          <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div style={{cursor:"pointer"}} onClick={()=>setEditTeam({...team})}>
                              <div style={{fontWeight:800,fontSize:14,color:T.blue,textDecoration:"underline dotted"}}>⚑ {team.name}</div>
                              <div style={{fontSize:11,color:T.textMd,marginTop:3}}>
                                PIN: <span style={{fontFamily:"monospace",fontWeight:700,color:T.amber,letterSpacing:2}}>{team.pin||"—"}</span>
                                {allowance!=null&&allowance>0&&<span style={{marginLeft:8,color:T.textDk}}>· Scramble allow -{allowance}</span>}
                              </div>
                            </div>
                            <Btn onClick={()=>setShowNewPlayer(team)} small>+ Player</Btn>
                          </div>
                          {tp.length===0&&<div style={{padding:"14px 16px",color:T.textDk,fontSize:12}}>No players yet</div>}
                          {tp.map((p,i)=>{
                            const pCourseObj = p.course_id ? courses.find(c => c.id === p.course_id) : null;
                            const teeLabel = pCourseObj ? (pCourseObj.name.match(/\(([^)]+)\)/)?.[1] || pCourseObj.name) : null;
                            const needsTee = isMultiTee(selectedComp.format) && !p.course_id;
                            return (
                              <div key={p.id} style={{padding:"9px 16px",borderBottom:i<tp.length-1?`1px solid ${T.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <div>
                                  <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                    <span>{p.name}</span>
                                    {teeLabel && <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:6,background:T.blue,color:T.white,letterSpacing:0.3}}>{teeLabel}</span>}
                                    {needsTee && <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:6,background:T.amber,color:T.white,letterSpacing:0.3}}>NO TEE</span>}
                                  </div>
                                  <div style={{fontSize:11,color:T.textMd}}>HCP {p.handicap??"–"}{p.company?` · ${p.company}`:""}</div>
                                </div>
                                <button onClick={()=>deletePlayer(p.id)} style={{background:"none",border:"none",color:T.textDk,cursor:"pointer",fontSize:14}}>✕</button>
                              </div>
                            );
                          })}
                        </Card>
                      );
                    })}
                  </div>
                )
              )}

              {/* SPONSORS TAB */}
              {compTab==="sponsors"&&(
                <div>
                  {sponsoredHoles.length===0?(
                    <Card style={{padding:60,textAlign:"center"}}>
                      <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                      <div style={{fontSize:16,color:T.textMd,marginBottom:16}}>No sponsored holes yet</div>
                      <Btn onClick={()=>setShowNewSponsor(true)}>+ Add First Sponsor</Btn>
                    </Card>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
                      {sponsoredHoles.map(sh=>(
                        <Card key={sh.id}>
                          <div style={{background:sh.sponsor_color,padding:"13px 16px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:1}}>Hole {sh.hole_index+1}</div>
                              <div style={{fontSize:16,fontWeight:800,color:T.white,marginTop:2}}>{sh.type==="nearest_pin"?"🎯 Nearest the Pin":sh.type==="longest_drive"?"🏌️ Longest Drive":"🏅 Hole Sponsor"}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>Sponsored by {sh.sponsor_name||"TBC"}</div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                              {sh.sponsor_logo&&<img src={sh.sponsor_logo} alt="logo" style={{height:36,objectFit:"contain",background:"rgba(255,255,255,0.9)",borderRadius:6,padding:"2px 6px"}}/>}
                              <button onClick={()=>deleteSponsor(sh.id)} style={{background:"rgba(0,0,0,0.25)",border:"none",color:T.white,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:12}}>✕</button>
                            </div>
                          </div>
                          <div style={{padding:"11px 16px",fontSize:12,color:T.textMd}}>{sh.prize_desc||"Prize TBC"}</div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AUCTION TAB */}
              {compTab==="auction"&&(
                <AuctionTab
                  auctionItems={auctionItems}
                  auctionBids={auctionBids}
                  onToggleClose={toggleAuctionClose}
                  onDelete={deleteAuctionItem}
                  onAdd={()=>setShowNewItem(true)}
                  T={T}
                />
              )}

              {/* SCORES TAB — format-aware */}
              {compTab==="scores" && selectedComp.format === "stableford_b3of4" && (
                <StablefordLiveScores
                  selectedComp={selectedComp}
                  teams={teams}
                  players={players}
                  scores={scores}
                  courses={courses}
                  compCourses={compCourses}
                />
              )}
              {compTab==="scores" && selectedComp.format !== "stableford_b3of4" && (
                <Card>
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700}}>Live Scores — {selectedComp.name}</div>
                  <table>
                    <thead><tr><th>Team</th><th>Holes</th><th>Gross</th><th>Allowance</th><th>Net</th><th>vs Par</th></tr></thead>
                    <tbody>
                      {teams.length===0&&<tr><td colSpan={6} style={{textAlign:"center",color:T.textDk,padding:30}}>No teams yet</td></tr>}
                      {teams.map(team=>{
                        const ts=scores.filter(s=>s.team_id===team.id&&s.gross_score!=null);
                        const tp=players.filter(p=>p.team_id===team.id);
                        const allowance=Math.round(tp.reduce((s,p)=>s+(parseFloat(p.handicap)||0),0)/10);
                        const gross=ts.reduce((s,sc)=>s+sc.gross_score,0);
                        const holes=new Set(ts.map(s=>s.hole_index)).size;
                        const net=gross-allowance;
                        const vsPar=holes>0?net-70:null;
                        return(<tr key={team.id}>
                          <td style={{fontWeight:600}}>⚑ {team.name}</td>
                          <td>{holes}/18</td>
                          <td style={{fontWeight:700}}>{holes>0?gross:"–"}</td>
                          <td style={{color:T.amber}}>-{allowance}</td>
                          <td style={{fontWeight:700}}>{holes>0?net:"–"}</td>
                          <td style={{fontWeight:700,color:vsPar==null?T.textDk:vsPar<0?T.green:vsPar===0?T.blue:T.red}}>{vsPar==null?"–":vsPar===0?"E":vsPar>0?`+${vsPar}`:vsPar}</td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:toast.type==="error"?T.red:T.green,color:T.white,padding:"12px 20px",borderRadius:10,fontWeight:600,fontSize:13,boxShadow:"0 8px 24px rgba(0,0,0,0.3)",zIndex:2000}}>{toast.type==="error"?"❌":"✓"} {toast.msg}</div>}

      {/* MODALS */}
      {showNewComp&&(
        <Modal title="Create New Competition" onClose={()=>setShowNewComp(false)}>
          <Inp label="Competition Name" value={newComp.name} onChange={v=>setNewComp(p=>({...p,name:v}))} placeholder="e.g. Corporate Stableford 2026" required/>
          <Inp label="Location" value={newComp.location} onChange={v=>setNewComp(p=>({...p,location:v}))} placeholder="e.g. Castle Golf Club, Dublin"/>
          <Sel label="Format" value={newComp.format} onChange={v=>setNewComp(p=>({...p,format:v}))} options={[
            {value:"scramble",         label:"Scramble — one ball, team of 4, drive tracker"},
            {value:"stableford_b3of4", label:"Stableford – Best 3 of 4 — individual stableford, best 3 count per hole"},
            {value:"hole_points_race", label:"Hole Points Race — wRyder Cup style"},
          ]}/>
          <Inp label="Notes (optional)" value={newComp.notes} onChange={v=>setNewComp(p=>({...p,notes:v}))} placeholder="Any notes..."/>
          {isSingleCourse(newComp.format)&&(
            <Sel label="Course" value={newComp.course_id} onChange={v=>setNewComp(p=>({...p,course_id:v}))} options={[{value:"",label:"— Select course —"},...courses.map(c=>({value:c.id,label:`${c.name} (Par ${c.par} · Slope ${c.slope} · CR ${c.rating})`}))]}/>
          )}
          {newComp.format==="hole_points_race"&&(
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Courses — one per day</label>
              {[0,1,2,3].map(day=>(
                <div key={day} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.textMd,width:48,flexShrink:0}}>Day {day+1}</div>
                  <select value={newComp.course_ids[day]||""} onChange={e=>{const ids=[...newComp.course_ids];ids[day]=e.target.value;setNewComp(p=>({...p,course_ids:ids}));}} style={{flex:1,background:T.input,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}>
                    <option value="">— Optional —</option>
                    {courses.map(c=><option key={c.id} value={c.id}>{c.name} (Par {c.par})</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          {newComp.format==="stableford_b3of4"&&(
            <>
              <div style={{padding:"10px 14px",background:T.navyMd,borderRadius:8,fontSize:11.5,color:T.textMd,marginBottom:14,lineHeight:1.6}}>
                ℹ️ <strong style={{color:T.text}}>Stableford – Best 3 of 4</strong>: each player plays their own ball. Team total per hole is the sum of the best 3 of 4 players' stableford points.<br/>
                Three leaderboards run from the same scores: <strong>TEAMS</strong> (90% allowance), <strong>Player Nett</strong> (100%), <strong>Player Gross</strong> (scratch).
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Tees in play — assign each player to one</label>
                {[0,1,2,3,4,5,6,7].map(idx=>(
                  <div key={idx} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.textMd,width:48,flexShrink:0}}>Tee {idx+1}</div>
                    <select
                      value={newComp.course_ids?.[idx]||""}
                      onChange={e=>{const ids=[...(newComp.course_ids||[])];while(ids.length<8)ids.push("");ids[idx]=e.target.value;setNewComp(p=>({...p,course_ids:ids}));}}
                      style={{flex:1,background:T.input,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}>
                      <option value="">— Optional —</option>
                      {courses.map(c=><option key={c.id} value={c.id}>{c.name} (Par {c.par} · CR {c.rating} · Slope {c.slope})</option>)}
                    </select>
                  </div>
                ))}
                <div style={{fontSize:11,color:T.textDk,marginTop:4,fontStyle:"italic"}}>
                  Add the tees that any player will use — Men's and Women's variants if mixed-gender. Each player will be assigned to one of these when added.
                </div>
              </div>
            </>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewComp(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createComp} disabled={!newComp.name}>Create Competition</Btn>
          </div>
        </Modal>
      )}

      {showNewCourse&&(
        <Modal title="Add Course to Library" onClose={()=>setShowNewCourse(false)} width={480}>
          <Inp label="Course Name" value={newCourse.name} onChange={v=>setNewCourse(p=>({...p,name:v}))} placeholder="e.g. Castle Golf Club" required/>
          <Inp label="Location" value={newCourse.location} onChange={v=>setNewCourse(p=>({...p,location:v}))} placeholder="e.g. Rathfarnham, Dublin"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <Inp label="Par" value={newCourse.par} onChange={v=>setNewCourse(p=>({...p,par:v}))} type="number"/>
            <Inp label="Course Rating" value={newCourse.rating} onChange={v=>setNewCourse(p=>({...p,rating:v}))}/>
            <Inp label="Slope" value={newCourse.slope} onChange={v=>setNewCourse(p=>({...p,slope:v}))} type="number"/>
          </div>
          <div style={{padding:"10px 14px",background:T.navyMd,borderRadius:8,fontSize:12,color:T.textMd,marginBottom:14}}>
            ℹ️ Holes created with default values (Par 4, SI 1–18). Edit them per-hole on the Edit screen — required for stableford to score correctly.
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewCourse(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createCourse}>Add Course</Btn>
          </div>
        </Modal>
      )}

      {editCourse&&(
        <Modal title={`Edit — ${editCourse.name}`} onClose={()=>setEditCourse(null)} width={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Course Name" value={editCourse.name} onChange={v=>setEditCourse(p=>({...p,name:v}))} required/>
            <Inp label="Location" value={editCourse.location||""} onChange={v=>setEditCourse(p=>({...p,location:v}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <Inp label="Par" value={editCourse.par} onChange={v=>setEditCourse(p=>({...p,par:v}))} type="number"/>
            <Inp label="Course Rating" value={editCourse.rating} onChange={v=>setEditCourse(p=>({...p,rating:v}))}/>
            <Inp label="Slope" value={editCourse.slope} onChange={v=>setEditCourse(p=>({...p,slope:v}))} type="number"/>
          </div>

          {editCourse.holes&&Array.isArray(editCourse.holes)&&(
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Hole Par & Stroke Index</label>
              <div style={{background:T.navyMd,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"40px repeat(18,1fr)",gap:0,background:T.navy,padding:"6px 10px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.textMd,textAlign:"center"}}></div>
                  {editCourse.holes.map(h=>(
                    <div key={h.h} style={{fontSize:10,fontWeight:700,color:T.textMd,textAlign:"center"}}>{h.h}</div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"40px repeat(18,1fr)",gap:0,padding:"6px 10px",borderTop:`1px solid ${T.border}`,alignItems:"center"}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.textMd}}>PAR</div>
                  {editCourse.holes.map((h,i)=>(
                    <input key={h.h} type="number" value={h.par} min={3} max={5}
                      onChange={e=>{const holes=[...editCourse.holes];holes[i]={...holes[i],par:parseInt(e.target.value)||4};setEditCourse(p=>({...p,holes}));}}
                      style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,color:T.white,fontSize:12,fontWeight:700,textAlign:"center",outline:"none",padding:"2px 0",fontFamily:"inherit"}}/>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"40px repeat(18,1fr)",gap:0,padding:"6px 10px",borderTop:`1px solid ${T.border}`,alignItems:"center"}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.textMd}}>SI</div>
                  {editCourse.holes.map((h,i)=>(
                    <input key={h.h} type="number" value={h.si} min={1} max={18}
                      onChange={e=>{const holes=[...editCourse.holes];holes[i]={...holes[i],si:parseInt(e.target.value)||i+1};setEditCourse(p=>({...p,holes}));}}
                      style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,color:T.amber,fontSize:12,fontWeight:700,textAlign:"center",outline:"none",padding:"2px 0",fontFamily:"inherit"}}/>
                  ))}
                </div>
              </div>
              <div style={{fontSize:11,color:T.textDk,marginTop:6}}>Par shown in white · SI shown in amber · Click any value to edit</div>
            </div>
          )}

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",alignItems:"center"}}>
            <Btn onClick={()=>deleteCourse(editCourse.id)} variant="danger">🗑 Delete Course</Btn>
            <div style={{flex:1}}/>
            <Btn onClick={()=>setEditCourse(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={updateCourse}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {showNewTeam&&(
        <Modal title="Add Team" onClose={()=>setShowNewTeam(false)} width={400}>
          <Inp label="Team Name" value={newTeam.name} onChange={v=>setNewTeam(p=>({...p,name:v}))} placeholder="e.g. Team Birdie" required/>
          <Inp label="PIN (4 digits)" value={newTeam.pin} onChange={v=>setNewTeam(p=>({...p,pin:v.slice(0,4)}))} placeholder="e.g. 1234"/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewTeam(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createTeam}>Add Team</Btn>
          </div>
        </Modal>
      )}

      {editTeam&&(
        <Modal title={`Edit Team — ${editTeam.name}`} onClose={()=>setEditTeam(null)} width={560}>
          <Inp label="Team Name" value={editTeam.name} onChange={v=>setEditTeam(p=>({...p,name:v}))} required/>
          <Inp label="PIN (4 digits)" value={editTeam.pin||""} onChange={v=>setEditTeam(p=>({...p,pin:v.slice(0,4)}))} placeholder="e.g. 1234"/>

          {players.filter(p=>p.team_id===editTeam.id).length > 0 && (
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Players</label>
              {players.filter(p=>p.team_id===editTeam.id).map(player=>(
                <EditPlayerRow
                  key={player.id}
                  player={player}
                  T={T}
                  compCourses={compCourses}
                  courses={courses}
                  isStableford={isMultiTee(selectedComp?.format)}
                  onSave={async (updated)=>{
                    try {
                      const patch = {
                        name: updated.name,
                        handicap: parseFloat(updated.handicap)||null,
                        company: updated.company,
                        email: updated.email,
                        course_id: updated.course_id || null,
                      };
                      await sb.patch("players", player.id, patch);
                      setPlayers(prev=>prev.map(p=>p.id===player.id?{...p,...patch}:p));
                    } catch(e) { showToast(e.message,"error"); }
                  }}
                />
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
            <Btn onClick={()=>deleteTeam(editTeam.id)} variant="danger">🗑 Delete Team</Btn>
            <div style={{flex:1}}/>
            <Btn onClick={()=>setEditTeam(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={updateTeam}>Save Team</Btn>
          </div>
        </Modal>
      )}

      {showNewPlayer&&(
        <Modal title={`Add Player to ${showNewPlayer.name}`} onClose={()=>setShowNewPlayer(null)} width={440}>
          <Inp label="Full Name" value={newPlayer.name} onChange={v=>setNewPlayer(p=>({...p,name:v}))} placeholder="e.g. Ted Wright" required/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Handicap Index" value={newPlayer.handicap} onChange={v=>setNewPlayer(p=>({...p,handicap:v}))} type="number" placeholder="e.g. 15.3"/>
            <Inp label="Company" value={newPlayer.company} onChange={v=>setNewPlayer(p=>({...p,company:v}))} placeholder="e.g. WTech"/>
          </div>
          <Inp label="Email (optional)" value={newPlayer.email} onChange={v=>setNewPlayer(p=>({...p,email:v}))} type="email"/>
          {isMultiTee(selectedComp?.format) && (
            <div style={{marginBottom:14}}>
              <label style={{display:"block", fontSize:12, fontWeight:700, color:T.textMd, marginBottom:6, letterSpacing:0.3}}>
                TEE / COURSE
              </label>
              <select
                value={newPlayer.course_id}
                onChange={e=>setNewPlayer(p=>({...p,course_id:e.target.value}))}
                style={{width:"100%", padding:"10px 12px", background:T.input, border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:14, fontFamily:"inherit", outline:"none"}}>
                <option value="">— Select tee —</option>
                {compCourses.map(cc => {
                  const c = courses.find(x => x.id === cc.course_id);
                  if (!c) return null;
                  return <option key={cc.id} value={c.id}>{c.name} (Par {c.par} · CR {c.rating} · Slope {c.slope})</option>;
                })}
              </select>
              <div style={{fontSize:11, color:T.textDk, marginTop:6}}>
                Pick which tee this player will use. If not selected, falls back to the first attached tee.
              </div>
              {compCourses.length === 0 && (
                <div style={{fontSize:11, color:"#fb923c", marginTop:6}}>
                  ⚠️ No tees attached to this competition yet. Add courses via "Change Courses" first.
                </div>
              )}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewPlayer(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={()=>createPlayer(showNewPlayer.id)}>Add Player</Btn>
          </div>
        </Modal>
      )}

      {showNewItem&&(
        <Modal title="Add Auction Item" onClose={()=>setShowNewItem(false)} width={500}>
          <Inp label="Title" value={newItem.title} onChange={v=>setNewItem(p=>({...p,title:v}))} placeholder="e.g. Weekend Break" required/>
          <Inp label="Description" value={newItem.description} onChange={v=>setNewItem(p=>({...p,description:v}))} placeholder="e.g. 2 nights for 2 in a 4-star hotel"/>
          <ImgUpload label="Item Photo" value={newItem.image} onChange={v=>setNewItem(p=>({...p,image:v}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Starting Bid (€)" value={newItem.start_bid} onChange={v=>setNewItem(p=>({...p,start_bid:v}))} type="number" placeholder="100"/>
            <Inp label="Closes At" value={newItem.closes_at} onChange={v=>setNewItem(p=>({...p,closes_at:v}))} placeholder="17:30"/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewItem(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createAuctionItem}>Add Item</Btn>
          </div>
        </Modal>
      )}

      {showNewSponsor&&(
        <Modal title="Add Sponsored Hole" onClose={()=>setShowNewSponsor(false)} width={480}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Sel label="Hole" value={newSponsor.hole_index} onChange={v=>setNewSponsor(p=>({...p,hole_index:v}))} options={Array.from({length:18},(_,i)=>({value:String(i),label:`Hole ${i+1}`}))}/>
            <Sel label="Type" value={newSponsor.type} onChange={v=>setNewSponsor(p=>({...p,type:v}))} options={[{value:"nearest_pin",label:"🎯 Nearest the Pin"},{value:"longest_drive",label:"🏌️ Longest Drive"},{value:"hole_sponsor",label:"🏅 Hole Sponsor"}]}/>
          </div>
          <Inp label="Sponsor Name" value={newSponsor.sponsor_name} onChange={v=>setNewSponsor(p=>({...p,sponsor_name:v}))} placeholder="e.g. Acme Ltd"/>
          <ImgUpload label="Sponsor Logo" value={newSponsor.sponsor_logo} onChange={v=>setNewSponsor(p=>({...p,sponsor_logo:v}))}/>
          <Inp label="Sponsor Colour" value={newSponsor.sponsor_color} onChange={v=>setNewSponsor(p=>({...p,sponsor_color:v}))} type="color"/>
          <Inp label="Prize Description" value={newSponsor.prize_desc} onChange={v=>setNewSponsor(p=>({...p,prize_desc:v}))} placeholder="e.g. Round of golf for 4"/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowNewSponsor(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createSponsor}>Add Sponsor</Btn>
          </div>
        </Modal>
      )}

      {showEditCompCourses&&selectedComp&&(
        <Modal title={`Change ${isMultiTee(selectedComp.format)?"Tees":isMultiDay(selectedComp.format)?"Courses":"Course"} — ${selectedComp.name}`} onClose={()=>setShowEditCompCourses(false)} width={500}>
          {isSingleCourse(selectedComp.format)?(
            <Sel label="Course" value={editCompCourseIds[0]} onChange={v=>{const ids=[...editCompCourseIds];ids[0]=v;setEditCompCourseIds(ids);}}
              options={[{value:"",label:"— Select course —"},...courses.map(c=>({value:c.id,label:`${c.name} (Par ${c.par} · Slope ${c.slope} · CR ${c.rating})`}))]}/>
          ):(
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textMd,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                {isMultiTee(selectedComp.format) ? "Tees in play" : "Courses — one per day"}
              </label>
              {Array.from({length: isMultiTee(selectedComp.format) ? 8 : 4}).map((_,idx)=>(
                <div key={idx} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.textMd,width:56,flexShrink:0}}>
                    {isMultiTee(selectedComp.format) ? `Tee ${idx+1}` : `Day ${idx+1}`}
                  </div>
                  <select value={editCompCourseIds[idx]||""} onChange={e=>{const ids=[...editCompCourseIds];while(ids.length<=idx)ids.push("");ids[idx]=e.target.value;setEditCompCourseIds(ids);}}
                    style={{flex:1,background:T.input,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}>
                    <option value="">— Optional —</option>
                    {courses.map(c=><option key={c.id} value={c.id}>{c.name} (Par {c.par})</option>)}
                  </select>
                </div>
              ))}
              {isMultiTee(selectedComp.format) && (
                <div style={{fontSize:11,color:T.textDk,marginTop:6,fontStyle:"italic"}}>
                  Add the tees in use — Men's and Women's variants if mixed-gender. Players are then assigned to one when added.
                </div>
              )}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowEditCompCourses(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={updateCompCourses}>Save Changes</Btn>
          </div>
        </Modal>
      )}

    </div>
  );
}
