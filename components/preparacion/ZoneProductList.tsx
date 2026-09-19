import React, { useState } from "react";
import {
  RefreshControlProps,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ConsolidadoProducto,
  ConsolidadoZona,
} from "../../types/preparacion";
import StatusChip from "../ui/StatusChip";
import ProductCard from "./ProductCard";

interface ZoneProductListProps {
  zonas: ConsolidadoZona[];
  pickedQtys: Record<string, number>;
  confirmedProducts: Set<string>;
  confirmingZone: string | null;
  onQtyChange?: (codigoProducto: string, qty: number) => void;
  onProductPress: (producto: ConsolidadoProducto) => void;
  onConfirmZone?: (zonaNombre: string) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListHeaderComponent?: React.ReactElement;
}

interface SectionData {
  title: string;
  allProducts: ConsolidadoProducto[];
  data: ConsolidadoProducto[];
}

const ZoneProductList: React.FC<ZoneProductListProps> = ({
  zonas,
  pickedQtys,
  confirmedProducts,
  confirmingZone,
  onQtyChange,
  onProductPress,
  onConfirmZone,
  refreshControl,
  ListHeaderComponent,
}) => {
  const theme = useTheme() as CustomTheme;
  const { status } = theme.custom;
  const { t } = useTranslation();
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());

  const sections: SectionData[] = zonas.map((zona) => ({
    title: zona.zonaNombre,
    allProducts: zona.productos,
    data: collapsedZones.has(zona.zonaNombre) ? [] : zona.productos,
  }));

  const toggleZone = (zona: string) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zona)) next.delete(zona);
      else next.add(zona);
      return next;
    });
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => {
    const isCollapsed = collapsedZones.has(section.title);
    const confirmedCount = section.allProducts.filter((p) =>
      confirmedProducts.has(p.codigoProducto)
    ).length;
    const isComplete = confirmedCount === section.allProducts.length && section.allProducts.length > 0;

    return (
      <TouchableOpacity
        onPress={() => toggleZone(section.title)}
        activeOpacity={0.7}
        style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}
      >
        {/* Left: icon + name */}
        <View style={styles.sectionLeft}>
          <View
            style={[
              styles.zoneIconWrap,
              {
                backgroundColor: isComplete
                  ? status.positive.container
                  : theme.colors.primaryContainer,
              },
            ]}
          >
            <Icon
              source={isComplete ? "check-all" : "package-variant"}
              size={18}
              color={isComplete ? status.positive.base : theme.colors.primary}
            />
          </View>
          <Text
            variant="labelLarge"
            style={[styles.zoneName, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {section.title.toUpperCase()}
          </Text>
        </View>

        {/* Right: items chip + chevron */}
        <View style={styles.sectionRight}>
          <StatusChip
            tone={isComplete ? "positive" : "neutral"}
            label={`${confirmedCount}/${section.allProducts.length} ${t("preparacion.items")}`}
          />
          <Icon
            source={isCollapsed ? "chevron-right" : "chevron-down"}
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionFooter = ({ section }: { section: SectionData }) => {
    if (!onConfirmZone) return null;

    const isCollapsed = collapsedZones.has(section.title);
    if (isCollapsed) return null;

    const allConfirmed = section.allProducts.every((p) =>
      confirmedProducts.has(p.codigoProducto)
    );
    if (allConfirmed) return null;

    const isConfirming = confirmingZone === section.title;

    return (
      <View style={styles.zoneFooter}>
        <Button
          mode="contained"
          onPress={() => onConfirmZone(section.title)}
          loading={isConfirming}
          disabled={isConfirming}
          icon={isConfirming ? undefined : "check-circle"}
          style={styles.confirmZoneButton}
          contentStyle={styles.confirmZoneButtonContent}
          labelStyle={styles.confirmZoneLabel}
        >
          {isConfirming
            ? t("preparacion.confirmingZone")
            : t("preparacion.confirmZone")}
        </Button>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ConsolidadoProducto }) => (
    <ProductCard
      producto={item}
      pickedQty={pickedQtys[item.codigoProducto] ?? 0}
      isConfirmed={confirmedProducts.has(item.codigoProducto)}
      onConfirm={() => onProductPress(item)}
    />
  );

  const hasProducts = zonas.some((z) => z.productos.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.codigoProducto}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      stickySectionHeadersEnabled
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        hasProducts ? null : (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("preparacion.noProducts")}
            </Text>
          </View>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  zoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  zoneName: {
    fontWeight: "800",
    letterSpacing: 0.8,
    flex: 1,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoneFooter: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
  confirmZoneButton: {
    borderRadius: 28,
    minHeight: 52,
  },
  confirmZoneButtonContent: {
    minHeight: 52,
  },
  confirmZoneLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});

export default ZoneProductList;
