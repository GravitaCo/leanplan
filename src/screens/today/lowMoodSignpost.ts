/**
 * The low-mood signpost's hooks (WP15), shared by the web and native Summary: React only, no DOM.
 * The rules are summary.ts's (signpostFresh, signpostShows, signpostMarkNow). Reading whether it
 * shows never marks it; the banner marks the day it showed when it is really drawn (on mount), once
 * per app session that day, with the local date (markLowMoodShown, this device only, never synced),
 * so a render path that never draws Summary can't use up its 30 days. Once marked, lowMoodDue keeps
 * it away for 30 days.
 */
import { useEffect, useState } from 'react'
import { signpostFresh, signpostMarkNow, signpostShows, type SignpostSession } from './summary'

/** The day the signpost showed in this app session, and whether it was dismissed. */
const session: SignpostSession = { day: '', dismissed: false }

/** Whether the banner shows now, and how to dismiss it. `due`: the asks budget shows the signpost today. */
export function useLowMoodSignpost(due: boolean, today: string, shownOn: string | undefined) {
  const [, rerender] = useState(0)
  return {
    show: signpostShows(due, signpostFresh(due, today, shownOn), today, session),
    dismiss: () => { session.dismissed = true; rerender((n) => n + 1) },
  }
}

/** For the banner itself: on mount, mark today as shown (once per app session that day). */
export function useMarkSignpostShown(today: string, markShown: () => boolean): void {
  useEffect(() => {
    if (!signpostMarkNow(today, session)) return
    session.day = today
    session.dismissed = false
    markShown()
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
}
