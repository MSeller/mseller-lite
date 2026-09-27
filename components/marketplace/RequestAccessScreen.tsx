import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { requestStoreAccess } from "../../services/b2bService";
import type { VinculoB2B } from "../../types/b2b";
import { describeB2BError } from "../../utils/b2b";
import AppCard from "../ui/AppCard";
import EmptyState from "../ui/EmptyState";
import FormField from "../ui/FormField";

interface Props {
  tiendaId?: string;
  tiendaNombre?: string;
}

/**
 * Asking a supplier for access when no rep has handed over a code.
 *
 * The form is prefilled from the buyer's own business so the usual case is "check and
 * send". Only the trading name is required — the supplier's rep is going to look this up
 * and call anyway, and a long form here is what stops a colmado from ever sending it.
 */
const RequestAccessScreen: React.FC<Props> = ({ tiendaId, tiendaNombre }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { userProfile } = useUser();

  const business = userProfile?.business;
  const [nombreNegocio, setNombreNegocio] = useState(business?.name ?? "");
  const [rnc, setRnc] = useState(business?.rnc ?? "");
  const [telefono, setTelefono] = useState(business?.phone ?? "");
  const [direccion, setDireccion] = useState(
    [business?.address?.street, business?.address?.city].filter(Boolean).join(", ")
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [link, setLink] = useState<VinculoB2B | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/marketplace");
  };

  const submit = async () => {
    if (submitting || !tiendaId) return;
    if (!nombreNegocio.trim()) {
      setNameError(t("marketplace.errors.businessNameRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const vinculo = await requestStoreAccess({
        tiendaId,
        nombreNegocio: nombreNegocio.trim(),
        // Empty optional fields are omitted rather than sent as "": the supplier reads
        // this as a contact card, and a blank line is worse than a missing one.
        rnc: rnc.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
      });
      setLink(vinculo);
    } catch (e) {
      const failure = describeB2BError(e);
      setError(
        failure.kind === "rateLimited"
          ? t("marketplace.errors.tooManyAttempts")
          : failure.message ||
              (failure.kind === "conflict"
                ? t("marketplace.errors.alreadyRequested")
                : t("marketplace.errors.requestFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <Appbar.Header mode="small" style={styles.appbar}>
      <Appbar.BackAction onPress={goBack} />
      <Appbar.Content title={t("marketplace.requestTitle")} />
    </Appbar.Header>
  );

  // Reached without a store — the "I don't have a code" shortcut, which cannot know
  // which supplier is meant. Access is always asked OF a store.
  if (!tiendaId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {header}
        <View style={styles.center}>
          <EmptyState
            icon="storefront-outline"
            title={t("marketplace.pickStoreTitle")}
            message={t("marketplace.pickStoreBody")}
          />
          <Button mode="contained" onPress={() => router.replace("/(tabs)/marketplace")}>
            {t("marketplace.browseStores")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (link) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {header}
        <View style={styles.successContent}>
          <AppCard>
            <View style={styles.successCard}>
              <Text variant="titleMedium" style={styles.successTitle}>
                {t("marketplace.requestSentTitle", { tienda: link.tiendaNombre })}
              </Text>
              <Text variant="bodyMedium" style={styles.help}>
                {t("marketplace.requestSentBody")}
              </Text>
              <Button mode="contained" onPress={goBack} style={styles.successButton}>
                {t("common.back")}
              </Button>
            </View>
          </AppCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="bodyMedium" style={styles.help}>
            {tiendaNombre
              ? t("marketplace.requestHintStore", { tienda: tiendaNombre })
              : t("marketplace.requestHint")}
          </Text>

          <FormField
            label={t("marketplace.businessName")}
            value={nombreNegocio}
            onChangeText={(value) => {
              setNombreNegocio(value);
              if (nameError) setNameError("");
            }}
            errorText={nameError || undefined}
            autoCapitalize="words"
          />
          <FormField
            label={t("marketplace.rnc")}
            value={rnc}
            onChangeText={setRnc}
            keyboardType="number-pad"
            helperText={t("common.optional")}
          />
          <FormField
            label={t("marketplace.phone")}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            helperText={t("common.optional")}
          />
          <FormField
            label={t("marketplace.address")}
            value={direccion}
            onChangeText={setDireccion}
            multiline
            helperText={t("common.optional")}
          />

          {!!error && (
            <Text variant="bodyMedium" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={submit}
            disabled={submitting}
            loading={submitting}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            {t("marketplace.requestAction")}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
      gap: 4,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingHorizontal: 32,
    },
    help: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
    },
    error: {
      color: theme.colors.error,
    },
    submit: {
      marginTop: 12,
    },
    submitContent: {
      height: 52,
    },
    successContent: {
      padding: 24,
    },
    successCard: {
      padding: 20,
      gap: 10,
    },
    successTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    successButton: {
      marginTop: 8,
    },
  });

export default RequestAccessScreen;
