"use strict";
/* =====================================================================
   Lean Plan — offline-first nutrition & training PWA.
   Order: constants → state → sync → domain → UI primitives → views →
          sheets → actions/events → push/backup → auth.
   Design principle: effort proportional to uncertainty. Every log carries
   an error estimate; the app only asks about what moves the total.
   ===================================================================== */

/* ---------- constants ---------- */
const MEALS = ['breakfast','lunch','dinner','snack'];
const MEAL_LABEL = {breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snacks', other:'Other'};

/* Typical relative error of an entry by how its amount was captured.
   Day uncertainty is the root-sum-square of kcal × error across entries. */
const ERR = { g:0.08, serv:0.12, usual:0.10, recipe:0.12, hand:0.20, quick:0.25, fat:0.30 };
const ERR_LABEL = { g:'Weighed', serv:'Serving', usual:'Your usual', recipe:'Recipe', hand:'Hand estimate', quick:'Quick estimate', fat:'Cooking fat' };

/* Accuracy mode sets how much the app asks. An entry is surfaced for a quick
   check when its error class is at least `minErr` (a guess the user can
   improve) and its uncertainty is at least `flag` kcal. */
const ACCURACY = {
  relaxed:  { label:'Relaxed',  flag:Infinity, minErr:1,    askFat:false, desc:'Fewest questions. Estimates carry a wider margin.' },
  balanced: { label:'Balanced', flag:45,       minErr:0.2,  askFat:true,  desc:'Asks only when an answer would move your total.' },
  precise:  { label:'Precise',  flag:20,       minErr:0.12, askFat:true,  desc:'Tighter numbers, with a few more quick checks.' }
};

/* Hand portions: zero-equipment estimates, calibratable per person. */
const HANDS = {
  palm:   { label:'Palm',        hint:'Meat, fish, tofu', g:100 },
  cupped: { label:'Cupped hand', hint:'Rice, pasta, oats', g:90 },
  fist:   { label:'Fist',        hint:'Veg, fruit, cereal', g:80 },
  thumb:  { label:'Thumb',       hint:'Oil, butter, nut butter', g:12 }
};
const HAND_FOR_CAT = { meat:'palm', fish:'palm', eggs:'palm', grains:'cupped', potato:'cupped', ready:'cupped', veg:'fist', fruit:'fist', snacks:'cupped', dairy:'cupped', fats:'thumb', sauces:'thumb' };

/* Cooking fat is the biggest systematic miss in food logging, so for foods
   that are usually cooked in fat we ask one question. */
const COOK_CATS = new Set(['meat','fish','eggs','veg','potato']);
const COOK_EXCLUDE = /boiled|steamed|raw|poached|tinned|canned|smoked|in water|chips|roast|fried|crisp|jacket|mash|salad|pickled/i;
const FAT_OPTS = [
  { id:'none',   label:'Dry or grilled' },
  { id:'spray',  label:'Spray oil',  n:'Oil spray', g:1,  k:9,   f:1 },
  { id:'tsp',    label:'1 tsp oil',  n:'Oil',       g:5,  k:44,  f:5 },
  { id:'tbsp',   label:'1 tbsp oil', n:'Oil',       g:14, k:124, f:14 },
  { id:'butter', label:'Butter',     n:'Butter',    g:10, k:74,  f:8.2, p:0.1 },
  { id:'unsure', label:'Not sure',   n:'Oil (estimate)', g:5, k:44, f:5, err:0.6 }
];

const MOODS  = ['Rough','Low','Okay','Good','Great'];
const HUNGER = ['Starving','Hungry','Satisfied','Full','Stuffed'];
const DOW_SHORT = 'MTWTFSS';

/* ---------- state / storage ---------- */
const KEY="leanplan.v1";
let state = load();
let cur = todayStr();
let tab = "today";

function load(){
  let s=null;
  try{ s=JSON.parse(localStorage.getItem(KEY)); }catch(e){}
  if(!s||!s.days) s={ target:{...DEFAULT_TARGET}, days:{} };
  normalize(s);
  return s;
}
/* fill defaults for anything missing — runs on load, import and after a pull */
function normalize(s){
  if(!s.target) s.target={...DEFAULT_TARGET};
  if(!s.schedule) s.schedule={...DEFAULT_SCHEDULE};
  if(!s.profile) s.profile={...DEFAULT_PROFILE};
  const p=s.profile;
  if(!Array.isArray(p.supplements)) p.supplements=[];
  if(p.notificationsEnabled===undefined) p.notificationsEnabled=false;
  if(!ACCURACY[p.accuracy]) p.accuracy='balanced';
  if(typeof p.gentle!=='boolean') p.gentle=false;
  if(!(p.rangeWidth>=0)) p.rangeWidth=100;
  if(!p.hands||typeof p.hands!=='object') p.hands={};
  if(!Array.isArray(p.plans)) p.plans=[];
  if(!['system','light','dark'].includes(p.theme)) p.theme='system';
  if(!Array.isArray(s.customFoods)) s.customFoods=[];
  if(!Array.isArray(s.recipes)) s.recipes=[];
}
/* built-in foods + the user's saved custom foods, in a stable order */
function allFoods(){ return FOODS.concat(state.customFoods||[]); }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
const EMPTY_DAY = Object.freeze({foods:[],supps:{},weight:null,workout:null,checkin:null});
/* day() is for writes (creates the record); peek() is for reads (never mutates) */
function day(d){ if(!state.days[d]) state.days[d]={foods:[],supps:{},weight:null,workout:null,checkin:null}; return state.days[d]; }
function peek(d){ return state.days[d] || EMPTY_DAY; }
function todayStr(){ return ymd(new Date()); }
function ymd(t){ return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"); }
function parseYmd(d){ const p=d.split("-"); return new Date(+p[0],+p[1]-1,+p[2]); }
function addDays(t,n){ const x=new Date(t); x.setDate(x.getDate()+n); return x; }
function shiftStr(d,n){ return ymd(addDays(parseYmd(d),n)); }
function daysBetween(a,b){ return Math.round((parseYmd(b)-parseYmd(a))/864e5); }
function fmtDate(d){
  const t=parseYmd(d);
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return {dow:days[t.getDay()], full:t.getDate()+" "+mon[t.getMonth()]+" "+t.getFullYear(), short:t.getDate()+" "+mon[t.getMonth()], idx:t.getDay()};
}
function scheduledFor(d){ return (state.schedule && state.schedule[fmtDate(d).idx]) || "Rest"; }
function howToLink(name){ return "https://www.youtube.com/results?search_query="+encodeURIComponent(name+" exercise proper form technique"); }
function r0(x){ return Math.round(x); }
function r1(x){ return Math.round(x*10)/10; }
function fmt(x){ return Math.round(x||0).toLocaleString('en-GB'); }
function frac(x){ const w=Math.floor(x), f=x-w; const s=f>=0.74?'¾':f>=0.49?'½':f>=0.24?'¼':''; return (w||!s?String(w||0):'')+s; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(p){ return crypto.randomUUID ? crypto.randomUUID() : p+Date.now()+Math.random().toString(16).slice(2); }
function val(id){ const e=document.getElementById(id); return e?e.value.trim():""; }

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
function profileWeight(){
  if(state.days[cur]?.weight) return state.days[cur].weight;
  if(state.profile.weight) return state.profile.weight;
  const dates = Object.keys(state.days).sort().reverse();
  for(const d of dates){ if(state.days[d]?.weight) return state.days[d].weight; }
  return null;
}

/* ---------- auth session state (set by initApp before any sync) ---------- */
let currentSession = null;
function getToken(){ return currentSession?.access_token || SB_KEY; }
function getUid(){ return currentSession?.user?.id || LOCAL_USER; }

/* ===================== SUPABASE SYNC =====================
   Offline-first: localStorage stays the instant working store. Writes mark records
   dirty; when online they upsert to Supabase. On load/reconnect we pull and merge,
   last-write-wins per record (settings, each day, each custom food). */
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
      state._meta.settings.dirty = true;
      Object.keys(state.days||{}).forEach(d=>{ state._meta.days[d]={u:nowIso(),dirty:true}; });
    }
  }
  if(!state._meta.days) state._meta.days={};
  if(!Array.isArray(state._meta.foodDeletes)) state._meta.foodDeletes=[];
  if(!Array.isArray(state._meta.recipeDeletes)) state._meta.recipeDeletes=[];
  (state.customFoods||[]).forEach(f=>{
    if(!f.id) f.id = uid("f");
    if(migrate){ f._dirty=true; f._u=nowIso(); }
  });
  (state.recipes||[]).forEach(r=>{
    if(!r.id) r.id = uid("r");
    if(migrate){ r._dirty=true; r._u=nowIso(); }
  });
}
function markSettingsDirty(){ ensureMeta(); state._meta.settings={u:nowIso(),dirty:true}; save(); scheduleSync(); }
function markDayDirty(d){ ensureMeta(); state._meta.days[d]={u:nowIso(),dirty:true}; save(); scheduleSync(); }
function markFoodDirty(f){ ensureMeta(); f._dirty=true; f._u=nowIso(); save(); scheduleSync(); }
function queueFoodDelete(id){ ensureMeta(); if(id) state._meta.foodDeletes.push(id); save(); scheduleSync(); }
function markRecipeDirty(r){ ensureMeta(); r._dirty=true; r._u=nowIso(); save(); scheduleSync(); }
function queueRecipeDelete(id){ ensureMeta(); if(id) state._meta.recipeDeletes.push(id); save(); scheduleSync(); }

/* ---- client <-> server row mapping ----
   day_logs has no check-in column, so the check-in travels inside the supps
   jsonb under a reserved key and is unpacked on pull. */
function toServerFood(f){ return {id:f.id, user_id:getUid(), name:f.n, kcal:+f.k||0, protein:+f.p||0, carbs:+f.c||0, fat:+f.f||0, grams:+f.g||100}; }
function fromServerFood(r){ return {id:r.id, n:r.name, k:r.kcal, p:r.protein, c:r.carbs, f:r.fat, g:r.grams, _u:r.updated_at, _dirty:false}; }
function toServerDay(d){
  const x=state.days[d]||{};
  const supps = x.checkin ? {...(x.supps||{}), _checkin:x.checkin} : (x.supps||{});
  return {user_id:getUid(), log_date:d, foods:x.foods||[], supps, weight:(x.weight??null), workout:x.workout??null};
}
function fromServerDay(row){
  const {_checkin, ...supps} = row.supps||{};
  return { foods:row.foods||[], supps, weight:(row.weight??null), workout:row.workout||null, checkin:_checkin||null };
}
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
  const uid_ = getUid();
  const s = await sbGet("/settings?user_id=eq."+uid_+"&select=*");
  if(s.length && !m.settings.dirty){
    state.target = s[0].target; state.schedule = s[0].schedule;
    if(s[0].profile) state.profile = s[0].profile;
    m.settings.u = s[0].updated_at;
  }
  const cf = await sbGet("/custom_foods?user_id=eq."+uid_+"&select=*");
  const byId = {};
  cf.map(fromServerFood).forEach(f=>{ byId[f.id]=f; });
  (state.customFoods||[]).filter(f=>f._dirty).forEach(f=>{ byId[f.id]=f; }); // unpushed local edits win
  state.customFoods = Object.values(byId);
  const rc = await sbGet("/recipes?user_id=eq."+uid_+"&select=*");
  const rById = {};
  rc.map(fromServerRecipe).forEach(r=>{ rById[r.id]=r; });
  (state.recipes||[]).filter(r=>r._dirty).forEach(r=>{ rById[r.id]=r; });
  state.recipes = Object.values(rById);
  const dl = await sbGet("/day_logs?user_id=eq."+uid_+"&select=*");
  dl.forEach(row=>{
    const d = row.log_date;
    if(m.days[d] && m.days[d].dirty) return; // keep unpushed local day
    state.days[d] = fromServerDay(row);
    m.days[d] = { u:row.updated_at, dirty:false };
  });
  normalize(state);
  m.lastPull = nowIso();
  save();
}

/* ---- orchestration + status ---- */
let _syncing=false, _syncTimer=null, _syncText="";
function setSync(txt){
  _syncText=txt;
  const el=document.getElementById("syncStatus");
  if(el) el.textContent=txt;
}
function maybeRender(){
  const a=document.activeElement;
  if(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return; // don't clobber typing
  if(document.getElementById("sheetRoot").classList.contains("open")) return;
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
    applyTheme();
    maybeRender();
  }catch(e){
    setSync("sync error");
    console.warn("sync failed:", e);
  }finally{ _syncing=false; }
}
function scheduleSync(){ if(!window.supabase) return; clearTimeout(_syncTimer); _syncTimer=setTimeout(sync, 800); }
function initSync(){
  ensureMeta(!state._meta && (Object.keys(state.days||{}).length>0 || (state.customFoods||[]).length>0 || (state.recipes||[]).length>0));
  window.addEventListener("online", sync);
  // re-pull whenever the app is brought back to the foreground (key for iOS home-screen apps)
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) sync(); });
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
  sync();
}
/* =================== END SUPABASE SYNC =================== */

/* ===================== DOMAIN ===================== */
function totals(d){
  const t={k:0,p:0,c:0,f:0};
  peek(d).foods.forEach(x=>{t.k+=x.k;t.p+=x.p;t.c+=x.c;t.f+=x.f;});
  return t;
}
/* a range, not a hard limit: target (+ workout burn) ± the user's width */
function rangeFor(d){
  const mid=state.target.kcal + workoutBurn(peek(d).workout), w=state.profile.rangeWidth;
  return { mid, lo:mid-w, hi:mid+w };
}
function entryErr(x){ return typeof x.err==='number' ? x.err : 0.12; }
function isEstimate(x){ return entryErr(x) >= 0.2; }
function band(d){
  const ss=peek(d).foods.reduce((a,x)=>a+Math.pow(x.k*entryErr(x),2),0);
  return Math.round(Math.sqrt(ss)/10)*10;
}
function isFlagged(x){
  const a=ACCURACY[state.profile.accuracy];
  return !x.ok && entryErr(x)>=a.minErr && x.k*entryErr(x)>=a.flag;
}
/* entries worth a second look: guesses with a big kcal margin, not yet confirmed */
function flagged(d){
  return peek(d).foods.map((x,i)=>({x,i})).filter(o=>isFlagged(o.x))
    .sort((a,b)=>b.x.k*entryErr(b.x)-a.x.k*entryErr(a.x));
}
/* neutral wording — no red, no "over", no verdicts */
function energyStatus(t,r){
  if(t.k<=0) return { word:'Nothing logged yet', short:'Not started', gentle:'Nothing logged yet' };
  if(t.k<r.lo) return { word:`About ${fmt(r.mid-t.k)} kcal to go`, short:t.k<r.lo-500?'Plenty of room':'Some room', gentle: t.k<r.lo-500 ? 'Plenty of room left' : 'Some room left' };
  if(t.k<=r.hi) return { word:'In your range', short:'In range', gentle:'In your range' };
  return { word:`${fmt(t.k-r.hi)} kcal above your range`, short:'Above range', gentle:'Above your range, and that’s okay' };
}
function mealNow(){ const h=new Date().getHours(); return h<11?'breakfast':h<15?'lunch':h<20?'dinner':'snack'; }
function suppsForDay(){ return state.profile.supplements || []; }
function gentle(){ return !!state.profile.gentle; }
function handGrams(type){ return +state.profile.hands[type] || HANDS[type].g; }
function handDefault(f){ return HAND_FOR_CAT[f.cat] || 'cupped'; }
function cookable(f){ return COOK_CATS.has(f.cat) && !COOK_EXCLUDE.test(f.n); }
function unitOf(x){ return x.unit || (x.ml?'ml':'g'); }

/* most recent time this food was logged — drives "your usual" portions */
function lastUse(name){
  const ds=Object.keys(state.days).sort().reverse();
  for(const d of ds){
    const fs=state.days[d].foods||[];
    for(let i=fs.length-1;i>=0;i--){ if(fs[i].n===name && fs[i].src!=='fat') return fs[i]; }
  }
  return null;
}
/* foods eaten in this meal slot on 2+ of the last 21 days, not yet logged today */
function usuals(meal){
  const days=Object.keys(state.days).filter(d=>d<cur).sort().reverse().slice(0,21);
  const counts={};
  days.forEach(d=>{
    const seen=new Set();
    (state.days[d].foods||[]).forEach(x=>{
      if(x.meal!==meal || x.src==='fat' || seen.has(x.n)) return;
      seen.add(x.n);
      if(!counts[x.n]) counts[x.n]={n:x.n,count:0,last:x};
      counts[x.n].count++;
    });
  });
  const logged=new Set(peek(cur).foods.filter(x=>x.meal===meal).map(x=>x.n));
  return Object.values(counts).filter(c=>c.count>=2 && !logged.has(c.n)).sort((a,b)=>b.count-a.count).slice(0,4);
}
function yesterdayMeal(meal){ return (peek(shiftStr(cur,-1)).foods||[]).filter(x=>x.meal===meal); }
function recentFoods(){
  const all=allFoods(), seen=new Set(), out=[];
  for(const d of Object.keys(state.days).sort().reverse().slice(0,14)){
    for(const f of (state.days[d].foods||[])){
      if(seen.has(f.n)) continue; seen.add(f.n);
      const m=all.find(x=>x.n===f.n); if(m) out.push(m);
      if(out.length>=8) return out;
    }
  }
  return out;
}
function weekOf(d){ const b=parseYmd(d), off=(b.getDay()+6)%7; return [...Array(7)].map((_,i)=>ymd(addDays(b,i-off))); }
function dayStat(d){
  const x=peek(d), t=totals(d), r=rangeFor(d);
  return { d, t, r, logged:x.foods.length>0, future:d>todayStr(), done:!!(x.workout&&x.workout.type),
    planned:(state.schedule[parseYmd(d).getDay()]||'Rest')!=='Rest', inRange:t.k>=r.lo&&t.k<=r.hi };
}
function avg(a){ return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0; }
function weightSeries(n){
  return Object.keys(state.days).filter(d=>state.days[d].weight && d<=cur).sort().slice(-n).map(d=>state.days[d].weight);
}
/* weekly average vs the week before — the trend, not the daily bounce */
function weightWeekDelta(){
  const w=(from,to)=>{ const v=[]; for(let i=from;i<to;i++){ const x=peek(shiftStr(cur,-i)).weight; if(x) v.push(x); } return v; };
  const a=w(0,7), b=w(7,14);
  return (a.length && b.length) ? r1(avg(a)-avg(b)) : null;
}
function plansDue(){
  const t=todayStr();
  return state.profile.plans.filter(pl=>daysBetween(pl.lastReview||pl.created||t, t)>=7);
}
function initials(){
  const n=(state.profile.name||'').trim();
  if(!n) return ic('person');
  return esc(n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());
}

/* ===================== UI PRIMITIVES ===================== */
const I = {
  heart:'<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>',
  fork:'<path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6M17 21V3c-2 1.5-3 4-3 7v4h3"/>',
  dumbbell:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  person:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8"/>',
  flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.3 3.8-7.7.3 1.8 1.3 3 2.3 3.4.2-3 1.6-5.7 3.9-7.5-.2 2.8 3 5.4 3 9.8 0 3.6-2.6 8.2-6.5 8.2z"/>',
  scale:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.2 10a5.2 5.2 0 0 1 7.6 0L12 13.5z"/>',
  pill:'<path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7z"/><path d="M8.5 10.5l5 5"/>',
  smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01"/>',
  check:'<path d="M5 12.5l4.2 4.2L19 7"/>',
  checkc:'<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16 9.6"/>',
  chart:'<path d="M5 20V11M10 20V5M15 20v-7M20 20v-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chevR:'<path d="M9 5l7 7-7 7"/>',
  chevL:'<path d="M15 5l-7 7 7 7"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  bolt:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  book:'<path d="M5 5.5a2 2 0 0 1 2-2h11.5v14H7a2 2 0 0 0-2 2z"/><path d="M5 19.5a2 2 0 0 0 2 2h11.5v-4"/>',
  hand:'<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.9-2.5L2.8 15a1.6 1.6 0 0 1 2.5-2L8 15.5"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  moon:'<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  leaf:'<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2"/>',
  cloud:'<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6 3.8 3.8 0 0 1-.3 7.4z"/>',
  doc:'<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12.5h6M9.5 16h6"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'
};
function ic(name,cls){ return `<svg class="i ${cls||''}" viewBox="0 0 24 24" aria-hidden="true">${I[name]||''}</svg>`; }
const chev = `<svg class="i chev" viewBox="0 0 24 24" aria-hidden="true">${I.chevR}</svg>`;
function catHead(color,icon,label,meta){
  return `<div class="hk-h"><div class="hk-c" style="color:var(--${color}-ink)">${ic(icon,'sm')}${label}</div>${meta!=null?`<div class="hk-m">${meta}</div>`:''}</div>`;
}
function pageHeader({eyebrow,title,right}){
  return `<header class="hdr"><div><div class="eyebrow">${eyebrow||''}</div><h1 class="ltitle">${title}</h1></div>${right||''}</header>`;
}
function dayNav(){
  const f=fmtDate(cur), isT=cur===todayStr();
  return `<span class="daynav"><button data-act="shiftDay" data-n="-1" aria-label="Previous day">${ic('chevL')}</button>
    <span>${isT?'Today':f.dow} · ${f.short}</span>
    <button data-act="shiftDay" data-n="1" aria-label="Next day">${ic('chevR')}</button></span>`;
}
/* Apple-style concentric rings. items: [{pct,color}] outermost first */
function rings(items,size,sw){
  sw=sw||Math.round(size*0.105);
  const c=size/2, gap=Math.max(1.5,sw*0.2); let r=c-sw/2, out='';
  for(const it of items){
    const C=2*Math.PI*r, p=Math.max(0,Math.min(1,it.pct||0));
    out+=`<circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" stroke="${it.color}" stroke-opacity=".22" stroke-width="${sw}"/>`;
    if(p>0.005) out+=`<circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" stroke="${it.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C*(1-p)).toFixed(2)}"/>`;
    r-=sw+gap;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex:none"><g transform="rotate(-90 ${c} ${c})">${out}</g></svg>`;
}
/* horizontal bar with tick marks at the edges of the target range */
function rangeBar(k,r){
  const max=r.hi*1.25, P=v=>Math.max(0,Math.min(100,v/max*100));
  return `<div class="rbar" aria-hidden="true"><div class="f" style="width:${P(k)}%"></div>
    <div class="tk" style="left:${P(r.lo)}%"></div><div class="tk" style="left:${P(r.hi)}%"></div></div>`;
}
function macroCol(label,v,goal,color){
  return `<div class="mc"><div class="k" style="color:var(--${color}-ink)">${label}</div>
    <div class="v num">${fmt(v)}<small> / ${goal} g</small></div>
    <div class="b"><i style="width:${Math.min(100,goal?v/goal*100:0)}%;background:var(--${color})"></i></div></div>`;
}
function sparkline(vals,w,h,color){
  if(vals.length<2) return '';
  const mn=Math.min(...vals), mx=Math.max(...vals), rg=(mx-mn)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*(w-4)+2).toFixed(1)},${(h-3-(v-mn)/rg*(h-6)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
/* Fitbit-style week bars against the range band. Missed days are a quiet stub, not a gap to feel bad about. */
function weekBars(rows){
  const W=320,H=128,base=H-20;
  const max=Math.max(...rows.map(x=>x.t.k), ...rows.map(x=>x.r.hi))*1.08||1;
  const y=v=>base-v/max*(base-4), step=W/7, bw=24;
  const lo=state.target.kcal-state.profile.rangeWidth, hi=state.target.kcal+state.profile.rangeWidth;
  let s=`<rect x="0" y="${y(hi).toFixed(1)}" width="${W}" height="${(y(lo)-y(hi)).toFixed(1)}" rx="5" fill="var(--energy)" fill-opacity=".13"/>`;
  rows.forEach((x,i)=>{
    const cx=step*i+step/2;
    if(x.logged){ const top=y(x.t.k); s+=`<rect x="${cx-bw/2}" y="${top.toFixed(1)}" width="${bw}" height="${Math.max(4,base-top).toFixed(1)}" rx="6" fill="var(--energy)" fill-opacity="${x.d===cur?1:.75}"/>`; }
    else if(!x.future) s+=`<rect x="${cx-bw/2}" y="${base-3}" width="${bw}" height="3" rx="1.5" fill="var(--fill3)"/>`;
    s+=`<text x="${cx}" y="${H-4}" text-anchor="middle" class="${x.d===cur?'on':''}">${DOW_SHORT[i]}</text>`;
  });
  return `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Energy this week against your range">${s}</svg>`;
}
function weekStrip(){
  const tdy=todayStr();
  return `<div class="week">${weekOf(cur).map((ds,i)=>{
    const st=dayStat(ds), sched=state.schedule[parseYmd(ds).getDay()]||'Rest';
    return `<button class="wd ${ds===cur?'sel':''} ${ds===tdy?'today':''} ${st.future?'future':''}" data-act="goDay" data-d="${ds}" aria-label="${fmtDate(ds).dow} ${fmtDate(ds).short}">
      <span class="l">${DOW_SHORT[i]}</span>
      <span class="rw">${rings([{pct:st.t.k/st.r.mid,color:'var(--energy)'}],34,3.5)}<span class="num">${parseYmd(ds).getDate()}</span></span>
      <span class="t ${st.done?'done':''}">${st.done?'✓ Done':sched}</span></button>`;
  }).join('')}</div>`;
}
function tile(attrs,color,icon,label,value,sub,extra){
  return `<div class="tile" role="button" tabindex="0" ${attrs}>${catHead(color,icon,label,chev)}
    <div class="v num">${value}</div>${extra||''}${sub?`<div class="s">${sub}</div>`:''}</div>`;
}
function portionText(x){
  const u=unitOf(x);
  if(x.how==='quick') return 'Quick estimate';
  if(x.how==='hand' && x.hand) return `${frac(x.hand.count)} ${HANDS[x.hand.type].label.toLowerCase()}${x.hand.count>1?'s':''} · ≈ ${x.grams} ${u}`;
  if(x.how==='recipe') return `${frac(x.serv||1)} serving${(x.serv||1)!==1?'s':''}`;
  if(x.src==='fat') return `${x.grams} ${u} · for ${esc(x.fatFor||'cooking')}`;
  return `${x.grams} ${u}${x.how==='usual'?' · your usual':''}`;
}
function entryRow(x){
  return `<button class="li" data-act="editEntry" data-i="${x._i}"><div class="m"><div class="t">${esc(x.n)}</div><div class="s">${portionText(x)}</div></div>
    ${gentle()?'':`<div class="tr num">${isEstimate(x)?'≈ ':''}${fmt(x.k)}</div>`}${chev}</button>`;
}

/* ===================== RENDER ===================== */
function render(opts){
  const v=document.getElementById("view");
  if(tab==="today") v.innerHTML=viewToday();
  else if(tab==="food") v.innerHTML=viewFood();
  else if(tab==="train") v.innerHTML=viewTrain();
  else if(tab==="plan") v.innerHTML=viewPlan();
  else if(tab==="info") v.innerHTML=viewInfo();
  if(opts&&opts.top) window.scrollTo(0,0);
}
function applyTheme(){
  const t=state.profile.theme, el=document.documentElement;
  if(t==='light'||t==='dark') el.dataset.theme=t; else delete el.dataset.theme;
}

/* ---------- SUMMARY ---------- */
let dismissedMissed=false;
function viewToday(){
  const w=peek(cur), t=totals(cur), tg=state.target, r=rangeFor(cur), st=energyStatus(t,r);
  const wk=w.workout, sched=scheduledFor(cur), logged=!!(wk&&wk.type), isRest=!logged&&sched==='Rest';
  const burn=workoutBurn(wk), bnd=band(cur), flags=flagged(cur), f=fmtDate(cur), isToday=cur===todayStr();

  const act = logged
    ? (wk.type==='Cardio' ? `${wk.mins||'?'}<small> min</small>` : `<span class="w">${esc(wk.type)} done</span>`)
    : `<span class="w">${isRest?'Rest day':sched+' planned'}</span>`;
  const hero = `
  <div class="card" role="button" tabindex="0" data-act="tab" data-tab="food">
    <div class="hero">
      ${rings([{pct:t.k/r.mid,color:'var(--energy)'},{pct:t.p/tg.p,color:'var(--protein)'},{pct:logged?1:0,color:'var(--activity)'}],124)}
      <div class="legend">
        <div class="lg"><div class="k" style="color:var(--energy-ink)">Energy</div>
          <div class="v num">${gentle()?`<span class="w">${st.short}</span>`:`${fmt(t.k)}<small> / ${fmt(r.mid)} kcal</small>`}</div></div>
        <div class="lg"><div class="k" style="color:var(--protein-ink)">Protein</div><div class="v num">${fmt(t.p)}<small> / ${tg.p} g</small></div></div>
        <div class="lg"><div class="k" style="color:var(--activity-ink)">Activity</div><div class="v num">${act}</div></div>
      </div>
    </div>
    <div class="hero-f"><span class="grow">${gentle()?st.gentle:st.word}</span>
      ${t.k&&!gentle()?`<button class="pm num" data-act="explainBand" aria-label="About this estimate">± ${bnd}</button>`:''}${chev}</div>
  </div>`;

  let checks='';
  if(flags.length){
    checks=`<div class="list"><div style="padding:14px 16px 6px">${catHead('mind','target','Worth a quick check',null)}
      <div class="sub">${flags.length===1?'This estimate moves':'These estimates move'} your total the most. A quick tweak keeps your numbers honest.</div></div>
      ${flags.slice(0,3).map(o=>`<button class="li" data-act="editEntry" data-i="${o.i}">
        <div class="m"><div class="t">${esc(o.x.n)}</div><div class="s">${ERR_LABEL[o.x.how]||'Estimate'}${gentle()?'':` · ± ${fmt(o.x.k*entryErr(o.x))} kcal`}</div></div>
        <span class="tr" style="color:var(--tint)">Adjust</span></button>`).join('')}</div>`;
  }

  let usual='';
  if(isToday){
    const m=mealNow(), us=usuals(m);
    if(us.length) usual=`<div class="sec-t">Your usual ${MEAL_LABEL[m].toLowerCase()}</div>
      <div class="list">${us.map(u=>`<div class="li" role="button" tabindex="0" data-act="logUsual" data-n="${esc(u.n)}" data-meal="${m}">
        <div class="m"><div class="t">${esc(u.n)}</div><div class="s">${portionText(u.last)}${gentle()?'':` · ${fmt(u.last.k)} kcal`}</div></div>
        <span class="addc">${ic('plus')}</span></div>`).join('')}</div>
      <div class="foot">Logged ${us[0].count} times recently. One tap adds your usual portion.</div>`;
  }

  const due=plansDue();
  const planCard = due.length&&isToday ? `<div class="banner" role="button" tabindex="0" data-act="reviewPlans">
    <span style="color:var(--mind-ink)">${ic('bulb')}</span><div><b>How are your plans going?</b><br><span class="muted">A 10-second check-in on ${due.length===1?'your plan':`${due.length} plans`}. Plans work best when you revisit them.</span></div></div>` : '';

  // missed-day framing: supportive, never a streak to lose
  const yd=peek(shiftStr(cur,-1)), hasHistory=Object.keys(state.days).some(d=>d<cur&&state.days[d].foods.length);
  const missed = isToday && !dismissedMissed && hasHistory && !yd.foods.length && !w.foods.length ? `<div class="banner">
    <span style="color:var(--energy-ink)">${ic('leaf')}</span><div><b>Welcome back.</b><br><span class="muted">A day off logging doesn't undo anything. Pick up from here.</span></div>
    <button class="x" data-act="dismissMissed" aria-label="Dismiss">${ic('x')}</button></div>` : '';

  // pinned tiles
  const wkSub = logged ? (burn?`+${fmt(burn)} kcal of room`:'Logged') : (isRest?'Recovery counts too':'Tap to start');
  const tiles=[
    tile('data-act="tab" data-tab="train"','activity','dumbbell','Workout', logged?`<span class="w">${esc(wk.type)}</span>`:`<span class="w">${isRest?'Rest':esc(sched)}</span>`, wkSub),
    tile('data-act="openCheckin"','mind','smile','Check-in',
      w.checkin?`<span class="w">${MOODS[w.checkin.mood-1]||'—'}</span>`:`<span class="w">How are you?</span>`,
      w.checkin?`Hunger: ${HUNGER[w.checkin.hunger-1]||'—'}`:'Mood and hunger')
  ];
  if(!gentle()){
    const ws=weightSeries(14), dlt=weightWeekDelta();
    tiles.push(tile('data-act="openWeight"','body','scale','Weight',
      w.weight?`${r1(w.weight)}<small>kg</small>`:(ws.length?`${r1(ws[ws.length-1])}<small>kg</small>`:`<span class="w">Add</span>`),
      dlt==null?(w.weight?'Today':'Weekly trend appears here'):`${dlt>0?'+':dlt<0?'−':''}${Math.abs(dlt)} kg vs last week`,
      ws.length>1?`<div style="margin-top:6px">${sparkline(ws,120,28,'var(--body)')}</div>`:''));
  }
  const wkDays=weekOf(cur).map(dayStat), past=wkDays.filter(x=>!x.future), lg=past.filter(x=>x.logged).length;
  tiles.push(tile('data-act="tab" data-tab="food"','energy','checkc','Consistency', `${lg}<small>of ${past.length} days</small>`, 'logged this week',
    `<div class="dots">${wkDays.map(x=>`<i class="${x.logged?'on':x.future?'fu':''}"></i>`).join('')}</div>`));

  const supps=suppsForDay();
  const suppCard = supps.length ? `<div class="sec-t">Supplements<span class="sub num">${supps.filter(s=>w.supps[s.id]).length} of ${supps.length}</span></div>
    <div class="list">${supps.map(s=>`<button class="li" data-act="toggleSupp" data-id="${esc(s.id)}" aria-pressed="${!!w.supps[s.id]}">
      <span class="chk ${w.supps[s.id]?'on':''}">${w.supps[s.id]?ic('check'):''}</span>
      <div class="m"><div class="t">${esc(s.name)}</div></div><span class="tr num">${esc(s.time)}</span></button>`).join('')}</div>` : '';

  return `
  ${pageHeader({eyebrow:`${isToday?'Today':f.dow} · ${f.short}<span id="syncStatus" class="sync" data-act="syncNow" title="Tap to sync">${_syncText}</span>`, title:'Summary',
    right:`<button class="avatar" data-act="tab" data-tab="info" aria-label="Profile">${initials()}</button>`})}
  ${weekStrip()}
  ${missed}
  ${hero}
  ${checks}
  ${planCard}
  ${usual}
  <div class="sec-t">Pinned</div>
  <div class="tiles">${tiles.join('')}</div>
  ${suppCard}
  <div class="sec-t">This week</div>
  ${weekCard(wkDays)}
  `;
}
function weekCard(rows){
  const past=rows.filter(x=>!x.future), lg=past.filter(x=>x.logged);
  const hl=[];
  if(lg.length>=2){
    const inR=lg.filter(x=>x.inRange).length;
    hl.push(gentle() ? `You logged on ${lg.length} days this week. ${inR?`${inR} of them landed in your range.`:''}`
      : `You averaged <b class="num">${fmt(avg(lg.map(x=>x.t.k)))} kcal</b> on the ${lg.length} days you logged, and ${inR} ${inR===1?'was':'were'} in your range.`);
    const prev=weekOf(shiftStr(rows[0].d,-7)).map(dayStat).filter(x=>x.logged), pNow=avg(lg.map(x=>x.t.p));
    if(prev.length>=2){ const dl=r0(pNow-avg(prev.map(x=>x.t.p)));
      hl.push(`Protein averaged <b class="num">${fmt(pNow)} g</b>${Math.abs(dl)>=5?`, ${dl>0?'up':'down'} ${Math.abs(dl)} g a day on last week`:', steady on last week'}.`); }
    else hl.push(`Protein averaged <b class="num">${fmt(pNow)} g</b> a day.`);
  } else hl.push('Log a couple of days and your weekly picture fills in here. Averages say far more than any single day.');
  const planned=rows.filter(x=>x.planned).length, done=rows.filter(x=>x.done).length;
  if(planned) hl.push(`<b class="num">${done} of ${planned}</b> planned sessions done${done>=planned?'. Nice work.':' so far.'}`);
  return `<div class="card">${catHead('energy','chart','Energy',`<span class="num">${gentle()?'':`${fmt(state.target.kcal-state.profile.rangeWidth)}–${fmt(state.target.kcal+state.profile.rangeWidth)} kcal range`}</span>`)}
    ${weekBars(rows)}${hl.map(h=>`<div class="hl">${h}</div>`).join('')}</div>`;
}

/* ---------- FOOD ---------- */
let foodSub="foods"; // "foods" | "recipes"
function viewFood(){
  if(foodSub==='recipes') return viewRecipes();
  const t=totals(cur), tg=state.target, r=rangeFor(cur), st=energyStatus(t,r), bnd=band(cur);
  const fs=peek(cur).foods, groups={breakfast:[],lunch:[],dinner:[],snack:[],other:[]};
  fs.forEach((x,i)=>{ (groups[x.meal]||groups.other).push({...x,_i:i}); });

  const summary = `<div class="card">
    ${gentle()?`<div class="big" style="font-size:24px">${st.gentle}</div>`
      :`<div class="big num">${fmt(t.k)}<small>kcal</small>${t.k?`<button class="pm num" data-act="explainBand" aria-label="About this estimate">± ${bnd}</button>`:''}</div>
      <div class="sub" style="margin-top:2px">${st.word} · range <span class="num">${fmt(r.lo)}–${fmt(r.hi)}</span></div>`}
    ${rangeBar(t.k,r)}
    <div class="macro3">${macroCol('Protein',t.p,tg.p,'protein')}${macroCol('Carbs',t.c,tg.c,'carbs')}${macroCol('Fat',t.f,tg.f,'fat')}</div>
  </div>`;

  const sections=[...MEALS,'other'].map(m=>{
    const items=groups[m]; if(m==='other'&&!items.length) return '';
    const kcal=items.reduce((s,x)=>s+x.k,0), yd=items.length?[]:yesterdayMeal(m);
    return `<div class="grp-h"><span>${MEAL_LABEL[m]}</span><small class="num">${items.length&&!gentle()?fmt(kcal)+' kcal':''}</small></div>
      <div class="list">${items.map(entryRow).join('')}
      ${yd.length?`<button class="li act" data-act="repeatYesterday" data-meal="${m}">${ic('book','sm')}<div class="m"><div class="t">Same as yesterday</div>
        <div class="s">${yd.map(x=>esc(x.n)).slice(0,3).join(', ')}${yd.length>3?'…':''}</div></div></button>`:''}
      ${m!=='other'?`<button class="li act" data-act="openSearch" data-meal="${m}">${ic('plus','sm')}<span>Add food</span></button>`:''}</div>`;
  }).join('');

  return `
  ${pageHeader({eyebrow:dayNav(), title:'Food', right:`<button class="roundbtn" data-act="openSearch" aria-label="Add food">${ic('plus')}</button>`})}
  ${summary}
  ${sections}
  <div class="list icons" style="margin-top:26px">
    <button class="li" data-act="foodSub" data-v="recipes"><span class="ico" style="background:var(--activity)">${ic('book')}</span><div class="m"><div class="t">Recipes</div></div><span class="tr num">${state.recipes.length||''}</span>${chev}</button>
    <button class="li" data-act="openQuick"><span class="ico" style="background:var(--mind)">${ic('bolt')}</span><div class="m"><div class="t">Quick estimate</div></div>${chev}</button>
    <button class="li" data-act="openCreateFood"><span class="ico" style="background:var(--energy)">${ic('plus')}</span><div class="m"><div class="t">Create a food</div></div>${chev}</button>
  </div>
  <div class="foot">Numbers marked ≈ are estimates. Your day total shows a ± margin so it stays honest about what it knows.</div>`;
}

/* ---------- RECIPES ---------- */
function recipeTotals(r){
  const t={k:0,p:0,c:0,f:0,g:0};
  (r.items||[]).forEach(i=>{ const m=(+i.grams||0)/100;
    t.k+=(+i.k||0)*m; t.p+=(+i.p||0)*m; t.c+=(+i.c||0)*m; t.f+=(+i.f||0)*m; t.g+=(+i.grams||0); });
  return t;
}
function recipePer(r){ const t=recipeTotals(r); const s=(+r.servings||1)||1; return {k:t.k/s,p:t.p/s,c:t.c/s,f:t.f/s,g:t.g/s}; }
let mealBuilder=null;   // {id?, name, servings, items:[{n,k,p,c,f,grams}]}
let mealQuery="";
function viewRecipes(){
  const back=`<button class="back" data-act="foodSub" data-v="foods">${ic('chevL')}Food</button>`;
  if(mealBuilder) return pageHeader({eyebrow:back, title:mealBuilder.id?'Edit recipe':'New recipe'})+builderHtml();
  const rs=state.recipes||[];
  return `${pageHeader({eyebrow:back, title:'Recipes', right:`<button class="roundbtn" data-act="newRecipe" aria-label="New recipe">${ic('plus')}</button>`})}
  <div class="foot" style="padding:0 4px 12px">Cooked it yourself? You know exactly what went in. Build it once, then log a bowl in one tap.</div>
  ${rs.length?`<div class="list">${rs.map((r,ri)=>{ const per=recipePer(r);
    return `<div class="li"><div class="m"><div class="t">${esc(r.name)}</div><div class="s">${(+r.servings>1)?r.servings+' servings · ':''}${fmt(per.k)} kcal · ${r0(per.p)} g protein per serving</div></div>
      <button class="btn sm tinted" data-act="logRecipe" data-ri="${ri}">Log</button>
      <button class="navbtn" data-act="editRecipe" data-ri="${ri}" style="margin-left:6px">Edit</button></div>`; }).join('')}</div>`
    :`<div class="card empty">No recipes yet. Tap <b>+</b> to build one from its ingredients.</div>`}`;
}
function mealResultsHtml(q){
  const DB=allFoods();
  const matches = q ? DB.filter(f=>f.n.toLowerCase().includes(q)).slice(0,30) : (state.customFoods||[]).slice().concat(FOODS.slice(0,6));
  if(!matches.length) return '<div class="empty">No match.</div>';
  return matches.map(f=>`<button class="li" data-act="builderAdd" data-idx="${DB.indexOf(f)}"><div class="m"><div class="t">${esc(f.n)}</div>
    <div class="s">${f.k} kcal per 100 ${f.ml?'ml':'g'}</div></div><span class="addc">${ic('plus')}</span></button>`).join('');
}
function builderTotalsText(){
  const b=mealBuilder; if(!b) return "";
  const t=recipeTotals(b), s=(+b.servings||1)||1;
  return `Whole recipe <b class="num">${fmt(t.k)} kcal</b> · ${r0(t.p)} P ${r0(t.c)} C ${r0(t.f)} F<br>Per serving <b class="num">${fmt(t.k/s)} kcal</b> · ${r0(t.p/s)} P ${r0(t.c/s)} C ${r0(t.f/s)} F`;
}
function builderHtml(){
  const b=mealBuilder;
  return `<div class="list">
      <div class="frow"><label for="mealName">Name</label><input id="mealName" data-input="builderName" placeholder="Chicken curry" value="${esc(b.name)}"></div>
      <div class="frow"><label for="mealServings">Servings</label><input id="mealServings" data-input="builderServ" type="number" inputmode="decimal" value="${b.servings}"></div>
    </div>
    <div class="lbl">Ingredients</div>
    <div class="list" id="mealIngList">${(b.items||[]).map((i,ii)=>`<div class="li"><div class="m"><div class="t">${esc(i.n)}</div><div class="s">${i.k} kcal per 100 g</div></div>
      <input class="num" data-input="builderGram" data-ig="${ii}" type="number" inputmode="decimal" value="${i.grams}" style="width:72px;text-align:right;background:var(--fill);padding:7px 8px">
      <span class="muted">g</span><button class="navbtn" data-act="builderRemove" data-ii="${ii}" aria-label="Remove" style="color:var(--red)">${ic('x','sm')}</button></div>`).join('')
      ||'<div class="empty">Add what went in. Don\'t forget the oil — it\'s the part photos never see.</div>'}</div>
    <div class="card" id="mealTotals" style="font-size:15px;line-height:1.5">${builderTotalsText()}</div>
    <div class="lbl">Add ingredients</div>
    <div class="searchbar">${ic('search','sm')}<input id="mealSearch" data-input="builderSearch" placeholder="Search foods" value="${esc(mealQuery)}"></div>
    <div class="list" id="mealResults" style="margin-top:8px">${mealResultsHtml(mealQuery.trim().toLowerCase())}</div>
    <div class="stack"><button class="btn" data-act="saveRecipe">${b.id?"Save changes":"Save recipe"}</button>
    <button class="btn danger" data-act="cancelRecipe">Cancel</button>
    ${b.id?`<button class="btn danger" data-act="deleteRecipe">Delete recipe</button>`:''}</div>`;
}

/* ---------- TRAIN ---------- */
let trainSel=null;
let trainShown=null;
function lastSession(type){
  const ds=Object.keys(state.days).filter(d=>d!==cur && state.days[d].workout && state.days[d].workout.type===type).sort();
  return ds.length? state.days[ds[ds.length-1]].workout : null;
}
function viewTrain(){
  const w=peek(cur), logged=w.workout && w.workout.type, sched=scheduledFor(cur);
  const sel = trainSel || logged || (LIFTS.includes(sched)?sched:"Cardio");
  trainShown = sel;
  const dayName=fmtDate(cur).dow, burn=workoutBurn(w.workout);
  const seg=["Legs","Push","Pull","Cardio"].map(id=>`<button data-act="wsel" data-v="${id}" class="${sel===id?'on':''}">${id}</button>`).join('');
  let banner;
  if(logged) banner=`<b>${logged==="Cardio"?"Cardio":WORKOUTS[logged].title}</b> logged for ${dayName}. ${burn?`That gives you about <b class="num">${fmt(burn)} kcal</b> more room today.`:''}`;
  else if(sched==="Rest") banner=`<b>${dayName} is a rest day.</b> Recovery is when you adapt. A gentle walk is fine, and you can still log a session below.`;
  else banner=`<b>${dayName}: ${WORKOUTS[sched].title}.</b> Doing something else? Pick it below. It only changes today.`;
  let body="";
  if(sel==="Cardio"){
    const c=(w.workout&&w.workout.type==="Cardio")?w.workout:{cardioType:"Walk",mins:""}, e=WORKOUTS.Cardio.ex[0];
    body=`<div class="card ex"><div class="h"><div class="n">${e.n}</div><span class="tg">${e.t}</span></div><div class="cue">${e.cue}</div></div>
      <div class="list">
        <div class="frow"><label for="c_type">Type</label><select id="c_type">${Object.keys(CARDIO_MET).map(o=>`<option ${c.cardioType===o?'selected':''}>${o}</option>`).join("")}</select></div>
        <div class="frow"><label for="c_min">Minutes</label><input id="c_min" type="number" inputmode="numeric" value="${c.mins||""}" placeholder="25"></div>
      </div>
      <div class="stack"><button class="btn" data-act="saveCardio">Save cardio</button></div>`;
  } else {
    const wk=WORKOUTS[sel], last=lastSession(sel), loggedEx=(w.workout&&w.workout.type===sel)?w.workout.ex:null;
    body=wk.ex.map((e,ei)=>{
      const lastEx=last&&last.ex&&last.ex[ei]?last.ex[ei]:null;
      const lastTxt=lastEx&&lastEx.sets&&lastEx.sets.length?("Last time: "+lastEx.sets.map(s=>(s.w?s.w+" kg":"")+(s.w&&s.reps?" × ":"")+(s.reps?s.reps:"")).filter(Boolean).join(", ")):"";
      const sets=loggedEx&&loggedEx[ei]&&loggedEx[ei].sets.length?loggedEx[ei].sets:[{w:"",reps:""},{w:"",reps:""}];
      const isPlank=e.n.toLowerCase().includes("plank");
      return `<div class="card ex" data-ex="${ei}">
        <div class="h"><div class="n">${e.n}</div><span class="tg">${e.t}</span></div>
        <div class="cue">${e.cue}</div>
        <a class="howto" href="${howToLink(e.n)}" target="_blank" rel="noopener">Watch how to do it ›</a>
        ${lastTxt?`<div class="last num">${lastTxt}</div>`:""}
        <div class="sets" id="sets_${ei}">${sets.map((s,si)=>setRow(si,s,isPlank)).join("")}</div>
        <button class="addset" data-act="addSet" data-ei="${ei}" data-plank="${isPlank?1:0}">Add set</button>
      </div>`;
    }).join("")+`<div class="stack"><button class="btn" data-act="saveWorkout">Save ${sel} session</button></div>`;
  }
  return `
  ${pageHeader({eyebrow:dayNav(), title:'Train'})}
  <div class="banner"><span style="color:var(--activity-ink)">${ic('dumbbell')}</span><div>${banner}</div></div>
  <div class="seg" style="margin:4px 0 14px">${seg}</div>
  ${body}
  <div class="foot" style="padding:12px 4px 0">Keep two or three reps in the tank each set. When every set hits the top of the range with good form, add a little weight next time. Rest about 90 seconds between sets.</div>`;
}
function setRow(si,s,isPlank){
  if(isPlank) return `<div class="setrow"><span class="n">Set ${si+1}</span><input class="num" data-f="reps" type="number" inputmode="numeric" placeholder="sec" value="${s.reps||""}"><span class="u">sec</span></div>`;
  return `<div class="setrow"><span class="n">Set ${si+1}</span>
    <input class="num" data-f="w" type="number" inputmode="decimal" placeholder="kg" value="${s.w||""}"><span class="u">kg</span>
    <input class="num" data-f="reps" type="number" inputmode="numeric" placeholder="reps" value="${s.reps||""}"><span class="u">reps</span></div>`;
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

/* ---------- PLAN ---------- */
const PLAN_OUTCOME={worked:'Worked', mixed:'Mixed', no:"Didn't work"};
function viewPlan(){
  const days=[["Monday",1],["Tuesday",2],["Wednesday",3],["Thursday",4],["Friday",5],["Saturday",6],["Sunday",0]];
  const plans=state.profile.plans;
  return `
  ${pageHeader({title:'Plan'})}
  <div class="grp-h" style="padding-top:4px"><span>If–then plans</span></div>
  <div class="list">
    ${plans.map(pl=>{ const lr=pl.reviews&&pl.reviews.length?pl.reviews[pl.reviews.length-1]:null;
      return `<button class="li" data-act="editPlan" data-id="${esc(pl.id)}"><div class="m"><div class="t">When ${esc(pl.when)}</div>
        <div class="s">I'll ${esc(pl.then)}${lr?` · ${PLAN_OUTCOME[lr.r]}`:''}</div></div>${chev}</button>`; }).join('')}
    <button class="li act" data-act="editPlan">${ic('plus','sm')}<span>New plan</span></button>
  </div>
  <div class="foot">Pick a moment that trips you up and decide ahead of time what you'll do. For example: when I get home hungry, I'll have yoghurt before I cook. We'll check in weekly, because the follow-up is what makes plans stick.</div>

  <div class="grp-h"><span>Weekly schedule</span></div>
  <div class="list">${days.map(([nm,idx])=>{ const v=(state.schedule&&state.schedule[idx])||"Rest";
    return `<div class="li"><div class="m"><div class="t">${nm}</div></div>
      <select data-change="sched" data-day="${idx}" aria-label="${nm} session">${SESSIONS.map(s=>`<option value="${s}" ${s===v?"selected":""}>${s==="Legs"?"Legs & Core":s}</option>`).join("")}</select></div>`; }).join("")}</div>
  <div class="foot">Aim for three lifts a week with a rest day between where you can. Legs, then Push, then Pull means back-to-back sessions train different muscles. Daily steps burn more across a week than the gym sessions do.</div>

  <div class="grp-h"><span>Guides</span></div>
  <div class="list icons">
    <button class="li" data-act="guide" data-g="eating"><span class="ico" style="background:var(--energy)">${ic('fork')}</span><div class="m"><div class="t">Daily eating template</div></div>${chev}</button>
    <button class="li" data-act="guide" data-g="supps"><span class="ico" style="background:var(--supps)">${ic('pill')}</span><div class="m"><div class="t">Supplement timing</div></div>${chev}</button>
    <button class="li" data-act="guide" data-g="basics"><span class="ico" style="background:var(--mind)">${ic('info')}</span><div class="m"><div class="t">The honest basics</div></div>${chev}</button>
  </div>`;
}
function guideHtml(g){
  if(g==='eating') return `<div class="prose">
    <p>There's nothing magic about breakfast. What matters is the day's total and getting enough protein: around <b>${state.target.p} g protein</b> within your <b>${fmt(state.target.kcal-state.profile.rangeWidth)}–${fmt(state.target.kcal+state.profile.rangeWidth)} kcal</b> range.</p>
    <h3>Late morning or lunch</h3><p>Lead with protein: eggs, chicken, tuna, Greek yoghurt or a shake, plus some carbs and veg.</p>
    <h3>Dinner</h3><p>Keep the noodles if you like them. One pack, not two, with a protein (eggs, chicken, prawns or tofu) and frozen veg turns it into a balanced meal for not many more calories.</p>
    <h3>The evening snack window</h3><p>Two or three bags of crisps and a chocolate bar is easily 700–1,000 kcal that doesn't fill you up. You don't have to quit snacking, just swap:</p>
    <ul><li>Crisps → plain popcorn, or Greek yoghurt with berries</li><li>A whole bar → two squares of dark chocolate, or a hot chocolate made with milk</li><li>Still hungry → a protein shake, or wholemeal toast with peanut butter</li></ul>
    <p class="muted">No avocado or peas anywhere in this plan, and everything is cookable for a shared household.</p></div>`;
  if(g==='supps') return `<div class="prose">
    <p><b>On lifting days:</b> pre-workout about 20–30 minutes before. Skip it on rest days.</p>
    <p><b>Every day:</b> creatine (any time), vitamin D with a meal.</p>
    <p><b>Evening:</b> magnesium glycinate with or after dinner.</p>
    <div class="warn"><b>Check your magnesium label.</b> "6000 mg" almost certainly means the whole compound, not elemental magnesium (about 14% by weight). Elemental magnesium should stay under roughly 400 mg a day.</div>
    <p><b>Probiotic:</b> evidence for daily probiotics in healthy adults is weak and strain-specific. Not harmful. If you notice nothing after a month, stop.</p>
    <p><b>Worth adding:</b> vitamin D 10 µg a day (NHS advice for UK adults October to March) and creatine monohydrate 3–5 g a day. Expect a 0.5–1 kg scale rise in week one. That's water, not fat.</p>
    <p class="muted">Skip fat burners, detox teas, CLA, raspberry ketones and BCAAs if your protein is adequate. There's no meaningful evidence for them.</p></div>`;
  return `<div class="prose">
    <p><b>You can't spot-reduce.</b> Fat comes off the whole body when you eat a little less than you burn. The belly is often one of the last places to change.</p>
    <p><b>Food does most of the work.</b> Training helps and protects muscle, but a steady, modest deficit is what moves body fat.</p>
    <p><b>Averages beat single days.</b> One high day doesn't undo a good week. Look at the weekly view, not the daily number.</p>
    <p><b>Estimates are fine.</b> People logging carefully still miss 20% or more. Being consistently roughly right beats being occasionally precise.</p>
    <p><b>Feeling sick with exercise?</b> Keep effort moderate, stop two or three reps short of failure, and eat a small snack 30–45 minutes before. If nausea is severe or comes with chest pain or dizziness, stop and see a GP.</p>
    <p class="muted">General information, not medical advice.</p></div>`;
}

/* ---------- PROFILE ---------- */
let _sett = { profile:false, metrics:false, targets:false, supplements:false, notifications:false, account:false, backup:false, about:false };
let suppEditor=null; // {mode:'add'|'edit', id, name, time}
const VAPID_PUBLIC_KEY = 'BOvtsDXhc-q8UtjBcaCY7iydSF_-xKRHoIR8YsOqdGXvYl4HUMlaeWsCsNf5ZTNMAh-9wQwEfmu4Kgcg6_WnGlU';
function msjSuggested(w){
  const p=state.profile;
  if(!p.age || !p.height || !w) return null;
  const bmr = p.sex==='F' ? 10*w + 6.25*p.height - 5*p.age - 161 : 10*w + 6.25*p.height - 5*p.age + 5;
  const maint=Math.round(bmr*(ACTIVITY[p.activityLevel]||ACTIVITY.light).mult);
  const kcal=Math.max(1200, maint-500), protein=Math.round(w*1.8), carbs=Math.round(kcal*0.40/4);
  const fat=Math.round((kcal-protein*4-carbs*4)/9);
  return { maint, kcal, p:protein, c:Math.max(carbs,0), f:Math.max(fat,0) };
}
function settRow(key,label,icon,color,content){
  const open=_sett[key];
  return `<button class="li" data-act="sett" data-k="${key}" aria-expanded="${open}"><span class="ico" style="background:var(--${color})">${ic(icon)}</span>
    <div class="m"><div class="t">${label}</div></div><svg class="i chev" viewBox="0 0 24 24" style="transform:rotate(${open?90:0}deg);transition:transform .2s">${I.chevR}</svg></button>
    ${open?`<div class="acc-bd">${content}</div>`:''}`;
}
function segCtl(act,opts,curV){
  return `<div class="seg">${opts.map(([v,l])=>`<button data-act="${act}" data-v="${v}" class="${v===curV?'on':''}">${l}</button>`).join('')}</div>`;
}
function viewInfo(){
  const email=currentSession?.user?.email||'', pr=state.profile, w=profileWeight(), sug=msjSuggested(w);
  const profileContent = `
    <div class="field"><label for="profName">Display name</label><input id="profName" value="${esc(pr.name)}" placeholder="Your name" autocomplete="name"></div>
    <div class="field"><label for="profEmail">Email</label><input id="profEmail" type="email" value="${esc(email)}" autocomplete="email"></div>
    <button class="btn" data-act="saveProfile">Save profile</button>`;
  const metricsContent = `
    <div class="grid2">
      <div class="field"><label for="profSex">Sex</label><select id="profSex"><option value="M" ${pr.sex==='M'?'selected':''}>Male</option><option value="F" ${pr.sex==='F'?'selected':''}>Female</option></select></div>
      <div class="field"><label for="profAge">Age</label><input id="profAge" type="number" min="16" max="99" value="${pr.age||''}" placeholder="35"></div>
      <div class="field"><label for="profHeight">Height (cm)</label><input id="profHeight" type="number" value="${pr.height||''}" placeholder="178"></div>
      <div class="field"><label for="profWeight">Weight (kg)</label><input id="profWeight" type="number" step="0.1" value="${w||''}" placeholder="82.5"></div>
    </div>
    <div class="field"><label for="profActivity">Activity level</label><select id="profActivity">${Object.entries(ACTIVITY).map(([k,v])=>`<option value="${k}" ${pr.activityLevel===k?'selected':''}>${v.label}</option>`).join('')}</select></div>
    <button class="btn gray" data-act="saveMetrics">Save metrics</button>
    ${sug?`<div class="card" style="margin-top:12px;background:var(--fill);font-size:15px;line-height:1.45">
      <b>Suggested</b> (Mifflin-St Jeor, ${w} kg)<br>Maintenance about <b class="num">${fmt(sug.maint)} kcal</b> · target <b class="num">${fmt(sug.kcal)} kcal</b><br>
      Protein <b class="num">${sug.p} g</b> · Carbs <b class="num">${sug.c} g</b> · Fat <b class="num">${sug.f} g</b>
      <button class="btn" data-act="applySuggested" style="margin-top:10px">Use these targets</button></div>`
      :`<div class="foot" style="padding:10px 0 0">Add age, height and weight to see suggested targets.</div>`}`;
  const targetsContent = `
    <div class="grid2">
      <div class="field"><label for="tKcal">Calories</label><input id="tKcal" type="number" value="${state.target.kcal}"></div>
      <div class="field"><label for="tRange">Range ±</label><input id="tRange" type="number" value="${pr.rangeWidth}"></div>
      <div class="field"><label for="tProt">Protein (g)</label><input id="tProt" type="number" value="${state.target.p}"></div>
      <div class="field"><label for="tCarb">Carbs (g)</label><input id="tCarb" type="number" value="${state.target.c}"></div>
      <div class="field"><label for="tFat">Fat (g)</label><input id="tFat" type="number" value="${state.target.f}"></div>
    </div>
    <button class="btn" data-act="saveTargets">Save targets</button>
    <div class="foot" style="padding:10px 0 0">Your day is judged against a range, not a single number. Calories won't go below 1,200 here. Going lower is something to do with medical support.</div>`;
  const supps=pr.supplements||[];
  const supplementsContent = `
    ${supps.map(s=>`<div class="li" style="padding:8px 0"><div class="m"><div class="t">${esc(s.name)}</div><div class="s num">${esc(s.time)}</div></div>
      <button class="navbtn" data-act="editSupp" data-id="${esc(s.id)}">Edit</button>
      <button class="navbtn" data-act="delSupp" data-id="${esc(s.id)}" style="color:var(--red);margin-left:12px">Delete</button></div>`).join('')}
    ${suppEditor?`<div style="padding-top:10px">
      <div class="field"><label for="suppName">Name</label><input id="suppName" value="${esc(suppEditor.name)}" placeholder="Creatine 5 g" autocomplete="off"></div>
      <div class="field"><label for="suppTime">Time</label><input id="suppTime" type="time" value="${esc(suppEditor.time)}"></div>
      <div class="grid2"><button class="btn" data-act="saveSupp">${suppEditor.mode==='edit'?'Update':'Add'}</button><button class="btn gray" data-act="cancelSupp">Cancel</button></div></div>`
      :`<button class="btn tinted" data-act="addSupp" style="margin-top:8px">Add supplement</button>`}`;
  const notifSupported='Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const notifStatus=!notifSupported?'Not supported in this browser':Notification.permission==='denied'?'Blocked in your browser or phone settings':pr.notificationsEnabled?'On':'Off';
  const notificationsContent = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div><div>Supplement reminders</div><div class="sub" style="font-size:13px">${notifStatus}</div></div>
      <label class="tog-wrap"><input type="checkbox" data-change="notif" ${pr.notificationsEnabled?'checked':''} ${!notifSupported?'disabled':''} aria-label="Supplement reminders"><span class="tog-slider"></span></label>
    </div>
    <div class="foot" style="padding:10px 0 0">iPhone needs iOS 16.4 or later, with Lean Plan added to your Home Screen from Safari.</div>`;
  const accountContent = window.supabase ? `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div><div class="sub" style="font-size:13px">Signed in as</div><div>${esc(email)||'—'}</div></div>
      <button class="btn sm gray" data-act="signOut">Sign out</button></div>` : `<div class="sub">Running on this device only. Sign-in is unavailable offline.</div>`;
  const backupContent = `
    <div class="sub" style="margin-bottom:10px">Your log lives on this device and syncs to your private database. Export a copy now and then.</div>
    <div class="grid2"><button class="btn gray" data-act="exportData">Export</button>
    <label class="btn gray" for="importFile">Import</label></div>
    <input id="importFile" type="file" accept="application/json,.json" data-change="import" style="display:none">`;
  const aboutContent = `<div class="prose sub">
    <p><b>Lean Plan</b> 2.0. Your data is stored on this device and synced to a database tied to your account. It is never shared or sold.</p>
    <p>General fitness information only, not medical advice. Talk to a GP before starting a new diet or exercise programme.</p>
    <p style="margin:0"><b>Install:</b> iPhone Safari → Share → Add to Home Screen. Android Chrome → ⋮ → Add to Home screen.</p></div>`;

  return `
  ${pageHeader({title:'Profile'})}
  <div class="card" style="display:flex;align-items:center;gap:14px">
    <span class="avatar lg">${initials()}</span>
    <div style="min-width:0"><div style="font-size:20px;font-weight:600">${esc(pr.name)||'Add your name'}</div>
    <div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${[esc(email),_syncText].filter(Boolean).join(' · ')||'This device'}</div></div>
  </div>

  <div class="lbl">Tracking</div>
  <div class="list"><div style="padding:12px 16px">
    <div style="margin-bottom:8px">Accuracy</div>
    ${segCtl('setAccuracy',Object.entries(ACCURACY).map(([k,v])=>[k,v.label]),pr.accuracy)}
    <div class="sub" style="font-size:13px;margin-top:8px">${ACCURACY[pr.accuracy].desc}</div>
  </div></div>
  <div class="list"><div style="padding:12px 16px">
    <div style="margin-bottom:8px">Display</div>
    ${segCtl('setGentle',[['0','Standard'],['1','Gentle']],pr.gentle?'1':'0')}
    <div class="sub" style="font-size:13px;margin-top:8px">${pr.gentle?'Calorie numbers and body weight are hidden. You see how the day is going in words, and protein stays visible.':'Full numbers, with a ± margin on anything estimated.'}</div>
  </div></div>
  <div class="list"><div style="padding:12px 16px">
    <div style="margin-bottom:8px">Appearance</div>
    ${segCtl('setTheme',[['system','Automatic'],['light','Light'],['dark','Dark']],pr.theme)}
  </div></div>
  <div class="list icons">
    <button class="li" data-act="openHands"><span class="ico" style="background:var(--activity)">${ic('hand')}</span><div class="m"><div class="t">Hand portions</div></div>
      <span class="tr num">palm ${handGrams('palm')} g</span>${chev}</button>
  </div>

  <div class="lbl">Settings</div>
  <div class="list icons">
    ${settRow('profile','Profile','person','tint',profileContent)}
    ${settRow('metrics','Body metrics','scale','body',metricsContent)}
    ${settRow('targets','Targets','target','energy',targetsContent)}
    ${settRow('supplements','Supplements','pill','supps',supplementsContent)}
    ${settRow('notifications','Notifications','bell','red',notificationsContent)}
  </div>
  <div class="list icons">
    ${settRow('account','Account','key','label2',accountContent)}
    ${settRow('backup','Data & backup','cloud','mind',backupContent)}
    ${settRow('about','About','info','label2',aboutContent)}
  </div>`;
}

/* ===================== SHEETS =====================
   One bottom sheet at a time. Opening while open swaps content without
   re-animating, which gives in-sheet navigation (search → portion). */
function openSheet({title,body,left,right,tall,onMount}){
  const root=document.getElementById('sheetRoot'), wasOpen=root.classList.contains('open');
  root.innerHTML=`<div class="sheet-bg" data-act="closeSheet"></div>
    <div class="sheet ${tall?'tall':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grabber"></div>
      <div class="sheet-hd"><div>${left!=null?left:'<button class="navbtn" data-act="closeSheet">Cancel</button>'}</div><div class="sh-t">${esc(title)}</div><div class="sh-r">${right||''}</div></div>
      <div class="sheet-bd">${body}</div></div>`;
  root.classList.add('open'); document.body.classList.add('noscroll');
  if(!wasOpen){ root.offsetWidth; root.classList.add('in'); } // force reflow so the slide-up runs
  if(onMount) onMount(root.querySelector('.sheet'));
}
function closeSheet(){
  const root=document.getElementById('sheetRoot');
  root.classList.remove('in'); document.body.classList.remove('noscroll');
  setTimeout(()=>{ if(!root.classList.contains('in')){ root.innerHTML=''; root.classList.remove('open'); } },300);
}
function sheetEl(sel){ return document.querySelector('#sheetRoot '+sel); }
function mealSeg(act,curM){ return segCtl(act,MEALS.map(m=>[m,MEAL_LABEL[m].replace('Snacks','Snack')]),curM); }

/* ---- search ---- */
let searchCtx={meal:'lunch',q:''};
function openSearch(meal){
  searchCtx={meal:meal||mealNow(), q:''};
  openSheet({ title:'Add food', tall:true,
    body:`<div class="searchbar">${ic('search','sm')}<input id="q" data-input="search" placeholder="Search ${fmt(allFoods().length)} foods and your recipes" autocomplete="off" enterkeyhint="search" aria-label="Search foods"></div>
      <div style="margin:10px 0 2px">${mealSeg('searchMeal',searchCtx.meal)}</div>
      <div id="results">${searchResults('')}</div>`,
    onMount:s=>setTimeout(()=>{ const q=s.querySelector('#q'); if(q) q.focus(); },320) });
}
function foodRow(f,idx,extra){
  return `<div class="li" role="button" tabindex="0" data-act="pickFood" data-idx="${idx}"><div class="m"><div class="t">${esc(f.n)}</div>
    <div class="s num">${f.k} kcal · ${f.p} g protein per 100 ${f.ml?'ml':'g'}${idx>=FOODS.length?'<span class="tag">Mine</span>':''}</div></div>${extra||`<span class="addc">${ic('plus')}</span>`}</div>`;
}
function recipeRow(r,ri){
  const per=recipePer(r);
  return `<div class="li" role="button" tabindex="0" data-act="logRecipe" data-ri="${ri}"><div class="m"><div class="t">${esc(r.name)}<span class="tag">Recipe</span></div>
    <div class="s num">${fmt(per.k)} kcal · ${r0(per.p)} g protein per serving</div></div><span class="addc">${ic('plus')}</span></div>`;
}
function searchResults(q){
  const DB=allFoods(), m=searchCtx.meal;
  let h='';
  if(!q){
    const us=usuals(m);
    if(us.length) h+=`<div class="lbl">Your usual ${MEAL_LABEL[m].toLowerCase()}</div><div class="list">${us.map(u=>`<div class="li" role="button" tabindex="0" data-act="logUsual" data-n="${esc(u.n)}" data-meal="${m}">
      <div class="m"><div class="t">${esc(u.n)}</div><div class="s">${portionText(u.last)} · one tap</div></div><span class="addc">${ic('plus')}</span></div>`).join('')}</div>`;
    const rc=recentFoods();
    if(rc.length) h+=`<div class="lbl">Recent</div><div class="list">${rc.map(f=>foodRow(f,DB.indexOf(f))).join('')}</div>`;
    if(state.recipes.length) h+=`<div class="lbl">Recipes</div><div class="list">${state.recipes.map(recipeRow).join('')}</div>`;
    const cf=state.customFoods||[];
    if(cf.length) h+=`<div class="lbl">My foods</div><div class="list">${cf.map((f,ci)=>foodRow(f,FOODS.length+ci,
      `<button class="navbtn" data-act="delCustom" data-ci="${ci}" aria-label="Delete ${esc(f.n)}" style="color:var(--label3)">${ic('x','sm')}</button>`)).join('')}</div>`;
    if(!rc.length && !cf.length) h+=`<div class="lbl">Common</div><div class="list">${FOODS.slice(0,8).map(f=>foodRow(f,DB.indexOf(f))).join('')}</div>`;
  } else {
    const rs=state.recipes.map((r,ri)=>({r,ri})).filter(o=>o.r.name.toLowerCase().includes(q));
    const words=q.split(/\s+/).filter(Boolean);
    const fm=DB.map((f,i)=>({f,i})).filter(o=>{ const n=o.f.n.toLowerCase(); return words.every(w=>n.includes(w)); })
      .sort((a,b)=>a.f.n.toLowerCase().indexOf(words[0])-b.f.n.toLowerCase().indexOf(words[0])).slice(0,50);
    if(rs.length) h+=`<div class="lbl">Recipes</div><div class="list">${rs.map(o=>recipeRow(o.r,o.ri)).join('')}</div>`;
    if(fm.length) h+=`<div class="lbl">Foods</div><div class="list">${fm.map(o=>foodRow(o.f,o.i)).join('')}</div>`;
    if(!rs.length&&!fm.length) h+=`<div class="empty">Nothing matches “${esc(q)}”.<br>Eating out? A quick estimate is better than nothing.</div>`;
  }
  h+=`<div class="list icons" style="margin-top:18px">
    <button class="li" data-act="openQuick"><span class="ico" style="background:var(--mind)">${ic('bolt')}</span><div class="m"><div class="t">Quick estimate</div><div class="s">Restaurant or unknown food</div></div>${chev}</button>
    <button class="li" data-act="openCreateFood"><span class="ico" style="background:var(--energy)">${ic('plus')}</span><div class="m"><div class="t">Create a food</div><div class="s">From the label on the packet</div></div>${chev}</button></div>`;
  return h;
}

/* ---- add food (portion) ---- */
let addCtx=null;
function openAdd(idx,meal){
  const f=allFoods()[idx]; if(!f) return;
  const last=lastUse(f.n), acc=ACCURACY[state.profile.accuracy];
  addCtx={ idx, meal:meal||searchCtx.meal||mealNow(), fromSearch:document.getElementById('sheetRoot').classList.contains('open'),
    mode: last ? (last.how==='hand'?'hand':'g') : (state.profile.accuracy==='precise'?'g':'serv'),
    grams: last ? last.grams : f.g, learned: last ? last.grams : null, serv:1,
    hand: last&&last.hand ? {...last.hand} : {type:handDefault(f), count:1},
    askFat: acc.askFat && cookable(f), fat: state.profile.lastFat || null };
  renderAdd();
}
function addCalc(){
  const c=addCtx, f=allFoods()[c.idx];
  let g, how;
  if(c.mode==='serv'){ g=f.g*c.serv; how='serv'; }
  else if(c.mode==='hand'){ g=handGrams(c.hand.type)*c.hand.count; how='hand'; }
  else { g=+c.grams||0; how=(c.learned!=null && g===c.learned)?'usual':'g'; }
  g=Math.round(g); const m=g/100;
  const e={n:f.n, grams:g, k:f.k*m, p:f.p*m, c:f.c*m, f:f.f*m, meal:c.meal, src:c.idx>=FOODS.length?'custom':'db', how, err:ERR[how]};
  if(e.src==='custom') e.err=+(e.err+0.03).toFixed(2); // labels copied by hand are a little less certain
  if(f.ml) e.unit='ml';
  if(how==='hand') e.hand={...c.hand};
  if(how==='serv') e.serv=c.serv;
  let fat=null;
  if(c.askFat){
    const o=FAT_OPTS.find(x=>x.id===(c.fat||'unsure'));
    if(o && o.id!=='none') fat={n:o.n+' · cooking', grams:o.g, k:o.k, p:o.p||0, c:0, f:o.f, meal:c.meal, src:'fat', how:'fat', err:o.err||ERR.fat, fatFor:f.n};
  }
  return {e, fat};
}
function addPreviewHtml(){
  const {e,fat}=addCalc(), k=e.k+(fat?fat.k:0);
  const pm=Math.round(Math.sqrt(Math.pow(e.k*e.err,2)+(fat?Math.pow(fat.k*fat.err,2):0)));
  return `<div class="big num">${fmt(k)}<small>kcal</small><span class="pm">± ${pm}</span></div>
    <div class="sub num" style="margin-top:4px">${r1(e.p+(fat?fat.p:0))} g protein · ${r1(e.c)} g carbs · ${r1(e.f+(fat?fat.f:0))} g fat</div>
    <div class="sub" style="font-size:13px;margin-top:4px">${ERR_LABEL[e.how]}${fat?` + ${esc(fat.n.replace(' · cooking',''))} (${fat.k} kcal)`:''}</div>`;
}
function renderAdd(){
  const c=addCtx, f=allFoods()[c.idx], u=f.ml?'ml':'g';
  let amt='';
  if(c.mode==='serv'){
    amt=`<div class="scale">${[0.5,1,1.5,2,3].map(v=>`<button data-act="addServ" data-v="${v}" class="${c.serv===v?'on':''}"><b class="num">${frac(v)}</b>${Math.round(f.g*v)} ${u}</button>`).join('')}</div>
      <div class="foot">One serving is ${f.g} ${u}.</div>`;
  } else if(c.mode==='hand'){
    amt=`<div class="chips">${Object.entries(HANDS).map(([k,h])=>`<button class="chip ${c.hand.type===k?'on':''}" data-act="addHand" data-v="${k}">${h.label}<small>${h.hint}</small></button>`).join('')}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
        <span>How many?</span>
        <span class="stepper"><button data-act="addHandStep" data-d="-0.5" aria-label="Fewer">−</button><span class="num">${frac(c.hand.count)}</span><button data-act="addHandStep" data-d="0.5" aria-label="More">+</button></span></div>
      <div class="foot">For you, one ${HANDS[c.hand.type].label.toLowerCase()} ≈ ${handGrams(c.hand.type)} ${u}. Calibrate in Profile.</div>`;
  } else {
    const mx=Math.max(50,Math.round(f.g*4));
    amt=`<div class="gram"><input id="grams" class="num" data-input="addGrams" type="number" inputmode="decimal" value="${c.grams}" aria-label="Amount in ${u}"><span>${u}</span></div>
      <input type="range" data-input="addGramsRange" min="0" max="${mx}" step="${mx>400?5:1}" value="${Math.min(mx,c.grams)}" aria-label="Amount slider">
      ${c.learned!=null?`<div class="foot" style="text-align:center">Your usual is ${c.learned} ${u}. <button class="navbtn" style="font-size:13px" data-act="addUsual">Use it</button></div>`:''}`;
  }
  const fatQ = c.askFat ? `<div class="lbl">How was it cooked?</div>
    <div class="chips">${FAT_OPTS.map(o=>`<button class="chip ${c.fat===o.id?'on':''}" data-act="addFat" data-v="${o.id}">${o.label}</button>`).join('')}</div>
    <div class="foot">${c.fat?'Cooking fat is the part food logs miss most, so it\'s added separately and you can change it.':'Skip this and we\'ll assume a teaspoon of oil, with a wider margin.'}</div>` : '';
  const title=c.fromSearch?'<button class="navbtn" data-act="backToSearch">'+ic('chevL')+'Back</button>':undefined;
  openSheet({ title:f.n, left:title, right:`<button class="navbtn b" data-act="commitAdd">Add</button>`,
    body:`<div class="sub num" style="text-align:center;margin:-4px 0 12px">${f.k} kcal · ${f.p} P · ${f.c} C · ${f.f} F per 100 ${u}${c.idx>=FOODS.length?' · your food':''}</div>
      ${mealSeg('addMeal',c.meal)}
      <div class="lbl">How much?</div>
      ${segCtl('addMode',[['serv','Servings'],['g',u==='ml'?'Millilitres':'Grams'],['hand','Hands']],c.mode)}
      <div style="margin-top:14px">${amt}</div>
      ${fatQ}
      <div class="card preview" id="addPreview">${addPreviewHtml()}</div>
      <button class="btn" data-act="commitAdd">Add to ${MEAL_LABEL[c.meal]}</button>` });
}
function updateAddPreview(){ const el=sheetEl('#addPreview'); if(el) el.innerHTML=addPreviewHtml(); }

/* ---- edit an entry: correction is a slider, never a re-search ---- */
let editCtx=null;
function openEdit(i){
  const x=peek(cur).foods[i]; if(!x) return;
  editCtx={i, mult:1, meal:x.meal||mealNow()};
  renderEdit();
}
function renderEdit(){
  const c=editCtx, x=peek(cur).foods[c.i], u=unitOf(x), flag=isFlagged(x);
  const g=Math.round((x.grams||0)*c.mult), k=x.k*c.mult;
  openSheet({ title:x.n, right:`<button class="navbtn b" data-act="saveEdit">Done</button>`,
    body:`<div class="card" style="text-align:center">
        <div class="big num" id="editK">${fmt(k)}<small>kcal</small></div>
        <div class="sub num" id="editG">${x.grams?`${g} ${u} · `:''}${r1(x.p*c.mult)} g protein</div>
        <input type="range" data-input="editMult" min="0.25" max="3" step="0.05" value="${c.mult}" style="margin-top:12px" aria-label="Portion size">
        <div class="chips" style="justify-content:center;margin-top:8px">${[0.5,0.75,1,1.25,1.5,2].map(v=>`<button class="chip ${Math.abs(c.mult-v)<0.001?'on':''}" data-act="editSet" data-v="${v}">${v===1?'As logged':'×'+v}</button>`).join('')}</div>
      </div>
      <div class="sub" style="font-size:13px;padding:0 4px 12px">${ERR_LABEL[x.how]||'Logged'} · ± ${fmt(x.k*entryErr(x))} kcal. ${flag?'This is one of the bigger uncertainties in your day.':''}</div>
      ${mealSeg('editMeal',c.meal)}
      <div class="stack">
        ${flag?`<button class="btn tinted" data-act="confirmEntry">Looks right</button>`:''}
        <button class="btn danger" data-act="deleteEntry">Delete entry</button>
      </div>` });
}

/* ---- recipe log ---- */
let recipeCtx=null;
function openRecipeLog(ri){
  recipeCtx={ri, q:1, meal:searchCtx.meal||mealNow(), fromSearch:document.getElementById('sheetRoot').classList.contains('open')};
  renderRecipeLog();
}
function renderRecipeLog(){
  const c=recipeCtx, r=state.recipes[c.ri], per=recipePer(r);
  openSheet({ title:r.name, left:c.fromSearch?'<button class="navbtn" data-act="backToSearch">'+ic('chevL')+'Back</button>':undefined,
    right:`<button class="navbtn b" data-act="commitRecipe">Add</button>`,
    body:`${mealSeg('recipeMeal',c.meal)}
      <div class="lbl">Servings</div>
      <div class="scale">${[0.5,1,1.5,2,3].map(v=>`<button data-act="recipeServ" data-v="${v}" class="${c.q===v?'on':''}"><b class="num">${frac(v)}</b>${fmt(per.k*v)} kcal</button>`).join('')}</div>
      <div class="foot">Recipe of ${r.servings} serving${r.servings!=1?'s':''}. Computed from its ingredients, so it's more accurate than a photo of the plate.</div>
      <div class="card preview"><div class="big num">${fmt(per.k*c.q)}<small>kcal</small><span class="pm">± ${fmt(per.k*c.q*ERR.recipe)}</span></div>
      <div class="sub num" style="margin-top:4px">${r1(per.p*c.q)} g protein · ${r1(per.c*c.q)} g carbs · ${r1(per.f*c.q)} g fat</div></div>
      <button class="btn" data-act="commitRecipe">Add to ${MEAL_LABEL[c.meal]}</button>` });
}

/* ---- quick estimate & create food ---- */
function openQuick(){
  const m=searchCtx.meal||mealNow();
  openSheet({ title:'Quick estimate', right:`<button class="navbtn b" data-act="commitQuick">Add</button>`,
    body:`<div class="sub" style="padding:0 4px 12px">For meals out or anything without a label. It's logged as an estimate (± 25%) so your total stays honest.</div>
      <div class="list">
        <div class="frow"><label for="qk_n">Name</label><input id="qk_n" placeholder="Pub lunch"></div>
        <div class="frow"><label for="qk_k">Calories</label><input id="qk_k" type="number" inputmode="numeric" placeholder="Required"><span class="u">kcal</span></div>
        <div class="frow"><label for="qk_p">Protein</label><input id="qk_p" type="number" inputmode="decimal" placeholder="Optional"><span class="u">g</span></div>
        <div class="frow"><label for="qk_c">Carbs</label><input id="qk_c" type="number" inputmode="decimal" placeholder="Optional"><span class="u">g</span></div>
        <div class="frow"><label for="qk_f">Fat</label><input id="qk_f" type="number" inputmode="decimal" placeholder="Optional"><span class="u">g</span></div>
      </div>
      <div class="lbl">Meal</div>${mealSeg('quickMeal',m)}` });
  quickMeal=m;
}
let quickMeal='lunch';
function openCreateFood(){
  openSheet({ title:'Create a food', right:`<button class="navbtn b" data-act="commitCreate">Save</button>`,
    body:`<div class="sub" style="padding:0 4px 12px">Copy the “per 100 g” column from the packet. Saved foods appear in search from now on.</div>
      <div class="list">
        <div class="frow"><label for="cf_n">Name</label><input id="cf_n" placeholder="Mum's chilli"></div>
        <div class="frow"><label for="cf_g">Serving</label><input id="cf_g" type="number" inputmode="decimal" value="100"><span class="u">g</span></div>
      </div>
      <div class="lbl">Per 100 g</div>
      <div class="list">
        <div class="frow"><label for="cf_k">Calories</label><input id="cf_k" type="number" inputmode="decimal" placeholder="0"><span class="u">kcal</span></div>
        <div class="frow"><label for="cf_p">Protein</label><input id="cf_p" type="number" inputmode="decimal" placeholder="0"><span class="u">g</span></div>
        <div class="frow"><label for="cf_c">Carbs</label><input id="cf_c" type="number" inputmode="decimal" placeholder="0"><span class="u">g</span></div>
        <div class="frow"><label for="cf_f">Fat</label><input id="cf_f" type="number" inputmode="decimal" placeholder="0"><span class="u">g</span></div>
      </div>` });
}

/* ---- check-in, weight, hands, plans, explainer ---- */
let checkinCtx=null;
function openCheckin(){
  const ci=peek(cur).checkin||{};
  checkinCtx={mood:ci.mood||0, hunger:ci.hunger||0, note:ci.note||''};
  renderCheckin();
}
function renderCheckin(){
  const c=checkinCtx;
  openSheet({ title:'Check-in', right:`<button class="navbtn b" data-act="saveCheckin">Done</button>`,
    body:`<div class="lbl">How are you feeling?</div>
      <div class="scale">${MOODS.map((m,i)=>`<button data-act="ciMood" data-v="${i+1}" class="${c.mood===i+1?'on':''}">${m}</button>`).join('')}</div>
      <div class="lbl">Hunger right now</div>
      <div class="scale">${HUNGER.map((m,i)=>`<button data-act="ciHunger" data-v="${i+1}" class="${c.hunger===i+1?'on':''}">${m}</button>`).join('')}</div>
      <div class="lbl">Note</div>
      <textarea id="ciNote" rows="3" placeholder="Anything worth remembering? Optional." style="background:var(--elev)">${esc(c.note)}</textarea>
      <div class="foot">Hunger and mood help you spot patterns, like skipped lunches leading to big evenings. There's no right answer.</div>` });
}
function openWeight(){
  const w=peek(cur).weight;
  openSheet({ title:'Body weight', right:`<button class="navbtn b" data-act="saveWeight">Save</button>`,
    body:`<div class="card"><div class="gram"><input id="bw" class="num" type="number" inputmode="decimal" step="0.1" value="${w??''}" placeholder="0.0" aria-label="Weight in kg"><span>kg</span></div></div>
      <div class="foot">Weight swings 1–2 kg day to day with water, salt and sleep. The weekly average is the number to watch.</div>`,
    onMount:s=>setTimeout(()=>s.querySelector('#bw').focus(),320) });
}
function openHands(){
  openSheet({ title:'Hand portions', right:`<button class="navbtn b" data-act="saveHands">Save</button>`,
    body:`<div class="sub" style="padding:0 4px 12px">Hands scale with the person, which is why they work. Weigh one of each once and enter it here. After that, "a palm" is a measurement, not a guess.</div>
      <div class="list">${Object.entries(HANDS).map(([k,h])=>`<div class="frow"><label for="hand_${k}">${h.label}<div class="sub" style="font-size:13px">${h.hint}</div></label>
        <input id="hand_${k}" type="number" inputmode="numeric" value="${handGrams(k)}"><span class="u">g</span></div>`).join('')}</div>` });
}
let planEdit=null;
function openPlan(id){
  const pl=state.profile.plans.find(p=>p.id===id);
  planEdit=pl?{...pl}:{id:null, when:'', then:'', cope:''};
  openSheet({ title:pl?'Edit plan':'New plan', right:`<button class="navbtn b" data-act="savePlan">Save</button>`,
    body:`<div class="lbl">When…</div><input id="pl_when" value="${esc(planEdit.when)}" placeholder="I get home from work hungry" style="background:var(--elev)">
      <div class="lbl">I'll…</div><input id="pl_then" value="${esc(planEdit.then)}" placeholder="have a yoghurt before I start cooking" style="background:var(--elev)">
      <div class="lbl">If something gets in the way…</div><input id="pl_cope" value="${esc(planEdit.cope)}" placeholder="keep protein bars in my bag" style="background:var(--elev)">
      <div class="foot">Specific beats ambitious. A plan you'll actually do is worth more than a perfect one.</div>
      ${pl?`<div class="stack"><button class="btn danger" data-act="deletePlan">Delete plan</button></div>`:''}` });
}
let reviewCtx={};
function openReview(){
  const due=plansDue(); reviewCtx={};
  const html=()=>due.map(pl=>`<div class="card"><div style="font-weight:600">When ${esc(pl.when)}</div><div class="sub" style="margin:2px 0 10px">I'll ${esc(pl.then)}</div>
    <div class="chips">${Object.entries(PLAN_OUTCOME).map(([k,l])=>`<button class="chip ${reviewCtx[pl.id]===k?'on':''}" data-act="reviewSet" data-id="${esc(pl.id)}" data-v="${k}">${l}</button>`).join('')}</div></div>`).join('');
  reviewCtx._render=()=>openSheet({ title:'Plan check-in', right:`<button class="navbtn b" data-act="saveReview">Done</button>`,
    body:`<div class="sub" style="padding:0 4px 12px">How did each plan go this week? A plan that isn't working is worth rewriting. It's not a failing on your part.</div>${html()}` });
  reviewCtx._render();
}
function explainBand(){
  const fs=peek(cur).foods, bnd=band(cur);
  const byHow={}; fs.forEach(x=>{ const h=ERR_LABEL[x.how]||'Logged'; byHow[h]=(byHow[h]||0)+Math.pow(x.k*entryErr(x),2); });
  const top=Object.entries(byHow).sort((a,b)=>b[1]-a[1]);
  openSheet({ title:'About this estimate', left:'', right:`<button class="navbtn b" data-act="closeSheet">Done</button>`,
    body:`<div class="card" style="text-align:center"><div class="big num">± ${bnd}<small>kcal</small></div><div class="sub">today's margin</div></div>
      <div class="prose" style="padding:0 4px">
      <p>No food log is exact. Portions are guessed, labels round, and cooking changes things. Instead of pretending, Lean Plan shows how sure it is.</p>
      <p>Weighed food is very close. Servings and your usual portions are close. Hand estimates and quick estimates are rougher. The margin combines them all.</p>
      ${top.length?`<p><b>Biggest source today:</b> ${top[0][0].toLowerCase()} entries.</p>`:''}
      <p class="muted">For context, careful manual logging typically misses 20% or more. Roughly right every day beats precise now and then.</p></div>` });
}

/* ===================== ACTIONS =====================
   Every tap is a data-act attribute handled here. One delegated listener,
   so re-rendering never needs rebinding. */
function logEntry(e){ day(cur).foods.push(e); markDayDirty(cur); }
const ACT = {
  tab:el=>setTab(el.dataset.tab),
  goDay:el=>{ cur=el.dataset.d; trainSel=null; render({top:true}); },
  shiftDay:el=>{ cur=shiftStr(cur,+el.dataset.n); trainSel=null; render({top:true}); },
  syncNow:()=>{ if(window.supabase) sync(); },
  dismissMissed:()=>{ dismissedMissed=true; render(); },
  closeSheet:()=>closeSheet(),
  explainBand:(el,e)=>{ e.stopPropagation(); explainBand(); },

  // supplements, check-in, weight
  toggleSupp:el=>{ const w=day(cur), id=el.dataset.id; w.supps[id]=!w.supps[id]; markDayDirty(cur); render(); },
  openCheckin:()=>openCheckin(),
  ciMood:el=>{ checkinCtx.mood=+el.dataset.v; checkinCtx.note=val('ciNote'); renderCheckin(); },
  ciHunger:el=>{ checkinCtx.hunger=+el.dataset.v; checkinCtx.note=val('ciNote'); renderCheckin(); },
  saveCheckin:()=>{ const c=checkinCtx; c.note=val('ciNote');
    day(cur).checkin = (c.mood||c.hunger||c.note) ? {mood:c.mood, hunger:c.hunger, note:c.note, t:nowIso()} : null;
    markDayDirty(cur); closeSheet(); toast('Check-in saved'); render(); },
  openWeight:()=>openWeight(),
  saveWeight:()=>{ const v=parseFloat(val('bw')); if(!v){ toast('Enter a weight'); return; }
    day(cur).weight=v; markDayDirty(cur); closeSheet(); toast('Weight saved'); render(); },

  // food logging
  openSearch:el=>openSearch(el.dataset.meal),
  searchMeal:el=>{ searchCtx.meal=el.dataset.v; const s=sheetEl('.seg'); if(s) s.outerHTML=mealSeg('searchMeal',searchCtx.meal);
    const r=sheetEl('#results'); if(r) r.innerHTML=searchResults(searchCtx.q); },
  backToSearch:()=>{ const q=searchCtx.q; openSearch(searchCtx.meal); const inp=sheetEl('#q'); if(inp&&q){ inp.value=q; searchCtx.q=q; sheetEl('#results').innerHTML=searchResults(q); } },
  pickFood:el=>openAdd(+el.dataset.idx, searchCtx.meal),
  addMeal:el=>{ addCtx.meal=el.dataset.v; renderAdd(); },
  addMode:el=>{ addCtx.mode=el.dataset.v; renderAdd(); },
  addServ:el=>{ addCtx.serv=+el.dataset.v; renderAdd(); },
  addHand:el=>{ addCtx.hand.type=el.dataset.v; renderAdd(); },
  addHandStep:el=>{ addCtx.hand.count=Math.max(0.5,Math.min(6,addCtx.hand.count+ +el.dataset.d)); renderAdd(); },
  addUsual:()=>{ addCtx.grams=addCtx.learned; renderAdd(); },
  addFat:el=>{ addCtx.fat=el.dataset.v; renderAdd(); },
  commitAdd:()=>{
    const {e,fat}=addCalc(); if(!e.grams){ toast('Enter an amount'); return; }
    logEntry(e); if(fat) day(cur).foods.push(fat);
    if(addCtx.askFat && addCtx.fat && addCtx.fat!==state.profile.lastFat){ state.profile.lastFat=addCtx.fat; markSettingsDirty(); }
    markDayDirty(cur); closeSheet(); toast(`${e.n} added`); render(); },
  logUsual:el=>{
    const u=usuals(el.dataset.meal).find(x=>x.n===el.dataset.n) || {last:lastUse(el.dataset.n)}; if(!u.last) return;
    const {_i,ok,adj,...src}=u.last;
    logEntry({...src, meal:el.dataset.meal, how:src.how==='hand'||src.how==='quick'?src.how:'usual', err:entryErr(src)});
    closeSheet(); toast(`${src.n} added`); render(); },
  repeatYesterday:el=>{ const m=el.dataset.meal; yesterdayMeal(m).forEach(x=>{ const {ok,adj,...c}=x; day(cur).foods.push({...c}); });
    markDayDirty(cur); toast(`${MEAL_LABEL[m]} copied from yesterday`); render(); },
  delCustom:(el,e)=>{ e.stopPropagation(); const ci=+el.dataset.ci, gone=state.customFoods.splice(ci,1)[0];
    if(gone&&gone.id) queueFoodDelete(gone.id); else save(); toast('Removed'); const r=sheetEl('#results'); if(r) r.innerHTML=searchResults(searchCtx.q); },
  editEntry:el=>openEdit(+el.dataset.i),
  editSet:el=>{ editCtx.mult=+el.dataset.v; editCtx.meal=editCtx.meal; renderEdit(); },
  editMeal:el=>{ editCtx.meal=el.dataset.v; renderEdit(); },
  saveEdit:()=>{ const c=editCtx, x=day(cur).foods[c.i]; if(!x) return closeSheet();
    if(Math.abs(c.mult-1)>0.001){ ['k','p','c','f'].forEach(k=>x[k]*=c.mult); x.grams=Math.round((x.grams||0)*c.mult);
      if(x.hand) x.hand.count=r1(x.hand.count*c.mult); if(x.serv) x.serv=r1(x.serv*c.mult);
      x.err=Math.min(entryErr(x),ERR.usual); x.ok=true; x.adj=true; }  // a correction is the user telling us what they know
    x.meal=c.meal; markDayDirty(cur); closeSheet(); render(); },
  confirmEntry:()=>{ const x=day(cur).foods[editCtx.i]; if(x){ x.ok=true; markDayDirty(cur); } closeSheet(); toast('Thanks, noted'); render(); },
  deleteEntry:()=>{ day(cur).foods.splice(editCtx.i,1); markDayDirty(cur); closeSheet(); render(); },

  // recipes
  logRecipe:el=>openRecipeLog(+el.dataset.ri),
  recipeMeal:el=>{ recipeCtx.meal=el.dataset.v; renderRecipeLog(); },
  recipeServ:el=>{ recipeCtx.q=+el.dataset.v; renderRecipeLog(); },
  commitRecipe:()=>{ const c=recipeCtx, r=state.recipes[c.ri], per=recipePer(r);
    logEntry({n:r.name, grams:r0(per.g*c.q), k:per.k*c.q, p:per.p*c.q, c:per.c*c.q, f:per.f*c.q, meal:c.meal, src:'recipe', how:'recipe', err:ERR.recipe, serv:c.q});
    closeSheet(); toast(`${r.name} added`); render(); },
  foodSub:el=>{ foodSub=el.dataset.v; mealBuilder=null; render({top:true}); },
  newRecipe:()=>{ mealBuilder={name:"",servings:1,items:[]}; mealQuery=""; render({top:true}); },
  editRecipe:el=>{ const r=state.recipes[+el.dataset.ri]; if(!r) return;
    mealBuilder={id:r.id, name:r.name, servings:r.servings, items:(r.items||[]).map(i=>({...i}))}; mealQuery=""; render({top:true}); },
  builderAdd:el=>{ const f=allFoods()[+el.dataset.idx]; if(!f||!mealBuilder) return;
    mealBuilder.items.push({n:f.n,k:f.k,p:f.p,c:f.c,f:f.f,grams:f.g}); render(); },
  builderRemove:el=>{ mealBuilder.items.splice(+el.dataset.ii,1); render(); },
  saveRecipe:()=>{ const b=mealBuilder; if(!b) return;
    if(!b.name.trim()){ toast('Give the recipe a name'); return; }
    if(!b.items.length){ toast('Add at least one ingredient'); return; }
    let r=b.id?state.recipes.find(x=>x.id===b.id):state.recipes.find(x=>x.name.toLowerCase()===b.name.trim().toLowerCase());
    if(r){ r.name=b.name.trim(); r.servings=+b.servings||1; r.items=b.items; }
    else { r={id:uid("r"), name:b.name.trim(), servings:+b.servings||1, items:b.items}; state.recipes.push(r); }
    markRecipeDirty(r); mealBuilder=null; mealQuery=""; toast('Recipe saved'); render({top:true}); },
  cancelRecipe:()=>{ mealBuilder=null; mealQuery=""; render({top:true}); },
  deleteRecipe:()=>{ const i=state.recipes.findIndex(x=>x.id===mealBuilder.id); if(i<0) return;
    const r=state.recipes.splice(i,1)[0]; queueRecipeDelete(r.id); mealBuilder=null; toast('Recipe deleted'); render({top:true}); },
  openQuick:()=>openQuick(),
  quickMeal:el=>{ quickMeal=el.dataset.v; const s=sheetEl('.seg'); if(s) s.outerHTML=mealSeg('quickMeal',quickMeal); },
  commitQuick:()=>{ const k=parseFloat(val('qk_k')); if(!(k>0)){ toast('Enter the calories'); return; }
    logEntry({n:val('qk_n')||'Quick estimate', grams:0, k, p:parseFloat(val('qk_p'))||0, c:parseFloat(val('qk_c'))||0, f:parseFloat(val('qk_f'))||0, meal:quickMeal, src:'quick', how:'quick', err:ERR.quick});
    closeSheet(); toast('Estimate added'); render(); },
  openCreateFood:()=>openCreateFood(),
  commitCreate:()=>{ const n=val('cf_n'); if(!n){ toast('Give it a name'); return; }
    const def={n, g:r0(parseFloat(val('cf_g'))||100), k:parseFloat(val('cf_k'))||0, p:parseFloat(val('cf_p'))||0, c:parseFloat(val('cf_c'))||0, f:parseFloat(val('cf_f'))||0};
    let ex=state.customFoods.find(x=>x.n.toLowerCase()===n.toLowerCase());
    if(ex) Object.assign(ex,def); else { ex={...def,id:uid("f")}; state.customFoods.push(ex); }
    markFoodDirty(ex); toast('Food saved'); openAdd(allFoods().indexOf(ex), searchCtx.meal); },

  // train
  wsel:el=>{ trainSel=el.dataset.v; render(); },
  addSet:el=>{ const ei=+el.dataset.ei, cont=document.getElementById("sets_"+ei), si=cont.querySelectorAll(".setrow").length;
    cont.insertAdjacentHTML('beforeend', setRow(si,{w:"",reps:""},el.dataset.plank==="1")); },
  saveWorkout:()=>{ const sel=trainShown; day(cur).workout={type:sel, ex:collectWorkout(sel)}; markDayDirty(cur); toast(`${sel} session saved`); render(); },
  saveCardio:()=>{ day(cur).workout={type:"Cardio", cardioType:val("c_type"), mins:val("c_min")}; markDayDirty(cur); toast('Cardio saved'); render(); },

  // plan
  editPlan:el=>openPlan(el.dataset.id),
  savePlan:()=>{ const when=val('pl_when'), then=val('pl_then'); if(!when||!then){ toast('Fill in when and what you\'ll do'); return; }
    const plans=state.profile.plans; let pl=planEdit.id&&plans.find(p=>p.id===planEdit.id);
    if(pl) Object.assign(pl,{when,then,cope:val('pl_cope')}); else plans.push({id:uid("p"), when, then, cope:val('pl_cope'), created:todayStr(), reviews:[]});
    markSettingsDirty(); closeSheet(); toast('Plan saved'); render(); },
  deletePlan:()=>{ state.profile.plans=state.profile.plans.filter(p=>p.id!==planEdit.id); markSettingsDirty(); closeSheet(); render(); },
  reviewPlans:()=>openReview(),
  reviewSet:el=>{ reviewCtx[el.dataset.id]=el.dataset.v; reviewCtx._render(); },
  saveReview:()=>{ const t=todayStr();
    state.profile.plans.forEach(pl=>{ if(reviewCtx[pl.id]){ (pl.reviews=pl.reviews||[]).push({d:t,r:reviewCtx[pl.id]}); pl.lastReview=t; } });
    markSettingsDirty(); closeSheet(); toast('Thanks for checking in'); render(); },
  guide:el=>openSheet({ title:{eating:'Daily eating template',supps:'Supplement timing',basics:'The honest basics'}[el.dataset.g], left:'',
    right:`<button class="navbtn b" data-act="closeSheet">Done</button>`, tall:true, body:guideHtml(el.dataset.g) }),

  // profile & settings
  sett:el=>{ _sett[el.dataset.k]=!_sett[el.dataset.k]; render(); },
  setAccuracy:el=>{ state.profile.accuracy=el.dataset.v; markSettingsDirty(); render(); },
  setGentle:el=>{ state.profile.gentle=el.dataset.v==='1'; markSettingsDirty(); render(); },
  setTheme:el=>{ state.profile.theme=el.dataset.v; markSettingsDirty(); applyTheme(); render(); },
  openHands:()=>openHands(),
  saveHands:()=>{ Object.keys(HANDS).forEach(k=>{ const v=parseFloat(val('hand_'+k)); if(v>0) state.profile.hands[k]=Math.round(v); });
    markSettingsDirty(); closeSheet(); toast('Hand portions saved'); render(); },
  saveProfile:async el=>{
    const email=val("profEmail");
    state.profile.name=val("profName"); markSettingsDirty(); toast("Profile saved");
    if(email && window.supabase && email!==currentSession?.user?.email){
      el.disabled=true; el.textContent="Sending confirmation…";
      const {error}=await supaAuth.auth.updateUser({email});
      toast(error?"Email error: "+error.message:"Check your email to confirm the new address");
    }
    render(); },
  saveMetrics:()=>{
    const p=state.profile; p.sex=val("profSex")||'M'; p.age=parseInt(val("profAge"))||null; p.height=parseInt(val("profHeight"))||null;
    p.activityLevel=val("profActivity")||'light';
    const wt=parseFloat(val("profWeight"))||null; if(wt){ p.weight=wt; day(cur).weight=wt; markDayDirty(cur); }
    markSettingsDirty(); toast("Metrics saved"); render(); },
  applySuggested:()=>{ const sug=msjSuggested(profileWeight()); if(!sug) return;
    state.target={kcal:sug.kcal,p:sug.p,c:sug.c,f:sug.f}; markSettingsDirty(); toast("Targets updated"); render(); },
  saveTargets:()=>{
    let kcal=parseInt(val("tKcal"))||state.target.kcal;
    if(kcal<1200){ kcal=1200; toast("Kept at 1,200 kcal. Going lower needs medical support."); } else toast("Targets saved");
    state.target={ kcal, p:parseInt(val("tProt"))||state.target.p, c:parseInt(val("tCarb"))||state.target.c, f:parseInt(val("tFat"))||state.target.f };
    const rw=parseInt(val("tRange")); if(rw>=0) state.profile.rangeWidth=Math.min(400,rw);
    markSettingsDirty(); render(); },
  addSupp:()=>{ suppEditor={mode:'add',id:null,name:'',time:'08:00'}; render(); },
  editSupp:el=>{ const s=state.profile.supplements.find(x=>x.id===el.dataset.id); if(s){ suppEditor={mode:'edit',id:s.id,name:s.name,time:s.time}; render(); } },
  cancelSupp:()=>{ suppEditor=null; render(); },
  saveSupp:()=>{ const name=val("suppName"), time=val("suppTime");
    if(!name){ toast("Enter a supplement name"); return; } if(!time){ toast("Enter a time"); return; }
    if(suppEditor.mode==='edit'){ const s=state.profile.supplements.find(x=>x.id===suppEditor.id); if(s){ s.name=name; s.time=time; } }
    else state.profile.supplements.push({ id:uid('s'), name, time });
    suppEditor=null; markSettingsDirty(); toast("Saved"); render(); },
  delSupp:el=>{ state.profile.supplements=state.profile.supplements.filter(x=>x.id!==el.dataset.id); markSettingsDirty(); render(); },
  exportData:()=>exportData(),
  signOut:()=>doSignOut()
};
const INPUT = {
  search:el=>{ searchCtx.q=el.value.trim().toLowerCase(); const r=sheetEl('#results'); if(r) r.innerHTML=searchResults(searchCtx.q); },
  addGrams:el=>{ addCtx.grams=parseFloat(el.value)||0; const r=sheetEl('input[type=range]'); if(r) r.value=addCtx.grams; updateAddPreview(); },
  addGramsRange:el=>{ addCtx.grams=+el.value; const g=sheetEl('#grams'); if(g) g.value=addCtx.grams; updateAddPreview(); },
  editMult:el=>{ editCtx.mult=+el.value; const x=peek(cur).foods[editCtx.i];
    sheetEl('#editK').innerHTML=`${fmt(x.k*editCtx.mult)}<small>kcal</small>`;
    sheetEl('#editG').textContent=`${x.grams?`${Math.round(x.grams*editCtx.mult)} ${unitOf(x)} · `:''}${r1(x.p*editCtx.mult)} g protein`;
    sheetEl('.chips').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',Math.abs(+c.dataset.v-editCtx.mult)<0.001)); },
  builderName:el=>{ mealBuilder.name=el.value; },
  builderServ:el=>{ mealBuilder.servings=parseFloat(el.value)||1; document.getElementById('mealTotals').innerHTML=builderTotalsText(); },
  builderGram:el=>{ mealBuilder.items[+el.dataset.ig].grams=parseFloat(el.value)||0; document.getElementById('mealTotals').innerHTML=builderTotalsText(); },
  builderSearch:el=>{ mealQuery=el.value; document.getElementById('mealResults').innerHTML=mealResultsHtml(mealQuery.trim().toLowerCase()); }
};
const CHANGE = {
  sched:el=>{ if(!state.schedule) state.schedule={...DEFAULT_SCHEDULE}; state.schedule[+el.dataset.day]=el.value; markSettingsDirty(); toast("Schedule updated"); },
  notif:async el=>{
    if(el.checked){ const ok=await subscribePush(); if(ok){ state.profile.notificationsEnabled=true; markSettingsDirty(); toast("Reminders on"); } else el.checked=false; }
    else { await unsubscribePush(); state.profile.notificationsEnabled=false; markSettingsDirty(); toast("Reminders off"); }
    render(); },
  import:el=>{ if(el.files&&el.files[0]) importData(el.files[0]); }
};
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el) return;
  const fn=ACT[el.dataset.act]; if(fn) fn(el,e);
});
document.addEventListener('keydown', e=>{
  if((e.key==='Enter'||e.key===' ') && e.target.matches('[role="button"]')){ e.preventDefault(); e.target.click(); }
  if(e.key==='Escape' && document.getElementById('sheetRoot').classList.contains('open')) closeSheet();
});
document.addEventListener('input', e=>{ const el=e.target.closest('[data-input]'); if(el&&INPUT[el.dataset.input]) INPUT[el.dataset.input](el,e); });
document.addEventListener('change', e=>{ const el=e.target.closest('[data-change]'); if(el&&CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el,e); });

function setTab(t){
  tab=t; trainSel=null; foodSub='foods'; mealBuilder=null;
  document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));
  render({top:true});
}
document.getElementById("tabs").addEventListener("click",e=>{
  const b=e.target.closest("button[data-tab]"); if(b) setTab(b.dataset.tab);
});

let toastTimer=null;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),1800); }

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
  }catch(e){ console.error('Push subscribe failed:',e); toast('Could not turn on reminders'); return false; }
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
        state=s; normalize(state);
        state._meta=null; ensureMeta(true); save(); cur=todayStr(); toast("Backup loaded"); applyTheme(); render({top:true}); scheduleSync();
      } else toast("That isn't a valid backup file");
    }catch(e){ toast("Could not read that file"); }
  };
  r.readAsText(file);
}

/* ===================== AUTH ===================== */
function authRedirectUrl(){ return window.location.origin + window.location.pathname; }
function showAuth(mode){
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('tabs').style.display = 'none';
  renderAuthForm(mode || 'signin');
}
function hideAuth(){
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('app').style.display = '';
  document.getElementById('tabs').style.display = '';
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
      <p class="sub" style="text-align:center;margin:0 0 20px">We sent a link to your inbox. Open it to continue.</p>
      <button class="btn gray" onclick="renderAuthForm('signin')">Back to sign in</button>`;
    return;
  }
  if(mode === 'set-password'){
    box.innerHTML = `
      <h2 class="auth-title">Set a new password</h2>
      <div id="authErr" class="auth-err" style="display:none"></div>
      <div class="field"><label for="authPw">New password</label><input type="password" id="authPw" placeholder="At least 8 characters" autocomplete="new-password"></div>
      <div class="field"><label for="authPw2">Confirm password</label><input type="password" id="authPw2" placeholder="Repeat password" autocomplete="new-password"></div>
      <button class="btn" onclick="doSetPassword()">Update password</button>`;
    return;
  }
  if(mode === 'forgot'){
    box.innerHTML = `
      <h2 class="auth-title">Reset password</h2>
      <p class="sub" style="margin:0 0 16px">Enter your email and we'll send a reset link.</p>
      <div id="authErr" class="auth-err" style="display:none"></div>
      <div class="field"><label for="authEmail">Email</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"></div>
      <button class="btn" onclick="doForgot()">Send reset link</button>
      <button class="btn gray" style="margin-top:8px" onclick="renderAuthForm('signin')">Back to sign in</button>`;
    return;
  }
  const isSignup = mode === 'signup';
  box.innerHTML = `
    <h2 class="auth-title">${isSignup ? 'Create account' : 'Sign in'}</h2>
    <div id="authErr" class="auth-err" style="display:none"></div>
    <div class="field"><label for="authEmail">Email</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"></div>
    <div class="field"><label for="authPw">Password</label>
      <input type="password" id="authPw" placeholder="${isSignup ? 'At least 8 characters' : 'Your password'}" autocomplete="${isSignup ? 'new-password' : 'current-password'}"></div>
    ${isSignup ? '<div class="field"><label for="authPw2">Confirm password</label><input type="password" id="authPw2" placeholder="Repeat password" autocomplete="new-password"></div>' : ''}
    <button class="btn" id="authSubmit" onclick="${isSignup ? 'doSignup()' : 'doSignin()'}">${isSignup ? 'Create account' : 'Sign in'}</button>
    ${!isSignup ? '<div style="text-align:right;margin-top:10px"><button class="auth-link" onclick="renderAuthForm(\'forgot\')">Forgot password?</button></div>' : ''}
    <div class="auth-divider"><span>or</span></div>
    <button class="btn auth-google" onclick="doGoogle()">
      <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/></svg>
      Continue with Google
    </button>
    <p style="text-align:center;margin:20px 0 0;font-size:15px;color:var(--label2)">
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
  applyTheme();
  // If the Supabase library failed to load, run in local-only mode — no auth required
  if(!window.supabase){
    _appStarted = true;
    currentSession = null;
    setSync("on this device");
    render();
    return;
  }
  const { data: { session } } = await supaAuth.auth.getSession();
  currentSession = session;
  supaAuth.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    if(event === 'PASSWORD_RECOVERY'){ showAuth('set-password'); return; }
    if(session && !_appStarted){
      _appStarted = true; hideAuth(); render(); initSync();
    } else if(session && _appStarted){
      hideAuth();
    } else if(!session){
      _appStarted = false; showAuth('signin');
    }
  });
  if(session){ _appStarted = true; render(); initSync(); }
  else { showAuth('signin'); }
}
/* =================== END AUTH =================== */

initApp();
