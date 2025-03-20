import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import LandingPage from "./routes/:tenantSlug";
import TenantLayout from "./routes/:tenantSlug/layout";
import NotFoundPage from "./routes/not-found-page";

// Define the router configuration
export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    index: true,
  },
  {
    path: "/:tenantSlug",
    element: <TenantLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        lazy: () =>
          import("./routes/:tenantSlug/dashboard/index.tsx").then((m) => ({
            Component: m.default,
          })),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
