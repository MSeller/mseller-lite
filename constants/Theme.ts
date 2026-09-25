import type { MD3Theme } from "react-native-paper";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { StyleSheet, type TextStyle } from "react-native";

/**
 * MSeller design system v2 "editorial" — the same guide as the iOS app
 * (mobile-seller `docs/design/DESIGN_SYSTEM.md`, `utils/Theme.swift` and
 * `Images.xcassets/Theme`). Both apps share these values; change them in iOS
 * first and mirror them here in a paired PR. The written rules are in
 * `docs/design/DESIGN_SYSTEM.md`.
 *
 * The organising ideas, carried over from iOS:
 * - Blue (`tint`) is for things you can TAP. Text and data read in navy `ink`.
 * - Full-bleed rows on a plain page, separated by hairlines, over boxed cards.
 * - The brand gradient is reserved for the summary card and the primary call to
 *   action, and those are the only things that cast a shadow.
 *
 * Views read `theme.custom` tokens; no hex literals, magic font sizes or radii
 * in a StyleSheet (`pnpm design:check` lists them).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Palette — iOS asset catalog values (Any / Dark)
// ─────────────────────────────────────────────────────────────────────────────

export interface Palette {
  tint: string;
  tintSoft: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  background: string;
  surfaceRaised: string;
  surfaceCard: string;
  /**
   * Recessed well — search fields, steppers, the disabled CTA. iOS gets this
   * from system fills; React Native has none, so it is the one tone here that
   * is not in the iOS asset catalog.
   */
  fill: string;
  hairline: string;
  destructive: string;
  success: string;
  successSwitch: string;
  offer: string;
  warningBackground: string;
  warningForeground: string;
  unsavedDot: string;
  gradientStart: string;
  gradientEnd: string;
  gradientEdge: string;
  onGradient: string;
  onGradientSecondary: string;
  onGradientDivider: string;
  onGradientAlert: string;
}

const lightPalette: Palette = {
  tint: "#2563EB",
  tintSoft: "rgba(37, 99, 235, 0.10)",
  ink: "#10182B",
  inkSecondary: "#667085",
  inkTertiary: "#697489",
  background: "#FFFFFF",
  surfaceRaised: "#FAFBFD",
  surfaceCard: "#FFFFFF",
  fill: "#F1F3F7",
  hairline: "#D9DDE5",
  destructive: "#D92D20",
  success: "#15803D",
  successSwitch: "#34C759",
  offer: "#4F46E5",
  warningBackground: "#FFF6E6",
  warningForeground: "#7A4B00",
  unsavedDot: "#F5A524",
  gradientStart: "#2563EB",
  gradientEnd: "#142B5E",
  gradientEdge: "rgba(255, 255, 255, 0)",
  onGradient: "#FFFFFF",
  onGradientSecondary: "rgba(255, 255, 255, 0.78)",
  onGradientDivider: "rgba(255, 255, 255, 0.20)",
  onGradientAlert: "#FFCC9E",
};

const darkPalette: Palette = {
  tint: "#6E9BFF",
  tintSoft: "rgba(110, 155, 255, 0.16)",
  ink: "#F2F4F8",
  inkSecondary: "#8B93A5",
  inkTertiary: "#7D8699",
  background: "#0A0E17",
  surfaceRaised: "#111726",
  surfaceCard: "#131A2A",
  fill: "#1A2233",
  hairline: "#262D3B",
  destructive: "#FF6B61",
  success: "#4ADE80",
  successSwitch: "#30D158",
  offer: "#9B96FF",
  warningBackground: "#2A2111",
  warningForeground: "#F5C26B",
  unsavedDot: "#FFB84D",
  gradientStart: "#2563EB",
  gradientEnd: "#142B5E",
  gradientEdge: "rgba(255, 255, 255, 0.08)",
  onGradient: "#FFFFFF",
  onGradientSecondary: "rgba(255, 255, 255, 0.78)",
  onGradientDivider: "rgba(255, 255, 255, 0.20)",
  onGradientAlert: "#FFCC9E",
};

/**
 * Paper's MD3 roles, derived from the palette so Paper components (buttons,
 * inputs, chips, dialogs) land on the same colours as the hand-built views.
 *
 * `secondary` stays a slate, not a status colour: Paper reuses it for every
 * tonal button and selected segment. Status lives in `custom.status`.
 */
const toMd3Colors = (p: Palette, isDark: boolean) => ({
  primary: p.tint,
  primaryContainer: isDark ? "#1A253C" : "#E9EFFD",
  secondary: p.inkSecondary,
  secondaryContainer: p.fill,
  tertiary: p.offer,
  tertiaryContainer: isDark ? "#25234A" : "#EDECFC",
  error: p.destructive,
  errorContainer: isDark ? "#3A1512" : "#FDECEA",

  background: p.background,
  surface: p.surfaceCard,
  surfaceVariant: p.fill,
  surfaceDisabled: isDark ? "rgba(242, 244, 248, 0.10)" : "rgba(16, 24, 43, 0.08)",

  onPrimary: isDark ? "#0A1A3F" : "#FFFFFF",
  onPrimaryContainer: isDark ? "#D6E2FF" : p.gradientEnd,
  onSecondary: isDark ? p.background : "#FFFFFF",
  onSecondaryContainer: p.ink,
  onTertiary: isDark ? "#1A1747" : "#FFFFFF",
  onTertiaryContainer: isDark ? "#DCDAFF" : "#2B2580",
  onError: isDark ? "#3A0703" : "#FFFFFF",
  onErrorContainer: isDark ? "#FFD9D5" : "#7A1A12",

  onSurface: p.ink,
  onSurfaceVariant: p.inkSecondary,
  onSurfaceDisabled: isDark ? "rgba(242, 244, 248, 0.38)" : "rgba(16, 24, 43, 0.38)",
  onBackground: p.ink,

  // Outlined inputs need an edge a step stronger than a separator hairline.
  outline: isDark ? "#3A4357" : "#B4BBC8",
  outlineVariant: p.hairline,

  inverseSurface: p.ink,
  inverseOnSurface: p.background,
  inversePrimary: isDark ? "#2563EB" : "#6E9BFF",
  backdrop: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(16, 24, 43, 0.4)",
  scrim: "#000000",
  shadow: "#000000",

  // Paper paints these behind elevated components. Equal to the card surface so
  // a stray `elevation` cannot bring back grey, shadowed panels; level3 is the
  // search bar's fill, which needs to read as a well on a white page.
  elevation: {
    level0: "transparent",
    level1: p.surfaceCard,
    level2: p.surfaceCard,
    level3: p.fill,
    level4: p.surfaceCard,
    level5: p.surfaceCard,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Typography — SF / Roboto, weights and sizes from iOS `Theme.font(_:)`
// ─────────────────────────────────────────────────────────────────────────────

const paperTypography = {
  headlineLarge: { fontWeight: "700" as const, letterSpacing: -0.8 },
  headlineMedium: { fontWeight: "700" as const, letterSpacing: -0.6 },
  headlineSmall: { fontWeight: "700" as const, letterSpacing: -0.4 },
  titleLarge: { fontWeight: "700" as const, letterSpacing: -0.2 },
  titleMedium: { fontWeight: "600" as const, letterSpacing: 0 },
  titleSmall: { fontWeight: "600" as const, letterSpacing: 0 },
  labelLarge: { fontWeight: "600" as const, letterSpacing: 0 },
};

const withTypography = (fonts: MD3Theme["fonts"]): MD3Theme["fonts"] => {
  const next = { ...fonts };
  for (const [variant, overrides] of Object.entries(paperTypography)) {
    const key = variant as keyof MD3Theme["fonts"];
    next[key] = { ...(next[key] as object), ...overrides } as never;
  }
  return next;
};

export interface TypeTokens {
  /** Entity name (customer, screen title): 34 bold, tracking −0.025em. */
  largeTitle: TextStyle;
  /** Section label: 12 semibold UPPERCASE, tracking 0.12em, inkTertiary. Uppercase the string. */
  overline: TextStyle;
  /** 17 semibold. */
  rowTitle: TextStyle;
  /** 17 regular. */
  body: TextStyle;
  /** 15 regular. */
  bodySmall: TextStyle;
  /** 13 regular. */
  caption: TextStyle;
  /** Money and quantities: bold, tabular digits. */
  figure: (size: number) => TextStyle;
}

const buildType = (p: Palette): TypeTokens => ({
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.85, color: p.ink },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 1.44,
    textTransform: "uppercase",
    color: p.inkTertiary,
  },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: "600", color: p.ink },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", color: p.ink },
  bodySmall: { fontSize: 15, lineHeight: 20, fontWeight: "400", color: p.inkSecondary },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400", color: p.inkTertiary },
  figure: (size: number) => ({
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: p.ink,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic status colours, kept OUT of the MD3 roles on purpose: Paper reuses
 * `secondary`/`tertiary` for tonal buttons and selected chips, so status there
 * would leak across the UI. Only components that report state read these.
 */
export interface StatusTone {
  /** Solid tone — dots, icons, small emphasis. */
  base: string;
  /** Tinted background for a chip or badge. */
  container: string;
  /** Text on that container. */
  onContainer: string;
}

export interface StatusTokens {
  positive: StatusTone;
  warning: StatusTone;
  negative: StatusTone;
  neutral: StatusTone;
  /** Informational, not a problem and not done yet (confirmed, in progress, delivered with a note). */
  info: StatusTone;
  /** A second, distinct state within a flow (rescheduled, reconciled) — the iOS `offer` indigo. */
  accent: StatusTone;
}

type Md3Colors = ReturnType<typeof toMd3Colors>;

// Tinted containers come from the MD3 roles so a chip and a Paper component on the same role match.
const buildStatus = (p: Palette, isDark: boolean, md3: Md3Colors): StatusTokens => ({
  positive: {
    base: p.success,
    container: isDark ? "#12291B" : "#E7F5EC",
    onContainer: isDark ? "#BBF7D0" : "#0F5A2B",
  },
  warning: { base: p.warningForeground, container: p.warningBackground, onContainer: p.warningForeground },
  negative: { base: p.destructive, container: md3.errorContainer, onContainer: md3.onErrorContainer },
  neutral: { base: p.inkSecondary, container: p.fill, onContainer: p.inkSecondary },
  info: { base: p.tint, container: md3.primaryContainer, onContainer: md3.onPrimaryContainer },
  accent: { base: p.offer, container: md3.tertiaryContainer, onContainer: md3.onTertiaryContainer },
});

export interface SurfaceTokens {
  /** A content card: card surface, hairline edge, no shadow. */
  card: object;
  /** A recessed well — search fields, totals panels, steppers. */
  inset: object;
  /** Pinned bars (bottom action bar): page tone with a hairline, no shadow. */
  floating: object;
  /** Shadow for brand-gradient elements, the only ones allowed to cast one. */
  gradientShadow: object;
}

export interface CustomThemeTokens {
  /** iOS spacing scale: 4 / 8 / 12 / 16 / 20 / 28 (`spacingXS…XXL`). */
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  /** Page gutter: 16 on phones, 28 on tablets (use `gutterFor(width)`). */
  gutter: number;
  /** iOS radii: containers 12, controls/CTA 10, segments 8, tags 6. `pill` is for switches and dots only. */
  radius: { container: number; control: number; segment: number; tag: number; pill: number };
  /** Minimum touch target (44). */
  touchTarget: number;
  /** Hairline that renders as one physical pixel rather than a drawn line. */
  hairline: number;
  colors: Palette;
  type: TypeTokens;
  surface: SurfaceTokens;
  status: StatusTokens;
}

export interface CustomTheme extends MD3Theme {
  custom: CustomThemeTokens;
}

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const radius = { container: 12, control: 10, segment: 8, tag: 6, pill: 999 };

/** 28 on regular width (tablet), 16 on compact (phone) — iOS `Theme.gutter(for:)`. */
export const gutterFor = (width: number): number => (width >= 600 ? spacing.xxl : spacing.lg);

const buildTokens = (p: Palette, isDark: boolean, md3: Md3Colors): CustomThemeTokens => ({
  spacing,
  gutter: spacing.lg,
  radius,
  touchTarget: 44,
  hairline: StyleSheet.hairlineWidth,
  colors: p,
  type: buildType(p),
  status: buildStatus(p, isDark, md3),
  surface: {
    card: {
      backgroundColor: p.surfaceCard,
      borderRadius: radius.container,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.hairline,
    },
    inset: {
      backgroundColor: p.fill,
      borderRadius: radius.container,
    },
    floating: {
      backgroundColor: p.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.hairline,
    },
    gradientShadow: {
      shadowColor: p.gradientEnd,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.5 : 0.28,
      shadowRadius: 14,
      elevation: 6,
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────

const buildTheme = (base: MD3Theme, p: Palette, isDark: boolean): CustomTheme => {
  const md3 = toMd3Colors(p, isDark);
  return {
    ...base,
    // Paper derives every radius from this one number (Button and SegmentedButtons 5×, Card 3×,
    // Chip 2×, Dialog and Searchbar 7×, TextInput and Menu 1×), so no value hits all the iOS
    // radii. 2 puts buttons on `radius.control` (10) — the guide forbids pill buttons, which 4
    // would give — at the cost of Paper Cards (6) and inputs (2) running squarer than iOS.
    // New containers use AppCard, which takes `radius.container`.
    roundness: 2,
    colors: { ...base.colors, ...md3 },
    fonts: withTypography(base.fonts),
    custom: buildTokens(p, isDark, md3),
  };
};

export const customLightTheme: CustomTheme = buildTheme(MD3LightTheme, lightPalette, false);
export const customDarkTheme: CustomTheme = buildTheme(MD3DarkTheme, darkPalette, true);

export const getTheme = (isDark: boolean): CustomTheme =>
  isDark ? customDarkTheme : customLightTheme;

export const palettes = { light: lightPalette, dark: darkPalette };
