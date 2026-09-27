import { restClient } from "./api";
import type { UserPermissions } from "../types/user";

/**
 * The signed-in user's role permissions, as the portal computes them
 * (`GET /consumo/Usuario/me`, the Consumo twin of `/portal/usuarios/me`). The
 * portal's users screen is where they are edited; the app only reads them.
 */
export const getMyPermissions = async (): Promise<UserPermissions> => {
  const response = await restClient.get<UserPermissions>("/consumo/Usuario/me");
  return response.data;
};
