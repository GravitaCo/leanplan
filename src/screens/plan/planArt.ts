/**
 * Each Tilo plan's photograph (generated to match the demo footage); own plans have none. Shared by
 * the web and native Plan, Train and onboarding screens. On the web an import is the asset's URL;
 * on native, Metro's asset id for <Image source>. Kept apart from planModel.ts so the unit tests
 * (which bundle for Node) never import an image.
 */
import pureMuscle from '@/assets/plans/pure-muscle-growth.jpg'
import strongerAge from '@/assets/plans/stronger-with-age.jpg'
import fullBody from '@/assets/plans/full-body-system.jpg'

export type PlanArt = typeof pureMuscle

const ART: Record<string, PlanArt> = {
  'pure-muscle-growth': pureMuscle,
  'stronger-with-age': strongerAge,
  'full-body-system': fullBody,
}
export const planArt = (templateId: string | undefined): PlanArt | undefined => (templateId ? ART[templateId] : undefined)

/** Every plan photograph, for warming the web's cache. */
export const allPlanArt = (): PlanArt[] => Object.values(ART)
