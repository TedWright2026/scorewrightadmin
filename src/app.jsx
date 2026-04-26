import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SB_URL = "https://vhutunzzpzwjnrvjcgau.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodXR1bnp6cHp3am5ydmpjZ2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTQwMTcsImV4cCI6MjA5Mjc5MDAxN30.DhgwK2e_9PFV3A6FSIjehhqpv0Cpk-uKwWrAVzvQ77U";

const sb = {
  h: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
  async get(table, q = "") {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, { headers: this.h });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(table, data) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: { ...this.h, "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(table, id, data) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: this.h, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(table, id) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: this.h });
    if (!r.ok) throw new Error(await r.text());
  },
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  navy:    "#0F1E36",
  navyMd:  "#1B2E4A",
  navyLt:  "#243656",
  blue:    "#1B4B8A",
  blueLt:  "#2563EB",
  red:     "#E8422A",
  redLt:   "#FEE2DC",
  green:   "#16A34A",
  greenLt: "#DCFCE7",
  amber:   "#D97706",
  amberLt: "#FEF3C7",
  white:   "#FFFFFF",
  text:    "#F1F5F9",
  textMd:  "#94A3B8",
  textDk:  "#64748B",
  border:  "#1E3354",
  card:    "#162440",
  input:   "#0D1829",
};

const fmt = n => n == null ? "–" : n;
const pill = (label, bg, color="#fff") => (
  <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
);
const statusPill = s => {
  const map = { draft: [T.amber, T.amberLt, "#78350f"], live: [T.green, T.greenLt, "#14532d"], finished: [T.textDk, "#1e293b", T.textMd] };
  const [bg, bgLt, col] = map[s] || [T.textDk, "#1e293b", T.textMd];
  return <span style={{ background: bgLt, color: col, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${bg}33` }}>{s.toUpperCase()}</span>;
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, type = "text", placeholder = "", required = false, style = {} }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMd, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}{required && <span style={{ color: T.red }}> *</span>}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: T.input, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
  </div>
);

const Sel = ({ label, value, onChange, options, style = {} }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMd, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: T.input, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", appearance: "none" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", disabled = false, small = false }) => {
  const bg = variant === "primary" ? T.blue : variant === "danger" ? T.red : variant === "success" ? T.green : T.navyLt;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? T.navyLt : bg, color: T.white, border: "none", borderRadius: 8, padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 12 : 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
};

const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
    onClick={onClose}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width, maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
      onClick={e => e.stopPropagation()}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: T.text }}>{title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMd, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, ...style }}>{children}</div>
);

const Stat = ({ label, value, sub, color = T.blue }) => (
  <div style={{ background: T.navyMd, borderRadius: 10, padding: "16px 20px", border: `1px solid ${T.border}` }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMd, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textDk, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [view,          setView]          = useState("dashboard");
  const [competitions,  setCompetitions]  = useState([]);
  const [courses,       setCourses]       = useState([]);
  const [activeComp,    setActiveComp]    = useState(null);
  const [teams,         setTeams]         = useState([]);
  const [players,       setPlayers]       = useState([]);
  const [matches,       setMatches]       = useState([]);
  const [auctionItems,  setAuctionItems]  = useState([]);
  const [auctionBids,   setAuctionBids]   = useState([]);
  const [scores,        setScores]        = useState([]);
  const [sponsoredHoles,setSponsoredHoles]= useState([]);
  const [loading,       setLoading]       = useState(false);
  const [toast,         setToast]         = useState(null);

  // Modals
  const [showNewComp,   setShowNewComp]   = useState(false);
  const [showNewTeam,   setShowNewTeam]   = useState(false);
  const [showNewPlayer, setShowNewPlayer] = useState(null); // team
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [showNewItem,   setShowNewItem]   = useState(false);
  const [showSponsor,   setShowSponsor]   = useState(false);
  const [editTeam,      setEditTeam]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [comps, crs] = await Promise.all([
        sb.get("competitions", "select=*&order=created_at.desc"),
        sb.get("courses", "select=*&order=name"),
      ]);
      setCompetitions(comps);
      setCourses(crs);
      if (comps.length > 0 && !activeComp) setActiveComp(comps[0]);
    } catch(e) { showToast(e.message, "error"); }
    setLoading(false);
  };

  useEffect(() => {
    if (activeComp) loadCompData(activeComp.id);
  }, [activeComp]);

  const loadCompData = async (compId) => {
    try {
      const [t, p, m, ai, ab, sc, sh] = await Promise.all([
        sb.get("teams", `select=*&competition_id=eq.${compId}&order=name`),
        sb.get("players", `select=*&competition_id=eq.${compId}&order=name`),
        sb.get("matches", `select=*&competition_id=eq.${compId}&order=day,match_number`),
        sb.get("auction_items", `select=*&competition_id=eq.${compId}&order=sort_order`),
        sb.get("auction_bids", `select=*&competition_id=eq.${compId}&order=placed_at.desc`),
        sb.get("scores", `select=*&competition_id=eq.${compId}`),
        sb.get("sponsored_holes", `select=*&competition_id=eq.${compId}&order=hole_index`),
      ]);
      setTeams(t); setPlayers(p); setMatches(m);
      setAuctionItems(ai); setAuctionBids(ab);
      setScores(sc); setSponsoredHoles(sh);
    } catch(e) { showToast(e.message, "error"); }
  };

  // ── Forms ──────────────────────────────────────────────────
  const [newComp, setNewComp] = useState({ name: "", location: "", format: "scramble", start_date: "", end_date: "", handicap_allowance: "0.75", notes: "" });
  const [newTeam, setNewTeam] = useState({ name: "", pin: "" });
  const [newPlayer, setNewPlayer] = useState({ name: "", handicap: "", company: "", email: "", slot: "0" });
  const [newCourse, setNewCourse] = useState({ name: "", location: "", par: "72", rating: "70.0", slope: "125" });
  const [newItem, setNewItem] = useState({ title: "", description: "", emoji: "🏆", start_bid: "", closes_at: "17:30", sort_order: "0" });
  const [newSponsor, setNewSponsor] = useState({ hole_index: "0", type: "nearest_pin", sponsor_name: "", sponsor_color: "#2563eb", prize_desc: "" });

  // ── CRUD ───────────────────────────────────────────────────
  const createComp = async () => {
    if (!newComp.name) return;
    try {
      // Need an admin_id — use a placeholder for now
      const data = { ...newComp, admin_id: "00000000-0000-0000-0000-000000000000", handicap_allowance: parseFloat(newComp.handicap_allowance) };
      const res = await sb.post("competitions", [data]);
      setCompetitions(prev => [res[0], ...prev]);
      setActiveComp(res[0]);
      setShowNewComp(false);
      setNewComp({ name: "", location: "", format: "scramble", start_date: "", end_date: "", handicap_allowance: "0.75", notes: "" });
      showToast("Competition created!");
    } catch(e) { showToast(e.message, "error"); }
  };

  const updateCompStatus = async (status) => {
    try {
      await sb.patch("competitions", activeComp.id, { status });
      setActiveComp(prev => ({ ...prev, status }));
      setCompetitions(prev => prev.map(c => c.id === activeComp.id ? { ...c, status } : c));
      showToast(`Competition set to ${status}`);
    } catch(e) { showToast(e.message, "error"); }
  };

  const createTeam = async () => {
    if (!newTeam.name || !activeComp) return;
    try {
      const maxP = activeComp.format === "scramble" ? 4 : 2;
      const res = await sb.post("teams", [{ ...newTeam, competition_id: activeComp.id, max_players: maxP }]);
      setTeams(prev => [...prev, res[0]]);
      setShowNewTeam(false);
      setNewTeam({ name: "", pin: "" });
      showToast("Team created!");
    } catch(e) { showToast(e.message, "error"); }
  };

  const createPlayer = async (teamId) => {
    if (!newPlayer.name) return;
    try {
      const res = await sb.post("players", [{ ...newPlayer, competition_id: activeComp.id, team_id: teamId, handicap: parseFloat(newPlayer.handicap) || null, slot: parseInt(newPlayer.slot) }]);
      setPlayers(prev => [...prev, res[0]]);
      setShowNewPlayer(null);
      setNewPlayer({ name: "", handicap: "", company: "", email: "", slot: "0" });
      showToast("Player added!");
    } catch(e) { showToast(e.message, "error"); }
  };

  const deleteTeam = async (id) => {
    if (!confirm("Delete this team and all its players?")) return;
    try {
      await sb.del("teams", id);
      setTeams(prev => prev.filter(t => t.id !== id));
      setPlayers(prev => prev.filter(p => p.team_id !== id));
      showToast("Team deleted");
    } catch(e) { showToast(e.message, "error"); }
  };

  const deletePlayer = async (id) => {
    try {
      await sb.del("players", id);
      setPlayers(prev => prev.filter(p => p.id !== id));
      showToast("Player removed");
    } catch(e) { showToast(e.message, "error"); }
  };

  const createAuctionItem = async () => {
    if (!newItem.title || !activeComp) return;
    try {
      const res = await sb.post("auction_items", [{ ...newItem, competition_id: activeComp.id, start_bid: parseInt(newItem.start_bid) || 0, sort_order: parseInt(newItem.sort_order) || 0 }]);
      setAuctionItems(prev => [...prev, res[0]]);
      setShowNewItem(false);
      setNewItem({ title: "", description: "", emoji: "🏆", start_bid: "", closes_at: "17:30", sort_order: "0" });
      showToast("Auction item added!");
    } catch(e) { showToast(e.message, "error"); }
  };

  const toggleAuctionClose = async (item) => {
    try {
      await sb.patch("auction_items", item.id, { is_closed: !item.is_closed });
      setAuctionItems(prev => prev.map(i => i.id === item.id ? { ...i, is_closed: !i.is_closed } : i));
      showToast(item.is_closed ? "Item reopened" : "Item closed");
    } catch(e) { showToast(e.message, "error"); }
  };

  const createSponsoredHole = async () => {
    if (!activeComp) return;
    try {
      const res = await sb.post("sponsored_holes", [{ ...newSponsor, competition_id: activeComp.id, hole_index: parseInt(newSponsor.hole_index) }]);
      setSponsoredHoles(prev => [...prev, res[0]]);
      setShowSponsor(false);
      setNewSponsor({ hole_index: "0", type: "nearest_pin", sponsor_name: "", sponsor_color: "#2563eb", prize_desc: "" });
      showToast("Sponsored hole added!");
    } catch(e) { showToast(e.message, "error"); }
  };

  // ── Derived stats ───────────────────────────────────────────
  const totalTeams   = teams.length;
  const totalPlayers = players.length;
  const holesScored  = new Set(scores.filter(s => s.gross_score != null).map(s => `${s.team_id}_${s.hole_index}`)).size;
  const totalBids    = auctionBids.length;
  const topBidValue  = auctionBids.length ? Math.max(...auctionBids.map(b => b.amount)) : 0;

  // ── Nav items ───────────────────────────────────────────────
  const nav = [
    { id: "dashboard", icon: "⬛", label: "Dashboard" },
    { id: "competitions", icon: "🏆", label: "Competitions" },
    { id: "teams", icon: "👥", label: "Teams & Players" },
    { id: "courses", icon: "⛳", label: "Courses" },
    { id: "sponsors", icon: "🎯", label: "Sponsors" },
    { id: "auction", icon: "🎗️", label: "Auction" },
    { id: "scores", icon: "📊", label: "Live Scores" },
  ];

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: T.navy, fontFamily: "'DM Sans', system-ui, sans-serif", color: T.text, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        input, select, textarea { font-family: inherit; color: ${T.text}; }
        input::placeholder { color: ${T.textDk}; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; font-size: 11px; font-weight: 700; color: ${T.textMd}; text-transform: uppercase; letter-spacing: 1px; padding: 10px 16px; border-bottom: 1px solid ${T.border}; }
        td { padding: 12px 16px; border-bottom: 1px solid ${T.border}; font-size: 13px; color: ${T.text}; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: ${T.navyMd}; }
        button { font-family: inherit; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 220, background: T.navyMd, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
            <span style={{ color: T.text }}>wRight</span>
            <span style={{ color: T.red }}>Score</span>
          </div>
          <div style={{ fontSize: 10, color: T.textDk, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>Admin Portal</div>
        </div>

        {/* Competition selector */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.textDk, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Active Competition</div>
          <select value={activeComp?.id || ""} onChange={e => setActiveComp(competitions.find(c => c.id === e.target.value))}
            style={{ width: "100%", background: T.input, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
            {competitions.length === 0 && <option value="">No competitions yet</option>}
            {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", border: "none", background: view === n.id ? `${T.blue}22` : "none", color: view === n.id ? T.text : T.textMd, fontSize: 13, fontWeight: view === n.id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left", borderLeft: `3px solid ${view === n.id ? T.blue : "transparent"}`, transition: "all 0.12s" }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.textDk }}>
          {activeComp && statusPill(activeComp.status)}
          <div style={{ marginTop: 6 }}>v1.0 · Score wRight</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ height: 60, background: T.navyMd, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
            {nav.find(n => n.id === view)?.icon} {nav.find(n => n.id === view)?.label}
            {activeComp && <span style={{ fontSize: 13, fontWeight: 400, color: T.textMd, marginLeft: 12 }}>— {activeComp.name}</span>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {activeComp && <>
              {activeComp.status === "draft" && <Btn onClick={() => updateCompStatus("live")} variant="success" small>▶ Go Live</Btn>}
              {activeComp.status === "live" && <Btn onClick={() => updateCompStatus("finished")} small>⏹ Finish</Btn>}
              {activeComp.status === "finished" && <Btn onClick={() => updateCompStatus("draft")} variant="secondary" small>↺ Reopen</Btn>}
            </>}
            <Btn onClick={() => setShowNewComp(true)} small>+ New Competition</Btn>
            <Btn onClick={loadAll} variant="secondary" small>↺ Refresh</Btn>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
                <Stat label="Teams" value={totalTeams} sub={`${activeComp?.format || "–"} format`} color={T.blue} />
                <Stat label="Players" value={totalPlayers} sub="registered" color={T.blue} />
                <Stat label="Holes Scored" value={holesScored} sub="team / hole combos" color={T.green} />
                <Stat label="Auction Bids" value={totalBids} sub="total placed" color={T.amber} />
                <Stat label="Top Bid" value={totalBids ? `€${topBidValue}` : "–"} sub="highest single bid" color={T.red} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Recent competitions */}
                <Card>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>All Competitions</div>
                    <Btn onClick={() => setShowNewComp(true)} small>+ New</Btn>
                  </div>
                  <table>
                    <thead><tr><th>Name</th><th>Format</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {competitions.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.textDk, padding: 30 }}>No competitions yet — create one to get started</td></tr>}
                      {competitions.map(c => (
                        <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => { setActiveComp(c); setView("teams"); }}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td><span style={{ background: c.format === "scramble" ? T.amberLt : T.greenLt, color: c.format === "scramble" ? "#78350f" : "#14532d", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{c.format}</span></td>
                          <td style={{ color: T.textMd }}>{c.start_date || "–"}</td>
                          <td>{statusPill(c.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {/* Quick stats for active comp */}
                <Card>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Active Competition — {activeComp?.name || "None selected"}</div>
                  </div>
                  {activeComp ? (
                    <div style={{ padding: 20 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                        {[
                          { label: "Format", value: activeComp.format },
                          { label: "Status", value: activeComp.status.toUpperCase() },
                          { label: "Teams", value: totalTeams },
                          { label: "Players", value: totalPlayers },
                          { label: "Auction Items", value: auctionItems.length },
                          { label: "Sponsored Holes", value: sponsoredHoles.length },
                        ].map(s => (
                          <div key={s.label} style={{ background: T.navyMd, borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, color: T.textDk, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                      {activeComp.notes && <div style={{ background: T.navyMd, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.textMd }}>{activeComp.notes}</div>}
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: "center", color: T.textDk }}>Select a competition from the sidebar</div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ── TEAMS & PLAYERS ── */}
          {view === "teams" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: T.textMd }}>{totalTeams} teams · {totalPlayers} players · {activeComp?.format === "scramble" ? "4 players per team · PIN login" : "2 players per team"}</div>
                <Btn onClick={() => setShowNewTeam(true)}>+ Add Team</Btn>
              </div>
              {teams.length === 0 && (
                <Card style={{ padding: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                  <div style={{ fontSize: 16, color: T.textMd, marginBottom: 16 }}>No teams yet</div>
                  <Btn onClick={() => setShowNewTeam(true)}>+ Add First Team</Btn>
                </Card>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {teams.map(team => {
                  const teamPlayers = players.filter(p => p.team_id === team.id);
                  const allowance = Math.round(teamPlayers.reduce((s, p) => s + (parseFloat(p.handicap) || 0), 0) / 10);
                  return (
                    <Card key={team.id}>
                      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>⚑ {team.name}</div>
                          <div style={{ fontSize: 11, color: T.textMd, marginTop: 2 }}>
                            PIN: <span style={{ fontFamily: "monospace", fontWeight: 700, color: T.amber }}>{team.pin || "—"}</span>
                            {activeComp?.format === "scramble" && allowance > 0 && <span style={{ marginLeft: 10 }}>Allow: -{allowance}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn onClick={() => setShowNewPlayer(team)} small>+ Player</Btn>
                          <Btn onClick={() => deleteTeam(team.id)} variant="danger" small>✕</Btn>
                        </div>
                      </div>
                      <div>
                        {teamPlayers.length === 0 && (
                          <div style={{ padding: "16px 18px", color: T.textDk, fontSize: 13 }}>No players yet</div>
                        )}
                        {teamPlayers.map((p, i) => (
                          <div key={p.id} style={{ padding: "10px 18px", borderBottom: i < teamPlayers.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: T.textMd }}>HCP {p.handicap ?? "–"} {p.company && `· ${p.company}`}</div>
                            </div>
                            <button onClick={() => deletePlayer(p.id)} style={{ background: "none", border: "none", color: T.textDk, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── COURSES ── */}
          {view === "courses" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <Btn onClick={() => setShowNewCourse(true)}>+ Add Course</Btn>
              </div>
              <Card>
                <table>
                  <thead><tr><th>Course</th><th>Location</th><th>Par</th><th>Rating</th><th>Slope</th><th>Holes</th></tr></thead>
                  <tbody>
                    {courses.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: T.textMd }}>{c.location || "–"}</td>
                        <td>{c.par}</td>
                        <td>{c.rating}</td>
                        <td>{c.slope}</td>
                        <td>{Array.isArray(c.holes) ? c.holes.length : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── SPONSORS ── */}
          {view === "sponsors" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <Btn onClick={() => setShowSponsor(true)}>+ Add Sponsored Hole</Btn>
              </div>
              {sponsoredHoles.length === 0 ? (
                <Card style={{ padding: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontSize: 16, color: T.textMd, marginBottom: 16 }}>No sponsored holes yet</div>
                  <Btn onClick={() => setShowSponsor(true)}>+ Add First Sponsor</Btn>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {sponsoredHoles.map(sh => (
                    <Card key={sh.id}>
                      <div style={{ background: sh.sponsor_color, padding: "14px 18px", borderRadius: "12px 12px 0 0" }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 }}>Hole {sh.hole_index + 1}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>{sh.type === "nearest_pin" ? "🎯 Nearest the Pin" : sh.type === "longest_drive" ? "🏌️ Longest Drive" : sh.type}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Sponsored by {sh.sponsor_name || "TBC"}</div>
                      </div>
                      <div style={{ padding: "12px 18px", fontSize: 13, color: T.textMd }}>{sh.prize_desc || "Prize TBC"}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── AUCTION ── */}
          {view === "auction" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: T.textMd }}>{auctionItems.length} items · {totalBids} bids · Top bid: {totalBids ? `€${topBidValue}` : "–"}</div>
                <Btn onClick={() => setShowNewItem(true)}>+ Add Item</Btn>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {auctionItems.length === 0 && (
                    <Card style={{ padding: 60, textAlign: "center" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
                      <div style={{ fontSize: 16, color: T.textMd, marginBottom: 16 }}>No auction items yet</div>
                      <Btn onClick={() => setShowNewItem(true)}>+ Add First Item</Btn>
                    </Card>
                  )}
                  {auctionItems.map(item => {
                    const itemBids = auctionBids.filter(b => b.item_id === item.id).sort((a, b) => b.amount - a.amount);
                    const top = itemBids[0];
                    return (
                      <Card key={item.id}>
                        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ fontSize: 32, flexShrink: 0 }}>{item.emoji}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</div>
                              {item.is_closed && <span style={{ background: T.textDk + "33", color: T.textDk, fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10 }}>CLOSED</span>}
                            </div>
                            <div style={{ fontSize: 12, color: T.textMd, marginTop: 2 }}>{item.description}</div>
                            <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>⏰ Closes {item.closes_at} · Starting bid: €{item.start_bid}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: T.textDk }}>Current bid</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: top ? T.green : T.textDk }}>€{top ? top.amount : item.start_bid}</div>
                            <div style={{ fontSize: 11, color: T.textMd }}>{itemBids.length} bid{itemBids.length !== 1 ? "s" : ""}</div>
                            {top && <div style={{ fontSize: 11, color: T.amber, marginTop: 2 }}>🏆 {top.team_name}</div>}
                          </div>
                          <Btn onClick={() => toggleAuctionClose(item)} variant={item.is_closed ? "success" : "danger"} small>{item.is_closed ? "Reopen" : "Close"}</Btn>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Bid feed */}
                <Card>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, fontWeight: 700 }}>Live Bid Feed</div>
                  <div style={{ maxHeight: 500, overflowY: "auto" }}>
                    {auctionBids.length === 0 && <div style={{ padding: 30, textAlign: "center", color: T.textDk, fontSize: 13 }}>No bids yet</div>}
                    {auctionBids.map(bid => {
                      const item = auctionItems.find(i => i.id === bid.item_id);
                      return (
                        <div key={bid.id} style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{bid.team_name}</div>
                            <div style={{ fontSize: 11, color: T.textMd }}>{item?.emoji} {item?.title}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900, fontSize: 16, color: T.green }}>€{bid.amount}</div>
                            <div style={{ fontSize: 10, color: T.textDk }}>{new Date(bid.placed_at).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ── LIVE SCORES ── */}
          {view === "scores" && (
            <div>
              <div style={{ marginBottom: 20, fontSize: 13, color: T.textMd }}>{scores.filter(s => s.gross_score != null).length} scores recorded across {teams.length} teams</div>
              <Card>
                <table>
                  <thead><tr><th>Team</th><th>Holes</th><th>Gross Total</th><th>Allowance</th><th>Net</th><th>vs Par</th></tr></thead>
                  <tbody>
                    {teams.map(team => {
                      const teamScores = scores.filter(s => s.team_id === team.id && s.gross_score != null);
                      const teamPlayers = players.filter(p => p.team_id === team.id);
                      const allowance = Math.round(teamPlayers.reduce((s, p) => s + (parseFloat(p.handicap) || 0), 0) / 10);
                      const gross = teamScores.reduce((s, sc) => s + sc.gross_score, 0);
                      const holes = new Set(teamScores.map(s => s.hole_index)).size;
                      const net = gross - allowance;
                      const parPlayed = 70; // simplification — would use actual course data
                      const vsPar = holes > 0 ? net - parPlayed : null;
                      return (
                        <tr key={team.id}>
                          <td style={{ fontWeight: 600 }}>⚑ {team.name}</td>
                          <td>{holes}/18</td>
                          <td style={{ fontWeight: 700 }}>{holes > 0 ? gross : "–"}</td>
                          <td style={{ color: T.amber }}>-{allowance}</td>
                          <td style={{ fontWeight: 700 }}>{holes > 0 ? net : "–"}</td>
                          <td style={{ fontWeight: 700, color: vsPar == null ? T.textDk : vsPar < 0 ? T.green : vsPar === 0 ? T.blue : T.red }}>
                            {vsPar == null ? "–" : vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? T.red : T.green, color: T.white, padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 2000 }}>
          {toast.type === "error" ? "❌" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* New Competition */}
      {showNewComp && (
        <Modal title="Create New Competition" onClose={() => setShowNewComp(false)}>
          <Inp label="Competition Name" value={newComp.name} onChange={v => setNewComp(p => ({...p, name: v}))} placeholder="e.g. Castle Golf Club Charity Day 2026" required />
          <Inp label="Location" value={newComp.location} onChange={v => setNewComp(p => ({...p, location: v}))} placeholder="e.g. Rathfarnham, Dublin" />
          <Sel label="Format" value={newComp.format} onChange={v => setNewComp(p => ({...p, format: v}))}
            options={[{ value: "scramble", label: "Scramble (1 score per hole, team of 4)" }, { value: "hole_points_race", label: "Hole Points Race (wRyder Cup style)" }]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Inp label="Start Date" value={newComp.start_date} onChange={v => setNewComp(p => ({...p, start_date: v}))} type="date" />
            <Inp label="End Date" value={newComp.end_date} onChange={v => setNewComp(p => ({...p, end_date: v}))} type="date" />
          </div>
          {newComp.format === "hole_points_race" && (
            <Inp label="Handicap Allowance" value={newComp.handicap_allowance} onChange={v => setNewComp(p => ({...p, handicap_allowance: v}))} placeholder="0.75" />
          )}
          <Inp label="Notes" value={newComp.notes} onChange={v => setNewComp(p => ({...p, notes: v}))} placeholder="Any additional info..." />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowNewComp(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createComp}>Create Competition</Btn>
          </div>
        </Modal>
      )}

      {/* New Team */}
      {showNewTeam && (
        <Modal title="Add Team" onClose={() => setShowNewTeam(false)} width={400}>
          <Inp label="Team Name" value={newTeam.name} onChange={v => setNewTeam(p => ({...p, name: v}))} placeholder="e.g. Team Birdie" required />
          <Inp label="PIN (4 digits)" value={newTeam.pin} onChange={v => setNewTeam(p => ({...p, pin: v}))} placeholder="e.g. 1234" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowNewTeam(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createTeam}>Add Team</Btn>
          </div>
        </Modal>
      )}

      {/* New Player */}
      {showNewPlayer && (
        <Modal title={`Add Player to ${showNewPlayer.name}`} onClose={() => setShowNewPlayer(null)} width={440}>
          <Inp label="Full Name" value={newPlayer.name} onChange={v => setNewPlayer(p => ({...p, name: v}))} placeholder="e.g. Ted Wright" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Inp label="Handicap Index" value={newPlayer.handicap} onChange={v => setNewPlayer(p => ({...p, handicap: v}))} type="number" placeholder="e.g. 15.3" />
            <Sel label="Slot" value={newPlayer.slot} onChange={v => setNewPlayer(p => ({...p, slot: v}))}
              options={[0,1,2,3].map(i => ({ value: String(i), label: `Player ${i + 1}` }))} />
          </div>
          <Inp label="Company" value={newPlayer.company} onChange={v => setNewPlayer(p => ({...p, company: v}))} placeholder="e.g. WTech Fire Group" />
          <Inp label="Email (optional)" value={newPlayer.email} onChange={v => setNewPlayer(p => ({...p, email: v}))} type="email" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowNewPlayer(null)} variant="secondary">Cancel</Btn>
            <Btn onClick={() => createPlayer(showNewPlayer.id)}>Add Player</Btn>
          </div>
        </Modal>
      )}

      {/* New Auction Item */}
      {showNewItem && (
        <Modal title="Add Auction Item" onClose={() => setShowNewItem(false)} width={480}>
          <Inp label="Title" value={newItem.title} onChange={v => setNewItem(p => ({...p, title: v}))} placeholder="e.g. Weekend Break" required />
          <Inp label="Description" value={newItem.description} onChange={v => setNewItem(p => ({...p, description: v}))} placeholder="e.g. 2 nights for 2 in a 4-star hotel" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Inp label="Emoji" value={newItem.emoji} onChange={v => setNewItem(p => ({...p, emoji: v}))} placeholder="🏆" />
            <Inp label="Starting Bid (€)" value={newItem.start_bid} onChange={v => setNewItem(p => ({...p, start_bid: v}))} type="number" placeholder="100" />
            <Inp label="Closes At" value={newItem.closes_at} onChange={v => setNewItem(p => ({...p, closes_at: v}))} placeholder="17:30" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowNewItem(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createAuctionItem}>Add Item</Btn>
          </div>
        </Modal>
      )}

      {/* New Sponsored Hole */}
      {showSponsor && (
        <Modal title="Add Sponsored Hole" onClose={() => setShowSponsor(false)} width={440}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Sel label="Hole" value={newSponsor.hole_index} onChange={v => setNewSponsor(p => ({...p, hole_index: v}))}
              options={Array.from({length:18},(_,i)=>({ value: String(i), label: `Hole ${i+1}` }))} />
            <Sel label="Type" value={newSponsor.type} onChange={v => setNewSponsor(p => ({...p, type: v}))}
              options={[{ value: "nearest_pin", label: "🎯 Nearest the Pin" }, { value: "longest_drive", label: "🏌️ Longest Drive" }, { value: "custom", label: "Custom" }]} />
          </div>
          <Inp label="Sponsor Name" value={newSponsor.sponsor_name} onChange={v => setNewSponsor(p => ({...p, sponsor_name: v}))} placeholder="e.g. Acme Ltd" />
          <Inp label="Sponsor Colour" value={newSponsor.sponsor_color} onChange={v => setNewSponsor(p => ({...p, sponsor_color: v}))} type="color" />
          <Inp label="Prize Description" value={newSponsor.prize_desc} onChange={v => setNewSponsor(p => ({...p, prize_desc: v}))} placeholder="e.g. A round of golf for 4" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn onClick={() => setShowSponsor(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={createSponsoredHole}>Add Sponsor</Btn>
          </div>
        </Modal>
      )}

    </div>
  );
}
