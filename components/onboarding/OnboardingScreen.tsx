import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  HelperText,
  Icon,
  ProgressBar,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BRAND_COLORS,
  BUSINESS_TYPES,
  COUNTRIES,
  FISCAL_TYPES,
  INDUSTRIES,
  type FiscalType,
  type SetupOption,
} from "../../constants/onboarding";
import type { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  completeBusinessSetup,
  lookupRnc,
  signOutCompletely,
  type RncInfo,
} from "../../services/accountService";
import { ImageTooLargeError, toImageDataUri, uploadImages } from "../../services/mediaService";
import {
  EMPTY_ONBOARDING_FORM,
  formatPhone,
  getRncDigits,
  isOnboardingStepValid,
  isRncValid,
  ONBOARDING_STEPS,
  type OnboardingForm,
} from "../../utils/account";
import { capturePhoto } from "../../utils/photoCapture";
import SelectField from "../ui/SelectField";
import OptionPickerModal, { type PickerOption } from "./OptionPickerModal";

const RNC_LOOKUP_DEBOUNCE_MS = 800;

type Picker = "country" | "businessType" | "industry" | null;

/**
 * The business setup wizard a new administrator goes through after signing up — the same
 * seven steps as cloud.mseller.app/onboarding, native rather than an embedded web page.
 * Nothing is saved until Finish, where the tenant is seeded and the business marked set up;
 * the root layout then swaps this screen for the app.
 */
const OnboardingScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, currentLanguage } = useTranslation();
  const { user, userProfile, refreshUserProfile } = useUser();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(() => ({
    ...EMPTY_ONBOARDING_FORM,
    // Self-signup names the business "<name>'s Business"; that placeholder is not worth keeping.
    businessName: userProfile?.business?.name?.endsWith("'s Business") ? "" : userProfile?.business?.name ?? "",
  }));
  const [picker, setPicker] = useState<Picker>(null);
  const [rncInfo, setRncInfo] = useState<RncInfo | null>(null);
  const [rncChecking, setRncChecking] = useState(false);
  const [rncChecked, setRncChecked] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set once the business is seeded, so a retry after a failed profile reload does not seed it twice.
  const [setupDone, setSetupDone] = useState(false);
  const [error, setError] = useState("");

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const canContinue = isOnboardingStepValid(step, form) && !uploadingLogo;

  const update = (patch: Partial<OnboardingForm>) => setForm((current) => ({ ...current, ...patch }));

  // Android's back button walks the wizard back instead of leaving the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stepIndex === 0 || submitting) return false;
      setStepIndex((index) => index - 1);
      return true;
    });
    return () => subscription.remove();
  }, [stepIndex, submitting]);

  // Look the RNC up once it has a valid length; the result only informs, it never blocks.
  const rncDigits = form.country === "DO" && isRncValid(form.rnc) ? getRncDigits(form.rnc) : "";
  useEffect(() => {
    setRncInfo(null);
    setRncChecked(false);
    update({ comercialName: "" });
    if (!rncDigits) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setRncChecking(true);
      const info = await lookupRnc(rncDigits);
      // The RNC was edited while this lookup was out; its answer is for a stale number.
      if (cancelled) return;
      setRncInfo(info);
      setRncChecked(true);
      setRncChecking(false);
      if (info) update({ comercialName: info.commercialName });
    }, RNC_LOOKUP_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setRncChecking(false);
    };
  }, [rncDigits]);

  const handleNext = async () => {
    if (!canContinue) return;
    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }
    if (!user || !userProfile?.business?.config) {
      setError(t("onboarding.errors.noUser"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (!setupDone) {
        await completeBusinessSetup(
          user,
          userProfile.business.config,
          userProfile.testMode,
          form,
          currentLanguage,
        );
        setSetupDone(true);
      }
      // The reloaded profile says setup is done, which is what takes the user into the app.
      // If this screen is still mounted afterwards, the reload failed and Finish can retry it.
      await refreshUserProfile();
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(t("onboarding.errors.configError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickLogo = async () => {
    try {
      const photo = await capturePhoto("library", {
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!photo?.base64) return;
      setUploadingLogo(true);
      const [media] = await uploadImages([toImageDataUri(photo.base64)], "logo");
      update({ logo: media.originalUrl });
    } catch (err) {
      console.error("Logo upload error:", err);
      setError(
        err instanceof ImageTooLargeError
          ? t("onboarding.logoTooLarge")
          : t("onboarding.logoUploadFailed"),
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const chooseSetupOption = (option: SetupOption) => {
    if (option === form.setupOption) return;
    if (option === "sample") {
      update({ setupOption: option });
      return;
    }
    Alert.alert(t("onboarding.dataSetupStep.confirmScratch"), undefined, [
      { text: t("onboarding.dataSetupStep.cancel"), style: "cancel" },
      {
        text: t("onboarding.dataSetupStep.confirmScratchYes"),
        onPress: () => update({ setupOption: option }),
      },
    ]);
  };

  const pickerOptions: Record<Exclude<Picker, null>, PickerOption[]> = {
    country: COUNTRIES,
    businessType: BUSINESS_TYPES.map((o) => ({
      value: o.value,
      label: t(`onboarding.businessTypeStep.businessTypes.${o.key}`),
    })),
    industry: INDUSTRIES.map((o) => ({
      value: o.value,
      label: t(`onboarding.businessTypeStep.industries.${o.key}`),
    })),
  };

  const labelOf = (kind: Exclude<Picker, null>, value: string) =>
    pickerOptions[kind].find((o) => o.value === value)?.label ?? "";

  /** A read-only outlined field that opens a picker, so choices look like the other inputs. */
  const renderSelect = (kind: Exclude<Picker, null>, label: string, placeholder: string, value: string) => (
    <SelectField
      label={label}
      placeholder={placeholder}
      value={labelOf(kind, value)}
      onPress={() => setPicker(kind)}
      style={styles.field}
    />
  );

  const renderStep = () => {
    switch (step) {
      case "businessName":
        return (
          <TextInput
            mode="outlined"
            label={t("onboarding.businessNameStep.label")}
            placeholder={t("onboarding.businessNameStep.placeholder")}
            value={form.businessName}
            onChangeText={(businessName) => update({ businessName })}
            autoCapitalize="words"
            autoFocus
            style={styles.field}
          />
        );

      case "phone":
        return (
          <>
            <TextInput
              mode="outlined"
              label={t("onboarding.phoneStep.label")}
              placeholder={t("onboarding.phoneStep.placeholder")}
              value={form.phone}
              onChangeText={(phone) => update({ phone: formatPhone(phone) })}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              style={styles.field}
            />
            <HelperText type="info" visible>
              {t("onboarding.phoneStep.helper")}
            </HelperText>
          </>
        );

      case "country":
        return (
          <>
            {renderSelect(
              "country",
              t("onboarding.countryStep.label"),
              t("onboarding.countryStep.placeholder"),
              form.country,
            )}
            {form.country === "DO" && (
              <View style={styles.section}>
                <Text variant="labelLarge" style={styles.sectionLabel}>
                  {t("onboarding.countryStep.drAdditionalInfo")}
                </Text>
                <TextInput
                  mode="outlined"
                  label={t("onboarding.countryStep.rncLabel")}
                  placeholder={t("onboarding.countryStep.rncPlaceholder")}
                  value={form.rnc}
                  onChangeText={(rnc) => update({ rnc })}
                  keyboardType="number-pad"
                  error={!!form.rnc && !isRncValid(form.rnc) && getRncDigits(form.rnc).length >= 9}
                />
                <HelperText type={rncChecked && !rncInfo ? "error" : "info"} visible>
                  {rncChecking
                    ? t("onboarding.rncChecking")
                    : rncInfo
                      ? `${t("onboarding.rncFound")}: ${rncInfo.businessName}`
                      : rncChecked
                        ? t("onboarding.countryStep.rncNotVerified")
                        : t("onboarding.countryStep.rncHelper")}
                </HelperText>

                <Text variant="labelLarge" style={styles.sectionLabel}>
                  {t("onboarding.countryStep.fiscalQuestion")}
                </Text>
                <RadioButton.Group
                  value={form.fiscalType === null ? "" : String(form.fiscalType)}
                  onValueChange={(value) => update({ fiscalType: Number(value) as FiscalType })}
                >
                  <RadioButton.Item
                    label={t("onboarding.countryStep.fiscalNcf")}
                    value={String(FISCAL_TYPES.ncf)}
                    mode="android"
                    position="leading"
                    labelStyle={styles.radioLabel}
                  />
                  <RadioButton.Item
                    label={t("onboarding.countryStep.fiscalEcf")}
                    value={String(FISCAL_TYPES.ecf)}
                    mode="android"
                    position="leading"
                    labelStyle={styles.radioLabel}
                    disabled
                  />
                  <RadioButton.Item
                    label={t("onboarding.countryStep.fiscalNone")}
                    value={String(FISCAL_TYPES.none)}
                    mode="android"
                    position="leading"
                    labelStyle={styles.radioLabel}
                  />
                </RadioButton.Group>
                <Text variant="bodySmall" style={styles.muted}>
                  {t("onboarding.countryStep.ecfNotice")}
                </Text>
              </View>
            )}
          </>
        );

      case "address":
        return (
          <>
            <TextInput
              mode="outlined"
              label={t("onboarding.addressStep.streetLabel")}
              placeholder={t("onboarding.addressStep.streetPlaceholder")}
              value={form.street}
              onChangeText={(street) => update({ street })}
              textContentType="streetAddressLine1"
              autoFocus
              style={styles.field}
            />
            <TextInput
              mode="outlined"
              label={t("onboarding.addressStep.cityLabel")}
              placeholder={t("onboarding.addressStep.cityPlaceholder")}
              value={form.city}
              onChangeText={(city) => update({ city })}
              textContentType="addressCity"
              style={styles.field}
            />
          </>
        );

      case "businessType":
        return (
          <>
            {renderSelect(
              "businessType",
              t("onboarding.businessTypeStep.businessTypeLabel"),
              t("onboarding.businessTypeStep.businessTypePlaceholder"),
              form.businessType,
            )}
            {renderSelect(
              "industry",
              t("onboarding.businessTypeStep.industryLabel"),
              t("onboarding.businessTypeStep.industryPlaceholder"),
              form.industry,
            )}
          </>
        );

      case "branding":
        return (
          <>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {t("onboarding.brandingStep.logoLabel")}
            </Text>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                {uploadingLogo ? (
                  <ActivityIndicator />
                ) : form.logo ? (
                  <Image
                    source={{ uri: form.logo }}
                    style={styles.logoImage}
                    contentFit="contain"
                    accessibilityLabel={t("onboarding.brandingStep.logoPreview")}
                  />
                ) : (
                  <Icon source="image-outline" size={36} color={theme.colors.onSurfaceVariant} />
                )}
              </View>
              <View style={styles.logoActions}>
                <Button mode="outlined" icon="upload" onPress={handlePickLogo} disabled={uploadingLogo}>
                  {form.logo ? t("onboarding.brandingStep.changeLogo") : t("onboarding.brandingStep.uploadLogo")}
                </Button>
                {!!form.logo && (
                  <Button mode="text" onPress={() => update({ logo: "" })} disabled={uploadingLogo}>
                    {t("onboarding.brandingStep.removeLogo")}
                  </Button>
                )}
              </View>
            </View>

            <Text variant="labelLarge" style={[styles.sectionLabel, styles.section]}>
              {t("onboarding.brandingStep.colorLabel")}
            </Text>
            <View style={styles.swatches}>
              {BRAND_COLORS.map((color) => {
                const selected = form.brandColor === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={color}
                    onPress={() => update({ brandColor: selected ? "" : color })}
                    style={[
                      styles.swatch,
                      { backgroundColor: color },
                      selected && { borderColor: theme.colors.onSurface },
                    ]}
                  >
                    {selected && <Icon source="check" size={20} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
            <Text variant="bodySmall" style={[styles.muted, styles.section]}>
              {t("onboarding.brandingStep.skipHint")}
            </Text>
          </>
        );

      case "dataSetup":
        return (["sample", "new"] as SetupOption[]).map((option) => {
          const selected = form.setupOption === option;
          return (
            <TouchableRipple
              key={option}
              onPress={() => chooseSetupOption(option)}
              style={[
                styles.optionCard,
                { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant },
              ]}
              borderless
            >
              <View style={styles.optionRow}>
                <RadioButton.Android
                  value={option}
                  status={selected ? "checked" : "unchecked"}
                  onPress={() => chooseSetupOption(option)}
                />
                <View style={styles.optionText}>
                  <Text variant="titleSmall">{t(`onboarding.dataSetupStep.${option}Title`)}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {t(`onboarding.dataSetupStep.${option}Description`)}
                  </Text>
                </View>
              </View>
            </TouchableRipple>
          );
        });
    }
  };

  if (submitting) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text variant="titleMedium" style={styles.configuringTitle}>
          {t("onboarding.configuring", { name: form.businessName.trim() })}
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {t("onboarding.configuringWait")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <Appbar.Header mode="small" style={styles.appbar} statusBarHeight={0}>
        {stepIndex > 0 ? (
          <Appbar.BackAction onPress={() => setStepIndex((index) => index - 1)} />
        ) : null}
        <Appbar.Content title={t("onboarding.pageTitle")} />
        <Button onPress={signOutCompletely} compact>
          {t("onboarding.signOut")}
        </Button>
      </Appbar.Header>
      {/* On web Paper's ProgressBar fills its parent's height; the fixed track keeps it a thin rule. */}
      <View style={styles.progressTrack}>
        <ProgressBar progress={(stepIndex + 1) / ONBOARDING_STEPS.length} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text variant="labelLarge" style={[styles.muted, styles.stepCount]}>
            {t("onboarding.stepOf", { current: stepIndex + 1, total: ONBOARDING_STEPS.length })}
          </Text>
          <Text variant="headlineSmall" style={styles.title}>
            {t(`onboarding.${step}Step.title`)}
          </Text>
          <Text variant="bodyMedium" style={[styles.muted, styles.subtitle]}>
            {t(`onboarding.${step}Step.subtitle`)}
          </Text>
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={() => setStepIndex((index) => index - 1)}
            disabled={stepIndex === 0}
            style={styles.footerButton}
          >
            {t("onboarding.back")}
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!canContinue}
            style={styles.footerButton}
          >
            {isLastStep ? t("onboarding.finish") : t("onboarding.next")}
          </Button>
        </View>
      </KeyboardAvoidingView>

      {picker && (
        <OptionPickerModal
          visible
          title={
            picker === "country"
              ? t("onboarding.countryStep.label")
              : picker === "businessType"
                ? t("onboarding.businessTypeStep.businessTypeLabel")
                : t("onboarding.businessTypeStep.industryLabel")
          }
          options={pickerOptions[picker]}
          selected={picker === "country" ? form.country : picker === "businessType" ? form.businessType : form.industry}
          searchPlaceholder={picker === "country" ? t("onboarding.searchCountry") : undefined}
          onDismiss={() => setPicker(null)}
          onSelect={(value) => {
            if (picker === "country") {
              // RNC and receipt type only apply to the Dominican Republic.
              update(value === "DO" ? { country: value } : { country: value, rnc: "", fiscalType: null });
            } else {
              update({ [picker]: value });
            }
          }}
        />
      )}

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={6000}
        action={{ label: t("common.close"), onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.custom.spacing.xl,
      gap: theme.custom.spacing.sm,
    },
    configuringTitle: {
      marginTop: theme.custom.spacing.md,
      textAlign: "center",
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    progressTrack: {
      height: 4,
    },
    body: {
      padding: theme.custom.spacing.lg,
      paddingBottom: theme.custom.spacing.xxl,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    stepCount: {
      marginBottom: theme.custom.spacing.xs,
    },
    title: {
      fontWeight: "bold",
      marginBottom: theme.custom.spacing.xs,
    },
    subtitle: {
      marginBottom: theme.custom.spacing.lg,
    },
    muted: {
      color: theme.colors.onSurfaceVariant,
    },
    field: {
      marginBottom: theme.custom.spacing.md,
    },
    section: {
      marginTop: theme.custom.spacing.md,
    },
    sectionLabel: {
      marginBottom: theme.custom.spacing.sm,
    },
    radioLabel: {
      textAlign: "left",
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.custom.spacing.md,
    },
    logoBox: {
      width: 96,
      height: 96,
      borderRadius: theme.custom.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    logoImage: {
      width: "100%",
      height: "100%",
    },
    logoActions: {
      flex: 1,
      alignItems: "flex-start",
      gap: theme.custom.spacing.xs,
    },
    swatches: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.custom.spacing.md,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: theme.custom.radius.pill,
      borderWidth: 3,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    optionCard: {
      borderWidth: 1.5,
      borderRadius: theme.custom.radius.md,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.custom.spacing.md,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: theme.custom.spacing.md,
      gap: theme.custom.spacing.sm,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    footer: {
      flexDirection: "row",
      gap: theme.custom.spacing.md,
      paddingHorizontal: theme.custom.spacing.lg,
      paddingVertical: theme.custom.spacing.md,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.background,
    },
    footerButton: {
      flex: 1,
    },
  });

export default OnboardingScreen;
