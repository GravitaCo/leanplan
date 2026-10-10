# Tali guided audio: scripts for ElevenLabs (draft, 10 Oct 2026)

Drafted by the mental-performance agent. Clinician review before public launch.


I read CLAUDE.md, the wellbeing plan sections you named (§4, §5, §8, §10 Phase 2, and the Reset pacer direction), `src/core/data/skills.ts` (RESET_PATTERN, WIND_DOWN_ITEMS), `src/core/domain/pacer.ts`, `src/screens/mind/Pacer.tsx`, `src/screens/mind/resetCopy.ts`, `src/screens/mind/copy.ts` (WIND_DOWN, SHARED) and `src/screens/mind/WindDownScreen.tsx`. I didn't write any files. The three scripts are in full below for you to save to `/home/user/leanplan/docs/plans/wellbeing-audio-scripts.md`.

---

### 0. Two things to settle before Benn generates anything

**1. ElevenLabs break tags can't keep time with the pacer by themselves.**
- ElevenLabs' docs say `<break time="x.xs" />` only goes up to **3 s**.
- It only works on Multilingual v2, Flash v2 and Flash v2.5. **Eleven v3 ignores it** and uses `[pause]` tags instead.
- The docs also warn that many break tags in one generation can make the voice speed up or add noise and artefacts.
- A Reset breath is exactly 10 s (3 s in, 1 s in again, 6 s out; RESET_PATTERN, `placeholder: false`). Over 14 to 30 breaths, small differences in how long each spoken word takes add up to seconds of drift.

So there are two ways to make the tracks:
- **Method A (recommended for the timed breathing sections):** generate the cue words and the extra lines as separate clips. Lay them out in an audio editor (Audacity, GarageBand, Logic, Descript) on a fixed 10 s grid, using the timestamps below. This is exact.
- **Method B (fallback, or for a quick preview):** paste the break-tagged text below in chunks of 3 to 5 breaths at a time. Check it against the pacer running on screen and trim in the editor.

The untimed sections (introductions, settling, closing, all of Wind down) can be pasted as they are. Long silences marked `[SILENCE n s]` should be added in the editor, not with chains of break tags.

**2. Build points for the caller (these need Benn's approval and a design board, per CLAUDE.md):**
- **Track lengths don't match Reset's lengths.** Reset offers 1, 2 and 5 min (RESET_LENGTHS). The tracks are about 3 min and 7.5 min. Either the audio tracks become their own choice on a board, or the lengths are changed to fit.
- **Let the audio drive the pacer.** Calling `pacerAt(pattern, (audio.currentTime - track.breathStart) * 1000, breaths / 6)` means pausing, buffering and seeking can never knock the voice and the sphere out of step. A separate timer would drift. Each track needs a `breathStart` offset and a breath count stored next to it in `skills.ts`, with the source given as for the timings.
- **"And in again" has to fit in 1 s.** At speed 0.9 that clip may run to about 1.0 to 1.1 s. Start it at +2.9 s, or speed up that one clip slightly, so "Breathe out" still starts on +4.0 s. Don't change the word: it has to match what's on screen.
- **Offline and background play.** Audio isn't on the offline path, so a track that hasn't been cached needs a connection. Logging must never wait on it. Whether audio keeps playing on a locked screen in an iOS PWA isn't reliable, so test it on a device. Bump the service-worker `CACHE` name if any audio is shipped in `public/`.

---

### 1. ElevenLabs settings (suggested)
- **Model:** Multilingual v2 (break tags supported). Not v3.
- **Speed:** about 0.9. **Stability:** about 70%. **Style exaggeration:** 0. **Similarity:** default.
- **Voice:** a calm British English voice. Which voice and gender is Benn's choice. The script itself is gender-neutral.
- **Cue clips:** generate 3 takes each of "Breathe in.", "And in again." and "Breathe out." Keep the warmest take of each, cut the silence at the start of each clip, and use the same take every time so the cues sound consistent.
- **Pronunciation:** "Tali" is never spoken, so there's nothing to check there.
- **Transcripts:** the transcript is the script with the tags and the [bracketed] notes taken out.

---

### 2. Track 1: Reset, short (about 3 min 10 s)

**Transcript intro (one line):** Reset, about 3 minutes: a spoken guide to slow breathing, with a breath in, a small second breath in and a long breath out, in time with the circle on screen.

**Structure:** introduction 0:00 to 0:30 · timed breathing 0:30.0 to 2:50.0 (14 breaths of 10 s) · close 2:50 to about 3:10. `breathStart` = 30 s.

**Grid for every timed breath n (Method A):** start t = 30 + 10 × (n − 1) s.
- "Breathe in." at t + 0.0
- "And in again." at t + 3.0 (or t + 2.9)
- "Breathe out." at t + 4.0
- Any extra line starts at about t + 5.5 and must finish by t + 9.6.

**Introduction (0:00 to 0:30), paste as is, then pad with silence to 0:30.0:**
```
This is Reset. A few minutes of slow breathing. <break time="1s" />
Sit, stand or lie down, however is comfortable. Eyes open is fine. <break time="1s" />
The pattern is a breath in through your nose, if that's comfortable, then a small second breath in on top, then a long, slow breath out. <break time="1.5s" />
Stop any time. If you feel dizzy or uncomfortable, breathe normally. <break time="1.5s" />
We'll start on the next breath in. <break time="2s" />
```

**Timed breathing (0:30 to 2:50).**
- Method B assumes each cue takes about 0.8 s to say.
- A plain breath in break tags (10.0 s): `Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />`
- A breath with an extra line: `Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> [EXTRA] <break time="Xs" />`
  - X = 4.5 minus how long the extra takes to say. Measure each take and adjust.

```
[B1, 0:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B2, 0:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Slowly, all the way out. <break time="2.8s" />
[B3, 0:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Let your shoulders drop, if you like. <break time="2.3s" />
[B4, 1:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B5, 1:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Long and easy. <break time="3.3s" />
[B6, 1:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B7, 1:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Keep this pace, or breathe normally. Either is fine. <break time="1.5s" />
[B8, 1:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B9, 1:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B10, 2:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Let the breath out be the longest part. <break time="2.2s" />
[B11, 2:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B12, 2:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B13, 2:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> One more after this. <break time="3s" />
[B14, 2:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> All the way out. <break time="3.2s" />
```

**Close (2:50 to about 3:10):**
```
And breathe normally now. <break time="2s" />
Take a moment before you carry on. <break time="2s" />
That's Reset. Come back to it whenever you like.
```
(The last line matches the app's `RESET.comeBack`.)

---

### 3. Track 2: Reset, longer (about 7 min 30 s)

**Transcript intro (one line):** Reset, about 7 minutes: a few minutes to settle, then slow breathing with a breath in, a small second breath in and a long breath out, in time with the circle on screen, and a gentle return at the end.

**Structure:** settling 0:00 to 1:30 · timed breathing 1:30.0 to 6:30.0 (30 breaths) · return 6:30 to about 7:30. `breathStart` = 90 s. Breath n starts at t = 90 + 10 × (n − 1) s. The grid is the same as Track 1.

**Settling (0:00 to 1:30), then pad with silence to 1:30.0:**
```
This is Reset. About seven minutes of slow breathing, with some time to settle first. <break time="1.5s" />
Find a position that's comfortable. Sitting, standing or lying down all work. Eyes open is fine. <break time="2s" />
Stop any time. If you feel dizzy or uncomfortable, breathe normally. <break time="2s" />
For a moment, let your breath do whatever it's already doing. No need to change it yet. <break time="3s" />
[SILENCE 6 s]
If your shoulders have crept up, let them drop a little. <break time="3s" />
If your jaw is tight, let it soften. <break time="3s" />
Let your hands rest wherever they're comfortable. <break time="3s" />
[SILENCE 6 s]
Here's the pattern. A breath in through your nose, if that's comfortable. Then a small second breath in on top. Then a long, slow breath out. <break time="2s" />
The words are on screen too, if you'd like to follow along there. <break time="2s" />
We'll start on the next breath in. <break time="2s" />
```

**Timed breathing (1:30 to 6:30).** Plain breaths use the same 10 s break-tag line as Track 1. Extras follow the same rule.
```
[B1, 1:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B2, 1:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Slowly, all the way out. <break time="2.8s" />
[B3, 1:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Let your shoulders drop, if you like. <break time="2.3s" />
[B4, 2:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B5, 2:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Long and easy. <break time="3.3s" />
[B6, 2:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B7, 2:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B8, 2:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> If your mind wanders, that's normal. <break time="2.3s" />
[B9, 2:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Come back to the words when you notice. <break time="2.1s" />
[B10, 3:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B11, 3:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B12, 3:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Keep this pace, or breathe normally. Either is fine. <break time="1.5s" />
[B13, 3:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B14, 3:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B15, 3:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> About halfway. <break time="3.3s" />
[B16, 4:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B17, 4:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B18, 4:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Slowly, all the way out. <break time="2.8s" />
[B19, 4:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B20, 4:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Let the breath out be the longest part. <break time="2.2s" />
[B21, 4:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B22, 5:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B23, 5:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Long and easy. <break time="3.3s" />
[B24, 5:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B25, 5:30] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> Five more breaths. <break time="3s" />
[B26, 5:40] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B27, 5:50] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B28, 6:00] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="3s" /> <break time="2.2s" />
[B29, 6:10] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> One more after this. <break time="3s" />
[B30, 6:20] Breathe in. <break time="2.2s" /> And in again. <break time="0.2s" /> Breathe out. <break time="0.7s" /> All the way out. <break time="3.2s" />
```

**Return (6:30 to about 7:30):**
```
And let your breathing go back to its own rhythm. <break time="3s" />
[SILENCE 5 s]
Notice what's around you. The surface under you, and the sounds in the room. <break time="3s" />
[SILENCE 4 s]
Move your hands and feet a little, if you like. <break time="3s" />
Take your time before you carry on. <break time="2s" />
That's Reset. Come back to it whenever you like.
```

---

### 4. Track 3: Wind down (about 9 min)

**Transcript intro (one line):** Wind down, about 9 minutes: a spoken guide for the end of the day, with softer light, a few slow breaths and time to settle, then putting the phone down.

This track isn't tied to the pacer. Its breathing is a plain slow breath (about 4 s in, 6 s out). I chose that on purpose: Reset is already its own step in the routine, and a simple pattern suits the evening. If Benn would rather match Reset's pattern, I can redo this part.

What this script deliberately avoids:
- **Hypnosis-style language:** no "deeper", "heavier", "drifting", "sleepy", "my voice", counting down, or "you are becoming".
- **Sleep promises.**
- **Stimulus-control advice** (for example "get up if you can't sleep"). That is CBT-I and is out of scope under §4.1 and §8.1.
- **Caffeine and alcohol:** the caffeine step belongs earlier in the day, and either topic at night risks moralising.

**Opening (0:00 to 1:00):**
```
This is Wind down. About nine minutes for the end of the day. <break time="1.5s" />
There's nothing to get right here. Do as much or as little as you like, and stop any time. <break time="2s" />
If you're driving, or doing anything that needs your full attention, save this for later. <break time="2s" />
Sit or lie down, wherever you'd like to be. Eyes open or closed, whichever feels better. <break time="3s" />
[SILENCE 8 s]
Let's start with the room around you. <break time="2s" />
```

**The room (1:00 to 2:30):**
```
If the main light is on, you might switch to a lamp, or turn things down a little. Softer light suits the evening. <break time="2s" />
If you'd like to do that now, pause this and come back. Or leave it for later. <break time="3s" />
[SILENCE 6 s]
If there's anything you want ready for the morning, you could set it out now, or simply decide where it'll be. <break time="3s" />
[SILENCE 6 s]
If there's a screen you don't need, you could switch it off or move it out of reach. This phone can stay with you until the guide finishes. <break time="3s" />
[SILENCE 10 s]
```

**What's on your mind (2:30 to 3:30):**
```
Sometimes the day leaves a few things running round your head. <break time="2s" />
If something's there, you could write it down, with one small next step for each. Paper works, or Unload in the app. <break time="2s" />
Once it's written down, it can wait until tomorrow. <break time="2s" />
If you'd like to write now, pause this and come back when you're ready. <break time="2s" />
[SILENCE 15 s]
```

**Slow breathing (3:30 to 6:00):**
```
Now a few slow breaths. Breathe in through your nose, if that's comfortable, and let the breath out be a little longer than the breath in. <break time="2s" />
If you feel dizzy or uncomfortable, breathe normally. <break time="2s" />
I'll guide the first few. <break time="2s" />
```
Eight guided breaths of about 10 s each (3:50 to 5:10). In the editor, place each "Breathe in." 10 s apart and each "And out, slowly." 4 s after its "Breathe in.". This part isn't synced, so break tags are fine here, in two chunks of four.
```
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Breathe in. <break time="3s" /> And out, slowly. <break time="3s" /> <break time="1.8s" />
Carry on at your own pace, for as long as you like. <break time="2s" />
[SILENCE 40 s]
```

**Settling the body (6:00 to 8:00):**
```
Now let your body settle, a little at a time. Skip anything that doesn't feel right for you. <break time="3s" />
Notice your shoulders. If they've crept up, let them drop. <break time="3s" />
[SILENCE 4 s]
Let your jaw soften. Your teeth don't need to touch. <break time="3s" />
[SILENCE 4 s]
Let your hands rest, open or closed, wherever they're comfortable. <break time="3s" />
[SILENCE 4 s]
Notice where you're supported, by the bed, the chair or the floor. Let it take your weight. <break time="3s" />
[SILENCE 5 s]
Wriggle your toes, then let your feet be still. <break time="3s" />
[SILENCE 4 s]
If any other spot feels tight, you could move it a little, stretch it gently, or leave it be. <break time="3s" />
[SILENCE 8 s]
There's nothing else to do for a moment. <break time="2s" />
[SILENCE 20 s]
```

**Close (8:00 to about 9:00):**
```
That's the end of the guide. <break time="2s" />
If you'd like, put your phone down now, face down or somewhere out of reach. The sound will stop on its own. <break time="2s" />
Then carry on with a quiet evening, or head to bed when you're ready. <break time="2s" />
Goodnight.
```
After "Goodnight", let the bed (if any) fade out over about 15 to 20 s. No chime and no end sound.

---

### 5. The AI-voice label for the app

- **Next to the play control, visible before playing:** "Voice generated with AI". This is plain and accurate.
  - If a Suno bed is used: **"Voice and music generated with AI"**.
- **Transcript footer:** "The voice in this track was generated with AI from a script written by the Tali team." Naming ElevenLabs is optional; Benn and compliance decide.
- Don't say "reviewed by a clinician" or anything similar unless that review has actually happened.
- Also put the disclosure in the audio file's metadata (the comment or ID3 tag), and keep any provenance marks the vendors embed. Under Art. 50(2), the providers (ElevenLabs, Suno) are the ones who must machine-mark their output.
- **What's uncertain:**
  - Art. 50(4) (deep fakes) puts disclosure duties on deployers. A generic synthetic voice reading our own script probably isn't a deep fake, so the label may be good practice rather than a strict legal duty.
  - Art. 50 applies from 2 Aug 2026, and the EU AI Act reaches the app only for EU users.
  - The `compliance` agent should confirm both points, and add ElevenLabs and Suno as content vendors in the register (`docs/compliance/README.md`). No user data goes to either, so the privacy policy probably doesn't change, but compliance should confirm that too.

### 6. Optional Suno bed

- **Voice-only should be the default.** Offer the bed as a choice or leave it out: some people find music distracting, and voice-only is easier to follow.
- **Instrumental only:** use Suno's Instrumental setting, with no lyrics and no vocal sounds.
- **Feel:**
  - beatless and without rhythm, so nothing competes with the 10 s breath;
  - a slow, evolving warm pad with little dynamic range;
  - no drums, no clear melody or hooks, no sudden changes, no risers, no bells or chimes.
- **If Suno asks for a tempo:** about 60 BPM. 60 BPM fits the 10 s breath (10 beats a breath), but no audible beat is safest.
- **Style prompt idea for Reset:** "ambient, beatless, soft warm synth pad, slowly evolving, no drums, no melody, no vocals, calm, minimal, low dynamics".
- **Wind down:** the same prompt, but lower, darker and sparser ("deep soft pad, very sparse, gentle, no high frequencies").
- **Mix:**
  - voice at about −16 LUFS integrated;
  - bed about 18 to 22 dB below the voice, low enough that a listener could easily ignore it;
  - fade in over about 5 s and out over 15 to 20 s;
  - if the Suno clip is shorter than the track, loop it with long crossfades and no audible seam.
- **No claims:** no "binaural beats", "432 Hz", "sleep frequencies" or anything similar, in the app or in marketing.
- **Licences:** generate on paid plans of both services. The free tiers of both have commercial-use limits, and Suno's terms changed in 2025, so check the current terms when generating.

---

### 7. How the tracks serve the hierarchy, and how to measure them
- **Why:** slow breathing and a calmer evening are upstream inputs to sleep. Sleep in turn affects appetite regulation, cravings and next-day training quality (§4, §5).
- **What the evidence covers:** Balban et al. 2023 (Cell Rep Med, about 110 people, one month, self-paced cyclic sighing) supports the Reset pattern, with moderate confidence. Nothing has tested the voiced version, and the Wind down bundle as a whole is untested (moderate confidence in the parts only).
- **What to measure (privately, never shown as streaks or completion rates):**
  - repeat use of the audio compared with the silent pacer;
  - how often people stop early;
  - whether nights after Wind down are more often rated OK or Good on the existing check-in. Report this with "often", never "because".
  - next-day check-in and logging rates, compared with the Phase 1 baseline (§11).

---

### 8. Flags for the clinician review before public launch
1. **Breathing pattern and length.**
   - The pattern runs for 5 min in the long track: about 6 breaths a minute with a double breath in.
   - The safety line is present at the start of each track, but nowhere after it.
   - Ask the reviewer whether to add a general line on the track screen such as "If you have a health condition that affects your breathing, check with a health professional first". There's a tension: that line could read as targeting a condition (§8.1). The clinician and compliance should choose the wording together.
2. **Breath focus and body attention can unsettle some people.** Farias et al. 2020 found about 8.3% of people report adverse effects from meditation-style practice. Ask the reviewer to check:
   - the invitation to close eyes in Wind down;
   - the body-settling section;
   - the "If your mind wanders, that's normal" line in the long Reset, which edges towards meditation framing (an option is to cut B8 and B9's extra lines).
   - Every one of these already has a "skip anything" or "if you like" option.
3. **Sleep wording.** The script makes no sleep promise and gives no stimulus-control advice. The GP signpost (`WIND_DOWN.gp`) and "Need support now?" must sit on the audio screen and the transcript, not in the voice.
4. **Age assessment first.** The DPIA's "likely to be accessed by children" assessment (register item 21) is due **before Phase 2** (§8.2.5). Evening audio appeals more to teenagers than calorie tracking does. The scripts avoid any words aimed at children or teenagers, but the assessment is still owed.
5. **ASA/CAP.** No store, website or in-app line may say the audio "reduces stress", "helps you sleep" or "calms anxiety". Describe the activity only (§8.1).
6. **Gentle mode and eating.** None of the scripts mention food, hunger or bodies in an appearance sense. Keep it that way: the audio is never offered as a way to manage hunger (§5).

### What's uncertain
- **How exactly the break tags behave:** whether two tags in a row add up, and how long each cue takes to say for the chosen voice. That's why I recommend Method A.
- **Background playback in an iOS PWA.**
- **Whether the AI label is strictly required for EU users or just good practice** (section 5).
- **The 4 s in, 6 s out timing in Wind down** is my choice, not a sourced value. Record it as a product choice, the same way RESET_PATTERN's source is recorded.

**Relevant files:** `/home/user/leanplan/src/core/data/skills.ts` (RESET_PATTERN, RESET_LENGTHS, WIND_DOWN_ITEMS), `/home/user/leanplan/src/core/domain/pacer.ts`, `/home/user/leanplan/src/screens/mind/Pacer.tsx`, `/home/user/leanplan/src/screens/mind/resetCopy.ts`, `/home/user/leanplan/src/screens/mind/copy.ts`, `/home/user/leanplan/src/screens/mind/WindDownScreen.tsx`, `/home/user/leanplan/docs/plans/wellbeing-plan.md`, `/home/user/leanplan/docs/compliance/README.md`.

Sources:
- [ElevenLabs: pauses (break tag, up to 3 s; instability warning)](https://elevenlabs.io/docs/product/prompting/pauses)
- [ElevenLabs help: pauses and SSML with the API (not supported on v3)](https://elevenlabs.io/docs/help-center/technical/do-pauses-and-ssml-phoneme-tags-work-with-the-api)
- [ElevenLabs help: how to add pauses (models)](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-can-i-add-pauses)
- Balban et al. 2023, Cell Rep Med 4:100895; Farias et al. 2020 (as cited in wellbeing-plan.md §5)