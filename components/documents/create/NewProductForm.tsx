import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { HelperText, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../../constants/Theme";
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner";
import { useSuggestedCode } from "../../../hooks/useSuggestedCode";
import { useTranslation } from "../../../hooks/useTranslation";
import { createProduct, getNextProductCode } from "../../../services/ProductService";
import type { CreatedProduct, NewProductRequest } from "../../../types/documents";
import type { Product } from "../../../types/inventory";
import { parseNumericInput } from "../../../utils/documentFormat";
import type { UploadedProductPhoto } from "../../../utils/productPhoto";
import BarcodeScanSheet from "../../scan/BarcodeScanSheet";
import ProductPhotoField from "./ProductPhotoField";
import AppButton from "../../ui/AppButton";

interface Props {
  /** Pre-fills the name — usually the search that found nothing. */
  initialName?: string;
  /** Pre-fills the barcode — a scan that matched no product. */
  initialBarcode?: string;
  /** The created product, in the catalogue shape lists and the cart consume. */
  onCreated: (product: Product) => void;
  /** True while saving or while a photo uploads, so the host can hold its close button. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Adapts the created record to the catalogue shape, so a just-created product behaves
 * exactly like a searched one.
 */
const toProduct = (created: CreatedProduct): Product =>
  ({
    codigo: created.codigo,
    nombre: created.nombre,
    descripcion: created.descripcion,
    unidad: created.unidad ?? "",
    precio1: created.precio,
    impuesto: created.impuesto,
    factor: created.factor,
    existenciaAlmacen1: created.existencia,
    codigoBarra: created.codigoBarra ?? "",
    status: "A",
  }) as Product;

/**
 * Registers a product with just a name and a price (photo, code, barcode, tax and unit
 * optional). Shared by the document's product picker and Catálogo › Productos.
 *
 * Must render inside a `Portal`: the barcode field opens the camera sheet. While mounted, a
 * built-in hardware scanner fills the barcode field too.
 */
const NewProductForm: React.FC<Props> = ({ initialName = "", initialBarcode = "", onCreated, onBusyChange }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [nombre, setNombre] = useState(initialName);
  const [precio, setPrecio] = useState("");
  const [impuesto, setImpuesto] = useState("");
  const [unidad, setUnidad] = useState("");
  const [codigoBarra, setCodigoBarra] = useState(initialBarcode);
  const [foto, setFoto] = useState<UploadedProductPhoto | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [escaneando, setEscaneando] = useState(false);

  // Pre-filled from the name with the code saving would produce; the user can overwrite it.
  const codigo = useSuggestedCode(
    async () => (nombre.trim() ? getNextProductCode(nombre.trim()) : null),
    [nombre.trim()],
    { enabled: true, debounceMs: 400 }
  );

  const busy = saving || subiendoFoto;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  // Unmounted mid-upload, the field never reports that it finished.
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  // Off while the camera sheet is open, so one read is not handled twice.
  useBarcodeScanner({ onScan: setCodigoBarra, enabled: !escaneando });

  const handleCreate = useCallback(async () => {
    const trimmed = nombre.trim();
    const price = parseNumericInput(precio);

    if (!trimmed) {
      setFormError(t("documents.newProduct.nameRequired"));
      return;
    }
    if (price <= 0) {
      setFormError(t("documents.newProduct.priceRequired"));
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload: NewProductRequest = {
        // Omitted while the suggestion is untouched, so the server derives it on save.
        codigo: codigo.codeForRequest,
        codigoBarra: codigoBarra.trim() || undefined,
        nombre: trimmed,
        precio1: price,
        impuesto: impuesto ? parseNumericInput(impuesto) : undefined,
        unidad: unidad.trim() || undefined,
        imagenes: foto ? [foto.photo] : undefined,
      };
      const created = await createProduct(payload);
      setSaving(false);
      onCreated(toProduct(created));
    } catch (e: any) {
      setFormError(e?.response?.data?.message || t("documents.errors.productCreateFailed"));
      setSaving(false);
    }
  }, [nombre, precio, impuesto, unidad, foto, codigo.codeForRequest, codigoBarra, onCreated, t]);

  return (
    // A fixed container puts the last fields and the save button under the
    // on-screen keyboard on a short phone, with no way to scroll to them.
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ProductPhotoField value={foto} onChange={setFoto} onBusyChange={setSubiendoFoto} disabled={saving} />
        <TextInput
          mode="outlined"
          label={t("documents.newProduct.name")}
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
          autoFocus={!initialBarcode}
          autoCapitalize="words"
        />
        <TextInput
          mode="outlined"
          label={t("documents.code.label")}
          value={codigo.value}
          onChangeText={codigo.onChangeText}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={t("documents.code.assignedOnSave")}
          right={codigo.loading ? <TextInput.Icon icon="progress-clock" /> : null}
        />
        <TextInput
          mode="outlined"
          label={t("documents.newProduct.barcode")}
          value={codigoBarra}
          onChangeText={setCodigoBarra}
          style={styles.input}
          autoCorrect={false}
          inputMode="numeric"
          right={
            <TextInput.Icon
              icon="barcode-scan"
              onPress={() => setEscaneando(true)}
              accessibilityLabel={t("scan.scanBarcode")}
            />
          }
        />
        <TextInput
          mode="outlined"
          label={t("documents.newProduct.price")}
          value={precio}
          onChangeText={setPrecio}
          style={styles.input}
          keyboardType="decimal-pad"
          inputMode="decimal"
          right={precio ? <TextInput.Icon icon="close" onPress={() => setPrecio("")} /> : null}
        />
        <TextInput
          mode="outlined"
          label={t("documents.newProduct.tax")}
          value={impuesto}
          onChangeText={setImpuesto}
          style={styles.input}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <TextInput
          mode="outlined"
          label={t("documents.newProduct.unit")}
          value={unidad}
          onChangeText={setUnidad}
          style={styles.input}
          autoCapitalize="characters"
        />

        <HelperText type={formError ? "error" : "info"} visible>
          {formError || t("documents.newProduct.hint")}
        </HelperText>

        <AppButton
          mode="contained"
          onPress={handleCreate}
          loading={saving}
          disabled={busy || !nombre.trim() || parseNumericInput(precio) <= 0}
          contentStyle={styles.buttonContent}
          style={styles.button}
        >
          {t("documents.newProduct.save")}
        </AppButton>
      </ScrollView>

      <BarcodeScanSheet
        visible={escaneando}
        onDismiss={() => setEscaneando(false)}
        onScan={setCodigoBarra}
        title={t("scan.scanBarcode")}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    form: {
      padding: 16,
      gap: 12,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
    button: {
    },
    buttonContent: {
      height: 52,
    },
  });

export default NewProductForm;
