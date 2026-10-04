import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Dialog, HelperText, Portal, Text, TextInput, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  deleteBusinessAccount,
  ReauthenticationCancelledError,
  signOutCompletely,
} from "../../services/accountService";
import { hasPasswordLogin } from "../../services/googleSignIn";
import { getBusinessId } from "../../utils/account";
import { WRONG_PASSWORD_CODES } from "../../utils/authErrors";
import AppButton from "../ui/AppButton";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Deletes the administrator's business and every login in it. Two deliberate hurdles, since
 * there is no undo: proving it is really them (the password, or picking their Google account
 * again when they signed up with Google — Firebase needs a fresh sign-in either way) and typing
 * a confirmation word.
 */
const DeleteAccountDialog: React.FC<Props> = ({ visible, onDismiss }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { user, userProfile } = useUser();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const confirmWord = t("account.deleteConfirmWord");
  const businessId = getBusinessId(userProfile);
  const usesPassword = hasPasswordLogin(user);
  const canDelete =
    (!usesPassword || !!password) &&
    confirmation.trim().toLocaleUpperCase() === confirmWord &&
    !!businessId &&
    !deleting;

  const close = () => {
    if (deleting) return;
    setPassword("");
    setConfirmation("");
    setError("");
    onDismiss();
  };

  const handleDelete = async () => {
    if (!user || !businessId || !canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deleteBusinessAccount(user, usesPassword ? { password } : { google: true }, businessId);
      // The server already removed the login; signing out clears what is left on the device.
      await signOutCompletely().catch(() => undefined);
    } catch (err: any) {
      if (err instanceof ReauthenticationCancelledError) {
        setDeleting(false);
        return;
      }
      console.error("Delete account error:", err);
      setError(
        WRONG_PASSWORD_CODES.includes(err?.code)
          ? t("account.deleteWrongPassword")
          : t("account.deleteFailed"),
      );
      setDeleting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={close} dismissable={!deleting}>
        <Dialog.Icon icon="alert" color={theme.colors.error} />
        <Dialog.Title style={styles.center}>{t("account.deleteTitle")}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text variant="bodyMedium">
              {t("account.deleteWarning", { business: userProfile?.business?.name ?? "" })}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("account.deleteRetention")}
            </Text>
            {usesPassword ? (
              <TextInput
                mode="outlined"
                label={t("account.deletePasswordLabel")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                disabled={deleting}
              />
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t("account.deleteGoogleHint")}
              </Text>
            )}
            <TextInput
              mode="outlined"
              label={t("account.deleteConfirmLabel", { word: confirmWord })}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              autoCorrect={false}
              disabled={deleting}
            />
            {!!error && (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <AppButton onPress={close} disabled={deleting}>
            {t("common.cancel")}
          </AppButton>
          <AppButton
            onPress={handleDelete}
            loading={deleting}
            disabled={!canDelete}
            textColor={theme.colors.error}
          >
            {t("account.deleteButton")}
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  center: {
    textAlign: "center",
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 12,
  },
});

export default DeleteAccountDialog;
