import { useState } from 'react'
import { useStore } from '@/store/store'
import type { FatChoice, Food, HandPortion, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { unitOf } from '@/core/domain/nutrition'
import {
  CAPTURE_LABEL, FAT_OPTIONS, HANDS, accuracyOf, buildEntry, combinedMargin, frac, handFor, handGrams, isCookable, type Portion,
} from '@/core/domain/estimate'
import { MEAL_LABEL, lastUse } from '@/core/domain/insights'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'

type Mode = Portion['mode']

/**
 * Pick how much. Defaults to what the user had last time (learned portion), asks the
 * cooking-fat question only for foods usually cooked in fat, and previews the ± margin.
 */
export function PortionView({ food, custom, meal, setMeal, onBack, onClose, animate }: {
  food: Food; custom: boolean; meal: MealSlot; setMeal: (m: MealSlot) => void
  onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const data = useStore((s) => s.data)
  const logEntries = useStore((s) => s.logEntries)
  const setPrefs = useStore((s) => s.setPrefs)
  const profile = data.profile
  const u = unitOf(food)

  const last = lastUse(data, food.n)
  const learned = last ? last.grams : null
  const [mode, setMode] = useState<Mode>(last ? (last.how === 'hand' ? 'hand' : 'g') : profile.accuracy === 'precise' ? 'g' : 'serv')
  const [serv, setServ] = useState(1)
  const [grams, setGrams] = useState<number>(learned ?? food.g)
  const [hand, setHand] = useState<{ type: HandPortion; count: number }>(last?.hand ? { ...last.hand } : { type: handFor(food), count: 1 })
  const askFat = accuracyOf(profile).askFat && isCookable(food)
  const [fat, setFat] = useState<FatChoice | null>(profile.lastFat ?? null)

  const portion: Portion =
    mode === 'serv' ? { mode, serv } : mode === 'hand' ? { mode, type: hand.type, count: hand.count } : { mode, grams, learned }
  const { entry, fat: fatEntry } = buildEntry(food, portion, meal, profile, { custom, fat, askFat })
  const kcal = entry.k + (fatEntry?.k ?? 0)

  const commit = () => {
    if (!entry.grams) return
    logEntries(fatEntry ? [entry, fatEntry] : [entry], `${food.n} added`)
    if (askFat && fat && fat !== profile.lastFat) setPrefs({ lastFat: fat })
    onClose()
  }

  const maxG = Math.max(50, Math.round(food.g * 4))
  return (
    <Sheet title={food.n} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit} disabled={!entry.grams}>Add</button>}>
      <div className="sub num" style={{ textAlign: 'center', margin: '-4px 0 12px' }}>
        {food.k} kcal · {food.p} P · {food.c} C · {food.f} F per 100 {u}{custom ? ' · your food' : ''}
      </div>
      <MealSeg value={meal} onChange={setMeal} />

      <div className="lbl">How much?</div>
      <Seg<Mode> options={[['serv', 'Servings'], ['g', u === 'ml' ? 'Millilitres' : 'Grams'], ['hand', 'Hands']]} value={mode} onChange={setMode} />
      <div style={{ marginTop: 14 }}>
        {mode === 'serv' && (
          <>
            <div className="scale">
              {[0.5, 1, 1.5, 2, 3].map((v) => (
                <button key={v} className={serv === v ? 'on' : ''} onClick={() => setServ(v)}>
                  <b className="num">{frac(v)}</b>{Math.round(food.g * v)} {u}
                </button>
              ))}
            </div>
            <div className="foot">One serving is {food.g} {u}.</div>
          </>
        )}
        {mode === 'hand' && (
          <>
            <div className="chips">
              {(Object.keys(HANDS) as HandPortion[]).map((k) => (
                <button key={k} className={'chip' + (hand.type === k ? ' on' : '')} onClick={() => setHand({ ...hand, type: k })}>
                  {HANDS[k].label}<small>{HANDS[k].hint}</small>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <span>How many?</span>
              <span className="stepper">
                <button aria-label="Fewer" onClick={() => setHand({ ...hand, count: Math.max(0.5, hand.count - 0.5) })}>−</button>
                <span className="num">{frac(hand.count)}</span>
                <button aria-label="More" onClick={() => setHand({ ...hand, count: Math.min(6, hand.count + 0.5) })}>+</button>
              </span>
            </div>
            <div className="foot">For you, one {HANDS[hand.type].label.toLowerCase()} ≈ {handGrams(profile, hand.type)} {u}. Calibrate in Profile.</div>
          </>
        )}
        {mode === 'g' && (
          <>
            <div className="gram">
              <input className="num" type="number" inputMode="decimal" value={grams || ''} aria-label={`Amount in ${u}`}
                onChange={(e) => setGrams(parseFloat(e.target.value) || 0)} />
              <span>{u}</span>
            </div>
            <input type="range" min={0} max={maxG} step={maxG > 400 ? 5 : 1} value={Math.min(maxG, grams)} aria-label="Amount slider"
              onChange={(e) => setGrams(+e.target.value)} />
            {learned != null && (
              <div className="foot" style={{ textAlign: 'center' }}>
                Your usual is {learned} {u}.{' '}
                <button className="navbtn" style={{ fontSize: 13 }} onClick={() => setGrams(learned)}>Use it</button>
              </div>
            )}
          </>
        )}
      </div>

      {askFat && (
        <>
          <div className="lbl">How was it cooked?</div>
          <div className="chips">
            {FAT_OPTIONS.map((o) => (
              <button key={o.id} className={'chip' + (fat === o.id ? ' on' : '')} onClick={() => setFat(o.id)}>{o.label}</button>
            ))}
          </div>
          <div className="foot">
            {fat ? "Cooking fat is the part food logs miss most, so it's added separately and you can change it."
              : "Skip this and we'll assume a teaspoon of oil, with a wider margin."}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="big num">{fmt(kcal)}<small>kcal</small><span className="pm">± {combinedMargin(entry, fatEntry)}</span></div>
        <div className="sub num" style={{ marginTop: 4 }}>
          {r1(entry.p + (fatEntry?.p ?? 0))} g protein · {r1(entry.c)} g carbs · {r1(entry.f + (fatEntry?.f ?? 0))} g fat
        </div>
        <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
          {CAPTURE_LABEL[entry.how!]}{fatEntry ? ` + ${fatEntry.n.replace(' · cooking', '')} (${fatEntry.k} kcal)` : ''}
        </div>
      </div>
      <button className="btn" onClick={commit} disabled={!entry.grams}>Add to {MEAL_LABEL[meal]}</button>
    </Sheet>
  )
}
