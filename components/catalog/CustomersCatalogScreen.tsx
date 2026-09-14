import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { searchCustomers } from "../../services/customerService";
import type { ClienteEditable } from "../../types/catalog";
import type { CustomerSummary } from "../../types/documents";
import { formatMoney } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import CatalogBadge from "./CatalogBadge";
import CatalogList, { CATALOG_PAGE_SIZE, type CatalogListPatch, type CatalogPage } from "./CatalogList";
import CustomerDetail from "./CustomerDetail";

interface Props {
  /** The Catálogo section switcher, shown on the list only. */
  headerAccessory?: React.ReactNode;
}

const keyExtractor = (item: CustomerSummary) => item.codigo;

// The whole book, not the admin's own customers (`soloMisClientes: false`), inactive
// ones included so they can be found and reactivated.
const fetchCustomers = async (query: string, page: number): Promise<CatalogPage<CustomerSummary>> => {
  const result = await searchCustomers(query, {
    soloMisClientes: false,
    incluirInactivos: true,
    pageNumber: page,
    pageSize: CATALOG_PAGE_SIZE,
  });
  return { items: result.items ?? [], hasMore: result.hasNextPage ?? false };
};

/** What a saved record changes on its list row. */
const applyToSummary =
  (cliente: ClienteEditable) =>
  (summary: CustomerSummary): CustomerSummary => ({
    ...summary,
    nombre: cliente.nombre,
    rnc: cliente.rnc,
    telefono: cliente.telefono1,
    direccion: cliente.direccion,
    ciudad: cliente.ciudad,
    condicionPago: cliente.condicion,
    codigoVendedor: cliente.codigoVendedor,
    balance: cliente.balance,
    status: cliente.status,
  });

/**
 * Catálogo › Clientes: search the customer book, open one, edit it.
 *
 * The list stays mounted (hidden) while a customer is open, so coming back keeps the
 * search and scroll position — and a save patches the row in place instead of
 * refetching the page.
 */
const CustomersCatalogScreen: React.FC<Props> = ({ headerAccessory }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<CustomerSummary | null>(null);
  const [patch, setPatch] = useState<CatalogListPatch<CustomerSummary> | null>(null);

  const renderRow = useCallback(
    (item: CustomerSummary) => {
      const meta = [item.rnc, item.telefono].filter(Boolean).join(" · ");
      return (
        <AppCard onPress={() => setSelected(item)}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.nombre.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.body}>
              <View style={styles.topRow}>
                <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text variant="titleSmall" style={styles.balance}>
                  {formatMoney(item.balance)}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
                {item.codigo}
                {meta ? ` · ${meta}` : ""}
              </Text>
              {item.status === "I" && <CatalogBadge label={t("catalog.inactive")} tone="negative" />}
            </View>
            <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        </AppCard>
      );
    },
    [styles, theme, t]
  );

  const handleUpdated = useCallback((cliente: ClienteEditable) => {
    setPatch({ key: cliente.codigo, apply: applyToSummary(cliente) });
  }, []);

  const handleBack = useCallback(() => setSelected(null), []);

  return (
    <>
      <View style={selected ? styles.hidden : styles.fill}>
        <CatalogList
          fetchPage={fetchCustomers}
          keyExtractor={keyExtractor}
          renderRow={renderRow}
          patch={patch}
          headerAccessory={headerAccessory}
          searchPlaceholder={t("catalog.customers.searchPlaceholder")}
          emptyIcon="account-search-outline"
          emptyTitle={t("catalog.customers.emptyTitle")}
          emptyBody={t("catalog.customers.emptyBody")}
          emptySearchTitle={t("catalog.customers.emptySearchTitle")}
          emptySearchBody={t("catalog.customers.emptySearchBody")}
        />
      </View>
      {selected && (
        <View style={styles.fill}>
          <CustomerDetail
            key={selected.codigo}
            codigo={selected.codigo}
            nombre={selected.nombre}
            onBack={handleBack}
            onUpdated={handleUpdated}
          />
        </View>
      )}
    </>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    hidden: {
      display: "none",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
    },
    body: {
      flex: 1,
      gap: 3,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flexShrink: 1,
    },
    balance: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
  });

export default CustomersCatalogScreen;
