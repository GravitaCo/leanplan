import { useState } from 'react'
import { useStore } from '@/store/store'
import type { FatChoice, Food, HandPortion, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { amountText, headline, roundAmount, unitOf } from '@/core/domain/nutrition'
import { sourceOf } from '@/core/data/sources'
import {
  CAPTURE_LABEL, FAT_OPTIONS, HANDS, accuracyOf, buildEntry, combinedMargin, frac, handFor, handGrams, isCookable, type Portion,
} from '@/core/domain/estimate'
import { MEAL_LABEL, entryAmount, lastFatFor, lastUse } from '@/core/domain/insights'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'

type Mode = Portion['mode']
const SERV_STEPS = [0.5, 1, 1.5, 2, 3]

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
  const profile = data.profile
  const gentle = !!profile.gentle
  const u = unitOf(food)

  const last = lastUse(data, food.n)
  // what the last entry meant in today's data (a live-era 120 g roll is today's 119.5 g serving)
  const learned = last ? entryAmount(last, food) : null
  const each = u === 'item'
  // per-item foods are counted, never weighed or hand-sized; a food last logged as servings
  // opens in servings, at the same count
  const lastServ = last?.serv != null && (last.how === 'serv' || last.how === 'usual') && learned === roundAmount(food.g * last.serv, u) && SERV_STEPS.includes(last.serv) ? last.serv : null
  const [mode, setMode] = useState<Mode>(each || lastServ != null ? 'serv' : last ? (last.how === 'hand' ? 'hand' : 'g') : profile.accuracy === 'precise' ? 'g' : 'serv')
  const source = sourceOf(food)
  const head = headline(food)
  const [serv, setServ] = useState(lastServ ?? 1)
  const [grams, setGrams] = useState<number>(learned ?? food.g)
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

  const maxG = Math.max(50, Math.round(food.g * 4))
  return (
    <Sheet title={food.n} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit} disabled={!entry.grams}>Add</button>}>
      <div className="sub num" style={{ textAlign: 'center', margin: '-4px 0 12px' }}>
        {gentle ? `${r1(head.p)} g protein` : `${Math.round(head.k)} kcal · ${r1(head.p)} P · ${r1(head.c)} C · ${r1(head.f)} F`} {head.per}
        <div style={{ fontSize: 13, marginTop: 2 }}>
          {source ? <>Source: {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.text}</a> : source.text}</> : 'Source not yet checked'}
        </div>
      </div>
      <MealSeg value={meal} onChange={setMeal} />

      <div className="lbl">How much?</div>
      {!each && <Seg<Mode> options={u === 'ml' ? [['serv', 'Servings'], ['g', 'Millilitres']] : [['serv', 'Servings'], ['g', 'Grams'], ['hand', 'Hands']]}
        value={mode} onChange={setMode} />}
      <div style={{ marginTop: 14 }}>
        {mode === 'serv' && (
          <>
            <div className="scale">
              {SERV_STEPS.map((v) => (
                <button key={v} className={serv === v ? 'on' : ''} onClick={() => setServ(v)}>
                  <b className="num">{frac(v)}</b>{each ? (gentle ? `${r1(food.p * v)} g protein` : `${Math.round(food.k * v)} kcal`) : `${r1(food.g * v)} ${u}`}
                </button>
              ))}
            </div>
            <div className="foot">{each ? `Values are for one item, as ${source?.text.split(',')[0] ?? 'the maker'} publishes them.` : `One serving is ${amountText(food.g, u)}.`}</div>
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
              <input className="num" type="number" inputMode="decimal" value={grams ? Math.round(grams * 100) / 100 : ''} aria-label={`Amount in ${u}`}
                onChange={(e) => setGrams(parseFloat(e.target.value) || 0)} />
              <span>{u}</span>
            </div>
            <input type="range" min={0} max={maxG} step={maxG > 400 ? 5 : 1} value={Math.min(maxG, grams)} aria-label="Amount slider"
              onChange={(e) => setGrams(+e.target.value)} />
            {learned != null && (
              <div className="foot" style={{ textAlign: 'center' }}>
                Your usual is {amountText(learned, u)}.{' '}
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
              : "Cooking fat is the part food logs miss most. Skip it and nothing is added, we just widen the margin."}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        {!gentle && <div className="big num">{fmt(kcal)}<small>kcal</small><span className="pm">± {combinedMargin(entry, fatEntry)}</span></div>}
        <div className={gentle ? 'big num' : 'sub num'} style={gentle ? { fontSize: 22 } : { marginTop: 4 }}>
          {r1(entry.p + (fatEntry?.p ?? 0))} g protein · {r1(entry.c)} g carbs · {r1(entry.f + (fatEntry?.f ?? 0))} g fat
        </div>
        <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
          {CAPTURE_LABEL[entry.how!]}{fatEntry ? ` + ${fatEntry.n.replace(' · cooking', '').toLowerCase()}${gentle ? '' : ` (${fatEntry.k} kcal)`}` : ''}
        </div>
      </div>
      <button className="btn" onClick={commit} disabled={!entry.grams}>Add to {MEAL_LABEL[meal]}</button>
    </Sheet>
  )
}
