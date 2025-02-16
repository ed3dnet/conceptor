import { buildCentralClient } from "@myapp/central-client";

import { CentralContext } from "../contexts/central.tsx";

export function CentralAPIProvider({ children }: { children: React.ReactNode }) {
  const baseUrl = `${window.location.origin}/api`;

  const client = buildCentralClient({
    baseUrl,
    fetch: window.fetch
  });

  return (
    <CentralContext.Provider value={{ client }}>
      {children}
    </CentralContext.Provider>
  );
}
