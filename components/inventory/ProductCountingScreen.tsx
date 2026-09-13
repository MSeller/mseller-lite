import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Paragraph,
  Searchbar,
  Snackbar,
  TextInput,
  Title,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useTranslation } from "../../hooks/useTranslation";
import {
  inventoryService,
  offlineManager,
} from "../../services/inventoryService";
import {
  BuscarProductoPorCodigoBarraResponse,
  ContarProductoPorCodigoBarraRequest,
  ContarProductoRequest,
  ContarProductoResult,
  InventarioConteo,
  ProductoConteo,
  TipoOperacion,
} from "../../types/inventory";

interface ProductCountingScreenProps {
  conteo: InventarioConteo;
  onNavigateBack: () => void;
}

const ProductCountingScreen: React.FC<ProductCountingScreenProps> = ({
  conteo,
  onNavigateBack,
}) => {
  const { userProfile } = useUser();
  const { t } = useTranslation();
  const theme = useTheme() as CustomTheme;
  // The tonal blocks below take their background from the theme: a fixed light
  // panel keeps a light surface under Paper's light-on-dark text in dark mode,
  // which is exactly where these values become unreadable.
  const tonal = useMemo(
    () => ({
      quantityInfo: [styles.quantityInfo, { backgroundColor: theme.colors.surfaceVariant }],
      currentProduct: [styles.currentProduct, { backgroundColor: theme.colors.surfaceVariant }],
    }),
    [theme]
  );


  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchMode, setSearchMode] = useState<"barcode" | "manual">("barcode");
  const [searchQuery, setSearchQuery] = useState("");
  const [foundProduct, setFoundProduct] = useState<
    ProductoConteo | BuscarProductoPorCodigoBarraResponse | null
  >(null);
  const [countedQuantity, setCountedQuantity] = useState("");
  const [observations, setObservations] = useState("");
  const [products, setProducts] = useState<ProductoConteo[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Ref for searchbar to programmatically focus
  const searchRef = useRef<any>(null);

  // Ref for auto-search timeout
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warehouseId = userProfile?.warehouse
    ? inventoryService.getWarehouseId(userProfile.warehouse)
    : null;

  const [deviceInfo, setDeviceInfo] = useState<{
    id: string;
    tipo: string;
  } | null>(null);

  // Barcode scanner hook
  const handleBarcodeScanned = useCallback(
    async (scannedData: string) => {
      if (!warehouseId) {
        console.log("Search cancelled: missing warehouse ID");
        return;
      }

      console.log("Barcode scanned:", scannedData);

      // Set search mode to barcode and update query
      setSearchMode("barcode");
      setSearchQuery(scannedData);

      // Focus the search input if available
      if (searchRef.current) {
        searchRef.current.focus();
      }

      // Trigger search automatically with the scanned data
      console.log("Triggering automatic search for:", scannedData);
      setLoading(true);
      setError("");
      setFoundProduct(null);

      try {
        // Validate barcode first
        const validation = await inventoryService.validarCodigoBarra(
          scannedData,
          warehouseId
        );

        if (!validation.esValido) {
          setError(t("inventory.invalidBarcode"));
          return;
        }

        // Search product by barcode
        const productData = await inventoryService.buscarPorCodigoBarra(
          scannedData,
          warehouseId
        );

        if (productData.encontrado) {
          setFoundProduct(productData);
          console.log("Product found via scanner:", productData);
        } else {
          setError(t("inventory.barcodeNotFound"));
          console.log("Product not found for scanned barcode:", scannedData);
        }
      } catch (err: any) {
        console.error("Error searching scanned product:", err);
        setError(err.message || t("errors.networkError"));
      } finally {
        setLoading(false);
      }
    },
    [
      warehouseId,
      t,
      setSearchMode,
      setSearchQuery,
      setLoading,
      setError,
      setFoundProduct,
    ]
  );

  const { isReady: scannerReady, isScanning } = useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: searchMode === "barcode",
    minLength: 3,
  });

  useEffect(() => {
    const initDeviceInfo = async () => {
      const info = await inventoryService.getDeviceInfo();
      setDeviceInfo(info);
    };
    initDeviceInfo();
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await inventoryService.getProductosConteo(conteo.id);
      setProducts(productsData);
    } catch (err: any) {
      console.error("Error loading products:", err);
      setError(err.message || t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  }, [conteo.id, t]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !warehouseId) {
      console.log("Search cancelled: missing query or warehouse ID");
      return;
    }

    console.log(
      "Starting search for:",
      searchQuery.trim(),
      "Mode:",
      searchMode
    );
    setLoading(true);
    setError("");
    setFoundProduct(null);

    try {
      if (searchMode === "barcode") {
        // Validate barcode first
        const validation = await inventoryService.validarCodigoBarra(
          searchQuery,
          warehouseId
        );

        if (!validation.esValido) {
          setError(t("inventory.invalidBarcode"));
          return;
        }

        // Search product by barcode
        const productData = await inventoryService.buscarPorCodigoBarra(
          searchQuery,
          warehouseId
        );

        if (productData.encontrado) {
          setFoundProduct(productData);
          console.log("Product found:", productData);
        } else {
          setError(t("inventory.barcodeNotFound"));
          console.log("Product not found for barcode:", searchQuery);
        }
      } else {
        // Manual search by product code

        const product = products.find(
          (p) =>
            p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase())
        );

        if (product) {
          setFoundProduct(product);
          console.log("Product found:", product);
        } else {
          setError(t("inventory.productNotFound"));
          console.log("Product not found for query:", searchQuery);
        }
      }
    } catch (err: any) {
      console.error("Error searching product:", err);
      setError(err.message || t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, warehouseId, searchMode, products, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveCount = async () => {
    if (!foundProduct || !countedQuantity.trim() || !deviceInfo) {
      setError(t("inventory.enterValidQuantity"));
      return;
    }

    const quantity = parseFloat(countedQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError(t("inventory.enterValidQuantity"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      let result: ContarProductoResult;

      if (
        searchMode === "barcode" &&
        "codigoBarra" in foundProduct &&
        foundProduct.codigoBarra
      ) {
        // Count by barcode
        const request: ContarProductoPorCodigoBarraRequest = {
          conteoId: conteo.id,
          codigoBarra: foundProduct.codigoBarra,
          localidadId: warehouseId!,
          cantidadContada: quantity,
          contadoPor: userProfile?.firstName || "Unknown User",
          dispositivoId: deviceInfo.id,
          observaciones: observations.trim() || undefined,
        };

        result = await inventoryService.contarProductoPorCodigoBarra(request);
      } else {
        // Count by product code
        const productCode =
          "codigo" in foundProduct
            ? foundProduct.codigo
            : (foundProduct as any).codigo;
        const request: ContarProductoRequest = {
          conteoId: conteo.id,
          codigoProducto: productCode,
          cantidadContada: quantity,
          contadoPor: userProfile?.firstName || "Unknown User",
          dispositivoId: deviceInfo.id,
          observaciones: observations.trim() || undefined,
        };

        result = await inventoryService.contarProducto(request);
        console.log("Result:", result);
      }

      if (result) {
        setSuccess(t("inventory.countSaved"));

        // Show discrepancy alert if needed
        if (result.tieneDiscrepancia) {
          Alert.alert(
            t("inventory.discrepancy"),
            `${t("inventory.expectedQuantity")}: ${
              result.cantidadSnapshot
            }\n${t("inventory.countedQuantity")}: ${
              result.cantidadContada
            }\n${t("inventory.discrepancy")}: ${result.diferencia}\n${t(
              "inventory.status"
            )}: ${result.estadoDescripcion}`,
            [{ text: t("common.confirm"), style: "default" }]
          );
        }

        // Clear form
        setSearchQuery("");
        setFoundProduct(null);
        setCountedQuantity("");
        setObservations("");

        // Reload products to update status
        await loadProducts();
      } else {
        setError(t("errors.genericError"));
      }
    } catch (err: any) {
      console.error("Error saving count:", err);

      // Add to offline queue if network error
      if (err.code === "NETWORK_ERROR" || err.message.includes("network")) {
        const productCode =
          "codigo" in foundProduct
            ? foundProduct.codigo
            : (foundProduct as any).codigo;
        const operationData =
          searchMode === "barcode" &&
          "codigoBarra" in foundProduct &&
          foundProduct.codigoBarra
            ? {
                conteoId: conteo.id,
                codigoBarra: foundProduct.codigoBarra,
                localidadId: warehouseId!,
                cantidadContada: quantity,
                contadoPor: userProfile?.firstName || "Unknown User",
                dispositivoId: deviceInfo.id,
                observaciones: observations.trim() || undefined,
              }
            : {
                conteoId: conteo.id,
                codigoProducto: productCode,
                cantidadContada: quantity,
                contadoPor: userProfile?.firstName || "Unknown User",
                dispositivoId: deviceInfo.id,
                observaciones: observations.trim() || undefined,
              };

        await offlineManager.addOfflineOperation(
          searchMode === "barcode" && "codigoBarra" in foundProduct
            ? TipoOperacion.ContarPorCodigoBarra
            : TipoOperacion.ContarProducto,
          operationData
        );

        setSuccess(t("common.dataSaved") + " (offline)");

        // Clear form
        setSearchQuery("");
        setFoundProduct(null);
        setCountedQuantity("");
        setObservations("");
      } else {
        setError(err.message || t("errors.genericError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateProducts = (direction: "next" | "prev") => {
    if (direction === "next" && currentProductIndex < products.length - 1) {
      setCurrentProductIndex(currentProductIndex + 1);
    } else if (direction === "prev" && currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
    }
  };

  const currentProduct = products[currentProductIndex];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={onNavigateBack} />
        <Title style={{ color: theme.colors.primary, flex: 1 }}>
          {t("inventory.countProduct")}
        </Title>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Mode Toggle */}
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Title style={styles.sectionTitle}>
                {t("inventory.searchProduct")}
              </Title>
              {scannerReady && searchMode === "barcode" && (
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
              )}
            </View>
            <View style={styles.searchModeToggle}>
              <Button
                mode={searchMode === "barcode" ? "contained" : "outlined"}
                onPress={() => {
                  setSearchMode("barcode");
                  // Auto-focus when switching to barcode mode
                  setTimeout(() => {
                    if (searchRef.current) {
                      searchRef.current.focus();
                    }
                  }, 100);
                }}
                style={styles.toggleButton}
                icon="barcode-scan"
              >
                {t("inventory.scanBarcode")}
              </Button>
              <Button
                mode={searchMode === "manual" ? "contained" : "outlined"}
                onPress={() => setSearchMode("manual")}
                style={styles.toggleButton}
                icon="magnify"
              >
                {t("inventory.enterManually")}
              </Button>
            </View>

            <Searchbar
              ref={searchRef}
              placeholder={
                searchMode === "barcode"
                  ? "Escanear o ingresar código de barras"
                  : "Buscar por código o nombre de producto"
              }
              onChangeText={(text) => {
                setSearchQuery(text);

                // Auto-search for barcode mode when user stops typing
                if (searchMode === "barcode" && text.trim().length >= 8) {
                  // Clear existing timeout
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }

                  // Set new timeout to trigger search after user stops typing
                  searchTimeoutRef.current = setTimeout(() => {
                    if (text.trim().length >= 8) {
                      console.log(
                        "Auto-triggering search for manually entered barcode:",
                        text.trim()
                      );
                      handleSearch();
                    }
                  }, 1000); // Wait 1 second after user stops typing
                }
              }}
              value={searchQuery}
              onSubmitEditing={handleSearch}
              icon={searchMode === "barcode" ? "barcode-scan" : "magnify"}
              loading={loading}
              style={styles.searchBar}
            />

            <Button
              mode="contained"
              onPress={handleSearch}
              loading={loading}
              disabled={!searchQuery.trim() || loading}
              style={styles.searchButton}
            >
              {t("common.search")}
            </Button>
          </Card.Content>
        </Card>

        {/* Found Product */}
        {foundProduct && (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.productHeader}>
                <Title style={{ color: theme.colors.primary }}>
                  {t("inventory.productFound")}
                </Title>
                <Chip
                  icon="check-circle"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                >
                  {"codigo" in foundProduct
                    ? foundProduct.codigo
                    : (foundProduct as any).codigo}
                </Chip>
              </View>

              <Paragraph style={styles.productName}>
                {"nombre" in foundProduct
                  ? foundProduct.nombre
                  : (foundProduct as any).nombre}
              </Paragraph>

              {foundProduct.ubicacionDetallada && (
                <Paragraph style={styles.location}>
                  📍 {foundProduct.ubicacionDetallada}
                </Paragraph>
              )}

              {"cantidadSnapshot" in foundProduct && (
                <View style={tonal.quantityInfo}>
                  <Paragraph>
                    {t("inventory.expectedQuantity")}:{" "}
                    {foundProduct.cantidadSnapshot}
                  </Paragraph>
                </View>
              )}

              <Divider style={styles.divider} />

              <TextInput
                label={t("inventory.countedQuantity")}
                value={countedQuantity}
                onChangeText={setCountedQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                autoFocus
              />

              <TextInput
                label={t("inventory.observations")}
                value={observations}
                onChangeText={setObservations}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleSaveCount}
                loading={loading}
                disabled={!countedQuantity.trim() || loading}
                style={styles.saveButton}
                icon="content-save"
              >
                {t("inventory.saveCount")}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Product Navigation (for systematic counting) */}
        {products.length > 0 && (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.navigationHeader}>
                <Title style={styles.sectionTitle}>
                  {t("inventory.products")} ({currentProductIndex + 1}/
                  {products.length})
                </Title>
                <View style={styles.navigationButtons}>
                  <IconButton
                    icon="chevron-left"
                    size={24}
                    onPress={() => navigateProducts("prev")}
                    disabled={currentProductIndex === 0}
                  />
                  <IconButton
                    icon="chevron-right"
                    size={24}
                    onPress={() => navigateProducts("next")}
                    disabled={currentProductIndex === products.length - 1}
                  />
                </View>
              </View>

              {currentProduct && (
                <View
                  style={tonal.currentProduct}
                  onTouchEnd={() => {
                    setFoundProduct(currentProduct);
                    setCountedQuantity("");
                    setObservations("");
                  }}
                >
                  <View style={styles.productInfo}>
                    <Paragraph style={styles.productCode}>
                      {currentProduct.codigo}
                    </Paragraph>
                    <Paragraph style={styles.productName}>
                      {currentProduct.nombre}
                    </Paragraph>
                    {currentProduct.ubicacionDetallada && (
                      <Paragraph style={styles.location}>
                        📍{" "}
                        {inventoryService.formatProductLocation(currentProduct)}
                      </Paragraph>
                    )}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Snackbars */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.retry"),
          onPress: () => setError(""),
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={3000}
      >
        {success}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  searchModeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 12,
  },
  searchButton: {
    marginTop: 8,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  productCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5C6773",
  },
  location: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 8,
  },
  quantityInfo: {
    backgroundColor: "#EDF1F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 8,
  },
  navigationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navigationButtons: {
    flexDirection: "row",
  },
  currentProduct: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#EDF1F6",
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
});

export default ProductCountingScreen;
