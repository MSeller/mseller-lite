import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { HelperText, TextInput, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../../constants/Theme";
import { useSuggestedCode } from "../../../hooks/useSuggestedCode";
import { useTranslation } from "../../../hooks/useTranslation";
import { createCustomer, getNextCustomerCode } from "../../../services/customerService";
import type { CreatedCustomer, NewCustomerRequest } from "../../../types/documents";
import AppButton from "../../ui/AppButton";

interface Props {
  /** Pre-fills the name — usually the search that found nothing. */
  initialName?: string;
  onCreated: (customer: CreatedCustomer) => void;
  /** True while saving, so the host can hold its close button. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Registers a customer with only the basics; the rest is completed later. Shared by the
 * document's customer picker and Catálogo › Clientes.
 */
const NewCustomerForm: React.FC<Props> = ({ initialName = "", onCreated, onBusyChange }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [nombre, setNombre] = useState(initialName);
  const [telefono, setTelefono] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [contacto, setContacto] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Pre-filled with the code the server would assign; the user can overwrite it.
  const codigo = useSuggestedCode(getNextCustomerCode, [], { enabled: true });

  useEffect(() => {
    onBusyChange?.(saving);
  }, [saving, onBusyChange]);

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
        // Omitted while the suggestion is untouched, so the sequence assigns it on save.
        codigo: codigo.codeForRequest,
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
      setSaving(false);
      onCreated(created);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || t("documents.errors.customerCreateFailed"));
      setSaving(false);
    }
  }, [nombre, telefono, rnc, direccion, email, contacto, codigo.codeForRequest, onCreated, t]);

  return (
    // A fixed container puts the last fields and the save button under the
    // on-screen keyboard on a short phone, with no way to scroll to them.
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: 32 + insets.bottom }]}
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

        <AppButton
          mode="contained"
          onPress={handleCreate}
          loading={saving}
          disabled={saving || !nombre.trim()}
          contentStyle={styles.buttonContent}
          style={styles.button}
        >
          {t("documents.newCustomer.save")}
        </AppButton>
      </ScrollView>
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

export default NewCustomerForm;
