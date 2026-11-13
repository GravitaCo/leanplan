/**
 * N6 Scanning: the screens N5's add-food sheet opens, each with the same props as the web's view of
 * the same name (src/screens/food/), so AddFoodSheet's navigation carries over as it is:
 *
 * - ScanView: onResult(ScanOutcome) → 'local' opens the portion view, 'found' and 'shared' open
 *   ScanConfirmView with the draft, 'missing' opens Create a food with the barcode and
 *   MISSING_NOTE[why] (src/copy/scan.ts).
 * - LabelCaptureView: onDone(draft, notice) opens ScanConfirmView; share mode passes forShare and
 *   onFail (a toast, back to the food).
 * - ScanConfirmView: onSaved(food) opens the portion view; pass N5's dup-1/dup-2 sheet as
 *   `duplicateSheet(ask, answer, dismiss)`.
 * - ShareProductRow, InOffSheet: for the portion view's Share this product (with shared
 *   offBeforeShare from src/data/sharedProducts).
 */
export { ScanView, type ScanOutcome } from './ScanView'
export { LabelCaptureView } from './LabelCaptureView'
export { ScanConfirmView, LabelPhotoButton } from './ScanConfirmView'
export { InOffSheet, ReportProductSheet, SharedServing, SharedSourceCard, ShareOptInSheet, ShareProductRow } from './SharedProduct'
