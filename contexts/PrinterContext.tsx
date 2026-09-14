import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { ThermalPrinter } from "../modules/thermal-printer";
import {
  connect as connectPrinter,
  disconnect as disconnectPrinter,
  isConnected,
  isPrintingAvailable,
  printDocumentTicket,
  printMarkup,
  printTest,
  PrinterError,
} from "../services/printing/printerService";
import { getPrinterProfile, type PrinterProfile } from "../services/printing/profiles";
import type { ConnectionState, SelectedPrinter } from "../services/printing/transports/types";

const STORAGE_KEY = "mseller.printer.selected.v1";

interface PrinterContextValue {
  /** False on web, Expo Go and builds without the native module: hide printing entirely. */
  available: boolean;
  /** The saved printer has been read from storage. */
  loaded: boolean;
  printer: SelectedPrinter | null;
  profile: PrinterProfile | null;
  connection: ConnectionState;
  /** A job is being sent. */
  printing: boolean;
  savePrinter: (printer: SelectedPrinter) => Promise<void>;
  forgetPrinter: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printTicket: (noPedidoStr: string) => Promise<void>;
  printText: (texto: string, codePage?: number | null) => Promise<void>;
  printTestPage: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | undefined>(undefined);

const isSelectedPrinter = (value: any): value is SelectedPrinter =>
  !!value &&
  typeof value.profileId === "string" &&
  typeof value.address === "string" &&
  ["ble", "bt-classic", "tcp"].includes(value.transport);

/**
 * The printer saved on this device and the live link to it.
 *
 * The choice is a device setting, not an account one — the printer is the one in the seller's
 * van — so it lives in AsyncStorage. Jobs run one at a time: two writes interleaved on one
 * Bluetooth link print garbage.
 */
export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const available = isPrintingAvailable();
  const [loaded, setLoaded] = useState(false);
  const [printer, setPrinter] = useState<SelectedPrinter | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const [printing, setPrinting] = useState(false);

  const printerRef = useRef<SelectedPrinter | null>(null);
  printerRef.current = printer;
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (isSelectedPrinter(parsed) && getPrinterProfile(parsed.profileId)) setPrinter(parsed);
      })
      .catch(() => {
        // A corrupt or unreadable entry just means "no printer saved".
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!available || !ThermalPrinter) return;
    setConnection(isConnected() ? "connected" : "disconnected");
    const subscription = ThermalPrinter.addListener("onConnectionChange", ({ connected }) => {
      setConnection(connected ? "connected" : "disconnected");
    });
    return () => subscription.remove();
  }, [available]);

  /** Runs jobs strictly one after another, whatever order callers fire them in. */
  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(job, job);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const requirePrinter = (): SelectedPrinter => {
    const current = printerRef.current;
    if (!current) throw new PrinterError("NO_PRINTER");
    return current;
  };

  const savePrinter = useCallback(
    async (next: SelectedPrinter) => {
      const previous = printerRef.current;
      const changedLink =
        !previous || previous.address !== next.address || previous.transport !== next.transport;
      if (changedLink) {
        await enqueue(disconnectPrinter);
        setConnection("disconnected");
      }
      printerRef.current = next;
      setPrinter(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [enqueue]
  );

  const forgetPrinter = useCallback(async () => {
    await enqueue(disconnectPrinter);
    setConnection("disconnected");
    printerRef.current = null;
    setPrinter(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, [enqueue]);

  const connect = useCallback(
    () =>
      enqueue(async () => {
        const current = requirePrinter();
        setConnection("connecting");
        try {
          await connectPrinter(current);
          setConnection("connected");
        } catch (e) {
          setConnection(isConnected() ? "connected" : "disconnected");
          throw e;
        }
      }),
    [enqueue]
  );

  const disconnect = useCallback(
    () =>
      enqueue(async () => {
        await disconnectPrinter();
        setConnection("disconnected");
      }),
    [enqueue]
  );

  const runJob = useCallback(
    (job: (current: SelectedPrinter) => Promise<void>) =>
      enqueue(async () => {
        const current = requirePrinter();
        setPrinting(true);
        if (!isConnected()) setConnection("connecting");
        try {
          await job(current);
        } finally {
          setPrinting(false);
          setConnection(isConnected() ? "connected" : "disconnected");
        }
      }),
    [enqueue]
  );

  const printTicket = useCallback(
    (noPedidoStr: string) => runJob((current) => printDocumentTicket(current, noPedidoStr)),
    [runJob]
  );

  const printText = useCallback(
    (texto: string, codePage?: number | null) => runJob((current) => printMarkup(current, texto, codePage)),
    [runJob]
  );

  const printTestPage = useCallback(() => runJob(printTest), [runJob]);

  const value = useMemo<PrinterContextValue>(
    () => ({
      available,
      loaded,
      printer,
      profile: printer ? getPrinterProfile(printer.profileId) ?? null : null,
      connection,
      printing,
      savePrinter,
      forgetPrinter,
      connect,
      disconnect,
      printTicket,
      printText,
      printTestPage,
    }),
    [available, loaded, printer, connection, printing, savePrinter, forgetPrinter, connect, disconnect, printTicket, printText, printTestPage]
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
};

export const usePrinter = (): PrinterContextValue => {
  const context = useContext(PrinterContext);
  if (!context) throw new Error("usePrinter must be used within a PrinterProvider");
  return context;
};
