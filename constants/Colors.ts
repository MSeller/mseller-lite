import { palettes } from "./Theme";

/**
 * Flat colour lookup for the few places that read colours outside the
 * react-native-paper theme — the tab bar and `useThemeColor`.
 *
 * Derived from the palette in `constants/Theme.ts`, which is the source of
 * truth. Anything new should read `theme.custom.colors` instead of adding
 * entries here.
 */
const flat = (p: typeof palettes.light) => ({
  text: p.ink,
  background: p.background,
  surface: p.surfaceCard,
  tint: p.tint,
  icon: p.inkSecondary,
  border: p.hairline,
  tabIconDefault: p.inkTertiary,
  tabIconSelected: p.tint,
});

export const Colors = {
  light: flat(palettes.light),
  dark: flat(palettes.dark),
};
