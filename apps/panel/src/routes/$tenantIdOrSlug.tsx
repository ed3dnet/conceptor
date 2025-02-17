import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

import { useCentral } from "../hooks/useCentral";

export const Route = createFileRoute("/$tenantIdOrSlug")({
  loader: async ({ params }) => {
    const central = useCentral();

    try {
      // We'll implement whoami endpoint later
      const whoami = await central.GET("/whoami");
      if (!whoami.response.ok) {
        // Redirect to login page if not authenticated
        throw redirect({
          to: "/$tenantIdOrSlug/login",
          params: { tenantIdOrSlug: params.tenantIdOrSlug }
        });
      }

      return {
        user: whoami.data
      };
    } catch (err) {
      // Any error means we redirect to login
      throw redirect({
        to: "/$tenantIdOrSlug/login",
        params: { tenantIdOrSlug: params.tenantIdOrSlug }
      });
    }
  },
  component: TenantLayout
});

function TenantLayout() {
  return (
    <div>
      {/* We can add tenant-wide layout elements here */}
      <Outlet />
    </div>
  );
}
