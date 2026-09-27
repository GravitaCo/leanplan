/** The personalised training engine (personalised-training-engine.md), day 1: pure TS, offline. */
export { buildPlan, allWhys, planSignature } from './generate'
export type { BuildResult, GeneratedPlan, PlannedSession, PlannedSlot, PersonModel, Routing, Offer, OfferKind, Split, Focus, SessionKind, SlotRole, Range } from './generate'
export { calibrationTarget } from './calibrate'
export type { CalibrationTarget } from './calibrate'
export { whyText, renderWhy, copyIssues, BANNED_COPY, exName } from './why'
export { FIELDS, TRAINING_FIELDS, DEFAULT_WEEKDAYS, ageBandOf, inputsFromProfile, hasTrainingAnswers } from './inputs'
export type { PlanInputs, InputField, Scope, AgeBand, Minutes, DaysPerWeek, Readiness, Wellbeing, Lately, Deficit } from './inputs'
