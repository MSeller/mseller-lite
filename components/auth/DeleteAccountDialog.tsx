import { signOut } from "firebase/auth";
import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, TextInput, useTheme } from "react-native-paper";

import { auth } from "../../config/firebase";
import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { deleteBusinessAccount } from "../../services/accountService";
import { getBusinessId } from "../../utils/account";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const WRONG_PASSWORD_CODES = ["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"];

/**
 * Deletes the administrator's business and every login in it. Two deliberate hurdles, since
 * there is no undo: the password (which Firebase also needs for a fresh sign-in) and typing a
 * confirmation word.
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
  const canDelete =
    !!password && confirmation.trim().toLocaleUpperCase() === confirmWord && !!businessId && !deleting;

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
      await deleteBusinessAccount(user, password, businessId);
      // The server already removed the login; signing out clears what is left on the device.
      await signOut(auth).catch(() => undefined);
    } catch (err: any) {
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
          <Button onPress={close} disabled={deleting}>
            {t("common.cancel")}
          </Button>
          <Button
            onPress={handleDelete}
            loading={deleting}
            disabled={!canDelete}
            textColor={theme.colors.error}
          >
            {t("account.deleteButton")}
          </Button>
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
