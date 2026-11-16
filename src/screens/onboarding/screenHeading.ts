/**
 * Marks a screen's heading in the onboarding wizard. When the screen changes, the wizard moves
 * focus to it, so VoiceOver and the keyboard start from the new heading (see `Onboarding`).
 */
export const SCREEN_H = { 'data-screen-h': '', tabIndex: -1 } as const
