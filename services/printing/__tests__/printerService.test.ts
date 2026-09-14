import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNative = {
  isSupported: jest.fn(() => true),
  isConnected: jest.fn(() => true),
  requestPermissions: jest.fn(async () => ({ granted: true })),
  connect: jest.fn(async () => undefined),
  write: jest.fn(async () => undefined),
};

// A getter: jest hoists this factory above `mockNative`'s initialization.
jest.mock("../../../modules/thermal-printer", () => ({
  get ThermalPrinter() {
    return mockNative;
  },
}));
jest.mock("../../documentService", () => ({ getDocumentTicket: jest.fn() }));

import { writeBytes } from "../printerService";
import type { SelectedPrinter } from "../transports/types";

const printer: SelectedPrinter = {
  profileId: "generic-escpos-58",
  transport: "tcp",
  address: "192.168.1.50:9100",
  name: null,
};

const nativeError = (code: string) => Object.assign(new Error(code), { code });

describe("writeBytes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNative.isConnected.mockReturnValue(true);
  });

  it("reconnects and resends once when the link was already gone", async () => {
    mockNative.write.mockRejectedValueOnce(nativeError("E_NOT_CONNECTED"));

    await writeBytes(printer, new Uint8Array([1, 2, 3]));

    expect(mockNative.connect).toHaveBeenCalledTimes(1);
    expect(mockNative.write).toHaveBeenCalledTimes(2);
  });

  it("does not resend after E_WRITE, which may have printed part of the ticket", async () => {
    mockNative.write.mockRejectedValueOnce(nativeError("E_WRITE"));

    await expect(writeBytes(printer, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ code: "E_WRITE" });

    expect(mockNative.connect).not.toHaveBeenCalled();
    expect(mockNative.write).toHaveBeenCalledTimes(1);
  });
});
