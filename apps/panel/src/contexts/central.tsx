import { type CentralAPIClient } from "@myapp/central-client";
import { createContext } from "react";

interface CentralContextValue {
  client: CentralAPIClient
}

export const CentralContext = createContext<CentralContextValue | null>(null);
