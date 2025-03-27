import { useQuery } from "@tanstack/react-query";
import { useParams, Outlet, useNavigate } from "react-router-dom";

import { centralApiClient } from "../../api/central-client";
import NotFoundPage from "../not-found-page";

import LoginPage from "./_login";

export default function TenantLayout() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  // Fetch tenant information
  const tenantQuery = useQuery({
    queryKey: ["tenant", tenantSlug],
    queryFn: async () => {
      const response = await centralApiClient.GET(`/{tenantIdOrSlug}`, {
        params: {
          path: {
            tenantIdOrSlug: tenantSlug!,
          },
        },
      });

      if (response.error) {
        throw new Error("Failed to fetch tenant information");
      }

      return response.data;
    },
  });

  // Check if user is authenticated
  const userQuery = useQuery({
    queryKey: ["currentUser", tenantSlug],
    queryFn: async () => {
      const response = await centralApiClient.GET(`/{tenantIdOrSlug}/me`, {
        params: {
          path: {
            tenantIdOrSlug: tenantSlug!,
          },
        },
      });

      if (response.error) {
        // This is expected if the user is not authenticated
        return null;
      }

      return response.data;
    },
    retry: false, // Don't retry if the user is not authenticated
    // Only run this query if we have a valid tenant
    enabled: !tenantQuery.isPending && !tenantQuery.isError,
  });

  // Handle loading states
  if (tenantQuery.isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading tenant information...
      </div>
    );
  }

  // Handle tenant not found by showing our not-found page
  if (tenantQuery.isError) {
    return <NotFoundPage />;
  }

  // If user is not authenticated, show login page
  if (userQuery.isError || !userQuery.data) {
    return <LoginPage tenantSlug={tenantSlug!} tenant={tenantQuery.data} />;
  }

  // User is authenticated, render the tenant content
  return (
    <div className="min-h-screen">
      <header className="navbar bg-base-300">
        <div className="flex-1">
          <span className="text-xl font-bold px-4">
            {tenantQuery.data.displayName}
          </span>
        </div>
        <div className="flex-none">
          <span className="px-4">{userQuery.data.displayName}</span>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Outlet
          context={{ currentUser: userQuery.data, tenant: tenantQuery.data }}
        />
      </main>
    </div>
  );
}
