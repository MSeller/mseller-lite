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
  extractInvitationCode,
  isCompleteInvitationCode,
  normalizeInvitationCode,
} from "../../utils/b2b";
import { hasNativeModules } from "../../utils/nativeModules";
import BarcodeScanSheet from "../scan/BarcodeScanSheet";
import AppCard from "../ui/AppCard";

/**
 * Whether this binary can open the camera at all. Checked here as well as inside the sheet
 * so the button is hidden rather than offered and then answered with "unavailable": typing
 * the code is a complete path on its own, so there is nothing to apologise for.
 */
const CAMARA_DISPONIBLE = hasNativeModules("ExpoCamera");

interface Props {
  /** Prefilled when the buyer came from a particular store's row. */
  tiendaNombre?: string;
}

/**
 * Redeeming the invitation code a supplier's rep handed over — the short way into a
 * store, with no approval to wait for.
 *
 * One big field and little else on the screen: this is usually typed off a slip of
 * paper or from a WhatsApp message, often one-handed behind a counter. The field
 * normalises as the buyer types (uppercase, spaces and hyphens dropped, characters
 * outside the alphabet ignored) so a code written as `ab 34-cd7k` is accepted instead of
 * being rejected for punctuation the buyer did not know mattered.
 *
 * When the binary has a camera, the buyer can instead scan the QR the rep is holding up on
 * their own phone — the fastest path, and the one that cannot be mistyped. It fills the
 * field rather than submitting on its own: a scan that read the wrong thing stays visible
 * and correctable instead of turning into a server error the buyer cannot place.
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
  const [scanning, setScanning] = useState(false);

  const complete = isCompleteInvitationCode(code);

  /**
   * The QR carries the invitation URL, so the code is pulled out of it before it reaches
   * the field. Anything that yields nothing code-shaped — a QR from some other app, a
   * damaged one — is reported here rather than sent to the server, which would answer with
   * a generic "invalid code" the buyer could only read as "the rep gave me a bad code".
   */
  const onScan = (leido: string) => {
    const escaneado = extractInvitationCode(leido);
    if (!isCompleteInvitationCode(escaneado)) {
      setError(t("marketplace.errors.unreadableQr"));
      return;
    }
    setCode(escaneado);
    setError("");
    setScanning(false);
  };

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
              ? t(
                  CAMARA_DISPONIBLE
                    ? "marketplace.redeemScanHintStore"
                    : "marketplace.redeemHintStore",
                  { tienda: tiendaNombre }
                )
              : t(
                  CAMARA_DISPONIBLE
                    ? "marketplace.redeemScanHint"
                    : "marketplace.redeemHint"
                )}
          </Text>

          {CAMARA_DISPONIBLE && (
            <Button
              mode="contained-tonal"
              icon="qrcode-scan"
              onPress={() => setScanning(true)}
              disabled={submitting}
              style={styles.scan}
              contentStyle={styles.submitContent}
            >
              {t("marketplace.scanAction")}
            </Button>
          )}

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

      <BarcodeScanSheet
        visible={scanning}
        onDismiss={() => setScanning(false)}
        onScan={onScan}
        title={t("marketplace.scanTitle")}
      />
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
    scan: {
      marginTop: 12,
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
