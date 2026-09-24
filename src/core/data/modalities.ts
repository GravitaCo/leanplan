import type { Effort, Modality } from '@/core/types'

export const MODALITIES: Modality[] = ['strength', 'calisthenics', 'cardio', 'yoga', 'pilates', 'mobility']

export const MODALITY_LABEL: Record<Modality, string> = {
  strength: 'Weights',
  calisthenics: 'Bodyweight',
  cardio: 'Cardio',
  yoga: 'Yoga',
  pilates: 'Pilates',
  mobility: 'Mobility',
}

/**
 * MET by effort for the non-cardio modalities, from the 2024 Adult Compendium of Physical
 * Activities (Herrmann et al. 2024; codes checked by nutrition-accuracy, workout plan §2.9).
 * Easy uses the light code, Moderate (or no answer) the moderate code, Hard and Very hard the
 * vigorous code: that mapping is a judgement call. Where the Compendium has no light or
 * vigorous code, the moderate value is used. Cardio uses CARDIO_MET by activity instead.
 */
export const MODALITY_MET: Record<Exclude<Modality, 'cardio'>, { light: number; moderate: number; vigorous: number; src: string }> = {
  strength: { light: 3.5, moderate: 3.5, vigorous: 6.0, src: '02054 (3.5) resistance training, multiple exercises, 8–15 reps; 02050 (6.0) power lifting or body building, vigorous; no light code' },
  calisthenics: { light: 2.8, moderate: 3.8, vigorous: 7.5, src: '02024 (2.8) calisthenics, light; 02022 (3.8) moderate; 02020 (7.5) vigorous' },
  yoga: { light: 2.3, moderate: 2.7, vigorous: 4.0, src: '02175 (2.3) yoga, general; 02185 (2.7) vinyasa; 02160 (4.0) power' },
  pilates: { light: 1.8, moderate: 2.8, vigorous: 2.8, src: '02103 (1.8) pilates, traditional, mat; 02105 (2.8) general; no vigorous code' },
  mobility: { light: 2.3, moderate: 2.3, vigorous: 2.3, src: '02101 (2.3) stretching, mild; the only stretching code' },
}

/** Minutes assumed when a session has none (judgement calls, unvalidated; strength and cardio as before). */
export const DEFAULT_MINS: Record<Modality, number> = { strength: 45, cardio: 25, calisthenics: 30, yoga: 30, pilates: 30, mobility: 10 }

export const EFFORTS: [Effort, string][] = [['easy', 'Easy'], ['moderate', 'Moderate'], ['hard', 'Hard'], ['very-hard', 'Very hard']]
