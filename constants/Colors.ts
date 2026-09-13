/**
 * Flat colour lookup for the few places that read colours outside the
 * react-native-paper theme — the tab bar and `useThemeColor`.
 *
 * These MIRROR the palette in `constants/Theme.ts`; that file is the source of
 * truth. Anything new should read the Paper theme (`useTheme()`) or the design
 * tokens (`theme.custom`) instead of adding entries here.
 */

export const Colors = {
  light: {
    text: "#141A21",
    // The paper tone the whole app sits on, so the tab bar matches the page
    // rather than drawing a white band under it.
    background: "#F5F7FA",
    surface: "#FFFFFF",
    tint: "#14395E",
    icon: "#5C6773",
    border: "#E3E8EF",
    tabIconDefault: "#8A94A1",
    tabIconSelected: "#14395E",
  },
  dark: {
    text: "#E7EBEF",
    background: "#0E1216",
    surface: "#171D23",
    tint: "#9DC2EA",
    icon: "#9BA6B2",
    border: "#2A323B",
    tabIconDefault: "#75808C",
    tabIconSelected: "#9DC2EA",
  },
};
