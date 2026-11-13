/**
 * The web twin of the native component gallery (apps/native/lib/Gallery.tsx): the same sections,
 * order, words and props, drawn with the web's own components from src/ui and its classes from
 * theme.css. Fixed-position pieces (tab bar, toast) are drawn in place for the side-by-side.
 */
import { useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { connectionLabel } from '@/core/domain/connection'
import { dayStat, weekOf } from '@/core/domain/insights'
import { Icon } from '@/ui/icons'
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
import { G } from '../../lib/galleryData'

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
  const [sheet, setSheet] = useState<'sheet' | 'bare' | null>(null)
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

      <Sec id="seg" title="Seg">
        <Seg options={G.seg} value={seg} onChange={setSeg} />
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
      <AppToast />
    </div>
  )
}
