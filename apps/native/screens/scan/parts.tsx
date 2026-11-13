/**
 * The scan screens' own pieces: web classes used only by scanning, so they live with the screens
 * (the lead's split, 13 Nov 2026), drawn on lib/ui and the Studio tokens. Each is the web's CSS
 * (src/styles/theme.css) in React Native:
 *
 * - ScanBox: `.scanbox` (4:3; `.tall` 3:4 at most 56% of the screen) with `.scanframe` over it.
 * - LabelThumb: `.labelthumb`.
 * - NutritionTable / NutritionRow: `.list.ntab` and `.nrow` (label, per-100 input, per-serving
 *   figure, the flag bar and its `.flagnote`).
 * - SourceCard: `.sp-src` (shared product source with Report this product).
 * - ServingMargin: `.sp-serv` (One serving with its ± margin).
 * - SpTile: `.sp-tile` (the 52 pt soft-mauve tile at the top of the bare sheets).
 * - ReportHead: `.sp-rep-hd`; ReasonList: `.sp-why` (the report sheet's radio rows).
 */
import type { ReactNode } from 'react'
import { Image, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { num, tx, useTokens, BTN } from '../../lib/theme'
import { Icon, type IconName } from '../../lib/ui/icons'
import { slop, useSurface } from '../../lib/ui/kit'

/** `.scanframe`'s shade outside the frame: the web's own literal (theme.css), not a token there
 *  either; the camera view looks the same in light and dark. */
const SHADE = 'rgba(0, 0, 0, 0.28)'

/** `.scanbox` with its `.scanframe`; `children` is the camera view. `tall` for the label. */
export function ScanBox({ tall, children }: { tall?: boolean; children: ReactNode }) {
  const t = useTokens()
  const { height } = useWindowDimensions()
  // .scanframe: inset 28% 9%; .scanframe.label: inset 5% 7%; 2 px tint border, radius 12
  const v = tall ? '5%' : '28%'
  const h = tall ? '7%' : '9%'
  return (
    <View style={[{ aspectRatio: tall ? 3 / 4 : 4 / 3, borderRadius: t.radius, overflow: 'hidden', backgroundColor: t.fill2, width: '100%' },
      tall && { maxHeight: height * 0.56, alignSelf: 'center' }]}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={{ height: v, backgroundColor: SHADE }} />
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: h, backgroundColor: SHADE }} />
          <View style={{ flex: 1, borderWidth: 2, borderColor: t.tint, borderRadius: 12 }} />
          <View style={{ width: h, backgroundColor: SHADE }} />
        </View>
        <View style={{ height: v, backgroundColor: SHADE }} />
      </View>
    </View>
  )
}

/** `.labelthumb`: 52 × 52, radius 8, on --fill2, 12 to its right. */
export function LabelThumb({ uri, label }: { uri: string; label: string }) {
  const t = useTokens()
  return <Image source={{ uri }} accessibilityLabel={label} style={{ width: 52, height: 52, borderRadius: 8, marginRight: 12, backgroundColor: t.fill2 }} />
}

/* ---------------------------------------------------------------- nutrition table */

/** `.list.ntab`: the table's surface with its head row (`.nhead`). */
export function NutritionTable({ per100, perServing, label, children }: { per100: string; perServing: string; label: string; children: ReactNode }) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <View accessibilityLabel={label} style={{ backgroundColor: bg, borderRadius: t.radiusSm, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 34, paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={{ flex: 1 }} />
        <Text style={[tx(13, 400, 1.2), { width: 76, textAlign: 'right', color: t.label2 }]}>{per100}</Text>
        <Text style={[tx(13, 400, 1.2), { width: 76, textAlign: 'right', color: t.label2 }]}>{perServing}</Text>
      </View>
      {children}
    </View>
  )
}

/**
 * `.nrow`: the row's name (`sub` for the "of which" lines, `unit` small beside it), the per-100
 * input, the per-serving figure; `flag` draws the 3 pt tint bar, `need` turns the placeholder tint,
 * and `note` is the `.flagnote` under the row (a line, or a suggestion with its Accept button).
 */
export function NutritionRow({ label, unit, sub, value, onChange, placeholder, perServing, flag, need, note, inputLabel }: {
  label: string; unit?: string; sub?: boolean; value: string; onChange: (v: string) => void; placeholder: string; perServing: string
  flag?: boolean; need?: boolean; note?: ReactNode; inputLabel: string
}) {
  const t = useTokens()
  return (
    <View>
      <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />
      {flag && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: t.tint }} />}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 44 }}>
          <Text style={[sub ? tx(15) : tx(17), { flex: 1, minWidth: 0, color: sub ? t.label2 : t.label, paddingLeft: sub ? 12 : 0 }]}>
            {label}{unit ? <Text style={[tx(13), { color: t.label2 }]}>{' '}{unit}</Text> : null}
          </Text>
          <TextInput accessibilityLabel={inputLabel} value={value} onChangeText={onChange} placeholder={placeholder}
            placeholderTextColor={need ? t.tint : t.label3} keyboardType="decimal-pad"
            style={[tx(17), num, { width: 76, textAlign: 'right', color: t.label, paddingVertical: 11 }]} />
          <Text style={[tx(17), num, { width: 76, textAlign: 'right', color: t.label2 }]}>{perServing}</Text>
        </View>
        {note ? <View style={{ marginTop: -6, marginBottom: 9 }}>{note}</View> : null}
      </View>
    </View>
  )
}

/** `.flagnote`'s text: 13 pt in the tint. */
export function FlagNote({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text accessibilityLiveRegion="polite" style={[tx(13), { color: t.tint }]}>{children}</Text>
}

/* ---------------------------------------------------------------- shared products */

/** `.sp-src`: the icon, the title, its sub, the barcode and Report this product. */
export function SourceCard({ icon, stroke, title, sub, barcode, report, onReport }: {
  icon: IconName; stroke: number; title: string; sub?: string; barcode: string; report: string; onReport: () => void
}) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ marginTop: 1 }}><Icon name={icon} size={20} stroke={stroke} color={t.label2} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tx(16, 400, 1.35), { color: t.label }]}>{title}</Text>
        {sub ? <Text style={[tx(15), { color: t.label2, marginTop: 2 }]}>{sub}</Text> : null}
        <Text style={[tx(13), num, { color: t.label2, marginTop: 4 }]}>{barcode}</Text>
        <Pressable accessibilityRole="button" onPress={onReport} hitSlop={slop(0, 44)}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 2, marginBottom: -10, alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}>
          <Icon name="flag" size={16} color={t.tint} />
          <Text style={[tx(15, 500, 1.3, BTN), { color: t.tint }]}>{report}</Text>
        </Pressable>
      </View>
    </View>
  )
}

/** `.sp-serv`: "One serving" and the kcal with its ± margin (the margin muted). */
export function ServingMargin({ label, kcal, margin }: { label: string; kcal: number; margin: number }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 }}>
      <Text style={[tx(17), { color: t.label }]}>{label}</Text>
      <Text style={[tx(17, 600), num, { color: t.label }]}>{kcal} kcal <Text style={[tx(17, 400), { color: t.label2 }]}>±{' '}{margin}</Text></Text>
    </View>
  )
}

/** `.sp-tile`: 52 × 52, radius 16, --tint-soft with the icon in the tint. */
export function SpTile({ icon, size, stroke = 1.8 }: { icon: IconName; size: number; stroke?: number }) {
  const t = useTokens()
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size} stroke={stroke} color={t.tint} />
    </View>
  )
}

/** `.sp-optin h2` / `.sp-why legend`: a bare sheet's 22 pt title. */
export function SheetTitle({ children, legend }: { children: ReactNode; legend?: boolean }) {
  const t = useTokens()
  return <Text accessibilityRole="header" style={[tx(22, 600, legend ? 1.3 : 28, -0.02), { color: t.label }, legend ? { paddingTop: 22, paddingHorizontal: 4, paddingBottom: 10 } : { marginTop: 16 }]}>{children}</Text>
}

/** `.sp-optin p`: 17 pt muted body, 10 above. */
export function SheetBody({ children }: { children: ReactNode }) {
  const t = useTokens()
  return <Text style={[tx(17, 400, 1.45), { color: t.label2, marginTop: 10 }]}>{children}</Text>
}

/** `.sp-rep-hd`: the product's name (17 semibold) over its barcode (13, muted), 4 in. */
export function ReportHead({ name, barcode }: { name: string; barcode: string }) {
  const t = useTokens()
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <Text style={[tx(17, 600), { color: t.label }]}>{name}</Text>
      <Text style={[tx(13), num, { color: t.label2, marginTop: 2 }]}>{barcode}</Text>
    </View>
  )
}

/** `.sp-why`: radio rows (52 high, a 24 pt dot that fills with the tint and a tick when chosen). */
export function ReasonList<T extends string>({ options, value, onChange, label }: { options: readonly (readonly [T, string])[]; value: T | null; onChange: (v: T) => void; label: string }) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ backgroundColor: bg, borderRadius: t.radiusSm, overflow: 'hidden' }}>
      {options.map(([k, l], i) => {
        const on = value === k
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(k)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16 }}>
            {i > 0 && <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, backgroundColor: t.sep }} />}
            <View style={[{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, on ? { backgroundColor: t.tint } : { borderWidth: 2, borderColor: t.fill3 }]}>
              {on && <Icon name="check" size={13} stroke={3.2} color={t.onTint} />}
            </View>
            <Text style={[tx(17), { flex: 1, color: t.label }]}>{l}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
