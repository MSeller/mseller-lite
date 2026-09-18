import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { auth } from "../../config/firebase";
import { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import MSellerLogo from "../common/MSellerLogo";
import GoogleSignInButton from "./GoogleSignInButton";

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToPasswordReset?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToSignUp,
  onNavigateToPasswordReset,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t("auth.invalidCredentials"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.error("Login error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/invalid-email":
        return t("auth.invalidCredentials");
      case "auth/user-disabled":
        return t("errors.authorizationError");
      case "auth/user-not-found":
        return t("auth.invalidCredentials");
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return t("auth.invalidCredentials");
      case "auth/too-many-requests":
        return t("errors.timeoutError");
      default:
        return t("errors.authenticationError");
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.background} elevation={0}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.content}>
              {/* App Logo/Branding */}
              <View style={styles.logoContainer}>
                <MSellerLogo style={styles.logo} />
              </View>

              {/* Login Card */}
              <Card elevation={0}
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <Card.Content style={styles.cardContent}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.title, { color: theme.colors.onSurface }]}
                  >
                    {t("messages.welcome")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.subtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("auth.signIn")}
                  </Text>

                  <TextInput
                    label={t("common.email")}
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={styles.input}
                    disabled={loading}
                    left={<TextInput.Icon icon="email" />}
                  />

                  <TextInput
                    label={t("common.password")}
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    style={styles.input}
                    disabled={loading}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off" : "eye"}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                  />

                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                  >
                    {t("auth.signIn")}
                  </Button>

                  {onNavigateToPasswordReset && (
                    <Button
                      mode="text"
                      onPress={onNavigateToPasswordReset}
                      disabled={loading}
                      style={styles.textButton}
                      textColor={theme.colors.primary}
                    >
                      {t("auth.forgotPassword")}
                    </Button>
                  )}

                  <View style={styles.dividerContainer}>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.outline },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("auth.or")}
                    </Text>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.outline },
                      ]}
                    />
                  </View>

                  <GoogleSignInButton disabled={loading} onError={setError} />

                  <Button
                    mode="outlined"
                    onPress={onNavigateToSignUp}
                    disabled={loading}
                    style={styles.registerButton}
                    contentStyle={styles.buttonContent}
                    icon="account-plus"
                  >
                    {t("auth.dontHaveAccount")}
                  </Button>
                </Card.Content>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Surface>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.cancel"),
          onPress: () => setError(""),
        }}
      >
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 0,
  },
  logo: {
    width: 230,
    height: 140,
    marginBottom: 0,
  },
  appName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  tagline: {
    textAlign: "center",
    marginBottom: 8,
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
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  textButton: {
    marginBottom: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  registerButton: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
});

export default LoginScreen;
