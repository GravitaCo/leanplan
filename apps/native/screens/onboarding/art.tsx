/**
 * The onboarding photographs: the part intros (Part 1 and 3 from the boards, Part 2 the Pure muscle
 * growth plan photo) and each Tilo plan's photograph (src/screens/plan/PlanParts.tsx planArt), the
 * same files from src/assets, bundled with the app so they show offline.
 */
import { useState } from 'react'
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'

const pureMuscle = require('@/assets/plans/pure-muscle-growth.jpg') as number
const strongerAge = require('@/assets/plans/stronger-with-age.jpg') as number
const fullBody = require('@/assets/plans/full-body-system.jpg') as number

export const PHOTOS = {
  part1: require('@/assets/onboarding/part-1-about-you.jpg') as number,
  part2: pureMuscle,
  part3: require('@/assets/onboarding/part-3-your-plan.jpg') as number,
}

const ART: Record<string, number> = { 'pure-muscle-growth': pureMuscle, 'stronger-with-age': strongerAge, 'full-body-system': fullBody }
export const planArt = (templateId: string | undefined): number | undefined => (templateId ? ART[templateId] : undefined)

/** CSS `object-position` ("50% 30%") → the vertical share (the web's default is 50%). */
export const posYOf = (at: string | undefined, fallback = 0.5): number => {
  const m = at?.match(/\s(\d+(?:\.\d+)?)%/)
  return m ? +m[1] / 100 : fallback
}

/**
 * `object-fit: cover` with the web's `object-position`: an Image has no focal point, so this sizes
 * the photo to cover the box and offsets it by `posY` (and `posX`) of the overflow, as the browser does.
 * `height` undefined fills the parent (place it in an absolutely positioned box).
 * TODO(N1-followup): a lib/ui piece if another stream shows a plan photo (Plan's library will).
 */
export function CoverImage({ source, height, posY = 0.5, posX = 0.5, style }: { source: ImageSourcePropType; height?: number; posY?: number; posX?: number; style?: StyleProp<ViewStyle> }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const a = Image.resolveAssetSource(source)
  let img: { width: number; height: number; left: number; top: number } | null = null
  if (box && a?.width && a.height) {
    const scale = Math.max(box.w / a.width, box.h / a.height)
    const w = a.width * scale, h = a.height * scale
    img = { width: w, height: h, left: -(w - box.w) * posX, top: -(h - box.h) * posY }
  }
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ overflow: 'hidden', width: '100%' }, height == null ? { flex: 1 } : { height }, style]}>
      {img && <Image source={source} accessibilityIgnoresInvertColors style={{ position: 'absolute', ...img }} />}
    </View>
  )
}
