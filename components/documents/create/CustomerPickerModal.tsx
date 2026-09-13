import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Divider,
  HelperText,
  Icon,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { createCustomer, searchCustomers } from "../../../services/customerService";
import type { CustomerSummary, NewCustomerRequest } from "../../../types/documents";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (customer: CustomerSummary) => void;
}

type Mode = "search" | "create";

const SEARCH_DEBOUNCE_MS = 350;

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

  const [mode, setMode] = useState<Mode>("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New-customer form
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [contacto, setContacto] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const resetAll = useCallback(() => {
    setMode("search");
    setSearch("");
    setResults([]);
    setError("");
    setNombre("");
    setTelefono("");
    setRnc("");
    setDireccion("");
    setEmail("");
    setContacto("");
    setFormError("");
  }, []);

  useEffect(() => {
    if (!visible) resetAll();
  }, [visible, resetAll]);

  // Debounced so typing a name doesn't fire a request per keystroke against the
  // shared API — the list catches up a beat after the finger stops.
  useEffect(() => {
    if (!visible || mode !== "search") return;

    let active = true;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await searchCustomers(search.trim());
        if (active) {
          setResults(result.items ?? []);
          setError("");
        }
      } catch {
        if (active) {
          setResults([]);
          setError(t("documents.errors.customerSearchFailed"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [search, visible, mode, t]);

  const handleCreate = useCallback(async () => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      setFormError(t("documents.newCustomer.nameRequired"));
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload: NewCustomerRequest = {
        nombre: trimmed,
        telefono: telefono.trim() || undefined,
        rnc: rnc.trim() || undefined,
        direccion: direccion.trim() || undefined,
        // Worth the two extra fields at capture time: a customer registered without an
        // address cannot be emailed an invoice later without someone going back to the
        // portal to fill it in, and by then nobody remembers who to ask for.
        email: email.trim() || undefined,
        contacto: contacto.trim() || undefined,
      };
      const created = await createCustomer(payload);
      onSelect(created);
      onDismiss();
    } catch (e: any) {
      setFormError(e?.response?.data?.message || t("documents.errors.customerCreateFailed"));
    } finally {
      setSaving(false);
    }
  }, [nombre, telefono, rnc, direccion, email, contacto, onSelect, onDismiss, t]);

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
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={!saving}
      >
        <Appbar.Header mode="small" style={styles.appbar}>
          {mode === "create" ? (
            <Appbar.BackAction onPress={() => setMode("search")} disabled={saving} />
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
          <>
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

            <View style={styles.footer}>
              <Button
                mode="contained-tonal"
                icon="account-plus"
                onPress={() => {
                  // Carry what was typed into the name — the search that found
                  // nothing is usually the customer's name.
                  setNombre(search.trim());
                  setMode("create");
                }}
                contentStyle={styles.footerButtonContent}
                style={styles.footerButton}
              >
                {t("documents.newCustomer.action")}
              </Button>
            </View>
          </>
        ) : (
          // A fixed container puts the last fields and the save button under the
          // on-screen keyboard on a short phone, with no way to scroll to them.
          <KeyboardAvoidingView
            style={styles.formFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.name")}
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
              autoFocus
              autoCapitalize="words"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.phone")}
              value={telefono}
              onChangeText={setTelefono}
              style={styles.input}
              keyboardType="phone-pad"
              inputMode="tel"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.rnc")}
              value={rnc}
              onChangeText={setRnc}
              style={styles.input}
              inputMode="numeric"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.contact")}
              value={contacto}
              onChangeText={setContacto}
              style={styles.input}
              autoCapitalize="words"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.email")}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              right={email ? <TextInput.Icon icon="close" onPress={() => setEmail("")} /> : null}
            />
            <TextInput
              mode="outlined"
              label={t("documents.newCustomer.address")}
              value={direccion}
              onChangeText={setDireccion}
              style={styles.input}
            />

            <HelperText type={formError ? "error" : "info"} visible>
              {formError || t("documents.newCustomer.hint")}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleCreate}
              loading={saving}
              disabled={saving || !nombre.trim()}
              contentStyle={styles.footerButtonContent}
              style={styles.footerButton}
            >
              {t("documents.newCustomer.save")}
            </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
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
      margin: 0,
      flex: 1,
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
      borderRadius: 12,
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
      borderRadius: 22,
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
      borderRadius: 12,
    },
    footerButtonContent: {
      height: 52,
    },
    formFlex: {
      flex: 1,
    },
    form: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
  });

export default CustomerPickerModal;
