import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, HelperText, Snackbar, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import { CatalogFormLocked } from "./CatalogFields";
import { useHardwareBack } from "./useCatalogRecord";

interface Props {
  title: string;
  /** Unsaved changes: leaving asks first. */
  dirty: boolean;
  /** While true every catalog field inside is disabled. */
  saving: boolean;
  onSave: () => void;
  /** Leaves the form. Called directly when clean, after confirmation when dirty. */
  onClose: () => void;
  /** The save failure, shown at the top of the form and in a snackbar. Clear it when a save starts. */
  error: string;
  children: React.ReactNode;
}

/**
 * The frame every catalog edit form shares: app bar with back, a keyboard-aware scroll,
 * the Guardar bar, the save error, and the "discard changes?" question on the app bar
 * back and Android's back button alike.
 */
const CatalogEditScaffold: React.FC<Props> = ({
  title,
  dirty,
  saving,
  onSave,
  onClose,
  error,
  children,
}) => {
  const theme = useTheme() as CustomTheme;
  // iOS draws the tab bar over the screen; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  // Every press of Guardar counts, so a second failure with the same message still gets
  // feedback: the snackbar comes back and the form scrolls up to the error summary. The
  // per-field messages sit under their fields from the first failed attempt on.
  const [attempt, setAttempt] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  useEffect(() => {
    setSnackbarVisible(!!error);
    if (error) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [error, attempt]);

  const handleSave = useCallback(() => {
    setAttempt((n) => n + 1);
    onSave();
  }, [onSave]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (!dirty) {
      onClose();
      return;
    }
    if (Platform.OS === "web") {
      // react-native-web's Alert has no buttons, so the question would never be asked.
      const { confirm } = globalThis as unknown as { confirm: (message: string) => boolean };
      if (confirm(`${t("catalog.discardTitle")}\n\n${t("catalog.discardBody")}`)) onClose();
      return;
    }
    Alert.alert(t("catalog.discardTitle"), t("catalog.discardBody"), [
      { text: t("catalog.keepEditing"), style: "cancel" },
      { text: t("catalog.discard"), style: "destructive", onPress: onClose },
    ]);
  }, [dirty, saving, onClose, t]);

  useHardwareBack(
    useCallback(() => {
      requestClose();
      return true;
    }, [requestClose])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={requestClose} disabled={saving} />
        <Appbar.Content title={title} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {!!error && (
            <HelperText type="error" visible style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </HelperText>
          )}
          <CatalogFormLocked.Provider value={saving}>{children}</CatalogFormLocked.Provider>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 12 + tabOverflow }]}>
          <Button
            mode="contained"
            icon="content-save"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !dirty}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t("common.save")}
          </Button>
        </View>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        // Above the save bar, so the message never covers the button to try again.
        wrapperStyle={{ bottom: tabOverflow + 76 }}
        action={{ label: t("common.close"), onPress: () => setSnackbarVisible(false) }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    error: {
      marginBottom: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    button: {
      borderRadius: 12,
    },
    buttonContent: {
      height: 52,
    },
  });

export default CatalogEditScaffold;
