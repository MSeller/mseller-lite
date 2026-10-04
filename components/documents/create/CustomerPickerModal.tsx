import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Divider,
  Icon,
  Portal,
  Searchbar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { usePagedSearch, type SearchPage } from "../../../hooks/usePagedSearch";
import { searchCustomers } from "../../../services/customerService";
import type { CustomerSummary } from "../../../types/documents";
import FullScreenModal from "../../ui/FullScreenModal";
import NewCustomerForm from "./NewCustomerForm";
import AppButton from "../../ui/AppButton";
import HeaderBackAction from "../../ui/HeaderBackAction";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (customer: CustomerSummary) => void;
}

type Mode = "search" | "create";

/** The picker shows the first page of the seller's book; there is no paging here. */
const searchCustomerPage = async (query: string): Promise<SearchPage<CustomerSummary>> => {
  const result = await searchCustomers(query.trim());
  return { items: result.items ?? [], hasMore: false };
};

/**
 * Full-screen customer picker: search the seller's book, or register a new
 * customer with only the basics without leaving the document being captured.
 *
 * The two modes live in one modal on purpose — "this customer isn't in the
 * system" is the single most common reason capture stalls in the field, and
 * making it a two-screen detour is what makes people give up and use paper.
 */
const CustomerPickerModal: React.FC<Props> = ({ visible, onDismiss, onSelect }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("search");
  const [search, setSearch] = useState("");
  // Debounced so typing a name doesn't fire a request per keystroke against the
  // shared API — the list catches up a beat after the finger stops.
  const {
    items: results,
    loading,
    error: searchError,
  } = usePagedSearch({ query: search, fetchPage: searchCustomerPage, enabled: visible && mode === "search" });
  const error = searchError ? t("documents.errors.customerSearchFailed") : "";
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMode("search");
      setSearch("");
    }
  }, [visible]);

  const handleCreated = useCallback(
    (created: CustomerSummary) => {
      onSelect(created);
      onDismiss();
    },
    [onSelect, onDismiss]
  );

  const renderCustomer = useCallback(
    ({ item }: { item: CustomerSummary }) => (
      <TouchableRipple
        onPress={() => {
          onSelect(item);
          onDismiss();
        }}
        style={styles.row}
      >
        <View style={styles.rowInner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.nombre.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text variant="titleSmall" style={styles.rowTitle} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text variant="bodySmall" style={styles.rowMeta} numberOfLines={1}>
              {item.codigo}
              {item.telefono ? ` · ${item.telefono}` : ""}
              {item.ciudad ? ` · ${item.ciudad}` : ""}
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>
    ),
    [onSelect, onDismiss, styles, theme]
  );

  return (
    <Portal>
      <FullScreenModal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        dismissable={!saving}
      >
        <Appbar.Header mode="small" style={styles.appbar}>
          {mode === "create" ? (
            <HeaderBackAction onPress={() => setMode("search")} disabled={saving} />
          ) : (
            <Appbar.Action icon="close" onPress={onDismiss} />
          )}
          <Appbar.Content
            title={
              mode === "create" ? t("documents.newCustomer.title") : t("documents.selectCustomer")
            }
          />
        </Appbar.Header>
        <Divider />

        {mode === "search" ? (
          // The search box opens the keyboard, which would otherwise cover the
          // "new customer" button pinned to the bottom.
          <KeyboardAvoidingView
            style={styles.formFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.searchWrap}>
              <Searchbar
                value={search}
                onChangeText={setSearch}
                placeholder={t("documents.customerSearchPlaceholder")}
                style={styles.searchbar}
                inputStyle={styles.searchInput}
                autoFocus
              />
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.codigo}
                renderItem={renderCustomer}
                ItemSeparatorComponent={() => <Divider />}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Icon
                      source="account-search-outline"
                      size={48}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.emptyText}>
                      {error || t("documents.noCustomersFound")}
                    </Text>
                  </View>
                }
              />
            )}

            <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
              <AppButton
                mode="contained-tonal"
                icon="account-plus"
                onPress={() => setMode("create")}
                contentStyle={styles.footerButtonContent}
                style={styles.footerButton}
              >
                {t("documents.newCustomer.action")}
              </AppButton>
            </View>
          </KeyboardAvoidingView>
        ) : (
          // Carries what was typed into the name — the search that found nothing is
          // usually the customer's name.
          <NewCustomerForm
            initialName={search.trim()}
            onCreated={handleCreated}
            onBusyChange={setSaving}
          />
        )}
      </FullScreenModal>
    </Portal>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    modal: {
      // A picker is a full-height sheet of rows, so it sits on `surface` rather
      // than the paper page tone — the rows read crisper on white, and the sheet
      // reads as something that came up over the screen.
      backgroundColor: theme.colors.surface,
    },
    appbar: {
      backgroundColor: theme.colors.surface,
    },
    searchWrap: {
      padding: 16,
      paddingBottom: 8,
    },
    searchbar: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.custom.radius.control,
      minHeight: 52,
    },
    searchInput: {
      minHeight: 52,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    listContent: {
      paddingBottom: 16,
      flexGrow: 1,
    },
    row: {
      // 44px is the floor for a finger; rows in a picker get more.
      minHeight: 64,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    rowInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 44 / 2,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    rowMeta: {
      color: theme.colors.onSurfaceVariant,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    footerButton: {
      borderRadius: theme.custom.radius.control,
    },
    footerButtonContent: {
      height: 52,
    },
    formFlex: {
      flex: 1,
    },
  });

export default CustomerPickerModal;
