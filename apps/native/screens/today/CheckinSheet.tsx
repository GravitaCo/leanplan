/**
 * The check-in sheet, ported from src/screens/today/CheckinSheet.tsx and CheckinSleep.tsx: mood,
 * sleep (with "More about sleep" when WELLBEING_ENABLED: a rough band and a wake time), stress,
 * energy, soreness on lifting days, hunger and a note. The decisions (what a night saves, the wake
 * prefill) and the words are the web's own exports; only the controls are native.
 */
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import { nowIso } from '@/data/supabase'
import { sleepMoreOpen } from '@/data/deviceOnly'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import type { SleepBand } from '@/core/types'
import { ENERGY, HUNGER, MOODS, SLEEP, SORE, STRESS } from '@/core/domain/insights'
import { isHardKey, plannedKeys } from '@/core/domain/plans'
import { isBuiltinLift, workoutsOf } from '@/core/domain/sessions'
import { SLEEP_BANDS, isHHMM } from '@/core/domain/checkin'
import { bandLabel } from '@/core/domain/sleep'
import { CHECKIN_SLEEP, nightPatch, nightShown, wakePrefill } from '@/screens/today/checkinNight'
import { font, num, useTokens } from '../../lib/theme'
import { normTime } from './wakeTime'
import { Chevron, Foot, Lbl, List, NavBtn, Scale, Sheet } from './ui'

export function CheckinSheet({ onClose, onSupport }: { onClose: () => void; onSupport: () => void }) {
  const t = useTokens()
  const existing = useStore((s) => s.data.days[s.cur]?.checkin)
  const liftDay = useStore((s) => {
    const logged = workoutsOf(s.data.days[s.cur], s.cur).some(isBuiltinLift)
    return logged || plannedKeys(s.data, s.cur).some((k) => isHardKey(k, s.data.routines))
  })
  const setCheckin = useStore((s) => s.setCheckin)
  const [mood, setMood] = useState(existing?.mood ?? 0)
  const [hunger, setHunger] = useState(existing?.hunger ?? 0)
  const [sleep, setSleep] = useState(existing?.sleep ?? 0)
  const [stress, setStress] = useState(existing?.stress ?? 0)
  const [energy, setEnergy] = useState(existing?.energy ?? 0)
  const [sore, setSore] = useState(existing?.sore ?? 0)
  const [note, setNote] = useState(existing?.note ?? '')
  const setSleepMore = useStore((s) => s.setSleepMore)
  const prefill = useStore((s) => (WELLBEING_ENABLED ? wakePrefill(s.data.days, s.cur) : ''))
  const shown = nightShown(existing)
  const [more, setMore] = useState(() => WELLBEING_ENABLED && sleepMoreOpen(useStore.getState().data))
  const [band, setBand] = useState<SleepBand | ''>(shown.band)
  const [wakeAt, setWakeAt] = useState(() => shown.wakeAt || (more ? prefill : ''))
  const [filled, setFilled] = useState(more)
  const [touched, setTouched] = useState(false)
  const toggleMore = () => {
    const open = !more
    setMore(open)
    setSleepMore(open)
    if (open && !filled) { setFilled(true); if (!wakeAt && !touched) setWakeAt(prefill) }
  }
  const save = () => {
    const at = nowIso()
    // a typed time is read as the web's time field would hold it ("730" is 07:30) even if the field
    // never lost focus, so a saved wake time is never dropped by mistake (mental-performance)
    const wake = isHHMM(wakeAt) ? wakeAt : normTime(wakeAt)
    const night = WELLBEING_ENABLED ? nightPatch(existing, { band, wakeAt: wake, touched }, at) : {}
    setCheckin({ mood, hunger, sleep, stress, energy, sore: liftDay ? sore : existing?.sore ?? 0, note: note.trim(), t: at, ...night })
    onClose()
  }
  const f = CHECKIN_SLEEP.noteFoot
  return (
    <Sheet title="Check-in" onClose={onClose} right={<NavBtn title="Done" bold onPress={save} />}>
      <Lbl>How are you feeling?</Lbl>
      <Scale labels={MOODS} value={mood} onChange={setMood} />
      <Lbl>Sleep last night</Lbl>
      <Scale labels={SLEEP} value={sleep} onChange={setSleep} />
      {WELLBEING_ENABLED && (
        <>
          {/* .ck-more: a quiet row with a chevron that turns when open */}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={toggleMore}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 4, marginTop: 4 }}>
            <Text style={[font(400), { fontSize: 15, color: t.tint, flex: 1 }]}>{CHECKIN_SLEEP.more}</Text>
            <Chevron rotate={more ? 90 : 0} />
          </Pressable>
          {more && (
            <View>
              <Lbl style={{ paddingTop: 0 }}>{CHECKIN_SLEEP.howLong}</Lbl>
              {/* B10: a picked band is the neutral range grey with a 2 px ring */}
              <Scale labels={SLEEP_BANDS} value={band ? SLEEP_BANDS.indexOf(band) + 1 : 0}
                onChange={(v) => { setBand(v ? SLEEP_BANDS[v - 1] : ''); setTouched(true) }}
                onStyle={{ backgroundColor: t.band, borderWidth: 2, borderColor: t.label }}
                renderLabel={(b, on) => (
                  <Text style={[font(on ? 600 : 400), { fontSize: 13, lineHeight: 16, textAlign: 'center', color: t.label }]}>
                    <Text style={[font(700), num, { fontSize: 14 }]}>{bandLabel(b as SleepBand)}</Text>{'\n'}{CHECKIN_SLEEP.hours}
                  </Text>
                )} />
              <List bg={t.elev} style={{ marginTop: 10 }}>
                {/* .frow: the label and a 24-hour time field (the web's <input type="time">) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 16, gap: 12 }}>
                  <Text style={[font(400), { fontSize: 17, color: t.label, flex: 1 }]} numberOfLines={1}>{CHECKIN_SLEEP.woke}</Text>
                  <TextInput accessibilityLabel={CHECKIN_SLEEP.woke} value={wakeAt} placeholder="--:--" placeholderTextColor={t.label3}
                    keyboardType="numbers-and-punctuation" maxLength={5}
                    onChangeText={(v) => { setWakeAt(v); setTouched(true) }}
                    onBlur={() => { if (wakeAt && !isHHMM(wakeAt)) setWakeAt(normTime(wakeAt)) }}
                    style={[font(400), num, { fontSize: 17, color: t.label, minWidth: 64, textAlign: 'right', paddingVertical: 10 }]} />
                </View>
              </List>
              <Foot>{CHECKIN_SLEEP.foot}</Foot>
            </View>
          )}
        </>
      )}
      <Lbl>Stress</Lbl>
      <Scale labels={STRESS} value={stress} onChange={setStress} />
      <Lbl>Energy</Lbl>
      <Scale labels={ENERGY} value={energy} onChange={setEnergy} />
      {liftDay && <><Lbl>Soreness</Lbl><Scale labels={SORE} value={sore} onChange={setSore} /></>}
      <Lbl>Hunger right now</Lbl>
      <Scale labels={HUNGER} value={hunger} onChange={setHunger} />
      <Lbl>Note</Lbl>
      <TextInput multiline numberOfLines={3} value={note} placeholder="Anything worth remembering? Optional." placeholderTextColor={t.label3} onChangeText={setNote}
        style={[font(400), { fontSize: 17, color: t.label, backgroundColor: t.elev, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, minHeight: 84, textAlignVertical: 'top' }]} />
      {WELLBEING_ENABLED
        ? (
          <>
            <Foot>{f.before}<Text accessibilityRole="link" onPress={onSupport} style={{ color: t.tint }}>{f.link}</Text>{f.after}</Foot>
            <Foot>{CHECKIN_SLEEP.sheetFoot}</Foot>
          </>
        )
        : <Foot>Skip anything you like. There's no right answer. Sleep and stress often show up in hunger and energy, so these
        help you spot patterns. On a tough day, Tilo can offer a lighter option for training.</Foot>}
    </Sheet>
  )
}
