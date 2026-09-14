import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "react-native-paper";

import { useTranslation } from "../../hooks/useTranslation";
import { updateCustomer } from "../../services/customerService";
import { listPaymentConditions, type PaymentCondition } from "../../services/paymentConditionService";
import type { ClienteEditable } from "../../types/catalog";
import {
  buildCustomerUpdate,
  customerToForm,
  validateCustomerForm,
  type CustomerForm,
} from "../../utils/catalogValidation";
import OptionPickerModal, { type PickerOption } from "../onboarding/OptionPickerModal";
import SelectField from "../ui/SelectField";
import CatalogEditScaffold from "./CatalogEditScaffold";
import { CardField, FieldGroup, FieldRow, NumberField, StatusField } from "./CatalogFields";
import { useCatalogForm } from "./useCatalogForm";

interface Props {
  cliente: ClienteEditable;
  onClose: () => void;
  onSaved: (cliente: ClienteEditable) => void;
}

/** Edits a customer's master record. The code and balance are not editable. */
const CustomerEditForm: React.FC<Props> = ({ cliente, onClose, onSaved }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const initial = useMemo(() => customerToForm(cliente), [cliente]);
  const save = useCallback(
    (form: CustomerForm) => updateCustomer(cliente.codigo, buildCustomerUpdate(form)),
    [cliente.codigo]
  );

  const { form, setField, errorText, dirty, saving, error, submit } = useCatalogForm({
    initial,
    validate: validateCustomerForm,
    save,
    onSaved,
    conflictMessage: t("catalog.customers.conflict"),
  });

  // The condition is a code from the tenant's catalogue, so it is picked rather than
  // typed. When the catalogue cannot be read (or is empty) the field falls back to
  // free text rather than blocking the edit of everything else.
  const [conditions, setConditions] = useState<PaymentCondition[] | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  useEffect(() => {
    let active = true;
    listPaymentConditions()
      .then((list) => active && setConditions(list))
      .catch(() => active && setConditions([]));
    return () => {
      active = false;
    };
  }, []);

  const conditionOptions = useMemo<PickerOption[]>(
    () => [
      { value: "", label: t("catalog.customers.conditionPicker.none") },
      ...(conditions ?? []).map((c) => ({
        value: c.condicionPago,
        label: `${c.condicionPago} · ${c.descripcion}`,
      })),
    ],
    [conditions, t]
  );
  const pickCondition = !!conditions && conditions.length > 0;
  const conditionLabel = conditionOptions.find((o) => o.value === form.condicion)?.label ?? form.condicion;

  const f = (key: string) => t(`catalog.customers.fields.${key}`);

  return (
    <CatalogEditScaffold
      title={t("catalog.customers.editTitle")}
      dirty={dirty}
      saving={saving}
      onSave={submit}
      onClose={onClose}
      error={error}
    >
      <FieldGroup title={t("catalog.customers.sections.general")}>
        <CardField label={f("codigo")} value={cliente.codigo} disabled />
        <CardField
          label={`${f("nombre")} *`}
          value={form.nombre}
          onChangeText={(v) => setField("nombre", v)}
          errorText={errorText("nombre")}
          autoCapitalize="words"
        />
        <CardField
          label={f("rnc")}
          value={form.rnc}
          onChangeText={(v) => setField("rnc", v)}
          autoCorrect={false}
        />
        <StatusField value={form.status} onChange={(v) => setField("status", v)} />
      </FieldGroup>

      <FieldGroup title={t("catalog.customers.sections.contact")}>
        <CardField
          label={f("contacto")}
          value={form.contacto}
          onChangeText={(v) => setField("contacto", v)}
          autoCapitalize="words"
        />
        <CardField
          label={f("telefono1")}
          value={form.telefono1}
          onChangeText={(v) => setField("telefono1", v)}
          keyboardType="phone-pad"
          inputMode="tel"
        />
        <CardField
          label={f("email")}
          value={form.email}
          onChangeText={(v) => setField("email", v)}
          errorText={errorText("email")}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
        />
      </FieldGroup>

      <FieldGroup title={t("catalog.customers.sections.address")}>
        <CardField label={f("direccion")} value={form.direccion} onChangeText={(v) => setField("direccion", v)} />
        <CardField
          label={f("referenciaDireccion")}
          value={form.referenciaDireccion}
          onChangeText={(v) => setField("referenciaDireccion", v)}
        />
        <CardField
          label={f("ciudad")}
          value={form.ciudad}
          onChangeText={(v) => setField("ciudad", v)}
          autoCapitalize="words"
        />
      </FieldGroup>

      <FieldGroup title={t("catalog.customers.sections.credit")}>
        {pickCondition ? (
          <SelectField
            label={f("condicion")}
            value={conditionLabel}
            onPress={() => setPickerVisible(true)}
            disabled={saving}
            inputStyle={{ backgroundColor: theme.colors.surface }}
          />
        ) : (
          <CardField
            label={f("condicion")}
            value={form.condicion}
            onChangeText={(v) => setField("condicion", v)}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        )}
        <CardField
          label={f("codigoVendedor")}
          value={form.codigoVendedor}
          onChangeText={(v) => setField("codigoVendedor", v)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <FieldRow>
          <NumberField
            label={f("limiteCredito")}
            value={form.limiteCredito}
            onChangeText={(v) => setField("limiteCredito", v)}
            errorText={errorText("limiteCredito")}
          />
          <NumberField
            label={f("limiteFacturas")}
            value={form.limiteFacturas}
            onChangeText={(v) => setField("limiteFacturas", v)}
            errorText={errorText("limiteFacturas")}
          />
        </FieldRow>
        <NumberField
          label={f("descuento")}
          value={form.descuento}
          onChangeText={(v) => setField("descuento", v)}
          errorText={errorText("descuento")}
        />
      </FieldGroup>

      <FieldGroup title={t("catalog.customers.sections.notes")}>
        <CardField label={f("notas")} value={form.notas} onChangeText={(v) => setField("notas", v)} multiline />
      </FieldGroup>

      <OptionPickerModal
        visible={pickerVisible}
        title={t("catalog.customers.conditionPicker.title")}
        options={conditionOptions}
        selected={form.condicion}
        searchPlaceholder={conditionOptions.length > 8 ? t("catalog.customers.conditionPicker.search") : undefined}
        onDismiss={() => setPickerVisible(false)}
        onSelect={(value) => setField("condicion", value)}
      />
    </CatalogEditScaffold>
  );
};

export default CustomerEditForm;
