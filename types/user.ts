// ** Types
export type Tiers = "basic" | "standard" | "enterprise";
export type ThemeColor =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info";

export interface UserTypes {
  userId: string;
  businessId?: string;
  password: string;
  email: string;
  photoURL: string;
  business: IBusiness;
  editPrice: boolean;
  filterClients: boolean;
  firstName: string;
  firstTimeLogin: boolean;
  forceUpdatePassword: boolean;
  initialConfig: boolean;
  lastName: string;
  onlyMyClients: boolean;
  onlyProductsSelected: boolean;
  phone: string;
  priceCondition: boolean;
  resetIpad: boolean;
  restoreIpad: boolean;
  sellerCode: string;
  testMode: boolean;
  type:
    | "seller"
    | "administrator"
    | "superuser"
    | "driver"
    | "office"
    | "inventory"
    | "accounting"
    | "manager";
  userLevel: string;
  defaultClientByRoute: boolean;
  updateBankList: boolean;
  warehouse: string;
  disabled: boolean;
  fcmToken: string;
  cloudAccess: ICloudModules;
}

export interface ICloudModules {
  orders: {
    enabled: boolean;
    allowApprove: boolean;
    allowEdit: boolean;
  };
  transports: {
    enabled: boolean;
    allowForceClose: boolean;
    allowChangeStatus: boolean;
  };
  collections: {
    enabled: boolean;
  };
  visits: {
    enabled: boolean;
  };
  masterdata: {
    enabled: boolean;
  };
  statistics: {
    enabled: boolean;
  };
  settings: {
    enabled: boolean;
  };
}

export type ProjectListDataType = {
  id: number;
  img: string;
  hours: string;
  totalTask: string;
  projectType: string;
  projectTitle: string;
  progressValue: number;
  progressColor: ThemeColor;
};

type IntegrationProvider = "whatsapp";

interface IIntegration {
  provider?: IntegrationProvider;
  enabled?: boolean;
  isDevelopment?: boolean;
  token?: string;
  phoneNumberId?: string;
  devToken?: string;
  devPhoneNumberId?: string;
}

export interface IBusiness {
  businessId: string;
  address: {
    city: string;
    country: string;
    street: string;
  };
  config: IConfig;
  contact: string;
  contactPhone: string;
  email: string;
  fax: string;
  footerMessage: string;
  footerReceipt: string;
  name: string;
  phone: string;
  rnc: string;
  sellerLicenses: number;
  startingDate: Date;
  status: boolean;
  website: string;
  logoUrl: string;
  startDate?: string;
  sellingPackaging: false;
  fromPortal?: boolean;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  tier?: Tiers;
  /** False on a business created by self-signup until its owner finishes the setup wizard. */
  hasCompletedOnboarding?: boolean;
  hasSeenWelcome?: boolean;
}

export interface IConfig {
  sandboxPort: string;
  sandboxUrl: string;
  serverPort: string;
  serverUrl: string;

  portalSandboxPort: string;
  portalSandboxUrl: string;
  portalServerPort: string;
  portalServerUrl: string;

  testMode: boolean;
  displayPriceWithTax: boolean;
  allowPriceBelowMinimum: boolean;
  allowOrderAboveCreditLimit: boolean;
  allowLoadLastOrders: boolean;
  allowLoadLastPrices: boolean;
  allowConfirmProductStock: boolean;
  allowCaptureCustomerGeolocation: boolean;
  showProducInfoPanel: boolean;
  captureTemporalDoc: boolean;
  orderEmailTemplateID: number;
  paymentEmailTemplateID: number;
  defaultUnitSelectorBox: boolean;
  allowQuote: boolean;
  v4: boolean;
  promocion: boolean;
  proximaOrden: boolean;
  trackingLocation: boolean;
  enableConfirmSelector: boolean;
  metadata: { [key: string]: any }[];
  integrations?: IIntegration[];
}
