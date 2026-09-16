import { Tabs, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text, useTheme } from "react-native-paper";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";

function TabHeader({ rutaId }: { rutaId: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    // Pop the entire [rutaId] Tabs group off the Stack,
    // returning to the routes list. router.back() would just
    // switch tabs within the nested Tabs navigator.
    if (navigation.getParent()?.canGoBack()) {
      navigation.getParent()?.goBack();
    } else {
      router.replace({ pathname: "/(tabs)/routes", params: { section: "picking" } });
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backBtn, { backgroundColor: theme.colors.surfaceVariant }]}
        hitSlop={8}
      >
        <Icon source="arrow-left" size={22} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={styles.titleGroup}>
        <Text
          variant="labelSmall"
          style={[styles.moduleLabel, { color: theme.colors.primary }]}
        >
          {t("preparacion.wavePicking")}
        </Text>
        <Text
          variant="titleMedium"
          style={[styles.routeTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          #{rutaId}
        </Text>
      </View>
    </View>
  );
}

export default function RutaIdLayout() {
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const { t } = useTranslation();
  const { can } = useNavigationAccess();
  // A fixed tab bar height overrides React Navigation's inset padding, which put the
  // tabs behind Android's navigation bar (and the iOS home indicator).
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <TabHeader rutaId={rutaId ?? ""} />,
        tabBarActiveTintColor: "#003ec7",
        tabBarInactiveTintColor: "#9E9E9E",
        tabBarStyle: [
          styles.tabBar,
          { height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="picking"
        options={{
          title: t("preparacion.tabPicking"),
          tabBarIcon: ({ color, size }) => (
            <Icon source="package-variant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loading"
        options={{
          // Inventory pickers prepare the route; loading it is the driver's and back
          // office's job. This only hides the tab — expo-router keeps the screen
          // routable — so loading.tsx guards itself as well.
          href: can("truckLoading") ? undefined : null,
          title: t("preparacion.tabLoading"),
          tabBarIcon: ({ color, size }) => (
            <Icon source="truck-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: t("preparacion.tabInventory"),
          tabBarIcon: ({ color, size }) => (
            <Icon source="clipboard-list-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Pushed on stack — not shown in tab bar */}
      <Tabs.Screen name="confirmar-producto" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  titleGroup: {
    flex: 1,
  },
  moduleLabel: {
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 10,
    textTransform: "uppercase",
  },
  routeTitle: {
    fontWeight: "800",
    lineHeight: 22,
  },
  tabBar: {
    paddingTop: 4,
    // A hairline rule marks the boundary. An upward shadow only smudges the
    // edge of the screen and reads as a rendering artefact on a light page.
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
