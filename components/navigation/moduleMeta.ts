import { useNavigationAccess, type TabName } from "../../hooks/useNavigationAccess";
import { useTranslation } from "../../hooks/useTranslation";
import type { IconSymbolName } from "../ui/IconSymbol";

export interface ModuleMeta {
  /** Tab label / header title. A grouped module with one section takes that section's name. */
  title: string;
  /** One line under the title on a Más row: the sections inside, or what the module is for. */
  description: string;
  /** SF Symbol for the tab bar. */
  icon: IconSymbolName;
}

/**
 * How each module presents itself to the current user. Rutas with only Entregas allowed
 * is titled "Entregas", not "Rutas": the group is an implementation detail when there is
 * nothing to switch between.
 */
export function useModuleMeta(): Record<TabName, ModuleMeta> {
  const { t } = useTranslation();
  const { can } = useNavigationAccess();

  const routeSections = [
    can("picking") && t("navigation.sections.picking"),
    can("deliveries") && t("navigation.sections.deliveries"),
  ].filter(Boolean) as string[];
  const stockSections = [
    can("stockCount") && t("navigation.sections.stockCount"),
    can("products") && t("navigation.sections.products"),
  ].filter(Boolean) as string[];

  return {
    documents: {
      title: t("navigation.documents"),
      description: t("navigation.documentsDescription"),
      icon: "doc.text.fill",
    },
    loading: {
      title: t("navigation.loading"),
      description: t("navigation.loadingDescription"),
      icon: "shippingbox.and.arrow.backward.fill",
    },
    // With a single section the title already names it, so the row needs no subtitle.
    routes: {
      title: routeSections.length === 1 ? routeSections[0] : t("navigation.routes"),
      description: routeSections.length > 1 ? routeSections.join(" · ") : "",
      icon: can("picking") ? "map.fill" : "truck.box.fill",
    },
    stock: {
      title: stockSections.length === 1 ? stockSections[0] : t("navigation.stock"),
      description: stockSections.length > 1 ? stockSections.join(" · ") : "",
      icon: can("stockCount") ? "archivebox.fill" : "barcode",
    },
    catalog: {
      title: t("navigation.catalog"),
      description: t("navigation.catalogDescription"),
      icon: "books.vertical.fill",
    },
    marketplace: {
      title: t("navigation.marketplace"),
      description: t("navigation.marketplaceDescription"),
      icon: "storefront.fill",
    },
  };
}
