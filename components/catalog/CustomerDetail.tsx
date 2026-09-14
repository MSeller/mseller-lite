import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { getEditableCustomer } from "../../services/customerService";
import type { ClienteEditable } from "../../types/catalog";
import { formatMoney, formatQuantity } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import StatusChip from "../ui/StatusChip";
import CatalogDetailView, { DetailSection } from "./CatalogDetailView";
import CustomerEditForm from "./CustomerEditForm";
import { useCatalogRecord } from "./useCatalogRecord";

interface Props {
  codigo: string;
  /** Shown in the app bar while the record loads. */
  nombre: string;
  onBack: () => void;
  /** A save succeeded: the list updates its row from this. */
  onUpdated: (cliente: ClienteEditable) => void;
}

/** One customer, read from `/editable`, with Editar leading to the edit form. */
const CustomerDetail: React.FC<Props> = ({ codigo, nombre, onBack, onUpdated }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { record, setRecord, loading, failure, reload } = useCatalogRecord(codigo, getEditableCustomer);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSaved = useCallback(
    (updated: ClienteEditable) => {
      setRecord(updated);
      setEditing(false);
      setNotice(t("catalog.saved"));
      onUpdated(updated);
    },
    [setRecord, onUpdated, t]
  );

  if (editing && record) {
    return <CustomerEditForm cliente={record} onClose={() => setEditing(false)} onSaved={handleSaved} />;
  }

  const f = (key: string) => t(`catalog.customers.fields.${key}`);

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
                </Text>
                <StatusChip
                  label={record.status === "I" ? t("catalog.inactive") : t("catalog.active")}
                  tone={record.status === "I" ? "negative" : "positive"}
                />
              </View>
              <View style={styles.balance}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {f("balance")}
                </Text>
                <Text variant="titleMedium" style={[styles.balanceValue, { color: theme.colors.onSurface }]}>
                  {formatMoney(record.balance)}
                </Text>
              </View>
            </View>
          </AppCard>

          <DetailSection
            title={t("catalog.customers.sections.contact")}
            rows={[
              { label: f("rnc"), value: record.rnc },
              { label: f("contacto"), value: record.contacto },
              { label: f("telefono1"), value: record.telefono1 },
              { label: f("email"), value: record.email },
            ]}
          />
          <DetailSection
            title={t("catalog.customers.sections.address")}
            rows={[
              { label: f("direccion"), value: record.direccion },
              { label: f("referenciaDireccion"), value: record.referenciaDireccion },
              { label: f("ciudad"), value: record.ciudad },
            ]}
          />
          <DetailSection
            title={t("catalog.customers.sections.credit")}
            rows={[
              { label: f("condicion"), value: record.condicion },
              { label: f("codigoVendedor"), value: record.codigoVendedor },
              { label: f("limiteCredito"), value: formatMoney(record.limiteCredito) },
              { label: f("limiteFacturas"), value: formatQuantity(record.limiteFacturas) },
              { label: f("descuento"), value: `${formatQuantity(record.descuento)}%` },
            ]}
          />
          {!!record.notas && (
            <DetailSection
              title={t("catalog.customers.sections.notes")}
              rows={[{ label: f("notas"), value: record.notas }]}
            />
          )}
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
  balance: {
    alignItems: "flex-end",
    gap: 2,
  },
  balanceValue: {
    fontWeight: "700",
  },
});

export default CustomerDetail;
