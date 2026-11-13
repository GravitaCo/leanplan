/**
 * Pick how much (src/screens/food/PortionView.tsx). It opens at last time's amount, asks the
 * cooking-fat question only for foods usually cooked in fat, and previews the ± margin. The entry
 * comes from the shared portionPreview (core's buildEntry), so one serving here equals one serving
 * on the web and the published figure.
 */
import { useState, type ReactNode } from 'react'
import { Linking, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { FatChoice, Food, HandPortion, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { amountText, headline } from '@/core/domain/nutrition'
import { sourceOf } from '@/core/data/sources'
import { CAPTURE_LABEL, FAT_OPTIONS, HANDS, frac, handGrams, type Portion } from '@/core/domain/estimate'
import { MEAL_LABEL } from '@/core/domain/insights'
import { SERV_STEPS, gramsMax, portionModes, portionPreview, portionStart } from '@/screens/food/foodModel'
import { PORTION } from '@/copy/food'
import { Big, Btn, Card, Chip, Chips } from '../../lib/ui/kit'
import { BackButton, NavBtn, Seg, Sheet } from '../../lib/ui/primitives'
import { Scale, Slider, Stepper } from '../../lib/ui/controls'
import { Input } from '../../lib/ui/fields'
import { Foot, Lbl, Sub, TextLink } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { MealSeg } from './common'

type Mode = Portion['mode']

export function PortionView({ food, custom, meal, setMeal, onBack, onClose, animate, extra }: {
  food: Food; custom: boolean; meal: MealSlot; setMeal: (m: MealSlot) => void
  onBack?: () => void; onClose: () => void; animate: boolean
  /** under the Add button: the Scanning stream's "Share this product" row (sp-7) */
  extra?: ReactNode
}) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const logEntries = useStore((s) => s.logEntries)
  const profile = data.profile
  const gentle = kcalHidden(data)

  // where it opens: last time's amount, in the way it was given (shared with the web)
  const [start] = useState(() => portionStart(data, food))
  const { unit: u, each, learned } = start
  const [mode, setMode] = useState<Mode>(start.mode)
  const [serv, setServ] = useState(start.serv)
  const [grams, setGrams] = useState<number>(start.grams)
  // what's typed in the grams box, so "1." or an empty box can be on the way to a number
  const [gText, setGText] = useState<string | null>(null)
  const [hand, setHand] = useState<{ type: HandPortion; count: number }>(start.hand)
  const [fat, setFat] = useState<FatChoice | null>(start.fat)
  const source = sourceOf(food)
  const head = headline(food)

  const portion: Portion =
    mode === 'serv' ? { mode, serv } : mode === 'hand' ? { mode, type: hand.type, count: hand.count } : { mode, grams, learned }
  const { entry, fatEntry, askFat, kcal, margin, toLog } = portionPreview(food, portion, meal, profile, custom, fat)
  const commit = () => {
    if (!toLog) return
    logEntries(toLog, PORTION.added(food.n))
    onClose()
  }
  const setG = (g: number) => { setGrams(g); setGText(null) }
  const maxG = gramsMax(food)
  // per-item foods are counted only, so they have no mode to choose
  const modes = portionModes(food)
  const macros = `${r1(entry.p + (fatEntry?.p ?? 0))} g protein · ${r1(entry.c)} g carbs · ${r1(entry.f + (fatEntry?.f ?? 0))} g fat`

  return (
    <Sheet title={food.n} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title={PORTION.add} onPress={commit} disabled={!entry.grams} />}>
      <View style={{ marginTop: -4, marginBottom: 12, alignItems: 'center' }}>
        <Sub style={[num, { textAlign: 'center' }]}>
          {gentle ? `${r1(head.p)} g protein` : `${Math.round(head.k)} kcal · ${r1(head.p)} P · ${r1(head.c)} C · ${r1(head.f)} F`} {head.per}
        </Sub>
        <Text style={[tx(13), { color: t.label2, marginTop: 2, textAlign: 'center' }]}>
          {source
            ? <>{PORTION.source} {source.url ? <TextLink onPress={() => void Linking.openURL(source.url!)}>{source.text}</TextLink> : source.text}</>
            : PORTION.sourceUnchecked}
        </Text>
      </View>
      <MealSeg value={meal} onChange={setMeal} />

      <Lbl>{PORTION.howMuch}</Lbl>
      {modes && <Seg<Mode> options={modes} value={mode} onChange={setMode} />}
      <View style={{ marginTop: 14 }}>
        {mode === 'serv' && (
          <>
            <Scale items={SERV_STEPS.map((v) => ({
              key: v, big: frac(v),
              text: each ? (gentle ? `${r1(food.p * v)} g protein` : `${Math.round(food.k * v)} kcal`) : `${r1(food.g * v)} ${u}`,
            }))} value={serv} onPick={setServ} />
            {/, raw\b/i.test(food.n) && <Foot>{PORTION.weighRaw}</Foot>}
            <Foot>{each ? PORTION.perItem(source?.text.split(',')[0] ?? PORTION.theMaker) : PORTION.oneServing(amountText(food.g, u))}</Foot>
          </>
        )}
        {mode === 'hand' && (
          <>
            <Chips>
              {(Object.keys(HANDS) as HandPortion[]).map((k) => (
                <Chip key={k} title={HANDS[k].label} sub={HANDS[k].hint} on={hand.type === k} onPress={() => setHand({ ...hand, type: k })} />
              ))}
            </Chips>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <Text style={[tx(17), { color: t.label }]}>{PORTION.howMany}</Text>
              <Stepper value={frac(hand.count)} decLabel={PORTION.fewer} incLabel={PORTION.more}
                onDec={() => setHand({ ...hand, count: Math.max(0.5, hand.count - 0.5) })}
                onInc={() => setHand({ ...hand, count: Math.min(6, hand.count + 0.5) })} />
            </View>
            <Foot>{PORTION.handIs(HANDS[hand.type].label, handGrams(profile, hand.type), u)}</Foot>
          </>
        )}
        {mode === 'g' && (
          <>
            {/* `.gram`: the 40 pt amount and its unit, centred */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 6, marginBottom: 4 }}>
              <Input label={PORTION.amountIn(u)} keyboardType="decimal-pad"
                value={gText ?? (grams ? String(Math.round(grams * 100) / 100) : '')}
                onChangeText={(v) => { setGText(v); setGrams(parseFloat(v) || 0) }} onBlur={() => setGText(null)}
                style={[tx(40, 600, 1.1, 0), num, { width: 112, textAlign: 'right', backgroundColor: 'transparent', padding: 0 }]} />
              <Text style={[tx(20, 600), { color: t.label2 }]}>{u}</Text>
            </View>
            <Slider min={0} max={maxG} step={maxG > 400 ? 5 : 1} value={Math.min(maxG, grams)} onChange={setG} label={PORTION.amountSlider} />
            {learned != null && (
              <Foot style={{ textAlign: 'center' }}>
                {PORTION.yourUsual(amountText(learned, u))}{' '}
                <TextLink onPress={() => setG(learned)}>{PORTION.useIt}</TextLink>
              </Foot>
            )}
          </>
        )}
      </View>

      {askFat && (
        <>
          <Lbl>{PORTION.howCooked}</Lbl>
          <Chips>{FAT_OPTIONS.map((o) => <Chip key={o.id} title={o.label} on={fat === o.id} onPress={() => setFat(o.id)} />)}</Chips>
          <Foot>{fat ? PORTION.fatAdded : PORTION.fatSkipped}</Foot>
        </>
      )}

      <Card plain style={{ marginTop: 14, marginBottom: 10 }}>
        {!gentle && <Big value={fmt(kcal)} unit="kcal" pm={`± ${margin}`} />}
        {gentle
          ? <Text style={[tx(22, 600, 1.1, 0), num, { color: t.label }]}>{macros}</Text>
          : <Sub style={[num, { marginTop: 4 }]}>{macros}</Sub>}
        <Text style={[tx(13), { color: t.label2, marginTop: 4 }]}>
          {CAPTURE_LABEL[entry.how!]}{fatEntry ? ` + ${fatEntry.n.replace(' · cooking', '').toLowerCase()}${gentle ? '' : ` (${fatEntry.k} kcal)`}` : ''}
        </Text>
      </Card>
      <Btn title={PORTION.addTo(MEAL_LABEL[meal])} onPress={commit} disabled={!entry.grams} />
      {extra}
    </Sheet>
  )
}
