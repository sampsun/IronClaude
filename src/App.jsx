import { useState, useEffect } from "react";

const DEFAULT_SPLITS = ["Push", "Pull", "Legs"];
const DEFAULT_MUSCLE_GROUPS = { Push: ["Chest", "Shoulders", "Triceps", "Upper Chest"], Pull: ["Back", "Biceps", "Rear Delts", "Lats", "Traps"], Legs: ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors"] };
const DEFAULT_EXERCISES = { Push: ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Lateral Raises", "Tricep Pushdown", "Chest Fly"], Pull: ["Deadlift", "Barbell Row", "Lat Pulldown", "Cable Row", "Bicep Curl", "Face Pull"], Legs: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise", "Lunges"] };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const T = {
  bg: "#f5f0e8", bgDeep: "#ede7d9", bgCard: "#faf7f2",
  ink: "#1c1612", inkMid: "#4a3f35", inkFaint: "#7a6e64", inkGhost: "#a89e94",
  rule: "#d4c9bb", ruleLight: "#e8e0d4",
  burgundy: "#7a1f2e", verdigris: "#2d6b5e", amber: "#b8620a",
  shadow: "rgba(28,22,18,0.08)", shadowMd: "rgba(28,22,18,0.16)",
};

const COLOR_POOL = [
  { accent: "#7a1f2e", bg: "rgba(122,31,46,0.07)",  border: "rgba(122,31,46,0.25)" },
  { accent: "#2d6b5e", bg: "rgba(45,107,94,0.07)",  border: "rgba(45,107,94,0.25)" },
  { accent: "#4a3278", bg: "rgba(74,50,120,0.07)",  border: "rgba(74,50,120,0.25)" },
  { accent: "#b8620a", bg: "rgba(184,98,10,0.07)",  border: "rgba(184,98,10,0.25)" },
  { accent: "#1a5276", bg: "rgba(26,82,118,0.07)",  border: "rgba(26,82,118,0.25)" },
  { accent: "#5d4037", bg: "rgba(93,64,55,0.07)",   border: "rgba(93,64,55,0.25)"  },
  { accent: "#2e6b30", bg: "rgba(46,107,48,0.07)",  border: "rgba(46,107,48,0.25)" },
  { accent: "#6b3a6b", bg: "rgba(107,58,107,0.07)", border: "rgba(107,58,107,0.25)"},
];
const MUSCLE_COLORS = ["#7a1f2e","#2d6b5e","#4a3278","#b8620a","#1a5276","#5d4037","#2e6b30","#6b3a6b","#7a5c1e","#1a5e5e"];

const FD = "'Playfair Display', 'Georgia', serif";
const FM = "'IBM Plex Mono', 'Courier New', monospace";
const FB = "'Crimson Pro', 'Palatino', serif";

function getColor(i) { return COLOR_POOL[i % COLOR_POOL.length]; }
function getMuscleColor(name, opts) { const i = opts.indexOf(name); return MUSCLE_COLORS[i < 0 ? 0 : i % MUSCLE_COLORS.length]; }

function getStorage()         { try { const r = localStorage.getItem("lifttracker_v2");          return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveStorage(d)       { try { localStorage.setItem("lifttracker_v2", JSON.stringify(d)); } catch {} }
function getExercises()       { try { const r = localStorage.getItem("lifttracker_exercises_v1"); return r ? JSON.parse(r) : DEFAULT_EXERCISES; } catch { return DEFAULT_EXERCISES; } }
function saveExercises(d)     { try { localStorage.setItem("lifttracker_exercises_v1", JSON.stringify(d)); } catch {} }
function getSplits()          { try { const r = localStorage.getItem("lifttracker_splits_v1");    return r ? JSON.parse(r) : DEFAULT_SPLITS; } catch { return DEFAULT_SPLITS; } }
function saveSplits(d)        { try { localStorage.setItem("lifttracker_splits_v1", JSON.stringify(d)); } catch {} }
function getTags()            { try { const r = localStorage.getItem("lifttracker_tags_v1");      return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveTags(d)          { try { localStorage.setItem("lifttracker_tags_v1", JSON.stringify(d)); } catch {} }
function getMuscleOptions()   { try { const r = localStorage.getItem("lifttracker_muscles_v1");   return r ? JSON.parse(r) : DEFAULT_MUSCLE_GROUPS; } catch { return DEFAULT_MUSCLE_GROUPS; } }
function saveMuscleOptions(d) { try { localStorage.setItem("lifttracker_muscles_v1", JSON.stringify(d)); } catch {} }

function formatDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function topWeight(s)    { if (!s) return null; if (s.sets?.length > 0) return Math.max(...s.sets.map(x => x.weight)); return s.weight || null; }
function sessionVolume(s){ if (s.sets?.length > 0) return s.sets.reduce((a,x)=>a+x.weight*x.reps,0); return (s.weight||0)*(s.sets_count||1)*(s.reps||0); }
function setsInline(s) {
  if (!s) return "";
  if (s.sets?.length > 0) {
    const same = s.sets.every(x => x.weight===s.sets[0].weight && x.reps===s.sets[0].reps);
    return same ? `${s.sets[0].weight} lbs · ${s.sets.length}×${s.sets[0].reps}` : s.sets.map(x=>`${x.weight}×${x.reps}`).join(" → ");
  }
  return `${s.weight} lbs · ${s.sets}×${s.reps}`;
}
function epley1RM(w,r) { if (!w||!r||r<=0) return null; if (r===1) return w; return Math.round(w*(1+r/30)); }
function best1RM(history) {
  if (!history?.length) return null; let best=null;
  history.forEach(s => { const sets=s.sets?.length>0?s.sets:[{weight:s.weight,reps:s.reps}]; sets.forEach(({weight,reps})=>{ const e=epley1RM(weight,reps); if(e&&(!best||e>best))best=e; }); });
  return best;
}
function getStagnationFlag(history) {
  if (!history||history.length<2) return null;
  const now=new Date(), twa=new Date(now); twa.setDate(now.getDate()-14);
  const recent=history.filter(s=>new Date(s.date)>=twa), older=history.filter(s=>new Date(s.date)<twa);
  if (recent.length===0) return null;
  const avgReps=recent.map(s=>{ const sets=s.sets?.length>0?s.sets:[{reps:s.reps||0}]; return sets.reduce((a,x)=>a+(x.reps||0),0)/sets.length; });
  if (avgReps.every(a=>a>=12)) return "ceiling";
  if (older.length>0) {
    const rTW=Math.max(...recent.map(s=>topWeight(s)||0)), oTW=Math.max(...older.map(s=>topWeight(s)||0));
    const rMR=Math.max(...recent.flatMap(s=>s.sets?.map(x=>x.reps)||[s.reps||0])), oMR=Math.max(...older.flatMap(s=>s.sets?.map(x=>x.reps)||[s.reps||0]));
    if (rTW<=oTW && rMR<=oMR) return "stagnant";
  }
  return null;
}
function getISOWeek(ds) {
  const d=new Date(ds), day=d.getDay()||7; d.setDate(d.getDate()+4-day);
  const ys=new Date(d.getFullYear(),0,1); return `${d.getFullYear()}-W${String(Math.ceil(((d-ys)/86400000+1)/7)).padStart(2,"0")}`;
}
function weekLabel(iw) {
  const [y,w]=iw.split("-W"); const s=new Date(parseInt(y),0,1+(parseInt(w)-1)*7);
  const m=new Date(s); m.setDate(s.getDate()-(s.getDay()||7)+1);
  return m.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function buildMuscleVolume(data,tags,exercises,splits) {
  const allM=new Set();
  splits.forEach(sp=>{ (exercises[sp]||[]).forEach(ex=>{ (tags[`${sp}__${ex}`]?.muscles||[]).forEach(m=>allM.add(m)); }); });
  const result={};
  allM.forEach(muscle=>{
    const sbd={}, sbw={};
    splits.forEach(sp=>{ (exercises[sp]||[]).forEach(ex=>{ if(!(tags[`${sp}__${ex}`]?.muscles||[]).includes(muscle)) return; (data[`${sp}__${ex}`]||[]).forEach(e=>{ const dk=e.date.slice(0,10); const sets=e.sets?e.sets.length:(parseInt(e.sets_count)||1); sbd[dk]=(sbd[dk]||0)+sets; const wk=getISOWeek(dk); sbw[wk]=(sbw[wk]||0)+sets; }); }); });
    if (!Object.keys(sbd).length) return;
    const sd=Object.keys(sbd).sort(), avg_s=Math.round(Object.values(sbd).reduce((a,b)=>a+b,0)/sd.length*10)/10;
    const wks=Object.keys(sbw).sort(), avg_w=Math.round(Object.values(sbw).reduce((a,b)=>a+b,0)/wks.length*10)/10;
    const rw=wks.slice(-8).map(w=>({week:w,label:weekLabel(w),sets:sbw[w]})), mws=Math.max(...rw.map(w=>w.sets),1);
    let wt=null; if(rw.length>=2){const l=rw[rw.length-1].sets,p=rw.slice(0,-1).reduce((a,w)=>a+w.sets,0)/(rw.length-1); wt=l>p*1.05?"up":l<p*0.95?"down":"flat";}
    result[muscle]={avgSetsPerSession:avg_s,avgSetsPerWeek:avg_w,recentWeeks:rw,maxWeekSets:mws,totalSessions:sd.length,weekTrend:wt};
  });
  return result;
}

function TagPill({label,color,small}) {
  const sz=small?{fontSize:"0.52rem",padding:"0.06rem 0.28rem"}:{fontSize:"0.6rem",padding:"0.1rem 0.38rem"};
  return <span style={{...sz,borderRadius:"2px",background:color+"14",color,border:`1px solid ${color}44`,letterSpacing:"0.07em",fontFamily:FM,lineHeight:1.5,whiteSpace:"nowrap",textTransform:"uppercase"}}>{label}</span>;
}

function TagSelector({label,options,selected,onChange,getOptionColor,colorAll}) {
  return (
    <div style={{marginBottom:"1rem"}}>
      <div style={{fontSize:"0.58rem",color:T.inkFaint,letterSpacing:"0.18em",marginBottom:"0.5rem",fontFamily:FM,textTransform:"uppercase"}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
        {options.map(opt=>{
          const active=selected.includes(opt), col=colorAll||getOptionColor(opt);
          return <button key={opt} onClick={()=>onChange(active?selected.filter(s=>s!==opt):[...selected,opt])} style={{padding:"0.28rem 0.6rem",borderRadius:"2px",cursor:"pointer",fontFamily:FM,fontSize:"0.65rem",letterSpacing:"0.07em",border:`1px solid ${active?col:T.rule}`,background:active?col+"14":"transparent",color:active?col:T.inkFaint,transition:"all 0.12s"}}>{opt}</button>;
        })}
      </div>
    </div>
  );
}

function MiniChart({history,color}) {
  if (!history||history.length<2) return null;
  const vals=history.map(h=>topWeight(h)), mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||1;
  const W=88,H=28;
  const pts=vals.map((v,i)=>{ const x=(i/(vals.length-1))*(W-6)+3, y=H-3-((v-mn)/rng)*(H-9); return `${x},${y}`; }).join(" ");
  return (
    <svg width={W} height={H} style={{overflow:"visible",opacity:0.8}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {vals.map((v,i)=>{ const x=(i/(vals.length-1))*(W-6)+3, y=H-3-((v-mn)/rng)*(H-9); return <circle key={i} cx={x} cy={y} r="2" fill={color}/>; })}
    </svg>
  );
}

function SetRow({set,index,color,onChange,onRemove,canRemove}) {
  const [fw,setFw]=useState(false), [fr,setFr]=useState(false);
  const inp=f=>({width:"100%",background:T.bgDeep,border:`1px solid ${f?color:T.rule}`,borderRadius:"2px",padding:"0.55rem 0.4rem",color:T.ink,fontSize:"1.05rem",fontFamily:FM,textAlign:"center",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s"});
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
      <div style={{width:"26px",flexShrink:0,fontSize:"0.54rem",color:index===0?color:T.inkGhost,fontFamily:FM,textAlign:"center",letterSpacing:"0.05em"}}>{index===0?"TOP":`D${index}`}</div>
      <div style={{flex:1}}><input type="number" value={set.weight} placeholder="lbs" onChange={e=>onChange({...set,weight:e.target.value})} onFocus={()=>setFw(true)} onBlur={()=>setFw(false)} style={inp(fw)}/></div>
      <div style={{color:T.inkGhost,fontSize:"0.9rem",flexShrink:0}}>×</div>
      <div style={{flex:1}}><input type="number" value={set.reps} placeholder="reps" onChange={e=>onChange({...set,reps:e.target.value})} onFocus={()=>setFr(true)} onBlur={()=>setFr(false)} style={inp(fr)}/></div>
      <button onClick={onRemove} disabled={!canRemove} style={{width:"24px",height:"24px",flexShrink:0,background:canRemove?"rgba(122,31,46,0.1)":"transparent",border:`1px solid ${canRemove?"rgba(122,31,46,0.3)":"transparent"}`,borderRadius:"50%",color:canRemove?T.burgundy:T.ruleLight,cursor:canRemove?"pointer":"default",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
    </div>
  );
}

function LogModal({exercise,split,splitColor,history,tags,onClose,onLog,onDeleteEntry,onEditDate}) {
  const color=splitColor.accent;
  const last=history?.length>0?history[history.length-1]:null;
  const lwds=last?.sets?.length>1&&!last.sets.every(s=>s.weight===last.sets[0].weight);
  const [weight,setWeight]=useState(last?String(topWeight(last)):"");
  const [numSets,setNumSets]=useState(last?.sets?String(last.sets.length):"");
  const [reps,setReps]=useState(last?.sets?String(last.sets[0]?.reps??""):"");
  const [dropSets,setDropSets]=useState(lwds?last.sets.map(s=>({weight:String(s.weight),reps:String(s.reps)})):[{weight:"",reps:""}]);
  const [isDrop,setIsDrop]=useState(false);
  const [note,setNote]=useState("");
  const [cde,setCde]=useState(null);
  const [ede,setEde]=useState(null);
  const [edv,setEdv]=useState("");
  const canSubmit=isDrop?dropSets.every(s=>s.weight&&s.reps):weight&&numSets&&reps;
  const pb=history?.length>0?Math.max(...history.map(h=>topWeight(h))):null;
  const bv=history?.length>0?Math.max(...history.map(h=>sessionVolume(h))):null;
  const e1=best1RM(history);
  const handleLog=()=>{ if(!canSubmit) return; const sets=isDrop?dropSets.map(s=>({weight:parseFloat(s.weight),reps:parseInt(s.reps)})):Array.from({length:parseInt(numSets)},()=>({weight:parseFloat(weight),reps:parseInt(reps)})); onLog({date:new Date().toISOString(),note,sets}); onClose(); };
  const inp=()=>({width:"100%",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",padding:"0.65rem",color:T.ink,fontSize:"1.1rem",fontFamily:FM,textAlign:"center",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s"});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"1rem"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1px solid ${T.rule}`,borderTop:`3px solid ${color}`,borderRadius:"3px",padding:"2rem",width:"100%",maxWidth:"460px",maxHeight:"90vh",overflowY:"auto",boxShadow:`0 24px 64px ${T.shadowMd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
          <div>
            <div style={{fontSize:"0.58rem",letterSpacing:"0.2em",color,fontFamily:FM,marginBottom:"0.3rem",textTransform:"uppercase"}}>{split}</div>
            <h2 style={{margin:0,fontSize:"1.65rem",fontFamily:FD,fontWeight:700,color:T.ink,letterSpacing:"-0.01em",lineHeight:1.1}}>{exercise}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.inkGhost,cursor:"pointer",fontSize:"1.4rem",lineHeight:1}}>×</button>
        </div>
        {(tags?.muscles?.length>0||tags?.days?.length>0)&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem",marginBottom:"1.25rem",paddingBottom:"1.25rem",borderBottom:`1px solid ${T.ruleLight}`}}>
            {(tags.muscles||[]).map(m=><TagPill key={m} label={m} color={tags.muscleColors?.[m]||T.inkMid}/>)}
            {(tags.days||[]).map(d=><TagPill key={d} label={d} color={T.inkFaint}/>)}
          </div>
        )}
        {last&&(
          <div style={{background:T.bgDeep,borderRadius:"2px",padding:"0.85rem 1rem",marginBottom:"1.25rem",borderLeft:`3px solid ${color}`}}>
            <div style={{fontSize:"0.56rem",color:T.inkFaint,letterSpacing:"0.15em",marginBottom:"0.3rem",fontFamily:FM,textTransform:"uppercase"}}>Last Session — {formatDate(last.date)}</div>
            <div style={{fontSize:"1rem",color:T.inkMid,fontFamily:FM,letterSpacing:"0.04em"}}>{setsInline(last)}</div>
            {last.note&&<div style={{fontSize:"0.78rem",color:T.inkFaint,marginTop:"0.25rem",fontStyle:"italic",fontFamily:FB}}>&ldquo;{last.note}&rdquo;</div>}
          </div>
        )}
        {pb&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.5rem",marginBottom:"1.5rem"}}>
            {[["Personal Best",`${pb}`,"lbs"],["Est. 1RM",e1?`${e1}`:"—",e1?"lbs":""],["Sessions",String(history.length),""],["Best Vol.",bv?(bv>=1000?`${(bv/1000).toFixed(1)}k`:String(bv)):"—",bv?"lbs":""]].map(([lbl,val,unit])=>(
              <div key={lbl} style={{background:T.bg,border:`1px solid ${T.ruleLight}`,borderRadius:"2px",padding:"0.6rem 0.5rem",textAlign:"center"}}>
                <div style={{fontSize:"0.48rem",color:T.inkFaint,letterSpacing:"0.12em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.3rem"}}>{lbl}</div>
                <div style={{fontSize:"1.1rem",color,fontFamily:FM,lineHeight:1}}>{val}</div>
                {unit&&<div style={{fontSize:"0.48rem",color:T.inkGhost,fontFamily:FM,marginTop:"0.1rem"}}>{unit}</div>}
              </div>
            ))}
          </div>
        )}
        {history?.length>=2&&(()=>{
          const PL=38,PR=12,PT=18,PB=28,PW=360,PH=110;
          const vals=history.map(h=>topWeight(h)), mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||10;
          const pw=PW-PL-PR, ph=PH-PT-PB;
          const pts=vals.map((v,i)=>({x:PL+(history.length===1?pw/2:(i/(vals.length-1))*pw),y:PT+ph-((v-mn)/rng)*ph,v,date:history[i].date}));
          const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
          const yt=[mn,mn+rng/2,mx].map(v=>({v:Math.round(v),y:PT+ph-((v-mn)/rng)*ph}));
          const di=history.length<=4?pts.map((_,i)=>i):[0,Math.floor((pts.length-1)/2),pts.length-1];
          const sd=iso=>{const d=new Date(iso);return `${d.getMonth()+1}/${d.getDate()}`;};
          return (
            <div style={{background:T.bg,border:`1px solid ${T.ruleLight}`,borderRadius:"2px",padding:"0.85rem 1rem",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"0.5rem",color:T.inkGhost,letterSpacing:"0.18em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.5rem"}}>Top Set Weight — Historical</div>
              <div style={{overflowX:"auto"}}>
                <svg width="100%" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{display:"block",minWidth:"240px"}}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.12"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
                  {yt.map((t,i)=><line key={i} x1={PL} y1={t.y} x2={PW-PR} y2={t.y} stroke={T.ruleLight} strokeWidth="1" strokeDasharray="3,3"/>)}
                  {yt.map((t,i)=><text key={i} x={PL-5} y={t.y+3} textAnchor="end" fill={T.inkGhost} fontSize="8" fontFamily="'IBM Plex Mono',monospace">{t.v}</text>)}
                  <polygon points={`${pts[0].x},${PT+ph} ${poly} ${pts[pts.length-1].x},${PT+ph}`} fill="url(#cg)"/>
                  <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="3" fill={T.bgCard} stroke={color} strokeWidth="1.5"/><text x={p.x} y={p.y-8} textAnchor="middle" fill={T.inkFaint} fontSize="7.5" fontFamily="'IBM Plex Mono',monospace">{p.v}</text></g>)}
                  {di.map(i=><text key={i} x={pts[i].x} y={PH-4} textAnchor="middle" fill={T.inkGhost} fontSize="7.5" fontFamily="'IBM Plex Mono',monospace">{sd(pts[i].date)}</text>)}
                  <line x1={PL} y1={PT+ph} x2={PW-PR} y2={PT+ph} stroke={T.rule} strokeWidth="1"/>
                </svg>
              </div>
            </div>
          );
        })()}
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:"0.58rem",color:T.inkFaint,letterSpacing:"0.18em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.85rem",paddingBottom:"0.5rem",borderBottom:`1px solid ${T.ruleLight}`}}>Record Today's Sets</div>
          {!isDrop?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.6rem",marginBottom:"0.75rem"}}>
              {[["Weight (lbs)",weight,setWeight],["Sets",numSets,setNumSets],["Reps",reps,setReps]].map(([lbl,val,set])=>(
                <div key={lbl}>
                  <div style={{fontSize:"0.53rem",color:T.inkFaint,letterSpacing:"0.12em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.35rem",textAlign:"center"}}>{lbl}</div>
                  <input type="number" value={val} onChange={e=>set(e.target.value)} placeholder="—" onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor=T.rule} style={inp()}/>
                </div>
              ))}
            </div>
          ):(
            <div style={{marginBottom:"0.75rem"}}>
              <div style={{display:"flex",gap:"1.2rem",paddingLeft:"30px",paddingRight:"32px",marginBottom:"0.35rem"}}>
                <span style={{flex:1,fontSize:"0.5rem",color:T.inkGhost,textAlign:"center",fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.1em"}}>Weight (lbs)</span>
                <span style={{width:"14px"}}/>
                <span style={{flex:1,fontSize:"0.5rem",color:T.inkGhost,textAlign:"center",fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reps</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                {dropSets.map((set,i)=><SetRow key={i} set={set} index={i} color={color} onChange={val=>setDropSets(dropSets.map((s,idx)=>idx===i?val:s))} onRemove={()=>setDropSets(dropSets.filter((_,idx)=>idx!==i))} canRemove={dropSets.length>1}/>)}
              </div>
              <button onClick={()=>{ const p=dropSets[dropSets.length-1]; setDropSets([...dropSets,{weight:p.weight,reps:p.reps}]); }} style={{width:"100%",marginTop:"0.5rem",padding:"0.45rem",background:"transparent",border:`1px dashed ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.65rem",fontFamily:FM,letterSpacing:"0.1em",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.rule;e.currentTarget.style.color=T.inkFaint;}}>+ Add Another Drop Set</button>
            </div>
          )}
          <button onClick={()=>{ setIsDrop(m=>!m); if(!isDrop) setDropSets([{weight:weight||"",reps:reps||""}]); else { setWeight(dropSets[0]?.weight||""); setReps(dropSets[0]?.reps||""); setNumSets(""); } }} style={{background:"none",border:"none",color:isDrop?T.burgundy:T.inkFaint,cursor:"pointer",fontSize:"0.65rem",letterSpacing:"0.08em",fontFamily:FM,padding:"0 0 0.75rem 0",transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color=isDrop?"#a31d2d":T.inkMid} onMouseLeave={e=>e.currentTarget.style.color=isDrop?T.burgundy:T.inkFaint}>{isDrop?"✕ Cancel Drop Sets":"+ Add Drop Sets"}</button>
          <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Note — e.g. 'paused reps', 'cable variation'" style={{width:"100%",background:T.bgDeep,border:`1px solid ${T.ruleLight}`,borderRadius:"2px",padding:"0.6rem 0.8rem",color:T.inkMid,fontSize:"0.88rem",outline:"none",boxSizing:"border-box",fontFamily:FB,fontStyle:"italic"}} onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor=T.ruleLight}/>
        </div>
        <button disabled={!canSubmit} onClick={handleLog} style={{width:"100%",padding:"0.9rem",background:canSubmit?color:T.bgDeep,border:`1px solid ${canSubmit?color:T.rule}`,borderRadius:"2px",color:canSubmit?T.bgCard:T.inkGhost,fontSize:"0.72rem",fontFamily:FM,letterSpacing:"0.18em",textTransform:"uppercase",cursor:canSubmit?"pointer":"not-allowed",transition:"all 0.15s"}}>Record Session</button>
        {history?.length>0&&(
          <div style={{marginTop:"2rem"}}>
            <div style={{fontSize:"0.56rem",color:T.inkGhost,letterSpacing:"0.18em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.75rem",paddingBottom:"0.5rem",borderBottom:`1px solid ${T.ruleLight}`}}>Session History</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.3rem",maxHeight:"220px",overflowY:"auto"}}>
              {[...history].map((h,ri)=>{
                const i=history.length-1-ri;
                return (
                  <div key={i} style={{padding:"0.55rem 0.75rem",background:T.bg,border:`1px solid ${T.ruleLight}`,borderRadius:"2px",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <div style={{flex:1,minWidth:0}}>
                      {ede===i?(
                        <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.15rem"}}>
                          <input type="date" value={edv} onChange={e=>setEdv(e.target.value)} style={{flex:1,background:T.bgDeep,border:`1px solid ${color}`,borderRadius:"2px",padding:"0.2rem 0.4rem",color:T.ink,fontSize:"0.72rem",outline:"none",colorScheme:"light",fontFamily:FM}}/>
                          <button onClick={()=>{ if(edv) onEditDate(i,edv); setEde(null); setEdv(""); }} style={{padding:"0.2rem 0.5rem",background:color+"14",border:`1px solid ${color}`,borderRadius:"2px",color,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM,letterSpacing:"0.08em"}}>Save</button>
                          <button onClick={()=>{ setEde(null); setEdv(""); }} style={{padding:"0.2rem 0.4rem",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.65rem"}}>✕</button>
                        </div>
                      ):(
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.15rem"}}>
                          <button onClick={()=>{ setEde(i); setEdv(h.date.slice(0,10)); setCde(null); }} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:"0.62rem",color:T.inkFaint,fontFamily:FM,textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:T.rule}}>{formatDate(h.date)}</button>
                          {h.note&&<span style={{fontSize:"0.62rem",color:T.inkGhost,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"130px",fontFamily:FB}}>{h.note}</span>}
                        </div>
                      )}
                      <div style={{fontSize:"0.85rem",color:T.inkMid,fontFamily:FM,letterSpacing:"0.04em"}}>{setsInline(h)}</div>
                    </div>
                    {cde===i?(
                      <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
                        <button onClick={()=>{ onDeleteEntry(i); setCde(null); }} style={{padding:"0.2rem 0.45rem",background:"rgba(122,31,46,0.12)",border:`1px solid ${T.burgundy}`,borderRadius:"2px",color:T.burgundy,cursor:"pointer",fontSize:"0.58rem",fontFamily:FM,letterSpacing:"0.08em"}}>Delete</button>
                        <button onClick={()=>setCde(null)} style={{padding:"0.2rem 0.4rem",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.65rem"}}>✕</button>
                      </div>
                    ):(
                      <button onClick={()=>setCde(i)} style={{flexShrink:0,width:"22px",height:"22px",background:"transparent",border:`1px solid ${T.ruleLight}`,borderRadius:"50%",color:T.inkGhost,cursor:"pointer",fontSize:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.burgundy;e.currentTarget.style.color=T.burgundy;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.ruleLight;e.currentTarget.style.color=T.inkGhost;}}>−</button>
                    )}
                  </div>
                );
              }).reverse()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TagEditorPanel({split,muscleOptions,tags,onChange,color}) {
  return (
    <div style={{background:T.bgDeep,borderRadius:"2px",padding:"1rem 1.1rem",marginTop:"0.5rem",border:`1px solid ${T.rule}`}}>
      <TagSelector label="Muscle Groups" options={muscleOptions} selected={tags.muscles||[]} onChange={m=>onChange({...tags,muscles:m})} getOptionColor={opt=>(tags.muscleColors||{})[opt]||getMuscleColor(opt,muscleOptions)}/>
      <TagSelector label="Training Days" options={DAYS} selected={tags.days||[]} onChange={d=>onChange({...tags,days:d})} getOptionColor={()=>T.inkFaint} colorAll={T.inkMid}/>
    </div>
  );
}

function SplitsModal({splits,exercises,muscleOptions,onClose,onSave}) {
  const [ls,setLs]=useState([...splits]), [lm,setLm]=useState({...muscleOptions}), [nn,setNn]=useState(""), [ri,setRi]=useState(null), [rv,setRv]=useState(""), [cdi,setCdi]=useState(null), [em,setEm]=useState(null), [nm,setNm]=useState("");
  const addSplit=()=>{ const t=nn.trim(); if(!t||ls.includes(t)) return; setLs([...ls,t]); setLm(p=>({...p,[t]:[]})); setNn(""); };
  const renameSplit=idx=>{ const t=rv.trim(); if(!t||(ls.includes(t)&&t!==ls[idx])) return; const old=ls[idx]; setLs(ls.map((s,i)=>i===idx?t:s)); if(lm[old]){const m={...lm};m[t]=m[old];delete m[old];setLm(m);} setRi(null);setRv(""); };
  const sinp={background:T.bgCard,border:`1px solid ${T.rule}`,borderRadius:"2px",padding:"0.5rem 0.7rem",color:T.ink,fontSize:"0.85rem",outline:"none",fontFamily:FB};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1px solid ${T.rule}`,borderTop:`3px solid ${T.inkMid}`,borderRadius:"3px",padding:"2rem",width:"100%",maxWidth:"420px",maxHeight:"88vh",overflowY:"auto",boxShadow:`0 24px 64px ${T.shadowMd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.75rem"}}>
          <div>
            <div style={{fontFamily:FD,fontSize:"1.3rem",fontWeight:700,color:T.ink,letterSpacing:"-0.01em"}}>Manage Splits</div>
            <div style={{fontSize:"0.62rem",color:T.inkFaint,fontFamily:FM,marginTop:"0.2rem",letterSpacing:"0.1em"}}>Configure training splits & muscle groups</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.inkGhost,cursor:"pointer",fontSize:"1.4rem"}}>×</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1.5rem"}}>
          {ls.map((split,idx)=>{
            const col=getColor(idx).accent, muscles=lm[split]||[], isExp=em===split;
            return (
              <div key={split} style={{background:T.bg,borderRadius:"2px",border:`1px solid ${T.rule}`,borderLeft:`3px solid ${col}`,overflow:"hidden"}}>
                <div style={{padding:"0.65rem 0.9rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  {ri===idx?<input autoFocus value={rv} onChange={e=>setRv(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renameSplit(idx);if(e.key==="Escape"){setRi(null);setRv("");}}} style={{...sinp,flex:1,borderColor:col}}/>:<span style={{flex:1,fontFamily:FD,fontSize:"1rem",fontWeight:600,color:T.ink}}>{split}</span>}
                  <span style={{fontSize:"0.53rem",color:T.inkGhost,fontFamily:FM}}>{muscles.length} muscles</span>
                  {ri===idx?(
                    <div style={{display:"flex",gap:"0.3rem"}}>
                      <button onClick={()=>renameSplit(idx)} style={{padding:"0.2rem 0.5rem",background:col+"14",border:`1px solid ${col}`,borderRadius:"2px",color:col,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM}}>Save</button>
                      <button onClick={()=>{setRi(null);setRv("");}} style={{padding:"0.2rem 0.4rem",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer"}}>✕</button>
                    </div>
                  ):cdi===idx?(
                    <div style={{display:"flex",gap:"0.3rem"}}>
                      <button onClick={()=>{setLs(ls.filter((_,i)=>i!==idx));setCdi(null);}} style={{padding:"0.2rem 0.5rem",background:"rgba(122,31,46,0.1)",border:`1px solid ${T.burgundy}`,borderRadius:"2px",color:T.burgundy,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM}}>Remove</button>
                      <button onClick={()=>setCdi(null)} style={{padding:"0.2rem 0.4rem",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer"}}>✕</button>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:"0.3rem"}}>
                      <button onClick={()=>setEm(isExp?null:split)} style={{padding:"0.2rem 0.5rem",background:isExp?col+"14":"transparent",border:`1px solid ${isExp?col:T.rule}`,borderRadius:"2px",color:isExp?col:T.inkFaint,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM}}>Muscles</button>
                      <button onClick={()=>{setRi(idx);setRv(split);}} style={{padding:"0.2rem 0.5rem",background:"transparent",border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM}}>Rename</button>
                      <button onClick={()=>setCdi(idx)} disabled={ls.length<=1} style={{padding:"0.2rem 0.4rem",background:"transparent",border:`1px solid ${T.ruleLight}`,borderRadius:"2px",color:ls.length<=1?T.ruleLight:T.burgundy,cursor:ls.length<=1?"default":"pointer"}}>−</button>
                    </div>
                  )}
                </div>
                {isExp&&(
                  <div style={{padding:"0.6rem 0.9rem 0.85rem",borderTop:`1px solid ${T.ruleLight}`,background:T.bgDeep}}>
                    <div style={{fontSize:"0.53rem",color:T.inkFaint,letterSpacing:"0.15em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.5rem"}}>Muscle options for {split}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem",marginBottom:"0.6rem"}}>
                      {muscles.map((m,mi)=>(
                        <div key={m} style={{display:"flex",alignItems:"center",gap:"0.2rem",background:T.bgCard,border:`1px solid ${T.rule}`,borderRadius:"2px",padding:"0.15rem 0.4rem"}}>
                          <span style={{fontSize:"0.65rem",color:MUSCLE_COLORS[mi%MUSCLE_COLORS.length],fontFamily:FM}}>{m}</span>
                          <button onClick={()=>setLm(p=>({...p,[split]:p[split].filter(x=>x!==m)}))} style={{background:"none",border:"none",color:T.inkGhost,cursor:"pointer",fontSize:"0.7rem",padding:0,lineHeight:1}}>×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:"0.4rem"}}>
                      <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Add muscle group..." onKeyDown={e=>{if(e.key==="Enter"&&nm.trim()){setLm(p=>({...p,[split]:[...(p[split]||[]),nm.trim()]}));setNm("");}}} style={{...sinp,flex:1,fontSize:"0.78rem"}} onFocus={e=>e.target.style.borderColor=col} onBlur={e=>e.target.style.borderColor=T.rule}/>
                      <button onClick={()=>{if(nm.trim()){setLm(p=>({...p,[split]:[...(p[split]||[]),nm.trim()]}));setNm("");}}} style={{padding:"0.4rem 0.75rem",background:col+"14",border:`1px solid ${col}`,borderRadius:"2px",color:col,cursor:"pointer",fontFamily:FM,fontSize:"0.65rem"}}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
          <input value={nn} onChange={e=>setNn(e.target.value)} placeholder="New split name..." onKeyDown={e=>{if(e.key==="Enter")addSplit();}} style={{...sinp,flex:1}} onFocus={e=>e.target.style.borderColor=T.inkMid} onBlur={e=>e.target.style.borderColor=T.rule}/>
          <button onClick={addSplit} disabled={!nn.trim()||ls.includes(nn.trim())} style={{padding:"0.5rem 1rem",background:nn.trim()&&!ls.includes(nn.trim())?T.ink:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:nn.trim()&&!ls.includes(nn.trim())?T.bgCard:T.inkGhost,cursor:"pointer",fontFamily:FM,letterSpacing:"0.1em",fontSize:"0.72rem"}}>Add</button>
        </div>
        <button onClick={()=>onSave(ls,lm)} style={{width:"100%",padding:"0.85rem",background:T.ink,border:"none",borderRadius:"2px",color:T.bgCard,fontFamily:FM,letterSpacing:"0.15em",fontSize:"0.72rem",textTransform:"uppercase",cursor:"pointer"}}>Save Changes</button>
      </div>
    </div>
  );
}

function MuscleVolumeCard({muscle,stats,color}) {
  const {avgSetsPerSession,avgSetsPerWeek,recentWeeks,maxWeekSets,totalSessions,weekTrend}=stats;
  const bW=300,bH=80,pL=8,pR=8,pT=10,pB=24, plW=bW-pL-pR, plH=bH-pT-pB, n=recentWeeks.length;
  const LMN=10,LMX=20;
  const ls=avgSetsPerWeek<LMN?"under":avgSetsPerWeek>LMX?"over":"optimal";
  const lc=ls==="optimal"?T.verdigris:ls==="under"?T.burgundy:T.amber;
  const ll=ls==="optimal"?"In Range":ls==="under"?"Below Target":"Above Target";
  const ti=weekTrend==="up"?"↑":weekTrend==="down"?"↓":"→";
  const tc=weekTrend==="up"?T.verdigris:weekTrend==="down"?T.burgundy:T.inkGhost;
  return (
    <div style={{background:T.bgCard,border:`1px solid ${T.rule}`,borderLeft:`3px solid ${color}`,borderRadius:"2px",padding:"1.1rem 1.25rem",marginBottom:"0.5rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.85rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
          <span style={{fontFamily:FD,fontSize:"1.05rem",fontWeight:700,color:T.ink,letterSpacing:"-0.01em"}}>{muscle}</span>
          {weekTrend&&<span style={{fontSize:"0.9rem",color:tc}} title="This week vs recent average">{ti}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <span style={{fontSize:"0.53rem",padding:"0.15rem 0.45rem",borderRadius:"2px",background:lc+"14",color:lc,border:`1px solid ${lc}44`,fontFamily:FM,letterSpacing:"0.08em"}}>{ll}</span>
          <span style={{fontSize:"0.53rem",color:T.inkGhost,fontFamily:FM,letterSpacing:"0.08em"}}>{totalSessions} sessions</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"0.85rem"}}>
        {[["Avg Sets / Session",avgSetsPerSession],["Avg Sets / Week",avgSetsPerWeek],["Target Range","10–20"]].map(([lbl,val])=>(
          <div key={lbl} style={{background:T.bg,border:`1px solid ${T.ruleLight}`,borderRadius:"2px",padding:"0.55rem 0.5rem",textAlign:"center"}}>
            <div style={{fontSize:"0.46rem",color:T.inkFaint,letterSpacing:"0.12em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.25rem"}}>{lbl}</div>
            <div style={{fontFamily:FM,fontSize:lbl==="Target Range"?"0.9rem":"1.15rem",color:lbl==="Target Range"?T.inkGhost:color}}>{val}</div>
            {lbl==="Target Range"&&<div style={{fontSize:"0.42rem",color:T.inkGhost,fontFamily:FM,marginTop:"0.1rem"}}>sets/week</div>}
          </div>
        ))}
      </div>
      <div style={{marginBottom:"0.85rem"}}>
        <div style={{height:"3px",background:T.ruleLight,borderRadius:"2px",position:"relative"}}>
          <div style={{position:"absolute",left:`${(LMN/30)*100}%`,width:`${((LMX-LMN)/30)*100}%`,height:"100%",background:T.verdigris+"33",borderRadius:"2px"}}/>
          <div style={{position:"absolute",left:`${Math.min((avgSetsPerWeek/30)*100,100)}%`,top:"-4px",width:"11px",height:"11px",borderRadius:"50%",background:lc,transform:"translateX(-50%)",border:`2px solid ${T.bgCard}`,transition:"left 0.3s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.35rem"}}>
          <span style={{fontSize:"0.42rem",color:T.inkGhost,fontFamily:FM}}>0</span>
          <span style={{fontSize:"0.42rem",color:T.verdigris+"88",fontFamily:FM}}>10–20 sets/wk hypertrophy range</span>
          <span style={{fontSize:"0.42rem",color:T.inkGhost,fontFamily:FM}}>30+</span>
        </div>
      </div>
      {recentWeeks.length>0&&(
        <div>
          <div style={{fontSize:"0.46rem",color:T.inkGhost,letterSpacing:"0.15em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.4rem"}}>Sets per week — last {recentWeeks.length}</div>
          <svg width="100%" viewBox={`0 0 ${bW} ${bH}`} preserveAspectRatio="xMidYMid meet" style={{display:"block"}}>
            {recentWeeks.map((w,i)=>{
              const bw=Math.max(4,(plW/n)-5), bh=maxWeekSets>0?(w.sets/maxWeekSets)*plH:0;
              const x=pL+(i/n)*plW+(plW/n-bw)/2, y=pT+plH-bh, isl=i===recentWeeks.length-1;
              return <g key={w.week}><rect x={x} y={y} width={bw} height={Math.max(bh,2)} rx="1" fill={isl?color:color+"44"}/><text x={x+bw/2} y={pT+plH+12} textAnchor="middle" fill={T.inkGhost} fontSize="7" fontFamily="'IBM Plex Mono',monospace">{w.label}</text>{w.sets>0&&<text x={x+bw/2} y={y-3} textAnchor="middle" fill={isl?color:T.inkFaint} fontSize="7.5" fontFamily="'IBM Plex Mono',monospace">{w.sets}</text>}</g>;
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [splits,setSplits]=useState(()=>getSplits());
  const [activeTab,setActiveTab]=useState(()=>getSplits()[0]);
  const [data,setData]=useState(()=>getStorage());
  const [exercises,setExercises]=useState(()=>{ const s=getExercises(),sp=getSplits(),m={...s}; sp.forEach(p=>{if(!m[p])m[p]=[];}); return m; });
  const [tags,setTags]=useState(()=>getTags());
  const [muscleOptions,setMuscleOptions]=useState(()=>{ const s=getMuscleOptions(),sp=getSplits(),m={...s}; sp.forEach(p=>{if(!m[p])m[p]=[];}); return m; });
  const [modal,setModal]=useState(null);
  const [addingEx,setAddingEx]=useState(false);
  const [newExName,setNewExName]=useState("");
  const [newExTags,setNewExTags]=useState({muscles:[],days:[],muscleColors:{}});
  const [showNewExTags,setShowNewExTags]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editTagsFor,setEditTagsFor]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [moveMenu,setMoveMenu]=useState(null);
  const [dragIdx,setDragIdx]=useState(null);
  const [dragOverIdx,setDragOverIdx]=useState(null);
  const [dayFilter,setDayFilter]=useState("ALL");
  const [view,setView]=useState("tracker");
  const [showSplitsModal,setShowSplitsModal]=useState(false);

  useEffect(()=>{saveStorage(data);},[data]);
  useEffect(()=>{saveExercises(exercises);},[exercises]);
  useEffect(()=>{saveSplits(splits);},[splits]);
  useEffect(()=>{saveTags(tags);},[tags]);
  useEffect(()=>{saveMuscleOptions(muscleOptions);},[muscleOptions]);

  const splitColor=sp=>getColor(splits.indexOf(sp));
  const getExTags=(ex,sp)=>{ const t=tags[`${sp}__${ex}`]||{muscles:[],days:[],muscleColors:{}}; const opts=muscleOptions[sp]||[]; const mc={...t.muscleColors}; opts.forEach((m,i)=>{if(!mc[m])mc[m]=MUSCLE_COLORS[i%MUSCLE_COLORS.length];}); return {...t,muscleColors:mc}; };
  const setExTags=(ex,sp,nt)=>setTags(p=>({...p,[`${sp}__${ex}`]:nt}));
  const getHistory=(ex,sp)=>data[`${sp}__${ex}`]||[];
  const getLast=(ex,sp)=>{ const h=getHistory(ex,sp); return h.length>0?h[h.length-1]:null; };
  const getStreak=(ex,sp)=>{ const h=getHistory(ex,sp); if(h.length<2) return null; return topWeight(h[h.length-1])-topWeight(h[h.length-2]); };
  const logLift=(ex,sp,entry)=>setData(p=>{const k=`${sp}__${ex}`;return{...p,[k]:[...(p[k]||[]),entry]};});
  const deleteEntry=(ex,sp,idx)=>setData(p=>{const k=`${sp}__${ex}`;return{...p,[k]:(p[k]||[]).filter((_,i)=>i!==idx)};});
  const editDate=(ex,sp,idx,nds)=>setData(p=>{const k=`${sp}__${ex}`;return{...p,[k]:(p[k]||[]).map((e,i)=>{if(i!==idx)return e;const o=new Date(e.date);const[y,m,d]=nds.split("-").map(Number);o.setFullYear(y,m-1,d);return{...e,date:o.toISOString()};})};});
  const deleteExercise=(ex,sp)=>setExercises(p=>({...p,[sp]:p[sp].filter(e=>e!==ex)}));
  const moveExercise=(ex,from,to)=>{setExercises(p=>({...p,[from]:p[from].filter(e=>e!==ex),[to]:[...(p[to]||[]),ex]}));setMoveMenu(null);setConfirmDel(null);};
  const reorderExercise=(fi,ti)=>{ if(fi===ti)return; setExercises(p=>{const l=[...(p[activeTab]||[])];const[mv]=l.splice(fi,1);l.splice(ti,0,mv);return{...p,[activeTab]:l};}); };
  const saveSplitsHandler=(ns,nm)=>{ setExercises(p=>{const u={...p};ns.forEach(sp=>{if(!u[sp])u[sp]=[];});return u;}); setMuscleOptions(nm); setSplits(ns); if(!ns.includes(activeTab))setActiveTab(ns[0]); setShowSplitsModal(false); };
  const totalSessions=()=>{const d=new Set();Object.values(data).forEach(arr=>arr.forEach(e=>d.add(e.date.slice(0,10))));return d.size;};
  const totalLifts=()=>Object.values(data).reduce((a,b)=>a+b.length,0);
  const mostImproved=()=>{let best=null,bd=-Infinity;Object.entries(data).forEach(([k,arr])=>{if(arr.length<2)return;const d=topWeight(arr[arr.length-1])-topWeight(arr[0]);if(d>bd){bd=d;best=k.split("__")[1];}});return best;};
  const tabCols=splits.length<=4?`repeat(${splits.length},1fr)`:`repeat(${Math.ceil(splits.length/2)},1fr)`;

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.ink,fontFamily:FB}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&family=IBM+Plex+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:${T.bgDeep};} ::-webkit-scrollbar-thumb{background:${T.rule};border-radius:2px;}
        ::selection{background:${T.inkMid}22;}
        input[type=date]{color-scheme:light;}
      `}</style>

      {/* ── Header ── */}
      <div style={{borderBottom:`1px solid ${T.rule}`,background:T.bgCard,boxShadow:`0 1px 0 ${T.ruleLight}`}}>
        <div style={{maxWidth:"660px",margin:"0 auto",padding:"1.5rem 1.5rem 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"1.5rem"}}>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:"0.75rem"}}>
                <h1 style={{margin:0,fontFamily:FD,fontSize:"2rem",fontWeight:700,color:T.ink,letterSpacing:"-0.02em",lineHeight:1}}>IronClaude</h1>
                <span style={{fontSize:"0.54rem",color:T.inkGhost,fontFamily:FM,letterSpacing:"0.18em",textTransform:"uppercase",borderLeft:`1px solid ${T.rule}`,paddingLeft:"0.65rem"}}>Progressive Overload</span>
              </div>
            </div>
            <div style={{display:"flex",gap:"0"}}>
              {[["tracker","Tracker"],["overview","Progression"],["volume","Volume"]].map(([v,lbl])=>(
                <button key={v} onClick={()=>setView(v)} style={{padding:"0.45rem 0.9rem",background:"transparent",border:"none",borderBottom:view===v?`2px solid ${T.ink}`:"2px solid transparent",color:view===v?T.ink:T.inkFaint,cursor:"pointer",fontSize:"0.68rem",letterSpacing:"0.08em",fontFamily:FM,transition:"all 0.15s",marginBottom:"-1px"}}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid ${T.ruleLight}`}}>
            {[["Sessions",totalSessions()],["Lifts Logged",totalLifts()],["Most Improved",mostImproved()||"—"]].map(([lbl,val],i)=>(
              <div key={lbl} style={{padding:"0.85rem 0",textAlign:"center",borderRight:i<2?`1px solid ${T.ruleLight}`:"none"}}>
                <div style={{fontSize:"0.48rem",color:T.inkGhost,letterSpacing:"0.18em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.2rem"}}>{lbl}</div>
                <div style={{fontSize:lbl==="Most Improved"?"0.78rem":"1.3rem",color:T.ink,fontFamily:lbl==="Most Improved"?FB:FM,fontWeight:lbl==="Most Improved"?400:300,letterSpacing:lbl==="Most Improved"?0:"0.05em"}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tracker ── */}
      {view==="tracker"&&(
        <div style={{maxWidth:"660px",margin:"0 auto",padding:"1.5rem 1.5rem 3rem"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",marginBottom:"1.5rem"}}>
            <div style={{flex:1,display:"grid",gridTemplateColumns:tabCols,gap:"0.4rem"}}>
              {splits.map((tab,idx)=>{
                const col=getColor(idx),active=activeTab===tab;
                return <button key={tab} onClick={()=>{setActiveTab(tab);setEditing(false);setConfirmDel(null);setMoveMenu(null);setEditTagsFor(null);setDayFilter("ALL");}} style={{padding:"0.65rem 0.5rem",background:active?col.bg:"transparent",border:`1px solid ${active?col.accent:T.rule}`,borderRadius:"2px",color:active?col.accent:T.inkFaint,cursor:"pointer",fontFamily:FM,fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.15s",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tab}</button>;
              })}
            </div>
            <button onClick={()=>setShowSplitsModal(true)} style={{flexShrink:0,width:"36px",height:"36px",background:"transparent",border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.inkMid;e.currentTarget.style.color=T.inkMid;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.rule;e.currentTarget.style.color=T.inkFaint;}}>⚙</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <div style={{display:"flex",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",padding:"2px",gap:"2px"}}>
              {["ALL","TODAY"].map(f=><button key={f} onClick={()=>setDayFilter(f)} style={{padding:"0.25rem 0.65rem",borderRadius:"1px",border:"none",cursor:"pointer",fontFamily:FM,fontSize:"0.65rem",letterSpacing:"0.1em",transition:"all 0.15s",background:dayFilter===f?splitColor(activeTab).bg:"transparent",color:dayFilter===f?splitColor(activeTab).accent:T.inkFaint}}>{f}</button>)}
            </div>
            <button onClick={()=>{setEditing(e=>!e);setConfirmDel(null);setMoveMenu(null);setEditTagsFor(null);}} style={{background:"none",border:`1px solid ${editing?T.burgundy:T.rule}`,borderRadius:"2px",padding:"0.3rem 0.75rem",color:editing?T.burgundy:T.inkFaint,cursor:"pointer",fontSize:"0.65rem",letterSpacing:"0.1em",fontFamily:FM,transition:"all 0.15s"}}>{editing?"Done Editing":"Edit List"}</button>
          </div>
          <div style={{fontSize:"0.52rem",color:T.inkGhost,letterSpacing:"0.2em",fontFamily:FM,textTransform:"uppercase",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <span>{activeTab}</span>
            <div style={{flex:1,height:"1px",background:T.ruleLight}}/>
            <span>{(exercises[activeTab]||[]).length} exercises</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
            {(()=>{
              const todayAbbr=DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
              const list=(exercises[activeTab]||[]).filter(ex=>dayFilter==="ALL"||getExTags(ex,activeTab).days.includes(todayAbbr));
              if(dayFilter==="TODAY"&&list.length===0) return <div style={{textAlign:"center",color:T.inkGhost,padding:"2.5rem 0",fontSize:"0.88rem",fontStyle:"italic",fontFamily:FB}}>No exercises tagged for {todayAbbr}.<br/><span style={{fontSize:"0.75rem"}}>Switch to All or add day tags in Edit List.</span></div>;
              return list.map((exercise,exIdx)=>{
                const last=getLast(exercise,activeTab), streak=getStreak(exercise,activeTab), history=getHistory(exercise,activeTab);
                const col=splitColor(activeTab), isDropSet=last?.sets?.length>1&&!last.sets.every(s=>s.weight===last.sets[0].weight);
                const showingMove=moveMenu===exercise, otherSplits=splits.filter(s=>s!==activeTab);
                const isDragging=dragIdx===exIdx, isDragOver=dragOverIdx===exIdx;
                const exTags=getExTags(exercise,activeTab), showingTagEdit=editTagsFor===exercise;
                const stag=getStagnationFlag(history);
                return (
                  <div key={exercise} draggable={editing} onDragStart={()=>{setDragIdx(exIdx);setConfirmDel(null);setMoveMenu(null);setEditTagsFor(null);}} onDragOver={e=>{e.preventDefault();setDragOverIdx(exIdx);}} onDragLeave={()=>setDragOverIdx(null)} onDrop={()=>{reorderExercise(dragIdx,exIdx);setDragIdx(null);setDragOverIdx(null);}} onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}} style={{opacity:isDragging?0.4:1,transition:"opacity 0.15s"}}>
                    {isDragOver&&dragIdx!==exIdx&&<div style={{height:"2px",background:col.accent,borderRadius:"1px",marginBottom:"0.25rem"}}/>}
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      {editing&&<div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:"3px",padding:"0.25rem",cursor:"grab",opacity:0.3}}><div style={{width:"14px",borderTop:`1.5px solid ${T.inkMid}`}}/><div style={{width:"14px",borderTop:`1.5px solid ${T.inkMid}`}}/><div style={{width:"14px",borderTop:`1.5px solid ${T.inkMid}`}}/></div>}
                      {editing&&(confirmDel===exercise?(
                        <div style={{display:"flex",gap:"0.3rem",flexShrink:0}}>
                          <button onClick={()=>{deleteExercise(exercise,activeTab);setConfirmDel(null);}} style={{padding:"0.25rem 0.5rem",background:"rgba(122,31,46,0.1)",border:`1px solid ${T.burgundy}`,borderRadius:"2px",color:T.burgundy,cursor:"pointer",fontSize:"0.6rem",fontFamily:FM}}>Remove</button>
                          <button onClick={()=>setConfirmDel(null)} style={{padding:"0.25rem 0.5rem",background:T.bgDeep,border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer",fontSize:"0.65rem"}}>✕</button>
                        </div>
                      ):(
                        <button onClick={()=>{setConfirmDel(exercise);setMoveMenu(null);setEditTagsFor(null);}} style={{flexShrink:0,width:"26px",height:"26px",background:"transparent",border:`1px solid ${T.ruleLight}`,borderRadius:"50%",color:T.inkGhost,cursor:"pointer",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.burgundy;e.currentTarget.style.color=T.burgundy;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.ruleLight;e.currentTarget.style.color=T.inkGhost;}}>−</button>
                      ))}
                      <div onClick={()=>!editing&&setModal({exercise,split:activeTab})} style={{flex:1,background:T.bgCard,border:`1px solid ${isDragOver&&dragIdx!==exIdx?col.accent+"66":T.rule}`,borderRadius:"2px",padding:"0.8rem 1rem",cursor:editing?"default":"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{if(!editing){e.currentTarget.style.borderColor=col.border;e.currentTarget.style.background=T.bg;}}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.rule;e.currentTarget.style.background=T.bgCard;}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"baseline",gap:"0.5rem",marginBottom:"0.25rem",flexWrap:"wrap"}}>
                              <span style={{fontFamily:FD,fontSize:"1rem",fontWeight:600,color:T.ink,letterSpacing:"-0.01em"}}>{exercise}</span>
                              {isDropSet&&<TagPill label="Drop" color={col.accent} small/>}
                              {streak!==null&&<span style={{fontSize:"0.65rem",fontFamily:FM,color:streak>0?T.verdigris:streak<0?T.burgundy:T.inkGhost}}>{streak>0?`+${streak}`:streak===0?"=":streak} lbs</span>}
                              {stag==="ceiling"&&<span title="Avg reps ≥ 12 for 2 weeks" style={{fontSize:"0.5rem",padding:"0.08rem 0.3rem",borderRadius:"2px",background:T.amber+"14",color:T.amber,border:`1px solid ${T.amber}44`,fontFamily:FM,letterSpacing:"0.06em",cursor:"default"}}>↑ Add Weight</span>}
                              {stag==="stagnant"&&<span title="No increase in 2 weeks" style={{fontSize:"0.5rem",padding:"0.08rem 0.3rem",borderRadius:"2px",background:T.burgundy+"12",color:T.burgundy,border:`1px solid ${T.burgundy}44`,fontFamily:FM,letterSpacing:"0.06em",cursor:"default"}}>Plateau</span>}
                            </div>
                            {(exTags.muscles.length>0||exTags.days.length>0)&&(
                              <div style={{display:"flex",flexWrap:"wrap",gap:"0.25rem",marginBottom:"0.3rem"}}>
                                {exTags.muscles.map(m=><TagPill key={m} label={m} color={exTags.muscleColors?.[m]||T.inkMid} small/>)}
                                {exTags.days.map(d=><TagPill key={d} label={d} color={T.inkFaint} small/>)}
                              </div>
                            )}
                            {last?<div style={{fontSize:"0.76rem",color:T.inkFaint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:FM}}>{setsInline(last)}<span style={{marginLeft:"0.5rem",fontSize:"0.63rem",color:T.inkGhost}}>· {formatDate(last.date)}</span></div>:<div style={{fontSize:"0.72rem",color:T.inkGhost,fontStyle:"italic",fontFamily:FB}}>No sessions yet — tap to record</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"0.6rem",flexShrink:0,marginLeft:"0.75rem"}}>
                            {history.length>=2&&<MiniChart history={history} color={col.accent}/>}
                            {!editing&&<div style={{color:T.rule,fontSize:"0.9rem"}}>›</div>}
                          </div>
                        </div>
                      </div>
                      {editing&&(
                        <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                          <button onClick={()=>{setEditTagsFor(showingTagEdit?null:exercise);setMoveMenu(null);setConfirmDel(null);}} style={{padding:"0.25rem 0.45rem",background:showingTagEdit?T.bgDeep:"transparent",border:`1px solid ${showingTagEdit?T.inkMid:T.rule}`,borderRadius:"2px",color:showingTagEdit?T.inkMid:T.inkFaint,cursor:"pointer",fontSize:"0.58rem",fontFamily:FM,letterSpacing:"0.06em",whiteSpace:"nowrap"}}>Tags</button>
                          {otherSplits.length>0&&<button onClick={()=>{setMoveMenu(showingMove?null:exercise);setConfirmDel(null);setEditTagsFor(null);}} style={{padding:"0.25rem 0.45rem",background:showingMove?T.bgDeep:"transparent",border:`1px solid ${showingMove?T.inkMid:T.rule}`,borderRadius:"2px",color:showingMove?T.inkMid:T.inkFaint,cursor:"pointer",fontSize:"0.58rem",fontFamily:FM,letterSpacing:"0.06em",whiteSpace:"nowrap"}}>Move</button>}
                        </div>
                      )}
                    </div>
                    {editing&&showingTagEdit&&<div style={{paddingLeft:"22px",marginTop:"0.4rem"}}><TagEditorPanel split={activeTab} muscleOptions={muscleOptions[activeTab]||[]} tags={exTags} onChange={t=>setExTags(exercise,activeTab,t)} color={splitColor(activeTab).accent}/></div>}
                    {editing&&showingMove&&(
                      <div style={{display:"flex",gap:"0.4rem",paddingLeft:"34px",marginTop:"0.4rem",flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:"0.53rem",color:T.inkGhost,fontFamily:FM,letterSpacing:"0.08em"}}>Move to →</span>
                        {otherSplits.map(t=>{const tc=getColor(splits.indexOf(t));return <button key={t} onClick={()=>moveExercise(exercise,activeTab,t)} style={{padding:"0.25rem 0.6rem",background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"2px",color:tc.accent,cursor:"pointer",fontSize:"0.65rem",fontFamily:FM,letterSpacing:"0.06em"}}>{t}</button>;})}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          <div style={{marginTop:"1rem"}}>
            {addingEx?(
              <div>
                <div style={{display:"flex",gap:"0.5rem",marginBottom:showNewExTags?"0.4rem":0}}>
                  <input autoFocus value={newExName} onChange={e=>setNewExName(e.target.value)} placeholder="Exercise name..." onKeyDown={e=>{if(e.key==="Escape"){setAddingEx(false);setNewExName("");setNewExTags({muscles:[],days:[],muscleColors:{}});setShowNewExTags(false);}}} style={{flex:1,background:T.bgCard,border:`1px solid ${splitColor(activeTab).accent}`,borderRadius:"2px",padding:"0.65rem 0.8rem",color:T.ink,fontSize:"0.9rem",outline:"none",fontFamily:FB}}/>
                  <button onClick={()=>setShowNewExTags(t=>!t)} style={{padding:"0.65rem 0.7rem",background:showNewExTags?T.bgDeep:"transparent",border:`1px solid ${showNewExTags?T.inkMid:T.rule}`,borderRadius:"2px",color:showNewExTags?T.inkMid:T.inkFaint,cursor:"pointer",fontSize:"0.75rem"}}>🏷</button>
                  <button onClick={()=>{ if(newExName.trim()){setExercises(p=>({...p,[activeTab]:[...(p[activeTab]||[]),newExName.trim()]}));if(newExTags.muscles.length||newExTags.days.length)setExTags(newExName.trim(),activeTab,newExTags);setNewExName("");setNewExTags({muscles:[],days:[],muscleColors:{}});setShowNewExTags(false);setAddingEx(false);}}} style={{padding:"0.65rem 1rem",background:splitColor(activeTab).accent,border:"none",borderRadius:"2px",color:T.bgCard,cursor:"pointer",fontFamily:FM,letterSpacing:"0.1em",fontSize:"0.7rem"}}>Add</button>
                  <button onClick={()=>{setAddingEx(false);setNewExName("");setNewExTags({muscles:[],days:[],muscleColors:{}});setShowNewExTags(false);}} style={{padding:"0.65rem 0.8rem",background:"transparent",border:`1px solid ${T.rule}`,borderRadius:"2px",color:T.inkFaint,cursor:"pointer"}}>✕</button>
                </div>
                {showNewExTags&&<TagEditorPanel split={activeTab} muscleOptions={muscleOptions[activeTab]||[]} tags={newExTags} onChange={setNewExTags} color={splitColor(activeTab).accent}/>}
              </div>
            ):(
              <button onClick={()=>setAddingEx(true)} style={{width:"100%",padding:"0.7rem",background:"transparent",border:`1px dashed ${T.ruleLight}`,borderRadius:"2px",color:T.inkGhost,cursor:"pointer",fontSize:"0.7rem",letterSpacing:"0.12em",fontFamily:FM,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.inkFaint;e.currentTarget.style.color=T.inkFaint;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.ruleLight;e.currentTarget.style.color=T.inkGhost;}}>+ Add Exercise to {activeTab}</button>
            )}
          </div>
        </div>
      )}

      {/* ── Progression ── */}
      {view==="overview"&&(
        <div style={{maxWidth:"660px",margin:"0 auto",padding:"1.5rem 1.5rem 3rem"}}>
          <div style={{fontSize:"0.52rem",color:T.inkGhost,letterSpacing:"0.2em",fontFamily:FM,textTransform:"uppercase",marginBottom:"1.5rem"}}>All Exercises — Progress Record</div>
          {splits.map((split,idx)=>(
            <div key={split} style={{marginBottom:"2rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.75rem"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:getColor(idx).accent,flexShrink:0}}/>
                <span style={{fontSize:"0.62rem",color:getColor(idx).accent,fontFamily:FM,letterSpacing:"0.15em",textTransform:"uppercase"}}>{split}</span>
                <div style={{flex:1,height:"1px",background:T.ruleLight}}/>
              </div>
              {(exercises[split]||[]).map(exercise=>{
                const history=getHistory(exercise,split);
                if(!history.length) return null;
                const last=history[history.length-1],first=history[0];
                const tg=topWeight(last)-topWeight(first), best=Math.max(...history.map(h=>topWeight(h)));
                const col=getColor(idx).accent, exTags=getExTags(exercise,split);
                return (
                  <div key={exercise} onClick={()=>{setView("tracker");setActiveTab(split);setModal({exercise,split});}} style={{background:T.bgCard,borderRadius:"2px",padding:"0.8rem 1rem",marginBottom:"0.35rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${T.ruleLight}`,transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=getColor(idx).border} onMouseLeave={e=>e.currentTarget.style.borderColor=T.ruleLight}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontFamily:FD,fontSize:"0.95rem",fontWeight:600,color:T.ink,marginBottom:"0.2rem",letterSpacing:"-0.01em"}}>{exercise}</div>
                      {(exTags.muscles.length>0||exTags.days.length>0)&&<div style={{display:"flex",flexWrap:"wrap",gap:"0.2rem",marginBottom:"0.25rem"}}>{exTags.muscles.map(m=><TagPill key={m} label={m} color={exTags.muscleColors?.[m]||T.inkMid} small/>)}{exTags.days.map(d=><TagPill key={d} label={d} color={T.inkFaint} small/>)}</div>}
                      <div style={{fontSize:"0.68rem",color:T.inkGhost,fontFamily:FM}}>{history.length} sessions &nbsp;·&nbsp; PB: <span style={{color:col}}>{best} lbs</span>{tg!==0&&<span style={{marginLeft:"0.4rem",color:tg>0?T.verdigris:T.burgundy}}>{tg>0?"+":""}{tg} lbs total</span>}</div>
                    </div>
                    <MiniChart history={history} color={col}/>
                  </div>
                );
              })}
            </div>
          ))}
          {totalLifts()===0&&<div style={{textAlign:"center",color:T.inkGhost,paddingTop:"3rem",fontSize:"0.9rem",fontStyle:"italic",fontFamily:FB}}>No sessions recorded yet. Begin in the Tracker.</div>}
        </div>
      )}

      {/* ── Volume ── */}
      {view==="volume"&&(()=>{
        const mv=buildMuscleVolume(data,tags,exercises,splits);
        const ml=Object.keys(mv);
        const gmc=muscle=>{for(const sp of splits){const opts=muscleOptions[sp]||[];const i=opts.indexOf(muscle);if(i!==-1)return MUSCLE_COLORS[i%MUSCLE_COLORS.length];}return T.inkMid;};
        return (
          <div style={{maxWidth:"660px",margin:"0 auto",padding:"1.5rem 1.5rem 3rem"}}>
            <div style={{fontSize:"0.52rem",color:T.inkGhost,letterSpacing:"0.2em",fontFamily:FM,textTransform:"uppercase",marginBottom:"1.5rem"}}>Volume by Muscle Group</div>
            {ml.length===0?<div style={{textAlign:"center",color:T.inkGhost,paddingTop:"3rem",fontSize:"0.9rem",fontStyle:"italic",fontFamily:FB}}>No muscle group tags found. Tag your exercises in the Tracker to see volume data here.</div>:ml.map(m=><MuscleVolumeCard key={m} muscle={m} stats={mv[m]} color={gmc(m)}/>)}
          </div>
        );
      })()}

      {modal&&<LogModal exercise={modal.exercise} split={modal.split} splitColor={splitColor(modal.split)} history={getHistory(modal.exercise,modal.split)} tags={getExTags(modal.exercise,modal.split)} onClose={()=>setModal(null)} onLog={e=>logLift(modal.exercise,modal.split,e)} onDeleteEntry={i=>deleteEntry(modal.exercise,modal.split,i)} onEditDate={(i,d)=>editDate(modal.exercise,modal.split,i,d)}/>}
      {showSplitsModal&&<SplitsModal splits={splits} exercises={exercises} muscleOptions={muscleOptions} onClose={()=>setShowSplitsModal(false)} onSave={saveSplitsHandler}/>}
    </div>
  );
}
