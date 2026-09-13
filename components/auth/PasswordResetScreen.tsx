import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Paragraph,
  Snackbar,
  TextInput,
  Title,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useAuthOperations } from "../../hooks/useAuthOperations";

interface PasswordResetScreenProps {
  onNavigateBack?: () => void;
}

const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({
  onNavigateBack,
}) => {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const { resetPassword, loading, error, clearError } = useAuthOperations();
  const theme = useTheme() as CustomTheme;

  const handleResetPassword = async () => {
    if (!email.trim()) {
      return;
    }

    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch {
      // Error is handled by the hook
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.title, { color: theme.colors.primary }]}>
              Reset Password
            </Title>
            <Paragraph
              style={[styles.subtitle, { color: theme.colors.onSurface }]}
            >
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </Paragraph>

            {!success ? (
              <>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  disabled={loading}
                />

                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading || !email.trim() || !isValidEmail(email)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Send Reset Link
                </Button>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Paragraph
                  style={[
                    styles.successText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Password reset email has been sent to {email}. Please check
                  your inbox and follow the instructions to reset your password.
                </Paragraph>
              </View>
            )}

            {onNavigateBack && (
              <Button
                mode="text"
                onPress={onNavigateBack}
                disabled={loading}
                style={styles.textButton}
              >
                Back to Login
              </Button>
            )}
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={4000}
        action={{
          label: "Dismiss",
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  textButton: {
    marginTop: 8,
  },
  successContainer: {
    marginBottom: 24,
  },
  successText: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
});

export default PasswordResetScreen;
