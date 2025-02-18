import { type CentralAPIClient } from "@myapp/central-client";
import { createContext } from "react";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
export const CentralAPIContext = createContext<CentralAPIClient>(null as any);
