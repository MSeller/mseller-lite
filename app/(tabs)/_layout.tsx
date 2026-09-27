import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/HapticTab";
import { useModuleMeta } from "@/components/navigation/moduleMeta";
import { IconSymbol, type IconSymbolName } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import type { CustomTheme } from "@/constants/Theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNavigationAccess, type TabName } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";

/** Every module that can be a tab. Those not in the role's list stay routable but hidden. */
const MODULE_TABS: readonly TabName[] = ["documents", "loading", "routes", "stock", "catalog", "marketplace"];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const palette = Colors[colorScheme ?? "light"];
  const { custom } = useTheme() as CustomTheme;
  const insets = useSafeAreaInsets();
  // The bar is built per role (hooks/useNavigationAccess): Inicio, then the role's
  // modules in its own order, then Más — five tabs at most, so every label fits.
  // A module the role does not get as a tab is still registered (`href: null`
  // hides the button) because Más rows and old links navigate to it, and its
  // screen redirects to the copy under Más when it is not a tab for this role.
  const { tabs, loading } = useNavigationAccess();
  const meta = useModuleMeta();

  // Development builds: `EXPO_PUBLIC_PREVIEW_ROUTE=/(tabs)/more` on the Metro command line
  // lands on that screen once the profile is known — for screenshots taken by a script.
  const router = useRouter();
  const previewRoute = process.env.EXPO_PUBLIC_PREVIEW_ROUTE;
  useEffect(() => {
    if (__DEV__ && previewRoute && !loading) router.navigate(previewRoute as never);
  }, [previewRoute, loading, router]);

  /**
   * The active destination is also marked with a tinted pill behind its icon — at
   * icon size a tint change alone is easy to miss.
   */
  const icon = (name: IconSymbolName) =>
    function TabIcon({ color, focused }: { color: string; focused: boolean }) {
      return (
        <View
          style={[
            styles.iconWrap,
            focused && { backgroundColor: custom.colors.tintSoft },
          ]}
        >
          <IconSymbol size={24} name={name} color={color} />
        </View>
      );
    };

  const moduleScreen = (name: TabName, visible: boolean) => (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        title: meta[name].title,
        tabBarAccessibilityLabel: meta[name].title,
        tabBarIcon: icon(meta[name].icon),
        href: visible ? undefined : null,
      }}
    />
  );

  const hidden = MODULE_TABS.filter((name) => !tabs.includes(name));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingVertical: 4 },
        // A hairline separates the bar from the page; a shadow there only
        // smudges the bottom edge of the screen.
        tabBarStyle: Platform.select({
          ios: {
            // Transparent on iOS so the blur effect behind it shows through.
            position: "absolute",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            height: 84,
          },
          default: {
            backgroundColor: palette.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            // Android draws edge to edge, so the system navigation bar sits over the
            // bottom of the window. A fixed height overrides React Navigation's own
            // inset padding and pushes the tabs behind that bar.
            height: 68 + insets.bottom,
            paddingBottom: insets.bottom,
            // Android draws its own shadow above the bar unless this is off.
            elevation: 0,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarAccessibilityLabel: t("navigation.home"),
          tabBarIcon: icon("house.fill"),
        }}
      />
      {tabs.map((name) => moduleScreen(name, true))}
      <Tabs.Screen
        name="more"
        options={{
          title: t("navigation.more"),
          tabBarAccessibilityLabel: t("navigation.more"),
          tabBarIcon: icon("line.3.horizontal"),
        }}
      />
      {hidden.map((name) => moduleScreen(name, false))}

      {/* Old addresses of modules that moved into a grouped tab; they redirect. */}
      <Tabs.Screen name="preparacion" options={{ href: null }} />
      <Tabs.Screen name="entrega" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const ICON_WELL_HEIGHT = 30;

const styles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: ICON_WELL_HEIGHT,
    borderRadius: ICON_WELL_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    // 11, not the 12 of the overline token: at five tabs on a phone "Marketplace" is the
    // longest label and 12 truncates it.
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
