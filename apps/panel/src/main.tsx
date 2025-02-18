import { buildCentralClient } from "@myapp/central-client";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CentralAPIContext } from "./contexts/central-api.tsx";
import { router } from "./router.ts";

import "./index.css";


const central = buildCentralClient({
  baseUrl: `${window.location.origin}/api`,
  fetch: window.fetch,
  clientOpts: {
    credentials: "include",
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No root element found");
}

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <CentralAPIContext.Provider value={central}>
          <RouterProvider router={router} context={{
            central
          }} />
      </CentralAPIContext.Provider>
    </StrictMode>,
  );
}
