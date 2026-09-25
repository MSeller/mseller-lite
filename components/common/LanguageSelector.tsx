import {
  AVAILABLE_LANGUAGES,
  LanguageCode,
  useTranslation,
} from "@/hooks/useTranslation";
import type { CustomTheme } from "@/constants/Theme";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Button, Divider, Menu, useTheme } from "react-native-paper";

interface LanguageSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onDismiss,
  anchor,
}) => {
  const { changeLanguage, currentLanguage } = useTranslation();
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    try {
      await changeLanguage(languageCode);
      onDismiss();
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      contentStyle={styles.menuContent}
    >
      {AVAILABLE_LANGUAGES.map((language, index) => (
        <React.Fragment key={language.code}>
          <Menu.Item
            onPress={() => handleLanguageChange(language.code)}
            title={language.nativeName}
            titleStyle={[
              styles.menuItemTitle,
              currentLanguage === language.code && styles.activeLanguage,
            ]}
            leadingIcon={
              currentLanguage === language.code ? "check" : undefined
            }
          />
          {index < AVAILABLE_LANGUAGES.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </Menu>
  );
};

interface LanguageButtonProps {
  onPress: () => void;
}

export const LanguageButton: React.FC<LanguageButtonProps> = ({ onPress }) => {
  const { currentLanguage } = useTranslation();

  const currentLang = AVAILABLE_LANGUAGES.find(
    (lang) => lang.code === currentLanguage
  );

  return (
    <Button
      mode="outlined"
      onPress={onPress}
      icon="translate"
      compact
      style={buttonStyles.languageButton}
    >
      {currentLang?.code.toUpperCase() || "EN"}
    </Button>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    menuContent: {
      backgroundColor: theme.custom.colors.surfaceCard,
      borderRadius: theme.custom.radius.segment,
      minWidth: 120,
    },
    menuItemTitle: {
      fontSize: theme.custom.type.body.fontSize,
      color: theme.custom.colors.ink,
    },
    activeLanguage: {
      fontWeight: "bold",
      color: theme.custom.colors.tint,
    },
  });

const buttonStyles = StyleSheet.create({
  languageButton: {
    minWidth: 60,
  },
});
