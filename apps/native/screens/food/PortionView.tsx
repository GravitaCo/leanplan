/**
 * Pick how much (src/screens/food/PortionView.tsx). Defaults to what the user had last time
 * (learned portion), asks the cooking-fat question only for foods usually cooked in fat, and
 * previews the ± margin. The entry is built by core's `buildEntry`, so one serving here equals
 * one serving on the web and the published figure.
 */
import { useState } from 'react'
import { Linking, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { FatChoice, Food, HandPortion, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { amountText, headline, roundAmount, unitOf } from '@/core/domain/nutrition'
import { sourceOf } from '@/core/data/sources'
import {
  CAPTURE_LABEL, FAT_OPTIONS, HANDS, handsAllowed, accuracyOf, buildEntry, combinedMargin, frac, handFor, handGrams, isCookable, type Portion,
} from '@/core/domain/estimate'
import { MEAL_LABEL, entryAmount, lastFatFor, lastUse } from '@/core/domain/insights'
import { font, num, useTokens } from '../../lib/theme'
import { BackButton, Big, Button, Card, Chip, Chips, Foot, Lbl, NavBtn, Scale, Seg, Sheet, Slider, Stepper, Sub, Txt } from './ui'
import { MealSeg } from './common'

type Mode = Portion['mode']
const SERV_STEPS = [0.5, 1, 1.5, 2, 3]

export function PortionView({ food, custom, meal, setMeal, onBack, onClose, animate, extra }: {
  food: Food; custom: boolean; meal: MealSlot; setMeal: (m: MealSlot) => void
  onBack?: () => void; onClose: () => void; animate: boolean
  /** below the Add button: the Scanning stream's "Share this product" row (sp-7) */
  extra?: React.ReactNode
}) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const logEntries = useStore((s) => s.logEntries)
  const profile = data.profile
  const gentle = kcalHidden(data)
  const u = unitOf(food)

  const last = lastUse(data, food.n)
  // what the last entry meant in today's data (a live-era 120 g roll is today's 119.5 g serving)
  const learned = last ? entryAmount(last, food) : null
  const each = u === 'item'
  // per-item foods are counted, never weighed or hand-sized; a food last logged as servings
  // opens in servings, at the same count
  const lastServ = last?.serv != null && (last.how === 'serv' || last.how === 'usual') && learned === roundAmount(food.g * last.serv, u) && SERV_STEPS.includes(last.serv) ? last.serv : null
  const [mode, setMode] = useState<Mode>(each || lastServ != null ? 'serv' : last ? (last.how === 'hand' && handsAllowed(food) ? 'hand' : 'g') : profile.accuracy === 'precise' ? 'g' : 'serv')
  const source = sourceOf(food)
  const head = headline(food)
  const [serv, setServ] = useState(lastServ ?? 1)
  const [grams, setGrams] = useState<number>(learned ?? food.g)
  // the typed text, so "1." or an empty field can be on the way to a number
  const [gText, setGText] = useState<string | null>(null)
  const [hand, setHand] = useState<{ type: HandPortion; count: number }>(last?.hand ? { ...last.hand } : { type: handFor(food), count: 1 })
  // remembered per food: last time's answer for this food, never another food's
  const [fat, setFat] = useState<FatChoice | null>(() => lastFatFor(data, food.n))

  const portion: Portion =
    mode === 'serv' ? { mode, serv } : mode === 'hand' ? { mode, type: hand.type, count: hand.count } : { mode, grams, learned }
  const sized = buildEntry(food, portion, meal, profile, { custom, fat: null, askFat: false }).entry.grams
  const askFat = accuracyOf(profile).askFat && isCookable(food, sized)
  const { entry, fat: fatEntry } = buildEntry(food, portion, meal, profile, { custom, fat, askFat })
  const kcal = entry.k + (fatEntry?.k ?? 0)

  const commit = () => {
    if (!entry.grams) return
    logEntries(fatEntry ? [entry, fatEntry] : [entry], `${food.n} added`)
    onClose()
  }
  const setG = (g: number) => { setGrams(g); setGText(null) }

  const maxG = Math.max(50, Math.round(food.g * 4))
  return (
    <Sheet title={food.n} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title="Add" onPress={commit} disabled={!entry.grams} />}>
      <View style={{ alignItems: 'center', marginTop: -4, marginBottom: 12 }}>
        <Sub n style={{ textAlign: 'center' }}>
          {gentle ? `${r1(head.p)} g protein` : `${Math.round(head.k)} kcal · ${r1(head.p)} P · ${r1(head.c)} C · ${r1(head.f)} F`} {head.per}
        </Sub>
        <Sub style={{ fontSize: 13, letterSpacing: -0.13, marginTop: 2, textAlign: 'center' }}>
          {source ? <>Source: {source.url
            ? <Txt size={13} color={t.label2} style={{ textDecorationLine: 'underline' }} onPress={() => void Linking.openURL(source.url!)}>{source.text}</Txt>
            : source.text}</> : 'Source not yet checked'}
        </Sub>
      </View>
      <MealSeg value={meal} onChange={setMeal} />

      <Lbl>How much?</Lbl>
      {!each && <Seg<Mode> options={u === 'ml' ? [['serv', 'Servings'], ['g', 'Millilitres']] : handsAllowed(food) ? [['serv', 'Servings'], ['g', 'Grams'], ['hand', 'Hands']] : [['serv', 'Servings'], ['g', 'Grams']]}
        value={mode} onChange={setMode} />}
      <View style={{ marginTop: 14 }}>
        {mode === 'serv' && (
          <>
            <Scale items={SERV_STEPS.map((v) => ({
              key: v, big: frac(v), on: serv === v, onPress: () => setServ(v),
              small: each ? (gentle ? `${r1(food.p * v)} g protein` : `${Math.round(food.k * v)} kcal`) : `${r1(food.g * v)} ${u}`,
            }))} />
            {/, raw\b/i.test(food.n) && <Foot>Weigh it before cooking: raw weight, not cooked.</Foot>}
            <Foot>{each ? `Values are for one item, as ${source?.text.split(',')[0] ?? 'the maker'} publishes them.` : `One serving is ${amountText(food.g, u)}.`}</Foot>
          </>
        )}
        {mode === 'hand' && (
          <>
            <Chips>
              {(Object.keys(HANDS) as HandPortion[]).map((k) => (
                <Chip key={k} on={hand.type === k} onPress={() => setHand({ ...hand, type: k })} label={HANDS[k].label} hint={HANDS[k].hint} />
              ))}
            </Chips>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <Txt>How many?</Txt>
              <Stepper value={frac(hand.count)}
                onLess={() => setHand({ ...hand, count: Math.max(0.5, hand.count - 0.5) })}
                onMore={() => setHand({ ...hand, count: Math.min(6, hand.count + 0.5) })} />
            </View>
            <Foot>For you, one {HANDS[hand.type].label.toLowerCase()} ≈ {handGrams(profile, hand.type)} {u}. Calibrate in Profile.</Foot>
          </>
        )}
        {mode === 'g' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 6, marginBottom: 4 }}>
              <TextInput accessibilityLabel={`Amount in ${u}`} keyboardType="decimal-pad" selectTextOnFocus
                value={gText ?? (grams ? String(Math.round(grams * 100) / 100) : '')}
                onChangeText={(v) => { setGText(v); setGrams(parseFloat(v.replace(',', '.')) || 0) }}
                onBlur={() => setGText(null)}
                style={[font(600), num, { fontSize: 40, minWidth: 112, textAlign: 'right', color: t.label, padding: 0 }]} />
              <Txt size={20} w={600} color={t.label2}>{u}</Txt>
            </View>
            <Slider min={0} max={maxG} step={maxG > 400 ? 5 : 1} value={Math.min(maxG, grams)} onChange={setG} label="Amount slider" />
            {learned != null && (
              <Foot style={{ textAlign: 'center' }}>
                Your usual is {amountText(learned, u)}.{' '}
                <Txt size={13} color={t.tint} onPress={() => setG(learned)} accessibilityRole="button">Use it</Txt>
              </Foot>
            )}
          </>
        )}
      </View>

      {askFat && (
        <>
          <Lbl>How was it cooked?</Lbl>
          <Chips>
            {FAT_OPTIONS.map((o) => <Chip key={o.id} on={fat === o.id} onPress={() => setFat(o.id)} label={o.label} />)}
          </Chips>
          <Foot>
            {fat ? "Cooking fat is the part food logs miss most, so it's added separately and you can change it."
              : "Cooking fat is the part food logs miss most. Skip it and nothing is added, we just widen the margin."}
          </Foot>
        </>
      )}

      <Card style={{ marginTop: 14 }}>
        {!gentle && <Big value={fmt(kcal)} unit="kcal" pm={`± ${combinedMargin(entry, fatEntry)}`} />}
        {gentle
          ? <Txt size={22} w={600} n style={{ lineHeight: 26 }}>{r1(entry.p + (fatEntry?.p ?? 0))} g protein · {r1(entry.c)} g carbs · {r1(entry.f + (fatEntry?.f ?? 0))} g fat</Txt>
          : <Sub n style={{ marginTop: 4 }}>{r1(entry.p + (fatEntry?.p ?? 0))} g protein · {r1(entry.c)} g carbs · {r1(entry.f + (fatEntry?.f ?? 0))} g fat</Sub>}
        <Sub style={{ fontSize: 13, letterSpacing: -0.13, marginTop: 4 }}>
          {CAPTURE_LABEL[entry.how!]}{fatEntry ? ` + ${fatEntry.n.replace(' · cooking', '').toLowerCase()}${gentle ? '' : ` (${fatEntry.k} kcal)`}` : ''}
        </Sub>
      </Card>
      <Button title={`Add to ${MEAL_LABEL[meal]}`} onPress={commit} disabled={!entry.grams} />
      {extra}
    </Sheet>
  )
}
