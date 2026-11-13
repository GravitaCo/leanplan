# N6 Scanning: proposed differences from the web

Each is a visible difference, off in code (`flags.ts`) until Benn or Sara approve a board. The lead
takes them to the Design canvas.

## P1. No "Take a photo" row on the barcode screen (`BARCODE_PHOTO_ROW`)

**Web:** under the live camera, a "Take a photo" row ("Of the barcode, close up, or pick one from
your photos") opens the phone's camera or photo library and decodes the barcode from the still
photo. It exists because live decoding in iOS Safari was unreliable, and a still photo was the most
dependable path there. **Native:** the row is left out; the live camera and "Or type the number"
stay exactly as they are. **Why:** the phone's own barcode scanner (Apple's AVFoundation, Google's
ML Kit) reads live reliably, which removes the reason for the row, and expo-camera can't decode an
EAN or UPC barcode from a still photo on iPhone (its photo decoding reads QR codes only there), so
the row would fail on iPhone. Keeping it would mean a second barcode library for one fallback.
Typing the number still covers a barcode the camera can't read.

## P2. Label photo quality checked after capture, not live (`PHOTO_QUALITY_CHECK`)

**Web:** while the label camera is open, a line under it checks each frame for light, glare and
focus ("A bit dark. Try near a window or under a light.", "Glare on the label. Tilt the pack a
little.", "Hold still, or move back a little so it can focus.", "Looks good."); Capture stays off until the frame passes, with "Capture anyway" beside it; the review row
then says "May be hard to read: …" or "Ready to read". **Native:** the same checks (the shared
`core/domain/labelQuality.ts`, unchanged) run on the photo once it's taken; over the camera the
guidance line stays and there is one Capture button; the review row says "May be hard to read: …"
or "Ready to read" as on web, with Retake beside it. **Why:** expo-camera gives no access to the
live frame's pixels, so a live check would need a heavier camera library with native frame
processing. Checking the taken photo keeps the same advice and wording, one step later. It needs a
small JavaScript JPEG decoder (`jpeg-js`) to read the photo's pixels, approved only with this
proposal. Until then (flag off) there is no check and the review row says "Ready to read".
