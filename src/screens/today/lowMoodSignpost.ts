/**
 * The low-mood signpost's hook (WP15), shared by the web and native Summary: React only, no DOM.
 * The rules are summary.ts's (signpostFresh, signpostMarkNow, signpostShows); this keeps the
 * session state and marks the day it showed, once, with the local date (markLowMoodShown, this
 * device only, never synced). Once marked, lowMoodDue keeps it away for 30 days.
 */
import { useEffect, useState } from 'react'
import { signpostFresh, signpostMarkNow, signpostShows, type SignpostSession } from './summary'

const session: SignpostSession = { day: '', dismissed: false }

/** Whether the banner shows now, and how to dismiss it. `due`: the asks budget shows the signpost today. */
export function useLowMoodSignpost(due: boolean, today: string, shownOn: string | undefined, markShown: () => boolean) {
  const [, rerender] = useState(0)
  const fresh = signpostFresh(due, today, shownOn)
  useEffect(() => {
    if (!signpostMarkNow(fresh, today, session)) return
    session.day = today
    session.dismissed = false
    markShown()
    rerender((n) => n + 1)
  }, [fresh, today]) // eslint-disable-line react-hooks/exhaustive-deps
  return {
    show: signpostShows(due, fresh, today, session),
    dismiss: () => { session.dismissed = true; rerender((n) => n + 1) },
  }
}
