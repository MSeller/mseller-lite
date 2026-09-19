import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator, Button, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNavigationAccess, type NavSection } from "../../hooks/useNavigationAccess";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";

interface Props {
  section: NavSection;
  /** Whose job this is, e.g. "La carga del camión la realiza el chofer o la oficina." */
  message: string;
  children: React.ReactNode;
}

/**
 * Renders a module screen only for user types offered that module (hooks/useNavigationAccess).
 *
 * Menus already hide what a user type cannot do, but expo-router keeps every screen routable,
 * so a deep link or a stale navigation state can still land a driver on picking or a picker on
 * a delivery. The children do not mount until access is known, so their first request never
 * fires for the wrong role.
 */
const SectionAccessGate: React.FC<Props> = ({ section, message, children }) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading } = useNavigationAccess();

  if (!loading && can(section)) return <>{children}</>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <EmptyState
            icon="lock-outline"
            title={t("documents.accessDeniedTitle")}
            message={message}
          />
          <Button mode="outlined" icon="home-outline" onPress={() => router.replace("/(tabs)")}>
            {t("navigation.home")}
          </Button>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
});

export default SectionAccessGate;
