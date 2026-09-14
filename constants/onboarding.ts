/**
 * Option lists for the business setup wizard. They mirror the portal's onboarding
 * (mseller-cloud src/views/onboarding and src/utils/countryList.ts) so a business set up
 * from the app is stored exactly like one set up on cloud.mseller.app: `value` is what
 * the backend persists, `key` only picks the translated label.
 */

export type Option = { value: string; key: string };

export const BUSINESS_TYPES: Option[] = [
  { value: "Retail / Minorista", key: "retail" },
  { value: "Mayorista / Distribuidor", key: "wholesale" },
  { value: "Manufactura", key: "manufacturing" },
  { value: "Servicios", key: "services" },
  { value: "Restaurante / Cafetería", key: "restaurant" },
  { value: "Farmacia", key: "pharmacy" },
  { value: "Supermercado", key: "supermarket" },
  { value: "Ferretería", key: "hardware" },
  { value: "Tecnología", key: "technology" },
  { value: "Otro", key: "other" },
];

export const INDUSTRIES: Option[] = [
  { value: "Alimentos y Bebidas", key: "foodBeverage" },
  { value: "Construcción", key: "construction" },
  { value: "Educación", key: "education" },
  { value: "Electrónica", key: "electronics" },
  { value: "Farmacéutico", key: "pharmaceutical" },
  { value: "Moda y Textiles", key: "fashionTextiles" },
  { value: "Salud", key: "health" },
  { value: "Tecnología", key: "technology" },
  { value: "Transporte", key: "transport" },
  { value: "Turismo y Hospitalidad", key: "tourismHospitality" },
  { value: "Otro", key: "other" },
];

/** Same presets as the portal's BrandColorPicker. */
export const BRAND_COLORS = [
  "#0052ff",
  "#7367F0",
  "#28C76F",
  "#EA5455",
  "#FF9F43",
  "#00CFE8",
  "#1E293B",
  "#D4AF37",
];

/** The DGII receipt types the backend understands (TipoComprobanteFiscal). */
export const FISCAL_TYPES = { none: 0, ncf: 1, ecf: 2 } as const;
export type FiscalType = (typeof FISCAL_TYPES)[keyof typeof FISCAL_TYPES];

export type SetupOption = "sample" | "new";

export const COUNTRIES: { label: string; value: string }[] = [
  { label: "República Dominicana", value: "DO" },
  { label: "Canadá", value: "CA" },
  { label: "Estados Unidos", value: "US" },
  { label: "México", value: "MX" },
  { label: "Guatemala", value: "GT" },
  { label: "Belice", value: "BZ" },
  { label: "El Salvador", value: "SV" },
  { label: "Honduras", value: "HN" },
  { label: "Nicaragua", value: "NI" },
  { label: "Costa Rica", value: "CR" },
  { label: "Panamá", value: "PA" },
  { label: "Bahamas", value: "BS" },
  { label: "Cuba", value: "CU" },
  { label: "Haití", value: "HT" },
  { label: "Jamaica", value: "JM" },
  { label: "Trinidad y Tobago", value: "TT" },
  { label: "Argentina", value: "AR" },
  { label: "Bolivia", value: "BO" },
  { label: "Brasil", value: "BR" },
  { label: "Chile", value: "CL" },
  { label: "Colombia", value: "CO" },
  { label: "Ecuador", value: "EC" },
  { label: "Guyana", value: "GY" },
  { label: "Paraguay", value: "PY" },
  { label: "Perú", value: "PE" },
  { label: "Surinam", value: "SR" },
  { label: "Uruguay", value: "UY" },
  { label: "Venezuela", value: "VE" },
  { label: "Otro", value: "OTHER" },
];
