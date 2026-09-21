import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { redeemInvitationCode } from "../../services/b2bService";
import type { VinculoB2B } from "../../types/b2b";
import {
  INVITATION_CODE_LENGTH,
  describeB2BError,
  isCompleteInvitationCode,
  normalizeInvitationCode,
} from "../../utils/b2b";
import AppCard from "../ui/AppCard";

interface Props {
  /** Prefilled when the buyer came from a particular store's row. */
  tiendaNombre?: string;
}

/**
 * Redeeming the invitation code a supplier's rep handed over — the short way into a
 * store, with no approval to wait for.
 *
 * One big field and nothing else on the screen: this is usually typed off a slip of
 * paper or from a WhatsApp message, often one-handed behind a counter. The field
 * normalises as the buyer types (uppercase, spaces and hyphens dropped, characters
 * outside the alphabet ignored) so a code written as `ab 34-cd7k` is accepted instead of
 * being rejected for punctuation the buyer did not know mattered.
 */
const RedeemCodeScreen: React.FC<Props> = ({ tiendaNombre }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState<VinculoB2B | null>(null);

  const complete = isCompleteInvitationCode(code);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/marketplace");
  };

  const submit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const vinculo = await redeemInvitationCode(code);
      setLink(vinculo);
    } catch (e) {
      const failure = describeB2BError(e);
      setError(
        failure.kind === "rateLimited"
          ? t("marketplace.errors.tooManyAttempts")
          : failure.message ||
              (failure.kind === "notFound" || failure.kind === "invalid"
                ? t("marketplace.errors.invalidCode")
                : failure.kind === "conflict"
                  ? t("marketplace.errors.alreadyLinked")
                  : t("marketplace.errors.redeemFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  // The link landed. An active one opens the catalogue straight away; one that still
  // needs the supplier's approval just says so.
  if (link) {
    const activa = link.estado === "activa";
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Appbar.Header mode="small" style={styles.appbar}>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title={t("marketplace.redeemTitle")} />
        </Appbar.Header>
        <View style={styles.successContent}>
          <AppCard>
            <View style={styles.successCard}>
              <Text variant="titleMedium" style={styles.successTitle}>
                {activa
                  ? t("marketplace.redeemSuccessTitle", { tienda: link.tiendaNombre })
                  : t("marketplace.redeemPendingTitle", { tienda: link.tiendaNombre })}
              </Text>
              <Text variant="bodyMedium" style={styles.help}>
                {activa ? t("marketplace.redeemSuccessBody") : t("marketplace.redeemPendingBody")}
              </Text>
              <Button
                mode="contained"
                onPress={() =>
                  activa
                    ? router.replace({
                        pathname: "/marketplace/[tiendaId]/catalogo",
                        params: { tiendaId: link.tiendaId, nombre: link.tiendaNombre },
                      })
                    : goBack()
                }
                style={styles.successButton}
              >
                {activa ? t("marketplace.openCatalog") : t("common.back")}
              </Button>
            </View>
          </AppCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={t("marketplace.redeemTitle")} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="bodyMedium" style={styles.help}>
            {tiendaNombre
              ? t("marketplace.redeemHintStore", { tienda: tiendaNombre })
              : t("marketplace.redeemHint")}
          </Text>

          <TextInput
            mode="outlined"
            value={code}
            onChangeText={(raw) => {
              setCode(normalizeInvitationCode(raw));
              if (error) setError("");
            }}
            // Auto-capitalisation is off on purpose: the value is uppercased by the
            // normaliser, and letting the keyboard do it too fights the caret on Android.
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={INVITATION_CODE_LENGTH}
            error={!!error}
            style={styles.codeInput}
            contentStyle={styles.codeInputContent}
            accessibilityLabel={t("marketplace.codeLabel")}
            onSubmitEditing={submit}
            returnKeyType="done"
          />

          <Text variant="bodySmall" style={styles.counter}>
            {t("marketplace.codeCounter", {
              typed: code.length,
              total: INVITATION_CODE_LENGTH,
            })}
          </Text>

          {!!error && (
            <Text variant="bodyMedium" style={styles.error}>
              {error}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={submit}
            disabled={!complete || submitting}
            loading={submitting}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            {t("marketplace.redeemAction")}
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace("/marketplace/solicitar")}
            style={styles.alternative}
          >
            {t("marketplace.noCodeAction")}
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
      padding: 24,
      gap: 12,
    },
    help: {
      color: theme.colors.onSurfaceVariant,
    },
    codeInput: {
      backgroundColor: theme.colors.surface,
      marginTop: 8,
    },
    codeInputContent: {
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      // Wide tracking is what makes an 8-character code readable as characters rather
      // than as a word, which is how it is checked against the slip it was copied from.
      letterSpacing: 6,
      height: 68,
    },
    counter: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    error: {
      color: theme.colors.error,
      textAlign: "center",
    },
    submit: {
      marginTop: 8,
    },
    submitContent: {
      height: 52,
    },
    alternative: {
      marginTop: 4,
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

export default RedeemCodeScreen;
