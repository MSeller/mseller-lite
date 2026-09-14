import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { getEditableProduct } from "../../services/ProductService";
import type { ProductoEditable } from "../../types/catalog";
import { PRICE_FIELDS } from "../../utils/catalogValidation";
import { formatMoney, formatQuantity } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import CatalogBadge from "./CatalogBadge";
import CatalogDetailView, { DetailSection } from "./CatalogDetailView";
import ProductEditForm from "./ProductEditForm";
import { useCatalogRecord } from "./useCatalogRecord";

interface Props {
  codigo: string;
  /** Shown in the app bar while the record loads. */
  nombre: string;
  onBack: () => void;
  /** A save succeeded: the list updates its row from this. */
  onUpdated: (producto: ProductoEditable) => void;
}

/** One product, read from `/editable`, with Editar leading to the edit form. */
const ProductDetail: React.FC<Props> = ({ codigo, nombre, onBack, onUpdated }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { record, setRecord, loading, failure, reload } = useCatalogRecord(codigo, getEditableProduct);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSaved = useCallback(
    (updated: ProductoEditable) => {
      setRecord(updated);
      setEditing(false);
      setNotice(t("catalog.saved"));
      onUpdated(updated);
    },
    [setRecord, onUpdated, t]
  );

  if (editing && record) {
    return <ProductEditForm producto={record} onClose={() => setEditing(false)} onSaved={handleSaved} />;
  }

  const f = (key: string) => t(`catalog.products.fields.${key}`);
  const yesNo = (value: boolean) => (value ? t("catalog.yes") : t("catalog.no"));

  return (
    <CatalogDetailView
      title={record?.nombre || nombre || codigo}
      loading={loading}
      failure={failure}
      ready={!!record}
      onBack={onBack}
      onEdit={() => setEditing(true)}
      onRetry={reload}
      notice={notice}
      onNoticeDismiss={() => setNotice("")}
    >
      {record && (
        <>
          <AppCard style={styles.summary}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryText}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
                  {record.nombre}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {record.codigo}
                  {record.codigoBarra ? ` · ${record.codigoBarra}` : ""}
                </Text>
                <View style={styles.badges}>
                  <CatalogBadge
                    label={record.status === "I" ? t("catalog.inactive") : t("catalog.active")}
                    tone={record.status === "I" ? "negative" : "positive"}
                  />
                  {record.esServicio && <CatalogBadge label={t("catalog.products.service")} />}
                  {record.promocion && (
                    <CatalogBadge label={t("catalog.products.promotion")} tone="warning" />
                  )}
                </View>
              </View>
              <Text variant="titleMedium" style={[styles.price, { color: theme.colors.onSurface }]}>
                {formatMoney(record.precio1)}
              </Text>
            </View>
          </AppCard>

          <DetailSection
            title={t("catalog.products.sections.general")}
            rows={[{ label: f("descripcion"), value: record.descripcion }]}
          />
          <DetailSection
            title={t("catalog.products.sections.classification")}
            rows={[
              { label: f("area"), value: record.area },
              { label: f("departamento"), value: record.departamento },
              { label: f("unidad"), value: record.unidad },
              { label: f("empaque"), value: record.empaque },
              { label: f("factor"), value: formatQuantity(record.factor) },
            ]}
          />
          <DetailSection
            title={t("catalog.products.sections.pricing")}
            rows={PRICE_FIELDS.map((field, index) => ({
              label: t("catalog.products.fields.precio", { n: index + 1 }),
              value: formatMoney(record[field]),
            }))}
          />
          <DetailSection
            title={t("catalog.products.sections.costs")}
            rows={[
              { label: f("costo"), value: formatMoney(record.costo) },
              { label: f("impuesto"), value: `${formatQuantity(record.impuesto)}%` },
              { label: f("descuento"), value: `${formatQuantity(record.descuento)}%` },
              { label: f("tipoImpuesto"), value: record.tipoImpuesto },
            ]}
          />
          <DetailSection
            title={t("catalog.products.sections.options")}
            rows={[
              { label: f("visibleTienda"), value: yesNo(record.visibleTienda) },
              { label: f("promocion"), value: yesNo(record.promocion) },
              { label: f("esServicio"), value: yesNo(record.esServicio) },
            ]}
          />
        </>
      )}
    </CatalogDetailView>
  );
};

const styles = StyleSheet.create({
  summary: {
    marginBottom: 12,
  },
  summaryContent: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  price: {
    fontWeight: "700",
  },
});

export default ProductDetail;
