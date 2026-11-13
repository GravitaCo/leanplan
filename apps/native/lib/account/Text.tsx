/**
 * Text and TextInput with the web's body letter-spacing (theme.css `body { letter-spacing: -0.01em }`),
 * which every line on the web inherits: -1% of the font size unless the style sets its own (titles,
 * and 0 for `.num` figures). A stand-in until N1's text primitive carries it for the whole app.
 */
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native'

const spaced = (style: TextProps['style']) => {
  const f = (StyleSheet.flatten(style) || {}) as TextStyle
  return f.letterSpacing !== undefined ? style : [style, { letterSpacing: -0.01 * (f.fontSize ?? 17) }]
}

export function Text(props: TextProps) {
  return <RNText {...props} style={spaced(props.style)} />
}

export function TextInput(props: TextInputProps) {
  return <RNTextInput {...props} style={spaced(props.style)} />
}
