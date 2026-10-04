import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { Appbar, Divider, Portal, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import FullScreenModal from "../ui/FullScreenModal";

interface Props {
  visible: boolean;
  title: string;
  /** While true the sheet cannot be closed — a save or an upload is in flight. */
  busy: boolean;
  onDismiss: () => void;
  /** The new-record form; mounted only while the sheet is open, so each opening starts clean. */
  children: React.ReactNode;
}

/** The full-screen sheet a Catálogo list opens to register a new record. */
const CatalogCreateModal: React.FC<Props> = ({ visible, title, busy, onDismiss, children }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Portal>
      <FullScreenModal visible={visible} onDismiss={onDismiss} dismissable={!busy} style={styles.sheet}>
        <Appbar.Header mode="small" style={styles.appbar}>
          <Appbar.Action icon="close" onPress={onDismiss} disabled={busy} accessibilityLabel={t("common.close")} />
          <Appbar.Content title={title} />
        </Appbar.Header>
        <Divider />
        {visible && children}
      </FullScreenModal>
    </Portal>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: theme.colors.surface,
    },
    appbar: {
      backgroundColor: theme.colors.surface,
    },
  });

export default CatalogCreateModal;
