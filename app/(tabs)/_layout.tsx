import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useDocumentAccess } from "@/hooks/useDocumentAccess";
import { useTranslation } from "@/hooks/useTranslation";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  // Drivers deliver documents, they don't capture them — the tab is not theirs.
  // `href: null` unregisters the route, so a driver cannot reach it by deep link
  // either; DocumentAccessGate still guards the screens themselves.
  const { canCreateDocuments } = useDocumentAccess();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
            borderTopWidth: 0,
          },
          default: {
            borderTopWidth: 0,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.home"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
          name="explore"
          options={{
            title: t("navigation.explore"),
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="paperplane.fill" color={color} />
            ),
          }}
        /> */}
      <Tabs.Screen
        name="documents"
        options={{
          title: t("navigation.documents"),
          href: canCreateDocuments ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="doc.text.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="preparacion"
        options={{
          title: t("navigation.preparacion"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="entrega"
        options={{
          title: t("navigation.entrega"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="shippingbox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t("navigation.inventory"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="barcodescan.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("navigation.products"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="barcode" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("navigation.profile"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="profile.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="api-test"
        options={{
          title: t("navigation.apiTest"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="settings.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
