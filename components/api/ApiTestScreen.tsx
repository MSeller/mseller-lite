import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  Paragraph,
  Snackbar,
  Title,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { restClient } from "../../services/api";
import { refreshUserAccessToken } from "../../services/userService";

const ApiTestScreen: React.FC = () => {
  const { userProfile, refreshUserProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [apiResponse, setApiResponse] = useState<string>("");
  const theme = useTheme() as CustomTheme;

  const handleRefreshToken = async () => {
    setLoading(true);
    setError("");

    try {
      const token = await refreshUserAccessToken();
      if (token) {
        setSuccess("Token refreshed successfully");
        console.log("New token:", token.substring(0, 50) + "...");
      } else {
        setError("Failed to refresh token");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh token");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setLoading(true);
    setError("");

    try {
      await refreshUserProfile();
      setSuccess("Profile refreshed successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestApiCall = async () => {
    setLoading(true);
    setError("");
    setApiResponse("");

    try {
      // Example API call using the configured axios client
      const response = await restClient.get("/consumo/test");
      setApiResponse(JSON.stringify(response.data, null, 2));
      setSuccess("API call successful");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "API call failed";
      setError(errorMessage);
      setApiResponse(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.title, { color: theme.colors.onSurface }]}>
              Loading Profile...
            </Title>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.title, { color: theme.colors.primary }]}>
              API Testing
            </Title>
            <Paragraph
              style={[styles.subtitle, { color: theme.colors.onSurface }]}
            >
              Test API functionality and authentication
            </Paragraph>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Title
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Authentication
              </Title>

              <Button
                mode="contained"
                onPress={handleRefreshToken}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Refresh Access Token
              </Button>

              <Button
                mode="outlined"
                onPress={handleRefreshProfile}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Refresh User Profile
              </Button>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Title
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                API Configuration
              </Title>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Base URL:
                </Paragraph>
                <Paragraph
                  style={[styles.infoValue, { color: theme.colors.onSurface }]}
                >
                  {userProfile.testMode ? "Sandbox" : "Production"}
                </Paragraph>
              </View>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Test Mode:
                </Paragraph>
                <Paragraph
                  style={[
                    styles.infoValue,
                    {
                      color: userProfile.testMode
                        ? theme.colors.secondary
                        : theme.colors.primary,
                    },
                  ]}
                >
                  {userProfile.testMode ? "Enabled" : "Disabled"}
                </Paragraph>
              </View>

              <Button
                mode="contained"
                onPress={handleTestApiCall}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Test API Call
              </Button>
            </View>

            {apiResponse && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.section}>
                  <Title
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    API Response
                  </Title>
                  <Card elevation={0}
                    style={[
                      styles.responseCard,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Card.Content>
                      <Paragraph
                        style={[
                          styles.responseText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {apiResponse}
                      </Paragraph>
                    </Card.Content>
                  </Card>
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: "Dismiss",
          onPress: () => setError(""),
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={3000}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
  },
  responseCard: {
    borderRadius: 8,
  },
  responseText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});

export default ApiTestScreen;
