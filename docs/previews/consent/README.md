# Consent checkbox: three versions for Benn

The web consent screen's rows (ConsentScreen's markup and words, the app's own stylesheet), 390 wide
at 2x, light and dark; the first box ticked, the other two empty.

1. `1-browser-*`: today's checkbox, drawn by the browser (rendered in Chromium; iPhone Safari draws
   its own, a little differently).
2. `2-square-dash-*`: Tilo's square from the onboarding options, the empty ring in --dash
   (1.64:1 against the card in light, 1.86:1 in dark: under the 3:1 WCAG asks of a control's edge).
3. `3-square-darker-*`: the same square with a darker ring, #8e8a85 light (3.43:1) and #6e6e73 dark
   (3.36:1).

`all-light.png` and `all-dark.png` put the three side by side.
