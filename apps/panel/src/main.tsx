import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

// Import the generated route tree
import { CentralAPIProvider } from "./components/CentralAPIProvider.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { routeTree } from "./routeTree.gen";

if (!routeTree) {
  throw new Error("Route tree not found");
}
// router pulls in `any` types for the route tree, which eslint
// correctly complains about. however, it's safe here.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No root element found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <CentralAPIProvider>
          <RouterProvider router={router} />
        </CentralAPIProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
