# N6 Scanning: parity checklist

The web is the spec: `src/screens/food/ScanView.tsx`, `ScanConfirmView.tsx`, `LabelCaptureView.tsx`,
`SharedProduct.tsx`, the scan parts of `AddFoodSheet.tsx`, and `src/data/products.ts`,
`sharedProducts.ts`, `labelReader.ts` (these three run on native unchanged). Every state below is
checked in light and dark, gentle mode on and off, offline, small and large phones, and Dynamic
Type at the largest size, once the screens exist.

Status key: **module** = the behaviour is in a UI-free module here and checked by
`npm run test:scan`; **screen** = drawn once N1's kit lands (`apps/native/lib/ui`); **P1/P2** = a
visible difference waiting on a board (`PROPOSALS.md`); **shared** = runs from `src/` unchanged;
**n/a** = a web-only mechanism with nothing to show on native.

## Barcode scan (web ScanView)

| Web behaviour or state | Native | Status |
|---|---|---|
| Camera asked for on open; rear camera | `useBarcodeScanner` asks through expo-camera's permission | module |
| "Starting the camera…" until the first frame | `camera: 'starting'` until `onCameraReady` | module, screen |
| Live view in a 4:3 box with the tint frame, "Hold the barcode inside the frame." | `camera: 'on'`; `cameraProps` for `<CameraView>` | module, screen |
| Camera refused: the "can't use the camera" note | `camera: 'denied'` (refused, or can't ask again) | module, screen |
| No camera: the "No camera is available here" note | `camera: 'none'` from `onMountError` | module, screen |
| "The scanner needs a connection the first time it opens" (`noscan`) | the web downloads its decoder once; the phone's decoder is built in | n/a |
| Decoder: same valid number in two frames running before it counts | `confirmLiveRead` on the platform's reads | module (tested) |
| The four retail formats only (EAN-13, EAN-8, UPC-A, UPC-E) | `NATIVE_FORMATS`; iOS's UPC-A-as-EAN-13 quirk mapped back (`webFormat`) | module (tested, every format and the 8-digit EAN-8/UPC-E overlap) |
| Bad check digit: "That number doesn't look right…", keeps scanning | `message: 'bad-check'` | module (tested), screen |
| Camera stops once a code is valid | `active: false`, reads ignored | module |
| "Take a photo" row: decode a still photo; "Reading the photo…", "No barcode found in that photo…", "That photo couldn't be read…" | expo-camera reads only QR from a still on iOS | **P1** (`BARCODE_PHOTO_ROW` off) |
| Typed number: digits only, at most 14; Look up from 8 digits; Enter submits | `typedDigits`, `canSubmit`, `submitTyped` | module (tested), screen |
| "Looking up <code>… If it's not found you can enter it from the label." | `busy` holds the code | module, screen |
| Lookup order: device, then shared list (when on), then Open Food Facts | `resolveBarcode` | module (tested) |
| A saved food opens at once, offline too, no request | outcome `local` | module (tested) |
| Shared list found → confirm with its source card | outcome `shared` | module (tested) |
| Shared list offline → "Couldn't look it up without a connection…" (Create a food) | outcome `missing`, `offline` | module (tested) |
| Open Food Facts found → confirm | outcome `found` | module (tested) |
| Same name saved by hand → barcode linked, opens that food | outcome `local` via `linkBarcode` | module (tested) |
| Not found / error → Create a food with the barcode and its note | outcome `missing` with `not-found` / `error` | module (tested); the note is N5's (AddFoodSheet `MISSING_NOTE`) |
| lookup-product: POST, GTIN-14 in the body, never the URL | shared `lookupShared` | module (tested) |
| Open Food Facts URL and fields | shared `lookupProduct` | module (tested) |
| Closed mid-lookup: nothing reported | `alive()` | module (tested) |
| Foot: "Values come from Open Food Facts…" | | screen |

## Check the label (web ScanConfirmView)

All of it is screen work on N1's kit; the logic is the shared `src/core` (`checkLabel`,
`labelIssues`, `servingRef`, `foodFromConfirmed`, `shareDecision`…) called exactly as the web
calls it. Saving goes through N5's native `useDuplicateSave` (agreed: a prop with the web's
signature).

| Web behaviour or state | Status |
|---|---|
| Title "Check the label"; Back; Save (or Share in share mode) on the right, off while fields are missing | screen |
| Notice line when the view opened after a failed read | screen |
| Source: "Pack label via Open Food Facts…" / "Your pack label (read from your photo)." / shared source card (sp-2, sp-3, sp-3b); barcode and "calories worked out from kJ" | screen |
| "Photo of the label" button (off offline, with "Needs a connection. Search works offline."), its explanatory foot | screen |
| For cooking / Eat as it is, with each one's line; changes the serving unless typed | screen |
| Name (Needed; "Add the flavour or variety" when vague, focused); serving (Needed / "Check the serving size"); name hint after a label read | screen |
| Shared product: One serving with its ± margin and line | screen |
| Pack size and servings per pack | screen |
| Per 100 g / Per 100 ml segmented control, or "Label is per 100 ml?" | screen |
| US label and "Last updated" lines | screen |
| Nutrition table: per 100 (editable) beside per serving (worked out, or the label's own read), kJ shown from kcal when missing, alcohol only when listed | screen |
| Flags: a row's own issue, a suggested fix ("Did you mean … ?" with Accept), low confidence ("Hard to read in the photo…"), "Worth a second look…" | screen |
| Notes for issues across rows; "These numbers are consistent with each other." | screen |
| Save food / "Fill in the marked fields"; the foot about saved foods (offline line with a barcode) | screen |
| Share mode (sp-9): Share this product button, its two foot lines | screen |
| First save of a shareable read: the opt-in (sp-1), either answer saves | screen |
| Report this product (sp-6): reasons, Send off until one is picked, the three toasts | screen |
| Duplicates: same barcode (dup-1) and likely same food (dup-2) ask first | N5's hook |

## Scan the label (web LabelCaptureView)

| Web behaviour or state | Native | Status |
|---|---|---|
| Consent card before the first photo (and again after a wording change), "OK, take a photo" records `label-photo`; "Type it in instead" (not in share mode) | the shared store's `grantConsent` and `hasCurrentConsent` | screen |
| Guidance line; front step has its own line | | screen |
| Live camera, 3:4 box, label frame; camera refused / none notes | expo-camera | screen |
| Live quality line ("A bit dark…", "Looks good.") and Capture off until it passes, with "Capture anyway" | no frame pixels from expo-camera | **P2** (`PHOTO_QUALITY_CHECK` off: one Capture button) |
| Photo sent at a 1600 px long edge (front 1024), at most 1.5 MB, the web's three JPEG tries | `labelPhoto.ts` with expo-image-manipulator; sizes in `photoSize.ts` | module (sizes tested) |
| "That photo couldn't be used. Try again." | `captureShot` throws | module, screen |
| Choose a photo from the library; "That photo couldn't be opened. Try another." | `pickShot` (system picker, no permission) | module, screen |
| Review: thumbnail, "May be hard to read: …" or "Ready to read", Retake; add or remove the front | `Shot.issue` (null until P2) | screen |
| "Read the label"; "Reading the label…" | `readPhotos` | module (tested), screen |
| No photo before the health answer, or with an under-18 age on screen | gates in `readPhotos` | module (tested) |
| The label-photo consent sent before the photo | `flushConsents` first | module (tested) |
| Request body `{ panel, front?, barcode? }` with the session | shared `readLabel` | module (tested) |
| Outcomes: good read → confirm; offline, unavailable (function missing), no session, consent refused, daily cap, unreadable, error → type it in with the web's note and its "then" | `readPhotos` + `thenKey` | module (tested) |
| After Open Food Facts: back to its figures, "check them against your pack" | `typedDraft` with `base` | module (tested) |
| Share mode: the sp-8b line; a failed read goes back to the food, nothing shared | `share-failed` | module (tested), screen |
| Photos kept only while the screen is open, never stored | in memory; cache files deleted by `discardAll` once expo-file-system is agreed | module (deletion pending the lead) |
| The label camera's code can't load offline (web lazy-load fallback) | bundled in the app | n/a |

## Shared product list (web SharedProduct)

| Board | Status |
|---|---|
| sp-1 opt-in (compliance's copy, terms link; closing = Not now) | screen |
| sp-2 / sp-3 / sp-3b source card | screen |
| sp-6 report sheet | screen (the request is shared `reportShared`) |
| sp-7 / sp-7b Share this product row (on N5's portion view; offline stays in view, off) | screen, exported for N5 |
| sp-8a Open Food Facts already has it | screen, exported for N5 |
| sp-8b the line over the label camera | screen |
| sp-9 share check | screen |
| The outbox and its random-delay send | shared (the store schedules it) |

## Add food entry points (N5 hosts, N6 provides)

| Web | Owner |
|---|---|
| Scan barcode row ("Works for products you've scanned before" offline) and the search bar's scan button | N5 opens N6's scan screen |
| Scan the label row (off offline, "Needs a connection…") | N5 opens N6's label screen |
| Missing product → Create a food with the barcode and `MISSING_NOTE`; Photo of the label from there | N5 |
| Share this product: `offBeforeShare`, then sp-8a or the label camera in share mode | N5 calls shared `offBeforeShare`, opens N6's screens |

## Carried over from the web's e2e scripts

`scripts/e2e-label-scan.cjs`: good read, function error, offline, function missing, consent before
the photo, 403 consent: all in `test-scan.ts` at module level. The misread suggestion and the
fake-camera capture are screen-level (the suggestion logic is shared core, already tested on web).

`scripts/e2e-shared-products.cjs`: lookup order and the lookup-product request in `test-scan.ts`;
the opt-in, the source cards, the report sheet and the queue are screen-level or shared store
behaviour, carried over when the screens are built.
