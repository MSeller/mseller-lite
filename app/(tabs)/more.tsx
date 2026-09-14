import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Divider, List, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import DeleteAccountDialog from "../../components/auth/DeleteAccountDialog";
import ProfileScreen from "../../components/auth/ProfileScreen";
import { LanguageSelector } from "../../components/common/LanguageSelector";
import { LEGAL_URLS } from "../../constants/legal";
import { usePrinter } from "../../contexts/PrinterContext";
import { useUser } from "../../contexts/UserContext";
import { AVAILABLE_LANGUAGES, useTranslation } from "../../hooks/useTranslation";
import { canDeleteAccount } from "../../utils/account";

// The API test screen is a developer tool: offered in local and Dev builds only.
const showDeveloperTools =
  __DEV__ || Constants.expoConfig?.extra?.appEnv === "development";

export default function MoreTab() {
  const router = useRouter();
  const theme = useTheme();
  const { t, currentLanguage } = useTranslation();
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const { available: printingAvailable, printer } = usePrinter();
  const { userProfile } = useUser();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const languageName =
    AVAILABLE_LANGUAGES.find((language) => language.code === currentLanguage)?.nativeName ??
    currentLanguage;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProfileScreen>
        <LanguageSelector
          visible={languageMenuVisible}
          onDismiss={() => setLanguageMenuVisible(false)}
          anchor={
            <List.Item
              title={t("navigation.language")}
              description={languageName}
              left={(props) => <List.Icon {...props} icon="translate" />}
              right={(props) => <List.Icon {...props} icon="chevron-down" />}
              onPress={() => setLanguageMenuVisible(true)}
            />
          }
        />
        {/* Web and builds without the native printer module have nothing to configure. */}
        {printingAvailable && (
          <List.Item
            title={t("printers.title")}
            description={printer ? printer.name || printer.address : t("printers.notConfigured")}
            left={(props) => <List.Icon {...props} icon="printer-pos" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/impresoras")}
          />
        )}
        {showDeveloperTools && (
          <List.Item
            title={t("navigation.apiTest")}
            description={t("navigation.developer")}
            left={(props) => <List.Icon {...props} icon="api" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/api-test")}
          />
        )}
        <List.Item
          title={t("legal.privacy")}
          left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => openBrowserAsync(LEGAL_URLS.privacy)}
        />
        <List.Item
          title={t("legal.terms")}
          left={(props) => <List.Icon {...props} icon="file-document-outline" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => openBrowserAsync(LEGAL_URLS.terms)}
        />
        {/* Deleting the account deletes the whole business, which only its administrator may do. */}
        {canDeleteAccount(userProfile) && (
          <List.Item
            title={t("account.deleteTitle")}
            description={t("account.deleteRowDescription")}
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="delete-forever-outline" color={theme.colors.error} />}
            onPress={() => setDeleteDialogVisible(true)}
          />
        )}
        <Divider style={styles.divider} />
      </ProfileScreen>
      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
});
