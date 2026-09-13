import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Paragraph,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomTheme } from "../../constants/Theme";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useTranslation } from "../../hooks/useTranslation";
import {
  searchProducts,
  searchProductsByCode,
  searchProductsByText,
} from "../../services/ProductService";
import type { Product } from "../../types/inventory";

type SearchType = "barcode" | "code" | "text";

interface ProductScreenProps {
  onProductSelect: (product: Product) => void;
  /** Rendered above the search, under the status bar — the Inventario section switcher. */
  headerAccessory?: React.ReactNode;
}

const ProductScreen: React.FC<ProductScreenProps> = ({ onProductSelect, headerAccessory }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("barcode");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [isAutoSearching, setIsAutoSearching] = useState(false);

  // Barcode scanner detection (legacy - for backwards compatibility)
  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<any>(null);
  const lastInputTime = useRef(0);

  const performSearch = useCallback(
    async (value: string = searchValue, type: SearchType = searchType) => {
      if (!value.trim()) return;

      setLoading(true);
      setError("");
      setResults(null);
      try {
        let data;
        switch (type) {
          case "barcode":
            data = await searchProducts(value);
            break;
          case "code":
            data = await searchProductsByCode(value);
            break;
          case "text":
            data = await searchProductsByText(value);
            break;
          default:
            data = await searchProducts(value);
        }
        setResults(data.data);

        // If no products found, show a friendly message
        if (data.data.length === 0) {
          setError(t("errors.noProductsFoundMessage"));
        }
      } catch (e: any) {
        // Handle different types of errors with user-friendly messages
        if (e.response?.status === 404 || e.message?.includes("404")) {
          setError(t("errors.productNotFoundMessage"));
        } else if (
          e.message?.includes("Network Error") ||
          e.message?.includes("network")
        ) {
          setError(t("errors.networkError"));
        } else if (e.message?.includes("timeout")) {
          setError(t("errors.timeoutError"));
        } else {
          setError(e.message || t("errors.genericError"));
        }
      } finally {
        setLoading(false);
      }
    },
    [searchValue, searchType, t]
  );

  // Barcode scanner hook callback
  const handleBarcodeScanned = useCallback(
    (scannedData: string) => {
      console.log("Barcode scanned in ProductScreen:", scannedData);

      // Set search type to barcode and update search value
      setSearchType("barcode");
      setSearchValue(scannedData);

      // Trigger search automatically
      setIsAutoSearching(true);
      performSearch(scannedData, "barcode").finally(() => {
        setIsAutoSearching(false);
      });
    },
    [performSearch]
  );

  // Initialize barcode scanner hook
  const { isReady: scannerReady, isScanning } = useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: searchType === "barcode",
    minLength: 3,
  });

  // Enhanced text input handler with barcode detection
  const handleTextChange = (text: string) => {
    setSearchValue(text);

    // Only do barcode detection for barcode search type
    if (searchType !== "barcode") return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastInputTime.current;

    // Clear previous timeout
    if (barcodeTimeout.current) {
      clearTimeout(barcodeTimeout.current);
    }

    // If time between characters is less than 50ms, it's likely a scanner
    if (timeDiff < 50 && barcodeBuffer.current.length > 0) {
      barcodeBuffer.current += text.slice(-1); // Only add the last character
    } else {
      barcodeBuffer.current = text;
    }

    lastInputTime.current = currentTime;

    // Set timeout to process the barcode
    barcodeTimeout.current = setTimeout(() => {
      const potentialBarcode = text.trim();

      // Check if it looks like a barcode (numeric, reasonable length)
      if (potentialBarcode.length >= 8 && /^\d+$/.test(potentialBarcode)) {
        // Show auto-search indicator
        setIsAutoSearching(true);
        // Auto-search when barcode is detected
        performSearch(potentialBarcode, "barcode").finally(() => {
          setIsAutoSearching(false);
        });
      }

      barcodeBuffer.current = "";
    }, 300);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (barcodeTimeout.current) {
        clearTimeout(barcodeTimeout.current);
      }
    };
  }, []);

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case "barcode":
        return "Código de Barras";
      case "code":
        return "Código del Producto";
      case "text":
        return "Nombre del Producto";
      default:
        return "Código de Barras";
    }
  };

  const getKeyboardType = () => {
    return searchType === "text" ? "default" : "numeric";
  };

  return (
    <SafeAreaView
      style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {headerAccessory}
      <ScrollView
        style={[{ flex: 1 }, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Card elevation={0} style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Búsqueda de Productos</Text>

            {/* Search Type Selector */}
            <SegmentedButtons
              value={searchType}
              onValueChange={(value) => setSearchType(value as SearchType)}
              buttons={[
                {
                  value: "barcode",
                  label: "Código Barra",
                  icon: "barcode-scan",
                },
                {
                  value: "code",
                  label: "Código",
                  icon: "barcode-off",
                },
                {
                  value: "text",
                  label: "Texto",
                  icon: "format-text",
                },
              ]}
              style={{ marginBottom: 16 }}
            />

            {/* Scanner Status */}
            {searchType === "barcode" && scannerReady && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Chip
                  icon={isScanning ? "loading" : "barcode-scan"}
                  style={{
                    backgroundColor: isScanning
                      ? theme.colors.secondary
                      : theme.colors.primaryContainer,
                  }}
                  textStyle={{ fontSize: 12 }}
                >
                  {isScanning ? "Scanning..." : "Scanner Ready"}
                </Chip>
              </View>
            )}

            <TextInput
              label={getSearchPlaceholder()}
              value={searchValue}
              onChangeText={handleTextChange}
              keyboardType={getKeyboardType()}
              style={{ marginBottom: 12 }}
              left={
                searchType === "barcode" ? (
                  <TextInput.Icon icon="barcode-scan" />
                ) : searchType === "code" ? (
                  <TextInput.Icon icon="barcode-off" />
                ) : (
                  <TextInput.Icon icon="format-text" />
                )
              }
              right={
                searchValue ? (
                  <TextInput.Icon
                    icon="close-circle"
                    onPress={() => {
                      setSearchValue("");
                      setResults(null);
                      setError("");
                    }}
                  />
                ) : null
              }
            />
            <Button
              icon="magnify"
              mode="contained"
              onPress={() => performSearch()}
              loading={loading || isAutoSearching}
              disabled={!searchValue.trim() || loading || isAutoSearching}
            >
              {isAutoSearching ? "Búsqueda automática..." : "Buscar"}
            </Button>
            {error ? (
              <Card elevation={0}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.errorContainer,
                    marginTop: 12,
                  },
                ]}
              >
                <Card.Content>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <IconButton
                      icon="alert-circle-outline"
                      size={24}
                      iconColor={theme.colors.error}
                      style={{ margin: 0 }}
                    />
                    <Text
                      variant="titleMedium"
                      style={{ color: theme.colors.error, flex: 1 }}
                    >
                      {t("errors.noProductsFoundTitle")}
                    </Text>
                  </View>
                  <Paragraph
                    style={{
                      color: theme.colors.onErrorContainer,
                      marginLeft: 8,
                    }}
                  >
                    {error}
                  </Paragraph>
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 12,
                      marginLeft: 8,
                    }}
                  >
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setError("");
                        setSearchValue("");
                        setResults(null);
                      }}
                      style={{ marginRight: 8 }}
                      textColor={theme.colors.error}
                    >
                      {t("common.retry")}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ) : null}
          </Card.Content>
        </Card>
        {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
        {results && results.length > 0 && (
          <Card elevation={0} style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                <IconButton
                  icon="format-list-bulleted"
                  size={20}
                  iconColor={theme.colors.primary}
                />
                Resultados ({results.length})
              </Text>
              {results.map((prod) => (
                <TouchableOpacity
                  key={prod.codigo}
                  onPress={() => onProductSelect(prod)}
                  style={styles.resultItem}
                >
                  <Surface style={styles.resultCard} elevation={0}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {prod.nombre}
                      </Text>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        iconColor={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.resultDetails}>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultLabel}>Código:</Text>
                        <Text style={styles.resultValue}>{prod.codigo}</Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultLabel}>Código de Barra:</Text>
                        <Text style={styles.resultValue}>
                          {prod.codigoBarra}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultLabel}>Precio:</Text>
                        <Text style={[styles.resultValue, styles.resultPrice]}>
                          ${prod.precio1.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultLabel}>Área:</Text>
                        <Text style={styles.resultValue}>{prod.area}</Text>
                      </View>
                    </View>
                    {/* Stock summary */}
                    <View style={styles.stockSummary}>
                      <Chip
                        icon="package-variant"
                        compact
                        style={styles.stockSummaryChip}
                      >
                        {prod.existencias.reduce(
                          (total, ex) => total + ex.existencia,
                          0
                        )}{" "}
                        unidades
                      </Chip>
                      <Chip
                        icon={
                          prod.status === "A" ? "check-circle" : "alert-circle"
                        }
                        compact
                        style={[
                          styles.statusSummaryChip,
                          {
                            backgroundColor:
                              prod.status === "A"
                                ? theme.colors.primaryContainer
                                : theme.colors.errorContainer,
                          },
                        ]}
                      >
                        {prod.status === "A" ? "Activo" : "Inactivo"}
                      </Chip>
                    </View>
                  </Surface>
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}
        {results && results.length === 0 && !loading && !error && (
          <Card elevation={0}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Card.Content style={{ alignItems: "center", paddingVertical: 32 }}>
              <IconButton
                icon="package-variant-off"
                size={48}
                iconColor={theme.colors.onSurfaceVariant}
                style={{ margin: 0, marginBottom: 8 }}
              />
              <Text
                variant="titleMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                }}
              >
                {t("errors.noProductsFoundTitle")}
              </Text>
              <Paragraph
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {t("errors.noProductsFoundMessage")}
              </Paragraph>
              <Button
                mode="outlined"
                onPress={() => {
                  setSearchValue("");
                  setResults(null);
                }}
                icon="magnify"
              >
                {t("common.search")}
              </Button>
            </Card.Content>
          </Card>
        )}
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    // Search results styles
    resultItem: {
      marginBottom: 8,
    },
    resultCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    resultHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    resultTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.onSurface,
      flex: 1,
      marginRight: 8,
    },
    resultDetails: {
      marginBottom: 12,
    },
    resultInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    resultLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      fontWeight: "600",
    },
    resultValue: {
      fontSize: 14,
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    resultPrice: {
      color: theme.colors.primary,
      fontSize: 16,
    },
    stockSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    stockSummaryChip: {
      backgroundColor: theme.colors.primaryContainer,
    },
    statusSummaryChip: {
      marginLeft: 8,
    },
  });

export default ProductScreen;
