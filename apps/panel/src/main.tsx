import { buildCentralClient } from "@myapp/central-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { CentralAPIContext } from "./contexts/central-api.tsx";


const central = buildCentralClient({
  baseUrl: `${window.location.origin}/api`,
  fetch: window.fetch
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No root element found");
}

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <ThemeProvider>
      <CentralAPIContext.Provider value={central}>
          {/* router goes here */}
      </CentralAPIContext.Provider>
      </ThemeProvider>
    </StrictMode>,
  );
}
