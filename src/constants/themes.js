/**
 * constants/themes.js
 *
 * Available UI colour themes.
 *
 * Each entry:
 *   value  — CSS data-theme attribute value applied to <html>
 *   label  — human-readable name shown in the theme picker
 *   dot    — oklch colour used to render the swatch dot in the picker
 */

export const THEMES = [
  { value: 'cyan',   label: 'Cyan',   dot: 'oklch(0.85 0.20 190)' },
  { value: 'orange', label: 'Orange', dot: 'oklch(0.80 0.20 55)'  },
  { value: 'purple', label: 'Purple', dot: 'oklch(0.60 0.22 290)' },
  { value: 'green',  label: 'Green',  dot: 'oklch(0.55 0.20 145)' },
]
