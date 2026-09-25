import { useMemo, useState } from 'react'
import type { Equipment, Exercise, Modality } from '@/core/types'
import { EXERCISES } from '@/core/data/exercises'
import { MODALITIES, MODALITY_LABEL } from '@/core/data/modalities'
import { careList, EQUIPMENT_LABEL, LEVEL_LABEL, TARGET_LABEL } from '@/core/data/libraryLabels'
import { exById, stepOf } from '@/core/domain/library'
import { rankByName } from '@/core/domain/search'
import { howToLink } from '@/core/domain/workout'
import { BackButton, Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { CARE_DISCLAIMER } from './SwapSheet'
import { RED_FLAG } from './HoldTimer'
import { DemoPlayer } from './DemoPlayer'

/** Kit filters: the few that decide most of what someone can do. */
const KIT: [Equipment | 'none', string][] = [['none', 'No equipment'], ['dumbbell', 'Dumbbells'], ['band', 'Band'], ['mat', 'Mat'], ['machine', 'Gym machines']]

function fits(x: Exercise, kit: Equipment | 'none' | null): boolean {
  if (!kit) return true
  if (kit === 'none') return x.equipment.length === 0 || x.equipment.every((q) => q === 'bodyweight' || q === 'mat')
  if (kit === 'machine') return x.equipment.some((q) => q === 'machine' || q === 'cable' || q === 'cardio-machine')
  return x.equipment.includes(kit)
}

const inModality = (x: Exercise, m: Modality) => x.modality === m || !!x.also?.includes(m)

function Detail({ x, onOpen }: { x: Exercise; onOpen: (id: string) => void }) {
  const [demo, setDemo] = useState(false)
  const easier = stepOf(x, -1)
  const harder = stepOf(x, 1)
  const gentler = exById(x.gentler)
  const kit = x.equipment.length ? x.equipment.map((q) => EQUIPMENT_LABEL[q]).join(' or ') : 'No equipment'
  return (
    <>
      <div className="card ex">
        <div className="h"><div className="n">{x.n}</div>{x.defaultRx && <span className="tg">{x.defaultRx}</span>}</div>
        <div className="foot" style={{ padding: '0 0 8px' }}>
          {[MODALITY_LABEL[x.modality], LEVEL_LABEL[x.difficulty], kit, x.perSide ? 'Each side' : ''].filter(Boolean).join(' · ')}
        </div>
        <div className="cue">{x.cue}</div>
        {x.video
          ? <button className="howto" onClick={() => setDemo(true)}><Icon name="play" size={15} /> Watch example</button>
          : <a className="howto" href={howToLink(x.n)} target="_blank" rel="noopener noreferrer">Watch how to do it ›</a>}
        {x.targets?.length ? <div className="foot" style={{ padding: 0 }}>Works on: {x.targets.map((t) => TARGET_LABEL[t]).join(', ')}</div> : null}
      </div>
      {(easier || harder || gentler) && (
        <div className="list">
          {easier && <button className="li" onClick={() => onOpen(easier.id)}><div className="m"><div className="t">{easier.n}</div><div className="s">Easier</div></div></button>}
          {harder && <button className="li" onClick={() => onOpen(harder.id)}><div className="m"><div className="t">{harder.n}</div><div className="s">Harder, when this feels steady</div></div></button>}
          {gentler && <button className="li" onClick={() => onOpen(gentler.id)}><div className="m"><div className="t">{gentler.n}</div><div className="s">Gentler</div></div></button>}
        </div>
      )}
      {x.care?.length ? (
        <div className="foot" style={{ padding: '12px 4px 0' }}>This move asks quite a lot of {careList(x.care)}.{gentler ? " If you'd like to go easier on them, the gentler option above works the same area." : ''} {CARE_DISCLAIMER}</div>
      ) : null}
      <div className="foot" style={{ padding: '12px 4px 0' }}>{RED_FLAG}</div>
      {demo && x.video && <DemoPlayer ex={{ n: x.n, t: x.defaultRx ?? '', cue: x.cue, video: x.video }} onClose={() => setDemo(false)} />}
    </>
  )
}

/**
 * The exercise library, read only (plan P3): search, filter by kind and kit, and open an entry for
 * its cue, easier and harder steps and a gentler option.
 */
export function LibrarySheet({ onClose, initial }: { onClose: () => void; /** open straight at this entry */ initial?: string }) {
  const [q, setQ] = useState('')
  const [mod, setMod] = useState<Modality | null>(null)
  const [kit, setKit] = useState<Equipment | 'none' | null>(null)
  const [open, setOpen] = useState<string[]>(initial ? [initial] : [])
  const cur = exById(open[open.length - 1])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const pool = EXERCISES.filter((x) => (!mod || inModality(x, mod)) && fits(x, kit))
    return words.length ? rankByName(pool, (x) => x.n, words) : [...pool].sort((a, b) => a.n.localeCompare(b.n))
  }, [q, mod, kit])

  if (cur) {
    return (
      <Sheet title={cur.n} onClose={onClose} tall animate={false} left={<BackButton onClick={() => setOpen(open.slice(0, -1))} />}>
        <Detail x={cur} onOpen={(id) => setOpen([...open, id])} />
      </Sheet>
    )
  }
  return (
    <Sheet title="Exercise library" onClose={onClose} tall left={<button className="navbtn" onClick={onClose}>Done</button>}>
      <div className="searchbar"><Icon name="search" size={17} />
        <input value={q} placeholder="Search exercises" aria-label="Search exercises" onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips" role="radiogroup" aria-label="Kind" style={{ margin: '12px 0 8px' }}>
        {MODALITIES.map((m) => (
          <button key={m} role="radio" aria-checked={mod === m} className={'chip' + (mod === m ? ' on' : '')} onClick={() => setMod(mod === m ? null : m)}>{MODALITY_LABEL[m]}</button>
        ))}
      </div>
      <div className="chips" role="radiogroup" aria-label="Equipment" style={{ marginBottom: 12 }}>
        {KIT.map(([k, label]) => (
          <button key={k} role="radio" aria-checked={kit === k} className={'chip' + (kit === k ? ' on' : '')} onClick={() => setKit(kit === k ? null : k)}>{label}</button>
        ))}
      </div>
      {list.length ? (
        <div className="list">
          {list.map((x) => (
            <button className="li" key={x.id} onClick={() => setOpen([x.id])}>
              <div className="m"><div className="t">{x.n}</div><div className="s">{MODALITY_LABEL[x.modality]} · {LEVEL_LABEL[x.difficulty]}</div></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="foot" style={{ padding: '0 4px' }}>Nothing matches. Try fewer filters.</div>
      )}
    </Sheet>
  )
}
