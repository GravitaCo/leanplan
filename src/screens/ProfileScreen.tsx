import { useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import type { AccuracyMode, ActivityLevel, Goal, HandPortion, Sex, ThemePref } from '@/core/types'
import { ACTIVITY } from '@/core/data/constants'
import { fmt } from '@/core/domain/date'
import { suggestedTargets } from '@/core/domain/nutrition'
import { ACCURACY, HANDS, accuracyOf, handGrams } from '@/core/domain/estimate'
import { rangeWidth } from '@/core/domain/insights'
import { pushSupported } from '@/data/push'
import { exportBackup, readBackup } from '@/data/backup'
import { Disclosure, PageHeader, Seg, Sheet, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'

function latestWeight(days: Record<string, { weight: number | null }>, profileWeight?: number | null) {
  for (const d of Object.keys(days).sort().reverse()) if (days[d]?.weight) return days[d].weight
  return profileWeight ?? null
}

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose-fat', label: 'Lose fat' },
  { value: 'build-muscle', label: 'Build muscle' },
  { value: 'increase-strength', label: 'Increase strength' },
  { value: 'increase-endurance', label: 'Improve endurance' },
]
const GOAL_TARGET_LABEL: Record<Goal, string> = {
  'lose-fat': 'Fat loss', 'build-muscle': 'Muscle gain', 'increase-strength': 'Strength', 'increase-endurance': 'Endurance',
}
function directionLabel(pct: number): string {
  if (pct < 0) return `${-pct}% below maintenance`
  if (pct > 0) return `${pct}% above maintenance`
  return 'at maintenance'
}

type Section = 'profile' | 'metrics' | 'targets' | 'supplements' | 'notifications' | 'account' | 'backup' | 'about'

export function ProfileScreen() {
  const data = useStore((s) => s.data)
  const email = useStore((s) => s.email)
  const authed = useStore((s) => s.authed)
  const signOut = useStore((s) => s.signOut)
  const saveProfileMetrics = useStore((s) => s.saveProfileMetrics)
  const saveTargets = useStore((s) => s.saveTargets)
  const setPrefs = useStore((s) => s.setPrefs)
  const addSupplement = useStore((s) => s.addSupplement)
  const updateSupplement = useStore((s) => s.updateSupplement)
  const removeSupplement = useStore((s) => s.removeSupplement)
  const updateEmail = useStore((s) => s.updateEmail)
  const setNotifications = useStore((s) => s.setNotifications)
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)

  const pr = data.profile
  const weight = latestWeight(data.days, pr.weight)
  const [open, setOpen] = useState<Section | null>(null)
  const [handsOpen, setHandsOpen] = useState(false)
  const toggle = (s: Section) => setOpen((o) => (o === s ? null : s))

  const [name, setName] = useState(pr.name || '')
  const [emailField, setEmailField] = useState(email || '')
  const [metrics, setMetrics] = useState({
    sex: pr.sex, age: pr.age?.toString() || '', height: pr.height?.toString() || '',
    weight: weight?.toString() || '', activityLevel: pr.activityLevel,
  })
  const [targets, setTargets] = useState({
    kcal: data.target.kcal.toString(), p: data.target.p.toString(), c: data.target.c.toString(), f: data.target.f.toString(),
    range: rangeWidth(pr).toString(),
  })
  const [suppForm, setSuppForm] = useState<{ id: string | null; name: string; time: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sug = suggestedTargets({ ...pr, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null }, parseFloat(metrics.weight) || null)
  const notifReady = pushSupported()
  const notifStatus = !notifReady ? 'Not supported in this browser'
    : Notification.permission === 'denied' ? 'Blocked in your phone settings'
    : pr.notificationsEnabled ? 'On' : 'Off'
  const initials = (pr.name || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const field = (label: string, input: ReactNode) => <div className="field"><label>{label}</label>{input}</div>

  return (
    <div className="screen">
      <PageHeader title="Profile" />
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="avatar lg">{initials || <Icon name="person" size={28} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{pr.name || 'Add your name'}</div>
          <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authed ? email : 'On this device only'}</div>
        </div>
      </div>

      <div className="lbl">Tracking</div>
      <div className="list"><div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: 8 }}>Accuracy</div>
        <Seg<AccuracyMode> options={(Object.keys(ACCURACY) as AccuracyMode[]).map((k) => [k, ACCURACY[k].label])}
          value={pr.accuracy ?? 'balanced'} onChange={(v) => setPrefs({ accuracy: v })} />
        <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>{accuracyOf(pr).desc}</div>
      </div></div>
      <div className="list"><div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: 8 }}>Display</div>
        <Seg<'std' | 'gentle'> options={[['std', 'Standard'], ['gentle', 'Gentle']]} value={pr.gentle ? 'gentle' : 'std'}
          onChange={(v) => setPrefs({ gentle: v === 'gentle' })} />
        <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>
          {pr.gentle ? 'Calorie numbers and body weight are hidden. You see how the day is going in words, and protein stays visible.'
            : 'Full numbers, with a ± margin on anything estimated.'}
        </div>
      </div></div>
      <div className="list"><div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: 8 }}>Appearance</div>
        <Seg<ThemePref> options={[['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']]} value={pr.theme ?? 'system'}
          onChange={(v) => setPrefs({ theme: v })} />
      </div></div>
      <div className="list icons">
        <button className="li" onClick={() => setHandsOpen(true)}>
          <span className="ico" style={{ background: 'var(--activity)' }}><Icon name="hand" size={18} /></span>
          <div className="m"><div className="t">Hand portions</div></div>
          <span className="tr num">palm {handGrams(pr, 'palm')} g</span><Chevron />
        </button>
      </div>

      <div className="lbl">Settings</div>
      <div className="list icons">
        <Disclosure icon="person" color="var(--tint)" label="Profile" open={open === 'profile'} onToggle={() => toggle('profile')}>
          {field('Display name', <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />)}
          {authed && field('Email', <input type="email" value={emailField} onChange={(e) => setEmailField(e.target.value.trim())} autoComplete="email" />)}
          <button className="btn" onClick={async () => {
            saveProfileMetrics({ name })
            if (authed && emailField && emailField !== email) {
              const err = await updateEmail(emailField)
              showToast(err ? 'Email error: ' + err : 'Check your email to confirm')
            }
          }}>Save profile</button>
        </Disclosure>

        <Disclosure icon="scale" color="var(--body)" label="Body metrics & goal" open={open === 'metrics'} onToggle={() => toggle('metrics')}>
          <div className="grid2">
            {field('Sex', <select value={metrics.sex} onChange={(e) => setMetrics({ ...metrics, sex: e.target.value as Sex })}>
              <option value="M">Male</option><option value="F">Female</option></select>)}
            {field('Age', <input type="number" value={metrics.age} placeholder="35" onChange={(e) => setMetrics({ ...metrics, age: e.target.value })} />)}
            {field('Height (cm)', <input type="number" value={metrics.height} placeholder="178" onChange={(e) => setMetrics({ ...metrics, height: e.target.value })} />)}
            {field('Weight (kg)', <input type="number" step="0.1" value={metrics.weight} placeholder="82.5" onChange={(e) => setMetrics({ ...metrics, weight: e.target.value })} />)}
          </div>
          {field('Activity level', <select value={metrics.activityLevel} onChange={(e) => setMetrics({ ...metrics, activityLevel: e.target.value as ActivityLevel })}>
            {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>)}
          <button className="btn gray" onClick={() => saveProfileMetrics({
            sex: metrics.sex, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null,
            weight: parseFloat(metrics.weight) || null, activityLevel: metrics.activityLevel,
          })}>Save metrics</button>

          <div className="lbl" style={{ paddingLeft: 0 }}>Main goal</div>
          <div className="chips">
            {GOALS.map((g) => (
              <button key={g.value} className={'chip' + (pr.goal === g.value ? ' on' : '')} onClick={() => saveProfileMetrics({ goal: g.value })}>{g.label}</button>
            ))}
          </div>
          {sug ? (
            <div className="card" style={{ marginTop: 12, background: 'var(--fill)', fontSize: 15, lineHeight: 1.45 }}>
              {'goalNeeded' in sug ? (
                <>Maintenance about <b className="num">{fmt(sug.maint)} kcal</b>.<br /><span className="muted">Choose your main goal to see a suggested daily target.</span></>
              ) : (
                <>
                  Maintenance <b className="num">{fmt(sug.maint)} kcal</b> · {GOAL_TARGET_LABEL[sug.goal]} <b className="num">{fmt(sug.kcal)} kcal</b>{' '}
                  <span className="muted">({directionLabel(sug.adjustPct)})</span><br />
                  Protein <b className="num">{sug.p} g</b> · Carbs <b className="num">{sug.c} g</b> · Fat <b className="num">{sug.f} g</b>
                  {sug.floored && <div className="sub" style={{ fontSize: 13, marginTop: 6 }}>Held at a safe minimum. We never suggest eating below your resting metabolic rate.</div>}
                  <button className="btn" style={{ marginTop: 10 }} onClick={() => {
                    saveTargets({ kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f })
                    setTargets({ ...targets, kcal: sug.kcal.toString(), p: sug.p.toString(), c: sug.c.toString(), f: sug.f.toString() })
                  }}>Use these targets</button>
                </>
              )}
            </div>
          ) : <div className="foot" style={{ padding: '10px 0 0' }}>Add age, height and weight to see suggested targets.</div>}
        </Disclosure>

        <Disclosure icon="target" color="var(--energy)" label="Targets" open={open === 'targets'} onToggle={() => toggle('targets')}>
          <div className="grid2">
            {field('Calories', <input type="number" value={targets.kcal} onChange={(e) => setTargets({ ...targets, kcal: e.target.value })} />)}
            {field('Range ±', <input type="number" value={targets.range} onChange={(e) => setTargets({ ...targets, range: e.target.value })} />)}
            {field('Protein (g)', <input type="number" value={targets.p} onChange={(e) => setTargets({ ...targets, p: e.target.value })} />)}
            {field('Carbs (g)', <input type="number" value={targets.c} onChange={(e) => setTargets({ ...targets, c: e.target.value })} />)}
            {field('Fat (g)', <input type="number" value={targets.f} onChange={(e) => setTargets({ ...targets, f: e.target.value })} />)}
          </div>
          <button className="btn" onClick={() => saveTargets({
            kcal: parseInt(targets.kcal) || data.target.kcal, p: parseInt(targets.p) || data.target.p,
            c: parseInt(targets.c) || data.target.c, f: parseInt(targets.f) || data.target.f,
          }, parseInt(targets.range))}>Save targets</button>
          <div className="foot" style={{ padding: '10px 0 0' }}>
            Your day is judged against a range, not a single number. Calories won't go below 1,200 here. Going lower is something to do with medical support.
          </div>
        </Disclosure>

        <Disclosure icon="pill" color="var(--supps)" label="Supplements" open={open === 'supplements'} onToggle={() => toggle('supplements')}>
          {(pr.supplements || []).map((s) => (
            <div className="li" key={s.id} style={{ padding: '8px 0' }}>
              <div className="m"><div className="t">{s.name}</div><div className="s num">{s.time}</div></div>
              <button className="navbtn" onClick={() => setSuppForm({ id: s.id, name: s.name, time: s.time })}>Edit</button>
              <button className="navbtn" style={{ color: 'var(--red)', marginLeft: 12 }} onClick={() => removeSupplement(s.id)}>Delete</button>
            </div>
          ))}
          {suppForm ? (
            <div style={{ paddingTop: 10 }}>
              {field('Name', <input value={suppForm.name} placeholder="Creatine 5 g" onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })} />)}
              {field('Time', <input type="time" value={suppForm.time} onChange={(e) => setSuppForm({ ...suppForm, time: e.target.value })} />)}
              <div className="grid2">
                <button className="btn" onClick={() => {
                  if (!suppForm.name || !suppForm.time) return
                  if (suppForm.id) updateSupplement(suppForm.id, suppForm.name, suppForm.time)
                  else addSupplement(suppForm.name, suppForm.time)
                  setSuppForm(null)
                }}>{suppForm.id ? 'Update' : 'Add'}</button>
                <button className="btn gray" onClick={() => setSuppForm(null)}>Cancel</button>
              </div>
            </div>
          ) : <button className="btn tinted" style={{ marginTop: 8 }} onClick={() => setSuppForm({ id: null, name: '', time: '08:00' })}>Add supplement</button>}
        </Disclosure>

        <Disclosure icon="bell" color="var(--red)" label="Notifications" open={open === 'notifications'} onToggle={() => toggle('notifications')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div><div>Supplement reminders</div><div className="sub" style={{ fontSize: 13 }}>{notifStatus}</div></div>
            <Toggle label="Supplement reminders" on={pr.notificationsEnabled} disabled={!notifReady} onChange={async () => {
              const ok = await setNotifications(!pr.notificationsEnabled)
              showToast(ok ? (pr.notificationsEnabled ? 'Reminders off' : 'Reminders on') : 'Permission denied')
            }} />
          </div>
          <div className="foot" style={{ padding: '10px 0 0' }}>iPhone needs iOS 16.4 or later, with Tali added to your Home Screen from Safari.</div>
        </Disclosure>
      </div>

      <div className="list icons">
        <Disclosure icon="key" color="var(--label2)" label="Account" open={open === 'account'} onToggle={() => toggle('account')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div><div className="sub" style={{ fontSize: 13 }}>Signed in as</div><div>{email || 'Local (no account)'}</div></div>
            <button className="btn sm gray" onClick={signOut}>Sign out</button>
          </div>
        </Disclosure>
        <Disclosure icon="cloud" color="var(--mind)" label="Data & backup" open={open === 'backup'} onToggle={() => toggle('backup')}>
          <div className="sub" style={{ marginBottom: 10 }}>Your log is stored on this device{authed ? ' and synced to your private database' : ''}. Export a copy now and then.</div>
          <div className="grid2">
            <button className="btn gray" onClick={() => exportBackup(data)}>Export</button>
            <button className="btn gray" onClick={() => fileRef.current?.click()}>Import</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try { importBackup(await readBackup(file)) } catch { showToast("That isn't a valid backup file") }
          }} />
        </Disclosure>
        <Disclosure icon="info" color="var(--label2)" label="About" open={open === 'about'} onToggle={() => toggle('about')}>
          <div className="prose sub">
            <p><b>Tali</b> is a personal health and fitness tracker. Your data is stored on this device and synced to a private database tied to your account. It's never shared or sold.</p>
            <p style={{ margin: 0 }}>General fitness information only, not medical advice. Talk to a GP before starting a new diet or exercise programme.</p>
          </div>
        </Disclosure>
      </div>

      {handsOpen && <HandsSheet onClose={() => setHandsOpen(false)} />}
    </div>
  )
}

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
function HandsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const types = Object.keys(HANDS) as HandPortion[]
  const [vals, setVals] = useState<Record<HandPortion, string>>(
    Object.fromEntries(types.map((k) => [k, String(handGrams(profile, k))])) as Record<HandPortion, string>,
  )
  const save = () => {
    const hands: Partial<Record<HandPortion, number>> = { ...profile.hands }
    for (const k of types) { const v = parseFloat(vals[k]); if (v > 0) hands[k] = Math.round(v) }
    setPrefs({ hands }); showToast('Hand portions saved'); onClose()
  }
  return (
    <Sheet title="Hand portions" onClose={onClose} right={<button className="navbtn b" onClick={save}>Save</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        Hands scale with the person, which is why they work. Weigh one of each once and enter it here. After that, "a palm" is a measurement, not a guess.
      </div>
      <div className="list">
        {types.map((k) => (
          <div className="frow" key={k}>
            <label htmlFor={'hand_' + k}>{HANDS[k].label}<div className="sub" style={{ fontSize: 13 }}>{HANDS[k].hint}</div></label>
            <input id={'hand_' + k} type="number" inputMode="numeric" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            <span className="u">g</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
