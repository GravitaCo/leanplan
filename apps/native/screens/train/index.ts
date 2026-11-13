/**
 * The Train stream's exports (native-build-plan N7). The lead wires TrainScreen into
 * app/(tabs)/train.tsx (pass `onProfile` to open Profile from the avatar); Plan (N8) opens the
 * workout builder and the library from here.
 */
export { TrainScreen } from './TrainScreen'
export { RoutineBuilderSheet, type BuilderStart } from './RoutineBuilderSheet'
export { LibrarySheet } from './LibrarySheet'
export { DemoPlayer } from './DemoPlayer'
export { Thumb } from './media'
// for N12: is a guided session on screen, and the rest-end alert's scheduler
export { guidedSessionOpen, onGuidedSession, setRestAlerter, type RestAlert, type RestAlerter } from './session'
