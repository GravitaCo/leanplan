/**
 * The low-mood signpost on Summary (wellbeing board B6 frame 2, canvas wp-b6-more; build plan
 * WP15). A mind-coloured banner, not a warning (never red): the info icon on a --mind-fill square,
 * the B6.10 line for every nation (LOW_MOOD_LINE_ANY_NATION: no stored nation, so no NHS route
 * that may not exist where the person lives; the Support sheet has the nation picker), "See support"
 * (B6.12), which opens the Support sheet, and Dismiss (B6.13) with a 44 px target.
 *
 * Behind WELLBEING_ENABLED and MIND_REVIEWED (on since 10 Oct 2026, Benn; clinician review before public launch): TodayScreen only asks for
 * it when the asks budget shows the 'signpost' ask, which selectAskCtx gives only with the sub-flag.
 * The banner itself records nothing: opening Support from it is private (B6.8), and the only write
 * is markLowMoodShown, the local date it showed, on this device only (never synced).
 */
import { useEffect, useState } from 'react'
import { LOW_MOOD_LINE_ANY_NATION } from '@/core/domain/mind'
import { Icon } from '@/ui/icons'
import { LOW_MOOD } from '../mind/copy'

export function LowMoodBanner({ onSupport, onDismiss }: {
  onSupport: () => void
  onDismiss: () => void
}) {
  return (
    <div className="banner lm-banner" role="note">
      <span className="psq lm-sq" aria-hidden="true"><Icon name="info" size={18} /></span>
      <div className="lm-body">
        <div>{LOW_MOOD_LINE_ANY_NATION}</div>
        <button className="btn gray sm" onClick={onSupport}>{LOW_MOOD.seeSupport}</button>
      </div>
      <button className="x" aria-label={LOW_MOOD.dismiss} onClick={onDismiss}>
        <span><Icon name="x" size={12} stroke={3} /></span>
      </button>
    </div>
  )
}

/** The day the signpost showed in this page session, and whether it was dismissed: it stays up
 *  across tab switches that day until dismissed, and a reload doesn't bring it back. */
const session = { day: '', dismissed: false }

/**
 * Whether the banner shows now. `due`: the asks budget shows the signpost today. `shownOn`: the
 * stored device-only day it last showed. It shows when due and not yet marked for today, or when it
 * already showed in this session and wasn't dismissed. This hook only reads: it never marks. The
 * marking happens in LowMoodSignpost when the banner is actually on screen, so a render path that
 * never draws Summary (the weekly review opened by ?review=1) cannot use up the signpost's 30 days.
 */
export function useLowMoodSignpost(due: boolean, today: string, shownOn: string | undefined) {
  const [, rerender] = useState(0)
  const fresh = due && shownOn !== today
  const here = session.day === today
  const show = due && !(here && session.dismissed) && (fresh || here)
  return {
    show,
    dismiss: () => { session.dismissed = true; rerender((n) => n + 1) },
  }
}

/** The banner plus its one write: on mount (it is really drawn), the first time this page session
 *  that day, record the local date it showed. Mount only happens where Summary renders it. */
export function LowMoodSignpost({ today, markShown, onSupport, onDismiss }: {
  today: string
  markShown: () => boolean
  onSupport: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    if (session.day === today) return
    session.day = today
    session.dismissed = false
    markShown()
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
  return <LowMoodBanner onSupport={onSupport} onDismiss={onDismiss} />
}
