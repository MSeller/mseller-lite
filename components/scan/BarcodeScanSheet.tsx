import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, IconButton, Modal, Portal, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { hasNativeModules } from "../../utils/nativeModules";

/**
 * `expo-camera`, only when this binary contains it. Requiring it on a build made before it was
 * added throws while the module evaluates — see hasNativeModules — so it is loaded behind the
 * check instead of imported.
 */
const camara: typeof import("expo-camera") | null = hasNativeModules("ExpoCamera")
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- must stay behind the presence check; a static import crashes older binaries
    require("expo-camera")
  : null;

/** The symbologies found on retail products and shelf labels. */
const TIPOS_CODIGO = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "itf14",
  "codabar",
  "qr",
  "datamatrix",
  "pdf417",
] as const;

/** The same code read again within this window is the same scan, not a second one. */
const MISMO_CODIGO_MS = 1500;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Called once per scan. The sheet ignores new reads while a returned promise is pending. */
  onScan: (codigo: string) => void | Promise<void>;
  title: string;
  /**
   * Keep the camera open after each scan — building a document is several products in a row.
   * When false the sheet closes after the first read.
   */
  continuous?: boolean;
  /** A line shown under the camera, e.g. what the last scan did. */
  feedback?: string;
}

/**
 * Reads a barcode with the phone's camera. The same `onScan` a hardware scanner feeds through
 * useBarcodeScanner, so a screen handles both kinds of scanner with one callback.
 */
const BarcodeScanSheet: React.FC<Props> = ({ visible, onDismiss, onScan, title, continuous, feedback }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            accessibilityLabel={t("common.close")}
            iconColor="#fff"
          />
        </View>

        {camara ? (
          <Escaner
            camara={camara}
            onScan={onScan}
            continuous={continuous}
            onDone={onDismiss}
            styles={styles}
          />
        ) : (
          <View style={styles.center}>
            <Icon source="barcode-off" size={48} color="#fff" />
            <Text style={styles.notice}>{t("scan.unavailable")}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {!!feedback && (
            <Text variant="bodyLarge" style={styles.feedback} numberOfLines={2}>
              {feedback}
            </Text>
          )}
          <Button mode="contained" onPress={onDismiss} contentStyle={styles.doneContent}>
            {t("common.confirm")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

interface EscanerProps {
  camara: typeof import("expo-camera");
  onScan: Props["onScan"];
  continuous?: boolean;
  onDone: () => void;
  styles: ReturnType<typeof createStyles>;
}

/** Split out so the permission hook only runs when the camera module exists. */
const Escaner: React.FC<EscanerProps> = ({ camara, onScan, continuous, onDone, styles }) => {
  const { t } = useTranslation();
  const [permiso, pedirPermiso] = camara.useCameraPermissions();
  const [pausado, setPausado] = useState(false);
  const ultimo = useRef<{ codigo: string; en: number } | null>(null);

  useEffect(() => {
    if (permiso && !permiso.granted && permiso.canAskAgain) pedirPermiso();
  }, [permiso, pedirPermiso]);

  const alLeer = useCallback(
    async ({ data }: { data: string }) => {
      const codigo = data?.trim();
      if (!codigo || pausado) return;

      const ahora = Date.now();
      if (ultimo.current?.codigo === codigo && ahora - ultimo.current.en < MISMO_CODIGO_MS) return;
      ultimo.current = { codigo, en: ahora };

      setPausado(true);
      try {
        await onScan(codigo);
      } finally {
        setPausado(false);
        if (!continuous) onDone();
      }
    },
    [pausado, onScan, continuous, onDone]
  );

  if (!permiso) return <View style={styles.center} />;

  if (!permiso.granted) {
    return (
      <View style={styles.center}>
        <Icon source="camera-off" size={48} color="#fff" />
        <Text style={styles.notice}>{t("scan.permission")}</Text>
        {permiso.canAskAgain && (
          <Button mode="contained" onPress={pedirPermiso}>
            {t("scan.allowCamera")}
          </Button>
        )}
      </View>
    );
  }

  const { CameraView } = camara;
  return (
    <View style={styles.cameraWrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...TIPOS_CODIGO] }}
        onBarcodeScanned={pausado ? undefined : alLeer}
      />
      <View pointerEvents="none" style={styles.frame} />
    </View>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    modal: {
      flex: 1,
      margin: 0,
      backgroundColor: "#000",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 20,
      paddingTop: 12,
    },
    title: {
      color: "#fff",
      fontWeight: "700",
      flex: 1,
    },
    cameraWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    frame: {
      width: "75%",
      aspectRatio: 1.6,
      borderRadius: 16,
      borderWidth: 3,
      borderColor: theme.colors.primaryContainer,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingHorizontal: 32,
    },
    notice: {
      color: "#fff",
      textAlign: "center",
    },
    footer: {
      padding: 16,
      gap: 12,
    },
    feedback: {
      color: "#fff",
      textAlign: "center",
    },
    doneContent: {
      minHeight: 52,
    },
  });

export default BarcodeScanSheet;
