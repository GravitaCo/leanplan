import type { WorkoutTemplate, WorkoutType } from '@/core/types'
import { DEMOS } from './media'

/**
 * Push/Pull/Legs split. Ordered across the week as Legs → Push → Pull so back-to-back
 * sessions never train the same muscle — sore areas recover while you work others.
 */
export const WORKOUTS: Record<string, WorkoutTemplate> = {
  "Legs": {
    "title": "Legs & Core",
    "ex": [
      {
        "id": "back-squat", "n": "Barbell squat",
        "t": "3 × 10–12",
        "cue": "Set the bar in a rack at about chest height, with the safety arms just below your lowest squat. Rest the bar on the muscles of your upper back, not your neck, feet shoulder-width and toes slightly out. Sit down slowly between your heels with your chest up and knees tracking over your toes, as low as you can keep a flat back and heels down. Pause, then push through mid-foot to stand. Don't lock the knees hard at the top.",
        "video": DEMOS.barbellSquat
      },
      {
        "id": "romanian-deadlift", "n": "Romanian deadlift (dumbbell or barbell)",
        "t": "3 × 10",
        "cue": "Soft knees, push hips back, weight stays close to your legs. Lower only as far as your back stays long and flat, usually to just below the knees or mid-shin. Feel the hamstring stretch, then stand up by squeezing the glutes.",
        "video": DEMOS.romanianDeadlift
      },
      {
        "id": "leg-extension", "n": "Leg extension (machine)",
        "t": "2–3 × 12",
        "cue": "Pad on your lower shins. Straighten the legs smoothly, squeeze the thigh at the top, lower under control. No kicking or swinging."
      },
      {
        "id": "calf-raise", "n": "Seated or standing calf raise",
        "t": "3 × 12–15",
        "cue": "Push up onto the balls of your feet as high as you can, pause at the top, lower slowly for a full stretch. Don't bounce."
      },
      {
        "id": "plank", "n": "Plank",
        "t": "3 × 20–40 sec",
        "cue": "Elbows under shoulders, straight line from head to heels, squeeze glutes. Stop the set when the hips sag."
      }
    ]
  },
  "Push": {
    "title": "Push · chest / shoulders / triceps",
    "ex": [
      {
        "id": "barbell-bench-press", "n": "Barbell bench press",
        "t": "3 × 10–12",
        "cue": "Set the rack's safety arms just below your chest, or have someone spot you. Shoulder blades back and down, feet flat, grip a little wider than your shoulders. Lower the bar under control to your lower chest, pause lightly without bouncing, then press up to straight arms over your shoulders. If a rep stalls, lower the bar onto the safety arms.",
        "video": DEMOS.barbellBench
      },
      {
        "id": "incline-db-press", "n": "Incline dumbbell press",
        "t": "3 × 10–12",
        "cue": "Bench at ~30°. Lower to the upper chest, press up and slightly together. Control the way down."
      },
      {
        "id": "db-shoulder-press", "n": "Dumbbell shoulder press (seated)",
        "t": "3 × 10–12",
        "cue": "Start at ear height. Press up without arching the lower back, keep ribs down. Stop a couple of reps before you couldn't do another."
      },
      {
        "id": "lateral-raise", "n": "Lateral raise",
        "t": "2–3 × 12–15",
        "cue": "Slight bend in the elbows, raise to shoulder height leading with the elbows. Light weight, no momentum."
      },
      {
        "id": "triceps-pushdown", "n": "Triceps rope pushdown (cable)",
        "t": "2–3 × 12–15",
        "cue": "Elbows tucked at your sides and still. Push the rope down until the arms are straight, spread it slightly at the bottom. Only the forearms move."
      }
    ]
  },
  "Pull": {
    "title": "Pull · back / rear delts / biceps",
    "ex": [
      {
        "id": "lat-pulldown", "n": "Lat pulldown",
        "t": "3 × 10–12",
        "cue": "Lean back slightly, pull the bar to your upper chest, lead with the elbows. No yanking or swinging."
      },
      {
        "id": "seated-cable-row", "n": "Seated cable row",
        "t": "3 × 10–12",
        "cue": "Sit tall, slight knee bend. Pull the handle to your lower ribs, squeeze the shoulder blades. Don't heave with your back."
      },
      {
        "id": "chest-supported-row", "n": "Chest-supported dumbbell row",
        "t": "3 × 10",
        "cue": "Chest on an inclined bench, let the dumbbells hang. Row them to your hips, squeezing the shoulder blades. Keep your chest on the pad, no jerking."
      },
      {
        "id": "face-pull", "n": "Face pull (cable)",
        "t": "2–3 × 15", "restSec": 60,
        "cue": "Rope at head height. Pull it towards your forehead, elbows high and wide, squeeze the rear shoulders. Light weight, slow."
      },
      {
        "id": "biceps-curl", "n": "Biceps curl (barbell or dumbbell)",
        "t": "2–3 × 12",
        "cue": "Elbows pinned to your sides, curl without swinging the body. Lower slowly. Don't let the elbows drift forward.",
        "video": DEMOS.barbellCurl
      },
      {
        "id": "cable-crunch", "n": "Cable crunch (or dead bug)",
        "t": "3 × 12–15",
        "cue": "Cable crunch: kneel, crunch the ribs toward the hips, round the spine. Dead bug: lower opposite arm + leg slowly while pressing your lower back into the floor."
      }
    ]
  },
  "Cardio": {
    "title": "Light cardio",
    "ex": [
      {
        "id": "cardio-walk", "n": "Brisk walk / incline treadmill / bike",
        "t": "20–30 min",
        "cue": "Conversational pace. You can talk but not sing. Build up the minutes before the speed."
      }
    ]
  }
}

export const LIFTS: WorkoutType[] = ["Legs","Push","Pull"]

/**
 * Gentle swaps offered on a tough day instead of the planned session (workout plan §0.2). Mat
 * only, nothing face-down, nothing from the plan's "left out on purpose" list. The mobility
 * routine is about 10 minutes including changeovers (an estimate: ~520 s of moves + ~90 s).
 */
export const SWAPS: Record<'mobility' | 'walk', WorkoutTemplate & { mins: string; cardioType: string; note?: string }> = {
  "mobility": {
    "title": "10-minute mobility · hips, back and shoulders",
    "mins": "10",
    "cardioType": "Mobility",
    "note": "Move within what feels comfortable, and skip anything that hurts.",
    "ex": [
      { "id": "march-on-the-spot", "n": "March on the spot with arm swings", "t": "1 × 60 sec",
        "cue": "Stand tall and march at an easy pace, swinging your arms loosely. Let your breathing settle. This is a warm-up, not cardio, so keep it relaxed rather than fast." },
      { "id": "shoulder-rolls", "n": "Shoulder rolls", "t": "10 each way",
        "cue": "Stand or sit tall with your arms relaxed. Lift your shoulders up to your ears, roll them back and down, then reverse the direction. Keep it slow and smooth, and don't shrug up hard or rush." },
      { "id": "cat-cow", "n": "Cat–cow", "t": "1 × 10 slow reps",
        "cue": "On hands and knees, with hands under shoulders and knees under hips. Breathe out and round your back towards the ceiling, then breathe in and let your belly drop gently as you look slightly forward. Move within a comfortable range, not to your limit. If your wrists complain, rest on your forearms." },
      { "id": "half-kneeling-hip-flexor", "n": "Half-kneeling hip flexor stretch", "t": "45 sec each side",
        "cue": "Kneel on one knee with the other foot in front, and fold the mat under the knee for padding. Tuck your tailbone under, then shift your hips forward until you feel a stretch at the front of the back hip. Keep your body upright and don't arch your lower back to go further. If kneeling is uncomfortable, do it standing in a long stride." },
      { "id": "supine-hamstring-stretch", "n": "Lying hamstring stretch", "t": "45 sec each side",
        "cue": "Lie on your back with both knees bent. Lift one leg and hold behind the thigh, then straighten the knee until you feel a gentle stretch along the back of the leg. Keep your head and lower back on the mat. Don't pull hard or yank the leg towards you." },
      { "id": "lying-knee-rolls", "n": "Lying knee rolls", "t": "8 each side",
        "cue": "Lie on your back with knees bent, feet flat and arms out wide. Let both knees lower slowly to one side, then bring them back through the middle to the other. Keep both shoulders on the mat and only go as far as feels easy. Move slowly, don't let the knees drop." },
      { "id": "glute-bridge", "n": "Glute bridge", "t": "2 × 10",
        "cue": "Lie on your back with knees bent and feet hip-width, close to your bottom. Press through your heels and lift your hips until they're in line with your knees and shoulders, squeeze your glutes, then lower slowly. Keep your weight on your upper back, not your neck, and don't over-arch at the top." }
    ]
  },
  "walk": {
    "title": "Easy walk",
    "mins": "15",
    "cardioType": "Easy walk",
    "ex": [
      { "id": "cardio-easy-walk", "n": "Easy walk", "t": "10–20 min",
        "cue": "Walk at a relaxed, conversational pace, one where you could chat in full sentences. Outside, indoors or on a flat treadmill all count. No need to speed up to make it 'worth it'. Easy is the point. Stop whenever you've had enough." }
    ]
  }
}

/** Any of these can be assigned to any weekday. */
export const SESSIONS = ["Legs","Push","Pull","Cardio","Rest"] as const

/** Default recurring weekly schedule, keyed by weekday (0 = Sun … 6 = Sat). */
export const DEFAULT_SCHEDULE: Record<number, WorkoutType | 'Rest'> = {"0":"Rest","1":"Legs","2":"Cardio","3":"Push","4":"Cardio","5":"Pull","6":"Cardio"}
