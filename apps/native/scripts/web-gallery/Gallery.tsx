/**
 * The web twin of the native component gallery (apps/native/lib/Gallery.tsx): the same sections,
 * order, words and props, drawn with the web's own components from src/ui and its classes from
 * theme.css. Fixed-position pieces (tab bar, toast) are drawn in place for the side-by-side.
 */
import { useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { connectionLabel } from '@/core/domain/connection'
import { dayStat, weekOf } from '@/core/domain/insights'
import { Chevron, Icon } from '@/ui/icons'
import { ICONS, type IconName } from '@/ui/iconData'
import { BackButton, BareSheet, CatHead, Disclosure, PageHeader, Seg, SettingRow, Sheet, Toggle } from '@/ui/primitives'
import { connectionLine } from '@/ui/ConnectionPill'
import { KcalBar, MacroTrio, Meter, Rings, Sparkline, WeekBars } from '@/ui/charts'
import { DayNav, MoveStrip, WeekStrip } from '@/ui/WeekStrip'
import { BottomNav } from '@/ui/BottomNav'
import { Ruler } from '@/ui/Ruler'
import { Wheel } from '@/ui/Wheel'
import { CheckTiles, ChoiceTiles } from '@/ui/Tiles'
import { TaliMark } from '@/ui/brand'
import { Opts } from '@/screens/onboarding/Opts'
import { Ticks } from '@/screens/onboarding/Consent'
import { Signposts } from '@/screens/onboarding/Signposts'
import { supportList } from '@/screens/profile/supportRows'
import { G } from '../../lib/galleryData'
import { frac } from '@/core/domain/estimate'
import '@/screens/mind/reset.css'
import heroUrl from '../../assets/auth-hero.jpg'

const MARK_PATH = 'M123.57.33c-17.27,0-31.27,14-31.27,31.27s14,31.27,31.27,31.27,31.27-14,31.27-31.27S140.85.33,123.57.33ZM123.57,45.88c-7.87,0-14.27-6.4-14.27-14.27s6.4-14.27,14.27-14.27,14.27,6.4,14.27,14.27-6.4,14.27-14.27,14.27ZM65.63,28.52V.33h-17v28.19c0,18.59,15.13,33.72,33.72,33.72h9.95v-17h-9.95c-9.22,0-16.72-7.5-16.72-16.72ZM9.95,0H0v17h9.95c9.22,0,16.72,7.5,16.72,16.72v28.19h17v-28.19C43.67,15.13,28.54,0,9.95,0Z'

const CONN_ICON: Record<string, IconName> = { 'up-to-date': 'check', pending: 'cloudUp', offline: 'cloudOff', 'sign-in': 'person', problem: 'alert', 'phone-only': 'cloudOff' }

const CSS = `
.gal .card, .gal .list, .gal .banner { margin-bottom: 0; }
.gal .tabbar { position: relative; z-index: auto; }
.gal [data-g] .toast { position: static; transform: none; opacity: 1; z-index: auto; }
.gal [data-g] .toast:not(.act) { display: inline-block; }
.gal [data-g] .toast.act { width: 100%; }
`

function Sec({ id, title, children, pad = true }: { id: string; title: string; children: ReactNode; pad?: boolean }) {
  return (
    <section data-g={id} style={{ padding: pad ? '12px 16px' : '12px 0', background: 'var(--bg)' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--label2)', marginBottom: 8, padding: pad ? 0 : '0 16px' }}>{title}</div>
      {/* its own formatting context, so a component's outer margins stay inside it, as on native */}
      <div style={{ display: 'flow-root' }}>{children}</div>
    </section>
  )
}

/** App.tsx's toast, as the app mounts it (fixed, above sheets). */
function AppToast() {
  const toast = useStore((s) => s.toast)
  const toastAction = useStore((s) => s.toastAction)
  return (
    <div className={'toast' + (toast ? ' show' : '') + (toastAction ? ' act' : '')} data-app-toast role="status" aria-live="polite">
      <span>{toast}</span>
      {toast && toastAction && <button onClick={() => { toastAction.run(); useStore.setState({ toast: null, toastAction: null }) }}>{toastAction.label}</button>}
    </div>
  )
}

export function Gallery() {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const rows = weekOf(cur).map((d) => dayStat(data, d))
  const [seg, setSeg] = useState('week')
  const [tg, setTg] = useState(true)
  const [open, setOpen] = useState(true)
  const [ruler, setRuler] = useState<number | undefined>(70)
  const [ruler2, setRuler2] = useState<number | undefined>(undefined)
  const [age, setAge] = useState<number | undefined>(34)
  const [age2, setAge2] = useState<number | undefined>(undefined)
  const [goal, setGoal] = useState<string | undefined>('maintain')
  const [areas, setAreas] = useState<string[]>(['knees'])
  const [enjoy, setEnjoy] = useState<string[]>(['walk'])
  const [often, setOften] = useState<string | undefined>('2')
  const [oneOpt, setOneOpt] = useState<string | undefined>('some')
  const [kitOpts, setKitOpts] = useState<string[]>(['db'])
  const [sheet, setSheet] = useState<'sheet' | 'bare' | null>(null)
  const [player, setPlayer] = useState(false)
  const [overSheet, setOverSheet] = useState(false)
  const [mult, setMult] = useState(1.5)
  const [serv, setServ] = useState('1')
  const [mood, setMood] = useState(3)
  const [hand, setHand] = useState('palm')
  const [count, setCount] = useState(1.5)
  const [cardio, setCardio] = useState('Brisk walk')
  const [activity, setActivity] = useState('moderate')
  const [wake, setWake] = useState('07:00')
  const [day, setDay] = useState('')
  const flip = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

  return (
    <div className="gal" data-testid="gallery" style={{ paddingBottom: 24 }}>
      <style>{CSS}</style>
      <Sec id="header" title="PageHeader · DayNav · ConnectionPill · ProfileButton">
        <PageHeader eyebrow={<DayNav />} title="Summary" />
      </Sec>

      <Sec id="pill" title="ConnectionPill and its line, every state">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {G.conn.map((c) => {
            const l = connectionLine(c)
            const label = connectionLabel(c)
            return (
              <div key={c.kind} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <button type="button" className={'cpill num' + (c.kind === 'up-to-date' ? ' ok' : '')} aria-expanded aria-label={label}><Icon name={CONN_ICON[c.kind]} size={15} /><span>{label}</span></button>
                <div className="cline" role="status"><b>{l.head}</b> {l.body}</div>
              </div>
            )
          })}
        </div>
      </Sec>

      <Sec id="icons" title="Icons (20 pt, stroke 2)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(Object.keys(ICONS) as IconName[]).map((n) => <span key={n} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label)' }}><Icon name={n} /></span>)}
        </div>
      </Sec>

      <Sec id="tabbar" title="Tab bar (Summary on; Mind switched off, Food on)" pad={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <BottomNav active="today" onChange={() => {}} />
          <BottomNav active="food" onChange={() => {}} mindOff />
        </div>
      </Sec>

      <Sec id="cathead" title="CatHead">
        <div className="card">
          <CatHead color="energy" icon="fork" label="Food" />
          <CatHead color="activity" icon="dumbbell" label="Move" />
          <CatHead color="body" icon="scale" label="Weight" />
          <CatHead color="mind" icon="target" label="Worth a quick check" />
        </div>
      </Sec>

      <Sec id="seg" title="Seg (default; 32 pt segments, Reset's)">
        <Seg options={G.seg} value={seg} onChange={setSeg} />
        <div className="reset-main" style={{ marginTop: 10, paddingTop: 0 }}><Seg options={G.seg} value={seg} onChange={setSeg} /></div>
      </Sec>

      <Sec id="toggle" title="Toggle (on, off, disabled on, disabled off)">
        <div style={{ display: 'flex', gap: 16 }}>
          <Toggle on={tg} onChange={() => setTg((x) => !x)} label="Reminders" />
          <Toggle on={!tg} onChange={() => setTg((x) => !x)} label="Quiet hours" />
          <Toggle on disabled onChange={() => {}} label="Always on" />
          <Toggle on={false} disabled onChange={() => {}} label="Not available" />
        </div>
      </Sec>

      <Sec id="rows" title="List · SettingRow · Disclosure">
        <div className="list icons">
          <SettingRow icon="dumbbell" color="var(--move-fill)" soft label="Training" value="3 days a week" onPress={() => {}} />
          <SettingRow icon="bell" color="var(--mind-fill)" soft label="Notifications" sub="Supplements and the weekly review" onPress={() => {}} />
          <SettingRow icon="fork" color="var(--food)" label="Solid square" value="On" />
          <Disclosure icon="scale" color="var(--food-fill)" soft label="Body and goal" value="80 kg · Maintain" open={false} onToggle={() => {}}>{null}</Disclosure>
          <Disclosure icon="target" color="var(--food-fill)" soft label="Daily targets" value="2,250 kcal" open={open} onToggle={() => setOpen((x) => !x)}>
            <div className="prose">Targets are ranges. Change them whenever you like.</div>
          </Disclosure>
        </div>
      </Sec>

      <Sec id="nav" title="BackButton · sheet header buttons">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <BackButton onClick={() => {}} />
          <BackButton onClick={() => {}} label="Plan" />
          <button className="navbtn">Cancel</button>
          <button className="navbtn b">Done</button>
        </div>
      </Sec>

      <Sec id="buttons" title="Buttons">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn">Save</button>
          <button className="btn tinted">Add a plan</button>
          <button className="btn gray"><Icon name="plus" />Add food</button>
          <button className="btn danger">Delete entry</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm">Start</button>
            <button className="btn sm gray">Later</button>
            <button className="btn sm" disabled>Off</button>
          </div>
        </div>
      </Sec>

      <Sec id="cards" title="Card · Tile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card">A plain card, 14 by 16 padding.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="tile st" role="button" style={{ flex: 1 }}><span className="tk">Weight</span><span className="v num">80.2</span></div>
            <div className="tile st" style={{ flex: 1 }}><span className="tk">Steps</span><span className="v num">6,240</span></div>
          </div>
        </div>
      </Sec>

      <Sec id="charts" title="Rings · Meter · KcalBar · Sparkline">
        <div className="card pcard">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Rings size={64} items={[{ pct: 0.8, color: 'var(--food)' }, { pct: 0.45, color: 'var(--move)' }, { pct: 1.2, color: 'var(--mind)' }]} />
            <Rings size={34} stroke={3.5} items={[{ pct: 0.6, color: 'var(--energy)' }]} />
            <Sparkline values={G.spark} w={96} h={32} color="var(--body)" />
          </div>
          <Meter pct={0.4} />
          <KcalBar k={1620} lo={1900} hi={2400} />
        </div>
      </Sec>

      <Sec id="macro" title="MacroTrio">
        <div className="card pcard"><MacroTrio p={92} c={180} f={51} tp={125} tc={260} tf={75} /></div>
      </Sec>

      <Sec id="weekbars" title="WeekBars (numbers; gentle)">
        <div className="card pcard">
          <WeekBars rows={rows} lo={1900} hi={2400} cur={cur} />
          <WeekBars rows={rows} lo={1900} hi={2400} cur={cur} numbers={false} />
        </div>
      </Sec>

      <Sec id="weekstrip" title="WeekStrip">
        <WeekStrip />
      </Sec>

      <Sec id="movestrip" title="MoveStrip">
        <MoveStrip />
      </Sec>

      <Sec id="ruler" title="Ruler (70 kg; not set)">
        <Ruler label="Weight" min={25} max={350} initial={70} value={ruler} onChange={setRuler} valueText={(v) => `${v} kilograms`} />
        <Ruler label="Height" min={100} max={250} initial={170} value={ruler2} onChange={setRuler2} valueText={(v) => `${v} centimetres`} />
      </Sec>

      <Sec id="wheel" title="Wheel (34 years; not set)">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}><Wheel label="Age in years" unit="years" min={18} max={100} initial={30} value={age} onChange={setAge} valueText={(v) => `${v} years`} rows={5} /></div>
          <div style={{ flex: 1 }}><Wheel label="Age" min={18} max={100} initial={30} value={age2} onChange={setAge2} rows={5} /></div>
        </div>
      </Sec>

      <Sec id="choice" title="ChoiceTiles">
        <ChoiceTiles label="Your goal" opts={G.goal} value={goal} onPick={setGoal} />
      </Sec>

      <Sec id="check" title="CheckTiles (stacked; grid)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CheckTiles label="Anything to go easy on" opts={G.areas} value={areas} onToggle={(k) => setAreas((x) => flip(x, k))} />
          <CheckTiles label="What you enjoy" opts={G.enjoy} value={enjoy} onToggle={(k) => setEnjoy((x) => flip(x, k))} grid tall />
          <ChoiceTiles label="How often" opts={G.three} value={often} onPick={setOften} className="three" />
        </div>
      </Sec>

      <Sec id="chips" title="Chips">
        <div className="chips">
          <button className="chip">Keep it</button>
          <button className="chip">Turn it off</button>
          <button className="chip on" aria-pressed>Breakfast<small>7 to 10 am</small></button>
          <button className="chip" aria-pressed={false}>Lunch<small>12 to 2 pm</small></button>
        </div>
      </Sec>

      <Sec id="text" title="Lbl · GrpH · Foot · Sub · Prose">
        <div className="grp-h">This week<small>3 of 5</small></div>
        <div className="lbl">Notifications</div>
        <div className="list"><div className="li"><span className="m"><span className="t">A row under a label</span></span></div></div>
        <div className="foot">Your review shows how often you weighed in. Change it any time.</div>
        <div className="sub" style={{ marginTop: 12 }}>A secondary line at 15 pt.</div>
        <div className="prose" style={{ marginTop: 12 }}>
          <p>{G.prose.p1}</p>
          <ul>{G.prose.li.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>{G.prose.h3}</h3>
          <p>{G.prose.p2}</p>
        </div>
      </Sec>

      <Sec id="rows2" title="Row · act · nested · wrapping rows · sign out">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="list">
            <button className="li"><div className="m"><div className="t">Push Pull Legs</div><div className="s">3 days a week</div></div><Chevron /></button>
            <button className="li"><div className="m"><div className="t">Monday</div></div><span className="tr num">Push</span><Chevron /></button>
            <button className="li act"><Icon name="plus" size={17} /><span>New plan</span></button>
          </div>
          <div className="list icons nf-rows">
            <SettingRow icon="bell" color="var(--mind-fill)" soft label="Supplement reminders" sub="On at 8:00 and 20:00, and quiet from 22:00 to 7:00" right={<Toggle on onChange={() => {}} label="Supplement reminders" />} />
            <div className="li nf-sub"><span className="m"><span className="t">Show supplement names in reminders</span></span><Toggle on={false} onChange={() => {}} label="Show supplement names in reminders" /></div>
            <SettingRow icon="moon" color="var(--mind-fill)" soft label="Wind down" value="21:30" onPress={() => {}} />
          </div>
          <button className="btn signout">Sign out</button>
        </div>
      </Sec>

      <Sec id="rows3" title="Row: squares, tag, wrapping sub, trailing slots, needsnet, pv">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="list icons">
            <button className="li"><span className="ico" style={{ background: 'var(--mind-fill)', color: 'var(--mind-ink)' }}><Icon name="wind" size={18} /></span><div className="m"><div className="t">Reset</div><div className="s" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>Two minutes of slower breathing, whenever you need it</div></div><Chevron /></button>
            <div className="li"><span className="ico" style={{ background: 'var(--energy)', color: 'var(--on-food)' }}><Icon name="fork" size={18} /></span><div className="m"><div className="t">Oat porridge</div><div className="s">158 kcal · 5.4 g protein per 100 g<span className="tag">Mine</span></div></div><button className="addc" aria-label="Add Oat porridge"><Icon name="plus" size={16} stroke={2.8} /></button></div>
            <div className="li"><div className="m"><div className="t">Today</div></div><span className="tr kc num">1,500 kcal</span></div>
            <button className="li needsnet"><div className="m"><div className="t">Shared products</div><div className="s">Needs a connection. Search works offline.</div></div><Chevron /></button>
            <div className="li"><div className="m"><div className="t">A note you can hide</div></div><button className="x-btn" aria-label="Hide this note"><Icon name="x" size={14} stroke={2.6} /></button></div>
            <div className="li"><div className="m"><div className="t">Weekly review</div><div className="s">Sunday</div></div><button className="btn sm">Open</button></div>
          </div>
          <div className="list">
            <button className="li pv-row"><span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fill)', flex: 'none' }} /><div className="m"><div className="t">Full body, a longer name that wraps onto two lines</div><div className="s">Strength · 6 exercises · about 35 min</div><div className="s2">Last done Tuesday</div></div><Chevron /></button>
          </div>
        </div>
      </Sec>

      <Sec id="notes" title="Note (info, warn, ok) · Empty">
        <div className="note" role="status"><Icon name="info" size={17} /><span>These numbers look high for this food. Check the label.</span></div>
        <div className="note warn"><Icon name="info" size={17} /><span>The camera is off for Tilo. You can still type the barcode.</span><button className="btn sm">Check again</button></div>
        <div className="note ok" role="status"><Icon name="checkc" size={17} /><span>These numbers are consistent with each other.</span></div>
        <div className="empty">Add what went in. Don't forget the oil.</div>
      </Sec>

      <Sec id="chips2" title="Chip sizes and tones · radio and tab roles">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="chips">
            <button className="chip sm on" role="tab" aria-selected>Week 1</button>
            <button className="chip sm" role="tab" aria-selected={false}>Week 2</button>
            <button className="chip sm on" aria-label="Remove Vegetarian">Vegetarian ×</button>
          </div>
          <div className="chips">
            <button className="chip ink">Log it</button>
            <button className="chip plain">Not today</button>
            <button className="chip on" role="radio" aria-checked>Small</button>
            <button className="chip" role="radio" aria-checked={false}>Large</button>
          </div>
        </div>
      </Sec>

      <Sec id="links" title="TextLink in a sentence · GrpH link · Lbl style">
        <div style={{ fontSize: 15, lineHeight: 1.45 }}>
          Today can be lighter. <button type="button" className="linkbtn inl">Change what Summary shows</button>, or <button type="button" className="linkbtn inl" aria-label="Open support" aria-expanded={false}>find support</button>.
        </div>
        <div className="grp-h">Your workouts<button className="linkbtn">See all</button></div>
        <div className="lbl" style={{ paddingTop: 4 }}>A label with less space above</div>
      </Sec>

      <Sec id="fields" title="Field · Input · textarea · FRow · NameField · SearchBar">
        <div className="field"><label htmlFor="g-email">Email</label><input id="g-email" type="email" defaultValue="sam@example.com" /></div>
        <div className="field"><label htmlFor="g-help">What would help?</label><input id="g-help" placeholder="A short walk after lunch" /></div>
        <div className="field"><label htmlFor="g-note">Note</label><textarea id="g-note" defaultValue={'Felt strong today.\nSlept well.'} style={{ minHeight: 80, display: 'block' }} /></div>
        <div className="list">
          <div className="frow"><label htmlFor="g-n">Name</label><input id="g-n" defaultValue="Oat porridge" /></div>
          <div className="frow"><label htmlFor="g-s">Serving</label><input id="g-s" inputMode="decimal" defaultValue="40" /><span className="u">g</span></div>
          <div className="frow need"><label htmlFor="g-p">Protein</label><input id="g-p" inputMode="decimal" placeholder="Needed" /><span className="u">g</span></div>
          <div className="frow flag"><label htmlFor="g-k">Energy</label><input id="g-k" inputMode="numeric" defaultValue="1250" /><span className="u">kcal</span><span className="flagnote">Check this against the pack</span></div>
        </div>
        <div style={{ marginTop: 16 }}><label className="card pb-name" style={{ marginBottom: 16 }}><span className="pb-k">Name</span><input defaultValue="Strength, 3 days" /></label></div>
        <div className="searchbar"><Icon name="search" size={17} /><input placeholder="Search plans" aria-label="Search plans" /></div>
      </Sec>

      <Sec id="opts" title="Opts (one answer; several)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Opts label="How often" opts={G.opts} value={oneOpt} onPick={setOneOpt} />
          <Opts label="Your kit" opts={G.kit} value={kitOpts} onPick={(k) => setKitOpts((x) => flip(x, k))} multi />
        </div>
      </Sec>

      <Sec id="ticks" title="Ticks · Check (on, off, small)">
        <Ticks items={G.ticks} />
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <span className="chk on" aria-hidden="true"><Icon name="check" size={14} stroke={3} /></span>
          <span className="chk" aria-hidden="true" />
          <span className="chk sm on" aria-hidden="true"><Icon name="check" size={11} stroke={3.6} /></span>
          <span className="chk sm" aria-hidden="true" />
        </div>
      </Sec>

      <Sec id="signposts" title="Signposts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Signposts list={supportList('england')} />
          <Signposts list={G.beatLines} />
        </div>
      </Sec>

      <Sec id="extras" title="ConsentRow · Row wrap · BackButton small · Banner, no icon · Btn iconAfter · TaliMark colour">
        <div className="list">
          <div className="li consent-row"><input id="g-c1" type="checkbox" defaultChecked /><label htmlFor="g-c1">I agree to Tilo storing and using my health information, as the <a href="#p">privacy policy</a> explains.</label></div>
          <div className="li consent-row"><input id="g-c2" type="checkbox" /><label htmlFor="g-c2">I’m 18 or over.</label></div>
        </div>
        <div className="del" style={{ paddingTop: 0, gap: 0 }}>
          <div className="list" style={{ marginTop: 10 }}>
            <div className="li"><div className="m"><div className="t">Delete your account and everything in it, on every device</div><div className="s">This can’t be undone. Download a copy first if you want one.</div></div></div>
            <button className="li" aria-label="Take a photo of the barcode"><span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span><div className="m"><div className="t">Take a photo</div></div><Chevron /></button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="navbtn" style={{ alignSelf: 'flex-start' }}><Icon name="chevL" size={20} stroke={2.6} />Profile</button>
            <div className="banner"><div><b>Your data is safe on this phone.</b><br /><span className="muted">Sign in again to back it up.</span></div></div>
            <button className="btn">Continue<Icon name="chevR" /></button>
            <div style={{ background: 'var(--tint)', borderRadius: 22, padding: 16, display: 'flex', justifyContent: 'center', color: '#fff' }}><svg width={90} height={(90 * 62.88) / 154.85} viewBox="0 0 154.85 62.88" role="img" aria-label="Tilo"><path fill="#ffffff" d={MARK_PATH} /></svg></div>
          </div>
        </div>
      </Sec>

      <Sec id="insets" title="List inset (72: library rows; 0: Today list)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="list">
            <button className="li lib-row"><span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fill)', flex: 'none' }} /><div className="m"><div className="t">Goblet squat</div><div className="s">Legs · dumbbell</div></div><Chevron /></button>
            <button className="li lib-row"><span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fill)', flex: 'none' }} /><div className="m"><div className="t">Push-up</div><div className="s">Chest · body weight</div></div><Chevron /></button>
          </div>
          <div className="list tlist">
            <button className="li"><div className="m"><div className="t">Full body</div><div className="s">6 exercises</div></div><Chevron /></button>
            <button className="li"><div className="m"><div className="t">Walk</div><div className="s">30 min</div></div><Chevron /></button>
          </div>
        </div>
      </Sec>

      <Sec id="p4" title="Slider · Stepper · Scale (servings; check-in) · chips with hints · Select">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="big num">{Math.round(412 * mult)}<small>kcal</small></div>
          <input type="range" min={0.25} max={3} step={0.05} value={mult} style={{ marginTop: 12 }} aria-label="Portion size" onChange={(e) => setMult(+e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="scale">
            {G.serv.map((it) => <button key={it.key} className={serv === it.key ? 'on' : ''} onClick={() => setServ(it.key)}><b className="num">{it.big}</b>{it.text}</button>)}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="scale ck-scale">
            {G.moods.map((it) => <button key={it.key} className={mood === it.key ? 'on' : ''} aria-pressed={mood === it.key} onClick={() => setMood(it.key)}>{it.text}</button>)}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="chips">
            {G.hands.map(([k, l, h]) => <button key={k} className={'chip' + (hand === k ? ' on' : '')} onClick={() => setHand(k)}>{l}<small>{h}</small></button>)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span>How many</span>
          <span className="stepper">
            <button aria-label="Fewer" onClick={() => setCount(Math.max(0.5, count - 0.5))}>−</button>
            <span className="num">{frac(count)}</span>
            <button aria-label="More" onClick={() => setCount(Math.min(6, count + 0.5))}>+</button>
          </span>
        </div>
        <div className="list" style={{ marginTop: 14 }}>
          <div className="frow"><label htmlFor="g-type">Type</label>
            <select id="g-type" value={cardio} onChange={(e) => setCardio(e.target.value)}>{G.cardio.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="field"><label htmlFor="g-act">Activity level</label>
            <select id="g-act" value={activity} onChange={(e) => setActivity(e.target.value)}>{G.activity.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
      </Sec>

      <Sec id="n5" title="RoundBtn · icon navbtns · DashAdd · link Btn · Note, tinted button · Row key · Big · FRow hint">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button className="roundbtn" aria-label="Add food"><Icon name="plus" size={22} stroke={2.4} /></button>
          <button className="navbtn scanbtn" aria-label="Scan barcode" style={{ padding: '4px 2px' }}><Icon name="barcode" size={20} /></button>
          <button className="navbtn" style={{ color: 'var(--label3)' }} aria-label="Delete Oat porridge"><Icon name="x" size={17} /></button>
        </div>
        <button className="dash-add"><Icon name="plus" size={18} stroke={2.6} />Breakfast</button>
        <button className="dash-add"><Icon name="plus" size={18} stroke={2.4} />Add a workout</button>
        <div style={{ marginTop: 12 }}><button className="btn dup-link">Save as new</button></div>
        <div className="note"><Icon name="info" size={17} /><span>The label couldn’t be read. Try again in better light.</span><button className="btn sm tinted">Try again</button></div>
        <div className="list" style={{ marginTop: 10 }}>
          <div className="li"><div className="m"><div className="dup-k">Yours</div><div className="dup-nm">Oat porridge</div></div></div>
          <div className="li"><div className="m"><div className="dup-k">From the shared list</div><div className="dup-nm">Oats, porridge, made with semi-skimmed milk</div></div></div>
        </div>
        <div className="card" style={{ marginTop: 10 }}><div className="big num">412<small>kcal</small><span className="pm">± 40</span></div></div>
        <div className="list" style={{ marginTop: 10 }}>
          <div className="frow"><label htmlFor="g-palm">Palm<div className="sub" style={{ fontSize: 13 }}>Meat, fish, tofu</div></label><input id="g-palm" type="number" inputMode="numeric" defaultValue="100" /><span className="u">g</span></div>
          <div className="frow"><label htmlFor="g-thumb">Thumb<div className="sub" style={{ fontSize: 13 }}>Oil, butter, nut butter</div></label><input id="g-thumb" type="number" inputMode="numeric" defaultValue="12" /><span className="u">g</span></div>
        </div>
      </Sec>

      <Sec id="pickers" title="Time fields (tap for the wheels; both disabled) · a date in a sheet">
        <div className="list nf-times">
          <div className="frow"><label htmlFor="g-wake">Wake time</label><input id="g-wake" type="time" className="num" value={wake} onChange={(e) => setWake(e.target.value)} /></div>
          <div className="frow"><label htmlFor="g-wind">Wind down</label><input id="g-wind" type="time" className="num" value="21:30" onChange={() => {}} /></div>
        </div>
        <div className="list nf-times" style={{ marginTop: 10 }}>
          <div className="frow"><label htmlFor="g-wake2">Wake up</label><input id="g-wake2" type="time" className="num" value="07:00" disabled onChange={() => {}} /></div>
          <div className="frow"><label htmlFor="g-wind2">Wind-down</label><input id="g-wind2" type="time" className="num" value="21:30" disabled onChange={() => {}} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="btn gray" style={{ position: 'relative', overflow: 'hidden' }}>{day ? `Starts ${day}` : 'Pick a date'}
            <input type="date" aria-label="Pick a start date" min="2026-11-13" max="2027-11-13" value={day} onChange={(e) => setDay(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%' }} /></label>
        </div>
      </Sec>

      <Sec id="kit2" title="Stack · flat links · XBtn with chevrons · Swatch rows">
        <div className="stack" style={{ marginTop: 0 }}>
          <button className="btn">Start</button>
          <button className="btn gray">Not today</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
          <button className="linkbtn" style={{ padding: 0 }}>How to do it</button>
          <button className="linkbtn" style={{ padding: 0 }}>+ Add a set</button>
          <button className="linkbtn" style={{ color: 'var(--red)' }}>Remove</button>
        </div>
        <div className="rb-acts" style={{ marginLeft: 0, marginTop: 14 }}>
          <button className="x-btn up" aria-label="Move Goblet squat up"><Icon name="chevL" size={14} stroke={2.6} /></button>
          <button className="x-btn down" aria-label="Move Goblet squat down"><Icon name="chevR" size={14} stroke={2.6} /></button>
          <button className="x-btn down" disabled aria-label="Move Plank down"><Icon name="chevR" size={14} stroke={2.6} /></button>
        </div>
        <div className="list" style={{ marginTop: 14 }}>
          <button className="li"><span className="catsq" style={{ background: 'var(--move-fill)' }} aria-hidden="true" /><div className="m"><div className="t">Strength</div><div className="s">Full body, lower, upper</div></div><Chevron /></button>
          <div className="li"><span className="catsq sm" style={{ background: 'var(--food-fill)' }} aria-hidden="true" /><div className="m"><div className="t">Eating</div></div><span className="tr num">Maintenance</span></div>
        </div>
      </Sec>

      <Sec id="cover" title="CoverImage (50% 30%) · GrpH as h2">
        <div style={{ position: 'relative', height: 160, borderRadius: 16, overflow: 'hidden' }}>
          <img src={heroUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
        </div>
        <h2 className="grp-h">This week</h2>
        <div className="list"><div className="li"><div className="m"><div className="t">Monday</div></div><span className="tr num">Push</span></div></div>
      </Sec>

      <Sec id="banner" title="Banner">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="banner">
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="leaf" /></span>
            <div><b>Welcome back.</b><br /><span className="muted">A day off logging doesn't undo anything. Pick up from here.</span></div>
            <button className="x" aria-label="Dismiss"><Icon name="x" size={12} stroke={3} /></button>
          </div>
          <button className="banner">
            <span style={{ color: 'var(--mind-ink)' }}><Icon name="bulb" /></span>
            <div><b>How are your plans going?</b><br /><span className="muted">A 10-second check-in on your plan. Plans work best when you revisit them.</span></div>
          </button>
        </div>
      </Sec>

      <Sec id="toast" title="Toast (plain; with an action)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div className="toast show" role="status"><span>Saved</span></div>
          <div style={{ alignSelf: 'stretch', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
            <div className="toast show act" role="status"><span>Entry deleted</span><button>Undo</button></div>
          </div>
        </div>
      </Sec>

      <Sec id="mark" title="TaliMark">
        <div style={{ display: 'flex', justifyContent: 'center' }}><TaliMark /></div>
      </Sec>

      <Sec id="sheets" title="Sheet · BareSheet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn gray" onClick={() => setSheet('sheet')}>Open a sheet</button>
          <button className="btn gray" onClick={() => setSheet('bare')}>Open a bare sheet</button>
          <button className="btn gray" onClick={() => setPlayer(true)}>Open a full-screen view</button>
        </div>
      </Sec>

      {sheet === 'sheet' && (
        <Sheet title="Edit entry" onClose={() => setSheet(null)} right={<button className="navbtn b" onClick={() => setSheet(null)}>Save</button>}>
          <div className="list">
            <SettingRow icon="fork" color="var(--food)" label="Chicken and rice" value="300 g" />
            <SettingRow icon="pill" color="var(--mind-fill)" soft label="Vitamin D" value="1" />
          </div>
          <div className="stack">
            <button className="btn gray" onClick={() => useStore.getState().showToast('Entry deleted', { label: 'Undo', run: () => {} })}>Show a toast</button>
            <button className="btn gray" onClick={() => { setSheet('bare'); useStore.getState().showToast('Swapped') }}>Swap to the bare sheet</button>
            <button className="btn" onClick={() => setSheet(null)}>Save</button>
          </div>
        </Sheet>
      )}
      {sheet === 'bare' && (
        <BareSheet label="How did it go?" onClose={() => setSheet(null)}>
          <h2 style={{ margin: '12px 0 0', fontSize: 22, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.01em' }}>How did it go?</h2>
          <p style={{ margin: '8px 0 0', fontSize: 17, lineHeight: 1.45, color: 'var(--label2)' }}>A word or two is plenty.</p>
          <div style={{ marginTop: 16 }}><button className="btn" onClick={() => setSheet(null)}>Done</button></div>
        </BareSheet>
      )}
      {player && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', padding: '80px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>Full-screen view</div>
          <button className="btn gray" onClick={() => setOverSheet(true)}>Open a sheet over it</button>
          <button className="btn gray" onClick={() => setPlayer(false)}>Close the view</button>
          {overSheet && (
            <Sheet title="Adjust" onClose={() => setOverSheet(false)} right={<button className="navbtn b" onClick={() => setOverSheet(false)}>Done</button>}>
              <div className="list icons"><SettingRow icon="dumbbell" color="var(--move-fill)" soft label="Weight" value="20 kg" /></div>
            </Sheet>
          )}
        </div>
      )}
      <AppToast />
    </div>
  )
}
