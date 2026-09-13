import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useDocumentAccess } from "@/hooks/useDocumentAccess";
import { useTranslation } from "@/hooks/useTranslation";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  // Drivers deliver documents, they don't capture them — the tab is not theirs.
  // `href: null` unregisters the route, so a driver cannot reach it by deep link
  // either; DocumentAccessGate still guards the screens themselves.
  const { canCreateDocuments } = useDocumentAccess();
  const palette = Colors[colorScheme ?? "light"];

  /**
   * The active destination is marked with a tinted pill behind its icon rather
   * than by colour alone — at icon size a tint change is easy to miss, and the
   * pill gives the bar a focal point.
   *
   * Labels are off on purpose. Eight destinations leave ~38px of label width on
   * a phone, and every word longer than "Home" ellipsised to "Docu…" / "Invent…"
   * — measurably worse to read than the icon alone. Each screen titles itself in
   * its own header, so the name is never more than a tap away. If the tab count
   * ever comes down to five or so, turn `tabBarShowLabel` back on.
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
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingVertical: 6 },
        // A hairline separates the bar from the page; a shadow there only
        // smudges the bottom edge of the screen.
        tabBarStyle: Platform.select({
          ios: {
            // Transparent on iOS so the blur effect behind it shows through.
            position: "absolute",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            height: 78,
          },
          default: {
            backgroundColor: palette.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            height: 60,
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
          href: canCreateDocuments ? undefined : null,
          tabBarIcon: icon("doc.text.fill"),
        }}
      />
      <Tabs.Screen
        name="preparacion"
        options={{
          title: t("navigation.preparacion"),
          tabBarAccessibilityLabel: t("navigation.preparacion"),
          tabBarIcon: icon("map.fill"),
        }}
      />
      <Tabs.Screen
        name="entrega"
        options={{
          title: t("navigation.entrega"),
          tabBarAccessibilityLabel: t("navigation.entrega"),
          tabBarIcon: icon("shippingbox.fill"),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t("navigation.inventory"),
          tabBarAccessibilityLabel: t("navigation.inventory"),
          tabBarIcon: icon("barcodescan.fill"),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("navigation.products"),
          tabBarAccessibilityLabel: t("navigation.products"),
          tabBarIcon: icon("barcode"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          tabBarAccessibilityLabel: t("navigation.profile"),
          tabBarIcon: icon("profile.fill"),
        }}
      />
      <Tabs.Screen
        name="api-test"
        options={{
          title: t("navigation.apiTest"),
          tabBarAccessibilityLabel: t("navigation.apiTest"),
          tabBarIcon: icon("settings.fill"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 46,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
