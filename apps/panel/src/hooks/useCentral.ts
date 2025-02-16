import { useContext } from "react";

import { CentralContext } from "../contexts/central";

export function useCentral() {
  const context = useContext(CentralContext);
  if (!context) {
    throw new Error("useCentral must be used within a CentralProvider");
  }
  return context.client;
}
