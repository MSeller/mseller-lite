import { openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Snackbar, Text, TextInput, useTheme } from "react-native-paper";

import { LEGAL_URLS } from "../../constants/legal";
import { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { EmailAlreadyRegisteredError, registerBusinessAccount } from "../../services/accountService";
import GoogleSignInButton from "./GoogleSignInButton";
import {
  validateRegistration,
  type RegistrationError,
  type RegistrationForm,
} from "../../utils/account";

interface SignUpScreenProps {
  onNavigateToLogin?: () => void;
}

/** The field each validation rule is shown under. */
const FIELD_OF_ERROR: Record<RegistrationError, keyof RegistrationForm> = {
  firstNameRequired: "firstName",
  lastNameRequired: "lastName",
  emailRequired: "email",
  emailInvalid: "email",
  passwordRequired: "password",
  passwordTooShort: "password",
  passwordNeedsUppercase: "password",
  passwordNeedsNumber: "password",
  passwordsDoNotMatch: "confirmPassword",
};

const EMPTY_FORM: RegistrationForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/**
 * Native self-signup. Creating the account also creates the user's business, with the user
 * as its administrator; once signed in, the root layout hands over to the setup wizard.
 */
const SignUpScreen: React.FC<SignUpScreenProps> = ({ onNavigateToLogin }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const [form, setForm] = useState<RegistrationForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validationError = validateRegistration(form);
  const set = (field: keyof RegistrationForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSignUp = async () => {
    setSubmitted(true);
    if (validationError) return;

    setLoading(true);
    setError("");
    try {
      // On success the auth listener swaps this screen out; nothing to reset here.
      await registerBusinessAccount(form);
    } catch (err) {
      console.error("Sign up error:", err);
      setError(
        err instanceof EmailAlreadyRegisteredError
          ? t("auth.emailAlreadyRegistered")
          : t("auth.signUpFailed"),
      );
      setLoading(false);
    }
  };

  // Only the first broken rule is shown, under its own field, once the user has tried to submit.
  const fieldError = (field: keyof RegistrationForm) =>
    submitted && validationError && FIELD_OF_ERROR[validationError] === field
      ? t(`auth.validation.${validationError}`)
      : "";

  const renderError = (field: keyof RegistrationForm) => {
    const message = fieldError(field);
    return message ? (
      <HelperText type="error" visible>
        {message}
      </HelperText>
    ) : null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                {t("auth.createAccountTitle")}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                {t("auth.createAccountSubtitle")}
              </Text>

              <TextInput
                label={t("common.firstName")}
                value={form.firstName}
                onChangeText={set("firstName")}
                mode="outlined"
                autoComplete="given-name"
                textContentType="givenName"
                disabled={loading}
                left={<TextInput.Icon icon="account" />}
                error={!!fieldError("firstName")}
              />
              {renderError("firstName")}

              <TextInput
                label={t("common.lastName")}
                value={form.lastName}
                onChangeText={set("lastName")}
                mode="outlined"
                autoComplete="family-name"
                textContentType="familyName"
                disabled={loading}
                style={styles.input}
                left={<TextInput.Icon icon="account-outline" />}
                error={!!fieldError("lastName")}
              />
              {renderError("lastName")}

              <TextInput
                label={t("common.email")}
                value={form.email}
                onChangeText={set("email")}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                disabled={loading}
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
                error={!!fieldError("email")}
              />
              {renderError("email")}

              <TextInput
                label={t("common.password")}
                value={form.password}
                onChangeText={set("password")}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                disabled={loading}
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                error={!!fieldError("password")}
              />
              {fieldError("password") ? (
                renderError("password")
              ) : (
                <HelperText type="info" visible>
                  {t("auth.passwordHint")}
                </HelperText>
              )}

              <TextInput
                label={t("auth.confirmPassword")}
                value={form.confirmPassword}
                onChangeText={set("confirmPassword")}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                disabled={loading}
                left={<TextInput.Icon icon="lock-check" />}
                error={!!fieldError("confirmPassword")}
              />
              {renderError("confirmPassword")}

              <Text
                variant="bodySmall"
                style={[styles.legal, { color: theme.colors.onSurfaceVariant }]}
              >
                {t("auth.legalNotice")}{" "}
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary }}
                  onPress={() => openBrowserAsync(LEGAL_URLS.terms)}
                >
                  {t("legal.terms")}
                </Text>{" "}
                {t("auth.legalAnd")}{" "}
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary }}
                  onPress={() => openBrowserAsync(LEGAL_URLS.privacy)}
                >
                  {t("legal.privacy")}
                </Text>
                .
              </Text>

              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                {t("auth.createAccount")}
              </Button>

              <View style={styles.googleButton}>
                <GoogleSignInButton disabled={loading} onError={setError} />
              </View>

              {onNavigateToLogin && (
                <Button mode="text" onPress={onNavigateToLogin} disabled={loading}>
                  {t("auth.alreadyHaveAccount")} {t("auth.signIn")}
                </Button>
              )}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={6000}
        action={{ label: t("common.close"), onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  card: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 24,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginTop: 8,
  },
  legal: {
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  button: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  googleButton: {
    marginBottom: 8,
  },
});

export default SignUpScreen;
