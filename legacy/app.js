"use strict";
function scheduledFor(d){ return (state.schedule && state.schedule[fmtDate(d).idx]) || "Rest"; }
function howToLink(name){ return "https://www.youtube.com/results?search_query="+encodeURIComponent(name+" exercise proper form technique"); }

/* ---------- state / storage ---------- */
const KEY="leanplan.v1";
let state = load();
let cur = todayStr();
let tab = "today";

function load(){
  let s=null;
  try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  if(!s||!s.days) s={ target:{...DEFAULT_TARGET}, days:{} };
  if(!s.target) s.target={...DEFAULT_TARGET};
  if(!s.schedule) s.schedule={...DEFAULT_SCHEDULE};
  if(!s.profile) s.profile={...DEFAULT_PROFILE};
  if(!Array.isArray(s.profile.supplements)) s.profile.supplements=[];
  if(s.profile.notificationsEnabled===undefined) s.profile.notificationsEnabled=false;
  if(!Array.isArray(s.customFoods)) s.customFoods=[];
  if(!Array.isArray(s.recipes)) s.recipes=[];
  return s;
}
/* built-in foods + the user's saved custom foods, in a stable order */
function allFoods(){ return FOODS.concat(state.customFoods||[]); }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
function day(d){ if(!state.days[d]) state.days[d]={foods:[],supps:{},weight:null,workout:null}; return state.days[d]; }
function todayStr(){ const t=new Date(); return ymd(t); }
function ymd(t){ return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"); }
function shiftDay(n){ const p=cur.split("-"); const t=new Date(+p[0],+p[1]-1,+p[2]); t.setDate(t.getDate()+n); cur=ymd(t); }
function fmtDate(d){
  const p=d.split("-"); const t=new Date(+p[0],+p[1]-1,+p[2]);
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return {dow:days[t.getDay()], full:t.getDate()+" "+mon[t.getMonth()]+" "+t.getFullYear(), idx:t.getDay()};
}
function r0(x){ return Math.round(x); }
function r1(x){ return Math.round(x*10)/10; }

/* ---------- workout calorie burn ---------- */
const CARDIO_MET = { 'Walk':3.8, 'Incline treadmill':5.0, 'Stationary bike':5.5, 'Cross-trainer':5.5, 'Rower':6.0, 'Other':4.5 };
function workoutBurn(wk){
  if(!wk || !wk.type) return 0;
  const kg = profileWeight() || 75;
  if(wk.type === 'Cardio'){
    const mins = parseFloat(wk.mins) || 25;
    const met = CARDIO_MET[wk.cardioType] || 4.0;
    return Math.round(met * kg * (mins / 60));
  }
  return Math.round(3.5 * kg * 0.75); // ~45 min strength session
}

/* ---------- auth session state (set by initApp before any sync) ---------- */
let currentSession = null;
function getToken(){ return currentSession?.access_token || SB_KEY; }
function getUid(){ return currentSession?.user?.id || LOCAL_USER; }

/* ===================== SUPABASE SYNC =====================
   Offline-first: localStorage stays the instant working store. Writes mark records
   dirty; when online they upsert to Supabase. On load/reconnect we pull and merge,
   last-write-wins per record (settings, each day, each custom food).
   No auth yet — RLS is open and the publishable key below is public by design. */
const SB_URL  = "https://exvblofwiwbvycomxvmj.supabase.co";
const SB_KEY  = "sb_publishable_l-XOQOrSJ6sRGEwaRR8rrg_pXukGtET";
const SB_REST = SB_URL + "/rest/v1";
const LOCAL_USER = "00000000-0000-0000-0000-000000000001"; // fallback until first sign-in
const _stubAuth = { onAuthStateChange:(cb)=>{ cb('SIGNED_OUT',null); return {data:{subscription:{unsubscribe:()=>{}}}}; }, getSession:async()=>({data:{session:null}}), signInWithPassword:async()=>({error:{message:'Offline — sign in unavailable'}}), signUp:async()=>({error:{message:'Offline — sign up unavailable'}}), signInWithOAuth:async()=>({error:{message:'Offline — OAuth unavailable'}}), resetPasswordForEmail:async()=>({error:{message:'Offline'}}), updateUser:async()=>({error:null}), signOut:async()=>({}) };
const supaAuth = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : { auth: _stubAuth };

function nowIso(){ return new Date().toISOString(); }

/* ---- metadata: per-record dirty flags + timestamps, persisted inside state ---- */
function ensureMeta(migrate){
  if(!state._meta){
    state._meta = { settings:{u:nowIso(),dirty:false}, days:{}, foodDeletes:[], lastPull:null };
    if(migrate){
      // existing local data predates sync: flag everything so it pushes up once
      state._meta.settings.dirty = true;
      Object.keys(state.days||{}).forEach(d=>{ state._meta.days[d]={u:nowIso(),dirty:true}; });
    }
  }
  if(!state._meta.days) state._meta.days={};
  if(!Array.isArray(state._meta.foodDeletes)) state._meta.foodDeletes=[];
  if(!Array.isArray(state._meta.recipeDeletes)) state._meta.recipeDeletes=[];
  // ensure every custom food carries an id (+ dirty if migrating)
  (state.customFoods||[]).forEach(f=>{
    if(!f.id) f.id = (crypto.randomUUID ? crypto.randomUUID() : "f"+Date.now()+Math.random().toString(16).slice(2));
    if(migrate){ f._dirty=true; f._u=nowIso(); }
  });
  // ensure every recipe carries an id (+ dirty if migrating)
  (state.recipes||[]).forEach(r=>{
    if(!r.id) r.id = (crypto.randomUUID ? crypto.randomUUID() : "r"+Date.now()+Math.random().toString(16).slice(2));
    if(migrate){ r._dirty=true; r._u=nowIso(); }
  });
}
function markSettingsDirty(){ ensureMeta(); state._meta.settings={u:nowIso(),dirty:true}; save(); scheduleSync(); }
function markDayDirty(d){ ensureMeta(); state._meta.days[d]={u:nowIso(),dirty:true}; save(); scheduleSync(); }
function markFoodDirty(f){ ensureMeta(); f._dirty=true; f._u=nowIso(); save(); scheduleSync(); }
function queueFoodDelete(id){ ensureMeta(); if(id) state._meta.foodDeletes.push(id); save(); scheduleSync(); }
function markRecipeDirty(r){ ensureMeta(); r._dirty=true; r._u=nowIso(); save(); scheduleSync(); }
function queueRecipeDelete(id){ ensureMeta(); if(id) state._meta.recipeDeletes.push(id); save(); scheduleSync(); }

/* ---- client <-> server row mapping ---- */
function toServerFood(f){ return {id:f.id, user_id:getUid(), name:f.n, kcal:+f.k||0, protein:+f.p||0, carbs:+f.c||0, fat:+f.f||0, grams:+f.g||100}; }
function fromServerFood(r){ return {id:r.id, n:r.name, k:r.kcal, p:r.protein, c:r.carbs, f:r.fat, g:r.grams, _u:r.updated_at, _dirty:false}; }
function toServerDay(d){ const x=state.days[d]||{}; return {user_id:getUid(), log_date:d, foods:x.foods||[], supps:x.supps||{}, weight:(x.weight??null), workout:x.workout??null}; }
function toServerRecipe(r){ return {id:r.id, user_id:getUid(), name:r.name, items:r.items||[], servings:(+r.servings||1)}; }
function fromServerRecipe(r){ return {id:r.id, name:r.name, items:r.items||[], servings:(+r.servings||1), _u:r.updated_at, _dirty:false}; }

/* ---- REST helpers ---- */
function sbFetch(path, opts){
  opts = opts || {};
  opts.headers = Object.assign({ apikey:SB_KEY, Authorization:"Bearer "+getToken() }, opts.headers||{});
  return fetch(SB_REST + path, opts);
}
async function sbGet(path){
  const r = await sbFetch(path, {});
  if(!r.ok) throw new Error("GET "+path+" -> "+r.status);
  return r.json();
}
async function sbUpsert(table, rows, onConflict){
  if(!rows.length) return;
  const r = await sbFetch("/"+table+"?on_conflict="+onConflict, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Prefer":"resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  if(!r.ok) throw new Error("UPSERT "+table+" -> "+r.status);
}
async function sbDelete(table, filter){
  const r = await sbFetch("/"+table+"?"+filter, { method:"DELETE", headers:{ "Prefer":"return=minimal" } });
  if(!r.ok && r.status!==404) throw new Error("DELETE "+table+" -> "+r.status);
}

/* ---- push local changes up ---- */
async function pushDirty(){
  const m = state._meta;
  if(m.settings.dirty){
    await sbUpsert("settings", [{user_id:getUid(), target:state.target, schedule:state.schedule, profile:state.profile}], "user_id");
    m.settings.dirty = false;
  }
  const dirtyFoods = (state.customFoods||[]).filter(f=>f._dirty);
  if(dirtyFoods.length){
    await sbUpsert("custom_foods", dirtyFoods.map(toServerFood), "id");
    dirtyFoods.forEach(f=>f._dirty=false);
  }
  for(const id of [...m.foodDeletes]){
    await sbDelete("custom_foods", "id=eq."+id);
    m.foodDeletes = m.foodDeletes.filter(x=>x!==id);
  }
  const dirtyRecipes = (state.recipes||[]).filter(r=>r._dirty);
  if(dirtyRecipes.length){
    await sbUpsert("recipes", dirtyRecipes.map(toServerRecipe), "id");
    dirtyRecipes.forEach(r=>r._dirty=false);
  }
  for(const id of [...m.recipeDeletes]){
    await sbDelete("recipes", "id=eq."+id);
    m.recipeDeletes = m.recipeDeletes.filter(x=>x!==id);
  }
  const dirtyDays = Object.keys(m.days).filter(d=>m.days[d].dirty);
  if(dirtyDays.length){
    await sbUpsert("day_logs", dirtyDays.map(toServerDay), "user_id,log_date");
    dirtyDays.forEach(d=>{ m.days[d].dirty=false; });
  }
  save();
}

/* ---- pull remote changes down (server wins for anything not locally dirty) ---- */
async function pullAll(){
  const m = state._meta;
  const uid = getUid();
  const s = await sbGet("/settings?user_id=eq."+uid+"&select=*");
  if(s.length && !m.settings.dirty){
    state.target = s[0].target; state.schedule = s[0].schedule;
    if(s[0].profile) state.profile = s[0].profile;
    m.settings.u = s[0].updated_at;
  }
  const cf = await sbGet("/custom_foods?user_id=eq."+uid+"&select=*");
  const byId = {};
  cf.map(fromServerFood).forEach(f=>{ byId[f.id]=f; });
  (state.customFoods||[]).filter(f=>f._dirty).forEach(f=>{ byId[f.id]=f; }); // unpushed local edits win
  state.customFoods = Object.values(byId);
  const rc = await sbGet("/recipes?user_id=eq."+uid+"&select=*");
  const rById = {};
  rc.map(fromServerRecipe).forEach(r=>{ rById[r.id]=r; });
  (state.recipes||[]).filter(r=>r._dirty).forEach(r=>{ rById[r.id]=r; }); // unpushed local edits win
  state.recipes = Object.values(rById);
  const dl = await sbGet("/day_logs?user_id=eq."+uid+"&select=*");
  dl.forEach(row=>{
    const d = row.log_date;
    if(m.days[d] && m.days[d].dirty) return; // keep unpushed local day
    state.days[d] = { foods:row.foods||[], supps:row.supps||{}, weight:(row.weight??null), workout:row.workout||null };
    m.days[d] = { u:row.updated_at, dirty:false };
  });
  m.lastPull = nowIso();
  save();
}

/* ---- orchestration + status ---- */
let _syncing=false, _syncTimer=null;
function setSync(txt, color){
  const el=document.getElementById("syncStatus");
  if(el){ el.textContent=txt; el.style.color = color || "var(--muted)"; }
}
function maybeRender(){
  const a=document.activeElement;
  if(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return; // don't clobber typing
  render();
}
async function sync(){
  if(_syncing) return;
  ensureMeta();
  if(!navigator.onLine){ setSync("offline"); return; }
  _syncing=true; setSync("syncing…");
  try{
    await pushDirty();
    await pullAll();
    setSync("synced");
    maybeRender();
  }catch(e){
    setSync("sync error", "var(--amber)");
    console.warn("sync failed:", e);
  }finally{ _syncing=false; }
}
function scheduleSync(){ clearTimeout(_syncTimer); _syncTimer=setTimeout(sync, 800); }
function initSync(){
  ensureMeta(!state._meta && (Object.keys(state.days||{}).length>0 || (state.customFoods||[]).length>0 || (state.recipes||[]).length>0));
  window.addEventListener("online", sync);
  // re-pull whenever the app is brought back to the foreground (key for iOS home-screen apps)
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) sync(); });
  // let the user force a pull by tapping the sync indicator
  const ss=document.getElementById("syncStatus");
  if(ss){ ss.style.cursor="pointer"; ss.title="Tap to sync now"; ss.onclick=()=>sync(); }
  // register the service worker so updates land without re-installing, and offline works
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
  sync();
}
/* =================== END SUPABASE SYNC =================== */

/* ---------- supplement schedule ---------- */
function suppsForDay(){ return state.profile.supplements || []; }

/* ===================== RENDER ===================== */
function render(){
  // Show sticky header only for train tab; all other tabs use inline headers
  const hdr=document.getElementById("appHeader");
  if(hdr) hdr.classList.toggle("show", tab==="train");
  const dl=document.getElementById("dateLabel");
  if(dl){ const f=fmtDate(cur); dl.innerHTML=(cur===todayStr()?"Today":f.dow)+"<small>"+f.full+"</small>"; }
  const v=document.getElementById("view");
  if(tab==="today") v.innerHTML=viewToday();
  else if(tab==="food") v.innerHTML=viewFood();
  else if(tab==="train") v.innerHTML=viewTrain();
  else if(tab==="plan") v.innerHTML=viewPlan();
  else if(tab==="info") v.innerHTML=viewInfo();
  bind();
  window.scrollTo(0,0);
}

function totals(d){
  const t={k:0,p:0,c:0,f:0};
  day(d).foods.forEach(x=>{t.k+=x.k;t.p+=x.p;t.c+=x.c;t.f+=x.f;});
  return t;
}

function macroBlock(lab,val,goal,unit,color){
  const pct=Math.min(100, goal? (val/goal*100):0);
  const c=color?`background:${color}`:'';
  return `<div class="macro"><div class="lab">${lab}</div>
    <div class="val">${r0(val)}<small> / ${goal}${unit}</small></div>
    <div class="bar"><i style="width:${pct}%;${c}"></i></div></div>`;
}

function weekStrip(){
  const p=cur.split('-');
  const curDate=new Date(+p[0],+p[1]-1,+p[2]);
  const dow=curDate.getDay();
  const mondayOff=dow===0?-6:1-dow;
  const todayYmd=todayStr();
  const labels=['M','T','W','T','F','S','S'];
  const TYPE_COLOR={Push:'var(--blue)',Pull:'var(--teal)',Legs:'var(--green)',Cardio:'var(--amber)',Rest:'var(--muted)'};
  let html='';
  for(let i=0;i<7;i++){
    const d=new Date(curDate);
    d.setDate(curDate.getDate()+mondayOff+i);
    const dStr=ymd(d);
    const isViewing=dStr===cur;
    const isToday=dStr===todayYmd;
    const wkDone=!!(state.days[dStr]?.workout?.type);
    const schedIdx=d.getDay();
    const sched=(state.schedule&&state.schedule[schedIdx])||'Rest';
    let ballStyle=isViewing?'background:var(--green);color:#fff':
      isToday?'background:var(--soft);color:var(--ink);box-shadow:0 0 0 2px var(--green)':
      wkDone?'background:var(--soft);color:var(--green)':
      'background:var(--soft);color:var(--muted)';
    const typeColor=isViewing?'var(--green)':(wkDone?'var(--green)':(TYPE_COLOR[sched]||'var(--muted)'));
    html+=`<div class="wkday" onclick="goToDay('${dStr}')">
      <div class="wdlbl">${labels[i]}</div>
      <div class="wdball" style="${ballStyle}">${wkDone?'✓':d.getDate()}</div>
      <div class="wkday-tp" style="color:${typeColor}">${sched}</div>
    </div>`;
  }
  return `<div class="weekstrip">${html}</div>`;
}

function viewToday(){
  const t=totals(cur), tg=state.target;
  const w=day(cur);
  const wk=w.workout;
  const burn=workoutBurn(wk);
  const budget=tg.kcal+burn;
  const left=budget-t.k;
  const pct=Math.min(100, budget? t.k/budget*100:0);
  let cls=""; if(pct>=90&&pct<=100) cls="warn"; if(pct>100) cls="over";

  const hr=new Date().getHours();
  const greet=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const firstName=(state.profile?.name||'').split(' ')[0];
  const fd=fmtDate(cur);

  const sched=scheduledFor(cur);
  const wkLogged=wk&&wk.type;
  const schedTitle=sched==='Rest'?'Rest day':(WORKOUTS[sched]?WORKOUTS[sched].title:sched);
  const wkTitle=wkLogged?(wk.type==='Cardio'?'Cardio session':(WORKOUTS[wk.type]?.title||wk.type)):schedTitle;
  const wkType=wkLogged?wk.type:sched;
  const isRest=!wkLogged&&sched==='Rest';

  const supps=suppsForDay(cur);
  const suppDone=supps.filter(s=>w.supps[s.id]).length;
  const bw=w.weight;

  const wkDesc=wkLogged
    ?(wk.type==='Cardio'?`${wk.mins||'?'} min ${wk.cardioType||'cardio'} · tap to edit`
      :`Session logged · open Train to see sets`)
    :(isRest?'Recovery day — your body adapts at rest'
      :'Open Train to log your sets for today');

  return `
  <div class="page-hdr">
    <div class="page-date">${fd.dow}, ${fd.full}</div>
    <div class="page-title">${greet}${firstName?`, ${firstName}`:''}</div>
  </div>

  ${weekStrip()}

  <div class="card">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:2px">Energy left</div>
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px">
      <div class="kcalbar-big" style="color:${left<0?'var(--red)':'var(--ink)'}">${r0(Math.abs(left))}</div>
      <div style="font-size:16px;font-weight:600;color:var(--muted)">kcal</div>
    </div>
    <div class="mini" style="margin-bottom:10px">${r0(t.k)} eaten · ${budget} target${burn?` · <span style="color:var(--amber)">+${burn} workout</span>`:''}</div>
    <div class="kcalbar-track"><div class="kcalbar-prog ${cls}" style="width:${Math.min(100,pct).toFixed(1)}%"></div></div>
    <div class="macros" style="margin-top:12px">
      ${macroBlock("Protein",t.p,tg.p,"g","var(--blue)")}
      ${macroBlock("Carbs",t.c,tg.c,"g","var(--green)")}
      ${macroBlock("Fat",t.f,tg.f,"g","var(--amber)")}
    </div>
  </div>

  <div class="wkcard-light">
    <div class="wkt">${wkType} · ${wkLogged?'Logged':isRest?'Rest day':'Scheduled'}</div>
    <div class="wkname">${wkTitle}</div>
    <div class="wkinfo">${wkDesc}</div>
    ${!isRest?`<button class="btn-dark" data-go="train">${wkLogged?'View session':'▶ Start workout'}</button>`:''}
  </div>

  <div class="bottom-grid">
    <div class="bc">
      <div class="bc-lbl">Supplements${supps.length?` · ${suppDone}/${supps.length}`:''}</div>
      ${supps.length
        ?`<div class="bc-val">${suppDone}<span style="color:var(--muted);font-size:16px;font-weight:500"> / ${supps.length}</span></div>
          <div class="bc-sub" style="margin-bottom:8px">${suppDone===supps.length?'All done ✓':'tap to check off'}</div>
          ${supps.slice(0,3).map(s=>`<div class="chk ${w.supps[s.id]?'on':''}" data-supp="${s.id}" style="padding:6px 0;border-color:var(--line)">
            <div class="box" style="width:22px;height:22px;border-radius:6px">${w.supps[s.id]?'✓':''}</div>
            <div class="grow" style="min-width:0;overflow:hidden"><div class="name" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div></div>
          </div>`).join('')}
          ${supps.length>3?`<div class="mini" style="margin-top:4px">+${supps.length-3} more</div>`:''}`
        :`<div class="mini" style="margin-top:4px;line-height:1.5">No supplements.<br>Add them in Settings.</div>`}
    </div>
    <div class="bc">
      <div class="bc-lbl">Body weight</div>
      ${bw
        ?`<div class="bc-val">${r1(bw)}<span style="color:var(--muted);font-size:14px;font-weight:500"> kg</span></div>
          <div class="bc-sub" style="margin-bottom:8px">${weightTrendShort()}</div>`
        :`<div class="mini" style="margin-top:4px;margin-bottom:8px">Not logged today</div>`}
      <div style="display:flex;gap:6px;align-items:center">
        <input id="bw" type="number" inputmode="decimal" placeholder="kg" value="${bw??""}" style="padding:8px 10px;font-size:14px">
        <button class="pill kcal" id="saveBw" style="white-space:nowrap;flex:none">Save</button>
      </div>
    </div>
  </div>

  <h2 class="sec">Eaten today</h2>
  <div class="card">${foodListHtml(cur)||'<div class="empty">No food logged yet — tap <b>Food</b> to add some.</div>'}</div>
  `;
}

function weightTrend(){
  const arr=Object.keys(state.days).filter(d=>state.days[d].weight).sort();
  if(arr.length<2) return "Log it over time to see your trend here.";
  const first=state.days[arr[0]].weight, last=state.days[arr[arr.length-1]].weight;
  const diff=r1(last-first);
  return `Since your first entry: <b>${diff>0?'+':''}${diff} kg</b>.`;
}
function weightTrendShort(){
  const arr=Object.keys(state.days).filter(d=>state.days[d].weight).sort();
  if(arr.length<2) return 'Log daily to track';
  const first=state.days[arr[0]].weight, last=state.days[arr[arr.length-1]].weight;
  const diff=r1(last-first);
  return `${diff>0?'+':''}${diff} kg total`;
}

function foodListHtml(d){
  const fs=day(d).foods;
  if(!fs.length) return "";
  return fs.map((x,i)=>`<div class="row">
    <div class="grow"><div class="name">${x.n}</div><div class="meta">${x.grams}${x.unit||'g'} · ${r0(x.p)}p ${r0(x.c)}c ${r0(x.f)}f</div></div>
    <span class="pill kcal">${r0(x.k)} kcal</span>
    <button class="x" data-del="${i}">×</button>
  </div>`).join("");
}

/* ---------- FOOD tab ---------- */
let foodQuery="";
let customFoodOpen=false;
let pendingMeal=null; // set when user taps "+ Add [meal]" so panel pre-selects that meal
let foodSearchOpen=false;

function defaultMeal(){
  if(pendingMeal) return pendingMeal;
  const h=new Date().getHours();
  if(h<11) return 'breakfast';
  if(h<15) return 'lunch';
  if(h<20) return 'dinner';
  return 'snack';
}

function goToDay(dStr){ cur=dStr; render(); }

function recentFoods(){
  const all=allFoods(); const seen=new Set(), recent=[];
  const dates=Object.keys(state.days).sort().reverse().slice(0,14);
  for(const d of dates){
    for(const f of (state.days[d].foods||[])){
      if(!seen.has(f.n)){ seen.add(f.n); const m=all.find(x=>x.n===f.n); if(m) recent.push(m); if(recent.length>=8) return recent; }
    }
  }
  return recent;
}

/* build the searchable results list (built-ins + saved custom foods). When no query,
   show recent foods first, then a handful of common items. */
function foodResultsHtml(q){
  const DB=allFoods();
  let sections=[];
  if(q){
    const matches=DB.filter(f=>f.n.toLowerCase().includes(q)).slice(0,60);
    if(!matches.length) return '<div class="empty">No match — try a different word, or create a custom food below.</div>';
    sections=[{label:null,items:matches}];
  } else {
    const recent=recentFoods();
    const custom=state.customFoods||[];
    if(recent.length) sections.push({label:'Recent',items:recent});
    if(custom.length) sections.push({label:'My foods',items:custom});
    const common=FOODS.slice(0,8);
    sections.push({label:recent.length||custom.length?'Common':'',items:common});
  }
  return sections.map(sec=>{
    const rows=sec.items.map(f=>{
      const idx=DB.indexOf(f);
      const isCustom=idx>=FOODS.length;
      return `<div class="foodopt" data-food="${idx}">
        <div class="grow"><div class="name">${f.n}${isCustom?' <span class="savedtag">saved</span>':''}</div>
        <div class="meta">per 100${f.ml?'ml':'g'} · <b>${f.k}</b> kcal · ${f.p}p ${f.c}c ${f.f}f</div></div>
        ${isCustom?`<button class="x" data-delcustom="${idx-FOODS.length}" title="Remove">×</button>`:'<span class="pill">+ add</span>'}</div>`;
    }).join("");
    return (sec.label?`<div class="mini" style="padding:8px 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${sec.label}</div>`:'')+rows;
  }).join("");
}
function wireFoodResults(scope){
  const root=scope||document;
  root.querySelectorAll(".foodopt[data-food]").forEach(el=>el.onclick=(ev)=>{
    if(ev.target.closest("[data-delcustom]")) return;
    openFoodAdd(+el.dataset.food);
  });
  root.querySelectorAll("[data-delcustom]").forEach(el=>el.onclick=(ev)=>{
    ev.stopPropagation();
    const ci=+el.dataset.delcustom;
    if(state.customFoods && state.customFoods[ci]){ const gone=state.customFoods.splice(ci,1)[0]; if(gone&&gone.id) queueFoodDelete(gone.id); else save(); toast("Removed from saved"); render(); }
  });
}
let foodSub = "foods";     // "foods" | "meals"
function viewFood(){
  // recipes sub-tab is now behind a "Saved meals" link rather than a top segment
  if(foodSub==='meals') return `<button class="btn ghost" id="backToFoods" style="margin-bottom:14px">← Back to food log</button>` + viewMeals();
  return viewFoodsList();
}
function mealGroupHtml(d){
  const fs=day(d).foods;
  const MEALS=['breakfast','lunch','dinner','snack'];
  const LABELS={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snacks'};
  const groups={breakfast:[],lunch:[],dinner:[],snack:[],_other:[]};
  fs.forEach((x,i)=>{ const m=x.meal&&groups[x.meal]!==undefined?x.meal:'_other'; groups[m].push({...x,_i:i}); });
  let html='';
  MEALS.forEach(m=>{
    const items=groups[m]||[];
    const mkcal=r0(items.reduce((s,x)=>s+x.k,0));
    html+=`<div class="meal-sec">
      <div class="meal-hdr">
        <span class="mname">${LABELS[m]}</span>
        <span style="display:flex;align-items:center;gap:10px">
          ${items.length?`<span class="mkcal">${mkcal} kcal</span>`:''}
          <button class="madd" data-addmeal="${m}">+ Add</button>
        </span>
      </div>
      ${items.length?`<div class="card" style="padding:0 16px;margin-bottom:4px">
        ${items.map(x=>`<div class="row">
          <div class="grow"><div class="name">${x.n}</div><div class="meta">${x.grams}${x.unit||'g'} · ${r0(x.p)}p ${r0(x.c)}c ${r0(x.f)}f</div></div>
          <span class="pill kcal">${r0(x.k)} kcal</span>
          <button class="x" data-del="${x._i}">×</button>
        </div>`).join('')}
      </div>`:`<div style="padding:0 2px 10px"><span style="font-size:13px;color:var(--muted)">Nothing here yet</span></div>`}</div>`;
  });
  if(groups._other&&groups._other.length){
    html+=`<div class="meal-sec"><div class="meal-hdr"><span class="mname">Other</span></div>
      <div class="card" style="padding:0 16px;margin-bottom:4px">
        ${groups._other.map(x=>`<div class="row">
          <div class="grow"><div class="name">${x.n}</div><div class="meta">${x.grams}${x.unit||'g'} · ${r0(x.p)}p ${r0(x.c)}c ${r0(x.f)}f</div></div>
          <span class="pill kcal">${r0(x.k)} kcal</span>
          <button class="x" data-del="${x._i}">×</button>
        </div>`).join('')}
      </div></div>`;
  }
  return html;
}

function viewFoodsList(){
  const q=foodQuery.trim().toLowerCase();
  const t=totals(cur), tg=state.target;
  const burn=workoutBurn(day(cur).workout);
  const budget=tg.kcal+burn;
  const left=budget-t.k;
  const pct=Math.min(100, budget? t.k/budget*100:0);
  let cls=""; if(pct>=90&&pct<=100) cls="warn"; if(pct>100) cls="over";
  const showSearch=foodSearchOpen||q.length>0;

  return `
  <div class="food-tab-hdr">
    <h2>Food</h2>
    <button class="food-add" id="toggleFoodSearch" title="${showSearch?'Close search':'Add food'}">${showSearch?'×':'+'}</button>
  </div>

  <div class="card" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
      <div>
        <div class="kcalbar-big">${r0(t.k)}<span style="font-size:16px;font-weight:500;color:var(--muted);letter-spacing:0"> / ${budget}</span></div>
        <div class="mini" style="margin-top:2px">${burn?`<span style="color:var(--amber)">+${burn} workout · </span>`:''}${left<0?`<b style="color:var(--red)">${r0(-left)} over</b>`:`<b style="color:var(--ink)">${r0(left)} kcal left</b>`}</div>
      </div>
    </div>
    <div class="kcalbar-track" style="margin-bottom:10px"><div class="kcalbar-prog ${cls}" style="width:${Math.min(100,pct).toFixed(1)}%"></div></div>
    <div class="mpills">
      <div class="mpill" style="background:rgba(107,159,232,.15);color:var(--blue)">${r0(t.p)}g <em>Protein</em></div>
      <div class="mpill" style="background:rgba(232,119,77,.15);color:var(--green)">${r0(t.c)}g <em>Carbs</em></div>
      <div class="mpill" style="background:rgba(224,162,60,.15);color:var(--amber)">${r0(t.f)}g <em>Fat</em></div>
    </div>
  </div>

  ${showSearch?`<div class="card tight" id="foodSearchCard" style="margin-bottom:10px">
    <div class="search" style="margin-bottom:8px"><input id="foodSearch" placeholder="Search ${allFoods().length} foods…" value="${foodQuery}"></div>
    <div class="results">${foodResultsHtml(q)}</div>
  </div>`:''}

  ${mealGroupHtml(cur)}

  <h2 class="sec" style="display:flex;justify-content:space-between;align-items:center">
    <span>Custom food</span>
    <div style="display:flex;gap:6px">
      <button class="pill" data-foodsub="meals" style="font-size:11px">Saved meals</button>
      <button class="pill kcal" id="toggleCustomForm" style="font-size:11px">${customFoodOpen?'Cancel':'+ Create'}</button>
    </div>
  </h2>
  ${customFoodOpen?`<div class="card">
    <div class="field"><label>Name</label><input id="cf_n" placeholder="e.g. Mum's chilli"></div>
    <div class="grid2">
      <div class="field"><label>Amount (g)</label><input id="cf_g" type="number" inputmode="decimal" placeholder="grams" value="100"></div>
      <div class="field"><label>Kcal (per 100g)</label><input id="cf_k" type="number" inputmode="decimal" placeholder="kcal"></div>
    </div>
    <div class="grid3">
      <div class="field"><label>Prot</label><input id="cf_p" type="number" inputmode="decimal" placeholder="g"></div>
      <div class="field"><label>Carb</label><input id="cf_c" type="number" inputmode="decimal" placeholder="g"></div>
      <div class="field"><label>Fat</label><input id="cf_f" type="number" inputmode="decimal" placeholder="g"></div>
    </div>
    <button class="btn" id="addCustom">Add to today &amp; save</button>
    <div class="mini" style="margin-top:8px">Read the "per 100g" column on the packet and copy those four numbers. Once saved the food appears in search above.</div>
  </div>`:''}
  `;
}

/* ---------- MEALS / RECIPES ---------- */
function escAttr(s){ return String(s==null?"":s).replace(/"/g,"&quot;"); }
function recipeTotals(r){
  const t={k:0,p:0,c:0,f:0,g:0};
  (r.items||[]).forEach(i=>{ const m=(+i.grams||0)/100;
    t.k+=(+i.k||0)*m; t.p+=(+i.p||0)*m; t.c+=(+i.c||0)*m; t.f+=(+i.f||0)*m; t.g+=(+i.grams||0); });
  return t;
}
function recipePer(r){ const t=recipeTotals(r); const s=(+r.servings||1)||1; return {k:t.k/s,p:t.p/s,c:t.c/s,f:t.f/s,g:t.g/s}; }

let mealBuilder = null;   // {id?, name, servings, items:[{n,k,p,c,f,grams}]}
let suppEditor = null;    // {mode:'add'|'edit', id, name, time}
const VAPID_PUBLIC_KEY = 'BOvtsDXhc-q8UtjBcaCY7iydSF_-xKRHoIR8YsOqdGXvYl4HUMlaeWsCsNf5ZTNMAh-9wQwEfmu4Kgcg6_WnGlU';
let mealQuery = "";
function viewMeals(){
  let html = "";
  if(mealBuilder){
    html += builderHtml();
  } else {
    html += `<button class="btn" id="newMeal" style="margin-bottom:14px">+ New meal</button>`;
  }
  const rs = state.recipes||[];
  html += `<h2 class="sec">Your meals</h2>`;
  if(!rs.length){
    html += `<div class="card"><div class="empty">No meals yet. Tap <b>New meal</b> to build one from your foods — then log the whole thing in one go.</div></div>`;
  } else {
    html += `<div class="card">`+ rs.map((r,ri)=>{
      const per=recipePer(r);
      return `<div class="row">
        <div class="grow"><div class="name">${r.name}</div>
          <div class="meta">${(+r.servings>1)?(r.servings+" servings · "):""}per serving: ${r0(per.k)} kcal · ${r0(per.p)}p ${r0(per.c)}c ${r0(per.f)}f</div></div>
        <button class="pill kcal" data-logmeal="${ri}">+ log</button>
        <button class="pill" data-editmeal="${ri}">edit</button>
        <button class="x" data-delmeal="${ri}">×</button>
      </div>`;
    }).join("") + `</div>`;
  }
  html += `<h2 class="sec">Eaten today</h2><div class="card">${foodListHtml(cur)||'<div class="empty">Nothing yet.</div>'}</div>`;
  return html;
}
function mealResultsHtml(q){
  const DB=allFoods();
  let matches = q ? DB.filter(f=>f.n.toLowerCase().includes(q)).slice(0,40)
                  : (state.customFoods||[]).slice().concat(FOODS.slice(0,8));
  if(!matches.length) return '<div class="empty">No match.</div>';
  return matches.map(f=>{ const idx=DB.indexOf(f);
    return `<div class="foodopt" data-adding="${idx}">
      <div class="grow"><div class="name">${f.n}</div><div class="meta">per 100${f.ml?'ml':'g'}: ${f.k} kcal · ${f.p}p ${f.c}c ${f.f}f</div></div>
      <span class="pill">+ add</span></div>`;
  }).join("");
}
function builderTotalsText(){
  const b=mealBuilder; if(!b) return "";
  const t=recipeTotals(b); const s=(+b.servings||1)||1;
  return `Whole meal: <b>${r0(t.k)} kcal</b> · ${r0(t.p)}p ${r0(t.c)}c ${r0(t.f)}f<br>Per serving (÷${s}): <b>${r0(t.k/s)} kcal</b> · ${r0(t.p/s)}p ${r0(t.c/s)}c ${r0(t.f/s)}f`;
}
function builderHtml(){
  const b=mealBuilder;
  const ing = (b.items||[]).map((i,ii)=>`<div class="row">
      <div class="grow"><div class="name">${i.n}</div><div class="meta">per 100${i.ml?'ml':'g'}: ${i.k} kcal · ${i.p}p ${i.c}c ${i.f}f</div></div>
      <input class="bgram" data-ig="${ii}" type="number" inputmode="decimal" value="${i.grams}" style="width:70px;text-align:right;padding:8px">
      <span class="u">g</span>
      <button class="x" data-rming="${ii}">×</button>
    </div>`).join("");
  return `<div class="card">
    <div class="field"><label>Meal name</label><input id="mealName" placeholder="e.g. Chicken &amp; rice bowl" value="${escAttr(b.name)}"></div>
    <div class="field"><label>Servings this batch makes</label><input id="mealServings" type="number" inputmode="decimal" value="${b.servings}"></div>
    <h2 class="sec" style="margin-top:6px">Add ingredients</h2>
    <div class="search"><input id="mealSearch" placeholder="Search foods to add" value="${escAttr(mealQuery)}"></div>
    <div class="results" id="mealResults">${mealResultsHtml(mealQuery.trim().toLowerCase())}</div>
    <h2 class="sec">In this meal</h2>
    <div id="mealIngList">${ing||'<div class="empty">No ingredients yet — search above to add.</div>'}</div>
    <div class="note" id="mealTotals" style="margin-top:12px">${builderTotalsText()}</div>
    <button class="btn" id="saveMeal">${b.id?"Save changes":"Save meal"}</button>
    <button class="btn ghost" id="cancelMeal" style="margin-top:8px">Cancel</button>
  </div>`;
}
function wireMealAdds(scope){
  const root=scope||document;
  root.querySelectorAll("[data-adding]").forEach(el=>el.onclick=()=>{
    if(!mealBuilder) return;
    const f=allFoods()[+el.dataset.adding]; if(!f) return;
    mealBuilder.items.push({n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,grams:f.g});
    render();
  });
}
function openMealLog(ri){
  const r=state.recipes[ri]; if(!r) return;
  const per=recipePer(r);
  const v=document.getElementById("view");
  const panel=document.createElement("div");
  panel.className="card"; panel.id="mealLogPanel";
  panel.innerHTML=`<div class="row" style="border:0;padding-top:0">
      <div class="grow"><div class="name">${r.name}</div><div class="meta">per serving: ${r0(per.k)} kcal · ${r0(per.p)}p ${r0(per.c)}c ${r0(per.f)}f</div></div>
      <button class="x" id="closeMealLog">×</button></div>
    <div class="field"><label>How many servings?</label><input id="ml_s" type="number" inputmode="decimal" value="1"></div>
    <div class="mini" id="ml_prev" style="margin-bottom:12px"></div>
    <button class="btn" id="ml_add">Add to today</button>`;
  v.insertBefore(panel, v.firstChild);
  const si=document.getElementById("ml_s");
  const prev=()=>{ const q=parseFloat(si.value)||0;
    document.getElementById("ml_prev").innerHTML=`= <b>${r0(per.k*q)} kcal</b> · ${r1(per.p*q)}p ${r1(per.c*q)}c ${r1(per.f*q)}f`; };
  prev(); si.addEventListener("input",prev); si.focus();
  document.getElementById("closeMealLog").onclick=()=>panel.remove();
  document.getElementById("ml_add").onclick=()=>{
    const q=parseFloat(si.value)||0; if(q<=0) return;
    const nm = r.name + (q!==1? " ("+(+q.toFixed(2))+"×)" : "");
    day(cur).foods.push({n:nm, grams:r0(per.g*q), k:per.k*q, p:per.p*q, c:per.c*q, f:per.f*q});
    markDayDirty(cur); toast(r.name+" added"); render();
  };
  window.scrollTo(0,0);
}

/* food add panel */
let pendingFood=null;
function openFoodAdd(idx){
  pendingFood=idx;
  const f=allFoods()[idx];
  const v=document.getElementById("view");
  const panel=document.createElement("div");
  panel.className="card";
  panel.id="addPanel";
  const u=f.ml?'ml':'g';
  const half=Math.round(f.g*0.5), dbl=Math.round(f.g*2);
  const dm=defaultMeal();
  pendingMeal=null; // consume
  const MLABELS={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snack'};
  const mealBtns=['breakfast','lunch','dinner','snack'].map(m=>
    `<button class="_mb btn ${m===dm?'':'ghost'}" data-meal="${m}" style="flex:1;padding:7px 2px;font-size:11px;font-weight:700">${MLABELS[m]}</button>`
  ).join('');
  panel.innerHTML=`<div class="row" style="border:0;padding-top:0">
      <div class="grow"><div class="name">${f.n}</div><div class="meta">per 100${u} · <b>${f.k}</b> kcal · ${f.p}p ${f.c}c ${f.f}f</div></div>
      <button class="x" id="closePanel">×</button></div>
    <div style="display:flex;gap:5px;margin-bottom:12px">${mealBtns}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
      <button class="btn ghost" id="fp_half" style="padding:9px 4px;font-size:13px">½ serve<br><small style="color:var(--muted);font-size:11px;font-weight:400">${half}${u}</small></button>
      <button class="btn" id="fp_one" style="padding:9px 4px;font-size:13px">1 serve<br><small style="color:var(--bg);font-size:11px;font-weight:400">${f.g}${u}</small></button>
      <button class="btn ghost" id="fp_dbl" style="padding:9px 4px;font-size:13px">2 serves<br><small style="color:var(--muted);font-size:11px;font-weight:400">${dbl}${u}</small></button>
    </div>
    <div class="field"><label>Or enter ${u}</label><input id="fa_g" type="number" inputmode="decimal" value="${f.g}"></div>
    <div class="mini" id="fa_preview" style="margin-bottom:12px"></div>
    <button class="btn" id="fa_add">Add to today</button>`;
  v.insertBefore(panel,v.firstChild);
  let selMeal=dm;
  panel.querySelectorAll('._mb').forEach(btn=>{
    btn.onclick=()=>{
      selMeal=btn.dataset.meal;
      panel.querySelectorAll('._mb').forEach(b=>{
        b.className=`_mb btn ${b.dataset.meal===selMeal?'':'ghost'}`;
        b.style='flex:1;padding:7px 2px;font-size:11px;font-weight:700';
      });
    };
  });
  const gi=document.getElementById("fa_g");
  const prev=()=>{const g=parseFloat(gi.value)||0;const m=g/100;
    document.getElementById("fa_preview").innerHTML=`= <b>${r0(f.k*m)} kcal</b> · ${r1(f.p*m)}p ${r1(f.c*m)}c ${r1(f.f*m)}f`;};
  const setG=(g)=>{ gi.value=g; prev(); };
  prev(); gi.addEventListener("input",prev); gi.focus();
  document.getElementById("fp_half").onclick=()=>setG(half);
  document.getElementById("fp_one").onclick=()=>setG(f.g);
  document.getElementById("fp_dbl").onclick=()=>setG(dbl);
  document.getElementById("closePanel").onclick=()=>panel.remove();
  document.getElementById("fa_add").onclick=()=>{
    const g=parseFloat(gi.value)||0; if(g<=0) return; const m=g/100;
    const entry={n:f.n,grams:r0(g),k:f.k*m,p:f.p*m,c:f.c*m,f:f.f*m,meal:selMeal};
    if(f.ml) entry.unit='ml';
    day(cur).foods.push(entry);
    markDayDirty(cur); toast(f.n+" added"); render();
  };
  window.scrollTo(0,0);
}

/* ---------- TRAIN tab ---------- */
let trainSel=null;
let trainShown=null;
function lastSession(type){
  const ds=Object.keys(state.days).filter(d=>d!==cur && state.days[d].workout && state.days[d].workout.type===type).sort();
  return ds.length? state.days[ds[ds.length-1]].workout : null;
}
function viewTrain(){
  const w=day(cur);
  const logged = w.workout && w.workout.type;
  const sched = scheduledFor(cur);
  let sel = trainSel || logged || (LIFTS.includes(sched)?sched:"Cardio");
  trainShown = sel;
  const segBtn=(id,label)=>`<button data-wsel="${id}" class="${sel===id?'on':''}">${label}</button>`;
  const dayName = fmtDate(cur).dow;
  let banner;
  if(logged){
    banner = `<div class="note"><b>Logged ${dayName}: ${logged==="Cardio"?"Cardio":WORKOUTS[logged].title}.</b> Tap a different session below to change what you did today.</div>`;
  } else if(sched==="Rest"){
    banner = `<div class="note"><b>${dayName} is a rest day in your schedule.</b> Recover — a gentle walk is fine. You can still log a session below, or rearrange your week in the Plan tab.</div>`;
  } else {
    banner = `<div class="note"><b>${dayName}'s plan: ${WORKOUTS[sched].title}.</b> Doing something else today? Tap any session below — it only changes today. To change your weekly plan, edit it in the Plan tab.</div>`;
  }
  let body="";
  if(sel==="Cardio"){
    const c=(w.workout&&w.workout.type==="Cardio")?w.workout:{cardioType:"Walk",mins:""};
    const e=WORKOUTS.Cardio.ex[0];
    body=`<div class="ex"><div class="h"><div class="name">${e.title||e.n}</div><span class="target">${e.t}</span></div>
      <div class="cue">${e.cue}</div></div>
      <div class="field"><label>Type</label><select id="c_type">
        ${["Walk","Incline treadmill","Stationary bike","Cross-trainer","Rower","Other"].map(o=>`<option ${c.cardioType===o?'selected':''}>${o}</option>`).join("")}
      </select></div>
      <div class="field"><label>Minutes</label><input id="c_min" type="number" inputmode="numeric" value="${c.mins||""}" placeholder="e.g. 25"></div>
      <button class="btn amber" id="saveCardio">Save cardio</button>`;
  } else {
    const wk=WORKOUTS[sel];
    const last=lastSession(sel);
    const logged=(w.workout&&w.workout.type===sel)?w.workout.ex:null;
    body=`<h2 class="sec" style="margin-top:4px">${wk.title}</h2>`+wk.ex.map((e,ei)=>{
      const lastEx = last&&last.ex&&last.ex[ei]?last.ex[ei]:null;
      const lastTxt = lastEx&&lastEx.sets&&lastEx.sets.length?
        ("Last: "+lastEx.sets.map(s=>(s.w?s.w+"kg":"")+(s.w&&s.reps?"×":"")+(s.reps?s.reps:"")).filter(Boolean).join(", ")) : "";
      const cur = logged&&logged[ei]?logged[ei].sets : [ {w:"",reps:""},{w:"",reps:""} ];
      const isPlank=e.n.toLowerCase().includes("plank");
      return `<div class="ex" data-ex="${ei}">
        <div class="h"><div class="name">${e.n}</div><span class="target">${e.t}</span></div>
        <div class="cue">${e.cue}</div>
        <a class="howto" href="${howToLink(e.n)}" target="_blank" rel="noopener">▶ Watch how to perform</a>
        ${lastTxt?`<div class="last">${lastTxt}</div>`:""}
        <div class="sets" id="sets_${ei}">
          ${cur.map((s,si)=>setRow(ei,si,s,isPlank)).join("")}
        </div>
        <button class="addset" data-addset="${ei}" data-plank="${isPlank?1:0}">+ add set</button>
      </div>`;
    }).join("") + `<button class="btn" id="saveWorkout">Save ${sel} session</button>`;
  }
  return `
  ${banner}
  <div class="seg">${segBtn("Legs","Legs")}${segBtn("Push","Push")}${segBtn("Pull","Pull")}${segBtn("Cardio","Cardio")}</div>
  ${body}
  <div class="note" style="margin-top:14px"><b>How to progress:</b> keep ~2–3 reps "in the tank" each set (don't grind to failure — that's also what triggers the sick feeling). When you hit the top of the rep range on all sets with good form, add a small amount of weight next time. Rest ~90 seconds between sets.</div>
  `;
}
function setRow(ei,si,s,isPlank){
  if(isPlank) return `<div class="setrow" data-set="${si}"><span class="n">Set ${si+1}</span>
    <input data-f="reps" type="number" inputmode="numeric" placeholder="seconds" value="${s.reps||""}"><span class="u">sec</span></div>`;
  return `<div class="setrow" data-set="${si}"><span class="n">Set ${si+1}</span>
    <input data-f="w" type="number" inputmode="decimal" placeholder="kg" value="${s.w||""}"><span class="u">kg</span>
    <input data-f="reps" type="number" inputmode="numeric" placeholder="reps" value="${s.reps||""}"><span class="u">reps</span></div>`;
}
function collectWorkout(sel){
  const exs=[];
  document.querySelectorAll(".ex[data-ex]").forEach(exEl=>{
    const sets=[];
    exEl.querySelectorAll(".setrow").forEach(sr=>{
      const o={w:"",reps:""};
      sr.querySelectorAll("input").forEach(inp=>{o[inp.dataset.f]=inp.value;});
      if(o.w!==""||o.reps!=="") sets.push(o);
    });
    exs.push({name:WORKOUTS[sel].ex[+exEl.dataset.ex].n, sets});
  });
  return exs;
}

/* ---------- PLAN tab ---------- */
function viewPlan(){
  const days=[["Mon",1],["Tue",2],["Wed",3],["Thu",4],["Fri",5],["Sat",6],["Sun",0]];
  const badgeFor=v=>LIFTS.includes(v)?"lift":(v==="Cardio"?"cardio":"rest");
  const badgeTxt=v=>v==="Cardio"?"Cardio":LIFTS.includes(v)?"Lift":"Rest";
  return `
  <h2 class="sec">Your weekly schedule</h2>
  <div class="card">
    <div class="mini" style="margin-bottom:10px">Change any day to whatever you want — set Tuesday to Pull, move your rest day, anything. This is your recurring plan, and the Train tab opens to whatever's set here each day.</div>
    ${days.map(([nm,idx])=>{
      const v=(state.schedule&&state.schedule[idx])||"Rest";
      return `<div class="wkdayrow">
        <div class="day">${nm}</div>
        <div class="what" style="flex:1"><select data-schedday="${idx}">${SESSIONS.map(s=>`<option value="${s}" ${s===v?"selected":""}>${s==="Legs"?"Legs & Core":s}</option>`).join("")}</select></div>
        <span class="badge ${badgeFor(v)}" id="badge_${idx}">${badgeTxt(v)}</span>
      </div>`;
    }).join("")}
    <div class="mini" style="margin-top:10px">Aim for 3 lifts a week with a rest day between where you can, so a sore muscle group recovers before you train it again. Daily steps (~7,000–10,000) burn more over a week than the gym sessions do.</div>
  </div>
  <div class="card body">
    <p class="mini">Lifts rotate best as Legs → Push → Pull (back-to-back sessions then hit different muscles). What each covers: <b>Legs &amp; Core</b> — leg press, RDL, extensions, calves, core. <b>Push</b> — chest, shoulders, triceps. <b>Pull</b> — back, rear delts, biceps, core.</p>
  </div>

  <h2 class="sec">Daily eating template</h2>
  <div class="card body">
    <p>You skip breakfast and that's fine — there's nothing magic about it, what matters is the daily total and getting enough protein. Aim ~<b>${state.target.p}g protein</b> and ~<b>${state.target.kcal} kcal</b> across the day.</p>
    <h3>Late morning / lunch</h3>
    <p>First real food. Lead with protein: eggs, chicken, tuna, Greek yogurt, or a protein shake, plus some carbs and veg. A protein coffee or shake works if you're not hungry for solid food.</p>
    <h3>Dinner (the noodle slot)</h3>
    <p>Keep noodles if you like them, but upgrade: <b>one</b> pack, not two, and throw in a protein (a couple of eggs, chicken, prawns, or tofu) and some frozen veg. That turns a 380-kcal protein-free meal into a balanced one for not many more calories.</p>
    <h3>Evening — the snack window (8–11:30pm)</h3>
    <p>This is your biggest leak: 2–3 bags of crisps + a chocolate bar is easily 700–1,000 kcal of food that doesn't fill you up. You don't have to quit snacking — swap it:</p>
    <ul>
      <li>Crisps → plain popcorn, or Greek yogurt with berries</li>
      <li>Whole chocolate bar → two squares of dark chocolate, or a hot chocolate made with milk</li>
      <li>Still hungry → protein shake, or wholemeal toast with peanut butter</li>
    </ul>
    <p>Log the swap in <b>Food</b> and watch the calorie gap close. This single change will likely do more than anything else on this page.</p>
    <p class="mini">No avocado or peas used anywhere in this plan, and everything here is cookable for a shared household.</p>
  </div>

  <h2 class="sec">Supplement timing</h2>
  <div class="card body">
    <p><b>On the days you lift:</b> ON Pre-Workout ~20–30 min before. The caffeine is fine first thing; skip it on rest days.</p>
    <p><b>Every day:</b> creatine (any time), vitamin D with a meal.</p>
    <p><b>Evening:</b> magnesium glycinate with or after dinner.</p>
    <p><b>Probiotic:</b> per the pack — but see the Guide, the evidence is weak.</p>
    <p class="mini">Full reasoning, doses, and one important correction about your magnesium are in the <b>Settings → Nutrition guide</b> section.</p>
  </div>
  `;
}

/* ---------- SETTINGS tab ---------- */
const SETT_SECTIONS = ['profile','metrics','targets','account','backup','about','guide'];
let _sett = { profile:true, metrics:true, targets:false, account:false, backup:false, about:false, guide:false, supplements:false, notifications:false };

function profileWeight(){
  // most recent logged weight: today first, then scan backwards up to 30 days
  if(state.days[cur]?.weight) return state.days[cur].weight;
  if(state.profile.weight) return state.profile.weight;
  const dates = Object.keys(state.days).sort().reverse();
  for(const d of dates){ if(state.days[d]?.weight) return state.days[d].weight; }
  return null;
}

function msjSuggested(w){
  const p = state.profile;
  if(!p.age || !p.height || !w) return null;
  const bmr = p.sex==='F'
    ? 10*w + 6.25*p.height - 5*p.age - 161
    : 10*w + 6.25*p.height - 5*p.age + 5;
  const mult = (ACTIVITY[p.activityLevel]||ACTIVITY.light).mult;
  const maint = Math.round(bmr * mult);
  const kcal  = Math.max(1200, maint - 500);
  const protein = Math.round(w * 1.8);
  const carbs = Math.round(kcal * 0.40 / 4);
  const fat   = Math.round((kcal - protein*4 - carbs*4) / 9);
  return { maint, kcal, p:protein, c:Math.max(carbs,0), f:Math.max(fat,0) };
}

function settAccordion(key, label, content){
  const open = _sett[key];
  return `<div class="acc-wrap">
    <div class="acc-hd" onclick="toggleSett('${key}')">
      <span>${label}</span><span class="acc-ic">${open?'▲':'▼'}</span>
    </div>
    ${open ? `<div class="acc-bd">${content}</div>` : ''}
  </div>`;
}

function toggleSett(key){ _sett[key]=!_sett[key]; render(); }
function viewInfo(){
  const email = currentSession?.user?.email || '';
  const pr = state.profile;
  const w = profileWeight();
  const sug = msjSuggested(w);

  const profileContent = `
    <div class="field"><label>Display name</label><input id="profName" type="text" value="${pr.name||''}" placeholder="Your name" autocomplete="name"></div>
    <div class="field"><label>Email address</label><input id="profEmail" type="email" value="${email}" autocomplete="email"></div>
    <button class="btn" id="saveProfile">Save profile</button>`;

  const metricsContent = `
    <div class="grid2">
      <div class="field"><label>Sex</label>
        <select id="profSex">
          <option value="M" ${pr.sex==='M'?'selected':''}>Male</option>
          <option value="F" ${pr.sex==='F'?'selected':''}>Female</option>
        </select>
      </div>
      <div class="field"><label>Age</label><input id="profAge" type="number" min="16" max="99" value="${pr.age||''}" placeholder="e.g. 35"></div>
      <div class="field"><label>Height (cm)</label><input id="profHeight" type="number" min="100" max="250" value="${pr.height||''}" placeholder="e.g. 178"></div>
      <div class="field"><label>Current weight (kg)</label><input id="profWeight" type="number" min="30" max="300" step="0.1" value="${w||''}" placeholder="e.g. 82.5"></div>
    </div>
    <div class="field"><label>Activity level</label>
      <select id="profActivity">
        ${Object.entries(ACTIVITY).map(([k,v])=>`<option value="${k}" ${pr.activityLevel===k?'selected':''}>${v.label}</option>`).join('')}
      </select>
    </div>
    <button class="btn ghost" id="saveMetrics">Save metrics</button>
    ${sug ? `
    <div class="note" style="margin-top:12px">
      <b>Suggested targets</b> (Mifflin-St Jeor, ${w}kg)<br>
      Maintenance: <b>${sug.maint} kcal</b> · Fat-loss deficit: <b>${sug.kcal} kcal</b><br>
      Protein <b>${sug.p}g</b> · Carbs <b>${sug.c}g</b> · Fat <b>${sug.f}g</b>
      <br><button class="btn" id="applySuggested" style="margin-top:10px">Apply to targets</button>
    </div>` : `<p class="mini" style="margin-top:10px">Fill in age, height and weight to see suggested targets.</p>`}`;

  const targetsContent = `
    <div class="grid2">
      <div class="field"><label>Calories</label><input id="tKcal" type="number" value="${state.target.kcal}"></div>
      <div class="field"><label>Protein (g)</label><input id="tProt" type="number" value="${state.target.p}"></div>
      <div class="field"><label>Carbs (g)</label><input id="tCarb" type="number" value="${state.target.c}"></div>
      <div class="field"><label>Fat (g)</label><input id="tFat"  type="number" value="${state.target.f}"></div>
    </div>
    <button class="btn" id="saveTargets">Save targets</button>`;

  const accountContent = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0">
      <div>
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:700">Signed in as</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px">${email}</div>
      </div>
      <button class="btn ghost" style="width:auto;padding:8px 16px;font-size:13px" onclick="doSignOut()">Sign out</button>
    </div>`;

  const backupContent = `
    <p class="mini">Your log is stored locally and synced to your private cloud database. Export a backup periodically as a safety copy.</p>
    <button class="btn ghost" id="exportData" style="margin-bottom:8px">Export backup file</button>
    <label class="btn ghost" for="importFile" style="display:block;text-align:center">Import backup file</label>
    <input id="importFile" type="file" accept="application/json,.json" style="display:none">`;

  const aboutContent = `
    <p class="mini" style="margin:0 0 8px"><b>Lean Plan</b> v1.2.0 — personal fat-loss tracker.</p>
    <p class="mini"><b>Data use:</b> Your data is stored on this device and synced to a private database tied to your account only. It is never shared or sold.</p>
    <p class="mini"><b>Terms:</b> General fitness information only — not medical advice. Consult a GP before starting a new diet or exercise programme. Use at your own risk.</p>
    <p class="mini" style="margin-bottom:0"><b>Install:</b> iPhone (Safari) → Share → "Add to Home Screen". Android (Chrome) → ⋮ → "Add to Home screen".</p>`;

  const guideContent = `
    <div class="card body" style="margin-bottom:10px">
      <h3 style="margin-top:0">The honest basics</h3>
      <p><b>You can't spot-reduce.</b> Fat comes off your whole body when you eat fewer calories than you burn. As overall body fat drops, the belly and face follow — for most men the belly is one of the last places to lean out.</p>
      <p><b>The deficit is what loses fat.</b> Lifting and cardio help, but you cannot out-train the evening snacking. Food is ~80% of the result.</p>
      <p style="margin-bottom:0"><b>Lifting protects muscle.</b> Resistance training + high protein keeps the muscle, so the weight you lose is mostly fat.</p>
    </div>
    <div class="card body" style="margin-bottom:10px">
      <h3 style="margin-top:0">Supplements</h3>
      <p><b>ON Pre-Workout</b> — fine before training. Contains caffeine; morning use won't wreck sleep. Not essential.</p>
      <div class="note warnote" style="margin-bottom:10px"><b>Magnesium glycinate "6000mg" — check this.</b> 6,000mg almost certainly refers to the whole compound, not the magnesium itself (~14% elemental by weight). Find the elemental magnesium per serving on your tub — it should be under ~400mg/day.</div>
      <p style="margin-bottom:0"><b>100 Billion probiotic</b> — evidence for daily probiotics is weak and strain-specific for healthy adults. Not harmful; if you notice nothing after a month, stop.</p>
    </div>
    <div class="card body" style="margin-bottom:10px">
      <h3 style="margin-top:0">Worth adding</h3>
      <p><b>Vitamin D 10µg/day</b> — NHS-recommended for UK adults Oct–Mar. Clear benefit for bone/immune health.</p>
      <p><b>Creatine monohydrate 3–5g/day</b> — the most-evidenced sports supplement. Take daily, any time. Expect 0.5–1kg scale rise in week one (water, not fat).</p>
      <p style="margin-bottom:0"><b>Don't bother with</b> fat burners, detox teas, CLA, raspberry ketones, BCAAs (redundant if protein is adequate), or ACV pills. No meaningful evidence.</p>
    </div>
    <div class="card body">
      <h3 style="margin-top:0">Feeling sick with exercise</h3>
      <p>The plan uses moderate effort, stopping 2–3 reps short of failure, and conversational-pace cardio. Eat a small snack 30–45 min before if training empty makes you queasy. Hydrate.</p>
      <p class="mini" style="margin-bottom:0">If nausea is severe or comes with chest pain/dizziness, stop and see a GP. This is general information, not medical advice.</p>
    </div>`;

  const supps = state.profile.supplements || [];
  const suppListHtml = supps.length
    ? supps.map(s=>`<div class="row" style="align-items:center">
        <div class="grow"><div class="name">${s.name}</div><div class="meta">${s.time}</div></div>
        <button class="pill kcal" data-edsupp="${s.id}" style="margin-right:6px">Edit</button>
        <button class="x" data-delsupp="${s.id}">✕</button>
      </div>`).join('')
    : `<p class="mini" style="margin:0 0 10px">No supplements added yet.</p>`;
  const suppFormHtml = suppEditor ? `
    <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:6px">
      <div class="field"><label>Name</label><input id="suppName" type="text" value="${suppEditor.name.replace(/"/g,'&quot;')}" placeholder="e.g. Creatine 5g" autocomplete="off"></div>
      <div class="field"><label>Time</label><input id="suppTime" type="time" value="${suppEditor.time}"></div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="saveSupp" style="flex:1">${suppEditor.mode==='edit'?'Update':'Add'}</button>
        <button class="btn ghost" id="cancelSupp" style="flex:1">Cancel</button>
      </div>
    </div>` : `<button class="btn ghost" id="addSupp" style="margin-top:${supps.length?'10px':'0'}">+ Add supplement</button>`;
  const supplementsContent = `
    <p class="mini" style="margin:0 0 12px">Add each supplement with a time. Notifications send a reminder at that time every day.</p>
    ${suppListHtml}${suppFormHtml}`;

  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const notifStatus = !notifSupported ? 'Not supported in this browser'
    : Notification.permission === 'denied' ? 'Blocked — enable in your browser or phone settings'
    : state.profile.notificationsEnabled ? 'Enabled' : 'Disabled';
  const notificationsContent = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0 12px">
      <div>
        <div style="font-weight:600;font-size:15px">Supplement reminders</div>
        <div class="mini" style="margin-top:2px">${notifStatus}</div>
      </div>
      <label class="tog-wrap">
        <input type="checkbox" id="notifToggle" ${state.profile.notificationsEnabled?'checked':''} ${!notifSupported?'disabled':''}>
        <span class="tog-slider"></span>
      </label>
    </div>
    <p class="mini" style="margin:0">iPhone: requires iOS 16.4+ with Lean Plan added to your Home Screen via Safari.</p>`;

  return `<div style="padding-top:6px">
    ${settAccordion('profile','Profile', profileContent)}
    ${settAccordion('metrics','My Metrics', metricsContent)}
    ${settAccordion('targets','Calorie & Macro Targets', targetsContent)}
    ${settAccordion('supplements','Supplements', supplementsContent)}
    ${settAccordion('notifications','Notifications', notificationsContent)}
    ${settAccordion('account','Account', accountContent)}
    ${settAccordion('backup','Data & Backup', backupContent)}
    ${settAccordion('about','About', aboutContent)}
    ${settAccordion('guide','Nutrition Guide', guideContent)}
  </div>`;
}


/* ===================== EVENTS ===================== */
function bind(){
  // food
  const fs=document.getElementById("foodSearch");
  if(fs){ fs.addEventListener("input",e=>{ foodQuery=e.target.value;
      const r=document.querySelector(".results");
      if(r){ r.innerHTML = foodResultsHtml(foodQuery.trim().toLowerCase()); wireFoodResults(r); }
    });
  }
  wireFoodResults(document);
  // food search toggle
  const tfs=document.getElementById("toggleFoodSearch");
  if(tfs) tfs.onclick=()=>{ foodSearchOpen=!foodSearchOpen; if(!foodSearchOpen) foodQuery=''; render(); setTimeout(()=>{ const fs=document.getElementById('foodSearch'); if(fs) fs.focus(); },60); };
  // meal quick-add buttons
  document.querySelectorAll("[data-addmeal]").forEach(el=>el.onclick=()=>{
    pendingMeal=el.dataset.addmeal;
    foodSearchOpen=true;
    render();
    window.scrollTo(0,0);
    setTimeout(()=>{ const fs=document.getElementById('foodSearch'); if(fs) fs.focus(); },80);
  });
  // ----- meals / recipes -----
  document.querySelectorAll("[data-foodsub]").forEach(el=>el.onclick=()=>{ foodSub=el.dataset.foodsub; render(); });
  const btf=document.getElementById("backToFoods"); if(btf) btf.onclick=()=>{ foodSub='foods'; render(); };
  const nm=document.getElementById("newMeal");
  if(nm) nm.onclick=()=>{ mealBuilder={name:"",servings:1,items:[]}; mealQuery=""; render(); };
  const ms=document.getElementById("mealSearch");
  if(ms){ ms.addEventListener("input",e=>{ mealQuery=e.target.value;
      const r=document.getElementById("mealResults");
      if(r){ r.innerHTML=mealResultsHtml(mealQuery.trim().toLowerCase()); wireMealAdds(r); }
    });
  }
  wireMealAdds(document);
  document.querySelectorAll("[data-rming]").forEach(el=>el.onclick=()=>{
    if(!mealBuilder) return; mealBuilder.items.splice(+el.dataset.rming,1); render();
  });
  document.querySelectorAll(".bgram").forEach(el=>el.addEventListener("input",()=>{
    if(!mealBuilder) return; mealBuilder.items[+el.dataset.ig].grams = parseFloat(el.value)||0;
    const mt=document.getElementById("mealTotals"); if(mt) mt.innerHTML=builderTotalsText();
  }));
  const svm=document.getElementById("saveMeal");
  if(svm) svm.onclick=()=>{
    if(!mealBuilder) return;
    const name=val("mealName"); const servings=parseFloat(val("mealServings"))||1;
    if(!name){ toast("Give the meal a name"); return; }
    if(!mealBuilder.items.length){ toast("Add at least one ingredient"); return; }
    if(!Array.isArray(state.recipes)) state.recipes=[];
    let r;
    if(mealBuilder.id){ r=state.recipes.find(x=>x.id===mealBuilder.id); }
    if(!r){ r=state.recipes.find(x=>x.name.toLowerCase()===name.toLowerCase()); }
    if(r){ r.name=name; r.servings=servings; r.items=mealBuilder.items; }
    else { r={id:(crypto.randomUUID?crypto.randomUUID():"r"+Date.now()+Math.random().toString(16).slice(2)), name, servings, items:mealBuilder.items}; state.recipes.push(r); }
    markRecipeDirty(r); mealBuilder=null; mealQuery=""; toast("Meal saved"); render();
  };
  const cm=document.getElementById("cancelMeal");
  if(cm) cm.onclick=()=>{ mealBuilder=null; mealQuery=""; render(); };
  document.querySelectorAll("[data-logmeal]").forEach(el=>el.onclick=()=>openMealLog(+el.dataset.logmeal));
  document.querySelectorAll("[data-editmeal]").forEach(el=>el.onclick=()=>{
    const r=state.recipes[+el.dataset.editmeal]; if(!r) return;
    mealBuilder={id:r.id, name:r.name, servings:r.servings, items:(r.items||[]).map(i=>({...i}))}; mealQuery=""; render();
  });
  document.querySelectorAll("[data-delmeal]").forEach(el=>el.onclick=()=>{
    const ri=+el.dataset.delmeal; const r=state.recipes[ri]; if(!r) return;
    state.recipes.splice(ri,1); if(r.id) queueRecipeDelete(r.id); else save(); toast("Meal deleted"); render();
  });
  const tcf=document.getElementById("toggleCustomForm");
  if(tcf) tcf.onclick=()=>{ customFoodOpen=!customFoodOpen; render(); };
  const ac=document.getElementById("addCustom");
  if(ac) ac.onclick=()=>{
    const n=val("cf_n")||"Custom food"; const g=parseFloat(val("cf_g"))||0;
    const k=parseFloat(val("cf_k"))||0,p=parseFloat(val("cf_p"))||0,c=parseFloat(val("cf_c"))||0,f=parseFloat(val("cf_f"))||0;
    if(g<=0){toast("Enter an amount in grams");return;}
    if(!Array.isArray(state.customFoods)) state.customFoods=[];
    // save (or update) the food definition so it can be reused
    const ex=state.customFoods.find(x=>x.n.toLowerCase()===n.toLowerCase());
    if(ex){ ex.k=k; ex.p=p; ex.c=c; ex.f=f; ex.g=r0(g); markFoodDirty(ex); }
    else { const def={n,k,p,c,f,g:r0(g),id:(crypto.randomUUID?crypto.randomUUID():"f"+Date.now()+Math.random().toString(16).slice(2))}; state.customFoods.push(def); markFoodDirty(def); }
    // log today's portion
    const m=g/100;
    day(cur).foods.push({n,grams:r0(g),k:k*m,p:p*m,c:c*m,f:f*m});
    customFoodOpen=false; markDayDirty(cur); toast(n+" added & saved"); render();
  };
  document.querySelectorAll("[data-del]").forEach(el=>el.onclick=()=>{
    day(cur).foods.splice(+el.dataset.del,1); markDayDirty(cur); render();
  });
  // supps
  document.querySelectorAll("[data-supp]").forEach(el=>el.onclick=()=>{
    const id=el.dataset.supp; const w=day(cur); w.supps[id]=!w.supps[id]; markDayDirty(cur); render();
  });
  // bodyweight
  const sb=document.getElementById("saveBw");
  if(sb) sb.onclick=()=>{ const v=parseFloat(val("bw")); if(!v){toast("Enter a weight");return;}
    day(cur).weight=v; markDayDirty(cur); toast("Weight saved"); render(); };
  // quick go to train
  document.querySelectorAll("[data-go]").forEach(el=>el.onclick=()=>{ setTab(el.dataset.go); });
  // train segmented
  document.querySelectorAll("[data-wsel]").forEach(el=>el.onclick=()=>{ trainSel=el.dataset.wsel; render(); });
  // weekly schedule editor (Plan tab)
  document.querySelectorAll("[data-schedday]").forEach(sel=>sel.onchange=()=>{
    const idx=+sel.dataset.schedday, v=sel.value;
    if(!state.schedule) state.schedule={...DEFAULT_SCHEDULE};
    state.schedule[idx]=v; markSettingsDirty();
    const b=document.getElementById("badge_"+idx);
    if(b){ const cls=LIFTS.includes(v)?"lift":(v==="Cardio"?"cardio":"rest");
      b.className="badge "+cls; b.textContent=v==="Cardio"?"Cardio":LIFTS.includes(v)?"Lift":"Rest"; }
    toast("Schedule updated");
  });
  // add set
  document.querySelectorAll("[data-addset]").forEach(el=>el.onclick=()=>{
    const ei=+el.dataset.addset; const isPlank=el.dataset.plank==="1";
    const cont=document.getElementById("sets_"+ei);
    const si=cont.querySelectorAll(".setrow").length;
    const div=document.createElement("div"); div.innerHTML=setRow(ei,si,{w:"",reps:""},isPlank);
    cont.appendChild(div.firstElementChild);
  });
  const sw=document.getElementById("saveWorkout");
  if(sw) sw.onclick=()=>{ const sel=trainShown; const ex=collectWorkout(sel);
    day(cur).workout={type:sel,ex}; markDayDirty(cur); toast(sel+" session saved"); render(); };
  const sc=document.getElementById("saveCardio");
  if(sc) sc.onclick=()=>{ day(cur).workout={type:"Cardio",cardioType:val("c_type"),mins:val("c_min")};
    markDayDirty(cur); toast("Cardio saved"); render(); };
  // supplements
  const as2=document.getElementById("addSupp");
  if(as2) as2.onclick=()=>{ suppEditor={mode:'add',id:null,name:'',time:'08:00'}; render(); };
  const ss=document.getElementById("saveSupp");
  if(ss) ss.onclick=()=>{
    const name=val("suppName"); const time=val("suppTime");
    if(!name){ toast("Enter a supplement name"); return; }
    if(!time){ toast("Enter a time"); return; }
    if(!Array.isArray(state.profile.supplements)) state.profile.supplements=[];
    if(suppEditor.mode==='edit'){
      const s=state.profile.supplements.find(x=>x.id===suppEditor.id);
      if(s){ s.name=name; s.time=time; }
    } else {
      state.profile.supplements.push({ id:crypto.randomUUID?crypto.randomUUID():'s'+Date.now(), name, time });
    }
    suppEditor=null; markSettingsDirty(); save(); toast("Saved"); render();
  };
  const cs=document.getElementById("cancelSupp");
  if(cs) cs.onclick=()=>{ suppEditor=null; render(); };
  document.querySelectorAll("[data-edsupp]").forEach(el=>el.onclick=()=>{
    const s=(state.profile.supplements||[]).find(x=>x.id===el.dataset.edsupp);
    if(s){ suppEditor={mode:'edit',id:s.id,name:s.name,time:s.time}; render(); }
  });
  document.querySelectorAll("[data-delsupp]").forEach(el=>el.onclick=()=>{
    state.profile.supplements=(state.profile.supplements||[]).filter(x=>x.id!==el.dataset.delsupp);
    markSettingsDirty(); save(); render();
  });
  // notifications toggle
  const nt=document.getElementById("notifToggle");
  if(nt) nt.onchange=async()=>{
    if(nt.checked){
      const ok=await subscribePush();
      if(ok){ state.profile.notificationsEnabled=true; markSettingsDirty(); save(); toast("Notifications enabled"); }
      else { nt.checked=false; }
    } else {
      await unsubscribePush();
      state.profile.notificationsEnabled=false; markSettingsDirty(); save(); toast("Notifications disabled");
    }
    render();
  };
  // data backup
  const ex=document.getElementById("exportData");
  if(ex) ex.onclick=()=>exportData();
  const imp=document.getElementById("importFile");
  if(imp) imp.onchange=e=>{ if(e.target.files&&e.target.files[0]) importData(e.target.files[0]); };
  // settings: save profile (name + email)
  const sp=document.getElementById("saveProfile");
  if(sp) sp.onclick=async()=>{
    const name=val("profName");
    const email=document.getElementById("profEmail")?.value?.trim();
    state.profile.name=name; markSettingsDirty(); toast("Profile saved");
    if(email && email!==currentSession?.user?.email){
      sp.disabled=true; sp.textContent="Sending confirmation…";
      const {error}=await supaAuth.auth.updateUser({email});
      sp.disabled=false; sp.textContent="Save profile";
      if(error) toast("Email error: "+error.message);
      else toast("Check your email to confirm the new address");
    }
    render();
  };
  // settings: save metrics (weight also updates today's day log)
  const sm=document.getElementById("saveMetrics");
  if(sm) sm.onclick=()=>{
    state.profile.sex=val("profSex")||'M';
    state.profile.age=parseInt(val("profAge"))||null;
    state.profile.height=parseInt(val("profHeight"))||null;
    state.profile.activityLevel=val("profActivity")||'light';
    const wt=parseFloat(document.getElementById("profWeight")?.value)||null;
    if(wt){ state.profile.weight=wt; day(cur).weight=wt; markDayDirty(cur); }
    markSettingsDirty(); toast("Metrics saved"); render();
  };
  // settings: apply suggested targets
  const as=document.getElementById("applySuggested");
  if(as) as.onclick=()=>{
    const w=profileWeight();
    const sug=msjSuggested(w); if(!sug) return;
    state.target={kcal:sug.kcal,p:sug.p,c:sug.c,f:sug.f};
    markSettingsDirty(); toast("Targets updated"); render();
  };
  // settings: save targets manually
  const st=document.getElementById("saveTargets");
  if(st) st.onclick=()=>{
    state.target={
      kcal:parseInt(val("tKcal"))||state.target.kcal,
      p:parseInt(val("tProt"))||state.target.p,
      c:parseInt(val("tCarb"))||state.target.c,
      f:parseInt(val("tFat"))||state.target.f
    };
    markSettingsDirty(); toast("Targets saved"); render();
  };
}
function val(id){ const e=document.getElementById(id); return e?e.value.trim():""; }

/* ---------- push notifications ---------- */
function urlBase64ToUint8Array(b64){
  const pad='='.repeat((4-b64.length%4)%4);
  const base64=(b64+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

async function subscribePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){ toast('Push not supported'); return false; }
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){ toast('Permission denied'); return false; }
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    const j=sub.toJSON();
    await fetch(SB_REST+'/push_subscriptions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken(),'apikey':SB_KEY,'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({ user_id:getUid(), endpoint:j.endpoint, p256dh:j.keys.p256dh, auth_key:j.keys.auth })
    });
    return true;
  }catch(e){ console.error('Push subscribe failed:',e); toast('Could not enable notifications'); return false; }
}

async function unsubscribePush(){
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub){
      const endpoint=sub.endpoint;
      await sub.unsubscribe();
      await fetch(SB_REST+'/push_subscriptions?endpoint=eq.'+encodeURIComponent(endpoint)+'&user_id=eq.'+getUid(),{
        method:'DELETE', headers:{'Authorization':'Bearer '+getToken(),'apikey':SB_KEY}
      });
    }
  }catch(e){ console.error('Push unsubscribe failed:',e); }
}

/* ---------- data backup ---------- */
function exportData(){
  try{
    const blob=new Blob([JSON.stringify(state)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="leanplan-backup-"+todayStr()+".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast("Backup downloaded");
  }catch(e){ toast("Could not export"); }
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const s=JSON.parse(r.result);
      if(s&&s.days&&typeof s.days==="object"){
        state=s; if(!state.target) state.target={...DEFAULT_TARGET}; if(!state.schedule) state.schedule={...DEFAULT_SCHEDULE}; if(!Array.isArray(state.customFoods)) state.customFoods=[]; if(!Array.isArray(state.recipes)) state.recipes=[];
        state._meta=null; ensureMeta(true); save(); cur=todayStr(); toast("Backup loaded"); render(); scheduleSync();
      } else toast("That isn't a valid backup file");
    }catch(e){ toast("Could not read that file"); }
  };
  r.readAsText(file);
}

/* tabs + date */
function setTab(t){ tab=t; trainSel=null; foodSearchOpen=false; foodQuery='';
  document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));
  render();
}
document.getElementById("tabs").addEventListener("click",e=>{
  const b=e.target.closest("button[data-tab]"); if(b) setTab(b.dataset.tab);
});
document.getElementById("prevDay").onclick=()=>{ shiftDay(-1); render(); };
document.getElementById("nextDay").onclick=()=>{ shiftDay(1); render(); };

let toastTimer=null;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),1600); }

/* ===================== AUTH ===================== */

function authRedirectUrl(){
  return window.location.origin + window.location.pathname;
}

function showAuth(mode){
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  renderAuthForm(mode || 'signin');
}

function hideAuth(){
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('app').style.display = '';
}

function authErr(msg){
  const el = document.getElementById('authErr');
  if(el){ el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function renderAuthForm(mode){
  const box = document.getElementById('authBox');
  if(!box) return;

  if(mode === 'check-email'){
    box.innerHTML = `
      <div class="auth-icon">✉️</div>
      <h2 class="auth-title" style="text-align:center">Check your email</h2>
      <p style="color:var(--muted);font-size:14px;text-align:center;margin:0 0 20px">We sent a link to your inbox. Click it to continue.</p>
      <button class="btn ghost" onclick="renderAuthForm('signin')">Back to sign in</button>`;
    return;
  }

  if(mode === 'set-password'){
    box.innerHTML = `
      <h2 class="auth-title">Set new password</h2>
      <div id="authErr" class="auth-err" style="display:none"></div>
      <div class="field"><label>New password</label><input type="password" id="authPw" placeholder="At least 8 characters" autocomplete="new-password"></div>
      <div class="field"><label>Confirm password</label><input type="password" id="authPw2" placeholder="Repeat password" autocomplete="new-password"></div>
      <button class="btn" onclick="doSetPassword()">Update password</button>`;
    return;
  }

  if(mode === 'forgot'){
    box.innerHTML = `
      <h2 class="auth-title">Reset password</h2>
      <p style="color:var(--muted);font-size:14px;margin:0 0 16px">Enter your email and we'll send a reset link.</p>
      <div id="authErr" class="auth-err" style="display:none"></div>
      <div class="field"><label>Email</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"></div>
      <button class="btn" onclick="doForgot()">Send reset link</button>
      <button class="btn ghost" style="margin-top:8px" onclick="renderAuthForm('signin')">Back to sign in</button>`;
    return;
  }

  const isSignup = mode === 'signup';
  box.innerHTML = `
    <h2 class="auth-title">${isSignup ? 'Create account' : 'Sign in'}</h2>
    <div id="authErr" class="auth-err" style="display:none"></div>
    <div class="field"><label>Email</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"></div>
    <div class="field">
      <label>Password</label>
      <input type="password" id="authPw" placeholder="${isSignup ? 'At least 8 characters' : 'Your password'}" autocomplete="${isSignup ? 'new-password' : 'current-password'}">
    </div>
    ${isSignup ? '<div class="field"><label>Confirm password</label><input type="password" id="authPw2" placeholder="Repeat password" autocomplete="new-password"></div>' : ''}
    <button class="btn" id="authSubmit" onclick="${isSignup ? 'doSignup()' : 'doSignin()'}">
      ${isSignup ? 'Create account' : 'Sign in'}
    </button>
    ${!isSignup ? '<div style="text-align:right;margin-top:8px"><button class="auth-link" onclick="renderAuthForm(\'forgot\')">Forgot password?</button></div>' : ''}
    <div class="auth-divider"><span>or</span></div>
    <button class="btn auth-google" onclick="doGoogle()">
      <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/></svg>
      Continue with Google
    </button>
    <p style="text-align:center;margin-top:20px;font-size:13px;color:var(--muted)">
      ${isSignup ? 'Already have an account?' : "Don't have an account?"}
      <button class="auth-link" onclick="renderAuthForm('${isSignup ? 'signin' : 'signup'}')">${isSignup ? 'Sign in' : 'Sign up'}</button>
    </p>`;
}

async function doSignin(){
  const email = document.getElementById('authEmail')?.value?.trim();
  const pw = document.getElementById('authPw')?.value;
  if(!email || !pw){ authErr('Please fill in all fields.'); return; }
  authErr('');
  const btn = document.getElementById('authSubmit');
  if(btn){ btn.disabled = true; btn.textContent = 'Signing in…'; }
  const { error } = await supaAuth.auth.signInWithPassword({ email, password: pw });
  if(error){ authErr(error.message); if(btn){ btn.disabled=false; btn.textContent='Sign in'; } }
}

async function doSignup(){
  const email = document.getElementById('authEmail')?.value?.trim();
  const pw = document.getElementById('authPw')?.value;
  const pw2 = document.getElementById('authPw2')?.value;
  if(!email || !pw || !pw2){ authErr('Please fill in all fields.'); return; }
  if(pw !== pw2){ authErr('Passwords do not match.'); return; }
  if(pw.length < 8){ authErr('Password must be at least 8 characters.'); return; }
  authErr('');
  const btn = document.getElementById('authSubmit');
  if(btn){ btn.disabled = true; btn.textContent = 'Creating account…'; }
  const { error } = await supaAuth.auth.signUp({ email, password: pw, options:{ emailRedirectTo: authRedirectUrl() } });
  if(error){ authErr(error.message); if(btn){ btn.disabled=false; btn.textContent='Create account'; } }
  else { renderAuthForm('check-email'); }
}

async function doForgot(){
  const email = document.getElementById('authEmail')?.value?.trim();
  if(!email){ authErr('Please enter your email.'); return; }
  authErr('');
  const btn = document.querySelector('#authBox .btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
  const { error } = await supaAuth.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  if(error){ authErr(error.message); if(btn){ btn.disabled=false; btn.textContent='Send reset link'; } }
  else { renderAuthForm('check-email'); }
}

async function doSetPassword(){
  const pw = document.getElementById('authPw')?.value;
  const pw2 = document.getElementById('authPw2')?.value;
  if(!pw || !pw2){ authErr('Please fill in both fields.'); return; }
  if(pw !== pw2){ authErr('Passwords do not match.'); return; }
  if(pw.length < 8){ authErr('Password must be at least 8 characters.'); return; }
  authErr('');
  const btn = document.querySelector('#authBox .btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Updating…'; }
  const { error } = await supaAuth.auth.updateUser({ password: pw });
  if(error){ authErr(error.message); if(btn){ btn.disabled=false; btn.textContent='Update password'; } }
}

async function doGoogle(){
  await supaAuth.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl() } });
}

async function doSignOut(){
  await supaAuth.auth.signOut();
  location.reload();
}

let _appStarted = false;

async function initApp(){
  // If Supabase CDN failed to load, run in local-only mode — no auth required
  if(!window.supabase){
    _appStarted = true;
    currentSession = null;
    render();
    return;
  }

  const { data: { session } } = await supaAuth.auth.getSession();
  currentSession = session;

  supaAuth.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    if(event === 'PASSWORD_RECOVERY'){
      showAuth('set-password');
      return;
    }
    if(session && !_appStarted){
      _appStarted = true;
      hideAuth();
      render();
      initSync();
    } else if(session && _appStarted){
      hideAuth();
    } else if(!session){
      _appStarted = false;
      showAuth('signin');
    }
  });

  if(session){
    _appStarted = true;
    render();
    initSync();
  } else {
    showAuth('signin');
  }
}
/* =================== END AUTH =================== */

initApp();
