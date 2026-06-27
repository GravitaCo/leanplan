import { useRef, useState } from 'react'
import { useStore } from '@/store/store'
import type { ActivityLevel, Sex } from '@/core/types'
import { ACTIVITY } from '@/core/data/constants'
import { suggestedTargets } from '@/core/domain/nutrition'
import { pushSupported } from '@/data/push'
import { exportBackup, readBackup } from '@/data/backup'
import { Accordion, Toggle } from '@/ui/primitives'

function latestWeight(days: Record<string, { weight: number | null }>, profileWeight?: number | null) {
  for (const d of Object.keys(days).sort().reverse()) if (days[d]?.weight) return days[d].weight
  return profileWeight ?? null
}

export function ProfileScreen() {
  const data = useStore((s) => s.data)
  const email = useStore((s) => s.email)
  const signOut = useStore((s) => s.signOut)
  const saveProfileMetrics = useStore((s) => s.saveProfileMetrics)
  const saveTargets = useStore((s) => s.saveTargets)
  const addSupplement = useStore((s) => s.addSupplement)
  const updateSupplement = useStore((s) => s.updateSupplement)
  const removeSupplement = useStore((s) => s.removeSupplement)
  const updateEmail = useStore((s) => s.updateEmail)
  const setNotifications = useStore((s) => s.setNotifications)
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)

  const pr = data.profile
  const weight = latestWeight(data.days, pr.weight)

  // local form state
  const [name, setName] = useState(pr.name || '')
  const [emailField, setEmailField] = useState(email || '')
  const [metrics, setMetrics] = useState({
    sex: pr.sex,
    age: pr.age?.toString() || '',
    height: pr.height?.toString() || '',
    weight: weight?.toString() || '',
    activityLevel: pr.activityLevel,
  })
  const [targets, setTargets] = useState({
    kcal: data.target.kcal.toString(),
    p: data.target.p.toString(),
    c: data.target.c.toString(),
    f: data.target.f.toString(),
  })
  const [suppForm, setSuppForm] = useState<{ id: string | null; name: string; time: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sug = suggestedTargets(
    { ...pr, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null },
    parseFloat(metrics.weight) || null,
  )

  const notifReady = pushSupported()
  const notifStatus = !notifReady
    ? 'Not supported in this browser'
    : Notification.permission === 'denied'
      ? 'Blocked — enable in your phone settings'
      : pr.notificationsEnabled
        ? 'Enabled'
        : 'Disabled'

  return (
    <div className="screen">
      <div className="page-hdr">
        <h1 className="page-title">Profile</h1>
      </div>

      <div style={{ marginTop: 6 }}>
        <Accordion title="Profile" defaultOpen>
          <div className="field">
            <label>Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" value={emailField} onChange={(e) => setEmailField(e.target.value.trim())} />
          </div>
          <button
            className="btn"
            onClick={async () => {
              saveProfileMetrics({ name })
              if (emailField && emailField !== email) {
                const err = await updateEmail(emailField)
                showToast(err ? 'Email error: ' + err : 'Check your email to confirm')
              }
            }}
          >
            Save profile
          </button>
        </Accordion>

        <Accordion title="My metrics" defaultOpen>
          <div className="grid2">
            <div className="field">
              <label>Sex</label>
              <select value={metrics.sex} onChange={(e) => setMetrics({ ...metrics, sex: e.target.value as Sex })}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" value={metrics.age} onChange={(e) => setMetrics({ ...metrics, age: e.target.value })} placeholder="e.g. 35" />
            </div>
            <div className="field">
              <label>Height (cm)</label>
              <input type="number" value={metrics.height} onChange={(e) => setMetrics({ ...metrics, height: e.target.value })} placeholder="e.g. 178" />
            </div>
            <div className="field">
              <label>Weight (kg)</label>
              <input type="number" step="0.1" value={metrics.weight} onChange={(e) => setMetrics({ ...metrics, weight: e.target.value })} placeholder="e.g. 82.5" />
            </div>
          </div>
          <div className="field">
            <label>Activity level</label>
            <select
              value={metrics.activityLevel}
              onChange={(e) => setMetrics({ ...metrics, activityLevel: e.target.value as ActivityLevel })}
            >
              {Object.entries(ACTIVITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn ghost"
            onClick={() =>
              saveProfileMetrics({
                sex: metrics.sex,
                age: parseInt(metrics.age) || null,
                height: parseInt(metrics.height) || null,
                weight: parseFloat(metrics.weight) || null,
                activityLevel: metrics.activityLevel,
              })
            }
          >
            Save metrics
          </button>
          {sug ? (
            <div
              style={{ background: 'var(--card-2)', borderRadius: 12, padding: '12px 14px', marginTop: 12, fontSize: 13, lineHeight: 1.5 }}
            >
              <b>Suggested targets</b> (Mifflin–St Jeor, {metrics.weight}kg)
              <br />
              Maintenance: <b>{sug.maint} kcal</b> · Fat-loss: <b>{sug.kcal} kcal</b>
              <br />
              Protein <b>{sug.p}g</b> · Carbs <b>{sug.c}g</b> · Fat <b>{sug.f}g</b>
              <button
                className="btn"
                style={{ marginTop: 10 }}
                onClick={() => {
                  saveTargets({ kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f })
                  setTargets({ kcal: sug.kcal.toString(), p: sug.p.toString(), c: sug.c.toString(), f: sug.f.toString() })
                }}
              >
                Apply to targets
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              Fill in age, height and weight to see suggested targets.
            </div>
          )}
        </Accordion>

        <Accordion title="Calorie & macro targets">
          <div className="grid2">
            <div className="field">
              <label>Calories</label>
              <input type="number" value={targets.kcal} onChange={(e) => setTargets({ ...targets, kcal: e.target.value })} />
            </div>
            <div className="field">
              <label>Protein (g)</label>
              <input type="number" value={targets.p} onChange={(e) => setTargets({ ...targets, p: e.target.value })} />
            </div>
            <div className="field">
              <label>Carbs (g)</label>
              <input type="number" value={targets.c} onChange={(e) => setTargets({ ...targets, c: e.target.value })} />
            </div>
            <div className="field">
              <label>Fat (g)</label>
              <input type="number" value={targets.f} onChange={(e) => setTargets({ ...targets, f: e.target.value })} />
            </div>
          </div>
          <button
            className="btn"
            onClick={() =>
              saveTargets({
                kcal: parseInt(targets.kcal) || data.target.kcal,
                p: parseInt(targets.p) || data.target.p,
                c: parseInt(targets.c) || data.target.c,
                f: parseInt(targets.f) || data.target.f,
              })
            }
          >
            Save targets
          </button>
        </Accordion>

        <Accordion title="Supplements">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Add each supplement with a time. Notifications send a reminder at that time daily.
          </div>
          {(pr.supplements || []).map((s) => (
            <div className="row" key={s.id}>
              <div className="grow">
                <div className="name">{s.name}</div>
                <div className="meta">{s.time}</div>
              </div>
              <button className="pill" onClick={() => setSuppForm({ id: s.id, name: s.name, time: s.time })}>
                Edit
              </button>
              <button className="x-btn" onClick={() => removeSupplement(s.id)}>
                ×
              </button>
            </div>
          ))}
          {suppForm ? (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 8 }}>
              <div className="field">
                <label>Name</label>
                <input value={suppForm.name} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })} placeholder="e.g. Creatine 5g" />
              </div>
              <div className="field">
                <label>Time</label>
                <input type="time" value={suppForm.time} onChange={(e) => setSuppForm({ ...suppForm, time: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (!suppForm.name || !suppForm.time) return
                    if (suppForm.id) updateSupplement(suppForm.id, suppForm.name, suppForm.time)
                    else addSupplement(suppForm.name, suppForm.time)
                    setSuppForm(null)
                  }}
                >
                  {suppForm.id ? 'Update' : 'Add'}
                </button>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setSuppForm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setSuppForm({ id: null, name: '', time: '08:00' })}>
              + Add supplement
            </button>
          )}
        </Accordion>

        <Accordion title="Notifications">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Supplement reminders</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{notifStatus}</div>
            </div>
            <Toggle
              on={pr.notificationsEnabled}
              onChange={async () => {
                if (!notifReady) return
                const ok = await setNotifications(!pr.notificationsEnabled)
                showToast(ok ? (pr.notificationsEnabled ? 'Notifications off' : 'Notifications on') : 'Permission denied')
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            iPhone: requires iOS 16.4+ with Tali added to your Home Screen via Safari.
          </div>
        </Accordion>

        <Accordion title="Account">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="mono">Signed in as</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{email || 'Local (no account)'}</div>
            </div>
            <button className="btn ghost sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </Accordion>

        <Accordion title="Data & backup">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Your log is stored on this device and synced to your private cloud database. Export a backup as a safety copy.
          </div>
          <button className="btn ghost" style={{ marginBottom: 8 }} onClick={() => exportBackup(data)}>
            Export backup file
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import backup file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                importBackup(await readBackup(file))
              } catch {
                showToast("That isn't a valid backup file")
              }
            }}
          />
        </Accordion>

        <Accordion title="About">
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
            <p style={{ marginTop: 0 }}>
              <b style={{ color: 'var(--ink)' }}>Tali</b> — personal health &amp; fitness tracker.
            </p>
            <p>
              <b style={{ color: 'var(--ink)' }}>Data:</b> stored on this device and synced to a private database tied to
              your account only. Never shared or sold.
            </p>
            <p style={{ marginBottom: 0 }}>
              General fitness information only — not medical advice. Consult a GP before starting a new diet or exercise
              programme.
            </p>
          </div>
        </Accordion>
      </div>
    </div>
  )
}
