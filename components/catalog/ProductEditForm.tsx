import React, { useCallback, useMemo } from "react";

import { useTranslation } from "../../hooks/useTranslation";
import { updateProduct } from "../../services/ProductService";
import type { ProductoEditable } from "../../types/catalog";
import {
  buildProductUpdate,
  PRICE_FIELDS,
  productToForm,
  validateProductForm,
  type ProductForm,
} from "../../utils/catalogValidation";
import CatalogEditScaffold from "./CatalogEditScaffold";
import { FieldGroup, FieldRow, FormField, NumberField, StatusField, SwitchField } from "./CatalogFields";
import { useCatalogForm } from "./useCatalogForm";

interface Props {
  producto: ProductoEditable;
  onClose: () => void;
  onSaved: (producto: ProductoEditable) => void;
}

/** Edits a product's master record. The code is not editable; stock is not part of it. */
const ProductEditForm: React.FC<Props> = ({ producto, onClose, onSaved }) => {
  const { t } = useTranslation();
  const initial = useMemo(() => productToForm(producto), [producto]);
  const save = useCallback(
    (form: ProductForm) => updateProduct(producto.codigo, buildProductUpdate(form)),
    [producto.codigo]
  );

  const { form, setField, errors, dirty, saving, error, submit } = useCatalogForm({
    initial,
    validate: validateProductForm,
    save,
    onSaved,
    conflictMessage: t("catalog.products.conflict"),
  });

  const f = (key: string) => t(`catalog.products.fields.${key}`);

  return (
    <CatalogEditScaffold
      title={t("catalog.products.editTitle")}
      dirty={dirty}
      saving={saving}
      onSave={submit}
      onClose={onClose}
      error={error}
    >
      <FieldGroup title={t("catalog.products.sections.general")}>
        <FormField label={f("codigo")} value={producto.codigo} onChangeText={() => {}} disabled />
        <FormField
          label={`${f("nombre")} *`}
          value={form.nombre}
          onChangeText={(v) => setField("nombre", v)}
          error={errors.nombre}
        />
        <FormField
          label={f("codigoBarra")}
          value={form.codigoBarra}
          onChangeText={(v) => setField("codigoBarra", v)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormField
          label={f("descripcion")}
          value={form.descripcion}
          onChangeText={(v) => setField("descripcion", v)}
          multiline
        />
        <StatusField value={form.status} onChange={(v) => setField("status", v)} disabled={saving} />
      </FieldGroup>

      <FieldGroup title={t("catalog.products.sections.classification")}>
        <FieldRow>
          <FormField label={f("area")} value={form.area} onChangeText={(v) => setField("area", v)} />
          <FormField
            label={f("departamento")}
            value={form.departamento}
            onChangeText={(v) => setField("departamento", v)}
          />
        </FieldRow>
        <FieldRow>
          <FormField
            label={f("unidad")}
            value={form.unidad}
            onChangeText={(v) => setField("unidad", v)}
            autoCapitalize="characters"
          />
          <FormField
            label={f("empaque")}
            value={form.empaque}
            onChangeText={(v) => setField("empaque", v)}
          />
        </FieldRow>
        <NumberField
          label={`${f("factor")} *`}
          value={form.factor}
          onChangeText={(v) => setField("factor", v)}
          error={errors.factor}
        />
      </FieldGroup>

      <FieldGroup title={t("catalog.products.sections.pricing")}>
        {PRICE_FIELDS.map((field, index) => (
          <NumberField
            key={field}
            label={t("catalog.products.fields.precio", { n: index + 1 })}
            value={form[field]}
            onChangeText={(v) => setField(field, v)}
            error={errors[field]}
          />
        ))}
      </FieldGroup>

      <FieldGroup title={t("catalog.products.sections.costs")}>
        <NumberField
          label={f("costo")}
          value={form.costo}
          onChangeText={(v) => setField("costo", v)}
          error={errors.costo}
        />
        <FieldRow>
          <NumberField
            label={f("impuesto")}
            value={form.impuesto}
            onChangeText={(v) => setField("impuesto", v)}
            error={errors.impuesto}
          />
          <NumberField
            label={f("descuento")}
            value={form.descuento}
            onChangeText={(v) => setField("descuento", v)}
            error={errors.descuento}
          />
        </FieldRow>
        <FormField
          label={f("tipoImpuesto")}
          value={form.tipoImpuesto}
          onChangeText={(v) => setField("tipoImpuesto", v)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </FieldGroup>

      <FieldGroup title={t("catalog.products.sections.options")}>
        <SwitchField
          label={f("visibleTienda")}
          value={form.visibleTienda}
          onChange={(v) => setField("visibleTienda", v)}
          disabled={saving}
        />
        <SwitchField
          label={f("promocion")}
          value={form.promocion}
          onChange={(v) => setField("promocion", v)}
          disabled={saving}
        />
        <SwitchField
          label={f("esServicio")}
          value={form.esServicio}
          onChange={(v) => setField("esServicio", v)}
          disabled={saving}
        />
      </FieldGroup>
    </CatalogEditScaffold>
  );
};

export default ProductEditForm;
