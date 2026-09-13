import type { MD3Theme } from "react-native-paper";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { Platform, StyleSheet } from "react-native";

/**
 * MSeller Lite design system.
 *
 * The organising idea is **tonal depth instead of drop shadows**. The page sits on
 * a soft paper tone and content surfaces are pure white (inverted in dark mode),
 * so a card reads as raised because of the tone step, not because it is casting a
 * shadow onto the page. Shadows are reserved for the two things that genuinely
 * float above the content — the FAB and the bottom action bar — and even there
 * they are wide and faint rather than dark and tight.
 *
 * What that buys: no grey haloes, no stacked shadows where cards sit next to each
 * other, and a surface that still separates cleanly when a screen is dense.
 *
 * Use the `custom` tokens rather than hand-rolling values in a StyleSheet:
 * `theme.custom.surface.card`, `.inset`, `.floating`, plus `spacing` and `radius`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary is a deepened, desaturated take on the MSeller blue (#0055b3). The
 * original is a bright link-blue: at the size a primary button or a document
 * total is drawn it reads loud rather than considered. Holding the same hue but
 * dropping the lightness keeps the brand recognisable and lets the accent carry
 * weight without shouting.
 *
 * Secondary is a slate companion to it, NOT a success green. Paper reuses the
 * secondary role for every tonal button and selected segment, so a semantic
 * colour there turns "create customer" and "filter: all" green and makes the
 * whole app read as a status display. Status colours live in
 * `custom.status` instead, where only status components reach them.
 */
const lightColors = {
  primary: "#14395E",
  primaryContainer: "#DCE7F3",
  secondary: "#41566E",
  secondaryContainer: "#DEE6EF",
  tertiary: "#8A5A12",
  tertiaryContainer: "#F6E7CB",
  error: "#B02D26",
  errorContainer: "#F8DEDC",

  // The tone step that replaces every card shadow: paper page, white surfaces.
  background: "#F5F7FA",
  surface: "#FFFFFF",
  // Filled/recessed blocks — search fields, totals panels, quantity steppers.
  surfaceVariant: "#EDF1F6",
  surfaceDisabled: "rgba(20, 26, 33, 0.10)",

  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#0B2440",
  onSecondary: "#FFFFFF",
  onSecondaryContainer: "#16283C",
  onTertiary: "#FFFFFF",
  onTertiaryContainer: "#42290A",
  onError: "#FFFFFF",
  onErrorContainer: "#4A1310",

  // Ink, not pure black — #000 on white is harsh at body sizes.
  onSurface: "#141A21",
  onSurfaceVariant: "#5C6773",
  onSurfaceDisabled: "rgba(20, 26, 33, 0.38)",
  onBackground: "#141A21",

  outline: "#B9C2CD",
  // Hairline borders live here: present enough to define an edge, quiet enough
  // that a list of cards doesn't turn into a grid of boxes.
  outlineVariant: "#E3E8EF",

  inverseSurface: "#232A32",
  inverseOnSurface: "#F1F4F8",
  inversePrimary: "#9DC2EA",
  backdrop: "rgba(20, 26, 33, 0.4)",
  scrim: "#000000",
  shadow: "#000000",

  // Paper paints these behind elevated components. They are deliberately equal
  // to `surface` so a stray `elevation` prop cannot reintroduce the grey-card
  // look this palette is built to avoid.
  elevation: {
    level0: "transparent",
    level1: "#FFFFFF",
    level2: "#FFFFFF",
    level3: "#FFFFFF",
    level4: "#FFFFFF",
    level5: "#FFFFFF",
  },
};

const darkColors = {
  primary: "#9DC2EA",
  primaryContainer: "#1C3B5C",
  secondary: "#AFC2D8",
  secondaryContainer: "#2E4055",
  tertiary: "#E7BE7D",
  tertiaryContainer: "#5A3D12",
  error: "#F0A9A3",
  errorContainer: "#5E1E1A",

  // Same tone step, inverted: the page is the darker layer, cards lift off it.
  background: "#0E1216",
  surface: "#171D23",
  surfaceVariant: "#222932",
  surfaceDisabled: "rgba(231, 235, 239, 0.10)",

  onPrimary: "#0B2440",
  onPrimaryContainer: "#D6E6F7",
  onSecondary: "#12233A",
  onSecondaryContainer: "#DCE6F2",
  onTertiary: "#3A2708",
  onTertiaryContainer: "#F8E4C4",
  onError: "#480F0C",
  onErrorContainer: "#F9DAD7",

  onSurface: "#E7EBEF",
  onSurfaceVariant: "#9BA6B2",
  onSurfaceDisabled: "rgba(231, 235, 239, 0.38)",
  onBackground: "#E7EBEF",

  outline: "#5A6570",
  outlineVariant: "#2A323B",

  inverseSurface: "#E7EBEF",
  inverseOnSurface: "#1A2027",
  inversePrimary: "#14395E",
  backdrop: "rgba(0, 0, 0, 0.55)",
  scrim: "#000000",
  shadow: "#000000",

  elevation: {
    level0: "transparent",
    level1: "#171D23",
    level2: "#171D23",
    level3: "#171D23",
    level4: "#171D23",
    level5: "#171D23",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Only weight and tracking are touched — the platform's own family is left
 * alone, so nothing depends on a bundled font being present.
 *
 * Headings get negative tracking (large type set at default spacing looks loose)
 * and real weight; body copy keeps MD3's metrics, which are already well tuned
 * for reading.
 */
const typography = {
  headlineLarge: { fontWeight: "700" as const, letterSpacing: -0.5 },
  headlineMedium: { fontWeight: "700" as const, letterSpacing: -0.4 },
  headlineSmall: { fontWeight: "700" as const, letterSpacing: -0.3 },
  titleLarge: { fontWeight: "700" as const, letterSpacing: -0.2 },
  titleMedium: { fontWeight: "600" as const, letterSpacing: -0.1 },
  titleSmall: { fontWeight: "600" as const, letterSpacing: 0 },
  labelLarge: { fontWeight: "600" as const, letterSpacing: 0.1 },
};

const withTypography = (fonts: MD3Theme["fonts"]): MD3Theme["fonts"] => {
  const next = { ...fonts };
  for (const [variant, overrides] of Object.entries(typography)) {
    const key = variant as keyof MD3Theme["fonts"];
    next[key] = { ...(next[key] as object), ...overrides } as never;
  }
  return next;
};

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic status colours, kept OUT of the MD3 roles on purpose.
 *
 * Paper reuses `secondary`/`tertiary` for tonal buttons, selected chips and
 * segmented buttons, so encoding "this succeeded" in those roles leaks the
 * meaning across half the UI. These are read only by components that actually
 * report state — the document status chip, a mode indicator — so green means
 * green and a button is just a button.
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
}

const lightStatus: StatusTokens = {
  positive: { base: "#1F6B54", container: "#D6EDE3", onContainer: "#0A3428" },
  warning: { base: "#8A5A12", container: "#F6E7CB", onContainer: "#42290A" },
  negative: { base: "#B02D26", container: "#F8DEDC", onContainer: "#4A1310" },
  neutral: { base: "#5C6773", container: "#EDF1F6", onContainer: "#49535E" },
};

const darkStatus: StatusTokens = {
  positive: { base: "#7FCCB0", container: "#1B4739", onContainer: "#CDEDE0" },
  warning: { base: "#E7BE7D", container: "#4C340F", onContainer: "#F8E4C4" },
  negative: { base: "#F0A9A3", container: "#5E1E1A", onContainer: "#F9DAD7" },
  neutral: { base: "#9BA6B2", container: "#222932", onContainer: "#B6C0CB" },
};

export interface SurfaceTokens {
  /** A content card: white surface, hairline edge, no shadow. */
  card: object;
  /** A recessed block — search fields, totals panels, steppers. */
  inset: object;
  /** Genuinely floating UI (FAB, bottom bar). Wide and faint, never tight and dark. */
  floating: object;
}

export interface CustomThemeTokens {
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  /** Hairline that renders as one physical pixel rather than a drawn line. */
  hairline: number;
  surface: SurfaceTokens;
  status: StatusTokens;
}

export interface CustomTheme extends MD3Theme {
  custom: CustomThemeTokens;
}

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

/**
 * Radii are generous and few. Small mixed radii (4 next to 12 next to 24) are
 * most of what makes an interface look assembled rather than designed.
 */
const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

const buildTokens = (colors: typeof lightColors, isDark: boolean): CustomThemeTokens => ({
  spacing,
  radius,
  hairline: StyleSheet.hairlineWidth,
  status: isDark ? darkStatus : lightStatus,
  surface: {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outlineVariant,
    },
    inset: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: radius.md,
    },
    floating: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      // Android's `elevation` and iOS/web's shadow* are separate systems; both
      // are set so the FAB reads the same on every platform. Dark mode drops the
      // shadow entirely — a shadow on a dark page is invisible and only muddies
      // the edge; the tone step is doing the work there.
      ...Platform.select({
        android: { elevation: isDark ? 0 : 3 },
        default: {
          shadowColor: "#0B1622",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0 : 0.1,
          shadowRadius: 20,
        },
      }),
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  // Paper derives component corner radii from this; 4 lands its components on
  // the same curve as the explicit radii above.
  roundness: 4,
  colors: { ...MD3LightTheme.colors, ...lightColors },
  fonts: withTypography(MD3LightTheme.fonts),
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: { ...MD3DarkTheme.colors, ...darkColors },
  fonts: withTypography(MD3DarkTheme.fonts),
};

export const customLightTheme: CustomTheme = {
  ...lightTheme,
  custom: buildTokens(lightColors, false),
};

export const customDarkTheme: CustomTheme = {
  ...darkTheme,
  custom: buildTokens(darkColors as typeof lightColors, true),
};

export const getTheme = (isDark: boolean): CustomTheme =>
  isDark ? customDarkTheme : customLightTheme;

/** Type for theme colors (for TypeScript support) */
export type ThemeColors = typeof lightColors;
