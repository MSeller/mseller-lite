import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Divider, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import ProfileScreen from "../../components/auth/ProfileScreen";
import { LanguageSelector } from "../../components/common/LanguageSelector";
import { AVAILABLE_LANGUAGES, useTranslation } from "../../hooks/useTranslation";

// The API test screen is a developer tool: offered in local and Dev builds only.
const showDeveloperTools =
  __DEV__ || Constants.expoConfig?.extra?.appEnv === "development";

export default function MoreTab() {
  const router = useRouter();
  const { t, currentLanguage } = useTranslation();
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

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
        {showDeveloperTools && (
          <List.Item
            title={t("navigation.apiTest")}
            description={t("navigation.developer")}
            left={(props) => <List.Icon {...props} icon="api" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push("/api-test")}
          />
        )}
        <Divider style={styles.divider} />
      </ProfileScreen>
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
