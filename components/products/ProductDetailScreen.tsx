import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { ZebraLabelService } from "../../services/zebraLabelService";
import type { Product } from "../../types/inventory";

interface ProductDetailScreenProps {
  product: Product;
  onBack: () => void;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  onBack,
}) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const handleCreateLabel = async () => {
    if (!product) return;

    setIsCreatingLabel(true);
    try {
      // Get available printers
      const printers = await ZebraLabelService.getAvailablePrinters();

      if (printers.length === 0) {
        Alert.alert(
          "Sin Impresoras",
          "No se encontraron impresoras disponibles. Asegúrate de que tu impresora Zebra esté conectada.",
          [{ text: "OK" }]
        );
        return;
      }

      // For now, use the first available printer
      // In a production app, you might want to let users choose
      const selectedPrinter = printers[0];

      // Generate ZPL label data
      const zplData = ZebraLabelService.generateProductLabel(product);

      // Show preview and confirm
      Alert.alert(
        t("inventory.createLabel"),
        `¿Deseas imprimir la etiqueta para "${
          product.nombre
        }"?\n\nImpresora: ${selectedPrinter.type.toUpperCase()}${
          selectedPrinter.address ? ` (${selectedPrinter.address})` : ""
        }`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Vista Previa",
            onPress: () => {
              // Show ZPL preview
              Alert.alert("Vista Previa ZPL", zplData, [{ text: "OK" }]);
            },
          },
          {
            text: "Imprimir",
            onPress: async () => {
              const result = await ZebraLabelService.printLabel(
                zplData,
                selectedPrinter
              );

              Alert.alert(result.success ? "Éxito" : "Error", result.message, [
                { text: "OK" },
              ]);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Error al crear la etiqueta", [
        { text: "OK" },
      ]);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  return (
    <SafeAreaView
      style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Product Name and Back Button */}
        <View style={styles.headerContainer}>
          <IconButton
            icon="arrow-left"
            iconColor={theme.colors.primary}
            size={24}
            onPress={onBack}
            style={styles.backButton}
          />
          <Text
            variant="titleLarge"
            style={[styles.headerTitle, { color: theme.colors.primary }]}
          >
            Detalles del Producto
          </Text>
        </View>

        {/* Product Name Card */}
        <Card elevation={0} style={[styles.card, styles.productNameCard]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.productName}>
              {product.nombre}
            </Text>
            {product.descripcion && (
              <Text style={styles.productDescription}>
                {product.descripcion}
              </Text>
            )}
            <View style={styles.statusContainer}>
              <Chip
                icon="check-circle"
                mode="outlined"
                compact
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      product.status === "A"
                        ? theme.colors.primaryContainer
                        : theme.colors.errorContainer,
                  },
                ]}
              >
                {product.status === "A" ? "Activo" : "Inactivo"}
              </Chip>
              {product.promocion && (
                <Chip
                  icon="sale"
                  mode="outlined"
                  compact
                  style={[
                    styles.statusChip,
                    { backgroundColor: theme.colors.tertiaryContainer },
                  ]}
                >
                  En Promoción
                </Chip>
              )}
              {product.esServicio && (
                <Chip
                  icon="cog"
                  mode="outlined"
                  compact
                  style={styles.statusChip}
                >
                  Servicio
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Product Codes Card */}
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              <IconButton
                icon="barcode"
                size={20}
                iconColor={theme.colors.primary}
              />
              Códigos
            </Text>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Código:</Text>
              <Text style={styles.infoValue}>{product.codigo}</Text>
            </Surface>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Código de Barra:</Text>
              <Text style={styles.infoValue}>{product.codigoBarra}</Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Product Details Card */}
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              <IconButton
                icon="information"
                size={20}
                iconColor={theme.colors.primary}
              />
              Información General
            </Text>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Área:</Text>
              <Text style={styles.infoValue}>{product.area}</Text>
            </Surface>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Departamento:</Text>
              <Text style={styles.infoValue}>{product.departamento}</Text>
            </Surface>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Unidad:</Text>
              <Text style={styles.infoValue}>{product.unidad}</Text>
            </Surface>
            <Surface style={styles.infoRow} elevation={0}>
              <Text style={styles.infoLabel}>Empaque:</Text>
              <Text style={styles.infoValue}>{product.empaque}</Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Pricing Card */}
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              <IconButton
                icon="currency-usd"
                size={20}
                iconColor={theme.colors.primary}
              />
              Precios
            </Text>
            <Surface style={styles.priceRow} elevation={0}>
              <Text style={styles.priceLabel}>Precio 1:</Text>
              <Text style={[styles.priceValue, styles.mainPrice]}>
                ${product.precio1.toFixed(2)}
              </Text>
            </Surface>
            {product.precio2 > 0 && (
              <Surface style={styles.priceRow} elevation={0}>
                <Text style={styles.priceLabel}>Precio 2:</Text>
                <Text style={styles.priceValue}>
                  ${product.precio2.toFixed(2)}
                </Text>
              </Surface>
            )}
            {product.precio3 > 0 && (
              <Surface style={styles.priceRow} elevation={0}>
                <Text style={styles.priceLabel}>Precio 3:</Text>
                <Text style={styles.priceValue}>
                  ${product.precio3.toFixed(2)}
                </Text>
              </Surface>
            )}
            <Divider style={styles.priceDivider} />
            {/* <Surface style={styles.priceRow} elevation={0}>
            <Text style={styles.priceLabel}>Costo:</Text>
            <Text style={[styles.priceValue, styles.costPrice]}>
              ${product.costo.toFixed(2)}
            </Text>
          </Surface> */}
          </Card.Content>
        </Card>

        {/* Stock Information Card */}
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              <IconButton
                icon="package-variant"
                size={20}
                iconColor={theme.colors.primary}
              />
              Existencias por Localidad
            </Text>
            {product.existencias.map((ex) => {
              const stockLevel = ex.existencia;
              const isLowStock = stockLevel <= 0;
              const isMediumStock = stockLevel <= 5 && stockLevel > 0;

              const chipStyle = isLowStock
                ? { backgroundColor: theme.colors.errorContainer }
                : isMediumStock
                ? { backgroundColor: theme.colors.tertiaryContainer }
                : { backgroundColor: theme.colors.primaryContainer };

              const textColor = isLowStock
                ? theme.colors.onErrorContainer
                : isMediumStock
                ? theme.colors.onTertiaryContainer
                : theme.colors.onPrimaryContainer;

              return (
                <Surface key={ex.id} style={styles.stockRow} elevation={0}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.locationName}>
                      {ex.localidadNombre}
                    </Text>
                    <Text style={styles.lastUpdated}>
                      Última actualización:{" "}
                      {new Date(ex.ultimaActualizacion).toLocaleDateString()}
                    </Text>
                  </View>
                  <Chip
                    icon={
                      stockLevel <= 0
                        ? "alert-circle"
                        : stockLevel <= 5
                        ? "alert"
                        : "check"
                    }
                    style={[styles.stockChip, chipStyle]}
                    textStyle={{ color: textColor, fontWeight: "bold" }}
                  >
                    {ex.existencia}
                  </Chip>
                </Surface>
              );
            })}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              style={styles.actionButton}
              icon="qr-code"
              onPress={handleCreateLabel}
              loading={isCreatingLabel}
              disabled={isCreatingLabel}
            >
              {t("inventory.createLabel")}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    container: {
      padding: 16,
      paddingTop: 8, // Reduced top padding since SafeAreaView handles safe area
      paddingBottom: 0, // Remove bottom padding to eliminate gap above tab bar
    },
    card: {
      marginBottom: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    backButton: {
      margin: 0,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginLeft: 8,
    },
    productNameCard: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    productName: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 8,
    },
    productDescription: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
      fontStyle: "italic",
    },
    statusContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statusChip: {
      marginRight: 8,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.onSurface,
      flex: 2,
      textAlign: "right",
    },
    priceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    priceLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onSurfaceVariant,
    },
    priceValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    mainPrice: {
      fontSize: 20,
      color: theme.colors.primary,
    },
    costPrice: {
      color: theme.colors.error,
    },
    priceDivider: {
      marginVertical: 8,
    },
    stockRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    stockInfo: {
      flex: 1,
    },
    locationName: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    stockChip: {
      marginLeft: 12,
    },
    actionButton: {
      marginBottom: 12,
    },
  });

export default ProductDetailScreen;
