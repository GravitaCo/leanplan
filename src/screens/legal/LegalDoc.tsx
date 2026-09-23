import type { LegalDoc, LegalDocId } from '@/core/legal'
import { privacyPolicy } from '@/core/legal/privacy'
import { termsOfUse } from '@/core/legal/terms'
import { Sheet } from '@/ui/primitives'

export function legalDoc(id: LegalDocId): LegalDoc {
  return id === 'privacy' ? privacyPolicy() : termsOfUse()
}

const updatedText = (iso: string) =>
  'Last updated ' + new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** The body of a privacy policy or terms document. */
export function LegalBody({ doc }: { doc: LegalDoc }) {
  return (
    <div className="prose">
      <p className="sub" style={{ fontSize: 13 }}>{updatedText(doc.updated)}</p>
      <p>{doc.intro}</p>
      {doc.sections.map((s, i) => (
        <section key={i}>
          {s.h && <h3>{s.h}</h3>}
          {s.p?.map((t, j) => <p key={j}>{t}</p>)}
          {s.ul && <ul>{s.ul.map((t, j) => <li key={j}>{t}</li>)}</ul>}
        </section>
      ))}
    </div>
  )
}

/** A legal document over the current screen. */
export function LegalSheet({ id, onClose }: { id: LegalDocId; onClose: () => void }) {
  const doc = legalDoc(id)
  return (
    <Sheet title={doc.title} tall onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="card"><LegalBody doc={doc} /></div>
    </Sheet>
  )
}

/** Public page at /?doc=privacy or /?doc=terms: readable without signing in (app stores
 *  and Google sign-in need a public link). */
export function LegalPage({ id }: { id: LegalDocId }) {
  const doc = legalDoc(id)
  return (
    <div className="screen" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 40 }}>
      <a href="./" className="navbtn" style={{ textDecoration: 'none' }}>Open Tali</a>
      <h1 style={{ fontSize: 34, fontWeight: 700, margin: '12px 0 12px' }}>{doc.title}</h1>
      <div className="card"><LegalBody doc={doc} /></div>
      <div className="foot" style={{ textAlign: 'center' }}>
        <a href={id === 'privacy' ? '?doc=terms' : '?doc=privacy'} style={{ color: 'var(--tint)' }}>
          {id === 'privacy' ? 'Terms of use' : 'Privacy policy'}
        </a>
      </div>
    </div>
  )
}

export function legalDocFromUrl(): LegalDocId | null {
  const d = new URLSearchParams(window.location.search).get('doc')
  return d === 'privacy' || d === 'terms' ? d : null
}
