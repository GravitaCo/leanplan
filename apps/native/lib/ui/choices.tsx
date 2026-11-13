/**
 * Shared answer and reassurance lists, ported from the web:
 * - Opts (src/screens/onboarding/Opts.tsx, `.wz-opts`): radio or tick rows on a card, the chosen row
 *   on --tint-soft with an ink dot (onboarding, Health check answers, the 12-week check-in).
 * - Ticks (onboarding/Consent.tsx, `.ticks`): a card of tinted ticks and sentences.
 * - Check (`.chk`): the round tick used beside a row (a plan's choice, a supplement taken).
 * - Signposts (onboarding/Signposts.tsx and mind's SupportRows, `.wz-group` / `.wz-sp`): support
 *   services, each a call (tel:), a text (sms:) or a web link, with the web's aria labels.
 */
import { Linking, Pressable, Text, View } from 'react-native'
import type { SupportRow } from '@/screens/profile/supportRows'
import { Icon } from './icons'
import { useSurface } from './kit'
import { num, tx, BTN, useTokens } from '../theme'

/** One option: [key, title, optional sub], as the web's Opts takes it. */
export type Opt<T extends string> = readonly [T, string, string?]

/**
 * `.wz-opts`: one answer (radio rows) or, with `multi`, any number (tick rows with a square dot).
 * A row is 14 16 padded with a 1 pt rule under it; the chosen one is --tint-soft, its title 500.
 */
export function Opts<T extends string>({ opts, value, onPick, label, multi }: {
  opts: readonly Opt<T>[]; value: T | T[] | undefined; onPick: (v: T) => void; label: string; multi?: boolean
}) {
  const t = useTokens()
  const bg = useSurface(t)
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <View accessibilityRole={multi ? undefined : 'radiogroup'} role={multi ? 'group' : undefined} accessibilityLabel={label}
      style={{ backgroundColor: bg, borderRadius: t.radius, overflow: 'hidden' }}>
      {opts.map(([k, title, sub], i) => {
        const sel = on(k)
        return (
          <Pressable key={k} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: sel }} onPress={() => onPick(k)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: sel ? t.tintSoft : 'transparent',
              borderBottomWidth: i === opts.length - 1 ? 0 : 1, borderBottomColor: t.sep }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[tx(17, sel ? 500 : 400, 1.3, BTN), { color: t.label }]}>{title}</Text>
              {sub && <Text style={[tx(13, 400, 1.3, BTN), { color: t.label2, marginTop: 1 }]}>{sub}</Text>}
            </View>
            {/* .wz-dot: a 24 ring (a 22 rounded square for ticks), ink with a card-coloured tick when chosen */}
            <View style={[{ alignItems: 'center', justifyContent: 'center' }, multi ? { width: 22, height: 22, borderRadius: 6 } : { width: 24, height: 24, borderRadius: 12 },
              sel ? { backgroundColor: t.label } : { borderWidth: 1.5, borderColor: t.dash }]}>
              {sel && <Icon name="check" size={14} stroke={2.6} color={t.card} />}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

/** `.ticks`: a card (padding 16, `tight` 14 16) of sentences, each after a 16 pt tinted tick, 10 apart. */
export function Ticks({ items, tight }: { items: string[]; tight?: boolean }) {
  const t = useTokens()
  const bg = useSurface(t)
  return (
    <View role="list" style={{ backgroundColor: bg, borderRadius: t.radius, paddingVertical: tight ? 14 : 16, paddingHorizontal: 16, gap: 10 }}>
      {items.map((s) => (
        <View key={s} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ marginTop: 2 }}><Icon name="check" size={16} stroke={2.6} color={t.tint} /></View>
          <Text style={[tx(15, 400, 1.45), { color: t.label, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  )
}

/** `.chk`: a 26 pt ring (`sm` 20), filled with the tint and a tick when `on`. Drawn only; its row is the control. */
export function Check({ on, sm }: { on: boolean; sm?: boolean }) {
  const t = useTokens()
  const d = sm ? 20 : 26
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: on ? t.tint : t.dash, backgroundColor: on ? t.tint : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {/* 20 pt in both sizes: the web's svg.i rule wins over the 14 or 11 it asks for */}
      {on && <View style={{ width: 20, height: 20, flexShrink: 0 }}><Icon name="check" size={20} stroke={sm ? 3.6 : 3} color={t.onTint} /></View>}
    </View>
  )
}

const tel = (n: string) => 'tel:' + n.replace(/\s/g, '')
const open = (url: string) => { void Linking.openURL(url) }

/**
 * `.wz-group` of `.wz-sp` rows: a service's name (16 pt) and what it's for (13 pt at 1.35), with
 * its number in the tint. A row with only a number is a call; with `sms` a text; with a number and
 * a web link the number is its own call link and "Webchat and email" opens the site; with `lines`,
 * one call link per line. Words and labels are the web's.
 */
export function Signposts({ list, support }: {
  list: SupportRow[]
  /** mind's and Profile's support sheet (SupportRows): every row with a web link shows it; the
   *  onboarding list (Signposts) shows it only beside a number */
  support?: boolean
}) {
  const t = useTokens()
  const bg = useSurface(t)
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 13, paddingHorizontal: 16 }
  const name = (s: SupportRow) => <Text style={[tx(16), { color: t.label }]}>{s.name}</Text>
  const desc = (s: SupportRow) => <Text style={[tx(13, 400, 1.35), { color: t.label2 }]}>{s.desc}</Text>
  const n = (s: string) => <Text style={[tx(16, 600), num, { color: t.tint }]}>{s}</Text>
  const webLink = (s: SupportRow) => s.web ? (
    <Pressable accessibilityRole="link" onPress={() => open(s.web!)} hitSlop={{ top: 10, bottom: 10 }} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
      <Text style={[tx(13, 500), { color: t.tint }]}>{s.webLabel ?? 'Webchat and email'}</Text>
    </Pressable>
  ) : null
  return (
    <View style={{ backgroundColor: bg, borderRadius: t.radius, overflow: 'hidden' }}>
      {list.map((s, i) => {
        const rule = { borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: t.sep }
        if (s.lines) return (
          <View key={s.name} style={[row, rule, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {name(s)}{desc(s)}
              {s.lines.map(([l, ln], j) => (
                <Pressable key={l} accessibilityRole="link" accessibilityLabel={`${s.name}, ${l}: call ${ln}`} onPress={() => open(tel(ln))}
                  style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingTop: 8 }, j > 0 && { borderTopWidth: 1, borderTopColor: t.sep, marginTop: 8 }]}>
                  <Text style={[tx(15), { color: t.label }]}>{l}</Text>{n(ln)}
                </Pressable>
              ))}
              {s.web && (
                <Pressable accessibilityRole="link" onPress={() => open(s.web!)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.sep, marginTop: 8 }}>
                  <Text style={[tx(15), { color: t.label }]}>Webchat and email</Text>
                  <Text style={[tx(16, 600), { color: t.tint }]}>Open</Text>
                </Pressable>
              )}
            </View>
          </View>
        )
        const text = <View style={{ flex: 1, minWidth: 0 }}>{name(s)}{desc(s)}{(support || (s.tel && s.web)) ? webLink(s) : null}</View>
        if (s.sms) return (
          <Pressable key={s.name} accessibilityRole="link" accessibilityLabel={`${s.name}: text ${s.num}`} onPress={() => open(s.sms!)} style={[row, rule]}>
            {text}{s.num && n(s.num)}
          </Pressable>
        )
        if (s.tel && s.web) return (
          <View key={s.name} style={[row, rule]}>
            {text}
            <Pressable accessibilityRole="link" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={() => open(tel(s.tel!))} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>{n(s.num ?? '')}</Pressable>
          </View>
        )
        return s.tel
          ? <Pressable key={s.name} accessibilityRole="link" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={() => open(tel(s.tel!))} style={[row, rule]}>{text}{s.num && n(s.num)}</Pressable>
          : <View key={s.name} style={[row, rule]}>{text}{s.num && n(s.num)}</View>
      })}
    </View>
  )
}
