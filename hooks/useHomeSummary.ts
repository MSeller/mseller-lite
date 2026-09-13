import { useCallback, useEffect, useState } from "react";

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
  retry: (card: keyof Omit<HomeSummary, "refreshing" | "refresh" | "retry">) => void;
}

const idle = <T,>(): CardState<T> => ({ loading: false, failed: false, data: null });

/** `yyyy-MM-dd` in the device's local day, the format the documents API filters on. */
const localDay = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * The live numbers behind the home screen, fetched only for the modules this user
 * is offered. Requests run in parallel and settle independently.
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

  const track = useCallback(
    async <T,>(
      enabled: boolean,
      setState: React.Dispatch<React.SetStateAction<CardState<T>>>,
      load: () => Promise<T>,
    ) => {
      if (!enabled) {
        setState(idle<T>());
        return;
      }
      setState((prev) => ({ ...prev, loading: true, failed: false }));
      try {
        const data = await load();
        setState({ loading: false, failed: false, data });
      } catch (error) {
        console.warn("Home summary card failed to load:", error);
        setState((prev) => ({ ...prev, loading: false, failed: true }));
      }
    },
    [],
  );

  const loaders = {
    picking: () =>
      track(can("picking"), setPicking, async () => {
        const rutas = await preparacionService.getRutasPreparacion();
        return {
          toPrepare: rutas.filter((r) => r.status === "confirmada" || r.status === "en_preparacion").length,
          readyToDispatch: rutas.filter((r) => r.status === "lista_despacho").length,
        };
      }),
    deliveries: () =>
      track(can("deliveries"), setDeliveries, async () => {
        const { items } = await entregaService.getRutas();
        const open = items.filter((r) => r.status !== "completada" && r.status !== "cancelada");
        return {
          activeRoutes: open.filter((r) => r.esActiva).length,
          pendingStops: open.reduce((sum, r) => sum + (r.facturasPendientes ?? 0), 0),
        };
      }),
    stockCount: () =>
      track(can("stockCount"), setStockCount, async () => {
        const [counts, unsynced] = await Promise.all([
          warehouse
            ? inventoryService.getConteosActivos(inventoryService.getWarehouseId(warehouse))
            : Promise.resolve([]),
          offlineManager.getPendingOperationsCount(),
        ]);
        return { activeCounts: counts.length, unsynced };
      }),
    documents: () =>
      track(can("documents"), setDocuments, async () => {
        const today = localDay();
        const [todayPage, recentPage] = await Promise.all([
          documentService.list({ dates: `${today}|${today}`, pageSize: 1 }),
          documentService.list({ pageSize: 3 }),
        ]);
        return { today: todayPage.totalCount, recent: recentPage.items };
      }),
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all(Object.values(loaders).map((load) => load()));
    setRefreshing(false);
  };

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
