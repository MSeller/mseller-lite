import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { signOutCompletely } from "../../services/accountService";

interface Props {
  /**
   * "unavailable": the profile could not be loaded. "missing": the login has no MSeller business
   * and this build cannot create one (iOS), so the user asks their administrator for access.
   */
  reason?: "unavailable" | "missing";
}

/**
 * Signed in, but the profile could not be loaded (offline, or the profile call failed). Without
 * it the app cannot tell which business to talk to or whether setup is still pending, so the
 * user retries or signs out instead of landing in an app that cannot work.
 */
const ProfileUnavailableScreen: React.FC<Props> = ({ reason = "unavailable" }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { user, refreshUserProfile } = useUser();
  const missing = reason === "missing";
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshUserProfile();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon
          source={missing ? "account-question-outline" : "cloud-alert-outline"}
          size={56}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="titleLarge" style={styles.center}>
          {missing ? t("profileUnavailable.missingTitle") : t("profileUnavailable.title")}
        </Text>
        <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          {missing
            ? t("profileUnavailable.missingBody", { email: user?.email ?? "" })
            : t("profileUnavailable.body")}
        </Text>
        <Button mode="contained" onPress={handleRetry} loading={retrying} disabled={retrying} style={styles.button}>
          {t("common.retry")}
        </Button>
        <Button mode="text" onPress={signOutCompletely} disabled={retrying}>
          {t("auth.signOut")}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  center: {
    textAlign: "center",
  },
  button: {
    marginTop: 12,
    alignSelf: "stretch",
  },
});

export default ProfileUnavailableScreen;
