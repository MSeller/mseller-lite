import { openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Snackbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { LEGAL_URLS } from "../../constants/legal";
import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { createBusinessForSignedInUser, signOutCompletely } from "../../services/accountService";
import { isEmailAlreadyRegistered } from "../../utils/account";

/**
 * Shown when someone signs in with Google and that login has no MSeller account. Creating the
 * business is an explicit choice, so a seller who picked the wrong Google account does not end
 * up with a stray business; after it is created the setup wizard takes over.
 */
const CreateBusinessScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { user, refreshUserProfile } = useUser();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      await createBusinessForSignedInUser(user);
      // The new profile (setup not finished) routes the administrator into the wizard.
      await refreshUserProfile();
    } catch (err: any) {
      console.error("Create business error:", err);
      setError(
        isEmailAlreadyRegistered(err?.message)
          ? t("createBusiness.alreadyRegistered")
          : t("createBusiness.failed"),
      );
    } finally {
      setCreating(false);
    }
  };

  const initials = (user.displayName || user.email || "?")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.content}>
            {user.photoURL ? (
              <Avatar.Image size={72} source={{ uri: user.photoURL }} />
            ) : (
              <Avatar.Text size={72} label={initials} />
            )}
            <Text variant="titleMedium">{user.displayName}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {user.email}
            </Text>

            <Text variant="headlineSmall" style={styles.title}>
              {t("createBusiness.title")}
            </Text>
            <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
              {t("createBusiness.body", { email: user.email ?? "" })}
            </Text>

            <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
              {t("auth.legalNotice")}{" "}
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.primary }}
                onPress={() => openBrowserAsync(LEGAL_URLS.terms)}
              >
                {t("legal.terms")}
              </Text>{" "}
              {t("auth.legalAnd")}{" "}
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.primary }}
                onPress={() => openBrowserAsync(LEGAL_URLS.privacy)}
              >
                {t("legal.privacy")}
              </Text>
              .
            </Text>

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleCreate}
                loading={creating}
                disabled={creating}
                contentStyle={styles.buttonContent}
              >
                {t("createBusiness.create")}
              </Button>
              <Button mode="text" onPress={signOutCompletely} disabled={creating}>
                {t("createBusiness.useAnotherAccount")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={6000}
        action={{ label: t("common.close"), onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 16,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  content: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  center: {
    textAlign: "center",
  },
  actions: {
    alignSelf: "stretch",
    marginTop: 16,
    gap: 8,
  },
  buttonContent: {
    paddingVertical: 12,
  },
});

export default CreateBusinessScreen;
