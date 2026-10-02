/**
 * The signpost list the onboarding notes, the 18+ stop and Profile's support sheet share. Loaded
 * with the app (no store, no network), so every list shows offline.
 */
/** `webLabel`: a row with one number and its own web link (Profile's support sheet) */
export type SP = { name: string; desc: string; num?: string; tel?: string; lines?: [string, string][]; web?: string; webLabel?: string }

export function Signposts({ list }: { list: SP[] }) {
  return (
    <div className="wz-group">
      {list.map((s) => {
        if (s.lines) {
          return (
            <div key={s.name} className="wz-sp multi">
              <span className="m"><span className="t">{s.name}</span><span className="s">{s.desc}</span>
                {s.lines.map(([l, n]) => <a key={l} className="ln" href={'tel:' + n.replace(/\s/g, '')} aria-label={`${s.name}, ${l}: call ${n}`}><span>{l}</span><span className="n num">{n}</span></a>)}
                {s.web && <a className="ln web" href={s.web} target="_blank" rel="noopener noreferrer"><span>Webchat and email</span><span className="n">Open</span></a>}
              </span>
            </div>
          )
        }
        if (s.tel && s.web) {
          return (
            <div key={s.name} className="wz-sp">
              <span className="m"><span className="t">{s.name}</span><span className="s">{s.desc}</span>
                <a className="wz-sp-web" href={s.web} target="_blank" rel="noopener noreferrer">{s.webLabel ?? 'Webchat and email'}</a></span>
              <a className="n num" href={'tel:' + s.tel.replace(/\s/g, '')} aria-label={`${s.name}: call ${s.num}`}>{s.num}</a>
            </div>
          )
        }
        const inner = <><span className="m"><span className="t">{s.name}</span><span className="s">{s.desc}</span></span><span className="n num">{s.num}</span></>
        return s.tel
          ? <a key={s.name} className="wz-sp" href={'tel:' + s.tel.replace(/\s/g, '')} aria-label={`${s.name}: call ${s.num}`}>{inner}</a>
          : <div key={s.name} className="wz-sp">{inner}</div>
      })}
    </div>
  )
}
