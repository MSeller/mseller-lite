const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

const BLUETOOTH_USAGE =
  "MSeller Lite usa Bluetooth para conectarse a tu impresora térmica e imprimir tickets.";

/**
 * Permissions for the thermal-printer module.
 *
 * Android: BLUETOOTH_SCAN is flagged neverForLocation — the app looks for printers, not the
 * user's position — which is what spares Android 12+ users a location prompt. The legacy
 * BLUETOOTH/BLUETOOTH_ADMIN permissions only apply up to Android 11 (API 30). A BLE scan on
 * Android 11 and older also needs ACCESS_FINE_LOCATION; it is NOT bounded to API 30 here,
 * because expo-location needs it on every version for delivery check-ins, and a
 * maxSdkVersion on the app manifest would override that library's unbounded declaration.
 *
 * iOS: NSBluetoothAlwaysUsageDescription is required before CoreBluetooth may be touched;
 * without it the app is killed on first use.
 */
const withThermalPrinter = (config, { bluetoothPermission = BLUETOOTH_USAGE } = {}) => {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";

    const permissions = [
      { name: "android.permission.BLUETOOTH_SCAN", attrs: { "android:usesPermissionFlags": "neverForLocation", "tools:targetApi": "s" } },
      { name: "android.permission.BLUETOOTH_CONNECT" },
      { name: "android.permission.BLUETOOTH", attrs: { "android:maxSdkVersion": "30" } },
      { name: "android.permission.BLUETOOTH_ADMIN", attrs: { "android:maxSdkVersion": "30" } },
      { name: "android.permission.ACCESS_FINE_LOCATION" },
    ];

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    for (const { name, attrs = {} } of permissions) {
      const list = manifest["uses-permission"];
      const existing = list.find((entry) => entry.$["android:name"] === name);
      if (existing) {
        Object.assign(existing.$, attrs);
      } else {
        list.push({ $: { "android:name": name, ...attrs } });
      }
    }

    // BLE is used when present but must not hide the app from phones without it.
    manifest["uses-feature"] = manifest["uses-feature"] || [];
    if (!manifest["uses-feature"].some((f) => f.$["android:name"] === "android.hardware.bluetooth_le")) {
      manifest["uses-feature"].push({
        $: { "android:name": "android.hardware.bluetooth_le", "android:required": "false" },
      });
    }
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSBluetoothAlwaysUsageDescription =
      mod.modResults.NSBluetoothAlwaysUsageDescription || bluetoothPermission;
    return mod;
  });

  return config;
};

module.exports = withThermalPrinter;
