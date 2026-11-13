/**
 * STUB for N2's 18+ stop (native/n2-account: src/screens/onboarding/AgeStop.tsx Under16 and
 * UnderAgeStop). The wizard calls it through `ageStop`, so N2's entry point drops in without touching
 * the wizard. Until then it shows the approved words and signposts and, for the first-run stop, does
 * what the web does on Close (store deleteUnderAge). Redo setup's "Close and delete" needs N2's
 * account deletion, so here it does nothing (no developer text where a person could see it); the
 * Redo setup and Set up my plan rows (N10) must not be wired before N2's stop is passed in.
 */
import type { ReactNode } from 'react'
import { useStore } from '@/store/store'
import { NOTES } from '@/copy/onboarding'
import { Btn, LinkBtn } from '../../lib/ui/kit'
import { Lead, Note, OB_BTN, Page, ScreenH } from './frame'
import { Signposts, SPS } from './Signposts'

/** How the wizard asks for the stop: `redo` is Profile's Redo setup (the app's variant, board "Age 18+ · 1"). */
export type AgeStopRender = (p: { redo: boolean; onWrong: () => void; onClose: () => void }) => ReactNode

export const AgeStopStub: AgeStopRender = (p) => <Stub {...p} />

function Stub({ redo, onWrong, onClose }: { redo: boolean; onWrong: () => void; onClose: () => void }) {
  const busy = useStore((s) => s.deletingAccount)
  const underAgeMistake = useStore((s) => s.underAgeMistake)
  const c = redo ? NOTES.underAge : NOTES.under16
  const note = redo ? `${NOTES.underAge.note} ${NOTES.underAge.notSaved}` : NOTES.under16.note
  return (
    <Page top={110} cta={<>
      <Btn title={redo ? NOTES.underAge.close : 'Close'} onPress={redo ? () => {} : onClose} disabled={busy} style={OB_BTN} />
      <LinkBtn title={NOTES.underAge.wrong} onPress={() => { if (redo) underAgeMistake(); onWrong() }} style={{ fontSize: 16, textAlign: 'center', paddingVertical: 4 }} />
    </>}>
      <ScreenH style={{ marginTop: 0 }}>{c.title}</ScreenH>
      <Lead body ink>{c.lead}</Lead>
      <Lead body>{c.more}</Lead>
      <Signposts list={SPS.under16} />
      <Note>{note}</Note>
    </Page>
  )
}
