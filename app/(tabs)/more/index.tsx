import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Divider, List, Menu, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import DeleteAccountDialog from "../../../components/auth/DeleteAccountDialog";
import ProfileScreen from "../../../components/auth/ProfileScreen";
import { LanguageSelector } from "../../../components/common/LanguageSelector";
import { LEGAL_URLS } from "../../../constants/legal";
import { usePrinter } from "../../../contexts/PrinterContext";
import { useUser } from "../../../contexts/UserContext";
import { useModuleMeta } from "../../../components/navigation/moduleMeta";
import { useNavigationAccess } from "../../../hooks/useNavigationAccess";
import { USER_TYPES } from "../../../types/user";
import { AVAILABLE_LANGUAGES, useTranslation } from "../../../hooks/useTranslation";
import { canDeleteAccount } from "../../../utils/account";

// The API test screen is a developer tool: offered in local and Dev builds only.
const showDeveloperTools =
  __DEV__ || Constants.expoConfig?.extra?.appEnv === "development";

export default function MoreTab() {
  const router = useRouter();
  const theme = useTheme();
  const { t, currentLanguage } = useTranslation();
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const { available: printingAvailable, printer } = usePrinter();
  const { userProfile, previewUserType, setPreviewUserType } = useUser();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [previewMenuVisible, setPreviewMenuVisible] = useState(false);
  // Modules the role uses less often live here instead of as tabs, so the bar stays at five.
  const { moreEntries } = useNavigationAccess();
  const meta = useModuleMeta();
  const moreIcons = {
    routes: "map-outline",
    stock: "package-variant-closed",
    catalog: "book-open-variant",
    marketplace: "storefront-outline",
  } as const;

  const languageName =
    AVAILABLE_LANGUAGES.find((language) => language.code === currentLanguage)?.nativeName ??
    currentLanguage;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProfileScreen>
        {moreEntries.map((entry) => (
          <List.Item
            key={entry}
            title={meta[entry].title}
            description={meta[entry].description || undefined}
            left={(props) => <List.Icon {...props} icon={moreIcons[entry]} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push(`/(tabs)/more/${entry}`)}
          />
        ))}
        {moreEntries.length > 0 && <Divider style={styles.divider} />}
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
          <Menu
            visible={previewMenuVisible}
            onDismiss={() => setPreviewMenuVisible(false)}
            anchor={
              <List.Item
                title={t("navigation.previewRole")}
                description={
                  previewUserType
                    ? t(`home.userTypes.${previewUserType}`)
                    : t("navigation.previewRoleOff")
                }
                left={(props) => <List.Icon {...props} icon="account-switch-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-down" />}
                onPress={() => setPreviewMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              title={t("navigation.previewRoleOff")}
              trailingIcon={previewUserType ? undefined : "check"}
              onPress={() => {
                setPreviewUserType(null);
                setPreviewMenuVisible(false);
              }}
            />
            {USER_TYPES.map((type) => (
              <Menu.Item
                key={type}
                title={t(`home.userTypes.${type}`)}
                trailingIcon={previewUserType === type ? "check" : undefined}
                onPress={() => {
                  setPreviewUserType(type);
                  setPreviewMenuVisible(false);
                }}
              />
            ))}
          </Menu>
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
