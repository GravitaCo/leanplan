/**
 * Native port of src/ui/Tiles.tsx (boards r1-goal, r5-enjoy): tall choice tiles, not settings rows.
 * The chosen tile fills with ink (--btn) and carries a check badge; a tile that can be ticked shows
 * an empty ring until it is.
 *
 * - ChoiceTiles: one answer (radio buttons in a radio group).
 * - CheckTiles: any number (checkboxes), stacked or as a two-column grid.
 */
import { useState, type ReactNode } from 'react'
import { Pressable, Text, View, type ViewStyle } from 'react-native'
import { Icon, type IconName } from './icons'
import { tx, useTokens } from '../theme'

export interface TileOpt<T extends string> { k: T; t: string; s?: string; icon?: IconName }

function Badge({ on, ring, grid }: { on: boolean; ring?: boolean; grid?: boolean }) {
  const t = useTokens()
  const d = grid ? 24 : 26
  const pos: ViewStyle = grid ? { position: 'absolute', top: 12, right: 12 } : {}
  if (on) return <View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: t.btnInk, alignItems: 'center', justifyContent: 'center' }, pos]}><Icon name="check" size={20} stroke={3} color={t.btn} /></View>
  if (ring) return <View style={[{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: t.dash }, pos]} />
  return null
}

function TileBody({ o, on, icon }: { o: TileOpt<string>; on: boolean; icon?: boolean }) {
  const t = useTokens()
  const fg = on ? t.btnInk : t.label
  return (
    <>
      {icon && o.icon && (
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(127, 127, 127, 0.25)' : t.tintSoft }}>
          <Icon name={o.icon} size={20} stroke={1.9} color={on ? fg : t.tint} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tx(icon && o.icon ? 18 : 17, 600), { color: fg }]}>{o.t}</Text>
        {o.s && <Text style={[tx(14, 400, 1.35), { color: on ? fg : t.label2, opacity: on ? 0.75 : 1, marginTop: 2 }]}>{o.s}</Text>}
      </View>
    </>
  )
}

export function ChoiceTiles<T extends string>({ label, opts, value, onPick, three, children }: {
  label: string; opts: readonly TileOpt<T>[]; value: T | undefined; onPick: (v: T) => void
  /** `.tiles.three`: short answers side by side, no badge (onboarding) */
  three?: boolean
  children?: ReactNode
}) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={three ? { flexDirection: 'row', gap: 8 } : { gap: 10 }}>
      {opts.map((o) => {
        const on = value === o.k
        const ic = !!o.icon
        if (three) return (
          <Pressable key={o.k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(o.k)}
            style={{ flex: 1, minHeight: 56, padding: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.btn : t.card }}>
            <Text style={[tx(16, 600, 1.2), { color: on ? t.btnInk : t.label, textAlign: 'center' }]}>{o.t}</Text>
          </Pressable>
        )
        return (
          <Pressable key={o.k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(o.k)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: ic ? 14 : 12, minHeight: 60, paddingVertical: 14, paddingHorizontal: 16, borderRadius: ic ? 22 : 20, backgroundColor: on ? t.btn : t.card }}>
            <TileBody o={o} on={on} icon />
            <Badge on={on} />
          </Pressable>
        )
      })}
      {children}
    </View>
  )
}

export function CheckTiles<T extends string>({ label, opts, value, onToggle, grid, tall }: {
  label: string; opts: readonly TileOpt<T>[]; value: readonly T[]; onToggle: (v: T) => void
  /** two columns (your why, kit, enjoy); otherwise stacked (body areas, the medical question) */
  grid?: boolean
  /** the taller grid tile (enjoy, 92 pt) */
  tall?: boolean
}) {
  const t = useTokens()
  const [w, setW] = useState(0)
  const col = w ? (w - 10) / 2 : '48%'
  return (
    <View accessibilityLabel={label} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={grid ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : { gap: 10 }}>
      {opts.map((o) => {
        const on = value.includes(o.k)
        const fg = on ? t.btnInk : t.label
        return (
          <Pressable key={o.k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onToggle(o.k)}
            style={grid
              ? { width: col, height: tall ? 92 : 84, padding: 14, borderRadius: tall ? 22 : 20, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: on ? t.btn : t.card }
              : { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: on ? t.btn : t.card }}>
            {grid ? (
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tx(tall ? 17 : 16, 600, 1.25), { color: fg, paddingRight: 28 }]}>{o.t}</Text>
                {o.s && <Text style={[tx(14, 400, 1.35), { color: on ? fg : t.label2, opacity: on ? 0.75 : 1, marginTop: 2 }]}>{o.s}</Text>}
              </View>
            ) : <TileBody o={o} on={on} />}
            <Badge on={on} ring grid={grid} />
          </Pressable>
        )
      })}
    </View>
  )
}
