import React, { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, HelperText, Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { ImageTooLargeError } from "../../../services/mediaService";
import { PhotoPermissionError, type PhotoSource } from "../../../utils/photoCapture";
import { pickAndUploadProductPhoto, type UploadedProductPhoto } from "../../../utils/productPhoto";

interface Props {
  /** The photo picked in this session, if any. */
  value: UploadedProductPhoto | null;
  onChange: (photo: UploadedProductPhoto | null) => void;
  /** The product's current photo, shown until a new one is picked. */
  currentUrl?: string | null;
  /** Lets the parent hold its save button while an upload is in flight. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}

/**
 * A product photo: take one or choose one, see it straight away, and have it uploaded to the
 * media library by the time the product is saved.
 *
 * The upload starts as soon as the photo is picked rather than on save. Saving a product is
 * the moment a seller is waiting in front of a customer; paying for a multi-megabyte upload
 * there, with the chance of it failing after the form was filled in, is the wrong time.
 */
const ProductPhotoField: React.FC<Props> = ({ value, onChange, currentUrl, onBusyChange, disabled }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const elegir = useCallback(
    async (source: PhotoSource) => {
      setError("");
      setSubiendo(true);
      onBusyChange?.(true);
      try {
        const subida = await pickAndUploadProductPhoto(source);
        if (subida) onChange(subida);
      } catch (e) {
        if (e instanceof PhotoPermissionError) setError(t("documents.productPhoto.cameraPermission"));
        else if (e instanceof ImageTooLargeError) setError(t("documents.productPhoto.tooLarge"));
        else setError(t("documents.productPhoto.uploadFailed"));
      } finally {
        setSubiendo(false);
        onBusyChange?.(false);
      }
    },
    [onChange, onBusyChange, t]
  );

  const vista = value?.preview ?? currentUrl ?? null;
  const bloqueado = disabled || subiendo;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.tile}>
          {vista ? (
            <Image source={{ uri: vista }} style={styles.image} accessibilityIgnoresInvertColors />
          ) : (
            <Icon source="camera-outline" size={32} color={theme.colors.onSurfaceVariant} />
          )}
          {subiendo && (
            <View style={styles.overlay}>
              <ActivityIndicator color={theme.colors.onPrimary} />
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained-tonal"
            icon="camera"
            onPress={() => elegir("camera")}
            disabled={bloqueado}
            contentStyle={styles.buttonContent}
          >
            {t("documents.productPhoto.takePhoto")}
          </Button>
          <Button
            mode="outlined"
            icon="image-outline"
            onPress={() => elegir("library")}
            disabled={bloqueado}
            contentStyle={styles.buttonContent}
          >
            {t("documents.productPhoto.choosePhoto")}
          </Button>
        </View>
      </View>

      {!!value && !subiendo && (
        <Button mode="text" icon="close" compact onPress={() => onChange(null)} disabled={disabled}>
          {t("documents.productPhoto.remove")}
        </Button>
      )}

      <HelperText type={error ? "error" : "info"} visible={!!error || subiendo}>
        {error || t("documents.productPhoto.uploading")}
      </HelperText>
    </View>
  );
};

const TILE = 96;

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    tile: {
      width: TILE,
      height: TILE,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    image: {
      width: TILE,
      height: TILE,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      flex: 1,
      gap: 8,
    },
    buttonContent: {
      // A finger, not a pointer.
      minHeight: 44,
    },
  });

export default ProductPhotoField;
