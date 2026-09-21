import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const palette = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  // Tabs are offered by user type (hooks/useNavigationAccess). `href: null` hides a
  // tab and unregisters its route, so it cannot be reached by deep link either; the
  // grouped screens and DocumentAccessGate still guard the modules themselves.
  const { can } = useNavigationAccess();
  const hideUnless = (allowed: boolean) => (allowed ? undefined : null);

  /**
   * Five destinations at most for every operational role: related modules share a
   * tab and switch at the top (Rutas: Preparación / Entregas; Inventario: Conteo /
   * Productos), and account settings live under Más. That leaves room for labels
   * again, which read far better than icons alone. Administrators and superusers are
   * the one exception, with a sixth tab — Catálogo: Clientes / Productos — for editing
   * master data; six labelled tabs still fit, and no other role is offered it.
   *
   * The active destination is also marked with a tinted pill behind its icon — at
   * icon size a tint change alone is easy to miss.
   */
  const icon = (name: IconName) =>
    function TabIcon({ color, focused }: { color: string; focused: boolean }) {
      return (
        <View
          style={[
            styles.iconWrap,
            focused && { backgroundColor: `${palette.tint}14` },
          ]}
        >
          <IconSymbol size={24} name={name} color={color} />
        </View>
      );
    };

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
      <Tabs.Screen
        name="documents"
        options={{
          title: t("navigation.documents"),
          tabBarAccessibilityLabel: t("navigation.documents"),
          href: hideUnless(can("documents")),
          tabBarIcon: icon("doc.text.fill"),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: t("navigation.routes"),
          tabBarAccessibilityLabel: t("navigation.routes"),
          href: hideUnless(can("picking") || can("deliveries")),
          tabBarIcon: icon("map.fill"),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: t("navigation.stock"),
          tabBarAccessibilityLabel: t("navigation.stock"),
          href: hideUnless(can("stockCount") || can("products")),
          tabBarIcon: icon("archivebox.fill"),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t("navigation.catalog"),
          tabBarAccessibilityLabel: t("navigation.catalog"),
          href: hideUnless(can("catalogCustomers") || can("catalogProducts")),
          tabBarIcon: icon("books.vertical.fill"),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t("navigation.marketplace"),
          tabBarAccessibilityLabel: t("navigation.marketplace"),
          href: hideUnless(can("marketplace")),
          tabBarIcon: icon("storefront.fill"),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t("navigation.more"),
          tabBarAccessibilityLabel: t("navigation.more"),
          tabBarIcon: icon("line.3.horizontal"),
        }}
      />

      {/* Old addresses of modules that moved into a grouped tab; they redirect. */}
      <Tabs.Screen name="preparacion" options={{ href: null }} />
      <Tabs.Screen name="entrega" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
