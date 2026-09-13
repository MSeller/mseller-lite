import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InventoryDemoScreen from "./InventoryDemoScreen";
import InventoryMainScreen from "./InventoryMainScreen";
import InventoryProgressScreen from "./InventoryProgressScreen";
import ProductCountingScreen from "./ProductCountingScreen";
import { InventarioConteo } from "../../types/inventory";

type InventoryScreenType = "demo" | "main" | "counting" | "progress";

interface InventoryTabScreenProps {
  /** Shown only on the count list, not inside a count — the Inventario section switcher. */
  headerAccessory?: React.ReactNode;
}

export default function InventoryTabScreen({ headerAccessory }: InventoryTabScreenProps) {
  const [currentScreen, setCurrentScreen] =
    useState<InventoryScreenType>("main"); // Changed default from "demo" to "main"
  const [selectedConteo, setSelectedConteo] = useState<InventarioConteo | null>(
    null
  );

  const handleNavigateToCount = (conteo: InventarioConteo) => {
    setSelectedConteo(conteo);
    setCurrentScreen("counting");
  };

  const handleNavigateToProgress = (conteo: InventarioConteo) => {
    setSelectedConteo(conteo);
    setCurrentScreen("progress");
  };

  const handleNavigateToDemo = () => {
    setCurrentScreen("demo");
    setSelectedConteo(null);
  };

  const handleNavigateBack = () => {
    setCurrentScreen("main"); // Changed from "demo" to "main"
    setSelectedConteo(null);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "main":
        return (
          <InventoryMainScreen
            onNavigateToCount={handleNavigateToCount}
            onNavigateToProgress={handleNavigateToProgress}
            onNavigateToDemo={handleNavigateToDemo}
          />
        );

      case "counting":
        return selectedConteo ? (
          <ProductCountingScreen
            conteo={selectedConteo}
            onNavigateBack={handleNavigateBack}
          />
        ) : null;

      case "progress":
        return selectedConteo ? (
          <InventoryProgressScreen
            conteo={selectedConteo}
            onNavigateBack={handleNavigateBack}
          />
        ) : null;

      case "demo":
        return <InventoryDemoScreen onNavigateBack={handleNavigateBack} />;

      default:
        return (
          <InventoryMainScreen
            onNavigateToCount={handleNavigateToCount}
            onNavigateToProgress={handleNavigateToProgress}
            onNavigateToDemo={handleNavigateToDemo}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {currentScreen === "main" && headerAccessory}
      <View style={styles.content}>{renderCurrentScreen()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
