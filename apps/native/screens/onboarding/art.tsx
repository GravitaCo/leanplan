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
  // the photo's own size: known up front on a phone; a web render (react-native-web has no
  // resolveAssetSource) learns it when the image loads, and shows it centred until then
  const [nat, setNat] = useState<{ width: number; height: number } | null>(() => {
    const a = typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource(source) : null
    return a?.width && a.height ? { width: a.width, height: a.height } : null
  })
  let img: { width: number; height: number; left: number; top: number } | null = null
  if (box && nat) {
    const scale = Math.max(box.w / nat.width, box.h / nat.height)
    const w = nat.width * scale, h = nat.height * scale
    img = { width: w, height: h, left: -(w - box.w) * posX, top: -(h - box.h) * posY }
  }
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ overflow: 'hidden', width: '100%' }, height == null ? { flex: 1 } : { height }, style]}>
      <Image source={source} accessibilityIgnoresInvertColors resizeMode="cover"
        onLoad={(e) => {
          if (nat) return
          // a phone reports the size on `source`; react-native-web passes the DOM load event
          const ev = e.nativeEvent as unknown as { source?: { width?: number; height?: number }; target?: { naturalWidth?: number; naturalHeight?: number } }
          const w = ev.source?.width ?? ev.target?.naturalWidth, h = ev.source?.height ?? ev.target?.naturalHeight
          if (w && h) setNat({ width: w, height: h })
        }}
        style={img ? { position: 'absolute', ...img } : { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
    </View>
  )
}
