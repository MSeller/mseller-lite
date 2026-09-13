import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNavigationAccess, type NavSection } from "../../hooks/useNavigationAccess";
import { useTranslation } from "../../hooks/useTranslation";
import SectionSwitcher, { type SectionOption } from "./SectionSwitcher";

interface GroupedTabScreenProps<T extends NavSection> {
  /** Every module this tab can hold, in display order. Filtered here by user type. */
  sections: SectionOption<T>[];
  /** Renders one module, with the switcher to place at the top of its own layout. */
  renderSection: (section: T, switcher: React.ReactNode) => React.ReactNode;
}

/**
 * One bottom tab that holds several modules. The selected module lives in the
 * `section` search param, so `/(tabs)/routes?section=deliveries` deep-links to it
 * and switching modules does not stack history.
 *
 * A module stays mounted once opened and is only hidden when the user switches
 * away, so going back keeps its search text and scroll position and does not
 * refetch.
 */
export default function GroupedTabScreen<T extends NavSection>({
  sections,
  renderSection,
}: GroupedTabScreenProps<T>) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading } = useNavigationAccess();
  const { section: requested } = useLocalSearchParams<{ section?: string }>();

  const allowed = sections.filter((option) => can(option.value));
  const current = allowed.find((option) => option.value === requested) ?? allowed[0];
  const [visited, setVisited] = useState<T[]>([]);
  if (current && !visited.includes(current.value)) {
    // Recorded during render so the newly selected module mounts in this same pass.
    setVisited([...visited, current.value]);
  }

  if (!current) {
    // The tab is hidden when nothing is allowed; this is for a deep link or a
    // profile that is still loading.
    return (
      <SafeAreaView style={[styles.empty, { backgroundColor: theme.colors.background }]}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Icon source="lock-outline" size={56} color={theme.colors.onSurfaceVariant} />
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {t("navigation.noSections")}
            </Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  const switcher = (
    <SectionSwitcher
      sections={allowed}
      value={current.value}
      onChange={(next) => router.setParams({ section: next })}
    />
  );

  return (
    <>
      {allowed
        .filter((option) => option.value === current.value || visited.includes(option.value))
        .map((option) => {
          const active = option.value === current.value;
          return (
            <View
              key={option.value}
              style={active ? styles.section : styles.hidden}
              pointerEvents={active ? "auto" : "none"}
              accessibilityElementsHidden={!active}
              importantForAccessibility={active ? "auto" : "no-hide-descendants"}
            >
              {renderSection(option.value, switcher)}
            </View>
          );
        })}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyText: {
    textAlign: "center",
  },
});
