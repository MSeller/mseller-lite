import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Chip,
  Icon,
  RadioButton,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { usePrinter } from "../../contexts/PrinterContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  isTransportSupported,
  listBondedClassic,
  scanBle,
} from "../../services/printing/printerService";
import { DEFAULT_PROFILE_ID, PRINTER_PROFILES, getPrinterProfile } from "../../services/printing/profiles";
import {
  DEFAULT_TCP_PORT,
  parseTcpAddress,
  type DiscoveredDevice,
  type TransportKind,
} from "../../services/printing/transports/types";
import AppCard from "../ui/AppCard";
import SectionHeader from "../ui/SectionHeader";
import { describePrinterError } from "./printerErrors";

const SCAN_TIMEOUT_MS = 12000;

type Busy = "none" | "save" | "test" | "connect" | "disconnect" | "forget";

/**
 * Setting up the thermal printer on this phone: pick the model, find the device (BLE scan,
 * paired Bluetooth on Android, or an IP address), save it, and print a test page.
 */
const PrintersScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    available,
    printer,
    profile: savedProfile,
    connection,
    savePrinter,
    forgetPrinter,
    connect,
    disconnect,
    printTestPage,
  } = usePrinter();

  const [profileId, setProfileId] = useState(printer?.profileId ?? DEFAULT_PROFILE_ID);
  const profile = getPrinterProfile(profileId) ?? PRINTER_PROFILES[0];
  const transports = useMemo(
    () => profile.transports.filter((kind) => isTransportSupported(kind)),
    [profile]
  );
  const [transport, setTransport] = useState<TransportKind>(printer?.transport ?? "ble");
  const [selected, setSelected] = useState<DiscoveredDevice | null>(
    printer && printer.transport !== "tcp"
      ? { kind: printer.transport, address: printer.address, name: printer.name }
      : null
  );
  const [tcpInput, setTcpInput] = useState(printer?.transport === "tcp" ? printer.address : "");

  // If the screen mounted before the saved printer was read from storage, fill the form once it
  // arrives. Only the first time: later changes come from this form's own save.
  const formPrinter = useRef(printer);
  useEffect(() => {
    if (!printer || formPrinter.current) return;
    formPrinter.current = printer;
    setProfileId(printer.profileId);
    setTransport(printer.transport);
    setSelected(
      printer.transport === "tcp"
        ? null
        : { kind: printer.transport, address: printer.address, name: printer.name }
    );
    setTcpInput(printer.transport === "tcp" ? printer.address : "");
  }, [printer]);

  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showUnnamed, setShowUnnamed] = useState(false);
  const [bonded, setBonded] = useState<DiscoveredDevice[]>([]);
  const [loadingBonded, setLoadingBonded] = useState(false);

  const [busy, setBusy] = useState<Busy>("none");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const stopScanRef = useRef<(() => void) | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/more");
  }, [router]);

  // Keep the transport valid for the chosen model and this platform.
  useEffect(() => {
    if (transports.length > 0 && !transports.includes(transport)) setTransport(transports[0]);
  }, [transports, transport]);

  const stopScan = useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
  }, []);

  useEffect(() => stopScan, [stopScan]);

  const startScan = useCallback(async () => {
    stopScan();
    setError("");
    setOk("");
    setDevices([]);
    setScanning(true);
    try {
      stopScanRef.current = await scanBle(
        SCAN_TIMEOUT_MS,
        (device) =>
          setDevices((current) => {
            const index = current.findIndex((d) => d.address === device.address);
            if (index < 0) return [...current, device];
            const next = current.slice();
            next[index] = { ...current[index], ...device, name: device.name ?? current[index].name };
            return next;
          }),
        (scanError) => {
          stopScanRef.current = null;
          setScanning(false);
          setScanned(true);
          if (scanError) setError(scanError);
        }
      );
    } catch (e) {
      setScanning(false);
      setError(describePrinterError(e, t));
    }
  }, [stopScan, t]);

  const loadBonded = useCallback(async () => {
    setLoadingBonded(true);
    setError("");
    try {
      setBonded(await listBondedClassic());
    } catch (e) {
      setError(describePrinterError(e, t));
    } finally {
      setLoadingBonded(false);
    }
  }, [t]);

  useEffect(() => {
    if (!available) return;
    if (transport !== "ble") stopScan();
    if (transport === "bt-classic") loadBonded();
  }, [available, transport, loadBonded, stopScan]);

  const changeTransport = (next: string) => {
    setTransport(next as TransportKind);
    setSelected(null);
    setError("");
    setOk("");
  };

  const visibleDevices = useMemo(() => {
    const list = transport === "ble" ? devices : bonded;
    const filtered = showUnnamed || transport !== "ble" ? list : list.filter((d) => !!d.name);
    return [...filtered].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
  }, [transport, devices, bonded, showUnnamed]);

  const run = useCallback(
    async (kind: Busy, action: () => Promise<void>, success?: string) => {
      setBusy(kind);
      setError("");
      setOk("");
      try {
        await action();
        if (success) setOk(success);
      } catch (e) {
        setError(describePrinterError(e, t));
      } finally {
        setBusy("none");
      }
    },
    [t]
  );

  const handleSave = () => {
    let address: string;
    let name: string | null;
    if (transport === "tcp") {
      const parsed = parseTcpAddress(tcpInput);
      if (!parsed) {
        setError(t("printers.tcpInvalid"));
        return;
      }
      address = `${parsed.host}:${parsed.port}`;
      name = address;
    } else {
      if (!selected || selected.kind !== transport) {
        setError(t("printers.selectDevice"));
        return;
      }
      address = selected.address;
      name = selected.name;
    }
    stopScan();
    run("save", () => savePrinter({ profileId: profile.id, transport, address, name }), t("printers.saved"));
  };

  const ocupado = busy !== "none";

  if (!available) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Appbar.Header mode="small" style={styles.appbar}>
          <Appbar.BackAction onPress={goBack} />
          <Appbar.Content title={t("printers.title")} />
        </Appbar.Header>
        <View style={styles.center}>
          <Icon source="printer-off-outline" size={56} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.centerText}>{t("printers.unavailable")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stateTone =
    connection === "connected"
      ? theme.custom.status.positive
      : connection === "connecting"
        ? theme.custom.status.warning
        : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={t("printers.title")} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {printer && savedProfile && (
          <>
            <SectionHeader title={t("printers.current")} />
            <AppCard>
              <View style={styles.cardContent}>
                <View style={styles.currentRow}>
                  <Icon source="printer-pos" size={28} color={theme.colors.primary} />
                  <View style={styles.flex}>
                    <Text variant="titleMedium" style={styles.strong} numberOfLines={1}>
                      {printer.name || printer.address}
                    </Text>
                    <Text variant="bodySmall" style={styles.muted}>
                      {`${savedProfile.brand} ${savedProfile.model} · ${t(`printers.transport.${printer.transport}`)}`}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={stateTone ? { backgroundColor: stateTone.container } : undefined}
                    textStyle={stateTone ? { color: stateTone.onContainer } : undefined}
                  >
                    {t(`printers.state.${connection}`)}
                  </Chip>
                </View>
                <View style={styles.buttonRow}>
                  <Button
                    mode="contained"
                    icon="printer"
                    onPress={() => run("test", printTestPage, t("printers.testSent"))}
                    loading={busy === "test"}
                    disabled={ocupado}
                    style={styles.flexButton}
                  >
                    {t("printers.test")}
                  </Button>
                  {connection === "connected" ? (
                    <Button
                      mode="outlined"
                      icon="link-off"
                      onPress={() => run("disconnect", disconnect)}
                      loading={busy === "disconnect"}
                      disabled={ocupado}
                      style={styles.flexButton}
                    >
                      {t("printers.disconnect")}
                    </Button>
                  ) : (
                    <Button
                      mode="outlined"
                      icon="link"
                      onPress={() => run("connect", connect)}
                      loading={busy === "connect"}
                      disabled={ocupado || connection === "connecting"}
                      style={styles.flexButton}
                    >
                      {t("printers.connect")}
                    </Button>
                  )}
                </View>
                <Button
                  mode="text"
                  icon="delete-outline"
                  onPress={() => run("forget", forgetPrinter)}
                  disabled={ocupado}
                  textColor={theme.colors.error}
                >
                  {t("printers.forget")}
                </Button>
              </View>
            </AppCard>
          </>
        )}

        <SectionHeader title={t("printers.model")} />
        <AppCard>
          <RadioButton.Group onValueChange={setProfileId} value={profile.id}>
            {PRINTER_PROFILES.map((p) => (
              <RadioButton.Item
                key={p.id}
                value={p.id}
                label={`${p.brand} ${p.model}`}
                labelStyle={styles.strong}
                style={styles.radio}
                disabled={ocupado}
              />
            ))}
          </RadioButton.Group>
          <Text variant="bodySmall" style={[styles.muted, styles.paperNote]}>
            {t("printers.paper", { width: profile.paperWidthMm, columns: profile.columns })}
          </Text>
        </AppCard>

        <SectionHeader title={t("printers.connectionType")} />
        <SegmentedButtons
          value={transport}
          onValueChange={changeTransport}
          buttons={transports.map((kind) => ({
            value: kind,
            label: t(`printers.transport.${kind}`),
            disabled: ocupado,
          }))}
        />

        <SectionHeader
          title={transport === "bt-classic" ? t("printers.bonded") : t("printers.device")}
          trailing={
            transport === "ble" ? (
              scanning ? (
                <Button compact mode="text" onPress={stopScan}>
                  {t("printers.stopScan")}
                </Button>
              ) : null
            ) : transport === "bt-classic" ? (
              <Button compact mode="text" icon="refresh" onPress={loadBonded} disabled={loadingBonded}>
                {t("printers.refresh")}
              </Button>
            ) : null
          }
        />

        {transport === "tcp" ? (
          <TextInput
            mode="outlined"
            label={t("printers.tcpAddress")}
            placeholder={`192.168.1.50:${DEFAULT_TCP_PORT}`}
            value={tcpInput}
            onChangeText={setTcpInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
        ) : (
          <AppCard>
            <View style={styles.cardContent}>
              {transport === "ble" && (
                <>
                  <Button
                    mode="contained-tonal"
                    icon={scanning ? undefined : "bluetooth-connect"}
                    onPress={startScan}
                    loading={scanning}
                    disabled={scanning || ocupado}
                  >
                    {scanning ? t("printers.scanning") : t("printers.scan")}
                  </Button>
                  <View style={styles.switchRow}>
                    <Text variant="bodySmall" style={styles.muted}>
                      {t("printers.showUnnamed")}
                    </Text>
                    <Switch value={showUnnamed} onValueChange={setShowUnnamed} />
                  </View>
                </>
              )}
              {transport === "bt-classic" && (
                <Text variant="bodySmall" style={styles.muted}>
                  {t("printers.bondedHint")}
                </Text>
              )}
              {loadingBonded && transport === "bt-classic" && <ActivityIndicator />}

              {visibleDevices.map((device) => {
                const isSelected = selected?.address === device.address && selected.kind === device.kind;
                return (
                  <TouchableRipple
                    key={`${device.kind}-${device.address}`}
                    onPress={() => setSelected(device)}
                    disabled={ocupado}
                    style={[styles.deviceRow, isSelected && { backgroundColor: theme.colors.secondaryContainer }]}
                  >
                    <View style={styles.deviceInner}>
                      <Icon
                        source={isSelected ? "radiobox-marked" : "radiobox-blank"}
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                      <View style={styles.flex}>
                        <Text variant="bodyMedium" style={styles.strong} numberOfLines={1}>
                          {device.name || t("printers.unnamed")}
                        </Text>
                        <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                          {device.address}
                          {device.rssi != null ? ` · ${device.rssi} dBm` : ""}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                );
              })}

              {transport === "ble" && !scanning && scanned && visibleDevices.length === 0 && (
                <Text variant="bodySmall" style={styles.muted}>
                  {t("printers.noDevices")}
                </Text>
              )}
              {transport === "bt-classic" && !loadingBonded && bonded.length === 0 && (
                <Text variant="bodySmall" style={styles.muted}>
                  {t("printers.noBonded")}
                </Text>
              )}
            </View>
          </AppCard>
        )}

        {!!ok && (
          <View style={[styles.banner, { backgroundColor: theme.custom.status.positive.container }]}>
            <Text variant="bodySmall" style={{ color: theme.custom.status.positive.onContainer }}>
              {ok}
            </Text>
          </View>
        )}
        {!!error && (
          <View style={[styles.banner, { backgroundColor: theme.custom.status.negative.container }]}>
            <Text variant="bodySmall" style={{ color: theme.custom.status.negative.onContainer }}>
              {error}
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          icon="content-save-outline"
          onPress={handleSave}
          loading={busy === "save"}
          disabled={ocupado}
          contentStyle={styles.bigButton}
          style={styles.saveButton}
        >
          {t("printers.save")}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    appbar: { backgroundColor: theme.colors.surface },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
    centerText: { color: theme.colors.onSurfaceVariant, textAlign: "center" },
    content: { padding: 16, gap: 12 },
    cardContent: { padding: 16, gap: 12 },
    currentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    flex: { flex: 1 },
    strong: { color: theme.colors.onSurface, fontWeight: "600" },
    muted: { color: theme.colors.onSurfaceVariant },
    buttonRow: { flexDirection: "row", gap: 8 },
    flexButton: { flex: 1, borderRadius: theme.custom.radius.container },
    radio: { paddingVertical: 4 },
    paperNote: { paddingHorizontal: 16, paddingBottom: 12 },
    input: { backgroundColor: theme.colors.surface },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    deviceRow: { borderRadius: theme.custom.radius.control },
    deviceInner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 8 },
    banner: { borderRadius: theme.custom.radius.control, padding: 12 },
    saveButton: { borderRadius: theme.custom.radius.container, marginTop: 4 },
    bigButton: { height: 52 },
  });

export default PrintersScreen;
