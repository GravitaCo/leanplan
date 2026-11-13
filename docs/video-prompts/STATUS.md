# Demo clips: where every exercise stands

The one place to check what is made, what is in progress and what is waiting on a decision. Claude
updates the top half by hand as work moves; the tables at the bottom come from the app's data
(`npm run video:status`), so they can't drift.

## How a clip is made now (Nov 2026)

1. **Reference image** from Benn or Sara: the machine and the position, ideally from the camera angle wanted.
2. **Still first** (Nano Banana 2, image to image, about 20 credits): the reference for the machine and
   position, plus the studio reference (OpenArt upload `upload:VM2QcdBjSanV2CiYoaOj`, a frame from the
   seated dumbbell press clip) for the room and light. **Women demonstrators only for now.** Even warm
   greige wall (about #C0B6A9), soft shadowless light, all-black kit with no branding, ordinary builds.
   Benn or Sara approve the still before any video.
3. **Video** (Seedance 2.5, image to video, 10 s, 720p, no audio, about 1,300 credits): the approved
   still as both first and last frame, so the loop is seamless. The prompt only describes the movement.
4. **Check**: Claude pulls frames and checks the movement is the right exercise, then Benn or Sara pass it.
5. **Bunny**: Claude uploads it with the exercise's name (`Exercise-Name-Woman.mp4`), times the reps
   from the footage and adds it to the app on the working branch. `ship-critic` before main.

No retake runs without Benn's or Sara's OK.

## In progress

| Exercise | Where it is | Next step |
|---|---|---|
| Leg curl (`leg-curl`) | First clip came out as a leg extension. Benn sent a lying leg curl reference (face down on the bench, heels curl up towards the bottom). | Upload the reference, make a still, Benn approves, then the video. |
| Chest press (`chest-press`) | Still approved; the video's range was too short and jerky (`Kt2V32eNOqpzIeQCaxfH`). | Retake with a longer, smoother press: waiting on Benn's OK (1,300 credits). |
| Leg extension (`leg-extension`) | Already has a clip. The new one (Bunny `8dced0cb`, "Leg-Extension-Woman-v2") is in the new studio look and loops cleanly. | Benn to say whether it replaces the current clip. |
| Dumbbell bent-over row (`db-bent-over-row`) | On Bunny (`f234576f`), not in the app yet. Form is right; she looks muscular and barefoot. | Benn to say keep or retake. |
| Calf raise (`calf-raise`) | On Bunny (`cf4a1757`), not in the app yet. | Benn's yes on the cue wording "lower slowly until your heels are level (or a little below, if you're on a step)". |
| Inverted row, high bar, feet raised, cable crunch, cable fly, overhead triceps extension, Pallof press, straight-arm pulldown | Benn sent references in chat; not yet uploaded to OpenArt. | Upload the references; decisions on feet-raised row (bar not straps), cable fly (seated), triceps extension (dumbbell not band). |

## Dropped or unused on Bunny

- `8dced0cb` was uploaded as "Leg-Curl-Seated-Woman" but shows a leg extension; renamed (see above).
- `fa7d30b9` is titled "Leg-Curl-Woman" but is the app's current leg extension clip.

<!-- generated below: npm run video:status -->

## In the app (41)

| Exercise | id | Equipment | Seen in | Bunny |
|---|---|---|---|---|
| Barbell squat | `back-squat` | barbell | workout | 736acf7f |
| Leg press | `leg-press` | machine | plan | 7d511341 |
| Romanian deadlift (dumbbell or barbell) | `romanian-deadlift` | dumbbell, barbell | workout, plan | 9375b37c |
| Leg extension (machine) | `leg-extension` | machine | workout | fa7d30b9 |
| Plank | `plank` | none | workout | 451d5867 |
| Barbell bench press | `barbell-bench-press` | barbell | workout | df890da8 |
| Incline dumbbell press | `incline-db-press` | dumbbell | workout, plan | 01693135 |
| Dumbbell shoulder press (seated) | `db-shoulder-press` | dumbbell | workout, plan | 29092357 |
| Lateral raise | `lateral-raise` | dumbbell, cable | workout | 2f17ce31 |
| Triceps rope pushdown (cable) | `triceps-pushdown` | cable | workout | db9a8075 |
| Lat pulldown | `lat-pulldown` | machine, cable | workout, plan | 9d104b30 |
| Seated cable row | `seated-cable-row` | cable, machine | workout, plan | 8529995f |
| Chest-supported dumbbell row | `chest-supported-row` | dumbbell | workout | 344a03d7 |
| Face pull (cable) | `face-pull` | cable, band | workout, plan | 6d5a1fa4 |
| Biceps curl (barbell or dumbbell) | `biceps-curl` | barbell, dumbbell | workout | 67eda569 |
| Cable biceps curl | `cable-curl` | cable | - | c2c09c2c |
| Goblet squat | `goblet-squat` | dumbbell, kettlebell | plan | 97700dd2 |
| Dumbbell split squat | `db-split-squat` | dumbbell | plan | cf04a486 |
| Hip thrust | `hip-thrust` | barbell, dumbbell | plan | b3c11705 |
| Hip abduction (machine) | `hip-abduction-machine` | machine | - | 1a7e5fdb |
| Step-up | `step-up` | dumbbell, bodyweight | plan | 5690a1c0 |
| Dumbbell bench press | `db-bench-press` | dumbbell | plan | c3115e41 |
| One-arm dumbbell row | `one-arm-db-row` | dumbbell | plan | fb1a3be2 |
| Hammer curl | `hammer-curl` | dumbbell | - | f61a0b3b |
| Farmer carry | `farmer-carry` | dumbbell, kettlebell | plan | 8fd6dda5 |
| Incline push-up | `incline-push-up` | none | plan, warm-up | 0f94c2e0 |
| Sit to stand | `sit-to-stand` | none | plan | 5b34fdf0 |
| Bodyweight squat | `bodyweight-squat` | none | warm-up | b080db62 |
| Split squat | `split-squat` | none | plan | 31719b54 |
| Glute bridge | `glute-bridge` | none | workout, plan, warm-up | ffc84847 |
| Assisted dip | `assisted-dip` | band, machine | - | 0aba3c71 |
| Dip | `dip` | machine | - | 5fa5c55c |
| Side plank (knees) | `side-plank-knees` | none | plan | 8dde7844 |
| Bird-dog | `bird-dog` | none | plan | 28383feb |
| Cat–cow | `cat-cow` | none | workout, plan, warm-up | 8595906f |
| Chair pose | `chair-pose` | none | plan | a7471b0c |
| Tree pose | `tree-pose` | none | plan | 66fcb75a |
| March on the spot with arm swings | `march-on-the-spot` | none | workout, plan, warm-up | 013b8f18 |
| Shoulder rolls | `shoulder-rolls` | none | workout, plan, warm-up | abbffae3 |
| Half-kneeling hip flexor stretch | `half-kneeling-hip-flexor` | none | workout, plan | 13668949 |
| Knee to wall | `knee-to-wall` | none | plan, warm-up | e7138db7 |

## Still needed, seen in a workout, plan or warm-up (23)

| Exercise | id | Equipment | Seen in | Bunny |
|---|---|---|---|---|
| Calf raise | `calf-raise` | machine, dumbbell, bodyweight | workout |  |
| Cable crunch | `cable-crunch` | cable | workout |  |
| Dead bug | `dead-bug` | none | plan |  |
| Leg curl (machine) | `leg-curl` | machine | plan |  |
| Child's pose | `childs-pose` | mat | workout |  |
| Reclined figure four | `reclined-figure-four` | mat | workout |  |
| Lying knee rolls | `lying-knee-rolls` | none | workout |  |
| World's greatest stretch | `worlds-greatest-stretch` | none | warm-up |  |
| Hip 90/90 switch | `hip-90-90` | none | warm-up |  |
| Open book | `open-book` | none | workout, warm-up |  |
| Lying hamstring stretch | `supine-hamstring-stretch` | none | workout |  |
| Wall calf stretch | `wall-calf-stretch` | none | workout |  |
| Doorway chest stretch | `doorway-chest-stretch` | none | workout |  |
| Cross-body shoulder stretch | `cross-body-shoulder` | none | workout |  |
| Thread the needle | `thread-the-needle` | none | workout, warm-up |  |
| Band pull-apart | `band-pull-apart` | band | warm-up |  |
| Leg swings | `leg-swings` | none | warm-up |  |
| Arm circles | `arm-circles` | none | warm-up |  |
| Hip circles | `hip-circles` | none | warm-up |  |
| Inchworm | `inchworm` | none | warm-up |  |
| Wall slide | `scapular-wall-slide` | none | warm-up |  |
| Brisk walk | `cardio-walk` | none | workout |  |
| Easy walk | `cardio-easy-walk` | none | workout |  |

## Still needed, library only (99)

| Exercise | id | Equipment | Seen in | Bunny |
|---|---|---|---|---|
| Chest press (machine or dumbbell) | `chest-press` | machine, dumbbell | - |  |
| Cable fly | `cable-fly` | cable | - |  |
| Overhead triceps extension | `overhead-triceps-extension` | dumbbell, cable | - |  |
| Pallof press | `pallof-press` | cable, band | - |  |
| Kettlebell swing | `kb-swing` | kettlebell | - |  |
| Landmine press | `landmine-press` | barbell | - |  |
| Wall push-up | `wall-push-up` | none | - |  |
| Push-up | `push-up` | none | - |  |
| Decline push-up | `decline-push-up` | bench | - |  |
| Inverted row (high bar) | `inverted-row-high` | barbell, machine | - |  |
| Inverted row | `inverted-row` | barbell, machine | - |  |
| Band-assisted pull-up | `band-assisted-pull-up` | pull-up-bar | - |  |
| Negative pull-up | `negative-pull-up` | pull-up-bar | - |  |
| Chin-up | `chin-up` | pull-up-bar | - |  |
| Pull-up | `pull-up` | pull-up-bar | - |  |
| Bulgarian split squat | `bulgarian-split-squat` | bench | - |  |
| Reverse lunge | `reverse-lunge` | none | - |  |
| Single-leg glute bridge | `single-leg-glute-bridge` | none | - |  |
| Bodyweight hip thrust | `bw-hip-thrust` | bench | - |  |
| Side plank | `side-plank` | none | - |  |
| Hollow hold | `hollow-hold` | none | - |  |
| Hanging knee raise | `hanging-knee-raise` | pull-up-bar | - |  |
| Pike push-up (hands raised) | `incline-pike-push-up` | none | - |  |
| Pike push-up | `pike-push-up` | none | - |  |
| Pike push-up (feet raised) | `elevated-pike-push-up` | bench | - |  |
| Band overhead press | `band-overhead-press` | band | - |  |
| Standing dumbbell shoulder press | `standing-db-press` | dumbbell | - |  |
| Barbell overhead press | `barbell-overhead-press` | barbell | - |  |
| Doorway row | `doorway-row` | none | - |  |
| Lying T raise | `prone-t-raise` | none | - |  |
| Towel row | `towel-row` | none | - |  |
| Table row | `table-row` | none | - |  |
| Band seated row | `band-row` | band | - |  |
| Dumbbell bent-over row | `db-bent-over-row` | dumbbell | - |  |
| Inverted row (feet raised) | `feet-elevated-inverted-row` | barbell, machine | - |  |
| Lying towel pulldown | `lying-towel-pulldown` | none | - |  |
| Band lat pulldown | `band-lat-pulldown` | band | - |  |
| Straight-arm pulldown | `straight-arm-pulldown` | cable, band | - |  |
| Dumbbell pullover | `db-pullover` | dumbbell | - |  |
| Pause squat | `pause-squat` | none | - |  |
| Cossack squat | `cossack-squat` | none | - |  |
| Walking lunge | `walking-lunge` | none | - |  |
| Dumbbell Bulgarian split squat | `db-bulgarian-split-squat` | dumbbell | - |  |
| Bodyweight good morning | `good-morning-bw` | none | - |  |
| Single-leg Romanian deadlift | `sl-rdl-bw` | none | - |  |
| Single-leg Romanian deadlift (dumbbell) | `db-sl-rdl` | dumbbell | - |  |
| Band pull-through | `band-pull-through` | band | - |  |
| Trap-bar deadlift | `trap-bar-deadlift` | trap-bar | - |  |
| Suitcase carry | `suitcase-carry` | dumbbell, kettlebell | - |  |
| Side plank with leg lift | `side-plank-leg-lift` | none | - |  |
| Copenhagen plank (short lever) | `copenhagen-plank` | bench | - |  |
| Hanging leg raise | `hanging-leg-raise` | pull-up-bar | - |  |
| Step jacks | `step-jacks` | none | - |  |
| Mountain climber | `mountain-climber` | none | - |  |
| Squat thrust (no jump) | `squat-thrust` | none | - |  |
| Mountain pose | `mountain-pose` | none | - |  |
| Downward dog | `downward-dog` | mat | - |  |
| Dolphin pose | `dolphin` | mat | - |  |
| Low lunge | `low-lunge` | mat | - |  |
| Warrior 2 | `warrior-2` | none | - |  |
| Triangle pose | `triangle` | none | - |  |
| Bridge pose | `bridge-pose` | mat | - |  |
| Sphinx pose | `sphinx` | mat | - |  |
| Low cobra | `cobra` | mat | - |  |
| Seated forward fold (knees bent) | `seated-forward-fold` | mat | - |  |
| Lying twist | `supine-twist` | mat | - |  |
| Pigeon pose | `pigeon` | mat, yoga-props | - |  |
| Legs up the wall | `legs-up-the-wall` | none | - |  |
| Rest pose (savasana) | `rest-pose` | mat | - |  |
| Half sun salutation | `half-sun-salutation` | none | - |  |
| Sun salutation A | `sun-salutation-a` | mat | - |  |
| Sun salutation B | `sun-salutation-b` | mat | - |  |
| Pelvic curl | `pelvic-curl` | mat | - |  |
| Toe taps | `toe-taps` | mat | - |  |
| The hundred | `hundred` | mat | - |  |
| Half roll back | `half-roll-back` | mat | - |  |
| Roll-up | `roll-up` | mat | - |  |
| Single-leg stretch | `single-leg-stretch` | mat | - |  |
| Double-leg stretch | `double-leg-stretch` | mat | - |  |
| Single-leg circles | `single-leg-circles` | mat | - |  |
| Spine stretch forward | `spine-stretch-forward` | mat | - |  |
| Swan prep | `swan-prep` | mat | - |  |
| Swimming (lying face down) | `swimming` | mat | - |  |
| Side-lying leg series | `side-lying-leg-series` | mat | - |  |
| Clam | `clam` | mat, band | - |  |
| Saw | `saw` | mat | - |  |
| Teaser | `teaser` | mat | - |  |
| Neck side stretch | `neck-side-stretch` | none | - |  |
| Supported deep squat | `supported-deep-squat` | none | - |  |
| Incline walk | `cardio-incline-walk` | none | - |  |
| Run | `cardio-run` | none | - |  |
| Cycle (outdoors) | `cardio-cycle` | none | - |  |
| Stationary bike | `cardio-bike` | cardio-machine | - |  |
| Rowing machine | `cardio-row` | cardio-machine | - |  |
| Swim | `cardio-swim` | none | - |  |
| Cross-trainer | `cardio-cross-trainer` | cardio-machine | - |  |
| Stair climber | `cardio-stair` | cardio-machine | - |  |
| Jump rope | `cardio-jump-rope` | none | - |  |
| Intervals | `cardio-intervals` | cardio-machine | - |  |
