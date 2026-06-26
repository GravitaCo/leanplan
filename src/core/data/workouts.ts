import type { WorkoutTemplate, WorkoutType } from '@/core/types'

/**
 * Push/Pull/Legs split. Ordered across the week as Legs → Push → Pull so back-to-back
 * sessions never train the same muscle — sore areas recover while you work others.
 */
export const WORKOUTS: Record<string, WorkoutTemplate> = {
  "Legs": {
    "title": "Legs & Core",
    "ex": [
      {
        "n": "Leg press",
        "t": "3 × 10–12",
        "cue": "Feet shoulder-width on the platform. Lower until knees ~90°, keep your lower back on the pad. Push through mid-foot. Don't slam the knees straight at the top."
      },
      {
        "n": "Romanian deadlift (dumbbell or barbell)",
        "t": "3 × 10",
        "cue": "Soft knees, push hips back, weight stays close to your legs. Feel the hamstring stretch, stand up by squeezing the glutes. Keep the back flat, never rounded."
      },
      {
        "n": "Leg extension (machine)",
        "t": "2–3 × 12",
        "cue": "Pad on your lower shins. Straighten the legs smoothly, squeeze the thigh at the top, lower under control. No kicking or swinging."
      },
      {
        "n": "Seated or standing calf raise",
        "t": "3 × 12–15",
        "cue": "Push up onto the balls of your feet as high as you can, pause at the top, lower slowly for a full stretch. Don't bounce."
      },
      {
        "n": "Plank",
        "t": "3 × 20–40 sec",
        "cue": "Elbows under shoulders, straight line from head to heels, squeeze glutes. Stop the set when the hips sag."
      }
    ]
  },
  "Push": {
    "title": "Push · chest / shoulders / triceps",
    "ex": [
      {
        "n": "Chest press (machine or dumbbell)",
        "t": "3 × 10–12",
        "cue": "Handles level with mid-chest. Press smoothly, stop just short of locking the elbows. Lower under control for ~2 seconds."
      },
      {
        "n": "Incline dumbbell press",
        "t": "3 × 10–12",
        "cue": "Bench at ~30°. Lower to the upper chest, press up and slightly together. Control the way down."
      },
      {
        "n": "Dumbbell shoulder press (seated)",
        "t": "3 × 10–12",
        "cue": "Start at ear height. Press up without arching the lower back — keep ribs down. Stop short of failure."
      },
      {
        "n": "Lateral raise",
        "t": "2–3 × 12–15",
        "cue": "Slight bend in the elbows, raise to shoulder height leading with the elbows. Light weight, no momentum."
      },
      {
        "n": "Triceps rope pushdown (cable)",
        "t": "2–3 × 12–15",
        "cue": "Elbows tucked at your sides and still. Push the rope down until the arms are straight, spread it slightly at the bottom. Only the forearms move."
      }
    ]
  },
  "Pull": {
    "title": "Pull · back / rear delts / biceps",
    "ex": [
      {
        "n": "Lat pulldown",
        "t": "3 × 10–12",
        "cue": "Lean back slightly, pull the bar to your upper chest, lead with the elbows. No yanking or swinging."
      },
      {
        "n": "Seated cable row",
        "t": "3 × 10–12",
        "cue": "Sit tall, slight knee bend. Pull the handle to your lower ribs, squeeze the shoulder blades. Don't heave with your back."
      },
      {
        "n": "Chest-supported dumbbell row",
        "t": "3 × 10",
        "cue": "Chest on an inclined bench, let the dumbbells hang. Row them to your hips, squeezing the shoulder blades. Keep your chest on the pad — no jerking."
      },
      {
        "n": "Face pull (cable)",
        "t": "2–3 × 15",
        "cue": "Rope at head height. Pull it towards your forehead, elbows high and wide, squeeze the rear shoulders. Light weight, slow. Great for posture."
      },
      {
        "n": "Dumbbell biceps curl",
        "t": "2–3 × 12",
        "cue": "Elbows pinned to your sides, curl without swinging the body. Lower slowly. Don't let the elbows drift forward."
      },
      {
        "n": "Cable crunch (or dead bug)",
        "t": "3 × 12–15",
        "cue": "Cable crunch: kneel, crunch the ribs toward the hips, round the spine. Dead bug: lower opposite arm + leg slowly while pressing your lower back into the floor."
      }
    ]
  },
  "Cardio": {
    "title": "Light cardio",
    "ex": [
      {
        "n": "Brisk walk / incline treadmill / bike",
        "t": "20–30 min",
        "cue": "Conversational pace — you can talk but not sing. This keeps you well under the intensity that makes you feel sick, while still burning calories. Build up the minutes before the speed."
      }
    ]
  }
}

export const LIFTS: WorkoutType[] = ["Legs","Push","Pull"]

/** Any of these can be assigned to any weekday. */
export const SESSIONS = ["Legs","Push","Pull","Cardio","Rest"] as const

/** Default recurring weekly schedule, keyed by weekday (0 = Sun … 6 = Sat). */
export const DEFAULT_SCHEDULE: Record<number, WorkoutType | 'Rest'> = {"0":"Rest","1":"Legs","2":"Cardio","3":"Push","4":"Cardio","5":"Pull","6":"Cardio"}
