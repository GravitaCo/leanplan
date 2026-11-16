/**
 * Where Today hands over to other streams. Only through the store, as on the web (setTab,
 * openTrain, openMind, openProfile, openReview); the shell follows store.tab (lib/navBridge.ts).
 * Sheets that belong to a stream not built yet open a plain "not here yet" note until the owner
 * swaps in the real one (native-build-plan §2, "owners agree a stub").
 */
import { Alert } from 'react-native'

/** A sheet another stream owns (named for the swap), shown as a note until it lands. */
export function notYet(what: string, stream: string): void {
  Alert.alert(what, `Not in the native app yet: it arrives with the ${stream} stream.`)
}
