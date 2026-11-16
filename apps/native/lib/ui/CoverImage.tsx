/**
 * `object-fit: cover` with the web's `object-position`: the photo fills its box and the crop sits
 * where the web puts it (plan tiles 50% 40%, heroes 50% 45%, the guided player 50% 18%), where RN's
 * own `cover` only centres. No outside library: the photo's size (known at once for a bundled
 * image, else from `Image.getSize` or its load) and the box's give the offset, as CSS computes it:
 * (box − drawn size) × position. Until both are known it draws centred.
 */
import { useEffect, useState } from 'react'
import { Image, View, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native'

type Size = { w: number; h: number }

type Props = {
  source: ImageSourcePropType
  /** object-position as fractions (50% 40% is x 0.5, y 0.4) */
  x?: number; y?: number
  style?: StyleProp<ViewStyle>
  /** the web's alt text; none for a decorative photo (alt="") */
  label?: string
}

/** A new photo starts afresh: its size is measured again, never the last photo's. */
export function CoverImage(props: Props) {
  const s = props.source
  const key = typeof s === 'number' ? String(s) : typeof s === 'object' && s != null && 'uri' in s ? String(s.uri) : 'img'
  return <Cover key={key} {...props} />
}

function Cover({ source, x = 0.5, y = 0.5, style, label }: {
  source: ImageSourcePropType
  /** object-position as fractions (50% 40% is x 0.5, y 0.4) */
  x?: number; y?: number
  style?: StyleProp<ViewStyle>
  /** the web's alt text; none for a decorative photo (alt="") */
  label?: string
}) {
  const local = typeof source === 'number' ? Image.resolveAssetSource(source) : null
  const [img, setImg] = useState<Size | null>(local?.width && local.height ? { w: local.width, h: local.height } : null)
  const [box, setBox] = useState<Size | null>(null)
  // where the size isn't known up front (a remote photo; react-native-web), ask for it once
  const uri = local?.uri ?? (typeof source === 'object' && source != null && 'uri' in source ? source.uri : undefined)
  useEffect(() => {
    if (img || !uri) return
    let live = true
    Image.getSize(uri, (w, h) => { if (live && w > 0 && h > 0) setImg({ w, h }) }, () => {})
    return () => { live = false }
  }, [uri]) // eslint-disable-line react-hooks/exhaustive-deps
  let frame: ImageStyle | null = null
  if (img && box && img.w > 0 && img.h > 0) {
    const k = Math.max(box.w / img.w, box.h / img.h)
    const w = img.w * k, h = img.h * k
    frame = { position: 'absolute', width: w, height: h, left: (box.w - w) * x, top: (box.h - h) * y }
  }
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessible={label != null} accessibilityRole={label != null ? 'image' : undefined} accessibilityLabel={label}
      importantForAccessibility={label != null ? 'yes' : 'no-hide-descendants'}>
      <Image source={source} resizeMode="cover" accessibilityIgnoresInvertColors
        onLoad={(e) => { const s = e.nativeEvent.source; if (!img && s?.width && s?.height) setImg({ w: s.width, h: s.height }) }}
        style={frame ?? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
    </View>
  )
}
