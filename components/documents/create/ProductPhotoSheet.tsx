import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, Modal, Portal, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { addProductImages } from "../../../services/ProductService";
import type { ProductImage } from "../../../types/documents";
import type { Product } from "../../../types/inventory";
import { productThumbnailUrl, type UploadedProductPhoto } from "../../../utils/productPhoto";
import ProductPhotoField from "./ProductPhotoField";

interface Props {
  /** The product to add a photo to; the sheet is open while this is set. */
  product: Product | null;
  onDismiss: () => void;
  /** Every image the product has after the save, so the caller can refresh its row. */
  onSaved: (codigo: string, imagenes: ProductImage[]) => void;
}

/**
 * Adds a photo to a product that is already in the catalogue — the common case in the field
 * of an item nobody ever photographed. Uses the same photo field as creating a product, so
 * picking, uploading and the error messages behave identically in both places.
 */
const ProductPhotoSheet: React.FC<Props> = ({ product, onDismiss, onSaved }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [foto, setFoto] = useState<UploadedProductPhoto | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFoto(null);
    setError("");
  }, [product]);

  const guardar = useCallback(async () => {
    if (!product || !foto) return;
    setGuardando(true);
    setError("");
    try {
      const imagenes = await addProductImages(product.codigo, [foto.photo]);
      onSaved(product.codigo, imagenes);
      onDismiss();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("documents.productPhoto.attachFailed"));
    } finally {
      setGuardando(false);
    }
  }, [product, foto, onSaved, onDismiss, t]);

  const ocupado = subiendo || guardando;

  return (
    <Portal>
      <Modal
        visible={!!product}
        onDismiss={ocupado ? () => {} : onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleLarge" style={styles.title}>
          {t("documents.productPhoto.sheetTitle")}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle} numberOfLines={2}>
          {product?.nombre || product?.codigo}
        </Text>

        <ProductPhotoField
          value={foto}
          onChange={setFoto}
          currentUrl={productThumbnailUrl(product?.imagenes)}
          onBusyChange={setSubiendo}
          disabled={guardando}
        />

        {!!error && (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        )}

        <View style={styles.footer}>
          <Button mode="text" onPress={onDismiss} disabled={ocupado} contentStyle={styles.buttonContent}>
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={guardar}
            loading={guardando}
            disabled={!foto || ocupado}
            contentStyle={styles.buttonContent}
          >
            {t("documents.productPhoto.save")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    modal: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      borderRadius: 20,
      padding: 20,
      gap: 12,
    },
    title: {
      fontWeight: "700",
      color: theme.colors.onSurface,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: -8,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    buttonContent: {
      minHeight: 44,
    },
  });

export default ProductPhotoSheet;
