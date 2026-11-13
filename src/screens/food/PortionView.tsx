import { useState } from 'react'
import { useStore } from '@/store/store'
import { hasConsent, kcalHidden } from '@/data/consent'
import type { FatChoice, Food, HandPortion, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { amountText, headline } from '@/core/domain/nutrition'
import { sourceOf } from '@/core/data/sources'
import { CAPTURE_LABEL, FAT_OPTIONS, HANDS, frac, handGrams, type Portion } from '@/core/domain/estimate'
import { MEAL_LABEL } from '@/core/domain/insights'
import { SERV_STEPS, gramsMax, portionModes, portionPreview, portionStart } from './foodModel'
import { PORTION } from '@/copy/food'
import { Sheet, Seg, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'
import { shareRowState } from '@/core/domain/sharedProduct'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { LABEL_SCAN_ENABLED } from '@/data/labelReader'
import { ShareProductRow } from './SharedProduct'

type Mode = Portion['mode']

/**
 * Pick how much. Defaults to what the user had last time (learned portion), asks the
 * cooking-fat question only for foods usually cooked in fat, and previews the ± margin.
 */
export function PortionView({ food, custom, meal, setMeal, onBack, onClose, animate, onShare, shareBusy }: {
  food: Food; custom: boolean; meal: MealSlot; setMeal: (m: MealSlot) => void
  onBack?: () => void; onClose: () => void; animate: boolean
  /** "Share this product" (sp-7): offered on a saved food that qualifies (shareRowState) */
  onShare?: () => void
  /** its Open Food Facts lookup is running */
  shareBusy?: boolean
}) {
  const data = useStore((s) => s.data)
  const online = useStore((s) => s.online)
  const underAge = useStore((s) => !!s.underAge)
  const logEntries = useStore((s) => s.logEntries)
  const profile = data.profile
  const gentle = kcalHidden(data)
  // where it opens: last time's amount, in the way it was given (foodModel, shared with native);
  // per-item foods are counted, never weighed or hand-sized
  const [start] = useState(() => portionStart(data, food))
  const { unit: u, each, learned } = start
  const [mode, setMode] = useState<Mode>(start.mode)
  const source = sourceOf(food)
  const head = headline(food)
  const [serv, setServ] = useState(start.serv)
  const [grams, setGrams] = useState<number>(start.grams)
  const [hand, setHand] = useState<{ type: HandPortion; count: number }>(start.hand)
  const [fat, setFat] = useState<FatChoice | null>(start.fat)

  const portion: Portion =
    mode === 'serv' ? { mode, serv } : mode === 'hand' ? { mode, type: hand.type, count: hand.count } : { mode, grams, learned }
  const { entry, fatEntry, askFat, kcal, margin, toLog } = portionPreview(food, portion, meal, profile, custom, fat)

  const commit = () => {
    if (!toLog) return
    logEntries(toLog, PORTION.added(food.n))
    onClose()
  }

  // the saved food as it is now: its share row goes once it's shared or Open Food Facts has it
  const saved = custom && food.id ? (data.customFoods || []).find((f) => f.id === food.id) : undefined
  // a read is queued only with a yes to health data (queueSharedProduct), and no photo leaves the
  // phone while an under-18 age is on screen
  const shareOk = SHARED_PRODUCTS_ENABLED && LABEL_SCAN_ENABLED && hasConsent(data, 'health') && !underAge
  const shareRow = saved ? shareRowState(saved, { enabled: shareOk, online }) : 'hidden'

  const maxG = gramsMax(food)
  return (
    <Sheet title={food.n} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit} disabled={!entry.grams}>{PORTION.add}</button>}>
      <div className="sub num" style={{ textAlign: 'center', margin: '-4px 0 12px' }}>
        {gentle ? `${r1(head.p)} g protein` : `${Math.round(head.k)} kcal · ${r1(head.p)} P · ${r1(head.c)} C · ${r1(head.f)} F`} {head.per}
        <div style={{ fontSize: 13, marginTop: 2 }}>
          {source ? <>{PORTION.source} {source.url ? <a className="srcln" href={source.url} target="_blank" rel="noreferrer">{source.text}</a> : source.text}</> : PORTION.sourceUnchecked}
        </div>
      </div>
      <MealSeg value={meal} onChange={setMeal} />

      <div className="lbl">{PORTION.howMuch}</div>
      {!each && <Seg<Mode> options={portionModes(food)!} value={mode} onChange={setMode} />}
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
            {/, raw\b/i.test(food.n) && <div className="foot">{PORTION.weighRaw}</div>}
            <div className="foot">{each ? PORTION.perItem(source?.text.split(',')[0] ?? PORTION.theMaker) : PORTION.oneServing(amountText(food.g, u))}</div>
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
              <span>{PORTION.howMany}</span>
              <span className="stepper">
                <button aria-label={PORTION.fewer} onClick={() => setHand({ ...hand, count: Math.max(0.5, hand.count - 0.5) })}>−</button>
                <span className="num">{frac(hand.count)}</span>
                <button aria-label={PORTION.more} onClick={() => setHand({ ...hand, count: Math.min(6, hand.count + 0.5) })}>+</button>
              </span>
            </div>
            <div className="foot">{PORTION.handIs(HANDS[hand.type].label, handGrams(profile, hand.type), u)}</div>
          </>
        )}
        {mode === 'g' && (
          <>
            <div className="gram">
              <input className="num" type="number" inputMode="decimal" value={grams ? Math.round(grams * 100) / 100 : ''} aria-label={PORTION.amountIn(u)}
                onChange={(e) => setGrams(parseFloat(e.target.value) || 0)} />
              <span>{u}</span>
            </div>
            <input type="range" min={0} max={maxG} step={maxG > 400 ? 5 : 1} value={Math.min(maxG, grams)} aria-label={PORTION.amountSlider}
              onChange={(e) => setGrams(+e.target.value)} />
            {learned != null && (
              <div className="foot" style={{ textAlign: 'center' }}>
                {PORTION.yourUsual(amountText(learned, u))}{' '}
                <button className="navbtn" style={{ fontSize: 13 }} onClick={() => setGrams(learned)}>{PORTION.useIt}</button>
              </div>
            )}
          </>
        )}
      </div>

      {askFat && (
        <>
          <div className="lbl">{PORTION.howCooked}</div>
          <div className="chips">
            {FAT_OPTIONS.map((o) => (
              <button key={o.id} className={'chip' + (fat === o.id ? ' on' : '')} onClick={() => setFat(o.id)}>{o.label}</button>
            ))}
          </div>
          <div className="foot">
            {fat ? PORTION.fatAdded : PORTION.fatSkipped}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        {!gentle && <div className="big num">{fmt(kcal)}<small>kcal</small><span className="pm">± {margin}</span></div>}
        <div className={gentle ? 'big num' : 'sub num'} style={gentle ? { fontSize: 22 } : { marginTop: 4 }}>
          {r1(entry.p + (fatEntry?.p ?? 0))} g protein · {r1(entry.c)} g carbs · {r1(entry.f + (fatEntry?.f ?? 0))} g fat
        </div>
        <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>
          {CAPTURE_LABEL[entry.how!]}{fatEntry ? ` + ${fatEntry.n.replace(' · cooking', '').toLowerCase()}${gentle ? '' : ` (${fatEntry.k} kcal)`}` : ''}
        </div>
      </div>
      <button className="btn" onClick={commit} disabled={!entry.grams}>{PORTION.addTo(MEAL_LABEL[meal])}</button>
      {shareRow !== 'hidden' && onShare && <ShareProductRow state={shareRow} busy={shareBusy} onShare={onShare} />}
    </Sheet>
  )
}
