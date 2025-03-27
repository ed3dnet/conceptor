import { type TenantPublic, type UserPrivate } from "@myapp/central-client";
import { useOutletContext } from "react-router-dom";

export type TenantLayoutContext = {
  currentUser: UserPrivate;
  tenant: TenantPublic;
};

export function useTenantContext<
  T extends TenantLayoutContext = TenantLayoutContext,
>() {
  return useOutletContext<T>();
}
