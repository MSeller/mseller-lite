import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useUser } from "../contexts/UserContext";
import { documentService } from "../services/documentService";
import { entregaService } from "../services/entregaService";
import { inventoryService, offlineManager } from "../services/inventoryService";
import { preparacionService } from "../services/preparacionService";
import type { DocumentSummary } from "../types/documents";
import { useNavigationAccess } from "./useNavigationAccess";

/** One card's data: each loads and fails on its own, so one bad module never blanks the page. */
export interface CardState<T> {
  loading: boolean;
  failed: boolean;
  data: T | null;
}

export interface PickingSummary {
  toPrepare: number;
  readyToDispatch: number;
}

export interface DeliverySummary {
  activeRoutes: number;
  pendingStops: number;
}

export interface StockCountSummary {
  activeCounts: number;
  /** Counted offline on this device, not yet sent. Null when the user has no warehouse. */
  unsynced: number;
}

export interface DocumentsSummary {
  today: number;
  recent: DocumentSummary[];
}

export interface HomeSummary {
  picking: CardState<PickingSummary>;
  deliveries: CardState<DeliverySummary>;
  stockCount: CardState<StockCountSummary>;
  documents: CardState<DocumentsSummary>;
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Reload a single card, e.g. from its retry button. */
  retry: (card: CardKey) => void;
}

const idle = <T,>(): CardState<T> => ({ loading: false, failed: false, data: null });

/** Coming back to Home refreshes the counts, but not more often than this. */
const FOCUS_REFRESH_AFTER_MS = 30_000;

type CardKey = "picking" | "deliveries" | "stockCount" | "documents";

/** `yyyy-MM-dd` in the device's local day, the format the documents API filters on. */
const localDay = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * The live numbers behind the home screen, fetched only for the modules this user
 * is offered. Requests run in parallel and settle independently; a response that
 * arrives after a newer request for the same card is dropped.
 */
export const useHomeSummary = (): HomeSummary => {
  const { userProfile } = useUser();
  const { can, loading: accessLoading } = useNavigationAccess();

  const [picking, setPicking] = useState<CardState<PickingSummary>>(idle);
  const [deliveries, setDeliveries] = useState<CardState<DeliverySummary>>(idle);
  const [stockCount, setStockCount] = useState<CardState<StockCountSummary>>(idle);
  const [documents, setDocuments] = useState<CardState<DocumentsSummary>>(idle);
  const [refreshing, setRefreshing] = useState(false);

  const warehouse = userProfile?.warehouse;
  const requestIds = useRef<Record<CardKey, number>>({ picking: 0, deliveries: 0, stockCount: 0, documents: 0 });
  const lastLoadedAt = useRef(0);

  const track = useCallback(
    async <T,>(
      card: CardKey,
      enabled: boolean,
      setState: React.Dispatch<React.SetStateAction<CardState<T>>>,
      load: () => Promise<T>,
    ) => {
      const requestId = ++requestIds.current[card];
      const isLatest = () => requestIds.current[card] === requestId;
      if (!enabled) {
        setState(idle<T>());
        return;
      }
      setState((prev) => ({ ...prev, loading: true, failed: false }));
      try {
        const data = await load();
        if (isLatest()) setState({ loading: false, failed: false, data });
      } catch (error) {
        console.warn(`Home summary card "${card}" failed to load:`, error);
        if (isLatest()) setState((prev) => ({ ...prev, loading: false, failed: true }));
      }
    },
    [],
  );

  const loaders = {
    picking: () =>
      track("picking", can("picking"), setPicking, async () => {
        const rutas = await preparacionService.getRutasPreparacion();
        return {
          toPrepare: rutas.filter((r) => r.status === "confirmada" || r.status === "en_preparacion").length,
          readyToDispatch: rutas.filter((r) => r.status === "lista_despacho").length,
        };
      }),
    deliveries: () =>
      track("deliveries", can("deliveries"), setDeliveries, async () => {
        const { items } = await entregaService.getRutas();
        const open = items.filter((r) => r.status !== "completada" && r.status !== "cancelada");
        return {
          activeRoutes: open.filter((r) => r.esActiva).length,
          pendingStops: open.reduce((sum, r) => sum + (r.facturasPendientes ?? 0), 0),
        };
      }),
    stockCount: () =>
      track("stockCount", can("stockCount"), setStockCount, async () => {
        const [counts, unsynced] = await Promise.all([
          warehouse
            ? inventoryService.getConteosActivos(inventoryService.getWarehouseId(warehouse))
            : Promise.resolve([]),
          offlineManager.getPendingOperationsCount(),
        ]);
        return { activeCounts: counts.length, unsynced };
      }),
    documents: () =>
      track("documents", can("documents"), setDocuments, async () => {
        const today = localDay();
        const [todayPage, recentPage] = await Promise.all([
          documentService.list({ dates: `${today}|${today}`, pageSize: 1 }),
          documentService.list({ pageSize: 3 }),
        ]);
        return { today: todayPage.totalCount, recent: recentPage.items };
      }),
  };

  const refresh = async () => {
    lastLoadedAt.current = Date.now();
    setRefreshing(true);
    await Promise.all(Object.values(loaders).map((load) => load()));
    setRefreshing(false);
  };

  // Home stays mounted behind the other tabs, so counts would otherwise be as old as
  // the first visit. Refresh on return, throttled so tab hopping is not a request storm.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useFocusEffect(
    useCallback(() => {
      if (accessLoading || lastLoadedAt.current === 0) return;
      if (Date.now() - lastLoadedAt.current < FOCUS_REFRESH_AFTER_MS) return;
      refreshRef.current();
    }, [accessLoading]),
  );

  useEffect(() => {
    if (accessLoading) return;
    refresh();
    // Reload when who the user is changes; `refresh` itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, userProfile?.type, warehouse]);

  return {
    picking,
    deliveries,
    stockCount,
    documents,
    refreshing,
    refresh,
    retry: (card) => {
      loaders[card]();
    },
  };
};
