import { Platform } from "react-native";

/**
 * Whether the app can create a new business (email sign up and the Google "create business"
 * prompt).
 *
 * Off on iOS: App Review rejected the build under guideline 3.1.1 because registering a business
 * leads to a subscription billed outside In-App Purchase. The iOS app is sign in only for
 * existing MSeller businesses (guideline 3.1.3(c), Enterprise Services). The iOS screens must not
 * point people to register or pay elsewhere either. Setup of an existing business and account
 * deletion stay available.
 */
export const BUSINESS_SIGN_UP_ENABLED = Platform.OS !== "ios";
